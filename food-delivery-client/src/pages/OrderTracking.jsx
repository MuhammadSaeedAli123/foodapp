import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import Navbar from '../components/common/Navbar'
import Loader from '../components/common/Loader'
import { ordersApi } from '../api/orders'
import { reviewsApi } from '../api/reviews'
import { getToken } from '../utils/token'
import { formatCurrency, formatDate, statusColor, statusLabel } from '../utils/formatters'
import { toast } from '../components/common/Toast'

const STEPS = [
  { key: 'Pending',        icon: '🕐', label: 'Placed'     },
  { key: 'Confirmed',      icon: '✅', label: 'Accepted'   },
  { key: 'Preparing',      icon: '👨‍🍳', label: 'Preparing'  },
  { key: 'Ready',          icon: '📦', label: 'Ready'      },
  { key: 'OutForDelivery', icon: '🛵', label: 'On the Way' },
  { key: 'Delivered',      icon: '🎉', label: 'Delivered'  },
]

const STARS = [1, 2, 3, 4, 5]

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {STARS.map(s => (
        <button key={s} type="button"
          className="text-3xl transition-transform hover:scale-110 cursor-pointer"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}>
          <span className={(hovered || value) >= s ? 'text-yellow-400' : 'text-gray-200'}>★</span>
        </button>
      ))}
    </div>
  )
}

