import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import RestaurantCard from '../components/restaurant/RestaurantCard'
import { RestaurantCardSkeleton } from '../components/common/Skeleton'
import { restaurantsApi } from '../api/restaurants'
import SearchBar from '../components/common/SearchBar'

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1600&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1600&q=80',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1600&q=80',
]

export default function Home() {
  const [restaurants, setRestaurants]       = useState([])
  const [categories, setCategories]         = useState([])
  const [loading, setLoading]               = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [currentSlide, setCurrentSlide]     = useState(0)
  const connectionRef                       = useRef(null)

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(i => (i + 1) % HERO_IMAGES.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

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

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders')
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-gray-900 text-white min-h-[580px] flex items-center">

        {/* ── Slideshow background ──────────────────────────────────────── */}
        <div className="absolute inset-0">
          {HERO_IMAGES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                i === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          {/* Gradient overlay — dark on left for text, lighter on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        {/* ── Slide indicators ─────────────────────────────────────────── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? 'w-7 h-2.5 bg-brand-400'
                  : 'w-2.5 h-2.5 bg-white/35 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="relative w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div>

            {/* LEFT: copy + search */}
            <div className="max-w-xl">

              {/* Badge pill */}
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 px-4 py-2 rounded-full mb-6 text-xs sm:text-sm font-semibold shadow-sm max-w-full">
                <span className="shrink-0">🎉</span>
                <span className="truncate">Free delivery on your first order</span>
              </div>

              {/* Heading */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-4">
                Delicious food,<br />
                <span className="text-brand-400">delivered fast</span>
              </h1>

              {/* Subtext */}
              <p className="text-white/70 text-base sm:text-lg mb-8 leading-relaxed max-w-md">
                Order from your favorite restaurants and get it delivered to your doorstep — hot, fresh, and on time.
              </p>

              {/* Search bar */}
              <SearchBar placeholder="Search restaurants, dishes, or cuisines…" />

              {/* Feature highlights */}
              <div className="flex flex-wrap gap-5 sm:gap-8 mt-8">
                {[
                  { icon: '⚡', label: 'Fast Delivery' },
                  { icon: '🏆', label: 'Best Restaurants' },
                  { icon: '🔒', label: 'Secure Payment' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-white/85">
                    <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center text-lg shrink-0">
                      {icon}
                    </div>
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                ))}
              </div>
            </div>


          </div>
        </div>
      </section>

      <main id="restaurants" className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* ── Category pills ───────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <section className="mb-8 sm:mb-10">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">What are you craving?</h2>
            <div className="scroll-x flex gap-2.5 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={() => setActiveCategory(null)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  !activeCategory
                    ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/25'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-500 hover:bg-orange-50'
                }`}
              >
                🍽️ All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/25'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-500 hover:bg-orange-50'
                  }`}
                >
                  {cat.imageUrl && (
                    <img src={cat.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  )}
                  {cat.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Results header ───────────────────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {activeCategory
                  ? (categories.find(c => c.id === activeCategory)?.name ?? 'Restaurants')
                  : 'All Restaurants'}
              </h2>
              {restaurants.length > 0 && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
                  {restaurants.filter(r => r.isOpen).length} open now · {restaurants.length} total
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Restaurant grid ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-700">No restaurants found</h3>
            <p className="text-gray-400 mt-2">Try a different category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 animate-fade-in">
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
