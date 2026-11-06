import React, { useState, useEffect } from 'react'
import { MessageCircle, Save, MapPin, Bot, ExternalLink, Image as ImageIcon } from 'lucide-react'
import type { Order, OrderStatus } from '@/types'
import { formatIDR, sanitizeWhatsApp } from '@/lib/utils'
import { api } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/store/useToastStore'

interface OrderEditModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onSave: (orderId: string, status: OrderStatus, extra: Partial<Order>) => Promise<void>
}

export function OrderEditModal({ order, isOpen, onClose, onSave }: OrderEditModalProps) {
  const [status, setStatus] = useState<OrderStatus>('PENDING_WA')
  const [shippingFee, setShippingFee] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [paymentSenderName, setPaymentSenderName] = useState<string>('')
  const [paymentSenderAccount, setPaymentSenderAccount] = useState<string>('')
  const [courierName, setCourierName] = useState<string>('')
  const [trackingNumber, setTrackingNumber] = useState<string>('')
  const [sellerNote, setSellerNote] = useState<string>('')
  const [notifyBuyer, setNotifyBuyer] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (order) {
      setStatus(order.status)
      setShippingFee(order.shipping_fee || 0)
      setPaymentMethod(order.payment_method || 'Transfer BCA')
      setPaymentSenderName(order.payment_sender_name || '')
      setPaymentSenderAccount(order.payment_sender_account || '')
      setCourierName(order.courier_name || '')
      setTrackingNumber(order.tracking_number || '')
      setSellerNote(order.seller_internal_note || '')
      setNotifyBuyer(true)
    }
  }, [order])

  if (!order) return null

  const calculatedTotal = order.subtotal + (shippingFee || 0)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const isStatusChanged = order.status !== status
      await onSave(order.id, status, {
        shipping_fee: shippingFee,
        total_amount: calculatedTotal,
        payment_method: paymentMethod,
        payment_sender_name: paymentSenderName,
        payment_sender_account: paymentSenderAccount,
        courier_name: courierName,
        tracking_number: trackingNumber,
        seller_internal_note: sellerNote,
      })

      // Send WhatsApp AI notification if enabled and status is relevant
      if (notifyBuyer && (isStatusChanged || ['PROCESSING', 'SHIPPED', 'COMPLETED', 'PAID', 'CANCELLED'].includes(status))) {
        api.notifyCustomerOrderStatus({
          orderId: order.id,
          orderCode: order.order_code,
          newStatus: status,
          courierName,
          trackingNumber,
          sellerNote,
        }).then((res) => {
          if (res.success) {
            toast.success('Notifikasi WA Terkirim', `AI Copilot mengirimkan pesan status terbaru ke WhatsApp ${order.buyer_name}.`)
          } else if (res.message) {
            toast.error('Notifikasi WhatsApp', res.message)
          }
        }).catch((err) => {
          console.warn('Notification error:', err)
        })
      }

      onClose()
      toast.success('Pesanan Diperbarui', `Rincian pesanan ${order.order_code} berhasil disimpan.`)
    } catch (error) {
      console.error('Error updating order', error)
      toast.error('Gagal Memperbarui Pesanan', 'Terjadi kendala saat menyimpan perubahan pesanan.')
    } finally {
      setIsSaving(false)
    }
  }

  const buyerWaClean = sanitizeWhatsApp(order.buyer_phone)
  const directWaUrl = `https://wa.me/${buyerWaClean}?text=${encodeURIComponent(
    `Halo kak ${order.buyer_name}, perihal pesanan ${order.order_code}...`
  )}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Kelola Pesanan: ${order.order_code}`}
      description={order.ai_summary ? `Dibuat pada ${new Date(order.created_at).toLocaleString('id-ID')} • ${order.ai_summary}` : `Dibuat pada ${new Date(order.created_at).toLocaleString('id-ID')}`}
      headerAddon={
        order.managed_by_ai ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#faf4ed] border border-[#cc785c]/25 text-[#8c4327]">
            <Bot className="size-3.5 text-[#cc785c] shrink-0" />
            <span className="text-[11px] font-semibold tracking-tight">AI Otonom</span>
            <span className="text-[10px] font-medium bg-[#edf7ee] text-[#1e612f] border border-[#2e7d32]/20 px-1.5 py-0.2 rounded font-mono">
              Aktif
            </span>
          </div>
        ) : null
      }
      maxWidth="2xl"
      surface="canvas"
    >
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Customer & Items Overview */}
        <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8e2d9] flex flex-col gap-3">
          <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                <span className="font-semibold text-xs sm:text-sm text-[#141413] truncate">{order.buyer_name}</span>
                <span className="font-mono text-[11px] sm:text-xs text-[#8c867b]">({order.buyer_phone})</span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#5c5850] mt-0.5 flex items-center gap-1">
                <MapPin className="size-3 text-[#cc785c] shrink-0" />
                <span className="line-clamp-1 sm:line-clamp-none">{order.shipping_address}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {order.payment_proof_url && (
                <a
                  href={order.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Lihat Bukti Transfer"
                  className="size-8 sm:size-auto sm:h-8 flex sm:inline-flex items-center justify-center sm:gap-1.5 px-0 sm:px-3 rounded-lg bg-white border border-[#e8e2d9] hover:bg-[#faf8f5] text-[#cc785c] text-xs font-semibold shadow-2xs transition-all shrink-0 active:scale-95 cursor-pointer"
                >
                  <ImageIcon className="size-4 sm:size-3.5 text-[#cc785c] shrink-0" />
                  <span className="hidden sm:inline">Bukti Transfer</span>
                  <ExternalLink className="size-3 hidden sm:inline text-[#cc785c]/80" />
                </a>
              )}
              <a
                href={directWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Chat Pembeli WA"
                className="size-8 sm:size-auto sm:h-8 flex sm:inline-flex items-center justify-center sm:gap-1.5 px-0 sm:px-3 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold shadow-xs transition-all shrink-0 active:scale-95 cursor-pointer"
              >
                <MessageCircle className="size-4 sm:size-3.5 shrink-0" />
                <span className="hidden sm:inline">Chat Pembeli WA</span>
              </a>
            </div>
          </div>

          {/* Items Table Snapshot */}
          <div className="pt-2.5 border-t border-[#e8e2d9]/60">
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#8c867b] block mb-1.5">
              Rincian Barang Pesanan
            </span>
            <div className="flex flex-col divide-y divide-[#e8e2d9]/40 text-xs">
              {order.items_snapshot.map((item, idx) => (
                <div key={idx} className="py-1.5 flex justify-between items-center">
                  <div className="truncate pr-2">
                    <span className="font-medium text-[#141413]">
                      {item.quantity}x {item.product_name}
                    </span>
                    {item.variants && Object.keys(item.variants).length > 0 && (
                      <span className="text-[#8c867b] ml-1">
                        ({Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(', ')})
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#141413] shrink-0">
                    {formatIDR(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Rekening Pembeli */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            type="text"
            placeholder="Nama rekening pembeli"
            value={paymentSenderName}
            onChange={(e) => setPaymentSenderName(e.target.value)}
            className="w-full h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
          />
          <input
            type="text"
            placeholder="Nomor rekening atau e-wallet pembeli"
            value={paymentSenderAccount}
            onChange={(e) => setPaymentSenderAccount(e.target.value)}
            className="w-full h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm font-mono text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
          />
        </div>

        {/* Order Lifecycle Status Picker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[#141413] block">
            Status Progres Pesanan
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(
              [
                { id: 'PENDING_WA', label: '1. Menunggu WA' },
                { id: 'PAID', label: '2. Sudah Bayar' },
                { id: 'PROCESSING', label: '3. Diproses' },
                { id: 'SHIPPED', label: '4. Dikirim' },
                { id: 'COMPLETED', label: '5. Selesai' },
                { id: 'CANCELLED', label: 'Batal / Expired' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                  status === s.id
                    ? 'border-[#cc785c] bg-[#fae7e0]/60 text-[#cc785c] ring-1 ring-[#cc785c]'
                    : 'border-[#e8e2d9] bg-white text-[#141413] hover:bg-[#faf8f5]'
                }`}
              >
                <Badge status={s.id} className="mb-1.5" />
                <span className="block text-[11px] text-[#8c867b]">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Shipping & Financial Ledger Inputs: 2-column grid on both mobile & desktop */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div>
            <label className="text-[11px] sm:text-xs font-medium text-[#141413] block mb-1 truncate" title="Ongkos Kirim Disepakati (IDR)">
              <span className="sm:hidden">Ongkir (IDR)</span>
              <span className="hidden sm:inline">Ongkos Kirim Disepakati (IDR)</span>
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={shippingFee}
              onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] font-mono shadow-2xs"
            />
          </div>

          <div>
            <label className="text-[11px] sm:text-xs font-medium text-[#141413] block mb-1 truncate">
              Metode Pembayaran
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-9 sm:h-10 px-2 sm:px-3 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
            >
              <optgroup label="Transfer Bank">
                <option value="Transfer BCA">Transfer BCA</option>
                <option value="Transfer Mandiri">Transfer Mandiri</option>
                <option value="Transfer BRI">Transfer BRI</option>
                <option value="Transfer BNI">Transfer BNI</option>
                <option value="Transfer BSI">Transfer BSI</option>
                <option value="Transfer Bank Jago / SeaBank">Bank Jago / SeaBank</option>
                <option value="Transfer Bank Lainnya">Bank Lainnya</option>
              </optgroup>
              <optgroup label="E-Wallet">
                <option value="DANA">DANA</option>
                <option value="GoPay">GoPay</option>
                <option value="OVO">OVO</option>
                <option value="ShopeePay">ShopeePay</option>
                <option value="E-Wallet Lainnya">E-Wallet Lainnya</option>
              </optgroup>
              <optgroup label="Lainnya">
                <option value="QRIS Manual">QRIS Manual</option>
                <option value="COD / Bayar di Tempat">COD / Bayar di Tempat</option>
                <option value="Lainnya">Lainnya</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-[11px] sm:text-xs font-medium text-[#141413] block mb-1 truncate">
              Nama Kurir
            </label>
            <input
              type="text"
              placeholder="JNE, SiCepat, dll"
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
            />
          </div>

          <div>
            <label className="text-[11px] sm:text-xs font-medium text-[#141413] block mb-1 truncate">
              <span className="sm:hidden">Nomor Resi</span>
              <span className="hidden sm:inline">Nomor Resi Pengiriman</span>
            </label>
            <input
              type="text"
              placeholder="JNE1029384829"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] font-mono shadow-2xs"
            />
          </div>
        </div>

        {/* Internal Seller Notes (full width) */}
        <div>
          <label className="text-[11px] sm:text-xs font-medium text-[#141413] block mb-1">
            Catatan Khusus Penjual (Internal)
          </label>
          <input
            type="text"
            placeholder="Catatan rahasia untuk merchant..."
            value={sellerNote}
            onChange={(e) => setSellerNote(e.target.value)}
            className="w-full h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
          />
        </div>

        {/* WhatsApp AI Auto-Notification Toggle */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-[#faf8f5] border border-[#e8e2d9] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-white border border-[#e8e2d9] flex items-center justify-center text-[#cc785c] shrink-0">
              <Bot className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#141413] block">Notifikasi WhatsApp AI Otomatis</span>
              <p className="text-[11px] text-[#706c64] truncate">
                Kirim pesan pembaruan status ke WhatsApp pembeli ({order.buyer_phone})
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={notifyBuyer}
              onChange={(e) => setNotifyBuyer(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-[#e8e2d9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#cc785c]"></div>
          </label>
        </div>

        {/* Financial Summary & Save Button */}
        <div className="pt-4 border-t border-[#e8e2d9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs text-[#8c867b] block">Total Akhir Pesanan:</span>
            <span className="font-sans font-bold text-xl sm:text-2xl text-[#141413] tracking-tight">
              {formatIDR(calculatedTotal)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 sm:flex-initial justify-center">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 sm:flex-initial justify-center bg-[#cc785c] hover:bg-[#a9583e] text-white"
            >
              <Save className="size-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
