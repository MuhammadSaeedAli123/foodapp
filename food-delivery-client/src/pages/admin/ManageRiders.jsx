import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/common/AdminLayout'
import { usersApi, adminApi } from '../../api/users'
import { formatDate } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

// ── Validation ────────────────────────────────────────────────────────────────
const RULES = {
  fullName:            { required: true,  label: 'Full Name' },
  email:               { required: true,  label: 'Email',
                         pattern: /^[^\s@]+@gmail\.com$/i,
                         hint: 'Must be a Gmail address (e.g. name@gmail.com)' },
  phoneNumber:         { required: true,  label: 'Phone Number',
                         pattern: /^\+92[0-9]{10}$/,
                         hint: 'Must start with +92 followed by 10 digits, no spaces' },
  address:             { required: true,  label: 'Address' },
  cnic:                { required: true,  label: 'CNIC',
                         pattern: /^\d{13}$/,
                         hint: 'Must be exactly 13 digits (numbers only)' },
  vehicleRegistration: { required: true,  label: 'Registration Number' },
  vehicleModel:        { required: true,  label: 'Vehicle Model' },
  vehicleYear:         { required: true,  label: 'Model Year',
                         pattern: /^(19[9-9]\d|20[0-2]\d|2030)$/,
                         hint: 'Year between 1990 and 2030' },
  vehicleType:         { required: true,  label: 'Vehicle Type' },
}

function validate(field, value) {
  const rule = RULES[field]
  if (!rule) return null
  const v = String(value ?? '').trim()
  if (rule.required && !v) return `${rule.label} is required.`
  if (rule.pattern && v && !rule.pattern.test(v)) return rule.hint ?? `${rule.label} is invalid.`
  return null
}

const EMPTY = {
  fullName: '', email: '', phoneNumber: '', address: '', cnic: '',
  vehicleRegistration: '', vehicleModel: '', vehicleYear: '', vehicleType: '',
}

