export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export const formatDate = (dateString) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateString))

export const statusColor = (status) => {
  const map = {
    Pending:        'bg-yellow-100 text-yellow-700',
    Confirmed:      'bg-blue-100 text-blue-700',
    Preparing:      'bg-purple-100 text-purple-700',
    Ready:          'bg-teal-100 text-teal-700',
    OutForDelivery: 'bg-orange-100 text-orange-700',
    Delivered:      'bg-green-100 text-green-700',
    Cancelled:      'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

export const statusLabel = (status) => {
  const map = {
    OutForDelivery: 'Out for Delivery',
    Ready:          'Ready for Pickup',
    All:            'All',
  }
  return map[status] ?? status ?? ''
}

export const truncate = (str, n = 60) =>
  str && str.length > n ? str.slice(0, n) + '…' : str

// Returns true if current local time is within [openTime, closeTime] (both "HH:mm" 24-h).
// Handles midnight-crossing ranges. If either is absent → always open.
export function isOpenNow(openTime, closeTime) {
  if (!openTime || !closeTime) return true
  const now   = new Date()
  const nowM  = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = openTime.split(':').map(Number)
  const [ch, cm] = closeTime.split(':').map(Number)
  const openM  = oh * 60 + om
  const closeM = ch * 60 + cm
  return openM < closeM
    ? nowM >= openM && nowM < closeM    // same-day
    : nowM >= openM || nowM < closeM    // crosses midnight
}

// Format "HH:mm" → "9:00 AM"
export function fmt12(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
