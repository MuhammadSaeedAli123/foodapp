import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import OwnerLayout from '../../components/common/OwnerLayout'
import { ownerApi } from '../../api/owner'
import { getToken } from '../../utils/token'
import { formatCurrency, formatDate, statusColor, statusLabel } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

const TABS = [
  { key: 'All',       label: 'All',       color: '' },
  { key: 'Pending',   label: 'Pending',   color: 'text-yellow-700' },
  { key: 'Confirmed', label: 'Confirmed', color: 'text-blue-700'   },
  { key: 'Preparing', label: 'Preparing', color: 'text-purple-700' },
  { key: 'Ready',     label: 'Ready',     color: 'text-teal-700'   },
  { key: 'Delivered', label: 'Delivered', color: 'text-green-700'  },
  { key: 'Cancelled', label: 'Cancelled', color: 'text-red-600'    },
]

const NEXT_STATUS = {
  Pending:   { status: 'Confirmed', label: 'Confirm',       color: 'bg-blue-600 hover:bg-blue-700'     },
  Confirmed: { status: 'Preparing', label: 'Start Prep',    color: 'bg-purple-600 hover:bg-purple-700' },
  Preparing: { status: 'Ready',     label: 'Mark Ready',    color: 'bg-teal-600 hover:bg-teal-700'     },
}

const STATUS_ICON = {
  Pending: '🔔', Confirmed: '✅', Preparing: '🍳',
  Ready: '📦', OutForDelivery: '🛵', Delivered: '✔️', Cancelled: '❌',
}

