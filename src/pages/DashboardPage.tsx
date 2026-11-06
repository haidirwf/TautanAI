import { useEffect, useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  DollarSign,
  ShoppingBag,
  Users,
  ArrowRight,
  Plus,
  Copy,
  Check,
  Star,
  Bot,
} from 'lucide-react'
import type { DashboardMetrics, Order } from '@/types'
import { api } from '@/lib/supabase'
import { formatIDR } from '@/lib/utils'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { useAuthStore } from '@/store/useAuthStore'
import { ProductImageUploader } from '@/components/common/ProductImageUploader'
import { ProductStockAndVariants, draftToVariantGroups, type VariantGroupDraft } from '@/components/dashboard/ProductStockAndVariants'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { toast } from '@/store/useToastStore'

export function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const navigate = useNavigate()

  // New product form states
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('')
  const [newProdDesc, setNewProdDesc] = useState('')
  const [newProdImage, setNewProdImage] = useState('')
  const [newProdCategory, setNewProdCategory] = useState('Kemeja Pria')
  const [newProdManageStock, setNewProdManageStock] = useState(false)
  const [newProdStockQty, setNewProdStockQty] = useState('10')
  const [newProdHasVariants, setNewProdHasVariants] = useState(false)
  const [newProdVariantGroups, setNewProdVariantGroups] = useState<VariantGroupDraft[]>([])
  const [isSavingProduct, setIsSavingProduct] = useState(false)

  const storeId = user?.storeId || ''
  const storeName = user?.name || 'Toko Saya'
  const storeSlug = user?.storeSlug || ''
  const storeUrl = storeSlug ? `tautan.site/${storeSlug}` : 'tautan.site'

  useEffect(() => {
    if (authLoading) return

    if (isAuthenticated && !user?.isOnboarded && (!user?.storeSlug || !user?.whatsappNumber)) {
      navigate('/onboarding', { replace: true })
      return
    }

    async function loadDashboard() {
      if (!isAuthenticated) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const [metricData, ordersData] = await Promise.all([
          api.getDashboardMetrics(storeId),
          api.getOrders(storeId),
        ])
        setMetrics(metricData)
        setRecentOrders(ordersData.slice(0, 5))
        setTotalCustomers(new Set(ordersData.map((o) => o.buyer_phone).filter(Boolean)).size)
      } catch (err) {
        console.error('Error loading metrics', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboard()
  }, [authLoading, isAuthenticated, user?.isOnboarded, user?.storeSlug, user?.whatsappNumber, storeId, navigate])

  const copyStoreLink = () => {
    navigator.clipboard.writeText(`https://${storeUrl}`)
    setIsLinkCopied(true)
    setTimeout(() => setIsLinkCopied(false), 2000)
  }

  if (authLoading || isLoading || !metrics) {
    return (
      <DashboardLayout isLoading={true}>
        <div className="space-y-6 animate-pulse">
          {/* Subtle skeleton bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e8e2d9]">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-[#e8e2d9]/60 rounded-lg" />
              <div className="h-4 w-72 bg-[#e8e2d9]/40 rounded-md" />
            </div>
            <div className="h-9 w-32 bg-[#e8e2d9]/50 rounded-lg" />
          </div>

          {/* Skeleton Metric Cards */}
          <div className="rounded-2xl border border-[#e8e2d9] bg-[#e8e2d9] overflow-hidden shadow-2xs grid grid-cols-2 lg:grid-cols-4 gap-px">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 sm:p-5 bg-white flex flex-col justify-between h-28">
                <div className="h-4 w-24 bg-[#e8e2d9]/50 rounded" />
                <div className="h-7 w-28 bg-[#e8e2d9]/70 rounded-md mt-2" />
                <div className="h-3 w-20 bg-[#e8e2d9]/40 rounded mt-1" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProdName.trim() || !newProdPrice) return
    if (!storeId) {
      toast.error('Gagal Menyimpan Produk', 'Identitas toko tidak ditemukan. Silakan refresh halaman.')
      return
    }

    setIsSavingProduct(true)
    try {
      const created = await api.createProduct({
        store_id: storeId,
        name: newProdName.trim(),
        base_price: Number(newProdPrice),
        description: newProdDesc.trim(),
        image_url:
          newProdImage.trim() ||
          'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
        is_digital: false,
        is_active: true,
        sort_order: 1,
        stock: newProdManageStock
          ? parseInt(newProdStockQty, 10) >= 0
            ? parseInt(newProdStockQty, 10)
            : 0
          : null,
        variant_groups: newProdHasVariants
          ? draftToVariantGroups(newProdVariantGroups)
          : undefined,
      })

      toast.success(
        'Produk Berhasil Ditambahkan',
        `"${created.name}" seharga ${formatIDR(created.base_price)} siap dipesan di tokomu.`
      )
      setNewProdName('')
      setNewProdPrice('')
      setNewProdDesc('')
      setNewProdImage('')
      setNewProdManageStock(false)
      setNewProdStockQty('10')
      setNewProdHasVariants(false)
      setNewProdVariantGroups([])
      setIsAddProductOpen(false)
    } catch (err) {
      console.error('Gagal menambahkan produk', err)
      toast.error('Gagal Menyimpan Produk', 'Terjadi kendala saat menyimpan produk. Silakan coba lagi.')
    } finally {
      setIsSavingProduct(false)
    }
  }

  return (
    <DashboardLayout onAddProductClick={() => setIsAddProductOpen(true)}>
      <div className="flex flex-col gap-6 sm:gap-7">
        {/* Clean Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 pb-4 sm:pb-5 border-b border-[#e8e2d9]">
          <div>
            <h1 className="font-sans text-xl sm:text-3xl font-bold tracking-tight text-[#141413]">
              {storeName}
            </h1>
            <p className="text-xs sm:text-sm text-[#706c64] mt-0.5 sm:mt-1">
              Pantau performa penjualan harian dan kelola pesanan WhatsApp masuk.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Quick Public URL Pill with Copy button */}
            <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2 h-9 px-3 rounded-lg bg-white border border-[#e8e2d9] text-xs text-[#5c5850] shadow-2xs">
              <span className="font-mono text-xs text-[#706c64]">
                tautan.site/{storeSlug}
              </span>
              <button
                type="button"
                onClick={copyStoreLink}
                className="p-1 rounded-md hover:bg-[#efe9de] text-[#8c867b] hover:text-[#141413] transition-colors cursor-pointer"
                title="Salin tautan toko"
              >
                {isLinkCopied ? (
                  <Check className="size-3.5 text-[#137333]" />
                ) : (
                  <Copy className="size-3.5 text-[#706c64]" />
                )}
              </button>
            </div>

            {/* Asisten AI Quick Button beside store link & tambah produk */}
            <Link
              to="/dashboard/pengaturan"
              className="flex-1 sm:flex-initial h-9 px-3 rounded-lg bg-white hover:bg-[#faf8f5] border border-[#e8e2d9] text-xs font-medium text-[#141413] flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
              title="Kelola Asisten AI WhatsApp"
            >
              <Bot className="size-3.5 text-[#cc785c]" />
              <span className="hidden sm:inline">Asisten AI</span>
              <span className="sm:hidden">AI</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#faf4ed] text-[#8c4327] border border-[#cc785c]/25">
                24/7
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setIsAddProductOpen(true)}
              className="flex-1 sm:flex-initial h-9 px-3.5 sm:px-4 rounded-lg bg-[#cc785c] hover:bg-[#a9583e] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0"
            >
              <Plus className="size-3.5" />
              <span>Tambah Produk</span>
            </button>
          </div>
        </div>

        {/* 4-Metric Connected Bar - Clean, Uniform & Tabular Numbers */}
        <div className="rounded-2xl border border-[#e8e2d9] bg-[#e8e2d9] overflow-hidden shadow-2xs grid grid-cols-2 lg:grid-cols-4 gap-px">
          {/* 1. Pendapatan selesai */}
          <div className="p-3.5 sm:p-5 flex flex-col justify-between bg-white hover:bg-[#faf8f5]/60 transition-colors min-w-0">
            <div className="flex items-center justify-between text-xs text-[#706c64] gap-2">
              <span className="font-medium text-[11px] sm:text-xs truncate">Pendapatan Selesai</span>
              <div className="size-7 sm:size-8 rounded-lg bg-[#faf8f5] border border-[#e8e2d9] flex items-center justify-center text-[#141413] shrink-0">
                <DollarSign className="size-3.5 sm:size-4" />
              </div>
            </div>
            <div className="font-sans font-bold text-lg sm:text-2xl lg:text-3xl text-[#141413] mt-2 sm:mt-3 tracking-tight truncate">
              <AnimatedCounter
                value={metrics.total_settled_revenue}
                formatter={formatIDR}
                duration={1200}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#8c867b] mt-0.5 sm:mt-1 block truncate">
              Transaksi berhasil
            </span>
          </div>

          {/* 2. Pesanan aktif */}
          <div className="p-3.5 sm:p-5 flex flex-col justify-between bg-white hover:bg-[#faf8f5]/60 transition-colors min-w-0">
            <div className="flex items-center justify-between text-xs text-[#706c64] gap-2">
              <span className="font-medium text-[11px] sm:text-xs truncate">Pesanan Aktif</span>
              <div className="size-7 sm:size-8 rounded-lg bg-[#faf8f5] border border-[#e8e2d9] flex items-center justify-center text-[#141413] shrink-0">
                <ShoppingBag className="size-3.5 sm:size-4" />
              </div>
            </div>
            <div className="font-sans font-bold text-lg sm:text-2xl lg:text-3xl text-[#141413] mt-2 sm:mt-3 tracking-tight truncate">
              <AnimatedCounter
                value={metrics.pending_orders_count}
                duration={800}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#8c867b] mt-0.5 sm:mt-1 block truncate">
              Perlu diproses / kirim
            </span>
          </div>

          {/* 3. Pelanggan */}
          <div className="p-3.5 sm:p-5 flex flex-col justify-between bg-white hover:bg-[#faf8f5]/60 transition-colors min-w-0">
            <div className="flex items-center justify-between text-xs text-[#706c64] gap-2">
              <span className="font-medium text-[11px] sm:text-xs truncate">Total Pelanggan</span>
              <div className="size-7 sm:size-8 rounded-lg bg-[#faf8f5] border border-[#e8e2d9] flex items-center justify-center text-[#141413] shrink-0">
                <Users className="size-3.5 sm:size-4" />
              </div>
            </div>
            <div className="font-sans font-bold text-lg sm:text-2xl lg:text-3xl text-[#141413] mt-2 sm:mt-3 tracking-tight truncate">
              <AnimatedCounter
                value={totalCustomers}
                duration={900}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#8c867b] mt-0.5 sm:mt-1 block truncate">
              Kontak WhatsApp
            </span>
          </div>

          {/* 4. Rating & Ulasan Toko */}
          <Link
            to="/dashboard/ulasan"
            className="p-3.5 sm:p-5 flex flex-col justify-between bg-white hover:bg-[#faf8f5]/60 transition-colors group cursor-pointer min-w-0"
          >
            <div className="flex items-center justify-between text-xs text-[#706c64] gap-2">
              <span className="font-medium text-[11px] sm:text-xs group-hover:text-[#cc785c] transition-colors truncate">Ulasan Pembeli</span>
              <div className="size-7 sm:size-8 rounded-lg bg-[#faf8f5] border border-[#e8e2d9] flex items-center justify-center text-amber-500 group-hover:border-[#cc785c]/40 transition-colors shrink-0">
                <Star className="size-3.5 sm:size-4 fill-amber-500" />
              </div>
            </div>
            <div className="font-sans font-bold text-lg sm:text-2xl lg:text-3xl text-[#141413] mt-2 sm:mt-3 tracking-tight flex items-baseline gap-1 truncate">
              <span>{(metrics.total_reviews ?? 0) > 0 && metrics.average_rating ? metrics.average_rating.toFixed(1) : '0.0'}</span>
              <span className="text-xs text-[#8c867b] font-normal">/ 5.0</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#8c867b] mt-0.5 sm:mt-1 block truncate">
              {(metrics.total_reviews ?? 0) > 0 ? `${metrics.total_reviews} ulasan` : '0 ulasan'} &rarr;
            </span>
          </Link>
        </div>

        {/* Tren Pendapatan Mingguan & Bulanan */}
        <RevenueChart
          data={metrics.weekly_revenue_trends || metrics.revenue_trends}
          monthlyData={metrics.monthly_revenue_trends}
        />

        {/* Full-width Pesanan Terbaru Section with Clean Data Table */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-sans text-lg font-bold tracking-tight text-[#141413]">
                Pesanan Terbaru
              </h3>
              <p className="text-xs text-[#706c64] mt-0.5">
                Aktivitas pesanan masuk langsung dari checkout etalase WhatsApp
              </p>
            </div>
            <Link
              to="/dashboard/orders"
              className="text-xs text-[#706c64] hover:text-[#cc785c] transition-colors font-medium flex items-center gap-1 group"
            >
              <span>Buka semua pesanan</span>
              <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-3 bg-white rounded-2xl border border-[#e8e2d9] overflow-hidden shadow-2xs">
            {/* Clean Desktop Table Header (>= lg) */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-2.5 bg-[#faf8f5]/80 border-b border-[#e8e2d9] text-[11px] font-semibold text-[#706c64] uppercase tracking-wider">
              <span className="col-span-5">Pemesan & Rincian</span>
              <span className="col-span-3">Status Transaksi</span>
              <span className="col-span-3 text-right">Total Tagihan</span>
              <span className="col-span-1 text-right">Kelola</span>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8c867b]">
                Belum ada pesanan masuk.
              </div>
            ) : (
              <div className="divide-y divide-[#e8e2d9]">
                {recentOrders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 + idx * 0.03 }}
                    onClick={() => navigate('/dashboard/orders')}
                    className="p-3.5 sm:p-4 lg:px-6 hover:bg-[#faf8f5]/70 transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-2.5 lg:gap-3 lg:items-center cursor-pointer group"
                  >
                    <div className="min-w-0 lg:col-span-5">
                      <div className="flex items-center justify-between lg:justify-start gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#141413] group-hover:text-[#cc785c] transition-colors truncate">
                          {order.buyer_name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-[11px] text-[#8c867b] bg-[#faf8f5] px-1.5 py-0.5 rounded border border-[#e8e2d9]/60">
                            {order.order_code}
                          </span>
                          {order.managed_by_ai && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#faf4ed] text-[#8c4327] border border-[#cc785c]/25 flex items-center gap-1">
                              <Bot className="size-2.5 text-[#cc785c]" />
                              <span>AI Copilot</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[#706c64] mt-0.5 line-clamp-1">
                        {order.items_snapshot.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between lg:col-span-6 lg:grid lg:grid-cols-6 gap-2 pt-1 lg:pt-0 border-t lg:border-t-0 border-[#f2eee9]">
                      <div className="lg:col-span-3 flex items-center">
                        <Badge status={order.status} />
                      </div>

                      <div className="lg:col-span-3 lg:text-right">
                        <span className="font-sans font-bold text-sm text-[#141413]">
                          {formatIDR(order.total_amount || order.subtotal)}
                        </span>
                      </div>
                    </div>

                    <div className="hidden lg:flex lg:col-span-1 items-center justify-end">
                      <span className="text-xs text-[#8c867b] group-hover:text-[#cc785c] flex items-center gap-1 font-medium transition-colors">
                        <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Tambah Produk Baru"
        maxWidth="5xl"
        surface="canvas"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button type="button" variant="secondary" onClick={() => setIsAddProductOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="addDashboardProductForm"
              disabled={isSavingProduct}
              className="bg-[#cc785c] hover:bg-[#a9583e] text-white cursor-pointer"
            >
              {isSavingProduct ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </div>
        }
      >
        <form id="addDashboardProductForm" onSubmit={handleSaveNewProduct} className="flex flex-col gap-6 text-sm">
          {/* 2-Column Responsive Layout on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Media & Core Fields (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <ProductImageUploader
                value={newProdImage}
                onChange={(url) => setNewProdImage(url)}
                label="Foto Produk"
                required={false}
                storeId={storeId}
              />

              <div>
                <label className="text-xs font-semibold text-[#141413] block mb-1">
                  Nama Produk <span className="text-[#cc785c]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kemeja Batik Parang Modern"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141413] block mb-1">
                    Harga Satuan (IDR) <span className="text-[#cc785c]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="250000"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-sm font-mono text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#141413] block mb-1">
                    Kategori
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] shadow-2xs cursor-pointer"
                  >
                    <option value="Kemeja Pria">Kemeja Pria</option>
                    <option value="Dress Wanita">Dress Wanita</option>
                    <option value="Aksesoris & Tas">Aksesoris & Tas</option>
                    <option value="Kuliner & F&B">Kuliner & F&B</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141413] block mb-1">
                  Deskripsi Singkat (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Bahan katun primisima adem, jahitan halus, nyaman dipakai harian..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-[#e8e2d9] text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] shadow-2xs resize-none"
                />
              </div>
            </div>

            {/* Right Column: Stok & Varian Produk (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <ProductStockAndVariants
                manageStock={newProdManageStock}
                onManageStockChange={setNewProdManageStock}
                stockQuantity={newProdStockQty}
                onStockQuantityChange={setNewProdStockQty}
                hasVariants={newProdHasVariants}
                onHasVariantsChange={setNewProdHasVariants}
                variantGroups={newProdVariantGroups}
                onVariantGroupsChange={setNewProdVariantGroups}
              />
            </div>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
