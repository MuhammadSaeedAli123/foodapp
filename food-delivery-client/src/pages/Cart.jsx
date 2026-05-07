import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import { useCart } from '../context/CartContext'
import { restaurantsApi } from '../api/restaurants'
import { formatCurrency } from '../utils/formatters'

export default function Cart() {
  const { cart, removeItem, updateQuantity, clearCart, totalPrice } = useCart()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)

  useEffect(() => {
    if (cart.restaurantId) {
      restaurantsApi.getById(cart.restaurantId)
        .then(setRestaurant)
        .catch(() => {})
    }
  }, [cart.restaurantId])

  const deliveryFee = restaurant?.deliveryFee ?? 0
  const grandTotal  = totalPrice + deliveryFee

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-7xl mb-6">🛒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-8">Add items from a restaurant to get started</p>
          <Link to="/" className="btn-primary">Browse Restaurants</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
          <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors">
            Clear cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {/* Restaurant info bar */}
            <div className="card p-4 mb-2 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-gray-500">
                Ordering from{' '}
                <Link to={`/restaurants/${cart.restaurantId}`} className="font-semibold text-brand-500 hover:underline">
                  {cart.restaurantName}
                </Link>
              </p>
              {restaurant && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>🕐 {restaurant.deliveryTime} min</span>
                  <span>🚴 {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Free delivery'}</span>
                </div>
              )}
            </div>

            {cart.items.map((item) => (
              <div key={item.id} className="card p-4 flex items-center gap-4">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">{item.name}</h4>
                  <p className="text-brand-500 font-bold">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-1">
                    <button
                      onClick={() => item.quantity === 1 ? removeItem(item.id) : updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-brand-500 font-bold text-lg transition-colors">
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-brand-500 font-bold text-lg transition-colors">
                      +
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-16 text-right">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}

            {/* Back to restaurant link */}
            <Link
              to={`/restaurants/${cart.restaurantId}`}
              className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-600 font-medium mt-2 group">
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Add more from {cart.restaurantName}
            </Link>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h3>

              <div className="space-y-3 text-sm">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-gray-600">
                    <span className="truncate mr-2">{item.name} × {item.quantity}</span>
                    <span className="shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-4 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>
                    {restaurant
                      ? (deliveryFee > 0 ? formatCurrency(deliveryFee) : <span className="text-green-600 font-medium">Free</span>)
                      : <span className="text-gray-300 text-xs">Loading…</span>
                    }
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span className="text-brand-500">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {restaurant?.deliveryTime && (
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                  <span>🕐</span>
                  <span>Estimated delivery: <strong className="text-gray-700">{restaurant.deliveryTime} min</strong></span>
                </div>
              )}

              <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-5">
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
