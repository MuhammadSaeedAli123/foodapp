import { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../components/common/AdminLayout'
import { usersApi } from '../../api/users'
import { restaurantsApi } from '../../api/restaurants'
import { formatDate, isOpenNow, fmt12 } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

// ── Validation rules ──────────────────────────────────────────────────────────
const RULES = {
  fullName:     { required: true, label: 'Full Name' },
  email:        { required: true, label: 'Email',
                  pattern: /^[^\s@]+@gmail\.com$/i,
                  hint: 'Must be a Gmail address (e.g. name@gmail.com)' },
  phoneNumber:  { required: true, label: 'Phone Number',
                  pattern: /^\+92[0-9]{10}$/,
                  hint: 'Must start with +92 followed by 10 digits, no spaces' },
  address:      { required: true, label: 'Address' },
  cnic:         { required: true, label: 'CNIC',
                  pattern: /^\d{13}$/,
                  hint: 'Must be exactly 13 digits (numbers only)' },
  restaurantId: { required: true, label: 'Restaurant' },
}

function validate(field, value) {
  const rule = RULES[field]
  if (!rule) return null
  if (rule.required && !String(value ?? '').trim()) return `${rule.label} is required.`
  if (rule.pattern && String(value).trim() && !rule.pattern.test(String(value).trim()))
    return rule.hint ?? `${rule.label} is invalid.`
  return null
}

const EMPTY = { fullName: '', email: '', phoneNumber: '', address: '', cnic: '', restaurantId: '' }

// ── Photo picker ──────────────────────────────────────────────────────────────
function PhotoPicker({ preview, onChange }) {
  const inputRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast('Photo must be under 2 MB', 'error'); return }
    onChange(file, URL.createObjectURL(file))
  }

  return (
    <div className="flex items-center gap-4">
      <div
        onClick={() => inputRef.current?.click()}
        className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 hover:border-brand-400 cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 shrink-0 transition-colors"
      >
        {preview
          ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
          : <span className="text-2xl">👤</span>
        }
      </div>
      <div className="min-w-0">
        <button type="button" onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-brand-600 hover:text-brand-700">
          {preview ? 'Change photo' : 'Upload photo'}
        </button>
        <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG or WebP · max 2 MB (optional)</p>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        onChange={handleFile} className="hidden" />
    </div>
  )
}

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

