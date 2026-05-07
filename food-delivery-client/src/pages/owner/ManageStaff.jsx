import { useState, useEffect, useRef } from 'react'
import OwnerLayout from '../../components/common/OwnerLayout'
import { usersApi } from '../../api/users'
import { formatDate } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

// ── Validation ────────────────────────────────────────────────────────────────
const emailRe = /^[^\s@]+@gmail\.com$/i
const phoneRe = /^\+92[0-9]{10}$/

function validateFields(f) {
  const e = {}
  if (!f.fullName.trim())                  e.fullName    = 'Full name is required.'
  if (!emailRe.test(f.email.trim()))       e.email       = 'Must be a valid Gmail address.'
  if (!phoneRe.test(f.phoneNumber.trim())) e.phoneNumber = 'Must start with +92 followed by 10 digits.'
  if (!f.address.trim())                   e.address     = 'Address is required.'
  return e
}

const EMPTY = { fullName: '', email: '', phoneNumber: '', address: '' }

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
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover" />
          : <span className="text-2xl">👤</span>}
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
function PasswordModal({ staff, onClose }) {
  const { copiedKey, copy } = useCopy()
  const [allCopied, setAllCopied] = useState(false)
  const copyAll = () => {
    navigator.clipboard.writeText([
      'Kitchen Staff Credentials', '──────────────────────────────',
      `Name:       ${staff.fullName}`,
      `Email:      ${staff.email}`,
      `Phone:      ${staff.phoneNumber}`,
      `Password:   ${staff.generatedPassword}`,
      `Restaurant: ${staff.restaurantName}`,
    ].join('\n'))
    setAllCopied(true); setTimeout(() => setAllCopied(false), 2500)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl shrink-0">✅</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg">Staff Account Created!</h3>
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
          <CredentialRow label="Name"       value={staff.fullName}          fieldKey="n" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Email"      value={staff.email}             fieldKey="e" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Phone"      value={staff.phoneNumber}       fieldKey="p" copiedKey={copiedKey} onCopy={copy} />
          <CredentialRow label="Password"   value={staff.generatedPassword} fieldKey="w" copiedKey={copiedKey} onCopy={copy} mono />
        </div>
        <div className="mx-6 mb-2 p-3 bg-brand-50 rounded-xl">
          <p className="text-xs font-semibold text-brand-700">🏪 Assigned to: {staff.restaurantName}</p>
        </div>
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
function EditModal({ staff, onSave, onClose }) {
  const [form, setForm]           = useState({ fullName: staff.fullName, email: staff.email, phoneNumber: staff.phoneNumber, address: staff.address })
  const [errors, setErrors]       = useState({})
  const [saving, setSaving]       = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(staff.profilePhotoUrl || null)

  const ch = field => e => { setForm(p => ({ ...p, [field]: e.target.value })); if (errors[field]) setErrors(p => ({ ...p, [field]: null })) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateFields(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await onSave(staff.id, {
        fullName: form.fullName.trim(), email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(), address: form.address.trim(),
      }, photoFile)
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else toast(err.message || 'Failed to update', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Edit Staff Member</h3>
            <p className="text-xs text-gray-400 mt-0.5">🏪 {staff.restaurantName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          <PhotoPicker preview={photoPreview} onChange={(f, u) => { setPhotoFile(f); setPhotoPreview(u) }} />
          <Field label="Full Name"    required value={form.fullName}    onChange={ch('fullName')}    error={errors.fullName}    placeholder="Ali Hassan" />
          <Field label="Email"        required value={form.email}       onChange={ch('email')}       error={errors.email}       placeholder="staff@gmail.com" type="email" />
          <Field label="Phone"        required value={form.phoneNumber} onChange={ch('phoneNumber')} error={errors.phoneNumber} placeholder="+923001234567" />
          <Field label="Address"      required value={form.address}     onChange={ch('address')}     error={errors.address}     placeholder="Lahore" />
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
export default function ManageStaff() {
  const [staffList, setStaffList]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [errors, setErrors]           = useState({})
  const [submitting, setSubmitting]   = useState(false)
  const [newStaff, setNewStaff]       = useState(null)
  const [editTarget, setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [form, setForm]               = useState(EMPTY)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const loadData = () => {
    setLoading(true)
    usersApi.getStaff()
      .then(s => setStaffList(s))
      .catch(() => toast('Failed to load staff', 'error'))
      .finally(() => setLoading(false))
  }
  useEffect(loadData, [])

  const chF = field => e => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: null }))
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateFields(form)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      let member = await usersApi.createStaff({
        fullName:    form.fullName.trim(),
        email:       form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        address:     form.address.trim(),
      })

      if (photoFile) {
        try {
          const pr = await usersApi.uploadStaffPhoto(member.id, photoFile)
          member = { ...member, profilePhotoUrl: pr.profilePhotoUrl }
        } catch { toast('Staff created but photo upload failed', 'warning') }
      }

      setNewStaff(member)
      setStaffList(prev => [member, ...prev])
      setForm(EMPTY); setErrors({}); setPhotoFile(null); setPhotoPreview(null)
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else toast(err.message || 'Failed to create staff member', 'error')
    } finally { setSubmitting(false) }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = async (id, data, file) => {
    let updated = await usersApi.updateStaff(id, data)
    if (file) {
      try {
        const pr = await usersApi.uploadStaffPhoto(id, file)
        updated = { ...updated, profilePhotoUrl: pr.profilePhotoUrl }
      } catch { toast('Details saved but photo upload failed', 'warning') }
    }
    setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s))
    setEditTarget(null)
    toast('Staff member updated', 'success')
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      const r = await usersApi.toggleActive(id)
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, isActive: r.isActive } : s))
      toast(r.isActive ? 'Staff activated' : 'Staff deactivated', 'success')
    } catch { toast('Failed to update status', 'error') }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await usersApi.deleteStaff(id)
      setStaffList(prev => prev.filter(s => s.id !== id))
      toast('Staff member removed', 'success')
    } catch (err) {
      toast(err.message || 'Failed to delete', 'error')
    } finally { setDeleteTarget(null) }
  }

  return (
    <OwnerLayout title="Kitchen Staff">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Create Form ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="text-xl">👨‍🍳</span> Add Kitchen Staff
            </h2>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <PhotoPicker preview={photoPreview} onChange={(f, u) => { setPhotoFile(f); setPhotoPreview(u) }} />
              <Field label="Full Name"     required value={form.fullName}    onChange={chF('fullName')}    error={errors.fullName}    placeholder="Ali Hassan" />
              <Field label="Email Address" required value={form.email}       onChange={chF('email')}       error={errors.email}       placeholder="staff@gmail.com"  type="email" hint="Gmail only" />
              <Field label="Phone Number"  required value={form.phoneNumber} onChange={chF('phoneNumber')} error={errors.phoneNumber} placeholder="+923001234567"     hint="+92 + 10 digits" />
              <Field label="Address"       required value={form.address}     onChange={chF('address')}     error={errors.address}     placeholder="Lahore, Punjab" />

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                <span className="text-blue-500 text-lg mt-0.5">🔑</span>
                <p className="text-xs text-blue-700">Password will be <strong>auto-generated</strong> and shown once after creation.</p>
              </div>
              <button type="submit" disabled={submitting} className="w-full btn-primary">
                {submitting ? 'Creating…' : 'Add Staff Member'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Staff List ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">
              Staff Members <span className="ml-2 text-sm font-normal text-gray-400">({staffList.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2 pt-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-16 card">
              <p className="text-5xl mb-3">👨‍🍳</p>
              <p className="text-gray-500 font-medium">No kitchen staff yet</p>
              <p className="text-gray-400 text-sm mt-1">Add your first team member using the form.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staffList.map(s => (
                <div key={s.id} className="card p-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {s.profilePhotoUrl
                        ? <img src={s.profilePhotoUrl} alt={s.fullName} className="w-full h-full object-cover" />
                        : <span className="text-brand-600 font-bold text-2xl">{s.fullName?.[0]?.toUpperCase()}</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{s.fullName}</p>
                        <span className={`badge text-xs ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="badge text-xs bg-purple-100 text-purple-700">👨‍🍳 Kitchen Staff</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-0.5">{s.email}</p>
                      <div className="flex flex-wrap gap-x-4 text-xs text-gray-400 mt-1">
                        <span>📞 {s.phoneNumber}</span>
                        <span>📅 {formatDate(s.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {s.address}</p>
                    </div>

                    {/* Actions — desktop */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <button onClick={() => setEditTarget(s)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Edit</button>
                      <button onClick={() => handleToggle(s.id)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${s.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{s.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => setDeleteTarget(s)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  </div>
                  {/* Actions — mobile */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 sm:hidden">
                    <button onClick={() => setEditTarget(s)} className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Edit</button>
                    <button onClick={() => handleToggle(s.id)} className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${s.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{s.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => setDeleteTarget(s)} className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {newStaff   && <PasswordModal staff={newStaff} onClose={() => setNewStaff(null)} />}
      {editTarget && <EditModal staff={editTarget} onSave={handleEdit} onClose={() => setEditTarget(null)} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Remove Staff Member?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Remove <strong>{deleteTarget.fullName}</strong> from your kitchen team? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="flex-1 btn-danger">Remove</button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({ label, required, value, onChange, error, placeholder, hint, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className={`input-field ${error ? 'border-red-400 focus:ring-red-400' : ''}`} />
      {error  ? <p className="text-xs text-red-500 mt-1">{error}</p>
              : hint ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
    </div>
  )
}
