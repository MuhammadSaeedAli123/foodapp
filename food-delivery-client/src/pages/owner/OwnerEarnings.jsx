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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl border border-gray-700 min-w-[150px]">
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

export default function OwnerEarnings() {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [chartRange, setChartRange] = useState('7days')
  const [commission, setCommission] = useState('')
  const [saving, setSaving]         = useState(false)

  const load = () => {
    ownerApi.getEarnings()
      .then(d => {
        setData(d)
        setCommission(String(d.commissionPercentage ?? 0))
      })
      .catch(() => toast('Failed to load earnings', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSaveCommission = async () => {
    const pct = parseFloat(commission)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast('Commission must be between 0 and 100', 'error')
      return
    }
    setSaving(true)
    try {
      await ownerApi.updateCommission(pct)
      toast('Commission updated successfully', 'success')
      load()
    } catch {
      toast('Failed to update commission', 'error')
    } finally {
      setSaving(false)
    }
  }

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

  const chartData   = chartRange === '7days' ? (data.last7Days ?? []) : (data.last30Days ?? [])
  const totalOrders = data.totalOrders  ?? 0
  const avg         = data.avgOrderValue ?? 0

  // Net = restaurant net after rider commission
  // Gross = full order value
  // Rider = rider payout
  const net   = data.total              ?? 0
  const gross = data.totalGross         ?? 0
  const rider = data.totalRiderPayouts  ?? 0
  const pct   = data.commissionPercentage ?? 0

  const donutData = [
    { name: 'Restaurant Net', value: net },
    { name: 'Rider Payouts',  value: rider },
  ].filter(d => d.value > 0)

  return (
    <OwnerLayout title="Earnings">
      <div className="w-full space-y-6">

        {/* ── Commission setting ───────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-sm">Rider Commission Rate</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Percentage of each order total paid to the rider on delivery.
                Currently <span className="font-semibold text-brand-600">{pct}%</span>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={commission}
                  onChange={e => setCommission(e.target.value)}
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-center pr-7 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
              </div>
              <button
                onClick={handleSaveCommission}
                disabled={saving}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Top-line KPI cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <EarnCard label="Today (Net)"   value={formatCurrency(data.daily   ?? 0)} icon="📅" color="purple" />
          <EarnCard label="This Week"     value={formatCurrency(data.weekly  ?? 0)} icon="📆" color="blue"   />
          <EarnCard label="This Month"    value={formatCurrency(data.monthly ?? 0)} icon="🗓️" color="teal"  />
          <EarnCard label="Net All Time"  value={formatCurrency(net)}               icon="💰" color="green"  />
        </div>

        {/* ── Commission breakdown row ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <EarnCard label="Gross Revenue"   value={formatCurrency(gross)}      icon="📈" color="orange" />
          <EarnCard label="Rider Payouts"   value={formatCurrency(rider)}      icon="🛵" color="pink"   />
          <EarnCard label="Delivered Orders" value={totalOrders}               icon="📦" color="indigo" />
          <EarnCard label="Avg Order Value" value={formatCurrency(avg)}        icon="📊" color="teal"   />
        </div>

        {/* ── Period toggle ─────────────────────────────────────────────────── */}
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
        </div>

        {/* ── Charts row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Revenue chart (net vs gross) */}
          <div className="card p-5" style={{ overflowX: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-800">Revenue</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {chartRange === '7days' ? 'Last 7 days' : 'Last 30 days'}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> Net
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-gray-400" /> Gross
                </span>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div style={{ width: chartRange === '7days' ? '100%' : Math.max(500, chartData.length * 55) }}>
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#9ca3af" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${v}`} width={52} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="grossRevenue" name="Gross"
                      stroke="#9ca3af" strokeWidth={1.5} fill="url(#grossGrad)" strokeDasharray="4 2"
                      dot={false} />
                    <Area type="monotone" dataKey="revenue" name="Net"
                      stroke="#f97316" strokeWidth={2.5} fill="url(#netGrad)"
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
                    <Tooltip content={<CustomTooltip />} />
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
        </div>

        {/* ── Earnings split + summary ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Donut: net vs rider */}
          <div className="card p-5 flex flex-col">
            <h3 className="font-semibold text-gray-800 mb-1">Revenue Split</h3>
            <p className="text-xs text-gray-400 mb-4">All-time net vs rider payouts</p>
            {donutData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%"
                      innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={['#f97316', '#3b82f6'][i % 2]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {donutData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: ['#f97316', '#3b82f6'][i % 2] }} />
                        <span className="text-gray-600 text-xs">{d.name}</span>
                      </div>
                      <span className="font-semibold text-xs text-gray-800">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                  {gross > 0 && (
                    <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-2 mt-1">
                      <span className="text-gray-400 text-xs">Commission rate</span>
                      <span className="font-bold text-xs text-brand-600">{pct}%</span>
                    </div>
                  )}
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
                <SummaryCard label="Total Orders"    value={chartData.reduce((s, d) => s + (d.orders ?? 0), 0)} icon="📦" color="blue" />
                <SummaryCard label="Net Revenue"     value={formatCurrency(chartData.reduce((s, d) => s + (d.revenue ?? 0), 0))} icon="💰" color="orange" />
                <SummaryCard label="Gross Revenue"   value={formatCurrency(chartData.reduce((s, d) => s + (d.grossRevenue ?? 0), 0))} icon="📈" color="gray" />
                <SummaryCard label="Rider Payouts"   value={formatCurrency(chartData.reduce((s, d) => s + (d.riderPayouts ?? 0), 0))} icon="🛵" color="blue" />
                <SummaryCard label="Peak Net Day"    value={formatCurrency(Math.max(...chartData.map(d => d.revenue ?? 0)))} icon="🏆" color="purple" />
                <SummaryCard label="Avg Daily Net"   value={formatCurrency(chartData.reduce((s, d) => s + (d.revenue ?? 0), 0) / chartData.length)} icon="📊" color="teal" />
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

// ── Sub-components ──────────────────────────────────────────────────────────────

const CARD_COLORS = {
  purple: 'bg-purple-50 text-purple-600',
  blue:   'bg-blue-50   text-blue-600',
  teal:   'bg-teal-50   text-teal-600',
  green:  'bg-green-50  text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  pink:   'bg-pink-50   text-pink-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  gray:   'bg-gray-100  text-gray-600',
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
