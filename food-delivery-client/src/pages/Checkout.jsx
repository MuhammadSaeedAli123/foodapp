import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { ordersApi } from '../api/orders'
import { restaurantsApi } from '../api/restaurants'
import { formatCurrency } from '../utils/formatters'
import { toast } from '../components/common/Toast'

export default function Checkout() {
  const { cart, totalPrice, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [address, setAddress]     = useState(user?.address || '')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(0)

  useEffect(() => {
    if (cart.restaurantId) {
      restaurantsApi.getById(cart.restaurantId)
        .then(r => setDeliveryFee(r.deliveryFee ?? 0))
        .catch(() => {})
    }
  }, [cart.restaurantId])

  const grandTotal = totalPrice + deliveryFee

  const handlePlaceOrder = async () => {
    if (!address.trim()) { toast('Please enter a delivery address', 'warning'); return }
    if (cart.items.length === 0) { toast('Your cart is empty', 'warning'); return }

    setLoading(true)
    try {
      const order = await ordersApi.create({
        restaurantId:    cart.restaurantId,
        deliveryAddress: address,
        notes,
        items: cart.items.map((i) => ({ foodItemId: i.id, quantity: i.quantity }))
      })
      clearCart()
      toast('Order placed successfully!', 'success')
      navigate(`/orders/${order.id}/track`)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (cart.items.length === 0) {
    navigate('/cart')
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Delivery details */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-bold text-gray-900 mb-4">Delivery Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Address *</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3}
                    placeholder="Enter your full delivery address"
                    className="input-field resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Instructions</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="E.g. no onions, extra sauce, ring the bell…"
                    className="input-field resize-none" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-gray-900 mb-3">Payment</h3>
              <div className="flex items-center gap-3 p-4 border-2 border-brand-500 rounded-xl bg-brand-50">
                <span className="text-2xl">💵</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Cash on Delivery</p>
                  <p className="text-gray-500 text-xs">Pay when your order arrives</p>
                </div>
                <div className="ml-auto w-5 h-5 rounded-full border-2 border-brand-500 bg-brand-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Order summary */}
          <div>
            <div className="card p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h3>
              <p className="text-sm text-gray-500 mb-4">From <span className="font-medium text-gray-700">{cart.restaurantName}</span></p>

              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-gray-600">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : <span className="text-green-600 font-medium">Free</span>}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-brand-500">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <button onClick={handlePlaceOrder} disabled={loading} className="btn-primary w-full mt-6 text-base py-3">
                {loading ? 'Placing Order…' : `Place Order • ${formatCurrency(grandTotal)}`}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
