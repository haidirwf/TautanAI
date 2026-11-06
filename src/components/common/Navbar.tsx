import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { LayoutDashboard, ListOrdered, LogOut, ArrowRight, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { AuthModal } from '@/components/auth/AuthModal'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname
  const { user, isAuthenticated, logout } = useAuthStore()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const isMerchantArea = path.startsWith('/dashboard') || path.startsWith('/orders')
  const isLandingPage = path === '/'

  return (
    <>
      <header className="sticky top-0 left-0 right-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-neutral-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo on Left (with Terracotta Accent Dot matching website identity) */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-3.5 rounded-full bg-[#cc785c] shrink-0 shadow-2xs group-hover:scale-110 transition-transform" />
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="font-sans text-xl font-extrabold tracking-tight text-[#141413] flex items-center"
            >
              tautan<span className="text-[#cc785c] font-bold ml-0.5">AI</span>
            </motion.span>
          </Link>

          {/* Navigation Links in Center matching UIref.webp */}
          {isLandingPage ? (
            <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-semibold text-neutral-600">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('features')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="hover:text-black transition-colors relative py-1 cursor-pointer"
              >
                Fitur
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('how')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="hover:text-black transition-colors relative py-1 cursor-pointer"
              >
                Cara Kerja
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('faq')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="hover:text-black transition-colors relative py-1 cursor-pointer"
              >
                FAQ
              </button>
            </nav>
          ) : isMerchantArea ? (
            <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  path === '/dashboard'
                    ? 'bg-[#efe9de] text-[#141413] border border-[#e8e2d9] font-semibold'
                    : 'text-[#706c64] hover:text-[#141413]'
                }`}
              >
                <LayoutDashboard className="size-3.5 text-[#cc785c]" />
                <span>Dashboard Finansial</span>
              </Link>

              <Link
                to="/dashboard/orders"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  path === '/dashboard/orders' || path === '/orders'
                    ? 'bg-[#efe9de] text-[#141413] border border-[#e8e2d9] font-semibold'
                    : 'text-[#706c64] hover:text-[#141413]'
                }`}
              >
                <ListOrdered className="size-3.5 text-[#cc785c]" />
                <span>Kelola Pesanan</span>
              </Link>
            </nav>
          ) : null}

          {/* Right Action: Auth / Logout / Mulai Gratis */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">

                {isMerchantArea ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#efe9de] border border-[#e8e2d9] text-xs font-medium text-[#706c64] hover:text-status-error transition-colors"
                    title="Keluar dari akun penjual"
                  >
                    <LogOut className="size-3.5" />
                    <span className="hidden sm:inline">Keluar</span>
                  </motion.button>
                ) : (
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#141413] px-4 py-2 text-xs font-medium text-[#faf8f5] hover:bg-[#252523] transition-all shadow-2xs"
                    >
                      <span>Dashboard Toko</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    setIsAuthOpen(true)
                  }}
                  className="px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-neutral-700 hover:text-black transition-colors cursor-pointer"
                >
                  Masuk
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => {
                    setAuthMode('signup')
                    setIsAuthOpen(true)
                  }}
                  className="rounded-full bg-[#111111] px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-black transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Buka Toko</span>
                  <ArrowRight className="size-3.5" />
                </motion.button>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            {isLandingPage && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-[#141413] hover:bg-[#efe9de] transition-colors"
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && isLandingPage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="md:hidden overflow-hidden border-t border-neutral-100 bg-white px-4 py-4 flex flex-col gap-3 shadow-md"
            >
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  const el = document.getElementById('features')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-left text-sm font-semibold text-neutral-700 hover:text-black py-1.5 transition-colors cursor-pointer"
              >
                Fitur
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  const el = document.getElementById('how')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-left text-sm font-semibold text-neutral-700 hover:text-black py-1.5 transition-colors cursor-pointer"
              >
                Cara Kerja
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  const el = document.getElementById('faq')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-left text-sm font-semibold text-neutral-700 hover:text-black py-1.5 transition-colors cursor-pointer"
              >
                FAQ
              </button>
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setAuthMode('signup')
                    setIsAuthOpen(true)
                  }}
                  className="w-full text-center py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Buka Toko Gratis Sekarang
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Auth Modal for 30s registration */}
      <AuthModal isOpen={isAuthOpen} initialMode={authMode} onClose={() => setIsAuthOpen(false)} />
    </>
  )
}
