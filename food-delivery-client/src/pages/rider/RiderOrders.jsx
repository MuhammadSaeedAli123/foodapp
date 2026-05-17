import { useState, useEffect } from 'react'
import RiderLayout    from '../../components/common/RiderLayout'
import { riderApi }   from '../../api/rider'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { toast }      from '../../components/common/Toast'

const TABS = ['All', 'OutForDelivery', 'Delivered', 'Cancelled']
const TAB_LABEL = {
  All:             'All',
  OutForDelivery:  'In Progress',
  Delivered:       'Delivered',
  Cancelled:       'Cancelled',
}

const STATUS_STYLES = {
  OutForDelivery: 'bg-blue-100 text-blue-700',
  Delivered:      'bg-green-100 text-green-700',
  Cancelled:      'bg-red-100 text-red-700',
  default:        'bg-gray-100 text-gray-600',
}

export default function RiderOrders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('All')

  useEffect(() => {
    riderApi.getMyOrders()
      .then(setOrders)
      .catch(() => toast('Failed to load orders', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = tab === 'All' ? orders : orders.filter(o => o.status === tab)

  const countFor = (t) => t === 'All' ? orders.length : orders.filter(o => o.status === t).length

  const totalEarnings = orders
    .filter(o => o.status === 'Delivered')
    .reduce((sum, o) => sum + (o.riderEarnings ?? 0), 0)

  return (
    <RiderLayout title="My Orders">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total Deliveries</p>
          <p className="text-2xl font-bold text-brand-600">
            {orders.filter(o => o.status === 'Delivered').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEarnings)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">In Progress</p>
          <p className="text-2xl font-bold text-amber-600">
            {orders.filter(o => o.status === 'OutForDelivery').length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="scroll-x flex gap-2 mb-4 sm:mb-6 pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'bg-white text-gray-500 border border-gray-100 hover:border-brand-200'
            }`}
          >
            {TAB_LABEL[t]}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === t ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {countFor(t)}
            </span>
          </button>
        ))}
      </div>

      {/* Orders list — scrollable container */}
      <div className="orders-scroll overflow-y-auto rounded-2xl max-h-[52vh] md:max-h-[calc(100vh-310px)]">
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-base font-semibold text-gray-700">No orders found</p>
          <p className="text-sm text-gray-400 mt-1">
            {tab === 'All' ? "You haven't been assigned any orders yet." : `No ${TAB_LABEL[tab].toLowerCase()} orders.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3 pr-1">
          {filtered.map(order => (
            <div key={order.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      STATUS_STYLES[order.status] ?? STATUS_STYLES.default
                    }`}>
                      {order.status === 'OutForDelivery' ? 'In Progress' : order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">🏪 {order.restaurantName}</p>
                  <p className="text-sm text-gray-500 mt-0.5">👤 {order.customerName}</p>
                  <p className="text-sm text-gray-500 truncate">📍 {order.deliveryAddress}</p>
                </div>
                <div className="text-right shrink-0">
                  {order.riderEarnings != null ? (
                    <>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(order.riderEarnings)}</p>
                      <p className="text-xs text-gray-400">your earnings</p>
                    </>
                  ) : (
                    <p className="text-lg font-bold text-brand-500">{formatCurrency(order.totalAmount)}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
                </div>
              </div>

              {/* Commission breakdown */}
              {order.riderEarnings != null && (
                <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-3 text-xs">
                  <div>
                    <span className="text-gray-400 block">Order total</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-400 block">Commission</span>
                    <span className="font-semibold text-brand-600">{order.commissionPercentage ?? 0}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block">Your cut</span>
                    <span className="font-semibold text-green-600">{formatCurrency(order.riderEarnings)}</span>
                  </div>
                </div>
              )}

              {/* Items */}
              <p className="text-xs text-gray-400 border-t border-gray-50 pt-3">
                {order.items?.map(i => `${i.foodItemName} ×${i.quantity}`).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      )}
      </div>
    </RiderLayout>
  )
}
