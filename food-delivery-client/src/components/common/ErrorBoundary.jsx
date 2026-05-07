import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-gray-50">
          <div className="text-7xl mb-6">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-400 mb-8 max-w-md">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()}
              className="btn-primary">
              Refresh Page
            </button>
            <Link to="/" className="btn-secondary">Go Home</Link>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-8 text-left text-xs text-red-500 bg-red-50 p-4 rounded-xl max-w-2xl overflow-auto">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
