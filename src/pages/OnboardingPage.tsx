import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Store, Globe, Phone, FileText, ArrowRight, Loader2, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/supabase'
import { toast } from '@/store/useToastStore'
import { TopProgressBar } from '@/components/ui/TopProgressBar'

export function OnboardingPage() {
  const { user, isAuthenticated, isLoading: authLoading, updateUserStore, logout } = useAuthStore()
  const navigate = useNavigate()

  const [storeName, setStoreName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [tagline, setTagline] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/auth', { replace: true })
        return
      }

      // If user is already fully onboarded, redirect straight to dashboard
      const hasCompletedProfile = Boolean(
        user?.isOnboarded ||
        (user?.storeSlug && user?.whatsappNumber && user?.whatsappNumber !== '6281234567890' && user.whatsappNumber.length >= 8)
      )

      if (hasCompletedProfile) {
        navigate('/dashboard', { replace: true })
        return
      }
    }
  }, [authLoading, isAuthenticated, user, navigate])

  // Pre-fill existing data if user already has partial profile
  useEffect(() => {
    if (user) {
      if (user.name && !storeName) {
        setStoreName(user.name)
      }
      if (user.storeSlug && !slug) {
        setSlug(user.storeSlug)
      }
      if (user.whatsappNumber && !whatsapp) {
        setWhatsapp(user.whatsappNumber)
      }
      if (user.tagline && !tagline) {
        setTagline(user.tagline)
      }
    }
  }, [user])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setStoreName(val)
    if (!slugManuallyEdited) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      setSlug(generatedSlug)
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true)
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedName = storeName.trim()
    const trimmedSlug = slug.trim()
    const trimmedWa = whatsapp.trim().replace(/[^0-9]/g, '')
    const trimmedTagline = tagline.trim()

    if (!trimmedName) {
      setErrorMsg('Nama toko wajib diisi.')
      return
    }

    if (!trimmedSlug || trimmedSlug.length < 3) {
      setErrorMsg('Tautan toko minimal 3 karakter (huruf, angka, tanda strip).')
      return
    }

    if (!trimmedWa || trimmedWa.length < 9) {
      setErrorMsg('Nomor WhatsApp tidak valid. Masukkan nomor WhatsApp aktif.')
      return
    }

    if (!user) {
      setErrorMsg('Sesi tidak ditemukan. Silakan masuk kembali.')
      return
    }

    setIsSubmitting(true)

    try {
      const savedStore = await api.saveStoreOnboarding({
        userId: user.id,
        name: trimmedName,
        slug: trimmedSlug,
        whatsappNumber: trimmedWa,
        tagline: trimmedTagline,
      })

      updateUserStore({
        id: savedStore.id,
        name: savedStore.name,
        slug: savedStore.slug,
        whatsappNumber: savedStore.whatsapp_number,
        tagline: savedStore.tagline,
      })

      toast.success('Toko Siap Digunakan!', 'Selamat datang di dashboard bisnis tautan.site Anda.')
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat menyimpan data toko.'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopProgressBar isLoading={true} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between pb-6">
        <span className="font-sans text-xl font-bold tracking-tight text-ink">
          tautan<span className="text-primary text-lg font-bold ml-0.5">AI</span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors cursor-pointer"
        >
          <LogOut className="size-3.5" />
          <span>Ganti Akun</span>
        </button>
      </div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full mx-auto my-auto"
      >
        <div className="p-6 sm:p-8 rounded-3xl bg-surface-card border border-hairline shadow-sm">
          {/* Section Title */}
          <div className="text-center mb-8">
            <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Atur Profil Toko Anda
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Tentukan nama toko, tautan publik etalase, nomor WhatsApp tujuan pesanan, dan bio singkat bisnis Anda.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 mb-6 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* 1. Nama Toko */}
            <div>
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5 mb-1.5">
                <Store className="size-3.5 text-muted" />
                <span>Nama Toko</span>
                <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: Kopi Senja, Butik Cantik"
                value={storeName}
                onChange={handleNameChange}
                className="w-full h-11 px-3.5 rounded-xl bg-canvas border border-hairline text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <p className="text-[11px] text-muted mt-1">Nama merek atau toko yang akan dilihat pembeli di etalase.</p>
            </div>

            {/* 2. Tautan Toko (Slug) */}
            <div>
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5 mb-1.5">
                <Globe className="size-3.5 text-muted" />
                <span>Tautan Toko (Link Etalase)</span>
                <span className="text-primary">*</span>
              </label>
              <div className="flex items-center rounded-xl bg-canvas border border-hairline focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 overflow-hidden px-3.5 transition-all">
                <span className="text-xs text-muted font-mono select-none">tautan.site/</span>
                <input
                  type="text"
                  required
                  placeholder="namatokomu"
                  value={slug}
                  onChange={handleSlugChange}
                  className="w-full h-11 bg-transparent text-sm text-ink placeholder:text-muted/60 focus:outline-none font-medium font-mono pl-0.5"
                />
              </div>
              <p className="text-[11px] text-muted mt-1">
                Tautan unik untuk dipasang di bio Instagram, TikTok, dan kartu nama digital Anda.
              </p>
            </div>

            {/* 3. Nomor WhatsApp */}
            <div>
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5 mb-1.5">
                <Phone className="size-3.5 text-muted" />
                <span>Nomor WhatsApp Penjual</span>
                <span className="text-primary">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="Contoh: 081234567890"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-canvas border border-hairline text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <p className="text-[11px] text-muted mt-1">
                Nomor WhatsApp aktif tujuan pengiriman rincian pesanan checkout dari pembeli.
              </p>
            </div>

            {/* 4. Bio Toko (Tagline) */}
            <div>
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5 mb-1.5">
                <FileText className="size-3.5 text-muted" />
                <span>Bio / Deskripsi Toko</span>
                <span className="text-muted font-normal">(Opsional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Menyediakan busana muslim dan kain tenun premium kualitas terbaik. Siap kirim ke seluruh Indonesia."
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-3 rounded-xl bg-canvas border border-hairline text-xs sm:text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-normal resize-none leading-relaxed"
              />
              <p className="text-[11px] text-muted mt-1">
                Deskripsi singkat atau slogan yang ditampilkan di header etalase Anda.
              </p>
            </div>

            {/* Action Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary-active text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Menyimpan Toko...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan & Buka Dashboard</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-center pt-6 text-[11px] text-muted">
        <span>tautan.site &bull; Platform Link-in-Bio & Etalase WhatsApp</span>
      </div>
    </div>
  )
}
