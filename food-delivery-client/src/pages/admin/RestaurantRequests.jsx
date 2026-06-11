import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/common/AdminLayout'
import { adminApi } from '../../api/users'
import { toast } from '../../components/common/Toast'

function RejectModal({ app, onConfirm, onClose }) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try { await onConfirm(reason.trim() || null) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-red-50 rounded-t-2xl px-6 pt-6 pb-4 border-b border-red-100">
          <h3 className="font-bold text-red-800 text-lg">Reject Application</h3>
          <p className="text-sm text-red-600 mt-1">
            Reject <strong>{app.restaurantName}</strong> by {app.ownerName}?
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Incomplete documentation, location not covered…"
              className="input-field resize-none"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-60">
              {loading ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

function imgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}

export default function RestaurantRequests() {
  const [apps,    setApps]    = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.getRestaurantApplications('Pending')
      setApps(Array.isArray(data) ? data : [])
    } catch {
      toast('Failed to load applications', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (app) => {
    try {
      await adminApi.approveRestaurantApplication(app.id)
      toast(`${app.restaurantName} approved!`, 'success')
      setApps(prev => prev.filter(a => a.id !== app.id))
    } catch (err) {
      toast(err.message || 'Approval failed', 'error')
    }
  }

  const handleReject = async (reason) => {
    try {
      await adminApi.rejectRestaurantApplication(rejectTarget.id, reason)
      toast(`${rejectTarget.restaurantName} rejected.`, 'success')
      setApps(prev => prev.filter(a => a.id !== rejectTarget.id))
      setRejectTarget(null)
    } catch (err) {
      toast(err.message || 'Rejection failed', 'error')
    }
  }

  return (
    <AdminLayout title="Restaurant Requests">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pending Applications</h2>
            <p className="text-sm text-gray-500 mt-0.5">Review and approve or reject restaurant partnership requests.</p>
          </div>
          {apps.length > 0 && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
              {apps.length} pending
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="card p-5 space-y-3">
                <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No pending applications</p>
            <p className="text-sm text-gray-400 mt-1">New restaurant applications will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {apps.map(app => (
              <div key={app.id} className="card overflow-hidden">

                {/* Restaurant Image */}
                {imgUrl(app.restaurantImageUrl) ? (
                  <img src={imgUrl(app.restaurantImageUrl)} alt={app.restaurantName}
                    className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-brand-50 to-orange-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}

                <div className="p-5 space-y-3">
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{app.restaurantName}</h3>
                      <p className="text-sm text-gray-500">{app.location}</p>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                      Pending
                    </span>
                  </div>

                  {/* Owner details */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                    <Row label="Owner"  value={app.ownerName} />
                    <Row label="Email"  value={app.email} />
                    <Row label="Phone"  value={app.phoneNumber} />
                    <Row label="CNIC"   value={app.cnic} />
                    {app.description && <Row label="About" value={app.description} />}
                  </div>

                  {/* Business license link */}
                  {app.businessLicenseUrl && (
                    <a href={imgUrl(app.businessLicenseUrl)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      View Business License
                    </a>
                  )}

                  {/* Applied date */}
                  <p className="text-xs text-gray-400">
                    Applied {new Date(app.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(app)}
                      className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectTarget(app)}
                      className="flex-1 py-2 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectTarget && (
        <RejectModal
          app={rejectTarget}
          onConfirm={handleReject}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </AdminLayout>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 shrink-0 w-14">{label}</span>
      <span className="text-gray-700 font-medium break-all">{value}</span>
    </div>
  )
}
