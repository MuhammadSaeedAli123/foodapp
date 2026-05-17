import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency } from '../../utils/formatters'
import * as signalR from '@microsoft/signalr'

const NAV = [
  { label: 'Dashboard',     path: '/owner',           icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Orders',        path: '/owner/orders',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { label: 'Menu',          path: '/owner/menu',      icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { label: 'Reviews',       path: '/owner/reviews',   icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { label: 'Earnings',      path: '/owner/earnings',  icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Kitchen Staff', path: '/owner/staff',     icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Kitchen Panel', path: '/kitchen',         icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
]

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function OwnerLayout({ children, title }) {
  const { user, token, logout } = useAuth()
  const location                = useLocation()
  const navigate                = useNavigate()

  const [menuOpen, setMenuOpen]   = useState(false)
  const [sideOpen, setSideOpen]   = useState(false)
  const [bellOpen, setBellOpen]   = useState(false)
  const [notifications, setNotifications] = useState([])
  const [popup, setPopup]         = useState(null)   // { order, timerId }

  const menuRef   = useRef(null)
  const bellRef   = useRef(null)
  const connRef   = useRef(null)
  const popupTimer = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // ── Popup helpers (must be defined before SignalR effect) ───────────────
  const showPopup = useCallback((data) => {
    clearTimeout(popupTimer.current)
    setPopup(data)
    popupTimer.current = setTimeout(() => setPopup(null), 7000)
  }, [])

  const dismissPopup = useCallback(() => {
    clearTimeout(popupTimer.current)
    setPopup(null)
  }, [])

  // ── SignalR connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build()

    conn.on('OwnerNewOrder', (order) => {
      const notif = {
        id:           order.id + '-' + Date.now(),
        type:         'order',
        orderId:      order.id,
        customerName: order.customerName,
        totalAmount:  order.totalAmount,
        message:      'New order received',
        time:         new Date().toISOString(),
        read:         false,
      }
      setNotifications(prev => [notif, ...prev].slice(0, 50))
      showPopup({ type: 'order', ...order })
    })

    conn.on('NewReviewReceived', (review) => {
      console.log('[SignalR] NewReviewReceived:', review)
      const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)
      const notif = {
        id:           'rev-' + Date.now(),
        type:         'review',
        reviewerName: review.reviewerName,
        rating:       review.rating,
        stars,
        message:      `New ${review.rating}★ review from ${review.reviewerName}`,
        time:         new Date().toISOString(),
        read:         false,
      }
      setNotifications(prev => [notif, ...prev].slice(0, 50))
      showPopup({ type: 'review', ...review, stars })
    })

    conn.start()
      .then(() => console.log('[SignalR] Owner hub connected'))
      .catch(err => console.error('[SignalR] Owner hub connection failed:', err))
    connRef.current = conn

    return () => { conn.stop() }
  }, [token, showPopup])

  // ── Notification actions ────────────────────────────────────────────────
  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const handleNotifClick = useCallback((notif) => {
    markRead(notif.id)
    setBellOpen(false)
    navigate(notif.type === 'review' ? '/owner/reviews' : '/owner/orders')
  }, [markRead, navigate])

  // ── Outside-click handlers ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const now     = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── Mobile sidebar overlay ──────────────────────────────────────────── */}
      {sideOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSideOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 md:z-auto
        w-64 bg-gray-900 text-gray-300 flex flex-col shrink-0
        transform transition-transform duration-200
        ${sideOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">FoodRush</p>
              <p className="text-brand-400 text-xs leading-tight">Owner Panel</p>
            </div>
          </Link>
          {user?.restaurantName && (
            <div className="mt-3 px-3 py-2 bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500 leading-tight">Restaurant</p>
              <p className="text-white text-sm font-medium truncate">{user.restaurantName}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-gray-800 relative" ref={menuRef}>
          {menuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-white text-sm font-semibold truncate">{user?.fullName}</p>
                <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">Restaurant Owner</span>
              </div>
              <Link to="/profile" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </Link>
              <button onClick={() => { logout(); navigate('/') }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors text-left">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
          <button onClick={() => setMenuOpen(v => !v)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-800 transition-colors">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
              <span className="text-brand-400 font-bold text-sm">{user?.fullName?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-white text-sm font-medium truncate leading-tight">{user?.fullName}</p>
              <p className="text-gray-500 text-xs truncate leading-tight">Restaurant Owner</p>
            </div>
            <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-4">
          {/* Mobile menu toggle */}
          <button onClick={() => setSideOpen(true)} className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
          </div>

          {/* Date + time */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{dateStr}</span>
            <span className="text-gray-300">·</span>
            <span>{timeStr}</span>
          </div>

          {/* ── Notification Bell ── */}
          <div className="relative shrink-0" ref={bellRef}>
            <button
              onClick={() => setBellOpen(v => !v)}
              className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* ── Dropdown ── */}
            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-2rem))] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="text-3xl mb-2">🔔</div>
                      <p className="text-sm text-gray-500">No notifications yet</p>
                      <p className="text-xs text-gray-400 mt-0.5">New orders will appear here</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                          !notif.read ? 'bg-brand-50/50' : ''
                        }`}
                      >
                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          notif.read ? 'bg-gray-100' : notif.type === 'review' ? 'bg-amber-100' : 'bg-brand-100'
                        }`}>
                          {notif.type === 'review' ? (
                            <span className={`text-sm ${notif.read ? 'text-gray-400' : 'text-amber-500'}`}>★</span>
                          ) : (
                            <svg className={`w-4 h-4 ${notif.read ? 'text-gray-400' : 'text-brand-500'}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-900">{notif.message}</p>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">
                            {notif.type === 'review'
                              ? notif.stars
                              : `#${notif.orderId.slice(0, 8).toUpperCase()} · ${notif.customerName}`}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(notif.time)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-gray-100">
                    <button
                      onClick={() => { setBellOpen(false); navigate('/owner/orders') }}
                      className="w-full text-xs text-center text-brand-500 hover:text-brand-600 font-medium transition-colors py-1"
                    >
                      View all orders →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-2 sm:px-3 py-1 rounded-full text-xs font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="hidden sm:inline">Live</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* ── Popup notification (bottom-right on desktop, bottom-sheet on mobile) ── */}
      {popup && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] animate-slide-up sm:bottom-6 sm:left-auto sm:right-6 sm:w-80">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-400" />

            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    popup.type === 'review' ? 'bg-amber-100' : 'bg-brand-100'
                  }`}>
                    {popup.type === 'review' ? (
                      <span className="text-xl text-amber-500">★</span>
                    ) : (
                      <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {popup.type === 'review' ? 'New Review!' : 'New Order Received!'}
                    </p>
                    <p className={`text-xs font-medium ${popup.type === 'review' ? 'text-amber-500' : 'text-brand-500'}`}>
                      {popup.type === 'review' ? popup.stars : `#${popup.id?.slice(0, 8).toUpperCase()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismissPopup}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                {popup.type === 'review' ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Reviewer</span>
                    <span className="text-xs font-semibold text-gray-900">{popup.reviewerName}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Customer</span>
                      <span className="text-xs font-semibold text-gray-900">{popup.customerName}</span>
                    </div>
                    {popup.totalAmount != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Total</span>
                        <span className="text-xs font-bold text-green-600">{formatCurrency(popup.totalAmount)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { dismissPopup(); navigate(popup.type === 'review' ? '/owner/reviews' : '/owner/orders') }}
                  className="flex-1 py-2 px-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  {popup.type === 'review' ? 'View Reviews' : 'View Order'}
                </button>
                <button
                  onClick={dismissPopup}
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Auto-dismiss progress bar */}
            <div className="h-0.5 bg-gray-100">
              <div className="h-full bg-brand-400 animate-shrink-width" style={{ animationDuration: '7s' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
