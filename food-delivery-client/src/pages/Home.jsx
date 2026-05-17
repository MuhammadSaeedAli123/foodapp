import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import RestaurantCard from '../components/restaurant/RestaurantCard'
import SearchBar from '../components/common/SearchBar'
import { RestaurantCardSkeleton } from '../components/common/Skeleton'
import { restaurantsApi } from '../api/restaurants'

export default function Home() {
  const [restaurants, setRestaurants]       = useState([])
  const [categories, setCategories]         = useState([])
  const [loading, setLoading]               = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const connectionRef                       = useRef(null)

  useEffect(() => {
    restaurantsApi.getCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    restaurantsApi.getAll('', activeCategory)
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false))
  }, [activeCategory])

  // ── Real-time: restaurant open/close updates ──────────────────────────────
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders')            // no token — anonymous connection
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('RestaurantStatusChanged', ({ restaurantId, isOpen }) => {
      setRestaurants(prev =>
        prev.map(r => r.id === restaurantId ? { ...r, isOpen } : r)
      )
    })

    conn.start()
      .then(() => conn.invoke('WatchAllRestaurants').catch(() => {}))
      .catch(() => {})

    connectionRef.current = conn
    return () => {
      conn.invoke('UnwatchAllRestaurants').catch(() => {})
      conn.stop()
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-brand-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-3 sm:mb-4">
              Hungry? <br />We've got you covered.
            </h1>
            <p className="text-orange-100 text-base sm:text-lg mb-6 sm:mb-8">
              Order from the best local restaurants and get it delivered in minutes.
            </p>
            <SearchBar placeholder="Search restaurants, dishes, or cuisines…" />
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* ── Category pills ───────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <section className="mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Browse by Category</h2>
            {/* Negative margin lets the scroll area extend edge-to-edge on mobile */}
            <div className="scroll-x flex gap-2 sm:gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={() => setActiveCategory(null)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  !activeCategory
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {cat.imageUrl && (
                    <img src={cat.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                  )}
                  {cat.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Results header ───────────────────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {activeCategory
                  ? (categories.find(c => c.id === activeCategory)?.name ?? 'Restaurants')
                  : 'All Restaurants'}
              </h2>
              {restaurants.length > 0 && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {restaurants.filter(r => r.isOpen).length} open now · {restaurants.length} total
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Restaurant grid ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-700">No restaurants found</h3>
            <p className="text-gray-400 mt-2">Try a different category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {[...restaurants]
              .sort((a, b) => (b.isOpen ? 1 : 0) - (a.isOpen ? 1 : 0))
              .map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
