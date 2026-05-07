import { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../components/common/AdminLayout'
import { usersApi } from '../../api/users'
import { restaurantsApi } from '../../api/restaurants'
import { formatDate, isOpenNow, fmt12 } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

// ── Validation helpers ────────────────────────────────────────────────────────
const emailRe = /^[^\s@]+@gmail\.com$/i
const phoneRe = /^\+92[0-9]{10}$/

const cnicRe = /^\d{13}$/

function validatePersonal(f) {
  const e = {}
  if (!f.fullName.trim())                  e.fullName    = 'Full name is required.'
  if (!emailRe.test(f.email.trim()))       e.email       = 'Must be a valid Gmail address.'
  if (!phoneRe.test(f.phoneNumber.trim())) e.phoneNumber = 'Must start with +92 followed by 10 digits.'
  if (!f.address.trim())                   e.address     = 'Address is required.'
  if (!cnicRe.test(f.cnic.trim()))         e.cnic        = 'CNIC must be exactly 13 digits.'
  return e
}

const PERSONAL_EMPTY = { fullName: '', email: '', phoneNumber: '', address: '', cnic: '' }

// ── Copy helper ───────────────────────────────────────────────────────────────
function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null)
  const copy = (key, text) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }
  return { copiedKey, copy }
}

// ── Photo picker ──────────────────────────────────────────────────────────────
function PhotoPicker({ preview, onChange }) {
  const ref = useRef(null)
  return (
    <div className="flex items-center gap-4">
      <div onClick={() => ref.current?.click()}
        className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 hover:border-brand-400 cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 shrink-0">
        {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">👤</span>}
      </div>
      <div>
        <button type="button" onClick={() => ref.current?.click()} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          {preview ? 'Change photo' : 'Upload photo'}
        </button>
        <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG or WebP · max 2 MB (optional)</p>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (!f) return
          if (f.size > 2 * 1024 * 1024) { toast('Photo must be under 2 MB', 'error'); return }
          onChange(f, URL.createObjectURL(f))
        }} />
    </div>
  )
}

