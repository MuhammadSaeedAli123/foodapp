import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { adminApi } from '../../api/users'

const NAV = [
  { label: 'Dashboard',   path: '/admin',               icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { label: 'Restaurants', path: '/admin/restaurants',   icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )},
  { label: 'Orders',      path: '/admin/orders',        icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { label: 'Workers',     path: '/admin/workers',       icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { label: 'Riders',      path: '/admin/riders',        icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )},
  { label: 'Owners',      path: '/admin/owners',        icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { label: 'Restaurant Requests', path: '/admin/restaurant-requests', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )},
]

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [collapsed,     setCollapsed]     = useState(false)
  const [profileOpen,   setProfileOpen]   = useState(false)
  const [mobileOpen,    setMobileOpen]    = useState(false)
  const [pendingRiders,       setPendingRiders]       = useState(0)
  const [pendingRestaurants,  setPendingRestaurants]  = useState(0)
  const [bellOpen,            setBellOpen]            = useState(false)
  const profileRef = useRef(null)
  const bellRef    = useRef(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await adminApi.getNotifications()
      setPendingRiders(res?.pendingRiders ?? 0)
      setPendingRestaurants(res?.pendingRestaurants ?? 0)
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(id)
  }, [fetchNotifications])

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (bellRef.current    && !bellRef.current.contains(e.target))    setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sidebarW = collapsed ? 'w-16' : 'w-60'

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── Mobile overlay ─────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 text-gray-300 transition-all duration-200
        ${sidebarW}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex
      `}>
        {/* Logo */}
        <div className={`flex items-center border-b border-gray-800 h-16 shrink-0 ${collapsed ? 'justify-center px-2' : 'px-5 gap-3'}`}>
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-white whitespace-nowrap">
              FoodRush <span className="text-brand-400 text-xs font-normal">Admin</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active ? 'bg-brand-500 text-white' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}
                  ${collapsed ? 'justify-center' : ''}
                `}>
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User profile / logout */}
        <div className="border-t border-gray-800 p-3 relative" ref={profileRef}>
          {profileOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-white text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-gray-400 text-xs truncate">{user?.email}</p>
              </div>
              <button onClick={() => { logout(); navigate('/') }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors text-left">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
          <button onClick={() => setProfileOpen(p => !p)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
              <span className="text-brand-400 font-bold text-sm">{user?.fullName?.[0]}</span>
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white text-sm font-medium truncate">{user?.fullName}</p>
                  <p className="text-gray-500 text-xs truncate">Admin</p>
                </div>
                <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 h-16 flex items-center gap-4 px-4 md:px-6">
          {/* Hamburger (mobile) / Collapse (desktop) */}
          <button
            onClick={() => { if (window.innerWidth < 768) setMobileOpen(p => !p); else setCollapsed(p => !p) }}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-lg font-bold text-gray-900 truncate flex-1">{title}</h1>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative" ref={bellRef}>
              <button onClick={() => setBellOpen(p => !p)}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {(pendingRiders + pendingRestaurants) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {(pendingRiders + pendingRestaurants) > 99 ? '99+' : (pendingRiders + pendingRestaurants)}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="font-semibold text-gray-800 text-sm">Notifications</p>
                    {(pendingRiders + pendingRestaurants) > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                        {pendingRiders + pendingRestaurants} pending
                      </span>
                    )}
                  </div>
                  {(pendingRiders + pendingRestaurants) === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">No new notifications</div>
                  ) : (
                    <div>
                      {pendingRiders > 0 && (
                        <Link to="/admin/riders?tab=pending"
                          onClick={() => setBellOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-50">
                          <span className="text-xl mt-0.5">🛵</span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {pendingRiders} rider{pendingRiders !== 1 ? 's' : ''} awaiting approval
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">Click to review in Manage Riders</p>
                          </div>
                        </Link>
                      )}
                      {pendingRestaurants > 0 && (
                        <Link to="/admin/restaurant-requests"
                          onClick={() => setBellOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-orange-50 transition-colors">
                          <span className="text-xl mt-0.5">🏪</span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {pendingRestaurants} restaurant application{pendingRestaurants !== 1 ? 's' : ''} pending
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">Click to review in Restaurant Requests</p>
                          </div>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{user?.fullName?.[0]}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-none">{user?.fullName}</p>
                <p className="text-xs text-gray-400">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
