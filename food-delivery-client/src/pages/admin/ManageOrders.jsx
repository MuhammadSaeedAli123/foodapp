import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import AdminLayout from '../../components/common/AdminLayout'
import Loader from '../../components/common/Loader'
import { ordersApi } from '../../api/orders'
import { getToken } from '../../utils/token'
import { formatCurrency, formatDate, statusColor, statusLabel } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

const STATUSES = ['Pending','Confirmed','Preparing','Ready','OutForDelivery','Delivered','Cancelled']

export default function ManageOrders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('All')
  const connectionRef         = useRef(null)

  useEffect(() => {
    ordersApi.getAll().then(setOrders).finally(() => setLoading(false))
  }, [])

  // ── Real-time SignalR ─────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    // New order → prepend to list
    connection.on('NewOrderReceived', (order) => {
      setOrders(prev => [order, ...prev])
      toast(`🆕 New order from ${order.customerName}!`, 'info')
    })

    // Status changed → update in place (no re-fetch)
    connection.on('OrderStatusUpdated', ({ order }) => {
      setOrders(prev => prev.map(o => o.id === order.id ? order : o))
    })

    // Status-specific admin alerts (Preparing, Ready)
    connection.on('AdminOrderAlert', ({ message, type }) => {
      toast(message, type)
    })

    connection.start().catch(console.error)
    connectionRef.current = connection
    return () => connection.stop()
  }, [])

  // ── Manual status change from dropdown ────────────────────────────────────
  const handleStatus = async (id, status) => {
    try {
      const updated = await ordersApi.updateStatus(id, status)
      // Update in place — SignalR will also fire, but this is instant feedback
      setOrders(prev => prev.map(o => o.id === id ? updated : o))
      toast('Status updated', 'success')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const filtered = filter === 'All' ? orders : orders.filter(o => o.status === filter)

  return (
    <AdminLayout title="Manage Orders">

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['All', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-brand-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }`}>
            {statusLabel(s)}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No orders found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">#{order.id.slice(0,8).toUpperCase()}</p>
                    <span className={`badge text-xs ${statusColor(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">👤 {order.customerName}  🏪 {order.restaurantName}</p>
                  <p className="text-sm text-gray-400 mt-0.5">📍 {order.deliveryAddress}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {order.items.map(i => `${i.foodItemName} ×${i.quantity}`).join(', ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-brand-500 mb-3">{formatCurrency(order.totalAmount)}</p>
                  {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                    <select
                      value={order.status}
                      onChange={e => handleStatus(order.id, e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400">
                      {STATUSES.map(s => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
