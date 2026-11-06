import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Navbar } from '@/components/common/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Toaster } from '@/components/ui/Toaster'
import { AuthPage } from '@/pages/AuthPage'

const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const StorefrontPage = lazy(() => import('@/pages/StorefrontPage').then((m) => ({ default: m.StorefrontPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const CatalogPage = lazy(() => import('@/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })))
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage })))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))

function PageLoading() {
  return (
    <div className="flex-1 min-h-[60vh] flex items-center justify-center">
      <div className="size-6 border-2 border-[#cc785c] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppContent() {
  const location = useLocation()
  const initializeAuth = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || [
    '/orders',
    '/catalog',
    '/katalog',
    '/reviews',
    '/ulasan',
    '/reports',
    '/laporan',
    '/settings',
    '/pengaturan',
    '/pelanggan',
  ].some((r) => location.pathname.startsWith(r))
  const isStandaloneLayout =
    isDashboardRoute ||
    location.pathname === '/onboarding' ||
    location.pathname === '/login' ||
    location.pathname === '/auth'

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      <Toaster />
      {!isStandaloneLayout && <Navbar />}
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
            
            {/* Unified English Dashboard Sub-routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/dashboard/catalog" element={<ProtectedRoute><CatalogPage /></ProtectedRoute>} />
            <Route path="/dashboard/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/dashboard/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            {/* Backward compatibility redirects (Seamless 1-language English routing) */}
            <Route path="/dashboard/katalog" element={<Navigate to="/dashboard/catalog" replace />} />
            <Route path="/dashboard/pelanggan" element={<Navigate to="/dashboard/orders" replace />} />
            <Route path="/dashboard/ulasan" element={<Navigate to="/dashboard/reviews" replace />} />
            <Route path="/dashboard/laporan" element={<Navigate to="/dashboard/reports" replace />} />
            <Route path="/dashboard/pengaturan" element={<Navigate to="/dashboard/settings" replace />} />
            <Route path="/dashboard/setting" element={<Navigate to="/dashboard/settings" replace />} />

            {/* Root-level aliases redirecting to unified dashboard */}
            <Route path="/orders" element={<Navigate to="/dashboard/orders" replace />} />
            <Route path="/catalog" element={<Navigate to="/dashboard/catalog" replace />} />
            <Route path="/katalog" element={<Navigate to="/dashboard/catalog" replace />} />
            <Route path="/pelanggan" element={<Navigate to="/dashboard/orders" replace />} />
            <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
            <Route path="/laporan" element={<Navigate to="/dashboard/reports" replace />} />
            <Route path="/reviews" element={<Navigate to="/dashboard/reviews" replace />} />
            <Route path="/ulasan" element={<Navigate to="/dashboard/reviews" replace />} />
            <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
            <Route path="/pengaturan" element={<Navigate to="/dashboard/settings" replace />} />

            <Route path="/:slug" element={<StorefrontPage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
