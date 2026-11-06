import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Plus, Search, Tag, Package, ExternalLink, X, Pencil, Trash2, Bot } from 'lucide-react'
import type { Product, Category } from '@/types'
import { api } from '@/lib/supabase'
import { formatIDR, cn } from '@/lib/utils'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useAuthStore } from '@/store/useAuthStore'
import { ProductImageUploader } from '@/components/common/ProductImageUploader'
import {
  ProductStockAndVariants,
  draftToVariantGroups,
  variantGroupsToDraft,
  type VariantGroupDraft,
} from '@/components/dashboard/ProductStockAndVariants'
import { toast } from '@/store/useToastStore'

export function CatalogPage() {
  const { user } = useAuthStore()
  const storeId = user?.storeId || ''
  const storeSlug = user?.storeSlug || ''
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New product inputs
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [categoryName, setCategoryName] = useState('Kemeja Pria')
  const [imageUrl, setImageUrl] = useState('')
  const [manageStock, setManageStock] = useState(false)
  const [stockQuantity, setStockQuantity] = useState('10')
  const [hasVariants, setHasVariants] = useState(false)
  const [variantGroups, setVariantGroups] = useState<VariantGroupDraft[]>([])
  const [aiContext, setAiContext] = useState('')

  // Edit product states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editCategory, setEditCategory] = useState('Kemeja Pria')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editManageStock, setEditManageStock] = useState(false)
  const [editStockQuantity, setEditStockQuantity] = useState('10')
  const [editHasVariants, setEditHasVariants] = useState(false)
  const [editVariantGroups, setEditVariantGroups] = useState<VariantGroupDraft[]>([])
  const [editAiContext, setEditAiContext] = useState('')

  useEffect(() => {
    async function load() {
      if (!storeId) return
      setIsLoading(true)
      try {
        const [prodsData, catsData] = await Promise.all([
          api.getProducts(storeId),
          api.getCategories(storeId),
        ])
        setProducts(prodsData)
        setCategories(catsData)
      } catch (err) {
        console.error('Failed to load products/categories:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [storeId])

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price) return
    if (!storeId) {
      toast.error('Gagal Menambahkan Produk', 'Identitas toko tidak ditemukan. Silakan refresh halaman.')
      return
    }

    setIsSubmitting(true)
    try {
      let catId: string | undefined = undefined
      if (categoryName.trim()) {
        const cat = await api.createCategory(storeId, categoryName.trim())
        if (cat) {
          catId = cat.id
          if (!categories.some((c) => c.id === cat.id)) {
            setCategories((prev) => [...prev, cat])
          }
        }
      }

      const created = await api.createProduct({
        store_id: storeId,
        category_id: catId,
        name: name.trim(),
        description: description.trim(),
        base_price: Number(price),
        image_url:
          imageUrl.trim() ||
          'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
        is_digital: false,
        is_active: true,
        sort_order: products.length + 1,
        stock: manageStock ? (parseInt(stockQuantity, 10) >= 0 ? parseInt(stockQuantity, 10) : 0) : null,
        variant_groups: hasVariants ? draftToVariantGroups(variantGroups) : undefined,
        ai_context: aiContext.trim(),
      })

      setProducts([created, ...products])
      setName('')
      setPrice('')
      setDescription('')
      setImageUrl('')
      setAiContext('')
      setManageStock(false)
      setStockQuantity('10')
      setHasVariants(false)
      setVariantGroups([])
      setIsAddModalOpen(false)
      toast.success('Produk Ditambahkan', `"${created.name}" berhasil disimpan ke katalog tokomu.`)
    } catch (err) {
      console.error('Error adding product', err)
      toast.error('Gagal Menambahkan Produk', 'Silakan coba beberapa saat lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod)
    setEditName(prod.name)
    setEditPrice(String(prod.base_price))
    setEditDesc(prod.description || '')
    const matchedCategory = categories.find((c) => c.id === prod.category_id)
    setEditCategory(matchedCategory ? matchedCategory.name : 'Kemeja Pria')
    setEditImageUrl(prod.image_url || '')
    setEditIsActive(prod.is_active)
    setEditAiContext(prod.ai_context || '')

    const isTrackingStock = prod.stock !== undefined && prod.stock !== null
    setEditManageStock(isTrackingStock)
    setEditStockQuantity(isTrackingStock ? String(prod.stock) : '10')

    const hasV = Boolean(prod.variant_groups && prod.variant_groups.length > 0)
    setEditHasVariants(hasV)
    setEditVariantGroups(variantGroupsToDraft(prod.variant_groups))

    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct || !editName.trim() || !editPrice) return

    setIsSubmitting(true)
    try {
      let catId: string | undefined = undefined
      if (editCategory.trim()) {
        const cat = await api.createCategory(storeId, editCategory.trim())
        if (cat) {
          catId = cat.id
          if (!categories.some((c) => c.id === cat.id)) {
            setCategories((prev) => [...prev, cat])
          }
        }
      }

      const updated = await api.updateProduct(editingProduct.id, {
        category_id: catId,
        name: editName.trim(),
        base_price: Number(editPrice),
        description: editDesc.trim(),
        image_url: editImageUrl.trim() || editingProduct.image_url,
        is_active: editIsActive,
        stock: editManageStock ? (parseInt(editStockQuantity, 10) >= 0 ? parseInt(editStockQuantity, 10) : 0) : null,
        variant_groups: editHasVariants ? draftToVariantGroups(editVariantGroups, editingProduct.id) : [],
        ai_context: editAiContext.trim(),
      })

      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? updated : p))
      )
      setIsEditModalOpen(false)
      setEditingProduct(null)
      toast.success('Perubahan Disimpan', `Rincian produk "${updated.name}" berhasil diperbarui.`)
    } catch (err) {
      console.error('Error updating product', err)
      toast.error('Gagal Menyimpan Perubahan', 'Silakan coba beberapa saat lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini dari katalog?')) return

    try {
      await api.deleteProduct(productId)
      setProducts((prev) => prev.filter((p) => p.id !== productId))
      setIsEditModalOpen(false)
      setEditingProduct(null)
      toast.success('Produk Dihapus', 'Produk berhasil dihapus dari katalog tokomu.')
    } catch (err) {
      console.error('Error deleting product', err)
      toast.error('Gagal Menghapus Produk', 'Tidak dapat menghapus produk saat ini.')
    }
  }

  const filtered = products.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'Kemeja' && p.name.toLowerCase().includes('kemeja')) ||
      (selectedCategory === 'Dress' && p.name.toLowerCase().includes('dress'))

    return matchesSearch && matchesCategory
  })

  return (
    <DashboardLayout onAddProductClick={() => setIsAddModalOpen(true)} isLoading={isLoading}>
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e8e2d9]">
          <div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#141413] tracking-tight">
              Katalog Produk
            </h1>
            <p className="text-xs sm:text-sm text-[#706c64] mt-0.5">
              {products.length} produk siap dipesan pembeli melalui etalase tokomu.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`/${storeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial justify-center h-9 px-3.5 rounded-lg bg-white border border-[#e8e2d9] text-xs font-medium text-[#141413] hover:bg-[#faf8f5] flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <span>Lihat di Etalase</span>
              <ExternalLink className="size-3 text-[#706c64]" />
            </a>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-initial justify-center h-9 px-4 rounded-lg bg-[#cc785c] hover:bg-[#a9583e] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Tambah Produk</span>
            </button>
          </div>
        </div>

        {/* Minimal Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Semua Produk', count: products.length },
              {
                id: 'Kemeja',
                label: 'Kemeja',
                count: products.filter((p) => p.name.toLowerCase().includes('kemeja')).length,
              },
              {
                id: 'Dress',
                label: 'Dress',
                count: products.filter((p) => p.name.toLowerCase().includes('dress')).length,
              },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#141413] text-white'
                      : 'bg-white text-[#706c64] hover:text-[#141413] border border-[#e8e2d9]'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`ml-1.5 text-[10px] font-mono ${isSelected ? 'opacity-70' : 'text-[#8c867b]'}`}>
                    {cat.count}
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
              placeholder="Cari nama produk..."
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

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-white rounded-2xl border border-[#e8e2d9]/60 p-4 flex flex-col justify-between">
                <div className="h-28 bg-[#e8e2d9]/40 rounded-xl" />
                <div className="h-4 bg-[#e8e2d9]/50 rounded w-3/4 mt-3" />
                <div className="h-4 bg-[#e8e2d9]/60 rounded w-1/2 mt-1" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-14 text-center rounded-2xl bg-white border border-[#e8e2d9] shadow-2xs">
            <Package className="size-10 text-[#8c867b]/50 mx-auto mb-2" />
            <p className="font-sans text-lg font-bold text-[#141413]">Belum ada produk</p>
            <p className="text-xs text-[#706c64] mt-1 max-w-sm mx-auto">
              Toko Anda belum memiliki produk di etalase. Mulai tambahkan produk pertama Anda sekarang.
            </p>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#cc785c] text-white text-xs font-semibold hover:bg-[#a9583e] shadow-2xs"
              >
                + Tambah Produk Pertama
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center rounded-2xl bg-white border border-[#e8e2d9] shadow-2xs">
            <Package className="size-10 text-[#8c867b]/50 mx-auto mb-2" />
            <p className="font-sans text-lg font-bold text-[#141413]">Tidak ada produk yang cocok</p>
            <p className="text-xs text-[#706c64] mt-1 max-w-sm mx-auto">
              Tidak ada produk yang cocok dengan pencarian "{searchQuery}" atau kategori yang dipilih.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 rounded-lg border border-[#e8e2d9] bg-white text-xs text-[#5c5850] hover:text-[#141413]"
                >
                  Reset Pencarian
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#cc785c] text-white text-xs font-semibold hover:bg-[#a9583e]"
              >
                + Tambah Produk Baru
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {filtered.map((prod, idx) => (
              <motion.div
                key={prod.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="rounded-xl sm:rounded-2xl border border-[#e8e2d9] bg-white overflow-hidden shadow-2xs hover:shadow-sm hover:border-[#cc785c]/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Clean Image Container */}
                  <div className="aspect-square sm:aspect-video relative overflow-hidden bg-[#faf8f5] border-b border-[#e8e2d9]">
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className={cn(
                        "size-full object-cover group-hover:scale-102 transition-all duration-300",
                        !prod.is_active && "opacity-65 grayscale-[35%]"
                      )}
                    />

                    {/* Subtle status tag ONLY when inactive or out of stock (clean image otherwise) */}
                    {!prod.is_active && (
                      <div className="absolute top-2 sm:top-2.5 left-2 sm:left-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#141413]/75 backdrop-blur-xs text-[#faf8f5] text-[10px] font-medium tracking-wide shadow-2xs">
                          Nonaktif
                        </span>
                      </div>
                    )}

                    {prod.stock !== undefined && prod.stock !== null && prod.stock <= 0 && (
                      <div className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#141413]/80 backdrop-blur-xs text-rose-300 border border-rose-500/20 text-[10px] font-medium tracking-wide shadow-2xs">
                          Habis
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-2.5 sm:p-4 lg:p-5">
                    <h3 className="font-semibold text-xs sm:text-sm text-[#141413] truncate group-hover:text-[#cc785c] transition-colors">
                      {prod.name}
                    </h3>
                    {prod.description && (
                      <p className="text-[11px] sm:text-xs text-[#706c64] mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    )}

                    <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1 sm:gap-1.5">
                      {!prod.is_active && (
                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] bg-[#f2eee9] border border-[#e8e2d9] text-[#8c867b] font-medium">
                          Draft
                        </span>
                      )}
                      {prod.stock !== undefined && prod.stock !== null && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-medium border',
                            prod.stock <= 0
                              ? 'bg-rose-50/70 text-rose-700 border-rose-200/60'
                              : 'bg-white text-[#706c64] border-[#e8e2d9]'
                          )}
                        >
                          <Package
                            className={cn(
                              'size-2 sm:size-2.5',
                              prod.stock <= 0 ? 'text-rose-500' : 'text-[#cc785c]'
                            )}
                          />
                          <span>{prod.stock > 0 ? `${prod.stock} pcs` : 'Stok habis'}</span>
                        </span>
                      )}
                      {prod.variant_groups && prod.variant_groups.length > 0 && prod.variant_groups.map((vg) => (
                        <span
                          key={vg.id}
                          className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] bg-[#faf8f5] border border-[#e8e2d9] text-[#706c64] font-medium"
                        >
                          <Tag className="size-2 sm:size-2.5 text-[#cc785c]" />
                          <span>{vg.name} ({(vg.options?.length ?? (vg as any).variant_options?.length ?? 0)})</span>
                        </span>
                      ))}
                      {prod.ai_context && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] bg-[#faf4ed] border border-[#cc785c]/25 text-[#8c4327] font-medium"
                          title={`Instruksi AI: ${prod.ai_context}`}
                        >
                          <Bot className="size-2 sm:size-2.5 text-[#cc785c]" />
                          <span>AI Dilatih</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer: Price & Edit Action Button */}
                <div className="p-2.5 sm:px-5 sm:py-3 border-t border-[#e8e2d9]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-0 bg-[#faf8f5]/40">
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-[#8c867b] block leading-none">
                      Harga
                    </span>
                    <span className="font-sans font-bold text-xs sm:text-base text-[#141413] tracking-tight block mt-0.5 truncate">
                      {formatIDR(prod.base_price)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(prod)}
                    className="w-full sm:w-auto justify-center h-7 sm:h-8 px-2 sm:px-3 rounded-lg bg-white hover:bg-[#faf8f5] border border-[#e8e2d9] text-[11px] sm:text-xs font-medium text-[#141413] flex items-center gap-1 sm:gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
                    title="Edit rincian dan harga produk"
                  >
                    <Pencil className="size-3 text-[#cc785c]" />
                    <span>Edit</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Produk Baru"
        maxWidth="5xl"
        surface="canvas"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="addCatalogProductForm"
              disabled={isSubmitting}
              className="bg-[#cc785c] hover:bg-[#a9583e] text-white cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan ke Katalog'}
            </Button>
          </div>
        }
      >
        <form id="addCatalogProductForm" onSubmit={handleAddProduct} className="flex flex-col gap-6 text-sm">
          {/* 2-Column Responsive Layout on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Media & Core Fields (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <ProductImageUploader
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
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
                  placeholder="Kemeja Batik Parang Klasik"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141413] block mb-1">
                    Harga (IDR) <span className="text-[#cc785c]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="250000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-sm font-mono text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#141413] block mb-1">
                    Kategori
                  </label>
                  <select
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs cursor-pointer"
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
                  Deskripsi Produk
                </label>
                <textarea
                  rows={3}
                  placeholder="Bahan katun adem, jahitan rapi, motif parang klasik..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-[#e8e2d9] text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#141413]">
                    Konteks Khusus AI (WhatsApp Knowledge)
                  </label>
                  <span className="text-[11px] font-mono text-[#706c64]">Konteks Gemini</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Contoh: Bahan katun endek asli Bali, adem dan tidak luntur. Panduan ukuran: jika BB > 70kg sarankan XL. Garansi tukar size 3 hari."
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs resize-none"
                />
                <p className="text-[11px] text-[#706c64] mt-1">
                  AI akan menyerap info ini saat calon pembeli menanyakan spesifikasi produk lewat WhatsApp.
                </p>
              </div>
            </div>

            {/* Right Column: Stok & Varian Produk (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <ProductStockAndVariants
                manageStock={manageStock}
                onManageStockChange={setManageStock}
                stockQuantity={stockQuantity}
                onStockQuantityChange={setStockQuantity}
                hasVariants={hasVariants}
                onHasVariantsChange={setHasVariants}
                variantGroups={variantGroups}
                onVariantGroupsChange={setVariantGroups}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingProduct(null)
        }}
        title={`Edit Produk: ${editingProduct?.name || ''}`}
        maxWidth="5xl"
        surface="canvas"
        footer={
          <div className="flex items-center justify-between w-full">
            {editingProduct ? (
              <button
                type="button"
                onClick={() => handleDeleteProduct(editingProduct.id)}
                className="text-xs text-[#c5221f] hover:text-red-700 hover:underline flex items-center gap-1.5 cursor-pointer font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 className="size-3.5" />
                <span>Hapus Produk</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingProduct(null)
                }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="editCatalogProductForm"
                disabled={isSubmitting}
                className="bg-[#cc785c] hover:bg-[#a9583e] text-white cursor-pointer"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="editCatalogProductForm" onSubmit={handleSaveEdit} className="flex flex-col gap-6 text-sm">
          {/* 2-Column Responsive Layout on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Media & Core Fields (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <ProductImageUploader
                value={editImageUrl}
                onChange={(url) => setEditImageUrl(url)}
                label="Foto Produk"
                required={false}
                storeId={storeId}
              />

              <div className="p-3 rounded-xl bg-[#faf8f5] border border-[#e8e2d9] flex items-center gap-2.5 shadow-2xs">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="size-4 rounded accent-[#cc785c] cursor-pointer"
                />
                <label htmlFor="editIsActive" className="text-xs text-[#141413] font-medium cursor-pointer select-none">
                  Tampilkan produk ini di etalase toko (Aktif)
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141413] block mb-1">
                  Nama Produk <span className="text-[#cc785c]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141413] block mb-1">
                    Harga Dasar (IDR) <span className="text-[#cc785c]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#e8e2d9] text-sm font-mono text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#141413] block mb-1">
                    Kategori
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs cursor-pointer"
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
                  Deskripsi Produk
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-[#e8e2d9] text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#141413]">
                    Konteks Khusus AI (WhatsApp Knowledge)
                  </label>
                  <span className="text-[11px] font-mono text-[#706c64]">Konteks Gemini</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Contoh: Bahan katun endek asli Bali, adem dan tidak luntur. Panduan ukuran: jika BB > 70kg sarankan XL."
                  value={editAiContext}
                  onChange={(e) => setEditAiContext(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] placeholder:text-[#a09a8f] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs resize-none"
                />
                <p className="text-[11px] text-[#706c64] mt-1">
                  AI akan menyerap info ini saat calon pembeli menanyakan spesifikasi produk lewat WhatsApp.
                </p>
              </div>
            </div>

            {/* Right Column: Stok & Varian Produk (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <ProductStockAndVariants
                manageStock={editManageStock}
                onManageStockChange={setEditManageStock}
                stockQuantity={editStockQuantity}
                onStockQuantityChange={setEditStockQuantity}
                hasVariants={editHasVariants}
                onHasVariantsChange={setEditHasVariants}
                variantGroups={editVariantGroups}
                onVariantGroupsChange={setEditVariantGroups}
              />
            </div>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
