import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import RiderLayout from '../../components/common/RiderLayout'
import { ordersApi } from '../../api/orders'
import { riderApi }  from '../../api/rider'
import { getToken }  from '../../utils/token'
import { useAuth }   from '../../context/AuthContext'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { toast }     from '../../components/common/Toast'

// ── Countdown badge (per-order, resets when order is re-broadcast) ──────────
function CountdownBadge({ receivedAt }) {
  const [secs, setSecs] = useState(() => Math.max(0, 15 - Math.floor((Date.now() - receivedAt) / 1000)))

  useEffect(() => {
    const iv = setInterval(() => {
      setSecs(Math.max(0, 15 - Math.floor((Date.now() - receivedAt) / 1000)))
    }, 500)
    return () => clearInterval(iv)
  }, [receivedAt])

  if (secs === 0) return (
    <span className="text-xs font-semibold text-gray-400 animate-pulse">re-broadcasting…</span>
  )
  return (
    <span className={`text-xs font-bold tabular-nums ${secs > 8 ? 'text-amber-500' : 'text-red-500'}`}>
      ⏱ {secs}s
    </span>
  )
}

// ── Active delivery card ─────────────────────────────────────────────────────
function ActiveOrderCard({ order, onDeliver, delivering }) {
  return (
    <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-5 text-white shadow-xl shadow-brand-500/30 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🛵</span>
        <span className="font-bold text-sm uppercase tracking-wide opacity-90">Active Delivery</span>
        <span className="ml-auto bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          Out for Delivery
        </span>
      </div>

      <div className="bg-white/10 rounded-xl p-4 mb-4 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm opacity-80">🏪 {order.restaurantName}</p>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(order.totalAmount)}</p>
        </div>

        <div className="border-t border-white/20 pt-2 space-y-1">
          <p className="text-sm">
            <span className="opacity-70">Customer: </span>
            <span className="font-semibold">{order.customerName}</span>
          </p>
          {order.customerPhone && (
            <p className="text-sm">
              <span className="opacity-70">Phone: </span>
              <a href={`tel:${order.customerPhone}`} className="font-semibold underline">
                {order.customerPhone}
              </a>
            </p>
          )}
          <p className="text-sm">
            <span className="opacity-70">📍 </span>
            <span className="font-semibold">{order.deliveryAddress}</span>
          </p>
        </div>

        <div className="border-t border-white/20 pt-2 text-xs opacity-70">
          {order.items?.map(i => `${i.foodItemName} ×${i.quantity}`).join(', ')}
        </div>
      </div>

      <button
        onClick={() => onDeliver(order.id)}
        disabled={delivering}
        className="w-full bg-white text-brand-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {delivering ? (
          <>
            <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Marking…
          </>
        ) : (
          <>✅ Mark as Delivered</>
        )}
      </button>
    </div>
  )
}

