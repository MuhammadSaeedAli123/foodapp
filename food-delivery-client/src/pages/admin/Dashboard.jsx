import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import AdminLayout from '../../components/common/AdminLayout'
import { adminApi } from '../../api/orders'
import { formatCurrency, statusColor, statusLabel } from '../../utils/formatters'

// ── tiny helpers ──────────────────────────────────────────────────────────────

function trend(today, yesterday) {
  if (yesterday === 0) return today > 0 ? { pct: null, up: true, label: 'New today' } : { pct: null, up: null, label: 'No data' }
  const pct = Math.round(((today - yesterday) / yesterday) * 100)
  return { pct: Math.abs(pct), up: pct >= 0, label: pct >= 0 ? `+${pct}% vs yesterday` : `${pct}% vs yesterday` }
}

function fmtAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000)
  if (diff < 1)  return 'just now'
  if (diff < 60) return `${diff}m ago`
  const h = Math.floor(diff / 60)
  if (h < 24)   return `${h}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const STATUS_DOT = {
  Pending:        'bg-yellow-400',
  Confirmed:      'bg-blue-400',
  Preparing:      'bg-purple-400',
  Ready:          'bg-teal-400',
  OutForDelivery: 'bg-orange-400',
  Delivered:      'bg-green-400',
  Cancelled:      'bg-red-400',
}

// ── custom tooltip for charts ─────────────────────────────────────────────────
function ChartTip({ active, payload, label, type }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {type === 'currency' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [lastTick,  setLastTick]  = useState(null)
  const [pulse,     setPulse]     = useState(false)

  const fetchData = useCallback(() => {
    adminApi.getDashboard()
      .then(d => {
        setData(d)
        setLastTick(new Date())
        setPulse(true)
        setTimeout(() => setPulse(false), 600)
        setError(null)
      })
      .catch(e => setError(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  // Initial load + 30-second polling
  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [fetchData])

  if (loading) return (
    <AdminLayout title="Dashboard">
      <div className="flex items-center justify-center h-72">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </AdminLayout>
  )

  if (error) return (
    <AdminLayout title="Dashboard">
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-5xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Could not load dashboard</h2>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={() => { setLoading(true); fetchData() }}
          className="btn-primary text-sm px-5 py-2">Retry</button>
      </div>
    </AdminLayout>
  )

  const ls  = data.liveStatus
  const kpi = data.kpi
  const ao  = data.activeOrders    ?? []
  const cd  = data.chartData       ?? []
  const tr  = data.topRestaurants  ?? []

  const revTrend = trend(kpi.todayRevenue,   kpi.yesterdayRevenue)
  const ordTrend = trend(kpi.todayOrders,    kpi.yesterdayOrders)

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6 max-w-7xl">

        {/* ── Live refresh badge ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Last updated: <span className="font-medium text-gray-600">
              {lastTick ? lastTick.toLocaleTimeString() : '—'}
            </span>
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full bg-green-500 transition-all ${pulse ? 'scale-150' : 'scale-100'}`} />
            Live · refreshes every 30s
          </div>
        </div>

        {/* ── Live status bar ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <LiveCard icon="🔥" label="Active Orders"        value={ls.activeOrders}    bg="bg-orange-50"  ring="ring-orange-200" text="text-orange-600" />
          <LiveCard icon="👨‍🍳" label="Kitchens Preparing"  value={ls.preparingCount}  bg="bg-purple-50"  ring="ring-purple-200" text="text-purple-600" />
          <LiveCard icon="🛵" label="Out for Delivery"     value={ls.deliveringCount} bg="bg-blue-50"    ring="ring-blue-200"   text="text-blue-600" />
          <LiveCard icon="🟢" label="Online Riders"        value={ls.onlineRiders}    bg="bg-green-50"   ring="ring-green-200"  text="text-green-600" />
        </div>

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            icon="💰" label="Today's Revenue"    color="text-emerald-600 bg-emerald-50"
            value={formatCurrency(kpi.todayRevenue)} trend={revTrend} />
          <KpiCard
            icon="📦" label="Orders Today"        color="text-blue-600 bg-blue-50"
            value={kpi.todayOrders} trend={ordTrend} />
          <KpiCard
            icon="🕐" label="Pending Orders"      color="text-yellow-600 bg-yellow-50"
            value={kpi.pendingOrders} sub="awaiting confirmation" />
          <KpiCard
            icon="🛵" label="Ongoing Deliveries"  color="text-orange-600 bg-orange-50"
            value={kpi.ongoingDeliveries} sub="out for delivery" />
          <KpiCard
            icon="🏪" label="Active Restaurants"  color="text-purple-600 bg-purple-50"
            value={`${kpi.activeRestaurants} / ${kpi.totalRestaurants}`} sub="currently open" />
        </div>

        {/* ── Charts row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Line chart: orders over time */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Orders Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cd} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip content={<ChartTip type="number" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="#f97316"
                  strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart: revenue overview */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Revenue Overview</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cd} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<ChartTip type="currency" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Bottom row: active orders table + top restaurants ────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Active orders table */}
          <div className="xl:col-span-2 card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Active Orders</h3>
              <Link to="/admin/orders" className="text-xs text-brand-500 hover:underline font-medium">
                View all →
              </Link>
            </div>

            {ao.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">📋</span>
                <p className="text-sm font-medium text-gray-500">No active orders right now</p>
                <p className="text-xs text-gray-400 mt-1">New orders will appear here automatically</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left font-medium">Order</th>
                      <th className="px-3 py-3 text-left font-medium">Customer</th>
                      <th className="px-3 py-3 text-left font-medium hidden md:table-cell">Restaurant</th>
                      <th className="px-3 py-3 text-center font-medium hidden lg:table-cell">Items</th>
                      <th className="px-3 py-3 text-left font-medium">Status</th>
                      <th className="px-3 py-3 text-left font-medium hidden md:table-cell">Time</th>
                      <th className="px-3 py-3 text-left font-medium hidden xl:table-cell">Rider</th>
                      <th className="px-3 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ao.map(o => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs font-semibold text-gray-700">
                            #{o.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-700 font-medium truncate max-w-[120px]">
                          {o.customerName}
                        </td>
                        <td className="px-3 py-3 text-gray-500 hidden md:table-cell truncate max-w-[130px]">
                          {o.restaurantName}
                        </td>
                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                            {o.itemCount}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusColor(o.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[o.status] ?? 'bg-gray-400'}`} />
                            {statusLabel(o.status) || o.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-400 text-xs hidden md:table-cell">
                          {fmtAgo(o.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs hidden xl:table-cell">
                          {o.riderName ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-800">
                          {formatCurrency(o.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top restaurants */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Top Restaurants</h3>
            {tr.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm">
                <span className="text-3xl mb-2">🏪</span>
                No data yet
              </div>
            ) : (
              <div className="space-y-3">
                {tr.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.orders} order{r.orders !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 shrink-0">{formatCurrency(r.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LiveCard({ icon, label, value, bg, ring, text }) {
  return (
    <div className={`card p-4 flex items-center gap-3 ring-1 ${ring} ${bg}`}>
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className={`text-2xl font-black leading-none ${text}`}>{value}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, color, value, trend, sub }) {
  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${color}`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {trend && (
        <p className={`text-xs mt-1 font-medium ${trend.up === true ? 'text-green-600' : trend.up === false ? 'text-red-500' : 'text-gray-400'}`}>
          {trend.up === true ? '▲' : trend.up === false ? '▼' : ''} {trend.label}
        </p>
      )}
      {sub && !trend && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
