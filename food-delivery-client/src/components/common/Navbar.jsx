import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

export default function Navbar() {
  const { user, isAuthenticated, logout, isRole } = useAuth()
  const { totalItems } = useCart()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

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
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Food<span className="text-brand-500">Rush</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-brand-500 transition-colors">
              Restaurants
            </Link>

            {isAuthenticated && (
              <Link to={dashboardLink()} className="text-sm font-medium text-gray-600 hover:text-brand-500 transition-colors">
                {isRole('Admin')           ? 'Admin Panel'
                  : isRole('Rider')        ? 'Rider Panel'
                  : isRole('Worker')       ? 'Kitchen'
                  : isRole('KitchenStaff') ? 'Kitchen'
                  : isRole('RestaurantOwner') ? 'My Restaurant'
                  : 'My Orders'}
              </Link>
            )}

            {isRole('User') && (
              <Link to="/cart" className="relative p-2 text-gray-600 hover:text-brand-500 transition-colors">
                <CartIcon />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-500 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <span className="text-brand-600 font-semibold text-sm">
                      {user?.fullName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden lg:block">{user?.fullName?.split(' ')[0]}</span>
                  <ChevronDown />
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-500">
                    Profile
                  </Link>
                  {isRole('User') && (
                    <Link to="/my-orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-500">
                      My Orders
                    </Link>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-brand-500 transition-colors">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                  Sign Up
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
