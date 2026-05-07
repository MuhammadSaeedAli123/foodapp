import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const CartContext = createContext(null)

const CART_KEY = 'fd_cart'

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : { restaurantId: null, restaurantName: '', items: [] }
  } catch {
    return { restaurantId: null, restaurantName: '', items: [] }
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart)

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  const addItem = useCallback((item, restaurantId, restaurantName) => {
    setCart((prev) => {
      // If adding from a different restaurant, reset cart
      if (prev.restaurantId && prev.restaurantId !== restaurantId) {
        const confirmed = window.confirm(
          'Your cart has items from another restaurant. Start a new cart?'
        )
        if (!confirmed) return prev
        prev = { restaurantId: null, restaurantName: '', items: [] }
      }

      const existing = prev.items.find((i) => i.id === item.id)
      const items = existing
        ? prev.items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev.items, { ...item, quantity: 1 }]

      return { restaurantId, restaurantName, items }
    })
  }, [])

  const removeItem = useCallback((itemId) => {
    setCart((prev) => {
      const items = prev.items.filter((i) => i.id !== itemId)
      return { ...prev, items, ...(items.length === 0 && { restaurantId: null, restaurantName: '' }) }
    })
  }, [])

  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity < 1) return
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((i) => i.id === itemId ? { ...i, quantity } : i),
    }))
  }, [])

  const clearCart = useCallback(() => {
    setCart({ restaurantId: null, restaurantName: '', items: [] })
  }, [])

  const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0)

  const totalPrice = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{
      cart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