// ── Credential row ────────────────────────────────────────────────────────────
function CredentialRow({ label, value, fieldKey, copiedKey, onCopy, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-20 shrink-0">{label}</span>
      <span className={`flex-1 text-sm font-semibold text-gray-800 truncate ${mono ? 'font-mono tracking-widest text-brand-600' : ''}`}>{value}</span>
      <button onClick={() => onCopy(fieldKey, value)}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
          copiedKey === fieldKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-600'
        }`}>
        {copiedKey === fieldKey ? '✓ Copied' : '⎘ Copy'}
      </button>
    </div>
  )
}

// ── Password modal ────────────────────────────────────────────────────────────
function PasswordModal({ owner, onClose }) {
  const { copiedKey, copy } = useCopy()
  const [allCopied, setAllCopied] = useState(false)
  const copyAll = () => {
    navigator.clipboard.writeText([
      'Restaurant Owner Credentials', '──────────────────────────────',
      `Name:     ${owner.fullName}`, `Email:    ${owner.email}`,
      `Phone:    ${owner.phoneNumber}`, `Password: ${owner.generatedPassword}`,
    ].join('\n'))
    setAllCopied(true); setTimeout(() => setAllCopied(false), 2500)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl shrink-0">✅</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg">Owner Created!</h3>
            <p className="text-sm text-gray-400">Password shown once — copy before closing.</p>
          </div>
          <button onClick={copyAll}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              allCopied ? 'bg-green-100 text-green-700' : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}>
            {allCopied ? '✓ Copied!' : '⎘ Copy All'}
          </button>
        </div>
        <div className="px-6 py-2">
          <CredentialRow label="Name"     value={owner.fullName}          fieldKey="n" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Email"    value={owner.email}             fieldKey="e" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Phone"    value={owner.phoneNumber}       fieldKey="p" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Password" value={owner.generatedPassword} fieldKey="w" copiedKey={copiedKey} onCopy={copy} mono />
        </div>
        {owner.restaurant && (
          <div className="mx-6 mb-2 p-3 bg-brand-50 rounded-xl">
            <p className="text-xs font-semibold text-brand-700">🏪 Linked to: {owner.restaurant.name}</p>
          </div>
        )}
        <div className="mx-6 mb-4 flex items-start gap-2 p-3 bg-red-50 rounded-xl">
          <span className="text-red-500 shrink-0">⚠️</span>
          <p className="text-xs text-red-600 font-medium">This password <strong>cannot be recovered</strong> after closing.</p>
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full btn-primary">Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ owner, onSave, onClose }) {
  const [personal, setPersonal] = useState({
    fullName: owner.fullName, email: owner.email,
    phoneNumber: owner.phoneNumber, address: owner.address,
    cnic: owner.cnic ?? '',
  })
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState(owner.profilePhotoUrl || null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validatePersonal(personal)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await onSave(owner.id, {
        fullName: personal.fullName.trim(), email: personal.email.trim(),
        phoneNumber: personal.phoneNumber.trim(), address: personal.address.trim(),
        cnic: personal.cnic.trim(),
      }, photoFile)
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else toast(err.message || 'Failed to update', 'error')
    } finally { setSaving(false) }
  }

  const ch = field => e => setPersonal(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Edit Owner</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          <PhotoPicker preview={photoPreview} onChange={(f, u) => { setPhotoFile(f); setPhotoPreview(u) }} />
          <Field label="Full Name"    required value={personal.fullName}    onChange={ch('fullName')}    error={errors.fullName}    placeholder="Omar Shahid" />
          <Field label="Email"        required value={personal.email}       onChange={ch('email')}       error={errors.email}       placeholder="owner@gmail.com" type="email" />
          <Field label="Phone"        required value={personal.phoneNumber} onChange={ch('phoneNumber')} error={errors.phoneNumber} placeholder="+923001234567" />
          <Field label="Address"      required value={personal.address}     onChange={ch('address')}     error={errors.address}     placeholder="Lahore" />
          <Field label="CNIC"         required value={personal.cnic}        onChange={ch('cnic')}        error={errors.cnic}        placeholder="3520112345671" hint="Exactly 13 digits" maxLength={13} inputMode="numeric" />
          {owner.restaurant && (
            <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-500">
              Linked restaurant: <span className="font-semibold text-gray-700">{owner.restaurant.name}</span>
              <span className="block text-xs mt-0.5 text-gray-400">Edit restaurant details from Manage Restaurants.</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageOwners() {
  const [owners, setOwners]         = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [errors, setErrors]         = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [newOwner, setNewOwner]     = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)
  const [addRestaurantFor, setAddRestaurantFor] = useState(null)

  const [personal, setPersonal]         = useState(PERSONAL_EMPTY)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const loadData = () => {
    setLoading(true)
    Promise.all([usersApi.getOwners(), restaurantsApi.getCategories()])
      .then(([o, c]) => { setOwners(o); setCategories(c) })
      .catch(() => toast('Failed to load data', 'error'))
      .finally(() => setLoading(false))
  }
  useEffect(loadData, [])

  const chP = field => e => { setPersonal(p => ({ ...p, [field]: e.target.value })); if (errors[field]) setErrors(p => ({ ...p, [field]: null })) }

  // ── Create owner account ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validatePersonal(personal)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      let owner = await usersApi.createOwner({
        fullName:    personal.fullName.trim(),
        email:       personal.email.trim(),
        phoneNumber: personal.phoneNumber.trim(),
        address:     personal.address.trim(),
        cnic:        personal.cnic.trim(),
      })

      if (photoFile) {
        try {
          const pr = await usersApi.uploadOwnerPhoto(owner.id, photoFile)
          owner = { ...owner, profilePhotoUrl: pr.profilePhotoUrl }
        } catch { toast('Owner created but photo upload failed', 'warning') }
      }

      setNewOwner(owner)
      setOwners(prev => [owner, ...prev])
      setPersonal(PERSONAL_EMPTY)
      setErrors({}); setPhotoFile(null); setPhotoPreview(null)
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else toast(err.message || 'Failed to create owner', 'error')
    } finally { setSubmitting(false) }
  }

  // ── Add restaurant for owner ─────────────────────────────────────────────
  const handleAddRestaurant = async (ownerId, name, categoryId) => {
    const restaurant = await restaurantsApi.create({ name, categoryId, ownerId })
    setOwners(prev => prev.map(o => o.id === ownerId ? { ...o, restaurant } : o))
    setAddRestaurantFor(null)
    toast('Restaurant added', 'success')
  }

  // ── Edit ────────────────────────────────────────────────────────────────
  const handleEdit = async (id, data, photoFile) => {
    let updated = await usersApi.updateOwner(id, data)
    if (photoFile) {
      try {
        const pr = await usersApi.uploadOwnerPhoto(id, photoFile)
        updated = { ...updated, profilePhotoUrl: pr.profilePhotoUrl }
      } catch { toast('Details saved but photo upload failed', 'warning') }
    }
    setOwners(prev => {
      const merged = { ...prev.find(o => o.id === id), ...data, ...updated }
      setViewTarget(vt => vt?.id === id ? merged : vt)
      return prev.map(o => o.id === id ? merged : o)
    })
    setEditTarget(null)
    toast('Owner updated', 'success')
  }

  // ── Toggle / Delete ──────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      const r = await usersApi.toggleActive(id)
      setOwners(prev => prev.map(o => o.id === id ? { ...o, isActive: r.isActive } : o))
      toast(r.isActive ? 'Owner activated' : 'Owner deactivated', 'success')
    } catch { toast('Failed to update status', 'error') }
  }
  const handleDelete = async (id) => {
    try {
      await usersApi.deleteOwner(id)
      setOwners(prev => prev.filter(o => o.id !== id))
      toast('Owner removed', 'success')
    } catch (err) {
      toast(err.message || 'Failed to delete owner', 'error')
    } finally { setDeleteTarget(null) }
  }

  return (
    <AdminLayout title="Restaurant Owners">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Create Form ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="text-xl">🏪</span> Add New Owner
            </h2>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              <PhotoPicker preview={photoPreview} onChange={(f, u) => { setPhotoFile(f); setPhotoPreview(u) }} />

              <Field label="Full Name"     required value={personal.fullName}    onChange={chP('fullName')}    error={errors.fullName}    placeholder="Omar Shahid" />
              <Field label="Email Address" required value={personal.email}       onChange={chP('email')}       error={errors.email}       placeholder="owner@gmail.com" type="email" hint="Gmail only" />
              <Field label="Phone Number"  required value={personal.phoneNumber} onChange={chP('phoneNumber')} error={errors.phoneNumber} placeholder="+923001234567" hint="+92 + 10 digits" />
              <Field label="Address"       required value={personal.address}     onChange={chP('address')}     error={errors.address}     placeholder="Lahore, Punjab" />
              <Field label="CNIC"          required value={personal.cnic}        onChange={chP('cnic')}        error={errors.cnic}        placeholder="3520112345671" hint="Exactly 13 digits, numbers only" maxLength={13} inputMode="numeric" />

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                <span className="text-blue-500 text-lg mt-0.5">🔑</span>
                <p className="text-xs text-blue-700">Password will be <strong>auto-generated</strong> and shown once after creation.</p>
              </div>
              <button type="submit" disabled={submitting} className="w-full btn-primary">
                {submitting ? 'Creating…' : 'Create Owner'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Owner List ────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">
              All Owners <span className="ml-2 text-sm font-normal text-gray-400">({owners.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex gap-4"><div className="w-24 h-24 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2 pt-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : owners.length === 0 ? (
            <div className="text-center py-16 card">
              <p className="text-5xl mb-3">🏪</p>
              <p className="text-gray-500 font-medium">No restaurant owners yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {owners.map(o => {
                const open = o.restaurant ? isOpenNow(o.restaurant.openTime, o.restaurant.closeTime) : null
                return (
                  <div key={o.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewTarget(o)}>
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {o.profilePhotoUrl
                          ? <img src={o.profilePhotoUrl} alt={o.fullName} className="w-full h-full object-cover" />
                          : <span className="text-brand-600 font-bold text-xl sm:text-3xl">{o.fullName?.[0]?.toUpperCase()}</span>
                        }
                      </div>

                      {/* Owner info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{o.fullName}</p>
                          <span className={`badge text-xs ${o.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {o.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{o.email}</p>
                        <div className="flex flex-wrap gap-x-4 text-xs text-gray-400 mt-1">
                          <span>📞 {o.phoneNumber}</span>
                          {o.cnic && <span>🪪 {o.cnic}</span>}
                          <span>📅 {formatDate(o.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {o.address}</p>

                        {/* Restaurant strip */}
                        {o.restaurant ? (
                          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                              {o.restaurant.imageUrl ? (
                                <img src={o.restaurant.imageUrl} alt={o.restaurant.name}
                                  className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-200" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 text-xl">🏪</div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-800 truncate">{o.restaurant.name}</p>
                                  {open !== null && (
                                    <span className={`badge text-xs shrink-0 ${open ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                      {open ? 'Open' : 'Closed'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400">{o.restaurant.categoryName}</p>
                                {o.restaurant.openTime && o.restaurant.closeTime && (
                                  <p className="text-xs text-gray-400">{fmt12(o.restaurant.openTime)} – {fmt12(o.restaurant.closeTime)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); setAddRestaurantFor(o) }}
                            className="mt-3 w-full flex items-center justify-center gap-2 p-2.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl text-xs text-brand-600 font-semibold transition-colors">
                            + Add Restaurant
                          </button>
                        )}
                      </div>

                      {/* Actions — desktop */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditTarget(o)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Edit</button>
                        <button onClick={() => handleToggle(o.id)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${o.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{o.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button onClick={() => setDeleteTarget(o)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>
                      </div>
                    </div>
                    {/* Actions — mobile */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 sm:hidden" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditTarget(o)} className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Edit</button>
                      <button onClick={() => handleToggle(o.id)} className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${o.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{o.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => setDeleteTarget(o)} className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {viewTarget        && <OwnerDetailModal owner={viewTarget} onClose={() => setViewTarget(null)} />}
      {newOwner          && <PasswordModal owner={newOwner} onClose={() => setNewOwner(null)} />}
      {editTarget        && <EditModal owner={editTarget} onSave={handleEdit} onClose={() => setEditTarget(null)} />}
      {addRestaurantFor  && (
        <AddRestaurantModal
          owner={addRestaurantFor}
          categories={categories}
          onSave={handleAddRestaurant}
          onClose={() => setAddRestaurantFor(null)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Delete Owner?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Remove <strong>{deleteTarget.fullName}</strong>?{' '}
              {deleteTarget.restaurant
                ? <span className="text-red-600 font-medium">This owner still has a linked restaurant. Delete the restaurant first.</span>
                : 'This action cannot be undone.'
              }
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="flex-1 btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

// ── Add Restaurant Modal ──────────────────────────────────────────────────────
function AddRestaurantModal({ owner, categories, onSave, onClose }) {
  const [name, setName]         = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!name.trim())    errs.name       = 'Restaurant name is required.'
    if (!categoryId)     errs.categoryId = 'Category is required.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await onSave(owner.id, name.trim(), categoryId)
    } catch (err) {
      toast(err.message || 'Failed to add restaurant', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Add Restaurant</h3>
            <p className="text-xs text-gray-400 mt-0.5">For {owner.fullName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restaurant Name <span className="text-red-500">*</span>
            </label>
            <input value={name} onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: null })) }}
              placeholder="Burger Palace" className={`input-field ${errors.name ? 'border-red-400' : ''}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select value={categoryId} onChange={e => { setCategoryId(e.target.value); if (errors.categoryId) setErrors(p => ({ ...p, categoryId: null })) }}
              className={`input-field ${errors.categoryId ? 'border-red-400' : ''}`}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
          </div>
          <p className="text-xs text-gray-400">Other details (hours, address, image, etc.) can be completed from Manage Restaurants.</p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">
              {saving ? 'Adding…' : 'Add Restaurant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Owner Detail Modal ────────────────────────────────────────────────────────
function OwnerDetailModal({ owner: o, onClose }) {
  const r = o.restaurant
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-t-2xl p-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 shrink-0 flex items-center justify-center">
              {o.profilePhotoUrl
                ? <img src={o.profilePhotoUrl} alt={o.fullName} className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold">{o.fullName?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div>
              <h2 className="text-xl font-bold">{o.fullName}</h2>
              <p className="text-indigo-100 text-sm">Restaurant Owner</p>
              <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${o.isActive ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
                {o.isActive ? '● Active' : '● Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Personal details */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Personal Info</p>
          <DetailRow icon="✉️" label="Email"   value={o.email} />
          <DetailRow icon="📞" label="Phone"   value={o.phoneNumber} />
          <DetailRow icon="📍" label="Address" value={o.address} />
          <DetailRow icon="🪪" label="CNIC"    value={o.cnic} mono />
          <DetailRow icon="📅" label="Joined"  value={new Date(o.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
        </div>

        {/* Restaurant details */}
        <div className="px-6 pb-6 pt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Restaurant</p>
          {r ? (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {r.imageUrl && (
                <img src={r.imageUrl} alt={r.name} className="w-full h-32 object-cover" />
              )}
              <div className="p-4 space-y-0">
                <DetailRow icon="🏪" label="Name"     value={r.name} />
                <DetailRow icon="🍽️" label="Category" value={r.categoryName} />
                <DetailRow icon="📍" label="Address"  value={r.address} />
                <DetailRow icon="📞" label="Phone"    value={r.phoneNumber} />
                <DetailRow icon="🚚" label="Delivery" value={`${r.deliveryTime} min · $${r.deliveryFee} fee`} />
                <DetailRow icon="🕐" label="Hours"    value={r.openTime && r.closeTime ? `${r.openTime} – ${r.closeTime}` : '24 / 7'} />
                <DetailRow icon="⭐" label="Rating"   value={r.rating > 0 ? r.rating.toFixed(1) : 'No ratings yet'} />
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-400 text-sm">
              No restaurant linked yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-base w-6 shrink-0 mt-0.5">{icon}</span>
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0 mt-0.5">{label}</span>
      <span className={`flex-1 text-sm text-gray-800 font-medium break-all ${mono ? 'font-mono tracking-widest text-brand-600' : ''}`}>{value || '—'}</span>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, required, value, onChange, error, placeholder, hint, type = 'text', maxLength, inputMode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        maxLength={maxLength} inputMode={inputMode}
        className={`input-field ${error ? 'border-red-400 focus:ring-red-400' : ''}`} />
      {error ? <p className="text-xs text-red-500 mt-1">{error}</p>
             : hint ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
    </div>
  )
}
