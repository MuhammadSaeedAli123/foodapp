import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchApi } from '../../api/search'
import { formatCurrency } from '../../utils/formatters'

// ── Custom debounce hook ──────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// ── Highlight matching text ───────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-orange-100 text-brand-700 rounded-sm not-italic font-semibold px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ── Main SearchBar component ──────────────────────────────────────────────────
export default function SearchBar({ placeholder = 'Search restaurants, dishes, or cuisines…', className = '' }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(null)   // null = idle, object = fetched
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)

  const debouncedQuery = useDebounce(query, 350)
  const containerRef   = useRef(null)
  const inputRef       = useRef(null)
  const abortRef       = useRef(null)
  const navigate       = useNavigate()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fire search on debounced query change
  useEffect(() => {
    if (debouncedQuery.trim().length < 1) {
      setResults(null)
      setOpen(false)
      setLoading(false)
      return
    }

    // Cancel previous in-flight call
    if (abortRef.current) abortRef.current = false

    let active = true
    abortRef.current = active

    setLoading(true)

    searchApi.search(debouncedQuery)
      .then((data) => {
        if (!active) return
        setResults(data)
        setOpen(true)
      })
      .catch(() => {
        if (!active) return
        setResults({ restaurants: [], foodItems: [] })
        setOpen(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [debouncedQuery])

  const handleClear = () => {
    setQuery('')
    setResults(null)
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleSelect = (restaurantId) => {
    setOpen(false)
    setQuery('')
    setResults(null)
    navigate(`/restaurants/${restaurantId}`)
  }

  const hasRestaurants = results?.restaurants?.length > 0
  const hasFoodItems   = results?.foodItems?.length > 0
  const hasAny         = hasRestaurants || hasFoodItems
  const isEmpty        = results !== null && !hasAny

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>

      {/* ── Input ── */}
      <div className="relative flex items-center">
        <span className="absolute left-4 flex items-center pointer-events-none text-gray-400">
          {loading ? <Spinner /> : <SearchIcon />}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          autoComplete="off"
          spellCheck="false"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hasAny && setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-11 pr-12 py-3.5 rounded-xl text-gray-800 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-white/60 text-sm bg-white/95
                     transition-all duration-200"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 flex items-center justify-center w-7 h-7 rounded-full
                       text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Clear search"
          >
            <XIcon />
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl
                     border border-gray-100 overflow-hidden z-50 animate-fade-in"
          style={{ maxHeight: '440px', overflowY: 'auto' }}
        >

          {/* Empty state */}
          {isEmpty && (
            <div className="py-12 text-center px-6">
              <p className="text-5xl mb-3">🔍</p>
              <p className="text-gray-700 font-semibold">No results for "{query}"</p>
              <p className="text-gray-400 text-sm mt-1">Try a different keyword or browse by category</p>
            </div>
          )}

          {/* Restaurants section */}
          {hasRestaurants && (
            <section>
              <header className="px-4 pt-4 pb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Restaurants
                </span>
              </header>
              {results.restaurants.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelect(r.id)}
                  className="w-full flex items-center gap-3 px-4 py-3
                             hover:bg-orange-50 active:bg-orange-100
                             transition-colors duration-100 text-left group"
                >
                  <img
                    src={r.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=80&q=80'}
                    alt=""
                    className="w-11 h-11 rounded-xl object-cover shrink-0 bg-gray-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-brand-600 transition-colors">
                      <Highlight text={r.name} query={debouncedQuery} />
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <span className="text-brand-500 font-medium">
                        <Highlight text={r.categoryName} query={debouncedQuery} />
                      </span>
                      <span className="text-gray-300">·</span>
                      <span>⭐ {r.rating?.toFixed(1) || '4.5'}</span>
                      <span className="text-gray-300">·</span>
                      <span>{r.deliveryTime} min</span>
                      {r.deliveryFee > 0 && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>{formatCurrency(r.deliveryFee)} delivery</span>
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRightIcon />
                </button>
              ))}
            </section>
          )}

          {/* Divider between sections */}
          {hasRestaurants && hasFoodItems && (
            <hr className="border-gray-100 mx-4" />
          )}

          {/* Food items section */}
          {hasFoodItems && (
            <section>
              <header className="px-4 pt-4 pb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Dishes
                </span>
              </header>
              {results.foodItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.restaurantId)}
                  className="w-full flex items-center gap-3 px-4 py-3
                             hover:bg-orange-50 active:bg-orange-100
                             transition-colors duration-100 text-left group"
                >
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&q=80'}
                    alt=""
                    className="w-11 h-11 rounded-xl object-cover shrink-0 bg-gray-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-brand-600 transition-colors">
                      <Highlight text={item.name} query={debouncedQuery} />
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <span className="font-medium text-gray-700">{formatCurrency(item.price)}</span>
                      <span className="text-gray-300">·</span>
                      <span>
                        <Highlight text={item.restaurantName} query={debouncedQuery} />
                      </span>
                    </p>
                  </div>
                  <ChevronRightIcon />
                </button>
              ))}
            </section>
          )}

          {/* Footer hint */}
          {hasAny && (
            <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
              <p className="text-xs text-gray-400 text-center">
                Click a result to open the restaurant
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const Spinner = () => (
  <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)