export default function OrderTracking() {
  const { id } = useParams()
  const [order, setOrder]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [existingReview, setExistingReview] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const connectionRef               = useRef(null)

  useEffect(() => {
    ordersApi.getById(id)
      .then(o => {
        setOrder(o)
        // Check for an existing review if already delivered
        if (o?.status === 'Delivered') {
          reviewsApi.getMyReview(id)
            .then(r => { if (r) setExistingReview(r) })
            .catch(() => {})
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.on('OrderStatusUpdated', ({ order: updated }) => {
      setOrder(updated)
      // Auto-load review state when it reaches Delivered
      if (updated?.status === 'Delivered') {
        reviewsApi.getMyReview(id)
          .then(r => { if (r) setExistingReview(r) })
          .catch(() => {})
      }
    })

    connection.start()
      .then(() => connection.invoke('TrackOrder', id))
      .catch(console.error)

    connectionRef.current = connection
    return () => {
      connection.invoke('StopTracking', id).catch(() => {})
      connection.stop()
    }
  }, [id])

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (reviewForm.rating === 0) { toast('Please select a star rating', 'warning'); return }
    setSubmitting(true)
    try {
      const created = await reviewsApi.create({ orderId: id, ...reviewForm })
      setExistingReview(created)
      setReviewDone(true)
      toast('Thank you for your review!', 'success')
    } catch (err) {
      toast(err.message || 'Failed to submit review', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <><Navbar /><Loader /></>
  if (!order)  return <><Navbar /><div className="p-8 text-center text-gray-400">Order not found</div></>

  const isCancelled = order.status === 'Cancelled'
  const isDelivered = order.status === 'Delivered'
  const currentStep = isCancelled ? -1 : STEPS.findIndex(s => s.key === order.status)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
            <p className="text-gray-400 text-sm mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <span className={`badge text-sm px-3 py-1.5 ${statusColor(order.status)}`}>
            {statusLabel(order.status) || order.status}
          </span>
        </div>

        {/* Live indicator */}
        {!isCancelled && !isDelivered && (
          <div className="flex items-center gap-2 mb-6 text-sm text-green-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live tracking active
          </div>
        )}

        {/* ── Progress stepper ────────────────────────────────────────────── */}
        {!isCancelled ? (
          <div className="card p-6 mb-6">
            <div className="relative">
              {/* Progress line */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200">
                <div
                  className="h-full bg-brand-500 transition-all duration-700"
                  style={{ width: currentStep <= 0 ? '0%' : `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                />
              </div>
              <div className="relative flex justify-between">
                {STEPS.map((step, idx) => {
                  const done   = idx < currentStep
                  const active = idx === currentStep
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-300 ${
                        done   ? 'bg-brand-500 border-brand-500 text-white' :
                        active ? 'bg-white border-brand-500 text-brand-500 shadow-md ring-4 ring-brand-100' :
                                 'bg-white border-gray-200 text-gray-300'
                      }`}>
                        {done
                          ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                            </svg>
                          : <span className="text-base">{step.icon}</span>
                        }
                      </div>
                      <span className={`text-xs font-medium text-center leading-tight ${
                        active ? 'text-brand-600' : done ? 'text-gray-600' : 'text-gray-300'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Active step message */}
            {currentStep >= 0 && (
              <div className="mt-6 text-center">
                <p className="text-brand-600 font-semibold text-sm">
                  {[
                    'Your order has been placed and is waiting for the restaurant.',
                    'Great news! The restaurant has accepted your order.',
                    'The kitchen is busy preparing your delicious food!',
                    'Your order is packed and ready — a rider is being assigned.',
                    'Your order is out for delivery — almost there!',
                    'Your order has been delivered. Enjoy your meal! 🎉',
                  ][currentStep]}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-6 mb-6 bg-red-50 border border-red-100 text-center">
            <p className="text-4xl mb-2">❌</p>
            <p className="font-semibold text-red-600">This order was cancelled</p>
          </div>
        )}

        {/* ── Order details ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Delivery Info</p>
            <p className="text-gray-800 font-medium">{order.deliveryAddress}</p>
            {order.notes && <p className="text-gray-500 text-sm mt-1">📝 {order.notes}</p>}
            {order.riderName && (
              <p className="text-sm text-gray-600 mt-3">🛵 Rider: <span className="font-medium">{order.riderName}</span></p>
            )}
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Restaurant</p>
            <p className="text-gray-800 font-medium">{order.restaurantName}</p>
            <p className="text-gray-400 text-xs mt-1">{formatDate(order.createdAt)}</p>
          </div>
        </div>

        <div className="card p-5 mt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Items</p>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-700">
                <span>{item.foodItemName} × {item.quantity}</span>
                <span className="font-medium">{formatCurrency(item.subTotal)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span className="text-brand-500">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* ── Review section (only after delivery) ─────────────────────────── */}
        {isDelivered && (
          <div className="card p-6 mt-4">
            {existingReview || reviewDone ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">⭐</p>
                <p className="font-semibold text-gray-800">Review submitted — thank you!</p>
                <div className="flex justify-center gap-1 mt-2">
                  {STARS.map(s => (
                    <span key={s} className={`text-xl ${s <= (existingReview?.rating ?? reviewForm.rating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                {(existingReview?.comment || reviewForm.comment) && (
                  <p className="text-sm text-gray-500 mt-2 italic">"{existingReview?.comment || reviewForm.comment}"</p>
                )}
              </div>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 mb-1">Rate your experience</h3>
                <p className="text-sm text-gray-400 mb-4">How was {order.restaurantName}?</p>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="flex flex-col items-start gap-2">
                    <StarPicker value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} />
                    {reviewForm.rating > 0 && (
                      <p className="text-sm text-gray-500">
                        {['', 'Terrible 😞', 'Bad 😕', 'OK 😐', 'Good 😊', 'Excellent! 🤩'][reviewForm.rating]}
                      </p>
                    )}
                  </div>
                  <textarea
                    className="input resize-none w-full" rows={3}
                    placeholder="Leave a comment (optional)…"
                    value={reviewForm.comment}
                    maxLength={1000}
                    onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                  />
                  <button type="submit" disabled={submitting || reviewForm.rating === 0}
                    className="btn-primary w-full disabled:opacity-50">
                    {submitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link to="/my-orders" className="btn-secondary flex-1 text-center">My Orders</Link>
          <Link to="/"          className="btn-primary  flex-1 text-center">Order Again</Link>
        </div>
      </main>
    </div>
  )
}
