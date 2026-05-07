import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import OwnerLayout from '../../components/common/OwnerLayout'
import { ownerApi } from '../../api/owner'
import { formatCurrency } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

const EMPTY = { name: '', description: '', price: '', imageUrl: '', isAvailable: true }
const FILTERS = ['All', 'Available', 'Out of Stock']
const MAX_FILE_SIZE = 3 * 1024 * 1024   // 3 MB

// ── Image picker component ─────────────────────────────────────────────────────
function ImagePicker({ imageUrl, imageFile, imagePreview, onFileChange, onUrlChange, onClear, uploading }) {
  const inputRef    = useRef(null)
  const [urlMode, setUrlMode] = useState(false)
  const [dragging, setDragging] = useState(false)

  const preview = imagePreview || imageUrl

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileChange(file)
  }, [onFileChange])

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) onFileChange(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-600">Item Photo</label>
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs gap-0.5">
          <button type="button" onClick={() => setUrlMode(false)}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${!urlMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            Upload
          </button>
          <button type="button" onClick={() => setUrlMode(true)}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${urlMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            URL
          </button>
        </div>
      </div>

      {/* Preview area */}
      {preview ? (
        <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-gray-100 group">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!uploading && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button type="button"
                onClick={() => inputRef.current?.click()}
                className="bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                Change
              </button>
              <button type="button" onClick={onClear}
                className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-red-600 transition-colors">
                Remove
              </button>
            </div>
          )}
          {imageFile && (
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
              {imageFile.name}
            </div>
          )}
        </div>
      ) : urlMode ? null : (
        /* Drop zone */
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`w-full h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
            dragging
              ? 'border-brand-400 bg-brand-50'
              : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/50'
          }`}>
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">
              {dragging ? 'Drop it here!' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG or WebP · max 3 MB</p>
          </div>
        </div>
      )}

      {/* URL input mode */}
      {urlMode && (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <input
            type="url"
            value={imageUrl}
            onChange={e => onUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="input-field pl-9 text-sm"
          />
          {imageUrl && (
            <button type="button" onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden" onChange={handleFileInput} />
    </div>
  )
}

export default function ManageMenu() {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('All')

  const load = () =>
    ownerApi.getMenu()
      .then(setItems)
      .catch(() => toast('Failed to load menu', 'error'))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm(EMPTY)
    setImageFile(null)
    setImagePreview('')
    setModal('add')
  }

  const openEdit = (item) => {
    setForm({
      name:        item.name,
      description: item.description ?? '',
      price:       String(item.price),
      imageUrl:    item.imageUrl ?? '',
      isAvailable: item.isAvailable,
    })
    setImageFile(null)
    setImagePreview(item.imageUrl ?? '')
    setModal(item)
  }

  const closeModal = () => {
    setModal(null)
    setImageFile(null)
    setImagePreview('')
  }

  const handleFileChange = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      toast('Image must be under 3 MB', 'warning')
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast('Only JPEG, PNG or WebP images are allowed', 'warning')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    // Clear any existing URL so the file takes priority
    setForm(p => ({ ...p, imageUrl: '' }))
  }

  const handleClearImage = () => {
    setImageFile(null)
    setImagePreview('')
    setForm(p => ({ ...p, imageUrl: '' }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim())        return toast('Name is required', 'warning')
    if (!form.price || parseFloat(form.price) <= 0) return toast('Enter a valid price', 'warning')

    setSaving(true)
    try {
      let finalImageUrl = form.imageUrl.trim()

      // If editing an existing item and user picked a file, upload it first
      if (imageFile && modal !== 'add') {
        setUploading(true)
        try {
          const result = await ownerApi.uploadMenuItemImage(modal.id, imageFile)
          finalImageUrl = result.imageUrl
        } finally {
          setUploading(false)
        }
      }

      const payload = {
        name:        form.name.trim(),
        description: form.description.trim(),
        price:       parseFloat(form.price),
        imageUrl:    finalImageUrl,
        isAvailable: form.isAvailable,
      }

      if (modal === 'add') {
        // Create the item first (without the file), then upload the image
        const created = await ownerApi.createMenuItem(payload)

        if (imageFile) {
          setUploading(true)
          try {
            const result = await ownerApi.uploadMenuItemImage(created.id, imageFile)
            created.imageUrl = result.imageUrl
          } catch {
            // Image upload failed but item was created — non-fatal
          } finally {
            setUploading(false)
          }
        }

        setItems(prev => [created, ...prev])
        toast('Item added!', 'success')
      } else {
        const updated = await ownerApi.updateMenuItem(modal.id, { ...payload, imageUrl: finalImageUrl })
        setItems(prev => prev.map(i => i.id === modal.id ? updated : i))
        toast('Item updated!', 'success')
      }
      closeModal()
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await ownerApi.deleteMenuItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
      setConfirmDelete(null)
      toast('Item deleted', 'success')
    } catch (err) {
      toast(err.message || 'Failed to delete', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleAvail = async (item) => {
    const next = !item.isAvailable
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: next } : i))
    try {
      const updated = await ownerApi.updateMenuItem(item.id, {
        name: item.name, description: item.description,
        price: item.price, imageUrl: item.imageUrl, isAvailable: next,
      })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: !next } : i))
      toast('Failed to update availability', 'error')
    }
  }

  const filtered = useMemo(() => {
    let list = items
    if (filter === 'Available')    list = list.filter(i => i.isAvailable)
    if (filter === 'Out of Stock') list = list.filter(i => !i.isAvailable)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [items, filter, search])

  const available  = items.filter(i => i.isAvailable).length
  const outOfStock = items.length - available

  return (
    <OwnerLayout title="Menu">
      <div className="w-full space-y-5">

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <StatPill icon="🍽️" label="Total Items"  value={items.length} color="blue"  />
          <StatPill icon="✅" label="Available"     value={available}    color="green" />
          <StatPill icon="❌" label="Out of Stock"  value={outOfStock}   color="red"   />
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input type="text" placeholder="Search items…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 text-xs gap-1 shrink-0">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {f}
              </button>
            ))}
          </div>

          <button onClick={openAdd}
            className="btn-primary text-sm px-4 py-2 shrink-0 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        {/* ── Grid ─────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-6xl mb-4">🍽️</p>
            <p className="text-lg font-semibold text-gray-600">No menu items yet</p>
            <p className="text-sm mt-1 mb-5">Add your first dish to get started.</p>
            <button onClick={openAdd} className="btn-primary text-sm px-6 py-2.5">+ Add First Item</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm font-medium text-gray-500">No items match your search</p>
            <button onClick={() => { setSearch(''); setFilter('All') }}
              className="mt-3 text-xs text-brand-500 hover:underline font-medium">Clear filters</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map(item => (
              <MenuCard
                key={item.id}
                item={item}
                onEdit={() => openEdit(item)}
                onDelete={() => setConfirmDelete(item.id)}
                onToggle={() => handleToggleAvail(item)}
                confirmingDelete={confirmDelete === item.id}
                onConfirmDelete={() => handleDelete(item.id)}
                onCancelDelete={() => setConfirmDelete(null)}
                deleting={deleting === item.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[93vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">
                  {modal === 'add' ? 'Add New Item' : 'Edit Item'}
                </h2>
                {modal !== 'add' && (
                  <p className="text-xs text-gray-400 mt-0.5">{modal.name}</p>
                )}
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none">
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Image picker */}
              <ImagePicker
                imageUrl={form.imageUrl}
                imageFile={imageFile}
                imagePreview={imagePreview}
                onFileChange={handleFileChange}
                onUrlChange={url => { setForm(p => ({ ...p, imageUrl: url })); setImagePreview(''); setImageFile(null) }}
                onClear={handleClearImage}
                uploading={uploading}
              />

              {/* Name */}
              <FormField
                label="Item Name"
                required
                hint={`${form.name.length}/150`}
                error={form.name.length > 0 && form.name.trim().length < 2 ? 'Too short' : null}
              >
                <input
                  className={`input-field ${form.name.length > 0 && form.name.trim().length < 2 ? 'border-red-300 focus:ring-red-400' : ''}`}
                  value={form.name}
                  required
                  maxLength={150}
                  placeholder="e.g. Margherita Pizza"
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </FormField>

              {/* Description */}
              <FormField
                label="Description"
                hint={`${form.description.length}/500`}
              >
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  value={form.description}
                  maxLength={500}
                  placeholder="What makes this dish special? Describe ingredients, taste, or how it's made…"
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </FormField>

              {/* Price */}
              <FormField
                label="Price"
                required
                error={form.price && parseFloat(form.price) <= 0 ? 'Price must be greater than 0' : null}
              >
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm select-none">$</span>
                  <input
                    className={`input-field pl-8 font-semibold ${form.price && parseFloat(form.price) <= 0 ? 'border-red-300 focus:ring-red-400' : ''}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="9999"
                    value={form.price}
                    required
                    placeholder="0.00"
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  />
                </div>
              </FormField>

              {/* Availability toggle */}
              <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                form.isAvailable
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    form.isAvailable ? 'bg-green-100' : 'bg-gray-200'
                  }`}>
                    {form.isAvailable ? '✅' : '❌'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {form.isAvailable ? 'Available for ordering' : 'Hidden from customers'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.isAvailable
                        ? 'Customers can add this to their cart'
                        : 'Item will appear as Out of Stock'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={form.isAvailable}
                    onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))} />
                  <div className="w-12 h-6 bg-gray-300 rounded-full peer
                    peer-checked:bg-green-500
                    after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                    after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                    peer-checked:after:translate-x-6 after:shadow-sm" />
                </label>
              </div>

            </form>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                form="menu-form"
                disabled={saving || uploading}
                onClick={handleSave}
                className="flex-1 btn-primary disabled:opacity-60 flex items-center justify-center gap-2">
                {(saving || uploading) ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {uploading ? 'Uploading…' : 'Saving…'}
                  </>
                ) : (
                  modal === 'add' ? '+ Add Item' : 'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}

// ── MenuCard ──────────────────────────────────────────────────────────────────
function MenuCard({ item, onEdit, onDelete, onToggle, confirmingDelete, onConfirmDelete, onCancelDelete, deleting }) {
  return (
    <div className={`card flex flex-col overflow-hidden transition-all duration-200 ${
      !item.isAvailable ? 'opacity-70' : 'hover:shadow-md'
    }`}>
      <div className="relative w-full h-40 bg-gray-100 shrink-0">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling?.classList.remove('hidden') }} />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center text-5xl bg-gray-50 ${item.imageUrl ? 'hidden' : 'flex'}`}>
          🍽️
        </div>
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
            <span className="bg-gray-900/70 text-white text-xs font-semibold px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
        {/* Quick edit overlay */}
        <button onClick={onEdit}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center text-gray-600 hover:text-brand-600 shadow-sm transition-all opacity-0 hover:opacity-100 group-hover:opacity-100">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug">{item.name}</p>
            {item.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
            )}
          </div>
          <p className="text-brand-600 font-bold text-base shrink-0">{formatCurrency(item.price)}</p>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <button onClick={onToggle}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
              item.isAvailable
                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${item.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
            {item.isAvailable ? 'Available' : 'Out of Stock'}
          </button>

          <div className="flex items-center gap-1">
            {confirmingDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={onCancelDelete}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={onConfirmDelete} disabled={deleting}
                  className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors">
                  {deleting ? '…' : 'Delete'}
                </button>
              </div>
            ) : (
              <>
                <button onClick={onEdit}
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={onDelete}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────────────────────────
function FormField({ label, required, hint, error, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
          {hint && !error && <span className="text-xs text-gray-400">{hint}</span>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ── StatPill ──────────────────────────────────────────────────────────────────
const PILL_COLORS = {
  blue:  'bg-blue-50  text-blue-700  border-blue-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  red:   'bg-red-50   text-red-600   border-red-100',
}

function StatPill({ icon, label, value, color }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${PILL_COLORS[color] ?? PILL_COLORS.blue}`}>
      <span className="text-xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-xs font-medium opacity-80 truncate">{label}</p>
      </div>
    </div>
  )
}
