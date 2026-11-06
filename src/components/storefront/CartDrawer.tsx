import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, MessageCircle, CheckCircle2, Star } from 'lucide-react'
import type { Store, Order } from '@/types'
import { formatIDR, sanitizeWhatsApp, generateOrderCode, buildWhatsAppOrderMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useCartStore } from '@/store/useCartStore'
import { api } from '@/lib/supabase'

function SmoothStepWrapper({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const update = () => {
      const h = el.offsetHeight || el.getBoundingClientRect().height
      if (h > 0) {
        setHeight(h)
      }
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      animate={{ height }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 28,
        mass: 0.9,
      }}
      className="relative w-full overflow-hidden"
    >
      <div ref={containerRef} className="relative w-full">
        {children}
      </div>
    </motion.div>
  )
}

interface CartDrawerProps {
  store: Store
}

export function CartDrawer({ store }: CartDrawerProps) {
  const {
    items,
    isCartOpen,
    customerInfo,
    setCartOpen,
    removeItem,
    updateQuantity,
    clearCart,
    setCustomerInfo,
    getSubtotal,
    getItemCount,
  } = useCartStore()

  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart')
  const [direction, setDirection] = useState<number>(1)

  const goToStep = (newStep: 'cart' | 'checkout' | 'success') => {
    const order = { cart: 1, checkout: 2, success: 3 }
    setDirection(order[newStep] >= order[step] ? 1 : -1)
    setStep(newStep)
  }

  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null)
  const [waLink, setWaLink] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Buyer review states after checkout
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewHover, setReviewHover] = useState<number | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const subtotal = getSubtotal()
  const itemCount = getItemCount()

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!customerInfo.name.trim()) {
      errors.name = 'Nama lengkap wajib diisi'
    }
    if (!customerInfo.phone.trim()) {
      errors.phone = 'Nomor WhatsApp wajib diisi'
    } else if (customerInfo.phone.replace(/[^0-9]/g, '').length < 9) {
      errors.phone = 'Nomor WhatsApp minimal 9 digit'
    }
    if (!customerInfo.address.trim()) {
      errors.address = 'Alamat pengiriman wajib diisi'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)

    // Synchronously open blank tab before async work to prevent mobile/desktop browser popup blocker
    let waWindow: Window | null = null
    try {
      waWindow = window.open('about:blank', '_blank')
    } catch (e) {
      console.warn('Popup window open failed:', e)
    }

    try {
      const orderCode = generateOrderCode()
      const sanitizedPhone = sanitizeWhatsApp(customerInfo.phone)
      const sellerPhone = sanitizeWhatsApp(store.whatsapp_number)

      const itemsSnapshot = items.map((item) => {
        const variantMap: Record<string, string> = {}
        Object.entries(item.selectedVariants).forEach(([k, v]) => {
          variantMap[k] = v.name
        })
        return {
          product_id: item.product.id,
          product_name: item.product.name,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.unitPrice * item.quantity,
          variants: variantMap,
        }
      })

      const newOrder = await api.createOrder({
        store_id: store.id,
        order_code: orderCode,
        buyer_name: customerInfo.name.trim(),
        buyer_phone: sanitizedPhone,
        shipping_address: customerInfo.address.trim(),
        order_notes: customerInfo.notes?.trim() || '',
        subtotal: subtotal,
        shipping_fee: 0,
        total_amount: subtotal,
        payment_method: 'Belum Terkonfirmasi',
        status: 'PENDING_WA',
        items_snapshot: itemsSnapshot,
      })

      // Generate WhatsApp Link
      const message = buildWhatsAppOrderMessage(newOrder, store)
      const encodedMsg = encodeURIComponent(message)
      const generatedWaUrl = `https://api.whatsapp.com/send?phone=${sellerPhone}&text=${encodedMsg}`

      setLastCreatedOrder(newOrder)
      setWaLink(generatedWaUrl)
      goToStep('success')
      clearCart()

      // Direct pre-opened tab to WhatsApp, or fallback to location redirect
      if (waWindow && !waWindow.closed) {
        waWindow.location.href = generatedWaUrl
      } else {
        window.open(generatedWaUrl, '_blank')
      }
    } catch (err) {
      if (waWindow && !waWindow.closed) {
        waWindow.close()
      }
      console.error('Failed to submit order', err)
      alert('Terjadi kesalahan saat memproses pesanan. Silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setCartOpen(false)
    if (step === 'success') {
      setTimeout(() => {
        goToStep('cart')
        setReviewSubmitted(false)
        setReviewComment('')
        setReviewRating(5)
      }, 300)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lastCreatedOrder) return
    setIsSubmittingReview(true)
    try {
      await api.createReview({
        store_id: store.id,
        order_id: lastCreatedOrder.id,
        buyer_name: lastCreatedOrder.buyer_name || 'Pembeli',
        rating: reviewRating,
        comment: reviewComment.trim() || 'Pesanan sangat memuaskan, respon penjual cepat!',
      })
      setReviewSubmitted(true)
    } catch (err) {
      console.error('Failed to submit review', err)
      alert('Gagal mengirim ulasan, silakan coba lagi.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <>
      {/* Floating Bottom Cart Bar (visible when cart has items) */}
      <AnimatePresence>
        {itemCount > 0 && !isCartOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed bottom-5 inset-x-0 z-40 px-4 flex justify-center pointer-events-none"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                goToStep('cart')
                setCartOpen(true)
              }}
              className="pointer-events-auto w-full max-w-md flex items-center justify-between p-3.5 pl-5 rounded-full bg-[#141413] text-[#faf8f5] border border-[#e8e2d9] shadow-2xl transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="size-5 text-[#cc785c]" />
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="absolute -top-1.5 -right-2 size-4 rounded-full bg-[#cc785c] text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
                  >
                    {itemCount}
                  </motion.span>
                </div>
                <div className="text-left">
                  <span className="text-xs text-[#faf8f5]/70 block leading-none">
                    {itemCount} Produk dalam keranjang
                  </span>
                  <span className="font-sans text-base font-bold text-[#faf8f5] tracking-tight mt-0.5 block">
                    {formatIDR(subtotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#cc785c] hover:bg-[#a9583e] text-white text-xs font-semibold group-hover:scale-105 transition-all shadow-xs">
                <span>Lihat Pesanan</span>
                <ArrowRight className="size-3.5" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart & Checkout Modal */}
      <Modal
        isOpen={isCartOpen}
        onClose={handleClose}
        title={
          step === 'cart'
            ? `Keranjang Belanja (${itemCount})`
            : step === 'checkout'
            ? 'Pengisian Alamat & Pembayaran'
            : 'Pesanan Diteruskan ke WhatsApp'
        }
        description={
          step === 'cart'
            ? 'Periksa kembali daftar pesanan dan jumlah sebelum melanjutkan.'
            : step === 'checkout'
            ? 'Lengkapi data pengiriman untuk diteruskan ke WhatsApp penjual.'
            : undefined
        }
        surface="canvas"
        maxWidth={step === 'checkout' ? 'lg' : 'md'}
      >
        {/* Step Indicator Header (Step 1 Keranjang -> Step 2 Pembayaran) */}
        {step !== 'success' && (
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-hairline/60">
            <button
              type="button"
              onClick={() => goToStep('cart')}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none"
            >
              <span
                className={`size-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-all duration-300 ${
                  step === 'cart'
                    ? 'bg-primary text-white shadow-xs scale-105'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                1
              </span>
              <span
                className={`text-xs font-semibold transition-colors duration-300 ${
                  step === 'cart' ? 'text-ink' : 'text-muted group-hover:text-ink'
                }`}
              >
                1. Keranjang Belanja
              </span>
            </button>
            <div className="flex-1 mx-3 h-1 bg-[#efe9de] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={false}
                animate={{ width: step === 'checkout' ? '100%' : '0%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`size-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-all duration-300 ${
                  step === 'checkout'
                    ? 'bg-primary text-white shadow-xs scale-105'
                    : 'bg-[#efe9de] text-[#8c867b]'
                }`}
              >
                2
              </span>
              <span
                className={`text-xs font-semibold transition-colors duration-300 ${
                  step === 'checkout' ? 'text-ink' : 'text-muted'
                }`}
              >
                2. Detail Pembayaran
              </span>
            </div>
          </div>
        )}

        <SmoothStepWrapper>
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {/* Step 1: Cart Items */}
            {step === 'cart' && (
              <motion.div
                key="step-cart"
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: number) => ({ x: dir > 0 ? -24 : 24, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.28,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex flex-col gap-4 w-full"
              >
              {items.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <ShoppingBag className="size-12 text-muted/40 mb-3" />
                  <p className="font-sans text-base font-bold text-ink">Keranjang Anda Masih Kosong</p>
                  <p className="text-xs text-muted mt-1 max-w-xs">
                    Pilih produk favorit Anda di katalog lalu klik tombol Tambah.
                  </p>
                  <Button variant="secondary" size="sm" onClick={handleClose} className="mt-4">
                    Kembali ke Katalog
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col divide-y divide-hairline max-h-72 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="size-14 rounded-md object-cover border border-hairline shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-ink truncate">
                              {item.product.name}
                            </h4>
                            {Object.keys(item.selectedVariants).length > 0 && (
                              <p className="text-[11px] text-muted truncate mt-0.5">
                                {Object.entries(item.selectedVariants)
                                  .map(([k, v]) => `${k}: ${v.name}`)
                                  .join(' • ')}
                              </p>
                            )}
                            <p className="font-sans text-sm font-bold text-ink mt-1">
                              {formatIDR(item.unitPrice)}
                            </p>
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center rounded-md border border-hairline bg-surface-card">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 text-muted hover:text-ink transition-colors"
                              aria-label="Kurangi"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-7 text-center text-xs font-medium font-mono text-ink">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 text-muted hover:text-ink transition-colors"
                              aria-label="Tambah"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-[10px] text-status-error/80 hover:text-status-error flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="size-3" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subtotal & Next Step */}
                  <div className="pt-4 border-t border-hairline flex flex-col gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Subtotal Barang</span>
                      <span className="font-sans text-lg font-bold text-ink">
                        {formatIDR(subtotal)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">
                      *Ongkos kirim akan dihitung & disepakati bersama penjual via WhatsApp.
                    </p>
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                      <Button onClick={() => goToStep('checkout')} className="w-full mt-1 group">
                        <span>Lanjut ke Pembayaran</span>
                        <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </motion.div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step 2: Customer Shipping & Payment Form */}
          {step === 'checkout' && (
            <motion.form
              key="step-checkout"
              custom={direction}
              variants={{
                enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir: number) => ({ x: dir > 0 ? -24 : 24, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.28,
                ease: [0.16, 1, 0.3, 1],
              }}
              onSubmit={handleCheckoutSubmit}
              className="flex flex-col gap-4 w-full"
            >
              <div className="flex flex-col gap-3">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-ink block mb-1">
                    Nama Lengkap <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Budi Santoso"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ name: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-md bg-canvas border border-hairline text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  {formErrors.name && (
                    <span className="text-[11px] text-status-error mt-1 block">{formErrors.name}</span>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-medium text-ink block mb-1">
                    Nomor WhatsApp Aktif <span className="text-primary">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="081234567890"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ phone: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-md bg-canvas border border-hairline text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  {formErrors.phone && (
                    <span className="text-[11px] text-status-error mt-1 block">{formErrors.phone}</span>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="text-xs font-medium text-ink block mb-1">
                    Alamat Lengkap Pengiriman <span className="text-primary">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan, kota & kode pos"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ address: e.target.value })}
                    className="w-full p-3 rounded-md bg-canvas border border-hairline text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                  {formErrors.address && (
                    <span className="text-[11px] text-status-error mt-1 block">{formErrors.address}</span>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-medium text-muted block mb-1">
                    Catatan untuk Penjual (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Mohon bungkus bubble wrap tebal"
                    value={customerInfo.notes}
                    onChange={(e) => setCustomerInfo({ notes: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-md bg-canvas border border-hairline text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Summary bar */}
              <div className="pt-3 border-t border-hairline flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Total Belanja ({itemCount} produk):</span>
                  <span className="font-sans text-base font-bold text-ink">
                    {formatIDR(subtotal)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => goToStep('cart')}
                    className="w-1/3"
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 bg-primary hover:bg-primary-active"
                  >
                    <MessageCircle className="size-4" />
                    <span>{isSubmitting ? 'Memproses...' : 'Kirim ke WhatsApp'}</span>
                  </Button>
                </div>
              </div>
            </motion.form>
          )}

          {/* Step 3: Success Confirmation */}
          {step === 'success' && lastCreatedOrder && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.25,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="py-6 text-center flex flex-col items-center gap-4 w-full"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20, delay: 0.1 }}
                className="size-16 rounded-full bg-status-success/15 text-[#1e6f32] flex items-center justify-center border border-status-success/30 shadow-xs"
              >
                <CheckCircle2 className="size-8" />
              </motion.div>

              <div>
                <h4 className="font-sans text-xl font-bold text-ink">
                  Pesanan Berhasil Dibuat!
                </h4>
                <p className="font-mono text-xs font-medium text-muted mt-1">
                  Kode Pesanan: {lastCreatedOrder.order_code}
                </p>
              </div>

              <p className="text-xs text-muted max-w-sm leading-relaxed">
                Jendela WhatsApp Anda telah dibuka secara otomatis. Jika tidak terbuka, silakan klik tombol di bawah untuk meneruskan rincian pesanan ke penjual.
              </p>

              <div className="w-full flex flex-col gap-2 pt-2">
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 rounded-md bg-[#25D366] hover:bg-[#1EBE5D] text-white text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <MessageCircle className="size-4" />
                  <span>Buka WhatsApp Lagi</span>
                </motion.a>

                {/* Buyer Review Form */}
                <div className="w-full mt-2 p-4 rounded-xl bg-[#faf8f5] border border-[#e8e2d9] text-left">
                  {reviewSubmitted ? (
                    <div className="flex items-center gap-2.5 text-xs text-[#1e6f32]">
                      <CheckCircle2 className="size-4 text-[#1e6f32] shrink-0" />
                      <span className="font-medium">
                        Terima kasih! Ulasan bintang {reviewRating} Anda telah masuk ke dashboard toko.
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#141413]">
                          Beri Ulasan Pembelian
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = (reviewHover || reviewRating) >= star
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                onMouseEnter={() => setReviewHover(star)}
                                onMouseLeave={() => setReviewHover(null)}
                                className="p-0.5 text-muted hover:text-amber-400 transition-colors cursor-pointer"
                                title={`${star} Bintang`}
                              >
                                <Star
                                  className={`size-4 ${
                                    isFilled ? 'text-amber-400 fill-amber-400' : 'text-[#d4cebe]'
                                  }`}
                                />
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Tulis ulasan Anda (kualitas produk, respon WA)..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-white border border-[#e8e2d9] text-xs text-[#141413] placeholder:text-[#8c867b] focus:outline-none focus:border-[#cc785c]"
                      />

                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSubmittingReview}
                        className="self-end bg-[#141413] text-white hover:bg-black text-xs py-1 h-8 rounded-lg"
                      >
                        {isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                      </Button>
                    </form>
                  )}
                </div>

                <Button variant="outline" size="md" onClick={handleClose}>
                  Kembali ke Toko
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SmoothStepWrapper>
    </Modal>
    </>
  )
}
