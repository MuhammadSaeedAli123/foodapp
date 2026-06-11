import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import OwnerLayout from '../../components/common/OwnerLayout'
import { useAuth } from '../../context/AuthContext'
import { restaurantsApi } from '../../api/restaurants'
import { ownerApi } from '../../api/owner'
import { authApi } from '../../api/auth'
import { getToken } from '../../utils/token'
import { formatCurrency, statusColor, statusLabel, fmt12, isOpenNow } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'
import { reviewsApi } from '../../api/reviews'

const STATUS_ICON = {
  Pending: '🔔', Confirmed: '✅', Preparing: '🍳',
  Ready: '📦', OutForDelivery: '🛵', Delivered: '✔️', Cancelled: '❌',
}

const EMPTY_PROFILE = {
  name: '', description: '', address: '', phoneNumber: '',
  imageUrl: '', openTime: '', closeTime: '', deliveryTime: 30, deliveryFee: 0,
}

// Custom tooltip for Recharts
function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-gray-700">
      <p className="font-semibold text-gray-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {currency ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function OwnerDashboard() {
  const { user, setUser }     = useAuth()
  const [data, setData]           = useState(null)
  const [earnings, setEarnings]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [live, setLive]           = useState(false)
  const [chartRange, setChartRange] = useState('7days')   // '7days' | 'monthly'

  // Tick every minute so time-based open/closed status stays current
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Live counters updated by SignalR
  const [liveActive, setLiveActive] = useState(null)   // null = not-yet-loaded
  const [newOrderPulse, setNewOrderPulse] = useState(false)

  // Profile edit
  const [editOpen, setEditOpen]   = useState(false)
  const [profileForm, setProfile] = useState(EMPTY_PROFILE)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving]       = useState(false)
  const [toggling, setToggling]   = useState(false)

  // Reviews
  const [reviews, setReviews]           = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const connectionRef  = useRef(null)
  const imageInputRef  = useRef(null)

  const load = () =>
    Promise.all([
      restaurantsApi.getOwnerDashboard(),
      ownerApi.getEarnings().catch(() => null),
    ])
      .then(([dash, earn]) => {
        setData(dash)
        setEarnings(earn)
        setLiveActive(dash?.stats?.activeOrders ?? 0)
        setError(null)
      })
      .catch(err => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
    if (!user?.createdAt) {
      authApi.getMe().then(me => {
        if (me?.createdAt && setUser)
          setUser(prev => ({ ...prev, createdAt: me.createdAt }))
      }).catch(() => {})
    }
  }, [])  // eslint-disable-line

  // ── SignalR ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('OwnerNewOrder', (order) => {
      // Prepend to recent orders list
      setData(prev => {
        if (!prev) return prev
        const alreadyIn = prev.recentOrders?.some(o => o.id === order.id)
        if (alreadyIn) return prev
        return {
          ...prev,
          stats: { ...prev.stats, activeOrders: (prev.stats?.activeOrders ?? 0) + 1, todayOrders: (prev.stats?.todayOrders ?? 0) + 1 },
          recentOrders: [order, ...(prev.recentOrders ?? [])].slice(0, 10),
        }
      })
      setLiveActive(n => (n ?? 0) + 1)
      // Pulse animation
      setNewOrderPulse(true)
      setTimeout(() => setNewOrderPulse(false), 3000)
      toast(`🔔 New order from ${order.customerName}!`, 'info')
    })

    conn.on('OwnerOrderStatusUpdated', ({ order }) => {
      if (!order) return
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          recentOrders: prev.recentOrders?.map(o => o.id === order.id ? { ...o, status: order.status } : o) ?? [],
        }
      })
      // Recalc active count when delivered/cancelled
      if (order.status === 'Delivered' || order.status === 'Cancelled') {
        setLiveActive(n => Math.max(0, (n ?? 0) - 1))
      }
    })

    conn.start().then(() => setLive(true)).catch(console.error)
    conn.onreconnected(() => setLive(true))
    conn.onclose(() => setLive(false))

    connectionRef.current = conn
    return () => conn.stop()
  }, [])

  // Fetch reviews whenever the restaurant changes
  useEffect(() => {
    const restaurantId = data?.restaurant?.id
    if (!restaurantId) return
    setReviewsLoading(true)
    reviewsApi.getByRestaurant(restaurantId)
      .then(setReviews)
      .catch(() => {})
      .finally(() => setReviewsLoading(false))
  }, [data?.restaurant?.id])  // eslint-disable-line

  const openEdit = () => {
    const r = data?.restaurant
    if (!r) return
    setImageFile(null)
    setImagePreview(r.imageUrl ?? '')
    setProfile({
      name: r.name ?? '', description: r.description ?? '',
      address: r.address ?? '', phoneNumber: r.phoneNumber ?? '',
      imageUrl: r.imageUrl ?? '', openTime: r.openTime ?? '', closeTime: r.closeTime ?? '',
      deliveryTime: r.deliveryTime ?? 30, deliveryFee: r.deliveryFee ?? 0,
    })
    setEditOpen(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      let imageUrl = profileForm.imageUrl
      if (imageFile) {
        const result = await ownerApi.uploadRestaurantImage(imageFile)
        imageUrl = result.imageUrl
      }
      const updated = await ownerApi.updateProfile({
        ...profileForm,
        imageUrl,
        deliveryTime: Number(profileForm.deliveryTime),
        deliveryFee:  Number(profileForm.deliveryFee),
        openTime:     profileForm.openTime  || null,
        closeTime:    profileForm.closeTime || null,
      })
      setData(prev => ({ ...prev, restaurant: { ...prev.restaurant, ...updated } }))
      setEditOpen(false)
      setImageFile(null)
      toast('Profile updated!', 'success')
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleOpen = async () => {
    setToggling(true)
    try {
      const result = await ownerApi.toggleOpen()
      setData(prev => ({ ...prev, restaurant: { ...prev.restaurant, isOpen: result.isOpen } }))
      toast(result.isOpen ? '🟢 Restaurant is now Open' : '🔴 Restaurant is now Closed', 'success')
    } catch (err) {
      toast(err.message || 'Failed to toggle', 'error')
    } finally {
      setToggling(false)
    }
  }

  const r  = data?.restaurant
  const s  = data?.stats
  const ro = data?.recentOrders ?? []
  // When the owner has set opening hours, derive status from the current time.
  // Fall back to the manual isOpen toggle only when no schedule is configured.
  const open = (r?.openTime && r?.closeTime)
    ? isOpenNow(r.openTime, r.closeTime)
    : (r?.isOpen ?? false)

  // Chart data: last 7 or 30 days from earnings API
  const chartData = (chartRange === '7days'
    ? earnings?.last7Days
    : earnings?.last30Days
  )?.map(d => ({ date: d.date, revenue: d.revenue, orders: d.orders })) ?? []

  if (loading) return (
    <OwnerLayout title="Dashboard">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </OwnerLayout>
  )

  if (error) return (
    <OwnerLayout title="Dashboard">
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-5xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Could not load dashboard</h2>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={() => { setError(null); setLoading(true); load() }}
          className="btn-primary text-sm px-5 py-2">Retry</button>
      </div>
    </OwnerLayout>
  )

  if (!r) return (
    <OwnerLayout title="Dashboard">
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-5xl mb-4">🏪</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">No Restaurant Linked</h2>
        <p className="text-gray-500 text-sm">Ask your admin to link a restaurant to your account.</p>
      </div>
    </OwnerLayout>
  )

  return (
    <OwnerLayout title="Dashboard">
      <div className="space-y-6 w-full">

        {/* ── Restaurant hero ───────────────────────────────────────────────── */}
        <div className="card overflow-hidden w-full">
          <div className="flex flex-col sm:flex-row">
            {r.imageUrl && (
              <div className="sm:w-52 h-36 sm:h-auto shrink-0">
                <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900">{r.name}</h2>
                    <span className={`badge text-xs font-semibold ${open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                      {open ? '● Open' : '● Closed'}
                    </span>
                    <span className="badge text-xs bg-gray-100 text-gray-600">{r.categoryName}</span>
                  </div>
                  {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {r.rating > 0 && (
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                      <span className="text-amber-500 text-sm">★</span>
                      <span className="font-bold text-gray-800 text-sm">{r.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <button onClick={openEdit}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-brand-200 text-brand-600 hover:bg-brand-50 transition-colors">
                    ✏️ Edit Profile
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 mt-12 text-xs text-gray-600">
                {r.address     && <span className="flex items-center gap-1.5">📍 {r.address}</span>}
                {r.phoneNumber && <span className="flex items-center gap-1.5">📞 {r.phoneNumber}</span>}
                <span className="flex items-center gap-1.5">🚚 {r.deliveryTime} min · {formatCurrency(r.deliveryFee)} fee</span>
                {r.openTime && r.closeTime
                  ? <span className="flex items-center gap-1.5">🕐 {fmt12(r.openTime)} – {fmt12(r.closeTime)}</span>
                  : <span className="flex items-center gap-1.5">🕐 24 / 7</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Live status bar ──────────────────────────────────────────────── */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl border transition-all duration-500 ${
          newOrderPulse ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'
        }`}>
          <LiveBadge
            label="Active Orders"
            value={liveActive ?? s?.activeOrders ?? 0}
            color="text-orange-600 bg-orange-100"
            pulse={newOrderPulse}
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
          <LiveBadge
            label="Today's Orders"
            value={s?.todayOrders ?? 0}
            color="text-blue-600 bg-blue-100"
            icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
          <LiveBadge
            label="Today's Revenue"
            value={formatCurrency(s?.todayRevenue ?? 0)}
            color="text-green-600 bg-green-100"
            icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-xl bg-gray-50">
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${open ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className={`w-3 h-3 rounded-full ${open ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
              </div>
              {!r.openTime && !r.closeTime && (
                <button onClick={handleToggleOpen} disabled={toggling}
                  className={`shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors disabled:opacity-50 ${
                    open ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'
                  }`}>
                  {toggling ? '…' : open ? 'Close' : 'Open'}
                </button>
              )}
            </div>
            <div>
              <p className={`text-base sm:text-lg font-bold leading-tight ${open ? 'text-green-700' : 'text-red-600'}`}>
                {open ? 'Open' : 'Closed'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                {r.openTime && r.closeTime
                  ? `${fmt12(r.openTime)} – ${fmt12(r.closeTime)}`
                  : r.name}
              </p>
            </div>
          </div>
        </div>

        {/* ── KPI cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 w-full">
          <KpiCard icon="💰" label="Total Revenue"   value={formatCurrency(s?.totalRevenue ?? 0)}  color="green"  href="/owner/earnings" />
          <KpiCard icon="📦" label="Total Orders"    value={s?.totalOrders ?? 0}                    color="blue"   href="/owner/orders" />
          <KpiCard icon="🍳" label="Active Now"      value={liveActive ?? s?.activeOrders ?? 0}     color="orange" href="/owner/orders" pulse />
          <KpiCard icon="📊" label="Avg Order"       value={formatCurrency(s?.avgOrderValue ?? 0)}  color="teal"   href="/owner/earnings" />
          <KpiCard icon="🍔" label="Menu Items"      value={s?.menuItemCount ?? 0}                  color="pink"   href="/owner/menu" />
          <KpiCard icon="👨‍🍳" label="Staff"          value={s?.staffCount ?? 0}                     color="indigo" href="/owner/staff" />
        </div>

        {/* ── Charts + Recent Orders ────────────────────────────────────────── */}

        {/* Period toggle */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="hidden sm:block text-sm font-medium text-gray-600">Performance Period:</span>
          <div className="flex bg-gray-100 rounded-xl p-1 text-xs gap-1">
            <button
              onClick={() => setChartRange('7days')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all ${
                chartRange === '7days' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              7 Days
            </button>
            <button
              onClick={() => setChartRange('monthly')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all ${
                chartRange === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Monthly (30 Days)
            </button>
          </div>
          <div className={`ml-auto flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            live ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {live ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* Separate Orders + Revenue charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

          {/* Orders chart */}
          <div className="card p-5" style={{ overflowX: 'auto' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">Orders</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {chartRange === '7days' ? 'Last 7 days' : 'Last 30 days'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Orders
              </div>
            </div>
            {chartData.length > 0 ? (
              <div style={{ width: chartRange === '7days' ? '100%' : Math.max(500, chartData.length * 55) }}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordGradD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                    <Tooltip content={<ChartTooltip currency={false} />} />
                    <Area type="monotone" dataKey="orders" name="Orders"
                      stroke="#3b82f6" strokeWidth={2.5} fill="url(#ordGradD)"
                      dot={{ r: chartRange === 'monthly' ? 2 : 4, fill: '#3b82f6' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-300">
                <p className="text-4xl mb-2">📦</p>
                <p className="text-sm">No orders data yet</p>
              </div>
            )}
          </div>

          {/* Revenue chart */}
          <div className="card p-5" style={{ overflowX: 'auto' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">Revenue</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {chartRange === '7days' ? 'Last 7 days' : 'Last 30 days'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Revenue
              </div>
            </div>
            {chartData.length > 0 ? (
              <div style={{ width: chartRange === '7days' ? '100%' : Math.max(500, chartData.length * 55) }}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGradD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={45} />
                    <Tooltip content={<ChartTooltip currency />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue"
                      stroke="#f97316" strokeWidth={2.5} fill="url(#revGradD)"
                      dot={{ r: chartRange === 'monthly' ? 2 : 4, fill: '#f97316' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-300">
                <p className="text-4xl mb-2">💰</p>
                <p className="text-sm">No revenue data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Orders ────────────────────────────────────────────────── */}
        <div className="card flex flex-col w-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800">Recent Orders</h3>
              {newOrderPulse && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                  New!
                </span>
              )}
            </div>
            <Link to="/owner/orders" className="text-xs text-brand-500 hover:underline font-medium">View All →</Link>
          </div>

          {ro.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm text-gray-400">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: 260 }}>
              {ro.map(o => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <span className="text-base shrink-0">{STATUS_ICON[o.status] ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{o.customerName}</p>
                    <p className="text-xs text-gray-400">{o.itemCount} item{o.itemCount !== 1 ? 's' : ''} · {fmtAgo(o.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(o.totalAmount)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor(o.status)}`}>
                      {statusLabel(o.status) || o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Reviews compact widget ────────────────────────────────────────── */}
        <div className="card w-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800">Customer Reviews</h3>
              {reviews.length > 0 && (
                <span className="flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                  <span>★</span>
                  {(reviews.reduce((a, rv) => a + rv.rating, 0) / reviews.length).toFixed(1)}
                </span>
              )}
            </div>
            <Link to="/owner/reviews" className="text-xs text-brand-500 hover:underline font-medium">
              View All →
            </Link>
          </div>

          {reviewsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <p className="text-3xl mb-1.5">⭐</p>
              <p className="text-sm text-gray-400">No reviews yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reviews.slice(0, 3).map(rv => (
                <div key={rv.orderId} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {rv.reviewerName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate">{rv.reviewerName}</p>
                      <span className="text-xs text-gray-400 shrink-0">{fmtAgo(rv.createdAt)}</span>
                    </div>
                    <div className="flex gap-0.5 my-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-xs ${s <= rv.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    {rv.comment && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{rv.comment}</p>
                    )}
                  </div>
                </div>
              ))}
              {reviews.length > 3 && (
                <div className="px-5 py-3 text-center">
                  <Link to="/owner/reviews" className="text-xs text-brand-500 hover:underline font-medium">
                    +{reviews.length - 3} more reviews
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Edit Profile Modal ────────────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={e => e.target === e.currentTarget && setEditOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Edit Restaurant Profile</h2>
              <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSaveProfile} className="px-6 py-5 space-y-5">

              {/* ── Cover image picker ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setImageFile(f)
                    setImagePreview(URL.createObjectURL(f))
                  }}
                />
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="relative w-full h-36 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer group hover:border-brand-400 transition-colors"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                        <svg className="w-7 h-7 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-white text-xs font-semibold">Change Photo</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">Click to upload photo</span>
                      <span className="text-xs text-gray-400">JPEG, PNG or WebP · max 3 MB</span>
                    </div>
                  )}
                </div>
                {imageFile && (
                  <div className="flex items-center justify-between mt-1.5 px-1">
                    <p className="text-xs text-gray-500 truncate">{imageFile.name}</p>
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(profileForm.imageUrl) }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0 ml-2">Remove</button>
                  </div>
                )}
              </div>

              {/* ── Basic info ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Basic Info</p>
                <ProfileField label="Restaurant Name" required>
                  <input className="input-field" placeholder="e.g. Karachi Kitchen"
                    value={profileForm.name} required maxLength={150}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                </ProfileField>
                <ProfileField label="Description">
                  <textarea className="input-field resize-none" rows={2}
                    placeholder="Short description of your restaurant…"
                    value={profileForm.description} maxLength={500}
                    onChange={e => setProfile(p => ({ ...p, description: e.target.value }))} />
                </ProfileField>
              </div>

              {/* ── Contact ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
                <ProfileField label="Address">
                  <input className="input-field" placeholder="e.g. 12 Main Street, Karachi"
                    value={profileForm.address}
                    onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} />
                </ProfileField>
                <ProfileField label="Phone Number">
                  <input className="input-field" placeholder="+923001234567"
                    value={profileForm.phoneNumber}
                    onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))} />
                </ProfileField>
              </div>

              {/* ── Hours & Delivery ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hours &amp; Delivery</p>
                <div className="grid grid-cols-2 gap-3">
                  <ProfileField label="Open Time">
                    <input className="input-field" type="time" value={profileForm.openTime}
                      onChange={e => setProfile(p => ({ ...p, openTime: e.target.value }))} />
                  </ProfileField>
                  <ProfileField label="Close Time">
                    <input className="input-field" type="time" value={profileForm.closeTime}
                      onChange={e => setProfile(p => ({ ...p, closeTime: e.target.value }))} />
                  </ProfileField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ProfileField label="Delivery Time (min)">
                    <input className="input-field" type="number" min={1} max={300}
                      placeholder="30"
                      value={profileForm.deliveryTime}
                      onChange={e => setProfile(p => ({ ...p, deliveryTime: e.target.value }))} />
                  </ProfileField>
                  <ProfileField label="Delivery Fee ($)">
                    <input className="input-field" type="number" step="0.01" min={0}
                      placeholder="0.00"
                      value={profileForm.deliveryFee}
                      onChange={e => setProfile(p => ({ ...p, deliveryFee: e.target.value }))} />
                  </ProfileField>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditOpen(false)}
                  className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000)
  if (diff < 1)  return 'just now'
  if (diff < 60) return `${diff}m ago`
  const h = Math.floor(diff / 60)
  if (h < 24)    return `${h}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const COLOR_MAP = {
  green:  { bg: 'bg-green-50',  text: 'text-green-600'  },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600'   },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-600'   },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-600'   },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
}

function KpiCard({ icon, label, value, color, href, pulse }) {
  const { bg, text } = COLOR_MAP[color] ?? COLOR_MAP.blue
  const inner = (
    <div className={`card p-3 sm:p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 h-full ${href ? 'hover:shadow-md transition-shadow' : ''}`}>
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-xl shrink-0 ${bg} ${text}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-base sm:text-xl font-bold leading-tight ${pulse ? 'text-orange-600' : 'text-gray-900'}`}>{value}</p>
        <p className="text-xs text-gray-500 leading-snug">{label}</p>
        {pulse && <p className="text-xs text-orange-400 font-medium animate-pulse">Live</p>}
      </div>
    </div>
  )
  return href ? <Link to={href}>{inner}</Link> : <div>{inner}</div>
}

function ProfileField({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function LiveBadge({ label, value, color, pulse, icon }) {
  return (
    <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-xl bg-white border border-gray-100">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        {pulse && <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0" />}
      </div>
      <div>
        <p className={`text-base sm:text-lg font-bold leading-tight ${pulse ? 'text-orange-600' : 'text-gray-900'}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{label}</p>
        {pulse && <p className="text-xs text-orange-400 font-medium animate-pulse mt-0.5">Live</p>}
      </div>
    </div>
  )
}


