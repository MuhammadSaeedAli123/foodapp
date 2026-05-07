import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/common/Toast'

export default function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phoneNumber: '', address: '', role: 'User' })
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(form)
      toast('Account created!', 'success')
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Food<span className="text-brand-500">Rush</span></span>
          </Link>
          <p className="mt-2 text-gray-500 text-sm">Create your account</p>
        </div>

        <div className="card p-8 animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Get started</h2>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input name="fullName" type="text" required value={form.fullName} onChange={handleChange}
                placeholder="John Doe" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange}
                placeholder="you@example.com" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input name="password" type="password" required minLength={6} value={form.password} onChange={handleChange}
                placeholder="Min. 6 characters" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input name="phoneNumber" type="tel" value={form.phoneNumber} onChange={handleChange}
                placeholder="+1 234 567 8900" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Address</label>
              <input name="address" type="text" value={form.address} onChange={handleChange}
                placeholder="123 Main St, City" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">I want to join as</label>
              <div className="grid grid-cols-2 gap-3">
                {['User', 'Rider'].map((role) => (
                  <button key={role} type="button" onClick={() => setForm({ ...form, role })}
                    className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.role === role
                        ? 'border-brand-500 bg-brand-50 text-brand-600'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {role === 'User' ? '🛍 Customer' : '🛵 Rider'}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account…' : 'Create Account'}
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
