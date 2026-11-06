import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Search,
  MessageCircle,
  SlidersHorizontal,
  Package,
  RefreshCw,
  X,
  Bot,
} from 'lucide-react'
import type { Order, OrderStatus } from '@/types'
import { api } from '@/lib/supabase'
import { formatIDR, sanitizeWhatsApp } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { OrderEditModal } from '@/components/dashboard/OrderEditModal'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useAuthStore } from '@/store/useAuthStore'

export function OrdersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const storeId = user?.storeId || ''
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadOrders = async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const data = await api.getOrders(storeId)
      setOrders(data)
    } catch (err) {
      console.error('Failed to load orders', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [isAuthenticated])

  const handleUpdateOrder = async (
    orderId: string,
    status: OrderStatus,
    extra: Partial<Order>
  ) => {
    await api.updateOrderStatus(orderId, status, extra)
    await loadOrders()
  }

  const openEditModal = (order: Order) => {
    setSelectedOrder(order)
    setIsEditModalOpen(true)
  }

  // Filter tabs - simple & clean with AI Managed filter
  const tabs = [
    { id: 'ALL', label: 'Semua' },
    { id: 'AI_MANAGED', label: 'Diproses AI' },
    { id: 'PENDING_WA', label: 'Menunggu WA' },
    { id: 'PROCESSING', label: 'Diproses' },
    { id: 'SHIPPED', label: 'Dikirim' },
    { id: 'COMPLETED', label: 'Selesai' },
    { id: 'CANCELLED', label: 'Batal' },
  ]

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      selectedStatus === 'ALL'
        ? true
        : selectedStatus === 'AI_MANAGED'
        ? Boolean(order.managed_by_ai)
        : order.status === selectedStatus
    const query = searchQuery.toLowerCase().trim()
    const matchesSearch =
      query === '' ||
      order.order_code.toLowerCase().includes(query) ||
      order.buyer_name.toLowerCase().includes(query) ||
      order.buyer_phone.includes(query) ||
      (order.tracking_number && order.tracking_number.toLowerCase().includes(query))

    return matchesStatus && matchesSearch
  })

  if (authLoading) {
    return <DashboardLayout isLoading={true}><div className="space-y-6 animate-pulse" /></DashboardLayout>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="flex flex-col gap-5">
        {/* Simple & Clean Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e8e2d9]">
          <div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#141413] tracking-tight">
              Pesanan Masuk
            </h1>
            <p className="text-xs text-[#706c64] mt-0.5">
              {orders.length} pesanan tercatat dari checkout WhatsApp
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="h-8 px-3 rounded-lg bg-white border border-[#e8e2d9] text-xs font-medium text-[#5c5850] hover:text-[#141413] hover:bg-[#faf8f5] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Segarkan data pesanan"
          >
            <RefreshCw className="size-3 text-[#706c64]" />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Minimal Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {tabs.map((filter) => {
              const count =
                filter.id === 'ALL'
                  ? orders.length
                  : filter.id === 'AI_MANAGED'
                  ? orders.filter((o) => o.managed_by_ai).length
                  : orders.filter((o) => o.status === filter.id).length
              const isSelected = selectedStatus === filter.id

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedStatus(filter.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#141413] text-white'
                      : 'bg-white text-[#706c64] hover:text-[#141413] border border-[#e8e2d9]'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className={`ml-1.5 text-[10px] font-mono ${isSelected ? 'opacity-70' : 'text-[#8c867b]'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8c867b]" />
            <input
              type="text"
              placeholder="Cari pembeli, kode order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-white border border-[#e8e2d9] text-xs text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#8c867b] hover:text-[#141413]"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Clean, Calmed-Down Orders Table */}
        {isLoading ? (
          <div className="rounded-xl border border-[#e8e2d9] bg-white divide-y divide-[#e8e2d9] overflow-hidden shadow-2xs animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-36 bg-[#e8e2d9]/60 rounded" />
                  <div className="h-3 w-52 bg-[#e8e2d9]/40 rounded" />
                </div>
                <div className="h-5 w-20 bg-[#e8e2d9]/50 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-white border border-[#e8e2d9] shadow-2xs">
            <Package className="size-8 text-[#8c867b]/50 mx-auto mb-2" />
            <p className="font-sans text-base font-bold text-[#141413]">Tidak ada pesanan</p>
            <p className="text-xs text-[#706c64] mt-0.5">
              Tidak ada transaksi yang cocok dengan filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#e8e2d9] bg-white overflow-hidden shadow-2xs">
            {/* Mobile & Tablet Card Layout (< lg) */}
            <div className="block lg:hidden divide-y divide-[#e8e2d9]">
              {filteredOrders.map((order, idx) => {
                const buyerWaClean = sanitizeWhatsApp(order.buyer_phone)
                const directWaUrl = `https://wa.me/${buyerWaClean}?text=${encodeURIComponent(
                  `Halo kak ${order.buyer_name}, perihal pesanan ${order.order_code}...`
                )}`

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    className="p-4 flex flex-col gap-3 hover:bg-[#faf8f5]/60 transition-colors"
                  >
                    {/* Header Row: Order Code + Status Badge + Date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-semibold text-[#141413] bg-[#faf8f5] px-2 py-0.5 rounded border border-[#e8e2d9] shrink-0">
                          {order.order_code}
                        </span>
                        {order.managed_by_ai && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#faf4ed] text-[#8c4327] border border-[#cc785c]/25 flex items-center gap-1 shrink-0 font-semibold">
                            <Bot className="size-3 text-[#cc785c]" />
                            <span>AI Copilot</span>
                          </span>
                        )}
                        <Badge status={order.status} />
                      </div>
                      <span className="text-[11px] text-[#8c867b] font-mono shrink-0">
                        {new Date(order.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Buyer & Items Section */}
                    <div className="bg-[#faf8f5]/70 rounded-xl p-3 border border-[#e8e2d9]/60">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-[#141413] truncate">
                          {order.buyer_name}
                        </span>
                        <span className="text-[11px] text-[#8c867b] font-mono shrink-0">
                          {order.buyer_phone}
                        </span>
                      </div>
                      <p className="text-xs text-[#706c64] mt-1 line-clamp-2">
                        {order.items_snapshot.map((item) => `${item.quantity}x ${item.product_name}`).join(', ')}
                      </p>
                    </div>

                    {/* Bottom Row: Total & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[#8c867b] block">
                          Total Tagihan
                        </span>
                        <span className="font-sans font-bold text-sm sm:text-base text-[#141413] block">
                          {formatIDR(order.total_amount || order.subtotal)}
                        </span>
                        <span className="text-[10px] text-[#8c867b] block">
                          {order.shipping_fee > 0 ? (
                            `Termasuk ongkir ${formatIDR(order.shipping_fee)}`
                          ) : (
                            <span className="text-[#b45309]">Ongkir belum diset</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={directWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-initial justify-center h-8 px-3 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                          title="Chat pembeli di WhatsApp"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>Chat WA</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => openEditModal(order)}
                          className="flex-1 sm:flex-initial justify-center h-8 px-3 rounded-lg bg-white hover:bg-[#faf8f5] text-[#5c5850] hover:text-[#141413] border border-[#e8e2d9] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          title="Kelola status pesanan"
                        >
                          <SlidersHorizontal className="size-3" />
                          <span>Kelola</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Desktop Table Layout (>= lg) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-[#faf8f5] border-b border-[#e8e2d9] text-[11px] font-mono uppercase tracking-wider text-[#8c867b]">
                    <th className="py-3 px-5 font-semibold">Pesanan</th>
                    <th className="py-3 px-5 font-semibold">Pembeli & Produk</th>
                    <th className="py-3 px-5 font-semibold">Status</th>
                    <th className="py-3 px-5 font-semibold text-right">Total Tagihan</th>
                    <th className="py-3 px-5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e2d9]">
                  {filteredOrders.map((order, idx) => {
                    const buyerWaClean = sanitizeWhatsApp(order.buyer_phone)
                    const directWaUrl = `https://wa.me/${buyerWaClean}?text=${encodeURIComponent(
                      `Halo kak ${order.buyer_name}, perihal pesanan ${order.order_code}...`
                    )}`

                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: idx * 0.02 }}
                        className="hover:bg-[#faf8f5]/60 transition-colors"
                      >
                        {/* 1. Pesanan */}
                        <td className="py-3.5 px-5 align-middle">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-[#141413]">
                              {order.order_code}
                            </span>
                            {order.managed_by_ai && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#faf4ed] text-[#8c4327] border border-[#cc785c]/25 flex items-center gap-1 shrink-0 font-semibold">
                                <Bot className="size-3 text-[#cc785c]" />
                                <span>AI Copilot</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#8c867b] block mt-0.5 font-mono">
                            {new Date(order.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        {/* 2. Pembeli & Produk */}
                        <td className="py-3.5 px-5 align-middle max-w-xs">
                          <div className="text-xs font-medium text-[#141413] truncate">
                            {order.buyer_name}
                            <span className="font-mono text-[#8c867b] ml-1.5 font-normal">({order.buyer_phone})</span>
                          </div>
                          <div className="text-[11px] text-[#706c64] truncate mt-0.5">
                            {order.items_snapshot.map((item) => `${item.quantity}x ${item.product_name}`).join(', ')}
                          </div>
                        </td>

                        {/* 3. Status */}
                        <td className="py-3.5 px-5 align-middle whitespace-nowrap">
                          <Badge status={order.status} />
                        </td>

                        {/* 4. Total & Ongkir */}
                        <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                          <span className="font-sans font-semibold text-sm text-[#141413] block">
                            {formatIDR(order.total_amount || order.subtotal)}
                          </span>
                          <span className="text-[10px] text-[#8c867b] block">
                            {order.shipping_fee > 0 ? (
                              `Ongkir ${formatIDR(order.shipping_fee)}`
                            ) : (
                              <span className="text-[#b45309]">Ongkir belum diset</span>
                            )}
                          </span>
                        </td>

                        {/* 5. Aksi */}
                        <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={directWaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 px-2.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
                              title="Chat pembeli di WhatsApp"
                            >
                              <MessageCircle className="size-3.5" />
                              <span>Chat</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => openEditModal(order)}
                              className="h-8 px-2.5 rounded-lg bg-white hover:bg-[#faf8f5] text-[#5c5850] hover:text-[#141413] border border-[#e8e2d9] text-xs font-medium flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                              title="Kelola status pesanan"
                            >
                              <SlidersHorizontal className="size-3" />
                              <span>Kelola</span>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      <OrderEditModal
        order={selectedOrder}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedOrder(null)
        }}
        onSave={handleUpdateOrder}
      />
    </DashboardLayout>
  )
}
