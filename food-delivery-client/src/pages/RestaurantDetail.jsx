import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import FoodItemCard from '../components/food/FoodItemCard'
import Loader from '../components/common/Loader'
import { restaurantsApi } from '../api/restaurants'
import { foodItemsApi } from '../api/foodItems'
import { reviewsApi } from '../api/reviews'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, fmt12, formatDate } from '../utils/formatters'

const STARS = [1, 2, 3, 4, 5]

function StarDisplay({ value, size = 'md' }) {
  const sz = size === 'sm' ? 'text-base' : 'text-xl'
  return (
    <span className="flex gap-0.5">
      {STARS.map(s => (
        <span key={s} className={`${sz} ${value >= s ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
    </span>
  )
}

export default function RestaurantDetail() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const { cart, totalItems, totalPrice } = useCart()
  const { isRole }      = useAuth()

  const [restaurant, setRestaurant] = useState(null)
  const [foodItems, setFoodItems]   = useState([])
  const [reviews, setReviews]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [changedId, setChangedId]   = useState(null)   // flash ID for availability changes
  const connectionRef               = useRef(null)

  useEffect(() => {
    Promise.all([
      restaurantsApi.getById(id),
      foodItemsApi.getByRestaurant(id),
      reviewsApi.getByRestaurant(id),
    ])
      .then(([r, items, revs]) => {
        setRestaurant(r)
        setFoodItems(items)
        setReviews(revs ?? [])
      })
      .finally(() => setLoading(false))
  }, [id])

  // ── Real-time: item availability + restaurant open/close ──────────────────
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('MenuItemChanged', (item) => {
      setFoodItems(prev => prev.map(f => f.id === item.id ? { ...f, ...item } : f))
      // Flash the changed item for 1.5 s so the user notices
      setChangedId(item.id)
      setTimeout(() => setChangedId(null), 1500)
    })

    conn.on('RestaurantStatusChanged', ({ restaurantId, isOpen }) => {
      if (restaurantId === id)
        setRestaurant(prev => prev ? { ...prev, isOpen } : prev)
    })

    conn.start()
      .then(() => conn.invoke('WatchRestaurant', id).catch(() => {}))
      .catch(() => {})

    connectionRef.current = conn
    return () => {
      conn.invoke('UnwatchRestaurant', id).catch(() => {})
      conn.stop()
    }
  }, [id])

  if (loading) return <><Navbar /><Loader /></>
  if (!restaurant) return (
    <><Navbar /><div className="p-8 text-center text-gray-400">Restaurant not found</div></>
  )

  const open = restaurant.isOpen   // API-managed flag, updated via SignalR

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  // Cart belongs to this restaurant — show sticky bar for User role
  const cartHere = isRole('User') && cart.restaurantId === restaurant.id && totalItems > 0

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero banner ─────────────────────────────────────────────────── */}
      <div className="relative h-56 md:h-72">
        <img
          src={restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <span className="badge bg-white/20 text-white text-xs mb-2">{restaurant.categoryName}</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">{restaurant.name}</h1>
            <p className="text-white/80 mt-1 text-sm">{restaurant.description}</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-28">

        {/* ── Info bar ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-5 mb-8 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            ⭐ {avgRating ?? restaurant.rating?.toFixed(1) ?? '—'}
            {reviews.length > 0 && (
              <span className="text-gray-400 text-xs">({reviews.length})</span>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600">🕐 {restaurant.deliveryTime} min</span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600">🚴 {formatCurrency(restaurant.deliveryFee)} delivery</span>
          {restaurant.address && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">📍 {restaurant.address}</span>
          )}
          <span className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${open ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-2 h-2 rounded-full transition-all ${open ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
            {open
              ? restaurant.closeTime ? `Open · Closes ${fmt12(restaurant.closeTime)}` : 'Open now'
              : restaurant.openTime  ? `Closed · Opens ${fmt12(restaurant.openTime)}`  : 'Closed'
            }
          </span>
        </div>

        {/* ── Menu ────────────────────────────────────────────────────────── */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>

        {!open && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-semibold text-red-700 text-sm">Restaurant is currently closed</p>
              <p className="text-red-500 text-xs mt-0.5">
                {restaurant.openTime ? `Opens at ${fmt12(restaurant.openTime)}` : 'Check back later'}
              </p>
            </div>
          </div>
        )}

        {foodItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-gray-400">No menu items available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {foodItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl transition-all duration-300 ${
                  changedId === item.id ? 'ring-2 ring-brand-400 ring-offset-2 scale-[1.01]' : ''
                }`}
              >
                <FoodItemCard
                  item={item}
                  restaurantId={restaurant.id}
                  restaurantName={restaurant.name}
                  restaurantOpen={open}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Reviews ─────────────────────────────────────────────────────── */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                <span className="text-amber-500 text-sm">★</span>
                <span className="font-bold text-gray-800 text-sm">{avgRating}</span>
                <span className="text-gray-400 text-xs">/ 5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-gray-500 font-medium">No reviews yet</p>
              <p className="text-gray-400 text-sm mt-1">Be the first to review after your order!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
              {reviews.map(review => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* ── Sticky Cart Bar ─────────────────────────────────────────────── */}
      {cartHere && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              onClick={() => navigate('/cart')}
              className="w-full flex items-center justify-between bg-brand-500 hover:bg-brand-600 text-white px-5 py-4 rounded-2xl shadow-2xl transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-lg">
                  {totalItems} item{totalItems !== 1 ? 's' : ''}
                </span>
                <span className="font-semibold">View Cart</span>
              </div>
              <span className="font-bold text-lg">{formatCurrency(totalPrice)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
          <span className="text-brand-600 font-bold text-sm">{review.reviewerName?.[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm">{review.reviewerName}</p>
            <p className="text-xs text-gray-400 shrink-0">{formatDate(review.createdAt)}</p>
          </div>
          <StarDisplay value={review.rating} size="sm" />
        </div>
      </div>

      {review.comment && (
        <p className="mt-3 text-sm text-gray-600 leading-relaxed pl-12">{review.comment}</p>
      )}

      {review.ownerReply && (
        <div className="mt-3 ml-12 p-3.5 bg-brand-50 border border-brand-100 rounded-xl">
          <p className="text-[11px] font-bold text-brand-700 uppercase tracking-wide mb-1.5">
            Owner's Reply
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{review.ownerReply}</p>
          {review.ownerReplyAt && (
            <p className="text-[10px] text-gray-400 mt-1">{formatDate(review.ownerReplyAt)}</p>
          )}
        </div>
      )}
    </div>
  )
}
