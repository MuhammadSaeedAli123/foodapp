import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold text-white">Food<span className="text-brand-500">Rush</span></span>
            </div>
            <p className="text-sm leading-relaxed">
              Fast, fresh, and delivered to your door. Order from the best restaurants in your city.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/my-orders" className="hover:text-white transition-colors">My Orders</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">Profile</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Join Us</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-white transition-colors">Sign Up as Customer</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Register Your Restaurant</a></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Become a Rider</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-xs">
          © {new Date().getFullYear()} FoodRush. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
