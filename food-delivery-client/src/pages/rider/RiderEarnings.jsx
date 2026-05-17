import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import RiderLayout from '../../components/common/RiderLayout'
import { riderApi }        from '../../api/rider'
import { formatCurrency }  from '../../utils/formatters'
import { toast }           from '../../components/common/Toast'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl border border-gray-700 min-w-[140px]">
      <p className="font-semibold text-gray-300 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="font-semibold ml-auto">
            {p.name === 'Orders' ? p.value : formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, icon, color }) {
  const colors = {
    green:  'bg-green-50  text-green-600',
    blue:   'bg-blue-50   text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    teal:   'bg-teal-50   text-teal-600',
    pink:   'bg-pink-50   text-pink-600',
  }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${colors[color] ?? colors.blue}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 leading-tight truncate">{value}</p>
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
      </div>
    </div>
  )
}

export default function RiderEarnings() {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [chartRange, setChartRange] = useState('7days')

  useEffect(() => {
    riderApi.getEarnings()
      .then(setData)
      .catch(() => toast('Failed to load earnings', 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <RiderLayout title="Earnings">
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </RiderLayout>
  )

  if (!data) return (
    <RiderLayout title="Earnings">
      <div className="text-center py-20 text-gray-400">
        <p className="text-5xl mb-2">💰</p>
        <p className="text-sm">No earnings data available</p>
      </div>
    </RiderLayout>
  )

  const chartData = chartRange === '7days' ? (data.last7Days ?? []) : (data.last30Days ?? [])

  return (
    <RiderLayout title="Earnings">
      <div className="w-full space-y-6">

        {/* ── KPI cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Today"        value={formatCurrency(data.daily   ?? 0)} icon="📅" color="green"  />
          <KpiCard label="This Week"    value={formatCurrency(data.weekly  ?? 0)} icon="📆" color="blue"   />
          <KpiCard label="This Month"   value={formatCurrency(data.monthly ?? 0)} icon="🗓️" color="purple" />
          <KpiCard label="All Time"     value={formatCurrency(data.total   ?? 0)} icon="💰" color="orange" />
          <KpiCard label="Total Orders" value={data.totalOrders ?? 0}             icon="📦" color="teal"   />
          <KpiCard label="Avg / Order"  value={formatCurrency(data.avgPerOrder ?? 0)} icon="📊" color="pink" />
        </div>

        {/* ── Period toggle ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Period:</span>
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
        </div>

        {/* ── Earnings chart ───────────────────────────────────────────────── */}
        <div className="card p-5" style={{ overflowX: 'auto' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-800">
                {chartRange === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Your earnings per day</p>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Earnings
            </div>
          </div>

          {chartData.length > 0 ? (
            <div style={{ width: chartRange === '7days' ? '100%' : Math.max(500, chartData.length * 45) }}>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riderEarnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${v}`} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="earnings" name="Earnings"
                    stroke="#10b981" strokeWidth={2.5} fill="url(#riderEarnGrad)"
                    dot={{ r: chartRange === 'monthly' ? 2 : 4, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[230px] flex flex-col items-center justify-center text-gray-300">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-sm text-gray-400">
                No deliveries in the {chartRange === '7days' ? 'last 7 days' : 'last 30 days'}
              </p>
            </div>
          )}
        </div>

        {/* ── Breakdown table ──────────────────────────────────────────────── */}
        {chartData.some(d => d.orders > 0) && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">
              {chartRange === '7days' ? '7-Day' : '30-Day'} Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-3 font-medium">Date</th>
                    <th className="text-right pb-3 font-medium">Orders</th>
                    <th className="text-right pb-3 font-medium">Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...chartData].reverse().map((d, i) => (
                    <tr key={i} className={d.orders === 0 ? 'opacity-40' : ''}>
                      <td className="py-2.5 font-medium text-gray-700">{d.date}</td>
                      <td className="py-2.5 text-right text-gray-600">{d.orders}</td>
                      <td className="py-2.5 text-right font-semibold text-green-600">
                        {formatCurrency(d.earnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(data.totalOrders ?? 0) === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🛵</p>
            <p className="text-sm">No deliveries yet — earnings appear once you complete orders.</p>
          </div>
        )}
      </div>
    </RiderLayout>
  )
}