// ── Available order card ─────────────────────────────────────────────────────
function AvailableOrderCard({ order, onAccept, accepting, disabled }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
      disabled ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-brand-200 hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
            <CountdownBadge receivedAt={order.receivedAt} />
          </div>
          <p className="text-sm text-gray-600">🏪 {order.restaurantName}</p>
          <p className="text-sm text-gray-500 mt-0.5 truncate">📍 {order.deliveryAddress}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
        </div>
        <p className="text-xl font-bold text-brand-500 shrink-0">{formatCurrency(order.totalAmount)}</p>
      </div>

      {/* Items */}
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        {order.items?.map(i => `${i.foodItemName} ×${i.quantity}`).join(' · ')}
      </p>

      <button
        onClick={() => onAccept(order.id)}
        disabled={accepting || disabled}
        className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {accepting ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Accepting…
          </>
        ) : disabled ? (
          'Finish current delivery first'
        ) : (
          '🛵 Accept & Pick Up'
        )}
      </button>
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'brand' }) {
  const colors = {
    brand:  'text-brand-600',
    green:  'text-green-600',
    amber:  'text-amber-600',
    gray:   'text-gray-600',
  }
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export default function RiderDashboard() {
  const { user }           = useAuth()
  const [isOnline, setIsOnline]           = useState(false)
  const [activeOrder, setActiveOrder]     = useState(null)
  const [availableOrders, setAvailableOrders] = useState([])
  const [stats, setStats]                 = useState({ todayDeliveries: 0, todayEarnings: 0 })
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [toggling, setToggling]           = useState(false)
  const [accepting, setAccepting]         = useState(null) // orderId being accepted
  const [delivering, setDelivering]       = useState(false)
  const connectionRef                     = useRef(null)

  // ── Initial status load ───────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      const s = await riderApi.getStatus()
      setIsOnline(s.isOnline)
      setActiveOrder(s.activeOrder ?? null)
      setStats({ todayDeliveries: s.todayDeliveries, todayEarnings: s.todayEarnings })
      // availableOrders is now bundled in the status response — no second API call needed
      if (s.isOnline && Array.isArray(s.availableOrders)) {
        setAvailableOrders(s.availableOrders.map(o => ({ ...o, receivedAt: Date.now() })))
      }
    } catch {
      toast('Failed to load status', 'error')
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  // ── SignalR ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    // Server syncs our online state on connect (e.g. after page refresh)
    connection.on('RiderStatusSync', ({ isOnline: online }) => {
      setIsOnline(online)
    })

    // New order available for pickup
    connection.on('AvailableOrderReady', (order) => {
      setAvailableOrders(prev => {
        const exists = prev.find(o => o.id === order.id)
        if (exists) {
          // Re-broadcast from server — reset countdown timer
          return prev.map(o => o.id === order.id ? { ...order, receivedAt: Date.now() } : o)
        }
        toast(`New order from ${order.restaurantName}!`, 'info')
        return [{ ...order, receivedAt: Date.now() }, ...prev]
      })
    })

    // Another rider accepted this order — remove it from our list.
    // The event fires for ALL riders (including the acceptor), so only
    // show the toast when someone ELSE took it.
    connection.on('OrderAssigned', ({ orderId, assignedRiderId }) => {
      setAvailableOrders(prev => {
        const found = prev.find(o => o.id === orderId)
        if (found && assignedRiderId !== user?.id)
          toast('Order was taken by another rider', 'warning')
        return prev.filter(o => o.id !== orderId)
      })
    })

    // Tracks any status update (e.g. if our active order status changes)
    connection.on('OrderStatusUpdated', ({ orderId, status }) => {
      if (status === 'Delivered' || status === 'Cancelled') {
        setActiveOrder(prev => prev?.id === orderId ? null : prev)
      }
    })

    connection.start().catch(console.error)
    connectionRef.current = connection
    return () => connection.stop()
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggleOnline = async () => {
    const conn = connectionRef.current
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      toast('Connection not ready — please wait', 'warning')
      return
    }
    setToggling(true)
    try {
      if (isOnline) {
        await conn.invoke('GoOffline')
        setIsOnline(false)
      } else {
        await conn.invoke('GoOnline')
        setIsOnline(true)
        // Load available orders when going online
        const orders = await ordersApi.getAvailable()
        setAvailableOrders(orders.map(o => ({ ...o, receivedAt: Date.now() })))
      }
    } catch {
      toast('Failed to change status', 'error')
    } finally {
      setToggling(false)
    }
  }

  const handleAccept = async (orderId) => {
    setAccepting(orderId)
    try {
      const order = await ordersApi.acceptOrder(orderId)
      setAvailableOrders(prev => prev.filter(o => o.id !== orderId))
      // Map the returned order DTO (which uses camelCase already from the API)
      setActiveOrder({
        ...order,
        customerPhone: order.customerPhone ?? '',
      })
      toast('Order accepted! Head to the restaurant. 🏪', 'success')
      setStats(prev => ({ ...prev })) // trigger status refresh later
    } catch (err) {
      if (err.status === 409) {
        toast('Order was already taken by another rider', 'warning')
        setAvailableOrders(prev => prev.filter(o => o.id !== orderId))
      } else {
        toast(err.message ?? 'Failed to accept order', 'error')
      }
    } finally {
      setAccepting(null)
    }
  }

  const handleDeliver = async (orderId) => {
    setDelivering(true)
    try {
      await ordersApi.updateStatus(orderId, 'Delivered')
      setActiveOrder(null)
      toast('Delivery complete! Great work 🎉', 'success')
      // Refresh stats
      loadStatus()
    } catch (err) {
      toast(err.message ?? 'Failed to mark delivered', 'error')
    } finally {
      setDelivering(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingStatus) {
    return (
      <RiderLayout title="Dashboard" isOnline={isOnline}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </RiderLayout>
    )
  }

  return (
    <RiderLayout title="Dashboard" isOnline={isOnline}>
      {/* ── Welcome + Toggle ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Hey, {user?.fullName?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {isOnline
              ? activeOrder
                ? 'You have an active delivery in progress.'
                : `${availableOrders.length} order${availableOrders.length !== 1 ? 's' : ''} waiting for pickup.`
              : 'Go online to start receiving orders.'}
          </p>
        </div>

        {/* Online / Offline toggle */}
        <button
          onClick={handleToggleOnline}
          disabled={toggling}
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 shadow-lg ${
            isOnline
              ? 'bg-green-500 text-white shadow-green-500/30 hover:bg-green-600'
              : 'bg-gray-800 text-white shadow-gray-900/20 hover:bg-gray-700'
          }`}
        >
          {toggling ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
          )}
          {toggling ? 'Updating…' : isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Today's Deliveries"
          value={stats.todayDeliveries}
          color="brand"
        />
        <KpiCard
          label="Today's Earnings"
          value={formatCurrency(stats.todayEarnings)}
          color="green"
        />
        <KpiCard
          label="Available Orders"
          value={isOnline ? availableOrders.length : '—'}
          sub={isOnline ? 'right now' : 'go online to see'}
          color={availableOrders.length > 0 ? 'amber' : 'gray'}
        />
        <KpiCard
          label="Status"
          value={isOnline ? (activeOrder ? 'Delivering' : 'Available') : 'Offline'}
          color={isOnline ? (activeOrder ? 'amber' : 'green') : 'gray'}
        />
      </div>

      {/* ── Offline state ─────────────────────────────────────────────── */}
      {!isOnline && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="text-6xl mb-4">🛵</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">You're Offline</h3>
          <p className="text-gray-400 text-sm mb-6">
            Press "Go Online" to start receiving order assignments in real time.
          </p>
          <button
            onClick={handleToggleOnline}
            disabled={toggling}
            className="btn-primary px-8 py-3 text-sm"
          >
            {toggling ? 'Updating…' : 'Go Online Now'}
          </button>
        </div>
      )}

      {/* ── Online state ──────────────────────────────────────────────── */}
      {isOnline && (
        <>
          {/* Active delivery */}
          {activeOrder && (
            <ActiveOrderCard
              order={activeOrder}
              onDeliver={handleDeliver}
              delivering={delivering}
            />
          )}

          {/* Available orders list */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Available Orders
              {availableOrders.length > 0 && (
                <span className="ml-2 bg-brand-100 text-brand-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {availableOrders.length}
                </span>
              )}
            </h3>
            {activeOrder && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg font-medium">
                Complete current delivery to accept
              </span>
            )}
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
              <div className="text-5xl mb-3">📭</div>
              <h4 className="text-base font-semibold text-gray-700 mb-1">No orders yet</h4>
              <p className="text-sm text-gray-400">New orders will appear here automatically in real time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableOrders.map(order => (
                <AvailableOrderCard
                  key={order.id}
                  order={order}
                  onAccept={handleAccept}
                  accepting={accepting === order.id}
                  disabled={!!activeOrder}
                />
              ))}
            </div>
          )}
        </>
      )}
    </RiderLayout>
  )
}
