import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { toast }   from '../components/common/Toast'

// ── Step indicators ──────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Email', 'Verify OTP', 'New Password']
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const idx   = i + 1
        const done  = idx < current
        const active = idx === current
        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' :
                         'bg-gray-100 text-gray-400'
              }`}>
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : idx}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${active ? 'text-brand-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 sm:w-12 h-0.5 mb-5 mx-0.5 sm:mx-1 transition-all ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Countdown timer ───────────────────────────────────────────────────────────
function Countdown({ startAt, onExpire }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.ceil((startAt - Date.now()) / 1000)))

  useEffect(() => {
    if (secs <= 0) { onExpire(); return }
    const id = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1) { clearInterval(id); onExpire(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [startAt])

  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')

  return (
    <span className={`font-mono font-bold ${secs <= 30 ? 'text-red-500' : 'text-brand-600'}`}>
      {m}:{s}
    </span>
  )
}

// ── OTP Input (6 individual boxes) ───────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputs = useRef([])
  const digits  = value.split('').concat(Array(6).fill('')).slice(0, 6)

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0, -1)
      onChange(next)
      if (idx > 0) inputs.current[idx - 1]?.focus()
      return
    }
    if (!/^\d$/.test(e.key)) return
    const next = (value + e.key).slice(0, 6)
    onChange(next)
    if (idx < 5) inputs.current[idx + 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 5)
    inputs.current[focusIdx]?.focus()
  }

  return (
    <div className="flex gap-1.5 sm:gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          readOnly
          onKeyDown={e => handleKey(e, i)}
          onPaste={handlePaste}
          onFocus={() => inputs.current[i]?.select()}
          className={`w-10 sm:w-11 text-center text-lg sm:text-xl font-bold border-2 rounded-xl focus:outline-none transition-all
            ${d ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 bg-gray-50 text-gray-900'}
            focus:border-brand-500 focus:bg-white`}
          style={{ height: '48px' }}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  // Step 1
  const [email, setEmail]           = useState('')

  // Step 2
  const [otp, setOtp]               = useState('')
  const [expireAt, setExpireAt]     = useState(null)
  const [otpExpired, setOtpExpired] = useState(false)
  const [resetToken, setResetToken] = useState('')

  // Step 3
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [success, setSuccess]       = useState(false)

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setExpireAt(Date.now() + 2 * 60 * 1000)
      setOtpExpired(false)
      setOtp('')
      setStep(2)
      toast('OTP sent! Check your email.', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('Please enter the full 6-digit OTP.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.verifyOtp(email, otp)
      setResetToken(res.resetToken)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setExpireAt(Date.now() + 2 * 60 * 1000)
      setOtpExpired(false)
      setOtp('')
      toast('New OTP sent!', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Reset password ──────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword(resetToken, password, confirm)
      setSuccess(true)
      toast('Password reset successfully!', 'success')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Layout wrapper ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Food<span className="text-brand-500">Rush</span>
            </span>
          </Link>
          <p className="mt-2 text-gray-500 text-sm">Reset your password</p>
        </div>

        <div className="card p-8 animate-slide-up">
          <Steps current={step} />

          {/* Error banner */}
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP 1: Email ─────────────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Forgot Password?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your registered email and we'll send you a 6-digit OTP.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending OTP…
                  </span>
                ) : 'Send OTP'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Remembered your password?{' '}
                <Link to="/login" className="text-brand-500 font-semibold hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {/* ── STEP 2: Verify OTP ────────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Enter OTP</h2>
                <p className="text-sm text-gray-500 mt-1">
                  We sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span>
                </p>
              </div>

              {/* Timer */}
              {!otpExpired ? (
                <div className="flex items-center justify-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2.5 text-sm">
                  <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-600">OTP expires in </span>
                  <Countdown startAt={expireAt} onExpire={() => setOtpExpired(true)} />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">
                  ⏰ OTP has expired
                </div>
              )}

              {/* OTP boxes */}
              <div>
                <OtpInput value={otp} onChange={setOtp} />
              </div>

              {otpExpired ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : '🔄 Resend OTP'}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn-primary w-full disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : 'Verify OTP'}
                </button>
              )}

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep(1); setError('') }}
                  className="text-gray-400 hover:text-gray-600">
                  ← Change email
                </button>
                {!otpExpired && (
                  <button type="button" onClick={handleResend} disabled={loading}
                    className="text-brand-500 font-medium hover:underline disabled:opacity-60">
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ── STEP 3: New password ──────────────────────────────────────── */}
          {step === 3 && !success && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Set New Password</h2>
                <p className="text-sm text-gray-500 mt-1">Choose a strong password for your account.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="input-field pr-11"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd
                      ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>

                {/* Password strength bar */}
                {password && (
                  <PasswordStrength password={password} />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  className={`input-field ${confirm && confirm !== password ? 'border-red-300 focus:ring-red-400' : ''}`}
                />
                {confirm && confirm !== password && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || password !== confirm}
                className="btn-primary w-full disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting…
                  </span>
                ) : 'Reset Password'}
              </button>
            </form>
          )}

          {/* ── Success state ─────────────────────────────────────────────── */}
          {success && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-gray-500 text-sm mb-4">
                Your password has been updated successfully. Redirecting to login…
              </p>
              <Link to="/login" className="btn-primary inline-block px-8 py-2.5 text-sm">
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Password strength indicator ───────────────────────────────────────────────
function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-500']

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs font-medium ${score < 2 ? 'text-red-500' : score < 3 ? 'text-amber-500' : score < 4 ? 'text-blue-500' : 'text-green-600'}`}>
          {labels[score - 1]}
        </p>
      )}
    </div>
  )
}
