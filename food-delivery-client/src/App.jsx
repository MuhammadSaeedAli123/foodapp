import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastContainer } from './components/common/Toast'
import ProtectedRoute from './components/common/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import NotFound from './pages/NotFound'

// Pages — lazy-loaded groupings
import Home              from './pages/Home'
import Login             from './pages/Login'
import Register          from './pages/Register'
import ForgotPassword    from './pages/ForgotPassword'
import RestaurantDetail  from './pages/RestaurantDetail'
import Cart              from './pages/Cart'
import Checkout          from './pages/Checkout'
import OrderTracking     from './pages/OrderTracking'
import MyOrders          from './pages/MyOrders'
import Profile           from './pages/Profile'

// Admin pages
import AdminDashboard       from './pages/admin/Dashboard'
import ManageRestaurants    from './pages/admin/ManageRestaurants'
import ManageOrders         from './pages/admin/ManageOrders'
import ManageFoodItems      from './pages/admin/ManageFoodItems'
import ManageWorkers        from './pages/admin/ManageWorkers'
import ManageRiders         from './pages/admin/ManageRiders'
import ManageOwners         from './pages/admin/ManageOwners'

// Rider pages
import RiderDashboard from './pages/rider/RiderDashboard'
import RiderOrders    from './pages/rider/RiderOrders'
import RiderEarnings  from './pages/rider/RiderEarnings'

// Worker pages
import KitchenPanel from './pages/worker/KitchenPanel'

// Owner pages
import OwnerDashboard from './pages/owner/OwnerDashboard'
import ManageStaff    from './pages/owner/ManageStaff'
import ManageMenu     from './pages/owner/ManageMenu'
import OwnerOrders    from './pages/owner/OwnerOrders'
import OwnerEarnings  from './pages/owner/OwnerEarnings'
import OwnerReviews   from './pages/owner/OwnerReviews'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/"                   element={<Home />} />
            <Route path="/login"              element={<Login />} />
            <Route path="/register"           element={<Register />} />
            <Route path="/forgot-password"    element={<ForgotPassword />} />
            <Route path="/restaurants/:id"    element={<RestaurantDetail />} />

            {/* User */}
            <Route path="/cart" element={
              <ProtectedRoute roles={['User']}>
                <Cart />
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute roles={['User']}>
                <Checkout />
              </ProtectedRoute>
            } />
            <Route path="/orders/:id/track" element={
              <ProtectedRoute roles={['User', 'Admin', 'Rider']}>
                <OrderTracking />
              </ProtectedRoute>
            } />
            <Route path="/my-orders" element={
              <ProtectedRoute roles={['User']}>
                <MyOrders />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />

            {/* Admin */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/restaurants" element={
              <ProtectedRoute roles={['Admin']}>
                <ManageRestaurants />
              </ProtectedRoute>
            } />
            <Route path="/admin/restaurants/:id/items" element={
              <ProtectedRoute roles={['Admin']}>
                <ManageFoodItems />
              </ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute roles={['Admin']}>
                <ManageOrders />
              </ProtectedRoute>
            } />
            <Route path="/admin/workers" element={
              <ProtectedRoute roles={['Admin']}>
                <ManageWorkers />
              </ProtectedRoute>
            } />
            <Route path="/admin/riders" element={
              <ProtectedRoute roles={['Admin']}>
                <ManageRiders />
              </ProtectedRoute>
            } />
            <Route path="/admin/owners" element={
              <ProtectedRoute roles={['Admin']}>
                <ManageOwners />
              </ProtectedRoute>
            } />

            {/* Rider */}
            <Route path="/rider" element={
              <ProtectedRoute roles={['Rider']}>
                <RiderDashboard />
              </ProtectedRoute>
            } />
            <Route path="/rider/orders" element={
              <ProtectedRoute roles={['Rider']}>
                <RiderOrders />
              </ProtectedRoute>
            } />
            <Route path="/rider/earnings" element={
              <ProtectedRoute roles={['Rider']}>
                <RiderEarnings />
              </ProtectedRoute>
            } />

            {/* Worker + KitchenStaff + RestaurantOwner */}
            <Route path="/kitchen" element={
              <ProtectedRoute roles={['Worker', 'KitchenStaff', 'RestaurantOwner']}>
                <KitchenPanel />
              </ProtectedRoute>
            } />

            {/* Restaurant Owner */}
            <Route path="/owner" element={
              <ProtectedRoute roles={['RestaurantOwner']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/owner/staff" element={
              <ProtectedRoute roles={['RestaurantOwner']}>
                <ManageStaff />
              </ProtectedRoute>
            } />
            <Route path="/owner/menu" element={
              <ProtectedRoute roles={['RestaurantOwner']}>
                <ManageMenu />
              </ProtectedRoute>
            } />
            <Route path="/owner/orders" element={
              <ProtectedRoute roles={['RestaurantOwner']}>
                <OwnerOrders />
              </ProtectedRoute>
            } />
            <Route path="/owner/earnings" element={
              <ProtectedRoute roles={['RestaurantOwner']}>
                <OwnerEarnings />
              </ProtectedRoute>
            } />
            <Route path="/owner/reviews" element={
              <ProtectedRoute roles={['RestaurantOwner']}>
                <OwnerReviews />
              </ProtectedRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>

          <ToastContainer />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
