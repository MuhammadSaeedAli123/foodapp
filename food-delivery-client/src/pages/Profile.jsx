import { useState, useEffect } from 'react'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/auth'
import { saveAuth, getToken } from '../utils/token'
import { formatDate } from '../utils/formatters'
import { toast } from '../components/common/Toast'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm]     = useState({ fullName: '', phoneNumber: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  // Load real profile data from API on mount
  useEffect(() => {
    authApi.getMe()
      .then(me => {
        setForm({
          fullName:    me.fullName    || '',
          phoneNumber: me.phoneNumber || '',
          address:     me.address     || '',
        })
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
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-brand-500">{user?.fullName?.[0]?.toUpperCase()}</span>
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
      </main>
      <Footer />
    </div>
  )
}
