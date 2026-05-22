import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/formatters'
import { toast } from '../common/Toast'

export default function FoodItemCard({ item, restaurantId, restaurantName, restaurantOpen = true }) {
  const { isAuthenticated, isRole }                    = useAuth()
  const { addItem, removeItem, updateQuantity, cart }  = useCart()

  const isVariant     = !!(item.hasVariants && item.variants?.length > 0)

  const [selectedSize, setSelectedSize] = useState(null)

  const activeVariant = isVariant ? item.variants?.find(v => v.size === selectedSize) : null
  const cartId        = isVariant && selectedSize ? `${item.id}_${selectedSize}` : item.id

  const inCart = cart.items.find(i => i.id === cartId)?.quantity ?? 0

  const handleAdd = () => {
    if (!isAuthenticated)             { toast('Please login to add items', 'info');               return }
    if (!isRole('User'))              { toast('Only customers can order food', 'info');           return }
    if (!item.isAvailable)            { toast('This item is currently unavailable', 'warning');   return }
    if (!restaurantOpen)              { toast('This restaurant is currently closed', 'warning');  return }
    if (isVariant && !selectedSize)   { toast('Please select a size first', 'info');              return }

    const cartItem = isVariant && activeVariant
      ? { ...item, id: cartId, price: activeVariant.price, selectedSize, name: `${item.name} (${selectedSize})` }
      : item

    addItem(cartItem, restaurantId, restaurantName)
    toast(`${item.name}${selectedSize ? ` (${selectedSize})` : ''} added to cart`, 'success')
  }

  const handleDecrease = () => {
    if (inCart === 1) {
      removeItem(cartId)
      toast(`${item.name}${selectedSize ? ` (${selectedSize})` : ''} removed from cart`, 'info')
    } else {
      updateQuantity(cartId, inCart - 1)
    }
  }

  return (
    <div className={`card flex gap-4 p-5 min-h-[10rem] transition-all duration-300 ${
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
          {/* Left: price + inline size pills */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-brand-500 font-bold text-lg shrink-0">
              {activeVariant ? formatCurrency(activeVariant.price) : formatCurrency(item.price)}
            </span>
            {isVariant && item.isAvailable && (
              <div className="flex items-center gap-1">
                {item.variants.map(v => (
                  <button
                    key={v.size}
                    disabled={!v.isAvailable}
                    onClick={() => setSelectedSize(v.size)}
                    className={`w-6 h-6 text-[10px] font-bold rounded-md border transition-all shrink-0 ${
                      !v.isAvailable
                        ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                        : selectedSize === v.size
                          ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                          : 'border-gray-200 text-gray-500 hover:border-brand-400 hover:bg-orange-50'
                    }`}
                  >
                    {v.size[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {item.isAvailable ? (
            inCart > 0 ? (
              <div className="flex items-center rounded-lg overflow-hidden border border-brand-200 bg-brand-50">
                <button
                  onClick={handleDecrease}
                  className="w-8 h-8 flex items-center justify-center text-brand-600 hover:bg-brand-100 active:bg-brand-200 transition-colors text-lg font-bold leading-none"
                  aria-label="Remove one"
                >
                  −
                </button>
                <span className="w-7 text-center text-sm font-bold text-brand-700 select-none">
                  {inCart}
                </span>
                <button
                  onClick={handleAdd}
                  disabled={!restaurantOpen}
                  className="w-8 h-8 flex items-center justify-center text-brand-600 hover:bg-brand-100 active:bg-brand-200 transition-colors text-lg font-bold leading-none disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Add one more"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={!restaurantOpen}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  !restaurantOpen
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isVariant && !selectedSize
                      ? 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-brand-500'
                      : 'bg-brand-500 hover:bg-brand-600 text-white active:scale-95'
                }`}
              >
                {isVariant && !selectedSize ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    Size
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </>
                )}
              </button>
            )
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
