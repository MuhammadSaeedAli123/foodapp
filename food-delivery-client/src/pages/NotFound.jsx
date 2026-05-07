import { Link } from 'react-router-dom'
import Navbar from '../components/common/Navbar'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="text-8xl font-black text-gray-100 mb-2">404</div>
        <div className="text-5xl mb-6">🍕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary">Back to Home</Link>
      </div>
    </div>
  )
}
