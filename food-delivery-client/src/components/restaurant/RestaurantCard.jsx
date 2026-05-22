import { Link } from 'react-router-dom'
import { formatCurrency, fmt12 } from '../../utils/formatters'

export default function RestaurantCard({ restaurant }) {
  const open = restaurant.isOpen

  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-gray-100 shrink-0">
        <img
          src={restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Closed overlay */}
        {!open && (
          <div className="absolute inset-0 bg-gray-900/65 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5">
            <div className="bg-white/90 backdrop-blur-sm text-gray-800 font-bold px-4 py-1.5 rounded-full text-sm">
              Currently Closed
            </div>
            {restaurant.openTime && (
              <p className="text-white/80 text-xs font-medium">
                Opens at {fmt12(restaurant.openTime)}
              </p>
            )}
          </div>
        )}

        {/* Category badge — top left */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {restaurant.categoryName}
          </span>
        </div>

        {/* Open / Closed badge — top right */}
        <div className="absolute top-3 right-3">
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${
            open ? 'bg-green-500/90 text-white' : 'bg-gray-800/70 text-white/80'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
            {open ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-brand-500 transition-colors line-clamp-2">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg shrink-0">
            <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-bold text-amber-700">{restaurant.rating?.toFixed(1) || '—'}</span>
          </div>
        </div>

        {restaurant.description && (
          <p className="text-gray-400 text-xs line-clamp-1 mb-3">{restaurant.description}</p>
        )}

        <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-50 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{restaurant.deliveryTime} min</span>
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {restaurant.deliveryFee > 0
              ? <span>{formatCurrency(restaurant.deliveryFee)} delivery</span>
              : <span className="text-green-600 font-semibold">Free delivery</span>
            }
          </span>
        </div>
      </div>
    </Link>
  )
}
