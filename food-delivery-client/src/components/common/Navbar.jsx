import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

export default function Navbar() {
  const { user, isAuthenticated, logout, isRole } = useAuth()
  const { totalItems } = useCart()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const dashboardLink = () => {
    if (isRole('Admin'))           return '/admin'
    if (isRole('Rider'))           return '/rider'
    if (isRole('Worker'))          return '/kitchen'
    if (isRole('KitchenStaff'))    return '/kitchen'
    if (isRole('RestaurantOwner')) return '/owner'
    return '/my-orders'
  }

  return (
    <nav className={`sticky top-0 z-40 bg-white border-b border-gray-100 transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-md shadow-brand-500/30 group-hover:scale-105 transition-transform duration-200">
              <span className="text-white font-extrabold text-base">F</span>
            </div>
            <span className="text-xl font-extrabold text-gray-900 tracking-tight">
              Food<span className="text-brand-500">Rush</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/"
              className="text-sm font-medium text-gray-600 hover:text-brand-500 hover:bg-orange-50 px-3 py-2 rounded-lg transition-all duration-200">
              Restaurants
            </Link>

            {isAuthenticated && (
              <Link to={dashboardLink()}
                className="text-sm font-medium text-gray-600 hover:text-brand-500 hover:bg-orange-50 px-3 py-2 rounded-lg transition-all duration-200">
                {isRole('Admin')           ? 'Admin Panel'
                  : isRole('Rider')        ? 'Rider Panel'
                  : isRole('Worker')       ? 'Kitchen'
                  : isRole('KitchenStaff') ? 'Kitchen'
                  : isRole('RestaurantOwner') ? 'My Restaurant'
                  : 'My Orders'}
              </Link>
            )}

            {isRole('User') && (
              <Link to="/cart" className="relative p-2.5 text-gray-500 hover:text-brand-500 hover:bg-orange-50 rounded-lg transition-all duration-200 ml-1">
                <CartIcon />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-sm">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            )}

            <div className="w-px h-5 bg-gray-200 mx-2" />

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-orange-50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">
                      {user?.fullName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden lg:block">{user?.fullName?.split(' ')[0]}</span>
                  <ChevronDown />
                </button>
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-brand-500 transition-colors">
                    <span>👤</span> Profile
                  </Link>
                  {isRole('User') && (
                    <Link to="/my-orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-brand-500 transition-colors">
                      <span>📦</span> My Orders
                    </Link>
                  )}
                  <hr className="my-1.5 border-gray-100 mx-3" />
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <span>🚪</span> Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-brand-500 px-3 py-2 rounded-lg transition-all hover:bg-orange-50">
                  Login
                </Link>
                <Link to="/register" className="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-xl shadow-md shadow-brand-500/25 transition-all hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0">
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>

          {/* Mobile right side */}
          <div className="flex md:hidden items-center gap-3">
            {isRole('User') && (
              <Link to="/cart" className="relative p-2 text-gray-600">
                <CartIcon />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-600">
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-3 animate-fade-in">
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700 py-2">Restaurants</Link>
          {isAuthenticated ? (
            <>
              <Link to={dashboardLink()} onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700 py-2">
                {isRole('Admin')           ? 'Admin Panel'
                  : isRole('Rider')        ? 'Rider Panel'
                  : isRole('Worker')       ? 'Kitchen'
                  : isRole('KitchenStaff') ? 'Kitchen'
                  : isRole('RestaurantOwner') ? 'My Restaurant'
                  : 'My Orders'}
              </Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700 py-2">Profile</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="text-left text-sm font-medium text-red-500 py-2">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700 py-2">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm text-center">Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

const CartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const ChevronDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)
