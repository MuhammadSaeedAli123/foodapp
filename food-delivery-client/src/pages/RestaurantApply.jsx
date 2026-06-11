import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { restaurantApplicationApi } from '../api/users'
import { toast } from '../components/common/Toast'

const EMPTY = {
  restaurantName: '', ownerName: '', email: '', password: '',
  phoneNumber: '', cnic: '', location: '', description: '',
}

export default function RestaurantApply() {
  const navigate = useNavigate()
  const [form, setForm]       = useState(EMPTY)
  const [show, setShow]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]     = useState('')

  const [imgMode, setImgMode]             = useState('upload') // 'upload' | 'url'
  const [restaurantImage, setRestaurantImage] = useState(null)   // { file, preview }
  const [imageUrl, setImageUrl]           = useState('')
  const [businessLicense, setBusinessLicense] = useState(null)   // { file, name }
  const imgRef     = useRef(null)
  const licenseRef = useRef(null)

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRestaurantImage({ file, preview: URL.createObjectURL(file) })
  }

  const removeImage = () => {
    if (restaurantImage?.preview) URL.revokeObjectURL(restaurantImage.preview)
    setRestaurantImage(null)
    if (imgRef.current) imgRef.current.value = ''
  }

  const switchImgMode = (mode) => {
    setImgMode(mode)
    if (mode === 'url') removeImage()
    else setImageUrl('')
  }

  const handleLicenseChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusinessLicense({ file, name: file.name })
  }

  const removeLicense = () => {
    setBusinessLicense(null)
    if (licenseRef.current) licenseRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (imgMode === 'upload' && !restaurantImage) {
      setError('Restaurant image is required.')
      return
    }
    if (imgMode === 'url' && !imageUrl.trim()) {
      setError('Please enter a restaurant image URL.')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (imgMode === 'upload') {
        fd.append('restaurantImage', restaurantImage.file)
      } else {
        fd.append('restaurantImageUrl', imageUrl.trim())
      }
      if (businessLicense) fd.append('businessLicense', businessLicense.file)

      await restaurantApplicationApi.submit(fd)
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-100 flex items-center justify-center p-4">
        <div className="card p-10 text-center max-w-sm w-full animate-slide-up">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Your restaurant partnership application has been received. Our team will review your details and send you an email once a decision is made.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary w-full">
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-100 py-10 px-4">
      <div className="w-full max-w-lg mx-auto">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Food<span className="text-brand-500">Rush</span></span>
          </Link>
          <p className="mt-2 text-gray-500 text-sm">Restaurant Partnership Application</p>
        </div>

        <div className="card p-8 animate-slide-up">

          <Link to="/register" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-500 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Register
          </Link>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Apply for Partnership</h2>
          <p className="text-sm text-gray-500 mb-6">Fill in your details below. Our team will review and get back to you.</p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Restaurant Information ───────────────── */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Restaurant Information</p>
              <div className="space-y-3">

                {/* Restaurant Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Restaurant Image <span className="text-red-500">*</span>
                  </label>

                  {/* Mode toggle */}
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-3">
                    <button type="button" onClick={() => switchImgMode('upload')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        imgMode === 'upload' ? 'bg-brand-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}>
                      Upload File
                    </button>
                    <button type="button" onClick={() => switchImgMode('url')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        imgMode === 'url' ? 'bg-brand-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}>
                      Paste URL
                    </button>
                  </div>

                  {imgMode === 'upload' ? (
                    restaurantImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200">
                        <img src={restaurantImage.preview} alt="Restaurant preview"
                          className="w-full h-40 object-cover" />
                        <button type="button" onClick={removeImage}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => imgRef.current?.click()}
                        className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-brand-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium">Click to upload restaurant photo</span>
                        <span className="text-xs">JPEG, PNG or WebP · max 5 MB</span>
                      </button>
                    )
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        onCopy={e => e.preventDefault()}
                        placeholder="https://example.com/restaurant.jpg"
                        className="input-field"
                      />
                      {imageUrl.trim() && (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                          <img
                            src={imageUrl.trim()}
                            alt="Preview"
                            className="w-full h-40 object-cover"
                            onError={e => { e.target.style.display = 'none' }}
                            onLoad={e  => { e.target.style.display = 'block' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <input ref={imgRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleImageChange} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Restaurant Name <span className="text-red-500">*</span>
                  </label>
                  <input name="restaurantName" type="text" required value={form.restaurantName} onChange={set}
                    onCopy={e => e.preventDefault()} placeholder="e.g. The Golden Fork" className="input-field" />
                </div>

              </div>
            </div>

            {/* ── Owner Information ────────────────────── */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Owner Information</p>
              <div className="space-y-3">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Owner Name <span className="text-red-500">*</span>
                  </label>
                  <input name="ownerName" type="text" required value={form.ownerName} onChange={set}
                    onCopy={e => e.preventDefault()} placeholder="John Doe" className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input name="email" type="email" required value={form.email} onChange={set}
                    onCopy={e => e.preventDefault()} placeholder="you@example.com" className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input name="password" type={show ? 'text' : 'password'} required minLength={6}
                      value={form.password} onChange={set}
                      onCopy={e => e.preventDefault()}
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
                  <input name="phoneNumber" type="tel" required value={form.phoneNumber} onChange={set}
                    onCopy={e => e.preventDefault()} placeholder="+92 300 1234567" className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    CNIC <span className="text-red-500">*</span>
                  </label>
                  <input name="cnic" type="text" required value={form.cnic} onChange={set}
                    onCopy={e => e.preventDefault()} placeholder="e.g. 42101-1234567-1" className="input-field" />
                </div>

              </div>
            </div>

            {/* ── Business Details ─────────────────────── */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Business Details</p>
              <div className="space-y-3">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location / Address <span className="text-red-500">*</span>
                  </label>
                  <textarea name="location" rows={2} required value={form.location} onChange={set}
                    onCopy={e => e.preventDefault()}
                    placeholder="e.g. 123 Main St, Karachi" className="input-field resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-gray-400 font-normal">(optional but recommended)</span>
                  </label>
                  <textarea name="description" rows={3} value={form.description} onChange={set}
                    onCopy={e => e.preventDefault()}
                    placeholder="Tell us about your restaurant — cuisine type, specialty, etc."
                    className="input-field resize-none" />
                </div>

              </div>
            </div>

            {/* ── Verification ─────────────────────────── */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Verification</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business License <span className="text-gray-400 font-normal">(optional but recommended)</span>
                </label>
                {businessLicense ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <svg className="w-8 h-8 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 truncate flex-1">{businessLicense.name}</span>
                    <button type="button" onClick={removeLicense}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => licenseRef.current?.click()}
                    className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-brand-500">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-sm font-medium">Click to upload business license</span>
                    <span className="text-xs">JPEG, PNG, WebP or PDF · max 5 MB</span>
                  </button>
                )}
                <input ref={licenseRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleLicenseChange} />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>

            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center leading-relaxed">
              Applications are reviewed within 1–3 business days. You'll receive an email with the decision.
            </p>

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
