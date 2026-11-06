import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import type { Store, StoreLink, Category, Product } from '@/types'
import { api } from '@/lib/supabase'
import { StoreHeader } from '@/components/storefront/StoreHeader'
import { ProductCard } from '@/components/storefront/ProductCard'
import { CartDrawer } from '@/components/storefront/CartDrawer'
import { TopProgressBar } from '@/components/ui/TopProgressBar'
import { Search, ShoppingBag } from 'lucide-react'

export function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>()
  const storeSlug = slug || ''

  const [store, setStore] = useState<Store | null>(null)
  const [links, setLinks] = useState<StoreLink[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadStoreData() {
      setIsLoading(true)
      try {
        const storeData = await api.getStoreBySlug(storeSlug)
        if (storeData) {
          setStore(storeData)
          const [linksData, catsData, prodsData] = await Promise.all([
            api.getStoreLinks(storeData.id),
            api.getCategories(storeData.id),
            api.getProducts(storeData.id, true),
          ])
          setLinks(linksData)
          setCategories(catsData)
          setProducts(prodsData)
        }
      } catch (err) {
        console.error('Failed to load store data', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadStoreData()
  }, [storeSlug])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopProgressBar isLoading={true} />
        {/* Subtle silhouette placeholder without circular spinners */}
        <div className="max-w-md mx-auto px-4 pt-16 text-center animate-pulse">
          <div className="size-20 rounded-full bg-[#e8e2d9]/60 mx-auto mb-4" />
          <div className="h-6 bg-[#e8e2d9]/60 rounded-lg w-44 mx-auto mb-2" />
          <div className="h-4 bg-[#e8e2d9]/40 rounded-md w-60 mx-auto" />
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 text-center">
        <h2 className="font-sans text-2xl sm:text-3xl font-bold text-ink">Toko Tidak Ditemukan</h2>
        <p className="text-sm text-muted mt-2">
          Toko dengan tautan <code className="font-mono text-primary">tautanAI/{storeSlug}</code> belum terdaftar.
        </p>
      </div>
    )
  }

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchCategory =
      selectedCategory === 'all' ||
      selectedCategory === 'cat-all' ||
      p.category_id === selectedCategory
    const matchSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <div className="min-h-screen bg-canvas text-ink pb-24">
      {/* Brand Header */}
      <StoreHeader store={store} links={links} />

      {/* Main Micro-Catalogue Content */}
      <main className="max-w-3xl mx-auto px-4 mt-6">
        {products.length === 0 ? (
          <div className="py-16 px-6 text-center rounded-2xl bg-surface-card border border-hairline shadow-2xs max-w-md mx-auto my-6">
            <div className="size-12 rounded-2xl bg-canvas border border-hairline flex items-center justify-center text-muted mx-auto mb-3.5">
              <ShoppingBag className="size-6 text-primary" />
            </div>
            <h3 className="font-sans text-base sm:text-lg font-bold text-ink">
              Belum ada apa-apa di sini
            </h3>
            <p className="text-xs sm:text-sm text-muted mt-1.5 leading-relaxed">
              Pemilik toko belum menambahkan produk ke etalase ini. Silakan cek kembali nanti atau hubungi penjual via WhatsApp.
            </p>
            {store.whatsapp_number && (
              <a
                href={`https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(`Halo ${store.name}, saya melihat toko Anda di tautanAI/${storeSlug}. Mau tanya apakah ada info produk terbaru?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <span>Hubungi via WhatsApp</span>
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Search & Category Filter Pills */}
            <div className="flex flex-col gap-3 mb-6">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
                <input
                  type="text"
                  placeholder="Cari produk di katalog..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-card border border-hairline text-sm text-ink placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Category Filter Pills */}
              {categories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === 'all'
                        ? 'bg-[#141413] text-white shadow-xs'
                        : 'bg-white text-[#5c5850] hover:text-[#141413] border border-[#e8e2d9] hover:bg-[#faf8f5]'
                    }`}
                  >
                    <span>Semua ({products.length})</span>
                  </button>
                  {categories
                    .filter((c) => c.id !== 'cat-all')
                    .map((category) => {
                      const count = products.filter((p) => p.category_id === category.id).length
                      const isSelected = selectedCategory === category.id
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setSelectedCategory(category.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#141413] text-white shadow-xs'
                              : 'bg-white text-[#5c5850] hover:text-[#141413] border border-[#e8e2d9] hover:bg-[#faf8f5]'
                          }`}
                        >
                          <span>{category.name}</span>
                          <span className={`ml-1.5 text-[10px] font-mono ${isSelected ? 'opacity-70' : 'text-[#8c867b]'}`}>
                            ({count})
                          </span>
                        </button>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Section Title */}
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-sans text-xl font-bold tracking-tight text-ink">
                Katalog Produk
              </h2>
              <span className="text-xs text-muted font-mono">
                {filteredProducts.length} barang tersedia
              </span>
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-surface-card border border-hairline">
                <p className="font-sans text-base font-bold text-ink">Tidak ada produk yang cocok</p>
                <p className="text-xs text-muted mt-1">
                  Coba kata kunci lain atau pilih kategori yang berbeda.
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-2 gap-2.5 sm:gap-4"
              >
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Floating Cart Drawer */}
      <CartDrawer store={store} />
    </div>
  )
}
