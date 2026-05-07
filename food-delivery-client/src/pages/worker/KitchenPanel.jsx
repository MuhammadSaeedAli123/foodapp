import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { ordersApi } from '../../api/orders'
import { getToken } from '../../utils/token'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

const COLS = [
  { key: 'Pending',   label: 'New Orders',   color: 'bg-blue-500',   icon: '🔔' },
  { key: 'Preparing', label: 'Preparing',    color: 'bg-purple-500', icon: '🍳' },
]

export default function KitchenPanel() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const connectionRef = useRef(null)

  const load = () =>
    ordersApi.getKitchen()
      .then(setOrders)
      .catch(() => toast('Failed to load orders', 'error'))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  // ── Real-time via SignalR ─────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    // Admin confirmed an order → kitchen gets it
    connection.on('KitchenNewOrder', (order) => {
      setOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev
        return [order, ...prev]
      })
      toast(`New order from ${order.restaurantName}!`, 'info')
    })

    // Any status update → refresh the affected order
    connection.on('OrderStatusUpdated', ({ order }) => {
      setOrders(prev => {
        // Remove once it leaves kitchen scope (Ready / Delivered / Cancelled)
        if (!['Pending', 'Preparing'].includes(order.status))
          return prev.filter(o => o.id !== order.id)
        return prev.map(o => o.id === order.id ? order : o)
      })
    })

    connection.start().catch(console.error)
    connectionRef.current = connection
    return () => connection.stop()
  }, [])

  // ── Status transitions ────────────────────────────────────────────────────
  const handleStatus = async (orderId, newStatus) => {
    try {
      await ordersApi.updateStatus(orderId, newStatus)
      if (newStatus === 'Ready') {
        setOrders(prev => prev.filter(o => o.id !== orderId))
        toast('Order ready — rider will be notified!', 'success')
      } else if (newStatus === 'Preparing') {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Preparing' } : o))
        toast('Order accepted — start cooking!', 'success')
      }
    } catch (err) {
      toast(err.message || 'Failed to update', 'error')
    }
  }

  const byStatus = (status) => orders.filter(o => o.status === status)
  const total    = orders.length

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-lg">🍳</div>
            <div>
              <h1 className="font-bold text-white text-lg leading-tight">
                {user?.restaurantName ? `${user.restaurantName} — Kitchen` : 'Kitchen Panel'}
              </h1>
              <p className="text-gray-400 text-xs">Welcome, {user?.fullName?.split(' ')[0]}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live badge */}
            <div className="flex items-center gap-2 bg-green-900/40 border border-green-700/50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-medium">Live</span>
            </div>

            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <StatPill label="Waiting" count={byStatus('Pending').length} color="blue" />
              <StatPill label="Cooking" count={byStatus('Preparing').length} color="purple" />
            </div>

            {(user?.role === 'RestaurantOwner' || user?.role === 'KitchenStaff') && (
              <Link to={user.role === 'RestaurantOwner' ? '/owner' : '/'}
                className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800">
                {user.role === 'RestaurantOwner' ? '← My Panel' : '← Home'}
              </Link>
            )}
            <button
              onClick={() => { logout(); navigate('/') }}
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading orders…</p>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="flex items-center justify-center h-64 text-center">
            <div>
              <p className="text-6xl mb-4">✅</p>
              <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
              <p className="text-gray-400 text-sm">No active kitchen orders right now.</p>
              <p className="text-gray-500 text-xs mt-1">New orders will appear here automatically.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COLS.map(col => (
              <KanbanColumn
                key={col.key}
                col={col}
                orders={byStatus(col.key)}
                onStatus={handleStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, orders, onStatus }) {
  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
      {/* Column header */}
      <div className={`flex items-center justify-between px-5 py-3.5 ${col.color}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{col.icon}</span>
          <span className="font-bold text-white">{col.label}</span>
        </div>
        <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div className="p-4 space-y-4 min-h-[200px]">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
            No orders here
          </div>
        ) : (
          orders.map(order => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              onStatus={onStatus}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Order Card ────────────────────────────────────────────────────────────────
function KitchenOrderCard({ order, onStatus }) {
  const [confirming, setConfirming] = useState(false)

  const next = order.status === 'Pending' ? 'Preparing' : 'Ready'
  const nextLabel = order.status === 'Pending' ? 'Accept & Prepare' : 'Mark Ready'
  const nextColor = order.status === 'Pending'
    ? 'bg-purple-600 hover:bg-purple-700'
    : 'bg-teal-600 hover:bg-teal-700'

  const handleClick = async () => {
    setConfirming(true)
    await onStatus(order.id, next)
    setConfirming(false)
  }

  // Elapsed time
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)
  const isUrgent = elapsed >= 15

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      isUrgent ? 'border-red-700/50 bg-red-900/10' : 'border-gray-700 bg-gray-800/60'
    }`}>
      {/* Order header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-white text-sm">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            {isUrgent && (
              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium">
                ⏰ {elapsed}m
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-0.5">🏪 {order.restaurantName}</p>
          <p className="text-gray-500 text-xs">👤 {order.customerName}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-brand-400 font-bold">{formatCurrency(order.totalAmount)}</p>
          {!isUrgent && (
            <p className="text-gray-500 text-xs mt-0.5">{elapsed}m ago</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-gray-900/60 rounded-lg px-3 py-2.5 mb-3 space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-200">{item.foodItemName}</span>
            <span className="font-bold text-white bg-gray-700 rounded-md px-2 py-0.5 text-xs">
              ×{item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-3 py-2 mb-3">
          📝 {order.notes}
        </p>
      )}

      {/* Action button */}
      <button
        onClick={handleClick}
        disabled={confirming}
        className={`w-full text-white font-semibold py-2.5 rounded-xl text-sm transition-all
                    disabled:opacity-60 ${nextColor}`}
      >
        {confirming ? 'Updating…' : nextLabel}
      </button>
    </div>
  )
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, count, color }) {
  const colors = {
    blue:   'bg-blue-900/40  text-blue-300  border-blue-700/50',
    purple: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${colors[color]}`}>
      <span>{count}</span>
      <span className="opacity-70">{label}</span>
    </div>
  )
}
