import { Link } from 'react-router-dom'
import { formatCurrency, fmt12 } from '../../utils/formatters'

export default function RestaurantCard({ restaurant }) {
  const open = restaurant.isOpen   // owner-managed flag from API

  return (
    <Link to={`/restaurants/${restaurant.id}`} className="card group hover:shadow-md transition-shadow duration-200">
      <div className="relative h-48 overflow-hidden">
        <img
          src={restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {!open && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <span className="bg-white text-gray-700 font-semibold px-3 py-1 rounded-full text-sm block">Closed</span>
              {restaurant.openTime && (
                <span className="text-white text-xs mt-1 block">Opens at {fmt12(restaurant.openTime)}</span>
              )}
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-white text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
            {restaurant.categoryName}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-brand-500 transition-colors">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <svg className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">{restaurant.rating?.toFixed(1) || '—'}</span>
          </div>
        </div>

        <p className="text-gray-500 text-sm mt-1 line-clamp-1">{restaurant.description}</p>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {restaurant.deliveryTime} min
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {formatCurrency(restaurant.deliveryFee)} delivery
          </span>
          <span className={`flex items-center gap-1 font-medium ml-auto ${open ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
            {open ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>
    </Link>
  )
}