const VEHICLE_TYPES = ['Bike', 'Car', 'Scooter']

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
function PhotoPicker({ preview, onChange, label = 'profile photo', required = false, error }) {
  const inputRef = useRef(null)
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast('Photo must be under 2 MB', 'error'); return }
    onChange(file, URL.createObjectURL(file))
  }
  return (
    <div>
      <div className="flex items-center gap-4">
        <div
          onClick={() => inputRef.current?.click()}
          className={`w-16 h-16 rounded-full border-2 border-dashed cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 shrink-0 transition-colors ${
            error ? 'border-red-400' : 'border-gray-300 hover:border-brand-400'
          }`}
        >
          {preview
            ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
            : <span className="text-2xl">{label.includes('vehicle') ? '🚗' : '👤'}</span>
          }
        </div>
        <div className="min-w-0">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="text-sm font-medium text-brand-600 hover:text-brand-700">
            {preview ? `Change ${label}` : `Upload ${label}`}
          </button>
          <p className="text-xs text-gray-400 mt-0.5">
            JPEG, PNG or WebP · max 2 MB{required ? '' : ' (optional)'}
          </p>
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          onChange={handleFile} className="hidden" />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Credential row ────────────────────────────────────────────────────────────
function CredentialRow({ label, value, fieldKey, copiedKey, onCopy, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-20 shrink-0">{label}</span>
      <span className={`flex-1 text-sm font-semibold text-gray-800 truncate ${mono ? 'font-mono tracking-widest text-brand-600' : ''}`}>
        {value}
      </span>
      <button onClick={() => onCopy(fieldKey, value)}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
          copiedKey === fieldKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-600'
        }`}>
        {copiedKey === fieldKey ? <CheckIcon /> : <ClipboardIcon />}
        {copiedKey === fieldKey ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

// ── Password modal ────────────────────────────────────────────────────────────
function PasswordModal({ rider, onClose }) {
  const { copiedKey, copy } = useCopy()
  const [allCopied, setAllCopied] = useState(false)

  const copyAll = () => {
    const text = [
      `Rider Credentials`,
      `──────────────────`,
      `Name:     ${rider.fullName}`,
      `Email:    ${rider.email}`,
      `Phone:    ${rider.phoneNumber}`,
      `CNIC:     ${rider.cnic}`,
      `Password: ${rider.generatedPassword}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl shrink-0">✅</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg">Rider Created!</h3>
            <p className="text-sm text-gray-400">Password shown once — copy before closing.</p>
          </div>
          <button onClick={copyAll}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              allCopied ? 'bg-green-100 text-green-700' : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}>
            {allCopied ? <CheckIcon /> : <ClipboardIcon />}
            {allCopied ? 'Copied!' : 'Copy All'}
          </button>
        </div>
        <div className="px-6 py-2">
          <CredentialRow label="Name"     value={rider.fullName}          fieldKey="name"  copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Email"    value={rider.email}             fieldKey="email" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Phone"    value={rider.phoneNumber}       fieldKey="phone" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="CNIC"     value={rider.cnic}              fieldKey="cnic"  copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Password" value={rider.generatedPassword} fieldKey="pass"  copiedKey={copiedKey} onCopy={copy} mono />
        </div>
        <div className="mx-6 mb-4 mt-1 flex items-start gap-2 p-3 bg-red-50 rounded-xl">
          <span className="text-red-500 shrink-0">⚠️</span>
          <p className="text-xs text-red-600 font-medium leading-relaxed">
            This password <strong>cannot be recovered</strong> after closing. Share it with the rider right away.
          </p>
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full btn-primary">Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ rider, onSave, onClose }) {
  const [form, setForm] = useState({
    fullName:            rider.fullName,
    email:               rider.email,
    phoneNumber:         rider.phoneNumber,
    address:             rider.address,
    cnic:                rider.cnic,
    vehicleRegistration: rider.vehicle?.registrationNumber ?? '',
    vehicleModel:        rider.vehicle?.model ?? '',
    vehicleYear:         String(rider.vehicle?.year ?? ''),
    vehicleType:         rider.vehicle?.type ?? '',
  })
  const [errors, setErrors]               = useState({})
  const [saving, setSaving]               = useState(false)
  const [photoFile, setPhotoFile]         = useState(null)
  const [photoPreview, setPhotoPreview]   = useState(rider.profilePhotoUrl || null)
  const [vPhotoFile, setVPhotoFile]       = useState(null)
  const [vPhotoPreview, setVPhotoPreview] = useState(rider.vehicle?.pictureUrl || null)

  const UPPER_FIELDS = ['vehicleRegistration', 'vehicleModel']
  const handleChange = (field) => (e) => {
    const value = UPPER_FIELDS.includes(field) ? e.target.value.toUpperCase() : e.target.value
    setForm(prev => ({ ...prev, [field]: value }))
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
      await onSave(rider.id, {
        fullName: form.fullName.trim(), email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(), address: form.address.trim(), cnic: form.cnic.trim(),
        vehicleRegistration: form.vehicleRegistration.trim(), vehicleModel: form.vehicleModel.trim(),
        vehicleYear: Number(form.vehicleYear), vehicleType: form.vehicleType,
      }, photoFile, vPhotoFile)
    } catch (err) {
      toast(err.message || 'Failed to update rider', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-600 overflow-hidden shrink-0">
              {rider.profilePhotoUrl
                ? <img src={rider.profilePhotoUrl} alt={rider.fullName} className="w-full h-full object-cover" />
                : rider.fullName?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Edit Rider</h3>
              <p className="text-xs text-gray-400">{rider.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {/* Profile photo */}
          <PhotoPicker preview={photoPreview}
            onChange={(f, u) => { setPhotoFile(f); setPhotoPreview(u) }} />

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Personal</p>
            <div className="space-y-3">
              <Field label="Full Name"    required value={form.fullName}    onChange={handleChange('fullName')}    error={errors.fullName}    placeholder="Ahmed Raza" />
              <Field label="Email"        required value={form.email}       onChange={handleChange('email')}       error={errors.email}       placeholder="rider@gmail.com" type="email" hint="Gmail only" />
              <Field label="Phone"        required value={form.phoneNumber} onChange={handleChange('phoneNumber')} error={errors.phoneNumber} placeholder="+923001234567" hint="+92 + 10 digits" />
              <Field label="Address"      required value={form.address}     onChange={handleChange('address')}     error={errors.address}     placeholder="Block 5, Karachi" />
              <Field label="CNIC"         required value={form.cnic}        onChange={handleChange('cnic')}        error={errors.cnic}        placeholder="3520112345671" hint="13 digits" maxLength={13} inputMode="numeric" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vehicle</p>
            <div className="space-y-3">
              <PhotoPicker preview={vPhotoPreview} label="vehicle photo"
                onChange={(f, u) => { setVPhotoFile(f); setVPhotoPreview(u) }} />
              <Field label="Registration No." required value={form.vehicleRegistration} onChange={handleChange('vehicleRegistration')} error={errors.vehicleRegistration} placeholder="ABC-123" />
              <Field label="Model"            required value={form.vehicleModel}        onChange={handleChange('vehicleModel')}        error={errors.vehicleModel}        placeholder="Honda CB150F" />
              <Field label="Year"             required value={form.vehicleYear}         onChange={handleChange('vehicleYear')}         error={errors.vehicleYear}         placeholder="2022" maxLength={4} inputMode="numeric" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  {VEHICLE_TYPES.map(t => (
                    <button key={t} type="button"
                      onClick={() => { setForm(prev => ({ ...prev, vehicleType: t })); if (errors.vehicleType) setErrors(prev => ({ ...prev, vehicleType: null })) }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.vehicleType === t
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                      }`}>
                      {t === 'Bike' ? '🏍️' : t === 'Car' ? '🚗' : '🛵'} {t}
                    </button>
                  ))}
                </div>
                {errors.vehicleType && <p className="text-xs text-red-500 mt-1">{errors.vehicleType}</p>}
              </div>
            </div>
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

// ── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ rider, onConfirm, onClose }) {
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try { await onConfirm(rider.id, reason) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-gray-900 mb-1">Reject Application</h3>
        <p className="text-sm text-gray-500 mb-4">
          Reject <strong>{rider.fullName}</strong>'s rider application?
          An email will be sent with the reason.
        </p>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Reason (optional — will be included in the email)"
          rows={3}
          className="input-field resize-none text-sm mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 btn-danger">
            {loading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageRiders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'pending' ? 'pending' : 'all'

  const [riders, setRiders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [pending, setPending]       = useState([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [form, setForm]             = useState(EMPTY)
  const [errors, setErrors]         = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [newRider, setNewRider]     = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)

  const [photoFile, setPhotoFile]         = useState(null)
  const [photoPreview, setPhotoPreview]   = useState(null)
  const [vPhotoFile, setVPhotoFile]       = useState(null)
  const [vPhotoPreview, setVPhotoPreview] = useState(null)
  const [vPhotoError, setVPhotoError]     = useState(null)

  useEffect(() => {
    usersApi.getRiders()
      .then(r => setRiders(Array.isArray(r) ? r : []))
      .catch(() => toast('Failed to load riders', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const fetchPending = () => {
    setLoadingPending(true)
    adminApi.getPendingRiders()
      .then(r => setPending(Array.isArray(r) ? r : []))
      .catch(() => toast('Failed to load pending riders', 'error'))
      .finally(() => setLoadingPending(false))
  }

  useEffect(() => { fetchPending() }, [])

  const handleApprove = async (id) => {
    try {
      await adminApi.approveRider(id)
      setPending(prev => prev.filter(r => r.id !== id))
      toast('Rider approved — confirmation email sent', 'success')
    } catch { toast('Failed to approve rider', 'error') }
  }

  const handleReject = async (id, reason) => {
    try {
      await adminApi.rejectRider(id, reason)
      setPending(prev => prev.filter(r => r.id !== id))
      setRejectTarget(null)
      toast('Rider rejected — notification email sent', 'success')
    } catch { toast('Failed to reject rider', 'error') }
  }

  const UPPER_FIELDS = ['vehicleRegistration', 'vehicleModel']
  const handleChange = (field) => (e) => {
    const value = UPPER_FIELDS.includes(field) ? e.target.value.toUpperCase() : e.target.value
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  // ── Create ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}
    Object.keys(RULES).forEach(f => {
      const err = validate(f, form[f])
      if (err) newErrors[f] = err
    })
    if (!vPhotoFile) { newErrors.vPhoto = 'Vehicle photo is required.' }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); setVPhotoError(newErrors.vPhoto || null); return }
    setVPhotoError(null)

    setSubmitting(true)
    try {
      let rider = await usersApi.createRider({
        fullName: form.fullName.trim(), email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(), address: form.address.trim(), cnic: form.cnic.trim(),
        vehicleRegistration: form.vehicleRegistration.trim(), vehicleModel: form.vehicleModel.trim(),
        vehicleYear: Number(form.vehicleYear), vehicleType: form.vehicleType,
      })

      // Upload vehicle photo (required)
      try {
        const vr = await usersApi.uploadVehiclePhoto(rider.id, vPhotoFile)
        rider = { ...rider, vehicle: { ...rider.vehicle, pictureUrl: vr.pictureUrl } }
      } catch { toast('Rider created but vehicle photo upload failed', 'warning') }

      // Upload profile photo (optional)
      if (photoFile) {
        try {
          const pr = await usersApi.uploadRiderPhoto(rider.id, photoFile)
          rider = { ...rider, profilePhotoUrl: pr.profilePhotoUrl }
        } catch { toast('Rider created but profile photo upload failed', 'warning') }
      }

      setNewRider(rider)
      setRiders(prev => [rider, ...prev])
      setForm(EMPTY)
      setErrors({})
      setPhotoFile(null); setPhotoPreview(null)
      setVPhotoFile(null); setVPhotoPreview(null)
    } catch (err) {
      toast(err.message || 'Failed to create rider', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = async (id, data, photoFile, vPhotoFile) => {
    let updated = await usersApi.updateRider(id, data)
    if (photoFile) {
      try {
        const pr = await usersApi.uploadRiderPhoto(id, photoFile)
        updated = { ...updated, profilePhotoUrl: pr.profilePhotoUrl }
      } catch { toast('Details saved but profile photo upload failed', 'warning') }
    }
    if (vPhotoFile) {
      try {
        const vr = await usersApi.uploadVehiclePhoto(id, vPhotoFile)
        updated = { ...updated, vehicle: { ...updated.vehicle, pictureUrl: vr.pictureUrl } }
      } catch { toast('Details saved but vehicle photo upload failed', 'warning') }
    }
    setRiders(prev => {
      const merged = { ...prev.find(r => r.id === id), ...data, ...updated }
      setViewTarget(vt => vt?.id === id ? merged : vt)
      return prev.map(r => r.id === id ? merged : r)
    })
    setEditTarget(null)
    toast('Rider updated successfully', 'success')
  }

  // ── Toggle / Delete ───────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      const result = await usersApi.toggleActive(id)
      setRiders(prev => prev.map(r => r.id === id ? { ...r, isActive: result.isActive } : r))
      toast(result.isActive ? 'Rider activated' : 'Rider deactivated', 'success')
    } catch { toast('Failed to update rider status', 'error') }
  }

  const handleDelete = async (id) => {
    try {
      await usersApi.deleteRider(id)
      setRiders(prev => prev.filter(r => r.id !== id))
      toast('Rider removed', 'success')
    } catch { toast('Failed to delete rider', 'error') }
    finally { setDeleteTarget(null) }
  }

  return (
    <AdminLayout title="Manage Riders">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Create Form ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="text-xl">🛵</span> Add New Rider
            </h2>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Profile photo (optional) */}
              <PhotoPicker preview={photoPreview}
                onChange={(f, u) => { setPhotoFile(f); setPhotoPreview(u) }} />

              {/* ── Personal ── */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Personal Information</p>
                <div className="space-y-3">
                  <Field label="Full Name"     required value={form.fullName}    onChange={handleChange('fullName')}    error={errors.fullName}    placeholder="e.g. Ahmed Raza" />
                  <Field label="Email Address" required value={form.email}       onChange={handleChange('email')}       error={errors.email}       placeholder="rider@gmail.com" hint="Must be a Gmail address" type="email" />
                  <Field label="Phone Number"  required value={form.phoneNumber} onChange={handleChange('phoneNumber')} error={errors.phoneNumber} placeholder="+923001234567" hint="Start with +92, no spaces" />
                  <Field label="Address"       required value={form.address}     onChange={handleChange('address')}     error={errors.address}     placeholder="Block 5, Karachi" />
                  <Field label="CNIC"          required value={form.cnic}        onChange={handleChange('cnic')}        error={errors.cnic}        placeholder="3520112345671" hint="Exactly 13 digits" maxLength={13} inputMode="numeric" />
                </div>
              </div>

              {/* ── Vehicle ── */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vehicle Information</p>
                <div className="space-y-3">

                  {/* Vehicle photo (required) */}
                  <PhotoPicker preview={vPhotoPreview} label="vehicle photo" required
                    error={vPhotoError}
                    onChange={(f, u) => { setVPhotoFile(f); setVPhotoPreview(u); setVPhotoError(null) }} />

                  <Field label="Registration No." required value={form.vehicleRegistration} onChange={handleChange('vehicleRegistration')} error={errors.vehicleRegistration} placeholder="ABC-123" />
                  <Field label="Vehicle Model"     required value={form.vehicleModel}        onChange={handleChange('vehicleModel')}        error={errors.vehicleModel}        placeholder="Honda CB150F" />
                  <Field label="Model Year"        required value={form.vehicleYear}         onChange={handleChange('vehicleYear')}         error={errors.vehicleYear}         placeholder="2022" maxLength={4} inputMode="numeric" />

                  {/* Vehicle type toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {VEHICLE_TYPES.map(t => (
                        <button key={t} type="button"
                          onClick={() => { setForm(prev => ({ ...prev, vehicleType: t })); if (errors.vehicleType) setErrors(prev => ({ ...prev, vehicleType: null })) }}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            form.vehicleType === t
                              ? 'bg-brand-500 text-white border-brand-500'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                          }`}>
                          {t === 'Bike' ? '🏍️' : t === 'Car' ? '🚗' : '🛵'} {t}
                        </button>
                      ))}
                    </div>
                    {errors.vehicleType && <p className="text-xs text-red-500 mt-1">{errors.vehicleType}</p>}
                  </div>
                </div>
              </div>

              {/* Auto-password note */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                <span className="text-blue-500 text-lg mt-0.5">🔑</span>
                <p className="text-xs text-blue-700">
                  Password will be <strong>auto-generated</strong> and shown once after creation.
                </p>
              </div>

              <button type="submit" disabled={submitting} className="w-full btn-primary">
                {submitting ? 'Creating…' : 'Create Rider'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Rider List ────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setSearchParams({})}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              All Riders
              <span className="ml-1.5 text-xs text-gray-400">({riders.length})</span>
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'pending' })}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Pending Approval
              {pending.length > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pending.length}
                </span>
              )}
            </button>
          </div>

          {/* ── All Riders tab ── */}
          {activeTab === 'all' && (
            loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-full bg-gray-200 shrink-0" />
                      <div className="flex-1 space-y-2 pt-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : riders.length === 0 ? (
              <div className="text-center py-16 card">
                <p className="text-5xl mb-3">🛵</p>
                <p className="text-gray-500 font-medium">No riders yet</p>
                <p className="text-gray-400 text-sm mt-1">Create your first rider using the form.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {riders.map(r => (
                  <div key={r.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewTarget(r)}>
                    <div className="flex items-start gap-3">

                      {/* Avatar */}
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {r.profilePhotoUrl
                          ? <img src={r.profilePhotoUrl} alt={r.fullName} className="w-full h-full object-cover" />
                          : <span className="text-brand-600 font-bold text-xl sm:text-3xl">{r.fullName?.[0]?.toUpperCase()}</span>
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{r.fullName}</p>
                          <span className={`badge text-xs ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {r.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{r.email}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                          <span>📞 {r.phoneNumber}</span>
                          <span>🪪 {r.cnic}</span>
                          <span>📅 {formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {r.address}</p>

                        {/* Vehicle strip */}
                        {r.vehicle && (
                          <div className="mt-3 flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                            {r.vehicle.pictureUrl ? (
                              <img src={r.vehicle.pictureUrl} alt="vehicle"
                                className="w-14 h-10 rounded-lg object-cover shrink-0 border border-gray-200" />
                            ) : (
                              <div className="w-14 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 text-xl">
                                {r.vehicle.type === 'Car' ? '🚗' : r.vehicle.type === 'Scooter' ? '🛵' : '🏍️'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-700 truncate">
                                {r.vehicle.type} · {r.vehicle.model} ({r.vehicle.year})
                              </p>
                              <p className="text-xs text-gray-400">{r.vehicle.registrationNumber}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions — desktop */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditTarget(r)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Edit</button>
                        <button onClick={() => handleToggle(r.id)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${r.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{r.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button onClick={() => setDeleteTarget(r)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>
                      </div>
                    </div>
                    {/* Actions — mobile */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 sm:hidden" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditTarget(r)} className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Edit</button>
                      <button onClick={() => handleToggle(r.id)} className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${r.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{r.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => setDeleteTarget(r)} className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Pending Approval tab ── */}
          {activeTab === 'pending' && (
            loadingPending ? (
              <div className="space-y-3">
                {[1,2].map(i => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-16 card">
                <p className="text-5xl mb-3">✅</p>
                <p className="text-gray-500 font-medium">No pending applications</p>
                <p className="text-gray-400 text-sm mt-1">All rider applications have been reviewed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(r => (
                  <div key={r.id} className="card p-4 border-l-4 border-orange-400">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0 font-bold text-orange-600 text-lg">
                        {r.fullName?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-semibold text-gray-900">{r.fullName}</p>
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Pending</span>
                        </div>
                        <p className="text-sm text-gray-500">{r.email}</p>
                        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-400">
                          <span>📞 {r.phoneNumber}</span>
                          <span>🪪 {r.cnic || '—'}</span>
                          <span>📍 {r.city || '—'}</span>
                          <span>📅 {formatDate(r.createdAt)}</span>
                        </div>
                        {r.vehicle && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                            <span>{r.vehicle.type === 'Car' ? '🚗' : '🛵'}</span>
                            <span>{r.vehicle.type} · {r.vehicle.registrationNumber}</span>
                            {r.vehicle.color && <span>· {r.vehicle.color}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => handleApprove(r.id)}
                        className="flex-1 text-sm font-semibold py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors">
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setRejectTarget(r)}
                        className="flex-1 text-sm font-semibold py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Detail Modal ───────────────────────────────────────────────── */}
      {viewTarget && <RiderDetailModal rider={viewTarget} onClose={() => setViewTarget(null)} />}

      {/* ── Password Modal ─────────────────────────────────────────────── */}
      {newRider && <PasswordModal rider={newRider} onClose={() => setNewRider(null)} />}

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      {editTarget && (
        <EditModal rider={editTarget} onSave={handleEdit} onClose={() => setEditTarget(null)} />
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Delete Rider?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to remove <strong>{deleteTarget.fullName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="flex-1 btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ───────────────────────────────────────────────── */}
      {rejectTarget && (
        <RejectModal
          rider={rejectTarget}
          onConfirm={handleReject}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </AdminLayout>
  )
}

// ── Rider Detail Modal ────────────────────────────────────────────────────────
function RiderDetailModal({ rider: r, onClose }) {
  const v = r.vehicle
  const vehicleIcon = v?.type === 'Car' ? '🚗' : v?.type === 'Scooter' ? '🛵' : '🏍️'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-t-2xl p-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 shrink-0 flex items-center justify-center">
              {r.profilePhotoUrl
                ? <img src={r.profilePhotoUrl} alt={r.fullName} className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold">{r.fullName?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div>
              <h2 className="text-xl font-bold">{r.fullName}</h2>
              <p className="text-orange-100 text-sm">Delivery Rider</p>
              <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${r.isActive ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
                {r.isActive ? '● Active' : '● Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Personal details */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Personal Info</p>
          <DetailRow icon="✉️" label="Email"   value={r.email} />
          <DetailRow icon="📞" label="Phone"   value={r.phoneNumber} />
          <DetailRow icon="📍" label="Address" value={r.address} />
          <DetailRow icon="🪪" label="CNIC"    value={r.cnic} mono />
          <DetailRow icon="📅" label="Joined"  value={new Date(r.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
        </div>

        {/* Vehicle details */}
        <div className="px-6 pb-6 pt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Vehicle</p>
          {v ? (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {v.pictureUrl ? (
                <img src={v.pictureUrl} alt="vehicle" className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-24 bg-gray-50 flex items-center justify-center text-5xl">{vehicleIcon}</div>
              )}
              <div className="p-4">
                <DetailRow icon={vehicleIcon} label="Type"  value={v.type} />
                <DetailRow icon="🔧"          label="Model" value={`${v.model} (${v.year})`} />
                <DetailRow icon="🔢"          label="Plate" value={v.registrationNumber} mono />
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-400 text-sm">
              No vehicle info available
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

// ── Reusable field ────────────────────────────────────────────────────────────
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