export default function OwnerOrders() {
  const [orders, setOrders]     = useState([])
  const [tab, setTab]           = useState('All')
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [live, setLive]         = useState(false)
  const [newPulse, setNewPulse] = useState(false)
  const connectionRef           = useRef(null)

  const load = (status) =>
    ownerApi.getOrders(status)
      .then(setOrders)
      .catch(() => toast('Failed to load orders', 'error'))
      .finally(() => setLoading(false))

  useEffect(() => { load('All') }, [])

  const handleTabChange = (key) => {
    setTab(key)
    setLoading(true)
    load(key)
  }

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
      setOrders(prev => prev.some(o => o.id === order.id) ? prev : [order, ...prev])
      setNewPulse(true)
      setTimeout(() => setNewPulse(false), 4000)
      toast(`🔔 New order from ${order.customerName}!`, 'info')
    })

    conn.on('OwnerOrderStatusUpdated', ({ order }) => {
      if (!order) return
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...order } : o))
      if (selected?.id === order.id) setSelected(prev => prev ? { ...prev, ...order } : prev)
    })

    conn.start().then(() => setLive(true)).catch(console.error)
    conn.onreconnected(() => setLive(true))
    conn.onclose(() => setLive(false))

    connectionRef.current = conn
    return () => conn.stop()
  }, [])  // eslint-disable-line

  const handleStatus = async (orderId, newStatus) => {
    try {
      const updated = await ownerApi.updateOrderStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status } : o))
      if (selected?.id === orderId)
        setSelected(prev => prev ? { ...prev, status: updated.status } : prev)
      toast(`Order marked as ${newStatus}`, 'success')
    } catch (err) {
      toast(err.message || 'Failed to update status', 'error')
    }
  }

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return
    await handleStatus(orderId, 'Cancelled')
  }

  const displayed = tab === 'All' ? orders : orders.filter(o => o.status === tab)
  const countFor  = (key) => key === 'All' ? orders.length : orders.filter(o => o.status === key).length

  // KPI computations
  const activeCount  = orders.filter(o => ['Pending', 'Confirmed', 'Preparing', 'Ready'].includes(o.status)).length
  const todayCount   = orders.filter(o => {
    const d = new Date(o.createdAt)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length
  const todayRevenue = orders.filter(o => {
    const d = new Date(o.createdAt)
    return d.toDateString() === new Date().toDateString() && o.status === 'Delivered'
  }).reduce((s, o) => s + o.totalAmount, 0)
  const pendingCount = orders.filter(o => o.status === 'Pending').length

  return (
    <OwnerLayout title="Order Management">
      <div className="w-full space-y-5">

        {/* ── KPI bar ────────────────────────────────────────────────────── */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ${newPulse ? 'ring-2 ring-amber-300 rounded-2xl' : ''}`}>
          <KpiCard
            icon="🔔"
            label="Awaiting Action"
            value={pendingCount}
            color="yellow"
            pulse={newPulse && pendingCount > 0}
          />
          <KpiCard icon="🍳" label="Active Orders" value={activeCount}           color="orange" />
          <KpiCard icon="📅" label="Today's Orders" value={todayCount}           color="blue" />
          <KpiCard icon="💰" label="Today's Revenue" value={formatCurrency(todayRevenue)} color="green" />
        </div>

        {/* ── Live indicator + total ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            live
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {live ? 'Live — new orders appear instantly' : 'Connecting…'}
          </div>
          {newPulse && (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-semibold animate-pulse">
              🔔 New order received!
            </span>
          )}
          <span className="text-sm text-gray-400 ml-auto">{orders.length} total order{orders.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="flex gap-1 flex-wrap bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-white shadow-sm text-gray-900'
                  : `text-gray-500 hover:text-gray-700 ${t.color}`
              }`}>
              <span>{STATUS_ICON[t.key] ?? '📋'}</span>
              {t.label}
              {countFor(t.key) > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center ${
                  tab === t.key
                    ? t.key === 'Pending' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-brand-100 text-brand-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {countFor(t.key)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Order list ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">📋</p>
            <p className="text-base font-medium text-gray-500">No {tab !== 'All' ? tab.toLowerCase() : ''} orders</p>
            <p className="text-sm mt-1">Orders will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-2 w-full">
            {displayed.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                onSelect={() => setSelected(order)}
                onStatus={handleStatus}
                onCancel={handleCancel}
                isNew={newPulse && displayed[0]?.id === order.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Order detail drawer ──────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Order #{selected.id.slice(0, 8).toUpperCase()}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusColor(selected.status)}`}>
                  {STATUS_ICON[selected.status]} {statusLabel(selected.status) || selected.status}
                </span>
              </div>

              <InfoSection title="Customer">
                <p className="text-sm text-gray-800 font-medium">{selected.customerName}</p>
                {selected.customerPhone && <p className="text-xs text-gray-500 mt-0.5">📞 {selected.customerPhone}</p>}
                <p className="text-xs text-gray-500 mt-0.5">📍 {selected.deliveryAddress}</p>
              </InfoSection>

              <InfoSection title="Items">
                <div className="space-y-2">
                  {selected.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                      <span className="font-medium text-gray-900">{formatCurrency(item.subTotal)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-brand-500">{formatCurrency(selected.totalAmount)}</span>
                  </div>
                </div>
              </InfoSection>

              {selected.notes && (
                <InfoSection title="Special Instructions">
                  <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2">
                    📝 {selected.notes}
                  </p>
                </InfoSection>
              )}

              <div className="space-y-2 pt-1">
                {NEXT_STATUS[selected.status] && (
                  <button
                    onClick={() => { handleStatus(selected.id, NEXT_STATUS[selected.status].status); setSelected(null) }}
                    className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors ${NEXT_STATUS[selected.status].color}`}>
                    {NEXT_STATUS[selected.status].label}
                  </button>
                )}
                {!['Delivered', 'Cancelled', 'Ready', 'OutForDelivery'].includes(selected.status) && (
                  <button onClick={() => { handleCancel(selected.id); setSelected(null) }}
                    className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}

// ── Order row ─────────────────────────────────────────────────────────────────
function OrderRow({ order, onSelect, onStatus, onCancel, isNew }) {
  const [busy, setBusy] = useState(false)
  const next = NEXT_STATUS[order.status]
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)

  const handleNext = async (e) => {
    e.stopPropagation()
    setBusy(true)
    await onStatus(order.id, next.status)
    setBusy(false)
  }

  return (
    <div onClick={onSelect}
      className={`card w-full px-4 py-3.5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group ${
        isNew ? 'ring-2 ring-amber-300 bg-amber-50' : ''
      }`}>

      {/* Status icon */}
      <span className="text-xl shrink-0">{STATUS_ICON[order.status] ?? '📦'}</span>

      {/* ID + time */}
      <div className="shrink-0 w-28 hidden sm:block">
        <p className="text-xs font-bold text-gray-700 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
        <p className="text-xs text-gray-400 mt-0.5">{elapsed < 60 ? `${elapsed}m ago` : formatDate(order.createdAt)}</p>
      </div>

      {/* Customer + address */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{order.customerName}</p>
        <p className="text-xs text-gray-400 truncate">
          {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
          {order.deliveryAddress && <> · {order.deliveryAddress}</>}
        </p>
      </div>

      {/* Amount + status */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.status)}`}>
          {statusLabel(order.status) || order.status}
        </span>
      </div>

      {/* Advance button */}
      {next ? (
        <button onClick={handleNext} disabled={busy}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50 ${next.color}`}>
          {busy ? '…' : next.label}
        </button>
      ) : (
        <div className="shrink-0 w-20" />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color, pulse }) {
  const COLOR = {
    yellow: 'bg-yellow-50 text-yellow-600',
    orange: 'bg-orange-50 text-orange-600',
    blue:   'bg-blue-50   text-blue-600',
    green:  'bg-green-50  text-green-600',
  }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${COLOR[color] ?? COLOR.blue}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold leading-tight ${pulse ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
        {pulse && <p className="text-xs text-amber-500 font-medium animate-pulse">Action needed</p>}
      </div>
    </div>
  )
}

function InfoSection({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h4>
      {children}
    </div>
  )
}
