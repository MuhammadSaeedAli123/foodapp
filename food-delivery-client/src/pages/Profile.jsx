import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/auth'
import { saveAuth, getToken } from '../utils/token'
import { formatDate } from '../utils/formatters'
import { toast } from '../components/common/Toast'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm]       = useState({ fullName: '', phoneNumber: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const [pwForm, setPwForm]       = useState({ newPassword: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  const [photoUrl, setPhotoUrl]       = useState(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Load real profile data from API on mount
  useEffect(() => {
    authApi.getMe()
      .then(me => {
        setForm({
          fullName:    me.fullName    || '',
          phoneNumber: me.phoneNumber || '',
          address:     me.address     || '',
        })
        setPhotoUrl(me.profilePhotoUrl || null)
      })
      .catch(() => {
        // Fall back to cached user in context
        setForm({
          fullName:    user?.fullName    || '',
          phoneNumber: user?.phoneNumber || '',
          address:     user?.address     || '',
        })
      })
      .finally(() => setFetching(false))
  }, [])  // eslint-disable-line

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const updated = await authApi.updateMe(form)
      // Sync user object in context + localStorage so Checkout pre-fills correctly
      const enriched = { ...user, ...updated }
      const token = getToken()
      if (token) saveAuth(token, enriched)
      setUser(enriched)
      toast('Profile updated!', 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        {/* Avatar card */}
        <div className="card p-6 mb-6 flex items-center gap-5">
          {/* Avatar with upload overlay */}
          <div
            className="relative shrink-0 cursor-pointer"
            onClick={() => !photoLoading && fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-100 flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-brand-500">{user?.fullName?.[0]?.toUpperCase()}</span>
              )}
            </div>
            {/* Camera badge */}
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
              {photoLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setPhotoLoading(true)
                try {
                  const res = await authApi.uploadMyPhoto(file)
                  setPhotoUrl(res.profilePhotoUrl)
                  toast('Photo updated!', 'success')
                } catch (err) {
                  toast(err.message || 'Failed to upload photo', 'error')
                } finally {
                  setPhotoLoading(false)
                  e.target.value = ''
                }
              }}
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.fullName}</h2>
            <p className="text-gray-400 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge bg-brand-100 text-brand-600 text-xs">{user?.role}</span>
              {user?.createdAt && (
                <span className="text-xs text-gray-400">Member since {formatDate(user.createdAt).split(',')[0]}</span>
              )}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-5">Edit Information</h3>
          {fetching ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input name="fullName" type="text" value={form.fullName} onChange={handleChange}
                  className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input value={user?.email} disabled
                  className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input name="phoneNumber" type="tel" value={form.phoneNumber} onChange={handleChange}
                  placeholder="+92 300 1234567" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Delivery Address</label>
                <textarea name="address" rows={2} value={form.address} onChange={handleChange}
                  placeholder="Your default delivery address" className="input-field resize-none" />
                <p className="text-xs text-gray-400 mt-1">This will pre-fill the delivery address at checkout.</p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>
        {/* Change Password */}
        <div className="card p-6 mt-6">
          <h3 className="font-bold text-gray-900 mb-1">Change Password</h3>
          <p className="text-xs text-gray-400 mb-5">Set a new password for your account.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (pwForm.newPassword !== pwForm.confirm) {
                toast('Passwords do not match', 'error'); return
              }
              if (pwForm.newPassword.length < 6) {
                toast('Password must be at least 6 characters', 'error'); return
              }
              setPwLoading(true)
              try {
                await authApi.changePassword(pwForm.newPassword)
                toast('Password updated!', 'success')
                setPwForm({ newPassword: '', confirm: '' })
              } catch (err) {
                toast(err.message || 'Failed to update password', 'error')
              } finally {
                setPwLoading(false)
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input
                type="password"
                value={pwForm.newPassword}
                onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min. 6 characters"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Re-enter new password"
                className="input-field"
                required
              />
            </div>
            <button type="submit" disabled={pwLoading} className="btn-primary w-full">
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
