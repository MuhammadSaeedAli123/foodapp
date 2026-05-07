import { useState, useEffect } from 'react'

// Lightweight in-app toast — no third-party lib needed
let _showToast = null

export function toast(message, type = 'success') {
  _showToast?.({ message, type })
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    _showToast = ({ message, type }) => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
    }
    return () => { _showToast = null }
  }, [])

  const colorMap = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    info:    'bg-blue-500',
    warning: 'bg-yellow-500',
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${colorMap[t.type] ?? 'bg-gray-700'} text-white px-5 py-3 rounded-xl shadow-lg
                      text-sm font-medium animate-slide-up max-w-xs`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
