import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/auth'
import { saveAuth, getToken } from '../utils/token'

export default function PendingApproval() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const me = await authApi.getMe()
        if (me?.approvalStatus === 'Approved') {
          // Persist the updated status so ProtectedRoute passes
          const updated = { ...user, approvalStatus: 'Approved' }
          saveAuth(getToken(), updated)
          setUser(updated)
          setApproved(true)
          // Brief moment to show success state before navigating
          setTimeout(() => navigate('/rider', { replace: true }), 1800)
        }
      } catch { /* token still valid, just keep polling */ }
    }

    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (approved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-100 flex items-center justify-center p-4">
        <div className="card p-10 text-center max-w-sm w-full animate-slide-up">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Approved!</h2>
          <p className="text-gray-500 text-sm">Taking you to your dashboard…</p>
          <div className="mt-5 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Food<span className="text-brand-500">Rush</span></span>
          </div>
        </div>

        <div className="card p-8 text-center animate-slide-up">

          {/* Pulsing clock icon */}
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5 relative">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {/* Live pulse ring */}
            <span className="absolute inset-0 rounded-full border-2 border-amber-300 animate-ping opacity-50" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Hi <span className="font-semibold text-gray-700">{user?.fullName}</span>, your rider
            application is under review. This page will update automatically once approved.
          </p>

          {/* Status card */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0 text-base">📋</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Status: Pending Approval</p>
                <p className="text-xs text-amber-600">Your details are being reviewed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0 text-base">📧</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Check your email</p>
                <p className="text-xs text-amber-600 break-all">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0 text-base">✅</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Once approved</p>
                <p className="text-xs text-amber-600">You'll be taken to your dashboard automatically</p>
              </div>
            </div>
          </div>

          {/* Progress timeline */}
          <div className="flex items-center justify-between gap-2 mb-6 px-2">
            {[
              { label: 'Applied',  done: true,  icon: '✓' },
              { label: 'Review',   done: false, icon: '…' },
              { label: 'Approved', done: false, icon: '🛵' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step.done ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-[10px] font-semibold ${step.done ? 'text-brand-600' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-200 mb-4" />
                )}
              </div>
            ))}
          </div>

          {/* Live polling indicator */}
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5 mb-5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
            Checking for updates automatically
          </p>

          <button onClick={handleLogout}
            className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
