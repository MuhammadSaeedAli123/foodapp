import { useState, useEffect, useCallback, useMemo } from 'react'
import OwnerLayout from '../../components/common/OwnerLayout'
import { restaurantsApi } from '../../api/restaurants'
import { reviewsApi } from '../../api/reviews'
import { toast } from '../../components/common/Toast'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Stars({ rating, size = 'sm' }) {
  const sz = size === 'lg' ? 'text-lg' : size === 'md' ? 'text-sm' : 'text-xs'
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <span key={s} className={`${sz} ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
      ))}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OwnerReviews() {
  const [restaurantId, setRestaurantId] = useState(null)
  const [reviews, setReviews]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [filterRating, setFilterRating] = useState(0)
  const [sortOrder, setSortOrder]       = useState('latest')
  const [replyState, setReplyState]     = useState({})

  useEffect(() => {
    restaurantsApi.getOwnerDashboard()
      .then(dash => {
        const rid = dash?.restaurant?.id
        if (!rid) { setLoading(false); return }
        setRestaurantId(rid)
        return reviewsApi.getByRestaurant(rid)
      })
      .then(data => { if (data) setReviews(data) })
      .catch(err => setError(err.message || 'Failed to load reviews'))
      .finally(() => setLoading(false))
  }, [])

  // ── Insights ───────────────────────────────────────────────────────────────

  const ins = useMemo(() => {
    const total = reviews.length
    if (!total) return null

    const replied    = reviews.filter(r => r.ownerReply).length
    const avgRating  = reviews.reduce((a, r) => a + r.rating, 0) / total
    const positive   = reviews.filter(r => r.rating >= 4).length
    const neutral    = reviews.filter(r => r.rating === 3).length
    const negative   = reviews.filter(r => r.rating <= 2).length
    const unanswered = total - replied

    const starDist = [5,4,3,2,1].map(star => {
      const count = reviews.filter(r => r.rating === star).length
      return { star, count, pct: (count / total) * 100 }
    })

    const sorted    = [...reviews].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    const firstDate = sorted[0]?.createdAt

    return { total, replied, unanswered, avgRating, positive, neutral, negative, starDist, firstDate }
  }, [reviews])

  const filtered = useMemo(() =>
    reviews
      .filter(r => filterRating === 0 || r.rating === filterRating)
      .sort((a, b) => sortOrder === 'latest'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)),
    [reviews, filterRating, sortOrder]
  )

  // ── Reply helpers ──────────────────────────────────────────────────────────

  const openReply    = (id, existing) => setReplyState(p => ({ ...p, [id]: { open: true, text: existing ?? '', saving: false } }))
  const closeReply   = (id)           => setReplyState(p => ({ ...p, [id]: { ...p[id], open: false } }))
  const setReplyText = (id, text)     => setReplyState(p => ({ ...p, [id]: { ...p[id], text } }))

  const submitReply = useCallback(async (reviewId) => {
    const rs = replyState[reviewId]
    if (!rs?.text?.trim()) return
    setReplyState(p => ({ ...p, [reviewId]: { ...p[reviewId], saving: true } }))
    try {
      const result = await reviewsApi.reply(reviewId, rs.text.trim())
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, ownerReply: result.ownerReply, ownerReplyAt: result.ownerReplyAt } : r
      ))
      setReplyState(p => ({ ...p, [reviewId]: { open: false, text: '', saving: false } }))
      toast('Reply posted!', 'success')
    } catch (err) {
      toast(err.message || 'Failed to post reply', 'error')
      setReplyState(p => ({ ...p, [reviewId]: { ...p[reviewId], saving: false } }))
    }
  }, [replyState])

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <OwnerLayout title="Reviews & Ratings">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </OwnerLayout>
  )

  if (error) return (
    <OwnerLayout title="Reviews & Ratings">
      <div className="text-center py-24">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </OwnerLayout>
  )

  if (!restaurantId) return (
    <OwnerLayout title="Reviews & Ratings">
      <div className="text-center py-24">
        <p className="text-4xl mb-3">🏪</p>
        <h2 className="text-lg font-bold text-gray-800 mb-1">No Restaurant Linked</h2>
        <p className="text-gray-400 text-sm">Ask your admin to link a restaurant to your account.</p>
      </div>
    </OwnerLayout>
  )

  if (!reviews.length) return (
    <OwnerLayout title="Reviews & Ratings">
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">⭐</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">No reviews yet</h2>
        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
          Customer reviews will appear here once they start reviewing delivered orders.
        </p>
      </div>
    </OwnerLayout>
  )

  // ── Main layout ────────────────────────────────────────────────────────────

  return (
    <OwnerLayout title="Reviews & Ratings">
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 items-start">

        {/* ══════════════════════════════════════════════════════════════════
            LEFT — 70% : Rating header + filters + review list
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4 min-w-0">

          {/* Rating summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center shrink-0">
                <p className="text-6xl font-black text-gray-900 leading-none tracking-tight">
                  {ins.avgRating.toFixed(1)}
                </p>
                <Stars rating={Math.round(ins.avgRating)} size="lg" />
                <p className="text-xs text-gray-400 mt-2">
                  {ins.total} review{ins.total !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="hidden sm:block w-px self-stretch bg-gray-100 shrink-0" />

              <div className="flex-1 w-full space-y-2">
                {ins.starDist.map(({ star, count, pct }) => (
                  <button
                    key={star}
                    onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                    className={`w-full flex items-center gap-2.5 py-0.5 transition-opacity ${
                      filterRating !== 0 && filterRating !== star ? 'opacity-25' : 'hover:opacity-75'
                    }`}
                  >
                    <span className="text-xs text-gray-400 w-3 text-right shrink-0 font-medium">{star}</span>
                    <span className="text-amber-400 text-xs shrink-0">★</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          star >= 4 ? 'bg-green-400' : star === 3 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-6 text-right shrink-0">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {[0,5,4,3,2,1].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterRating(s === filterRating ? 0 : s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    filterRating === s
                      ? s === 0
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {s === 0 ? 'All' : `${s} ★`}
                  {s !== 0 && filterRating === 0 && (
                    <span className="ml-1 text-gray-300">
                      {ins.starDist.find(d => d.star === s)?.count ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-brand-300 shrink-0"
            >
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {filterRating !== 0 && (
            <p className="text-xs text-gray-400 -mt-1">
              {filtered.length} of {reviews.length} reviews
            </p>
          )}

          {/* Review cards */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm text-gray-400">No reviews match this filter.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {filtered.map(rv => (
                <ReviewCard
                  key={rv.id}
                  rv={rv}
                  replyState={replyState[rv.id]}
                  onOpenReply={() => openReply(rv.id, rv.ownerReply)}
                  onCloseReply={() => closeReply(rv.id)}
                  onChangeText={t => setReplyText(rv.id, t)}
                  onSubmit={() => submitReply(rv.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT — 30% : Insights sidebar
        ══════════════════════════════════════════════════════════════════ */}
        <aside className="space-y-4 self-start">

          {/* Reply Rate */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Reply Rate</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-extrabold text-gray-900">
                {ins.total ? Math.round((ins.replied / ins.total) * 100) : 0}%
              </span>
              <span className="text-xs text-gray-400 mb-1">
                {ins.replied}/{ins.total} replied
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${ins.total ? (ins.replied / ins.total) * 100 : 0}%` }}
              />
            </div>
            {ins.unanswered > 0 ? (
              <button
                onClick={() => { setFilterRating(0); setSortOrder('oldest') }}
                className="w-full text-xs text-center py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-medium hover:bg-amber-100 transition-colors"
              >
                {ins.unanswered} unanswered · view oldest first
              </button>
            ) : (
              <p className="text-xs text-center text-green-600 font-medium py-1">
                All reviews replied ✓
              </p>
            )}
          </div>

          {/* Sentiment */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sentiment</p>
            <div className="space-y-2">
              <SentimentRow
                label="Positive" sublabel="4–5 stars"
                count={ins.positive} total={ins.total}
                color="bg-green-500" textColor="text-green-700" bgColor="bg-green-50"
                onClick={() => setFilterRating(filterRating === 5 ? 0 : 5)}
              />
              <SentimentRow
                label="Neutral" sublabel="3 stars"
                count={ins.neutral} total={ins.total}
                color="bg-amber-400" textColor="text-amber-700" bgColor="bg-amber-50"
                onClick={() => setFilterRating(filterRating === 3 ? 0 : 3)}
              />
              <SentimentRow
                label="Critical" sublabel="1–2 stars"
                count={ins.negative} total={ins.total}
                color="bg-red-500" textColor="text-red-700" bgColor="bg-red-50"
                onClick={() => setFilterRating(filterRating === 1 ? 0 : 1)}
              />
            </div>
          </div>

          {/* Overview */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Overview</p>
            <div className="space-y-3">
              <StatRow label="Average Rating" value={`${ins.avgRating.toFixed(2)} / 5.00`} />
              <StatRow label="Total Reviews"  value={ins.total} />
              <StatRow label="Replied"        value={ins.replied} />
              <StatRow
                label="Awaiting Reply"
                value={ins.unanswered}
                valueClass={ins.unanswered > 0 ? 'text-amber-600 font-bold' : 'text-gray-700'}
              />
              {ins.firstDate && (
                <StatRow
                  label="First Review"
                  value={new Date(ins.firstDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                />
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-4">
            <p className="text-xs font-semibold text-brand-700 mb-2.5">💡 Tips</p>
            <ul className="space-y-2 text-xs text-gray-500 leading-relaxed">
              <li>Reply within 24 h — customers notice fast responses.</li>
              <li>Thank positive reviewers to build loyalty.</li>
              <li>Address critical reviews calmly and offer solutions.</li>
            </ul>
          </div>

        </aside>
      </div>
    </OwnerLayout>
  )
}

// ── ReviewCard ─────────────────────────────────────────────────────────────────

function ReviewCard({ rv, replyState, onOpenReply, onCloseReply, onChangeText, onSubmit }) {
  const isOpen   = replyState?.open   ?? false
  const text     = replyState?.text   ?? ''
  const saving   = replyState?.saving ?? false
  const hasReply = !!rv.ownerReply

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
            {rv.reviewerName?.[0]?.toUpperCase() ?? '?'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">{rv.reviewerName}</p>
                <Stars rating={rv.rating} />
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">{fmtAgo(rv.createdAt)}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">#{rv.orderId?.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {rv.comment && (
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{rv.comment}</p>
            )}

            {rv.items?.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {rv.items.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                    <span className="text-gray-300">×{item.quantity}</span>
                    {item.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Existing reply */}
      {hasReply && !isOpen && (
        <div className="mx-4 mb-4 p-3.5 bg-brand-50 border border-brand-100 rounded-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-brand-700 flex items-center gap-1.5 uppercase tracking-wide">
              <ReplyIcon className="w-3 h-3" /> Owner Reply
            </span>
            <button onClick={onOpenReply} className="text-[11px] text-brand-500 hover:text-brand-700 font-medium">
              Edit
            </button>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{rv.ownerReply}</p>
          {rv.ownerReplyAt && (
            <p className="text-[10px] text-gray-400 mt-1">{fmtAgo(rv.ownerReplyAt)}</p>
          )}
        </div>
      )}

      {/* Reply compose */}
      {isOpen ? (
        <div className="px-4 pb-4">
          <div className="border border-brand-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-brand-100 bg-brand-50/70 flex items-center gap-1.5">
              <ReplyIcon className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-xs font-semibold text-brand-700">Your Reply</span>
            </div>
            <textarea
              value={text}
              onChange={e => onChangeText(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Write a thoughtful reply to this customer…"
              className="w-full px-4 py-3 text-sm text-gray-700 bg-white resize-none focus:outline-none placeholder-gray-400"
            />
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">{text.length}/1000</span>
              <div className="flex gap-2">
                <button onClick={onCloseReply}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button onClick={onSubmit} disabled={saving || !text.trim()}
                  className="text-xs px-4 py-1.5 rounded-lg bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Posting…' : hasReply ? 'Update' : 'Post Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : !hasReply && (
        <div className="px-4 pb-3.5">
          <button onClick={onOpenReply}
            className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
            <ReplyIcon className="w-3.5 h-3.5" />
            Reply to this review
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sidebar helpers ────────────────────────────────────────────────────────────

function SentimentRow({ label, sublabel, count, total, color, textColor, bgColor, onClick }) {
  const pct = total ? Math.round((count / total) * 100) : 0
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${bgColor} transition-opacity hover:opacity-80`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-xs font-semibold ${textColor}`}>{label}</p>
        <p className="text-[10px] text-gray-400">{sublabel}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${textColor}`}>{count}</p>
        <p className="text-[10px] text-gray-400">{pct}%</p>
      </div>
    </button>
  )
}

function StatRow({ label, value, valueClass = 'text-gray-700' }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

function ReplyIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  )
}
