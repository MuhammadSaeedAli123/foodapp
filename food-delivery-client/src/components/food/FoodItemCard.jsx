import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/formatters'
import { toast } from '../common/Toast'

export default function FoodItemCard({ item, restaurantId, restaurantName, restaurantOpen = true }) {
  const { isAuthenticated, isRole } = useAuth()
  const { addItem, cart }           = useCart()

  const inCart = cart.items.find(i => i.id === item.id)?.quantity ?? 0

  const handleAdd = () => {
    if (!isAuthenticated)    { toast('Please login to add items', 'info');       return }
    if (!isRole('User'))     { toast('Only customers can order food', 'info');   return }
    if (!item.isAvailable)   { toast('This item is currently unavailable', 'warning'); return }
    if (!restaurantOpen)     { toast('This restaurant is currently closed', 'warning'); return }
    addItem(item, restaurantId, restaurantName)
    toast(`${item.name} added to cart`, 'success')
  }

  return (
    <div className={`card flex gap-4 p-5 min-h-[9rem] transition-all duration-300 ${
      !item.isAvailable ? 'opacity-60' : 'hover:shadow-md'
    }`}>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-2">
          <h4 className="font-semibold text-gray-900 flex-1">{item.name}</h4>
          {!item.isAvailable && (
            <span className="shrink-0 text-xs font-bold bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
              Out of Stock
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-gray-500 text-sm mt-3 line-clamp-2">{item.description}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3">
          <span className="text-brand-500 font-bold text-lg">{formatCurrency(item.price)}</span>

          {item.isAvailable ? (
            <button
              onClick={handleAdd}
              disabled={!restaurantOpen}
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
                restaurantOpen
                  ? 'bg-brand-500 hover:bg-brand-600 text-white active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {inCart > 0 ? `Add (${inCart})` : 'Add'}
            </button>
          ) : (
            <span className="text-xs text-gray-400 font-medium italic">Unavailable</span>
          )}
        </div>
      </div>

      {item.imageUrl && (
        <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden">
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          {!item.isAvailable && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
              <span className="text-white text-xs font-bold text-center leading-tight px-1">Sold Out</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
