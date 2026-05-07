import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import Loader from '../components/common/Loader'
import { ordersApi } from '../api/orders'
import { reviewsApi } from '../api/reviews'
import { getToken } from '../utils/token'
import { formatCurrency, formatDate, statusColor, statusLabel } from '../utils/formatters'
import { toast } from '../components/common/Toast'

const STARS = [1, 2, 3, 4, 5]

const TABS = [
  { key: 'All',       label: 'All' },
  { key: 'Active',    label: 'Active' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Cancelled', label: 'Cancelled' },
]

const ACTIVE_STATUSES = new Set(['Pending', 'Confirmed', 'Preparing', 'Ready', 'OutForDelivery'])

function matchesTab(order, tab) {
  if (tab === 'All')       return true
  if (tab === 'Active')    return ACTIVE_STATUSES.has(order.status)
  if (tab === 'Delivered') return order.status === 'Delivered'
  if (tab === 'Cancelled') return order.status === 'Cancelled'
  return true
}

// ── Inline quick-review modal ─────────────────────────────────────────────────
function ReviewModal({ order, onClose, onDone }) {
  const [rating, setRating]   = useState(0)
  const [comment, setComment] = useState('')
  const [hovered, setHovered] = useState(0)
  const [saving, setSaving]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) { toast('Please select a star rating', 'warning'); return }
    setSaving(true)
    try {
      await reviewsApi.create({ orderId: order.id, rating, comment })
      toast('Review submitted — thank you!', 'success')
      onDone(order.id)
    } catch (err) {
      toast(err.message || 'Failed to submit review', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Rate your experience</h2>
            <p className="text-xs text-gray-400 mt-0.5">{order.restaurantName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="flex flex-col items-start gap-1">
            <div className="flex gap-1">
              {STARS.map(s => (
                <button key={s} type="button"
                  className="text-3xl transition-transform hover:scale-110"
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}>
                  <span className={(hovered || rating) >= s ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-500">
                {['', 'Terrible 😞', 'Bad 😕', 'OK 😐', 'Good 😊', 'Excellent! 🤩'][rating]}
              </p>
            )}
          </div>
          <textarea className="input resize-none w-full" rows={3}
            placeholder="Leave a comment (optional)…"
            value={comment} maxLength={1000}
            onChange={e => setComment(e.target.value)} />
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || rating === 0}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MyOrders() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [reviewed, setReviewed] = useState(new Set())
  const [modalOrder, setModal]  = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const connectionRef           = useRef(null)

  useEffect(() => {
    Promise.all([
      ordersApi.getMyOrders(),
      reviewsApi.getMyReviewedOrders().catch(() => []),
    ]).then(([orders, reviewedIds]) => {
      setOrders(orders)
      setReviewed(new Set(reviewedIds))
    }).finally(() => setLoading(false))
  }, [])

  // ── Real-time: live status updates + notifications ────────────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.on('OrderStatusUpdated', ({ order }) => {
      setOrders(prev =>
        prev.map(o => o.id === order.id ? { ...o, status: order.status } : o)
      )
    })

    connection.on('OrderNotification', ({ message, type }) => {
      toast(message, type)
    })

    connection.start().catch(console.error)
    connectionRef.current = connection
    return () => connection.stop()
  }, [])

  const handleReviewDone = (orderId) => {
    setReviewed(prev => new Set([...prev, orderId]))
    setModal(null)
  }

  const canReview = (order) => order.status === 'Delivered' && !reviewed.has(order.id)

  const filtered = orders.filter(o => matchesTab(o, activeTab))

  // Tab counts
  const counts = {
    All:       orders.length,
    Active:    orders.filter(o => ACTIVE_STATUSES.has(o.status)).length,
    Delivered: orders.filter(o => o.status === 'Delivered').length,
    Cancelled: orders.filter(o => o.status === 'Cancelled').length,
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        </div>

        {/* ── Status filter tabs ──────────────────────────────────────────── */}
        {!loading && orders.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-thin">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                }`}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                    activeTab === tab.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading ? <Loader /> : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700">No orders yet</h3>
            <p className="text-gray-400 mt-2 mb-6">Your order history will appear here</p>
            <Link to="/" className="btn-primary">Browse Restaurants</Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 font-medium">No {activeTab.toLowerCase()} orders</p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {filtered.map((order) => (
              <div key={order.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900">{order.restaurantName}</h3>
                      <span className={`badge text-xs px-2.5 py-0.5 ${statusColor(order.status)}`}>
                        {statusLabel(order.status) || order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{formatDate(order.createdAt)}</p>
                    <p className="text-sm text-gray-500 mt-2 truncate">
                      {order.items.map(i => `${i.foodItemName} ×${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-2">
                    <p className="text-xl font-bold text-brand-500">{formatCurrency(order.totalAmount)}</p>
                    <div className="flex flex-col items-end gap-1.5">
                      {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                        <Link to={`/orders/${order.id}/track`}
                          className="text-sm text-brand-500 font-semibold hover:underline">
                          Track Order →
                        </Link>
                      )}
                      {order.status === 'Delivered' && (
                        <Link to={`/orders/${order.id}/track`}
                          className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
                          View Details
                        </Link>
                      )}
                      {canReview(order) && (
                        <button
                          onClick={() => setModal(order)}
                          className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors">
                          ⭐ Leave Review
                        </button>
                      )}
                      {reviewed.has(order.id) && (
                        <span className="text-xs text-green-600 font-medium">✓ Reviewed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {modalOrder && (
        <ReviewModal
          order={modalOrder}
          onClose={() => setModal(null)}
          onDone={handleReviewDone}
        />
      )}
    </div>
  )
}
