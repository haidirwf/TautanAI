import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import {
  Check,
  ChevronDown,
  ArrowRight,
  Bot,
  MessageCircle,
  CheckCheck,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { formatIDR } from '@/lib/utils'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [claimSlug, setClaimSlug] = useState('')
  const [activeFaq, setActiveFaq] = useState<number | null>(0)

  const navigate = useNavigate()
  const { signup, isAuthenticated } = useAuthStore()

  useGSAP(
    () => {
      // 1. Hero Entrance Timeline with snappy, energetic curve
      const heroTl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      heroTl
        .from('.hero-headline', { opacity: 0, y: 22, duration: 0.45 })
        .from('.hero-sub', { opacity: 0, y: 16, duration: 0.35 }, '-=0.3')
        .from('.hero-claim', { opacity: 0, y: 14, duration: 0.35 }, '-=0.25')
        .from('.hero-trust', { opacity: 0, y: 10, duration: 0.3 }, '-=0.25')
        .from('.hero-card-wrapper', { opacity: 0, y: 22, scale: 0.98, duration: 0.45 }, '-=0.35')

      // 2. Bento Grid Section Reveal (Fast & Crisp: Left from Left, Right from Right)
      gsap.from('.bento-header', {
        scrollTrigger: { trigger: '#features', start: 'top 90%' },
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: 'power2.out',
      })

      gsap.from('.bento-left', {
        scrollTrigger: { trigger: '.bento-grid', start: 'top 86%' },
        opacity: 0,
        x: -35,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      })

      gsap.from('.bento-right', {
        scrollTrigger: { trigger: '.bento-grid', start: 'top 86%' },
        opacity: 0,
        x: 35,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      })

      // 4. Cara Kerja: Fast sequential slide-in from left with line connections
      gsap.from('.how-header', {
        scrollTrigger: { trigger: '#how', start: 'top 90%' },
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: 'power2.out',
      })

      const stepsTl = gsap.timeline({
        scrollTrigger: { trigger: '#how .step-grid', start: 'top 86%' },
      })
      stepsTl
        .from('.step-box-0', {
          opacity: 0,
          x: -35,
          duration: 0.38,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        })
        .from(
          '.step-line-0',
          {
            scaleX: 0,
            transformOrigin: 'left center',
            duration: 0.2,
            ease: 'power2.out',
            clearProps: 'transform',
          },
          '-=0.15'
        )
        .from(
          '.step-box-1',
          {
            opacity: 0,
            x: -35,
            duration: 0.38,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
          '-=0.1'
        )
        .from(
          '.step-line-1',
          {
            scaleX: 0,
            transformOrigin: 'left center',
            duration: 0.2,
            ease: 'power2.out',
            clearProps: 'transform',
          },
          '-=0.15'
        )
        .from(
          '.step-box-2',
          {
            opacity: 0,
            x: -35,
            duration: 0.38,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
          '-=0.1'
        )

      // 5. Pre-Footer Conversion Banner Reveal
      gsap.from('.cta-banner-content', {
        scrollTrigger: { trigger: '.cta-banner', start: 'top 88%' },
        opacity: 0,
        y: 25,
        duration: 0.45,
        ease: 'power2.out',
      })
    },
    { scope: containerRef }
  )

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = claimSlug.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'tokoku'
    if (isAuthenticated) {
      navigate('/dashboard')
      return
    }
    signup('penjual@tautan.ai', clean)
    navigate('/dashboard')
  }

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx)
  }

  const faqItems = [
    {
      q: 'Apa perbedaan tautanAI dengan link bio biasa seperti Linktree?',
      a: 'Link bio biasa hanya menampilkan tombol tautan pasif. tautanAI menggabungkan etalase belanja visual, checkout WhatsApp berformat rapi (0% komisi), dan Asisten AI 24/7 yang otomatis menjawab pertanyaan stok, membuat pesanan resmi, hingga memverifikasi bukti transfer tanpa campur tangan manual.',
    },
    {
      q: 'Bagaimana cara kerja Asisten AI WhatsApp di tautanAI?',
      a: 'Asisten AI terhubung langsung ke nomor WhatsApp toko Anda via Fonnte Gateway dan bertenaga Google Gemini. AI membaca data katalog, varian harga, dan catatan khusus produk Anda secara real-time. Saat pembeli bertanya, memesan, atau mengirim foto struk transfer, AI langsung merespons dan memperbarui data di dashboard toko.',
    },
    {
      q: 'Bagaimana AI memverifikasi foto bukti transfer dari pembeli?',
      a: 'Saat pembeli mengirimkan foto tangkapan layar bukti transfer m-Banking di WhatsApp, AI membaca nominal, rekening tujuan, dan mencocokkan dengan kode pesanan. Jika valid, status pesanan otomatis berubah dari Menunggu WA menjadi LUNAS (PAID) di dashboard Anda.',
    },
    {
      q: 'Apakah penjual tetap bisa membalas chat WhatsApp secara manual?',
      a: 'Bisa kapan saja. Anda memegang kendali penuh atas akun WhatsApp toko. Anda dapat menanggapi pembeli secara langsung, menonaktifkan AI untuk sementara, atau mengedit status pesanan dan nomor resi dari dashboard merchant.',
    },
    {
      q: 'Apakah ada potongan komisi dari setiap transaksi penjualan?',
      a: 'Sama sekali tidak ada potongan (0% platform fee). Semua pembayaran dari pembeli langsung ditransfer 100% ke rekening bank atau QRIS pribadi yang Anda cantumkan di pengaturan toko.',
    },
  ]

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#faf9f5] text-[#141413] flex flex-col justify-between selection:bg-[#cc785c]/25 selection:text-[#141413] font-sans"
    >
      {/* ==================================================================== */}
      {/* 1. HERO SECTION (Autonomous Value Proposition + Interactive Mockup) */}
      {/* ==================================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 py-8 lg:py-0 min-h-[calc(100vh-4rem)] flex items-center justify-center max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center w-full py-4 lg:py-6">
          {/* Left Column: Headline, Subtitle, Claim Input, Trust */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <h1 className="hero-headline font-sans text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-[#141413] leading-[1.08] max-w-2xl">
              Etalase tokomu, kini berjualan otomatis dengan <span className="text-[#cc785c]">Asisten WhatsApp 24/7.</span>
            </h1>

            <p className="hero-sub mt-4 text-sm sm:text-base lg:text-lg text-[#5c5850] max-w-xl leading-relaxed font-normal">
              Buka link-in-bio belanja modern dalam 30 detik. Biarkan asisten AI otonom melayani tanya stok, merekap pesanan, dan memverifikasi bukti transfer langsung di WhatsApp tanpa jeda.
            </p>

            {/* Minimal Claim Input */}
            <div className="hero-claim mt-6 sm:mt-8 max-w-md w-full">
              <form
                onSubmit={handleClaimSubmit}
                className="p-1.5 rounded-full border border-[#e6dfd8] bg-white shadow-xs flex items-center gap-2 focus-within:border-[#cc785c] focus-within:ring-2 focus-within:ring-[#cc785c]/20 transition-all hover:border-[#cc785c]/60"
              >
                <div className="flex items-center pl-4 pr-1 text-xs sm:text-sm text-[#8c867b] font-mono select-none font-semibold">
                  tautanAI/
                </div>
                <input
                  type="text"
                  required
                  placeholder="namatokomu"
                  value={claimSlug}
                  onChange={(e) => setClaimSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full text-xs sm:text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none font-medium bg-transparent"
                />
                <button
                  type="submit"
                  className="px-5 h-10 rounded-full bg-[#141413] hover:bg-black text-white text-xs sm:text-sm font-bold transition-all shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 group"
                >
                  <span>Klaim</span>
                  <ArrowRight className="size-3.5 text-[#cc785c] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              {/* Clean Trust Indicators - Strictly Non-Dot-Pills & Non-Sparkles */}
              <div className="hero-trust flex items-center justify-start gap-x-5 gap-y-2 mt-3.5 text-xs text-[#706c64] flex-wrap font-medium">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-600 shrink-0" />
                  0% Potongan Komisi
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-600 shrink-0" />
                  Asisten WhatsApp 24/7
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-600 shrink-0" />
                  Verifikasi Transfer Otomatis
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Autonomous Copilot & Storefront Showcase */}
          <div className="hero-card-wrapper lg:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="w-full max-w-sm sm:max-w-md">
              <div className="hero-float-card w-full p-5 sm:p-6 rounded-3xl bg-white border border-[#e6dfd8] shadow-sm hover:shadow-md transition-all text-left">
                {/* Store Identity & Copilot Badge */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[#f0ece5]">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-[#cc785c] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                      KK
                    </div>
                    <div>
                      <h2 className="font-extrabold text-sm text-[#141413]">Kopi Kintamani Roastery</h2>
                      <span className="text-xs font-mono text-[#8c867b]">tautanAI/kintamani</span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-[#faf4ed] text-[#8c4327] border border-[#cc785c]/25 text-[11px] font-semibold flex items-center gap-1.5 shrink-0">
                    <Bot className="size-3.5 text-[#cc785c]" />
                    <span>AI Copilot 24/7</span>
                  </div>
                </div>

                {/* Micro Product Row */}
                <div className="py-3 flex items-center justify-between gap-3 bg-[#faf9f5] px-3.5 rounded-2xl border border-[#e6dfd8] my-3">
                  <img
                    src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80"
                    alt="Arabika Kintamani Natural"
                    className="size-10 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#141413] block truncate">Arabika Kintamani Natural</span>
                    <span className="text-xs font-mono text-[#cc785c] font-bold">{formatIDR(68000)}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#706c64] bg-white px-2 py-0.5 rounded border border-[#e6dfd8]">
                    Stok: 15 pack
                  </span>
                </div>

                {/* Autonomous WhatsApp Dialogue Snapshot Mockup */}
                <div className="space-y-2.5 py-1">
                  {/* Buyer Message 1 */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#e7fedb] border border-[#cbebb5] text-[#141413] p-2.5 text-xs shadow-2xs">
                      <p className="leading-snug">Om Swastyastu Kak, Kopi Arabika Kintamani ready 2 pack? Mau kirim ke Renon.</p>
                      <span className="text-[9px] text-[#6c855a] font-mono block text-right mt-1">10:14</span>
                    </div>
                  </div>

                  {/* AI Copilot Response 1 */}
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-xs bg-white border border-[#e6dfd8] text-[#141413] p-2.5 text-xs shadow-2xs">
                      <p className="leading-snug">
                        Om Swastyastu Kak! Arabika Kintamani freshly roasted <span className="font-bold text-[#141413]">ready 2 pack</span>. Pengiriman ke Renon siap kami proses via kurir instan ya kak. Suksma! 🙏
                      </p>
                      <div className="mt-1.5 pt-1.5 border-t border-[#f0ece5] flex items-center justify-between text-[10px] font-mono text-[#706c64]">
                        <span>Total 2 Pack: {formatIDR(136000)}</span>
                        <span className="text-[9px] text-[#8c867b]">10:14</span>
                      </div>
                    </div>
                  </div>

                  {/* Buyer Payment Proof Upload */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#e7fedb] border border-[#cbebb5] text-[#141413] p-2 text-xs shadow-2xs">
                      <div className="flex items-center gap-2 bg-white/70 p-1.5 rounded-lg border border-[#cbebb5]/80 mb-1">
                        <CheckCheck className="size-3.5 text-emerald-700 shrink-0" />
                        <span className="text-[11px] font-mono font-medium truncate">struk_bca_136000.jpg</span>
                      </div>
                      <p className="text-[11px] leading-tight">Sudah ditransfer nggih kak, mohon dicek yaa</p>
                      <span className="text-[9px] text-[#6c855a] font-mono block text-right mt-0.5">10:15</span>
                    </div>
                  </div>

                  {/* AI Automated Payment Verification */}
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-xs bg-[#faf8f5] border border-[#e8e2d9] text-[#141413] p-2.5 text-xs shadow-2xs">
                      <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-semibold mb-1">
                        <ShieldCheck className="size-3.5 text-emerald-600" />
                        <span>Transfer Rp136.000 Terverifikasi Otomatis</span>
                      </div>
                      <p className="text-[11px] text-[#5c5850] leading-snug">
                        Pesanan <span className="font-mono font-bold text-[#141413]">#ORD-8821</span> berstatus <span className="text-emerald-700 font-bold">LUNAS</span>. Sedang dikemas barista untuk pengiriman ke Renon! Suksma Kak!
                      </p>
                      <span className="text-[9px] text-[#8c867b] font-mono block text-right mt-1">10:15</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action */}
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-[#141413] hover:bg-black text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer group active:scale-98"
                >
                  <MessageCircle className="size-3.5 text-[#cc785c]" />
                  <span>Coba Buka Toko dengan AI</span>
                  <ArrowRight className="size-3.5 text-[#cc785c] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. BENTO GRID FEATURES (Autonomous AI Pillars & Zero-Commission Architecture) */}
      {/* ==================================================================== */}
      <section id="features" className="scroll-mt-20 border-t border-[#e6dfd8] bg-white px-4 sm:px-6 lg:px-8 py-16 sm:py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="bento-header text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-[#cc785c] font-bold">
              Fitur Otonom
            </span>
            <h2 className="font-sans text-3xl sm:text-5xl font-extrabold tracking-tight text-[#141413] mt-2 leading-tight">
              Toko yang tidak pernah tidur, melayani pembeli setiap detik.
            </h2>
            <p className="text-sm sm:text-base text-[#5c5850] mt-3">
              Kombinasi etalase link-in-bio modern dan agen AI WhatsApp mandiri untuk melesatkan penjualan UMKM Indonesia.
            </p>
          </div>

          <div className="bento-grid grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Bento Card 1: Autonomous AI Sales Agent (8 cols, Left) */}
            <div className="bento-left md:col-span-8 p-8 sm:p-10 rounded-3xl bg-[#faf9f5] border border-[#e6dfd8] flex flex-col justify-between shadow-2xs group hover:border-[#cc785c]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-[#faf4ed] text-[#8c4327] border border-[#cc785c]/25 text-xs font-mono font-semibold flex items-center gap-1.5">
                    <Bot className="size-3 text-[#cc785c]" />
                    Asisten Otonom 24/7
                  </span>
                </div>
                <h3 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#141413] mb-3 leading-tight">
                  Menjawab Tanya Stok, Varian, & <span className="text-[#cc785c]">Rekomendasi Produk Seketika</span>
                </h3>
                <p className="text-sm text-[#5c5850] leading-relaxed max-w-xl">
                  Asisten AI membaca katalog aktif dan catatan instruksi khusus toko Anda secara langsung. Saat pembeli bertanya ketersediaan stok, ukuran baju, atau bahan masakan, AI merespons hangat sesuai gaya bahasa merek Anda.
                </p>
              </div>

              {/* Visual Demo Card Row */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-white border border-[#e6dfd8] flex items-center gap-3 shadow-2xs transition-all hover:border-[#cc785c]/40 hover:-translate-y-0.5">
                  <img
                    src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80"
                    alt="Kopi Arabika Kintamani"
                    className="size-12 rounded-xl object-cover"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#141413] block">Arabika Kintamani</span>
                    <span className="text-xs font-mono font-bold text-[#cc785c]">Rp 68.000</span>
                    <span className="text-[10px] text-[#8c867b] block">Stok Sinkron Realtime</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#e6dfd8] flex items-center gap-3 shadow-2xs transition-all hover:border-[#cc785c]/40 hover:-translate-y-0.5">
                  <img
                    src="https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=200&auto=format&fit=crop&q=80"
                    alt="Kain Tenun Endek Bali"
                    className="size-12 rounded-xl object-cover"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#141413] block">Kain Endek Mastuli</span>
                    <span className="text-xs font-mono font-bold text-[#cc785c]">Rp 185.000</span>
                    <span className="text-[10px] text-[#8c867b] block">Motif Tradisional Bali</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: 0% Komisi (4 cols, Right, Dark) */}
            <div className="bento-right md:col-span-4 p-8 sm:p-10 rounded-3xl bg-[#141413] text-white border border-neutral-800 flex flex-col justify-between shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div>
                <div className="font-sans text-5xl sm:text-6xl font-extrabold text-[#cc785c] mb-2 tracking-tight">
                  0%
                </div>
                <h3 className="font-sans text-xl font-bold text-white mb-2 leading-snug">
                  Bebas <span className="text-[#cc785c]">Biaya Platform</span>
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  Uang pembayaran langsung ditransfer 100% ke rekening bank atau QRIS Anda. Tanpa komisi pihak ketiga dan tanpa penahanan dana.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-800 text-xs font-mono text-[#cc785c] font-semibold flex items-center gap-1.5">
                <Check className="size-3.5" />
                <span>100% Keuntungan Milik Penjual</span>
              </div>
            </div>

            {/* Bento Card 3: Automated Payment Verification (6 cols, Left) */}
            <div className="bento-left md:col-span-6 p-8 sm:p-10 rounded-3xl bg-[#faf9f5] border border-[#e6dfd8] flex flex-col justify-between shadow-2xs hover:border-[#cc785c]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-[#edf7ee] text-[#1e612f] border border-[#2e7d32]/20 text-xs font-mono font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="size-3 text-emerald-600" />
                    Vision OCR Pembayaran
                  </span>
                </div>
                <h3 className="font-sans text-2xl font-extrabold text-[#141413] mb-3 leading-tight">
                  Verifikasi Bukti Transfer <span className="text-[#cc785c]">Secara Otomatis</span>
                </h3>
                <p className="text-sm text-[#5c5850] leading-relaxed">
                  Pembeli cukup mengunggah foto struk transfer m-Banking di WhatsApp. AI membaca angka transfer, mencocokkan kode order, dan mengubah status menjadi Lunas di dashboard seketika.
                </p>
              </div>

              <div className="mt-6 p-3.5 rounded-xl bg-white border border-[#e6dfd8] flex items-center justify-between text-xs font-mono">
                <span className="text-[#5c5850]">Bukti Transfer BCA &rarr; #ORD-8821</span>
                <span className="px-2 py-0.5 rounded bg-[#edf7ee] text-[#1e612f] font-bold border border-[#2e7d32]/20">
                  LUNAS
                </span>
              </div>
            </div>

            {/* Bento Card 4: Centralized Storefront & Analytics (6 cols, Right) */}
            <div className="bento-right md:col-span-6 p-8 sm:p-10 rounded-3xl bg-[#faf9f5] border border-[#e6dfd8] flex flex-col justify-between shadow-2xs hover:border-[#cc785c]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-[#eff6ff] text-[#1d4ed8] border border-[#2563eb]/20 text-xs font-mono font-semibold flex items-center gap-1.5">
                    <Zap className="size-3 text-blue-600" />
                    Etalase & Finansial
                  </span>
                </div>
                <h3 className="font-sans text-2xl font-extrabold text-[#141413] mb-3 leading-tight">
                  Etalase Cepat & <span className="text-[#cc785c]">Dashboard Omzet Realtime</span>
                </h3>
                <p className="text-sm text-[#5c5850] leading-relaxed">
                  Sematkan tautan media sosial, katalog mikro, dan pantau omzet terverifikasi harian, pesanan aktif, hingga riwayat pelanggan dalam satu antarmuka minimalis.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-mono text-[#8c867b] border-t border-[#e6dfd8] pt-3">
                <span>tautanAI/namatokomu</span>
                <span className="text-[#cc785c] font-bold">Siap Disematkan di Bio</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. 3-STEP WORKFLOW (GSAP Sequential Left-to-Right with Connecting Lines) */}
      {/* ==================================================================== */}
      <section id="how" className="scroll-mt-20 border-t border-[#e6dfd8] bg-[#faf9f5] px-4 sm:px-6 lg:px-8 py-16 sm:py-24 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="how-header text-center max-w-xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-[#cc785c] font-bold">
              Cara Kerja
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141413] mt-2">
              Mulai berjualan otomatis dalam 3 langkah.
            </h2>
            <p className="text-sm text-[#5c5850] mt-2">
              Setup praktis tanpa memerlukan keahlian coding atau server yang rumit.
            </p>
          </div>

          <div className="relative">
            <div className="step-grid grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {[
                {
                  num: '01',
                  title: 'Klaim Tautan & Sambung WA',
                  desc: 'Pilih nama tokomu di tautanAI/namamu dan sambungkan nomor WhatsApp tokomu dalam waktu kurang dari 1 menit.',
                },
                {
                  num: '02',
                  title: 'Upload Produk & Instruksi AI',
                  desc: 'Pajang foto barang, harga, varian, dan tambahkan catatan selling points agar asisten AI menguasai produkmu.',
                },
                {
                  num: '03',
                  title: 'Toko Berjualan Otonom 24/7',
                  desc: 'Pasang tautan di bio medsos. Asisten AI melayani pertanyaan, merangkum order, dan memvalidasi transfer secara mandiri.',
                },
              ].map((step, idx) => (
                <div key={step.num} className="relative flex flex-col">
                  <div
                    className={`step-box-${idx} p-7 rounded-3xl bg-white border border-[#e6dfd8] shadow-2xs hover:-translate-y-1 hover:shadow-md hover:border-[#cc785c]/40 transition-all duration-300 flex flex-col justify-between h-full relative`}
                  >
                    <div>
                      {/* Step Number */}
                      <div className="mb-4">
                        <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#cc785c]">
                          {step.num}
                        </span>
                      </div>

                      <h3 className="font-sans text-lg font-bold text-[#141413] mb-2">
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#5c5850] leading-relaxed">
                        {step.desc}
                      </p>
                    </div>

                    {/* Connecting line between boxes on desktop */}
                    {idx < 2 && (
                      <div
                        className={`step-line-${idx} hidden md:flex items-center absolute -right-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none w-6`}
                      >
                        <div className="w-full h-[2px] bg-[#cc785c]/50" />
                      </div>
                    )}
                  </div>

                  {/* Connecting line on mobile between boxes */}
                  {idx < 2 && (
                    <div className="md:hidden flex justify-center py-1.5">
                      <div className="w-[2px] h-4 bg-[#cc785c]/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. PERTANYAAN UMUM / FAQ (#faq) */}
      {/* ==================================================================== */}
      <section id="faq" className="scroll-mt-20 border-t border-[#e6dfd8] bg-white px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-mono uppercase tracking-widest text-[#cc785c] font-bold">
              FAQ
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141413] mt-2">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-sm text-[#5c5850] mt-2">
              Informasi lengkap seputar sistem asisten otonom, privasi transaksi, dan pengaturan toko.
            </p>
          </div>

          <div className="divide-y divide-[#e6dfd8] border-y border-[#e6dfd8]">
            {faqItems.map((item, idx) => (
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left gap-4 group cursor-pointer select-none"
                >
                  <span className="font-bold text-sm sm:text-base text-[#141413] group-hover:text-[#cc785c] transition-colors">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`size-4 transition-transform duration-200 shrink-0 ${
                      activeFaq === idx ? 'rotate-180 text-[#cc785c]' : 'text-[#706c64]'
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs sm:text-sm text-[#5c5850] pt-3 leading-relaxed pr-6">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. PRE-FOOTER CONVERSION BANNER */}
      {/* ==================================================================== */}
      <section className="cta-banner px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-6xl mx-auto w-full">
        <div className="cta-banner-content p-8 sm:p-14 rounded-3xl bg-[#141413] text-white border border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-8 shadow-xl">
          <div className="max-w-xl">
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Miliki etalase pintar dan asisten WhatsApp tokomu hari ini.
            </h2>
            <p className="text-sm text-neutral-300 mt-3 leading-relaxed">
              Daftar gratis dalam 30 detik. 0% komisi platform. Biarkan tokomu tetap melayani pembeli dan menerima transfer 24 jam nonstop.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="px-7 py-4 rounded-full bg-[#cc785c] hover:bg-[#b8674d] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer group active:scale-98"
            >
              <span>Buka Toko Gratis Sekarang</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. MINIMALIST FOOTER */}
      {/* ==================================================================== */}
      <footer className="border-t border-[#e6dfd8] bg-white py-8 px-4 sm:px-6 text-[#5c5850] text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-sans text-base font-extrabold text-[#141413]">
              tautan<span className="text-[#cc785c]">AI</span>
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-xs text-[#706c64]">Autonomous AI WhatsApp Commerce & Link-in-Bio</span>
          </div>

          <div className="flex items-center gap-5 text-xs font-semibold">
            <a href="#features" className="hover:text-[#141413] transition-colors">Fitur</a>
            <a href="#how" className="hover:text-[#141413] transition-colors">Cara Kerja</a>
            <a href="#faq" className="hover:text-[#141413] transition-colors">FAQ</a>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="text-[#cc785c] hover:text-[#b8674d] transition-colors cursor-pointer"
            >
              Masuk Penjual
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-[#8c867b]">
          <span>© 2026 tautanAI. Didedikasikan untuk pelaku usaha mandiri & kreator Indonesia.</span>
          <span className="font-medium text-[#141413]">0% Potongan Komisi</span>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  )
}