// ── Credential row with inline copy button ────────────────────────────────────
function CredentialRow({ label, value, fieldKey, copiedKey, onCopy, mono = false }) {
  const isCopied = copiedKey === fieldKey
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-20 shrink-0">
        {label}
      </span>
      <span className={`flex-1 text-sm font-semibold text-gray-800 truncate ${mono ? 'font-mono tracking-widest text-brand-600' : ''}`}>
        {value}
      </span>
      <button
        onClick={() => onCopy(fieldKey, value)}
        title={`Copy ${label}`}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
          isCopied
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-600'
        }`}
      >
        {isCopied ? <CheckIcon /> : <ClipboardIcon />}
        {isCopied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

// ── Password reveal modal ─────────────────────────────────────────────────────
function PasswordModal({ worker, onClose }) {
  const { copiedKey, copy } = useCopy()
  const [allCopied, setAllCopied] = useState(false)

  const copyAll = () => {
    const text = [
      `Worker Credentials`,
      `──────────────────`,
      `Name:     ${worker.fullName}`,
      `Email:    ${worker.email}`,
      `Phone:    ${worker.phoneNumber}`,
      `CNIC:     ${worker.cnic}`,
      `Password: ${worker.generatedPassword}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl shrink-0">
            ✅
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg">Worker Created!</h3>
            <p className="text-sm text-gray-400">Password shown once — copy before closing.</p>
          </div>
          {/* Copy All */}
          <button
            onClick={copyAll}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              allCopied
                ? 'bg-green-100 text-green-700'
                : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
          >
            {allCopied ? <CheckIcon /> : <ClipboardIcon />}
            {allCopied ? 'Copied!' : 'Copy All'}
          </button>
        </div>

        {/* Credential rows */}
        <div className="px-6 py-2">
          <CredentialRow label="Name"     value={worker.fullName}          fieldKey="name"  copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Email"    value={worker.email}             fieldKey="email" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Phone"    value={worker.phoneNumber}       fieldKey="phone" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="CNIC"     value={worker.cnic}              fieldKey="cnic"  copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Password" value={worker.generatedPassword} fieldKey="pass"  copiedKey={copiedKey} onCopy={copy} mono />
        </div>

        {/* Warning */}
        <div className="mx-6 mb-4 mt-1 flex items-start gap-2 p-3 bg-red-50 rounded-xl">
          <span className="text-red-500 text-base shrink-0">⚠️</span>
          <p className="text-xs text-red-600 font-medium leading-relaxed">
            This password <strong>cannot be recovered</strong> after closing. Share it with the worker right away.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const ClipboardIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
)

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ worker, restaurants, onSave, onClose }) {
  const [form, setForm]         = useState({
    fullName:     worker.fullName,
    email:        worker.email,
    phoneNumber:  worker.phoneNumber,
    address:      worker.address,
    cnic:         worker.cnic,
    restaurantId: worker.restaurantId ?? '',
  })
  const [errors, setErrors]         = useState({})
  const [saving, setSaving]         = useState(false)
  const [photoFile, setPhotoFile]   = useState(null)
  const [photoPreview, setPhotoPreview] = useState(worker.profilePhotoUrl || null)

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}
    Object.keys(RULES).forEach(f => {
      const err = validate(f, form[f])
      if (err) newErrors[f] = err
    })
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSaving(true)
    try {
      await onSave(worker.id, {
        fullName:     form.fullName.trim(),
        email:        form.email.trim(),
        phoneNumber:  form.phoneNumber.trim(),
        address:      form.address.trim(),
        cnic:         form.cnic.trim(),
        restaurantId: form.restaurantId,
      }, photoFile)
    } catch (err) {
      toast(err.message || 'Failed to update worker', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-600 overflow-hidden shrink-0">
              {worker.profilePhotoUrl
                ? <img src={worker.profilePhotoUrl} alt={worker.fullName} className="w-full h-full object-cover" />
                : worker.fullName?.[0]?.toUpperCase()
              }
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Edit Worker</h3>
              <p className="text-xs text-gray-400">{worker.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          <PhotoPicker preview={photoPreview} onChange={(file, url) => { setPhotoFile(file); setPhotoPreview(url) }} />
          <Field label="Full Name"     required value={form.fullName}    onChange={handleChange('fullName')}    error={errors.fullName}    placeholder="e.g. Ahmed Raza" />
          <Field label="Email Address" required value={form.email}       onChange={handleChange('email')}       error={errors.email}       placeholder="worker@gmail.com" hint="Must be a Gmail address" type="email" />
          <Field label="Phone Number"  required value={form.phoneNumber} onChange={handleChange('phoneNumber')} error={errors.phoneNumber} placeholder="+923001234567" hint="Start with +92, no spaces" />
          <Field label="Address"       required value={form.address}     onChange={handleChange('address')}     error={errors.address}     placeholder="Block 5, Karachi" />
          <Field label="CNIC"          required value={form.cnic}        onChange={handleChange('cnic')}        error={errors.cnic}        placeholder="3520112345671" hint="Exactly 13 digits" maxLength={13} inputMode="numeric" />

          {/* Restaurant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restaurant <span className="text-red-500">*</span>
            </label>
            <select value={form.restaurantId} onChange={handleChange('restaurantId')}
              className={`input-field ${errors.restaurantId ? 'border-red-400 focus:ring-red-400' : ''}`}>
              <option value="">Select restaurant…</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {errors.restaurantId && <p className="text-xs text-red-500 mt-1">{errors.restaurantId}</p>}
          </div>

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
export default function ManageWorkers() {
  const [workers, setWorkers]       = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading]       = useState(true)
  const [form, setForm]         = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [newWorker, setNewWorker]   = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)
  const [photoFile, setPhotoFile]   = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const loadWorkers = () => {
    Promise.all([usersApi.getWorkers(), restaurantsApi.getAll()])
      .then(([w, r]) => { setWorkers(w); setRestaurants(r) })
      .catch(() => toast('Failed to load data', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadWorkers() }, [])

  // ── Form field change ────────────────────────────────────────────────────
  const handleChange = (field) => (e) => {
    const value = e.target.value
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear error on type
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate all fields
    const newErrors = {}
    Object.keys(RULES).forEach(f => {
      const err = validate(f, form[f])
      if (err) newErrors[f] = err
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      let worker = await usersApi.createWorker({
        fullName:     form.fullName.trim(),
        email:        form.email.trim(),
        phoneNumber:  form.phoneNumber.trim(),
        address:      form.address.trim(),
        cnic:         form.cnic.trim(),
        restaurantId: form.restaurantId,
      })
      // Guarantee restaurant is reflected immediately — fall back to local list
      // if the API response is missing it (same defensive pattern as CNIC fix)
      if (!worker.restaurant && form.restaurantId) {
        const local = restaurants.find(r => r.id === form.restaurantId)
        if (local) {
          worker = {
            ...worker,
            restaurantId: form.restaurantId,
            restaurant: {
              id:           local.id,
              name:         local.name,
              imageUrl:     local.imageUrl     ?? null,
              openTime:     local.openTime     ?? null,
              closeTime:    local.closeTime    ?? null,
              categoryName: local.categoryName ?? null,
            },
          }
        }
      }
      if (photoFile) {
        try {
          const photoResult = await usersApi.uploadWorkerPhoto(worker.id, photoFile)
          worker = { ...worker, profilePhotoUrl: photoResult.profilePhotoUrl }
        } catch {
          toast('Worker created but photo upload failed', 'warning')
        }
      }
      setNewWorker(worker)
      setForm(EMPTY)
      setErrors({})
      setPhotoFile(null)
      setPhotoPreview(null)
      setWorkers(prev => [worker, ...prev])
    } catch (err) {
      toast(err.message || 'Failed to create worker', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleEdit = async (id, data, photoFile) => {
    let updated = await usersApi.updateWorker(id, data)
    if (photoFile) {
      try {
        const photoResult = await usersApi.uploadWorkerPhoto(id, photoFile)
        updated = { ...updated, profilePhotoUrl: photoResult.profilePhotoUrl }
      } catch {
        toast('Details saved but photo upload failed', 'warning')
      }
    }
    setWorkers(prev => {
      const restaurantName = restaurants.find(r => r.id === data.restaurantId)?.name
      const merged = { ...prev.find(w => w.id === id), ...data, ...updated, ...(restaurantName && { restaurantName }) }
      setViewTarget(vt => vt?.id === id ? merged : vt)
      return prev.map(w => w.id === id ? merged : w)
    })
    setEditTarget(null)
    toast('Worker updated successfully', 'success')
  }

  // ── Toggle active ────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      const result = await usersApi.toggleActive(id)
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, isActive: result.isActive } : w))
      toast(result.isActive ? 'Worker activated' : 'Worker deactivated', 'success')
    } catch {
      toast('Failed to update worker status', 'error')
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await usersApi.deleteWorker(id)
      setWorkers(prev => prev.filter(w => w.id !== id))
      toast('Worker removed', 'success')
    } catch {
      toast('Failed to delete worker', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <AdminLayout title="Manage Workers">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Create Worker Form ───────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="text-xl">👷</span> Add New Worker
            </h2>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Photo */}
              <PhotoPicker
                preview={photoPreview}
                onChange={(file, url) => { setPhotoFile(file); setPhotoPreview(url) }}
              />

              {/* Full Name */}
              <Field
                label="Full Name" required
                value={form.fullName}
                onChange={handleChange('fullName')}
                error={errors.fullName}
                placeholder="e.g. Ahmed Raza"
              />

              {/* Email */}
              <Field
                label="Email Address" required type="email"
                value={form.email}
                onChange={handleChange('email')}
                error={errors.email}
                placeholder="worker@gmail.com"
                hint="Must be a Gmail address"
              />

              {/* Phone */}
              <Field
                label="Phone Number" required
                value={form.phoneNumber}
                onChange={handleChange('phoneNumber')}
                error={errors.phoneNumber}
                placeholder="+923001234567"
                hint="Start with +92, no spaces"
              />

              {/* Address */}
              <Field
                label="Address" required
                value={form.address}
                onChange={handleChange('address')}
                error={errors.address}
                placeholder="Block 5, Karachi"
              />

              {/* CNIC */}
              <Field
                label="CNIC" required
                value={form.cnic}
                onChange={handleChange('cnic')}
                error={errors.cnic}
                placeholder="3520112345671"
                hint="Exactly 13 digits, numbers only"
                maxLength={13}
                inputMode="numeric"
              />

              {/* Restaurant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.restaurantId}
                  onChange={e => { setForm(p => ({ ...p, restaurantId: e.target.value })); if (errors.restaurantId) setErrors(p => ({ ...p, restaurantId: null })) }}
                  className={`input-field ${errors.restaurantId ? 'border-red-400 focus:ring-red-400' : ''}`}
                >
                  <option value="">Select restaurant…</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {errors.restaurantId && <p className="text-xs text-red-500 mt-1">{errors.restaurantId}</p>}
              </div>

              {/* Auto-password note */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                <span className="text-blue-500 text-lg mt-0.5">🔑</span>
                <p className="text-xs text-blue-700">
                  Password will be <strong>auto-generated</strong> by the system and displayed once after creation.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary"
              >
                {submitting ? 'Creating…' : 'Create Worker'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Worker List ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">
              All Workers
              <span className="ml-2 text-sm font-normal text-gray-400">({workers.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-16 card">
              <p className="text-5xl mb-3">👷</p>
              <p className="text-gray-500 font-medium">No workers yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first kitchen worker using the form.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workers.map(w => (
                <div key={w.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewTarget(w)}>
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {w.profilePhotoUrl
                        ? <img src={w.profilePhotoUrl} alt={w.fullName} className="w-full h-full object-cover" />
                        : <span className="text-brand-600 font-bold text-xl sm:text-3xl">{w.fullName?.[0]?.toUpperCase()}</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{w.fullName}</p>
                        <span className={`badge text-xs ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {w.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{w.email}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                        <span>📞 {w.phoneNumber}</span>
                        <span>🪪 {w.cnic}</span>
                        <span>📅 {formatDate(w.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {w.address}</p>

                      {/* Restaurant strip */}
                      {w.restaurant ? (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            {w.restaurant.imageUrl ? (
                              <img src={w.restaurant.imageUrl} alt={w.restaurant.name}
                                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-200" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 text-xl">🏪</div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-800 truncate">{w.restaurant.name}</p>
                                <span className={`badge text-xs shrink-0 ${isOpenNow(w.restaurant.openTime, w.restaurant.closeTime) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                  {isOpenNow(w.restaurant.openTime, w.restaurant.closeTime) ? 'Open' : 'Closed'}
                                </span>
                              </div>
                              {w.restaurant.categoryName && <p className="text-xs text-gray-400">{w.restaurant.categoryName}</p>}
                              {w.restaurant.openTime && w.restaurant.closeTime && (
                                <p className="text-xs text-gray-400">{fmt12(w.restaurant.openTime)} – {fmt12(w.restaurant.closeTime)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-600 font-medium">
                          ⚠ No restaurant assigned
                        </div>
                      )}
                    </div>

                    {/* Actions — desktop */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditTarget(w)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Edit</button>
                      <button onClick={() => handleToggle(w.id)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${w.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{w.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => setDeleteTarget(w)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  </div>
                  {/* Actions — mobile */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 sm:hidden" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditTarget(w)} className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Edit</button>
                    <button onClick={() => handleToggle(w.id)} className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${w.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{w.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => setDeleteTarget(w)} className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      {viewTarget && (
        <WorkerDetailModal worker={viewTarget} onClose={() => setViewTarget(null)} />
      )}

      {/* ── Password Modal ─────────────────────────────────────────────────── */}
      {newWorker && (
        <PasswordModal worker={newWorker} onClose={() => setNewWorker(null)} />
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editTarget && (
        <EditModal
          worker={editTarget}
          restaurants={restaurants}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Delete Worker?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to remove <strong>{deleteTarget.fullName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="flex-1 btn-danger">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

// ── Worker Detail Modal ───────────────────────────────────────────────────────
function WorkerDetailModal({ worker: w, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-brand-500 to-brand-600 rounded-t-2xl p-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 shrink-0 flex items-center justify-center">
              {w.profilePhotoUrl
                ? <img src={w.profilePhotoUrl} alt={w.fullName} className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold">{w.fullName?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div>
              <h2 className="text-xl font-bold">{w.fullName}</h2>
              <p className="text-brand-100 text-sm">Kitchen Worker</p>
              <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${w.isActive ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
                {w.isActive ? '● Active' : '● Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Personal details */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Personal Info</p>
          <DetailRow icon="✉️" label="Email"   value={w.email} />
          <DetailRow icon="📞" label="Phone"   value={w.phoneNumber} />
          <DetailRow icon="📍" label="Address" value={w.address} />
          <DetailRow icon="🪪" label="CNIC"    value={w.cnic} mono />
          <DetailRow icon="📅" label="Joined"  value={new Date(w.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
        </div>

        {/* Restaurant */}
        <div className="px-6 pb-6 pt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Restaurant</p>
          {w.restaurant ? (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {w.restaurant.imageUrl && (
                <img src={w.restaurant.imageUrl} alt={w.restaurant.name} className="w-full h-32 object-cover" />
              )}
              <div className="p-4">
                <DetailRow icon="🏪" label="Name"     value={w.restaurant.name} />
                {w.restaurant.categoryName && <DetailRow icon="🍽️" label="Category" value={w.restaurant.categoryName} />}
                <DetailRow icon="🕐" label="Hours"
                  value={w.restaurant.openTime && w.restaurant.closeTime
                    ? `${fmt12(w.restaurant.openTime)} – ${fmt12(w.restaurant.closeTime)}`
                    : '24 / 7'} />
                <DetailRow icon="📍" label="Status"
                  value={isOpenNow(w.restaurant.openTime, w.restaurant.closeTime) ? 'Currently Open' : 'Currently Closed'} />
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-400 text-sm">
              No restaurant assigned
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

// ── Reusable field component ──────────────────────────────────────────────────
function Field({ label, required, value, onChange, error, placeholder, hint, type = 'text', maxLength, inputMode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`input-field ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
      />
      {error ? (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  )
}
