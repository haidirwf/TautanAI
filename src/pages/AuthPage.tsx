import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from '@/store/useToastStore'

export function AuthPage() {
  const location = useLocation()
  const [isLogin, setIsLogin] = useState(location.pathname === '/login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user, isAuthenticated, isInitialized, login, signup, loginWithGoogle } = useAuthStore()
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    setIsLogin(location.pathname === '/login')
  }, [location.pathname])

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      if (user?.isOnboarded) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [isInitialized, isAuthenticated, user?.isOnboarded, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAuthError(null)

    try {
      if (isLogin) {
        const res = await login(email || 'merchant@tautan.ai', password)
        if (res?.isOnboarded) {
          navigate('/dashboard')
        } else {
          navigate('/onboarding')
        }
      } else {
        const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'tokoku'
        await signup(email || 'merchant@tautan.ai', password, cleanSlug)
        navigate('/onboarding')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat autentikasi.'
      setAuthError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setAuthError(null)
    try {
      await loginWithGoogle()
      // Keep loading indicator active while browser redirects to Google OAuth
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.'
      setAuthError(msg)
      toast.error('Gagal Masuk dengan Google', msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between py-12 px-4">
      <div className="max-w-md w-full mx-auto my-auto">
        {/* Logo Back */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="font-sans text-2xl font-bold tracking-tight text-ink">
              tautan<span className="text-primary font-sans text-xl font-bold ml-0.5">AI</span>
            </span>
          </Link>
        </div>

        {/* Card Container */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface-card border border-hairline shadow-sm">
          <div className="text-center mb-6">
            <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              {isLogin ? 'Masuk ke Dashboard' : 'Buka Toko Online Kamu'}
            </h1>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              {isLogin
                ? 'Kelola pesanan WhatsApp, pantau omzet, dan atur katalog etalase Anda.'
                : 'Satu tautan untuk semua produk dan pesanan masuk otomatis ke WhatsApp.'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium leading-relaxed">
              {authError}
            </div>
          )}

          {/* Quick Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-11 px-4 rounded-full border border-hairline bg-surface-card hover:bg-surface-soft text-ink text-xs font-medium flex items-center justify-center gap-2.5 transition-all shadow-2xs group cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="size-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Mengarahkan ke Google...' : 'Masuk dengan Google'}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-hairline" />
            <span className="text-[11px] font-mono text-muted uppercase">atau dengan email</span>
            <div className="h-px flex-1 bg-hairline" />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {authError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium leading-relaxed">
                {authError}
              </div>
            )}
            {!isLogin && (
              <div>
                <label className="text-xs font-medium text-ink block mb-1">
                  Klaim Tautan Toko Anda
                </label>
                <div className="flex items-center rounded-lg bg-canvas border border-hairline focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 overflow-hidden px-3">
                  <span className="text-xs text-muted font-mono select-none">tautanAI/</span>
                  <input
                    type="text"
                    required
                    placeholder="tokokamu"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full h-10 bg-transparent text-xs sm:text-sm text-ink placeholder:text-muted/60 focus:outline-none pl-0.5 font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-ink block mb-1">
                Alamat Email
              </label>
              <input
                type="email"
                required
                placeholder="nama@tokokamu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-canvas border border-hairline text-xs sm:text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink block mb-1">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-canvas border border-hairline text-xs sm:text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full mt-2 font-medium"
            >
              <span>{loading ? 'Memproses...' : isLogin ? 'Masuk ke Dashboard' : 'Klaim Toko & Buka Dashboard'}</span>
              <ArrowRight className="size-4" />
            </Button>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true)
                  setEmail('demo@tautan.site')
                  setPassword('demo123456password')
                  setAuthError(null)
                }}
                className="w-full py-2 px-3 rounded-lg bg-[#faf8f5] hover:bg-[#fae7e0]/40 border border-[#e8e2d9] text-xs font-medium text-[#141413] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-[#cc785c]">Akun Demo:</span>
                  <span className="text-[#5c5850] truncate">Kopi & Oleh-oleh Bali</span>
                </span>
                <span className="text-[11px] font-medium text-[#cc785c] shrink-0 ml-2">Gunakan Kredensial Demo</span>
              </button>
            </div>
          </form>

          {/* Footer switch */}
          <div className="text-center pt-4 mt-4 border-t border-hairline">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-muted hover:text-ink transition-colors"
            >
              {isLogin ? (
                <span>Belum punya toko? <strong className="text-primary underline font-medium">Bikin akun gratis di sini</strong></span>
              ) : (
                <span>Sudah punya toko? <strong className="text-primary underline font-medium">Masuk di sini</strong></span>
              )}
            </button>
          </div>
        </div>

        {/* Benefits reminder */}
        <div className="mt-8 flex flex-col gap-2 text-xs text-muted px-2">
          <div className="flex items-center gap-2">
            <Check className="size-3.5 text-status-success shrink-0" />
            <span>0% potongan biaya gateway transaksi</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="size-3.5 text-status-success shrink-0" />
            <span>Katalog mikro responsif siap sebar di bio Instagram & TikTok</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="size-3.5 text-status-success shrink-0" />
            <span>Pesanan otomatis terformat langsung ke WhatsApp</span>
          </div>
        </div>
      </div>
    </div>
  )
}
