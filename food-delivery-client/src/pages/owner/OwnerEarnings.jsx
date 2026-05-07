import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import OwnerLayout from '../../components/common/OwnerLayout'
import { ownerApi } from '../../api/owner'
import { formatCurrency } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6']

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl border border-gray-700 min-w-[130px]">
      <p className="font-semibold text-gray-300 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="font-semibold ml-auto">{currency ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function OwnerEarnings() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [chartRange, setChartRange] = useState('7days')   // '7days' | 'monthly'

  useEffect(() => {
    ownerApi.getEarnings()
      .then(setData)
      .catch(() => toast('Failed to load earnings', 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <OwnerLayout title="Earnings">
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </OwnerLayout>
  )

  if (!data) return (
    <OwnerLayout title="Earnings">
      <div className="text-center py-20 text-gray-400">
        <p className="text-5xl mb-2">💰</p>
        <p className="text-sm">No earnings data yet</p>
      </div>
    </OwnerLayout>
  )

  const chartData     = chartRange === '7days' ? (data.last7Days ?? []) : (data.last30Days ?? [])
  const totalOrders   = data.totalOrders  ?? 0
  const avgOrderValue = data.avgOrderValue ?? 0

  const donutData = [
    { name: 'Today',      value: data.daily   ?? 0 },
    { name: 'This Week',  value: Math.max(0, (data.weekly  ?? 0) - (data.daily   ?? 0)) },
    { name: 'This Month', value: Math.max(0, (data.monthly ?? 0) - (data.weekly  ?? 0)) },
    { name: 'Older',      value: Math.max(0, (data.total   ?? 0) - (data.monthly ?? 0)) },
  ].filter(d => d.value > 0)

  return (
    <OwnerLayout title="Earnings">
      <div className="w-full space-y-6">

        {/* ── Summary KPI cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <EarnCard label="Today"      value={formatCurrency(data.daily   ?? 0)} icon="📅" color="purple" />
          <EarnCard label="This Week"  value={formatCurrency(data.weekly  ?? 0)} icon="📆" color="blue"   />
          <EarnCard label="This Month" value={formatCurrency(data.monthly ?? 0)} icon="🗓️" color="teal"   />
          <EarnCard label="All Time"   value={formatCurrency(data.total   ?? 0)} icon="💰" color="green"  />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <EarnCard label="Delivered Orders" value={totalOrders}                   icon="📦" color="orange" />
          <EarnCard label="Avg Order Value"  value={formatCurrency(avgOrderValue)} icon="📊" color="pink"   />
          <EarnCard label="Daily Average"    value={formatCurrency((data.weekly ?? 0) / 7)} icon="📈" color="indigo" />
          <EarnCard label="Monthly Goal"
            value={`${Math.min(100, Math.round(((data.monthly ?? 0) / Math.max(data.total ?? 1, 1)) * 100))}%`}
            icon="🎯" color="teal" />
        </div>

        {/* ── Period toggle ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Performance Period:</span>
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

        {/* ── Separate charts row ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

          {/* Orders chart */}
          <div className="card p-5" style={{ overflowX: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
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
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordGradE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} width={35} />
                    <Tooltip content={<CustomTooltip currency={false} />} />
                    <Area type="monotone" dataKey="orders" name="Orders"
                      stroke="#3b82f6" strokeWidth={2.5} fill="url(#ordGradE)"
                      dot={{ r: chartRange === 'monthly' ? 2 : 4, fill: '#3b82f6' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[230px] flex flex-col items-center justify-center text-gray-300">
                <p className="text-4xl mb-2">📦</p>
                <p className="text-sm text-gray-400">No orders data for this period</p>
              </div>
            )}
          </div>

          {/* Revenue chart */}
          <div className="card p-5" style={{ overflowX: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
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
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGradE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={50} />
                    <Tooltip content={<CustomTooltip currency={true} />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue"
                      stroke="#f97316" strokeWidth={2.5} fill="url(#revGradE)"
                      dot={{ r: chartRange === 'monthly' ? 2 : 4, fill: '#f97316' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[230px] flex flex-col items-center justify-center text-gray-300">
                <p className="text-4xl mb-2">💰</p>
                <p className="text-sm text-gray-400">No revenue data for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Revenue breakdown donut ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div className="lg:col-span-1 card p-5 flex flex-col">
            <h3 className="font-semibold text-gray-800 mb-5">Revenue Breakdown</h3>
            {donutData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value"
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {donutData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-gray-600 text-xs">{d.name}</span>
                      </div>
                      <span className="font-semibold text-xs text-gray-800">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                <p className="text-4xl mb-2">🍩</p>
                <p className="text-sm text-gray-400">No revenue yet</p>
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div className="lg:col-span-2 card p-5">
            <h3 className="font-semibold text-gray-800 mb-5">
              {chartRange === '7days' ? '7-Day' : '30-Day'} Summary
            </h3>
            {chartData.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <SummaryCard
                  label="Total Orders"
                  value={chartData.reduce((s, d) => s + (d.orders ?? 0), 0)}
                  icon="📦"
                  color="blue"
                />
                <SummaryCard
                  label="Total Revenue"
                  value={formatCurrency(chartData.reduce((s, d) => s + (d.revenue ?? 0), 0))}
                  icon="💰"
                  color="orange"
                />
                <SummaryCard
                  label="Peak Orders"
                  value={Math.max(...chartData.map(d => d.orders ?? 0))}
                  icon="📈"
                  color="green"
                />
                <SummaryCard
                  label="Peak Revenue"
                  value={formatCurrency(Math.max(...chartData.map(d => d.revenue ?? 0)))}
                  icon="🏆"
                  color="purple"
                />
                <SummaryCard
                  label="Avg Daily Orders"
                  value={Math.round(chartData.reduce((s, d) => s + (d.orders ?? 0), 0) / chartData.length)}
                  icon="📊"
                  color="teal"
                />
                <SummaryCard
                  label="Avg Daily Revenue"
                  value={formatCurrency(chartData.reduce((s, d) => s + (d.revenue ?? 0), 0) / chartData.length)}
                  icon="📉"
                  color="pink"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                <p className="text-4xl mb-2">📊</p>
                <p className="text-sm text-gray-400">No data for this period</p>
              </div>
            )}
          </div>
        </div>

        {totalOrders === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📊</p>
            <p className="text-sm">No delivered orders yet — earnings appear once orders complete.</p>
          </div>
        )}
      </div>
    </OwnerLayout>
  )
}

// ── EarnCard ──────────────────────────────────────────────────────────────────
const CARD_COLORS = {
  purple: 'bg-purple-50 text-purple-600',
  blue:   'bg-blue-50   text-blue-600',
  teal:   'bg-teal-50   text-teal-600',
  green:  'bg-green-50  text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  pink:   'bg-pink-50   text-pink-600',
  indigo: 'bg-indigo-50 text-indigo-600',
}

function EarnCard({ label, value, icon, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${CARD_COLORS[color] ?? CARD_COLORS.blue}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 leading-tight truncate">{value}</p>
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon, color }) {
  const cls = CARD_COLORS[color] ?? CARD_COLORS.blue
  return (
    <div className={`rounded-xl p-3 flex items-center gap-3 ${cls.split(' ')[0]}`}>
      <span className={`text-xl shrink-0 ${cls.split(' ')[1]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-tight truncate">{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
    </div>
  )
}
