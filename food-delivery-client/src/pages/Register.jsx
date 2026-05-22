import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { riderApi } from '../api/rider'
import { toast } from '../components/common/Toast'

const EMPTY = {
  fullName: '', email: '', password: '', phoneNumber: '', address: '',
  role: 'User', cnic: '', vehicleNumber: '', vehicleColor: '',
}

export default function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]         = useState(EMPTY)
  const [error, setError]       = useState('')
  const [show, setShow]         = useState(false)
  const [vehicleImage, setVehicleImage] = useState(null)   // { file, preview }
  const [uploading, setUploading]       = useState(false)
  const fileInputRef = useRef(null)

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  const isRider = form.role === 'Rider'

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVehicleImage({ file, preview: URL.createObjectURL(file) })
  }

  const removeImage = () => {
    if (vehicleImage?.preview) URL.revokeObjectURL(vehicleImage.preview)
    setVehicleImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(form)

      if (isRider && vehicleImage?.file) {
        setUploading(true)
        try {
          await riderApi.uploadVehicleImage(vehicleImage.file)
        } catch {
          // non-fatal — rider can upload photo from their dashboard later
        } finally {
          setUploading(false)
        }
      }

      toast('Account created! Welcome aboard.', 'success')
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-100 py-10 px-4">
      <div className="w-full max-w-md mx-auto">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Food<span className="text-brand-500">Rush</span></span>
          </Link>
          <p className="mt-2 text-gray-500 text-sm">Create your account</p>
        </div>

        <div className="card p-8 animate-slide-up">

          {/* Back link */}
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-500 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Get started</h2>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Role selector ────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I want to join as</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'User',  label: 'Customer', icon: '🛍️' },
                  { value: 'Rider', label: 'Rider',    icon: '🛵' },
                ].map(({ value, label, icon }) => (
                  <button key={value} type="button"
                    onClick={() => setForm(p => ({ ...p, role: value }))}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      form.role === value
                        ? 'border-brand-500 bg-brand-50 text-brand-600'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <span>{icon}</span>{label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Personal Information ─────────────────── */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span>👤</span> Personal Information
              </p>
              <div className="space-y-3">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input name="fullName" type="text" required
                    value={form.fullName} onChange={set}
                    placeholder="John Doe" className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input name="email" type="email" required autoComplete="email"
                    value={form.email} onChange={set}
                    placeholder="you@example.com" className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input name="password" type={show ? 'text' : 'password'} required minLength={6}
                      value={form.password} onChange={set}
                      placeholder="Min. 6 characters" className="input-field pr-12" />
                    <button type="button" onClick={() => setShow(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {show
                        ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input name="phoneNumber" type="tel" required
                    value={form.phoneNumber} onChange={set}
                    placeholder="+1 234 567 8900" className="input-field" />
                </div>

                {!isRider && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Delivery Address <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea name="address" rows={2}
                      value={form.address} onChange={set}
                      placeholder="e.g. 123 Main St, Apt 4B, New York"
                      className="input-field resize-none" />
                    <p className="text-xs text-gray-400 mt-1">Used to pre-fill your delivery address at checkout</p>
                  </div>
                )}

              </div>
            </div>

            {/* ── Rider-Specific Information ───────────── */}
            {isRider && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span>🛵</span> Rider Information
                </p>
                <div className="space-y-3">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      CNIC <span className="text-red-500">*</span>
                    </label>
                    <input name="cnic" type="text" required={isRider}
                      value={form.cnic} onChange={set}
                      placeholder="e.g. 42101-1234567-1" className="input-field" />
                    <p className="text-xs text-gray-400 mt-1">Used for identity verification — must be unique</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <input name="vehicleNumber" type="text" required={isRider}
                      value={form.vehicleNumber} onChange={set}
                      placeholder="e.g. ABC-123" className="input-field" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Vehicle Color
                    </label>
                    <input name="vehicleColor" type="text"
                      value={form.vehicleColor} onChange={set}
                      placeholder="e.g. Red, Black, Silver" className="input-field" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Vehicle Photo <span className="text-gray-400 font-normal">(optional)</span>
                    </label>

                    {vehicleImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200">
                        <img src={vehicleImage.preview} alt="Vehicle preview"
                          className="w-full h-36 object-cover" />
                        <button type="button" onClick={removeImage}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-full h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-brand-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium">Click to upload vehicle photo</span>
                        <span className="text-xs">JPEG, PNG or WebP · max 5 MB</span>
                      </button>
                    )}

                    <input ref={fileInputRef} type="file"
                      accept=".jpg,.jpeg,.png,.webp" className="hidden"
                      onChange={handleImageChange} />
                  </div>

                </div>
              </div>
            )}

            <button type="submit" disabled={loading || uploading} className="btn-primary w-full">
              {uploading ? 'Uploading photo…' : loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
