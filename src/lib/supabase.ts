import { createClient } from '@supabase/supabase-js'
import type { Store, StoreLink, Category, Product, VariantGroup, VariantOption, Order, OrderStatus, DashboardMetrics, Review } from '@/types'
import { generateOrderCode } from '@/lib/utils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function formatProductFromDb(raw: any): Product {
  const rawGroups = raw.variant_groups || []
  const variant_groups: VariantGroup[] = rawGroups.map((vg: any) => {
    const rawOpts = vg.options || vg.variant_options || []
    const options: VariantOption[] = rawOpts.map((opt: any) => ({
      id: opt.id,
      group_id: opt.group_id,
      name: opt.name,
      price_delta: Number(opt.price_delta) || 0,
      sort_order: Number(opt.sort_order) || 0,
    }))
    return {
      id: vg.id,
      product_id: vg.product_id,
      name: vg.name,
      sort_order: Number(vg.sort_order) || 0,
      options,
    }
  })

  return {
    ...raw,
    variant_groups,
  }
}

const STORAGE_KEYS = {
  STORE: 'tautan_store_data',
  ORDERS: 'tautan_orders_data',
  PRODUCTS: 'tautan_products_data',
  REVIEWS: 'tautan_reviews_data',
}

/**
 * Utility to completely clear local storage mock/dump cache
 */
export function clearAllDumpData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.STORE)
    localStorage.removeItem(STORAGE_KEYS.ORDERS)
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS)
    localStorage.removeItem(STORAGE_KEYS.REVIEWS)
    localStorage.removeItem('auth-storage')

    // Clean any lingering keys starting with tautan_
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('tautan_') || key.startsWith('sb-') || key === 'auth-storage') {
        localStorage.removeItem(key)
      }
    })
  } catch (e) {
    console.error('Failed to clear dump data from localStorage', e)
  }
}

function getStoredReviews(): Review[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error('Error reading localStorage reviews', e)
  }
  return []
}

function saveStoredReviews(reviews: Review[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews))
  } catch (e) {
    console.error('Error saving localStorage reviews', e)
  }
}

function getStoredOrders(): Order[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error('Error reading localStorage orders', e)
  }
  return []
}

function saveStoredOrders(orders: Order[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders))
  } catch (e) {
    console.error('Error saving localStorage orders', e)
  }
}

function getStoredProducts(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error('Error reading localStorage products', e)
  }
  return []
}

function saveStoredProducts(products: Product[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products))
  } catch (e) {
    console.error('Error saving localStorage products', e)
  }
}

// Data Access Service (Pure Supabase with Clean Fallback)
export const api = {
  async getStoreBySlug(slug: string): Promise<Store | null> {
    if (isSupabaseConfigured && supabase) {
      // Exclude sensitive merchant credentials (fonnte_token, ai_instructions, etc.) from public storefront queries
      const { data, error } = await supabase
        .from('stores')
        .select('id, user_id, slug, name, tagline, avatar_url, whatsapp_number, created_at, updated_at')
        .eq('slug', slug)
        .single()
      if (error) return null
      return data as Store
    }
    return null
  },

  async getStoreByUserId(userId: string): Promise<Store | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) return null
      return data
    }
    return null
  },

  async saveStoreOnboarding({
    userId,
    name,
    slug,
    whatsappNumber,
    tagline,
  }: {
    userId: string
    name: string
    slug: string
    whatsappNumber: string
    tagline: string
  }): Promise<Store> {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    let cleanWa = whatsappNumber.replace(/[^0-9]/g, '')
    if (cleanWa.startsWith('0')) {
      cleanWa = '62' + cleanWa.slice(1)
    }

    if (isSupabaseConfigured && supabase) {
      const { data: existingStore } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existingStore) {
        const { data, error } = await supabase
          .from('stores')
          .update({
            name: name.trim(),
            slug: cleanSlug,
            whatsapp_number: cleanWa,
            tagline: tagline.trim(),
            is_onboarded: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingStore.id)
          .select()
          .single()

        if (error) {
          if (error.code === '23505' || error.message?.includes('slug')) {
            throw new Error(`Tautan 'tautan.site/${cleanSlug}' sudah dipakai toko lain. Silakan gunakan variasi nama lain.`)
          }
          throw error
        }
        return data
      } else {
        const { data, error } = await supabase
          .from('stores')
          .insert([
            {
              user_id: userId,
              name: name.trim(),
              slug: cleanSlug,
              whatsapp_number: cleanWa,
              tagline: tagline.trim(),
              is_onboarded: true,
            },
          ])
          .select()
          .single()

        if (error) {
          if (error.code === '23505' || error.message?.includes('slug')) {
            throw new Error(`Tautan 'tautan.site/${cleanSlug}' sudah dipakai toko lain. Silakan gunakan variasi nama lain.`)
          }
          throw error
        }
        return data
      }
    }

    return {
      id: 'store-' + Date.now(),
      slug: cleanSlug,
      name: name.trim(),
      tagline: tagline.trim(),
      avatar_url: '',
      whatsapp_number: cleanWa,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },

  async updateStore(storeId: string, updates: Partial<Store>): Promise<Store> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stores')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', storeId)
        .select()
        .single()
      if (error) throw error
      return data
    }
    return {
      id: storeId,
      slug: '',
      name: '',
      tagline: '',
      avatar_url: '',
      whatsapp_number: '',
      ...updates,
    }
  },

  async uploadProductImage(file: Blob | File, storeId?: string): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const fileExt = 'webp'
      const fileName = `${storeId || 'common'}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (error) {
        throw error
      }

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path)

      return publicUrlData.publicUrl
    }
    throw new Error('Supabase client tidak terkonfigurasi')
  },

  async getStoreLinks(storeId: string): Promise<StoreLink[]> {
    if (isSupabaseConfigured && supabase && storeId) {
      const { data } = await supabase
        .from('store_links')
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: true })
      return data || []
    }
    return []
  },

  async createStoreLink(storeId: string, title: string, url: string): Promise<StoreLink | null> {
    if (isSupabaseConfigured && supabase && storeId) {
      const { data, error } = await supabase
        .from('store_links')
        .insert([{
          store_id: storeId,
          title: title.trim(),
          url: url.trim(),
        }])
        .select()
        .single()
      if (!error && data) return data
    }
    return null
  },

  async deleteStoreLink(linkId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase && linkId) {
      const { error } = await supabase.from('store_links').delete().eq('id', linkId)
      return !error
    }
    return false
  },

  async getCategories(storeId: string): Promise<Category[]> {
    if (isSupabaseConfigured && supabase && storeId) {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: true })
      return data || []
    }
    return []
  },

  async createCategory(storeId: string, name: string): Promise<Category | null> {
    if (isSupabaseConfigured && supabase && storeId && name) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId)
        .ilike('name', name.trim())
        .maybeSingle()
      if (existing) return existing

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          store_id: storeId,
          name: name.trim(),
          sort_order: 1,
        }])
        .select()
        .single()
      if (!error && data) return data
    }
    return null
  },

  async getProducts(storeId: string, onlyActive: boolean = false): Promise<Product[]> {
    if (!storeId) return []
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('products')
        .select('*, variant_groups(*, variant_options(*))')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: true })

      if (onlyActive) {
        query = query.eq('is_active', true)
      }

      const { data } = await query
      return (data || []).map(formatProductFromDb)
    }
    return getStoredProducts().filter((p) => p.store_id === storeId && (!onlyActive || p.is_active))
  },

  async createProduct(productInput: Omit<Product, 'id'>): Promise<Product> {
    const { variant_groups, ...dbFields } = productInput

    if (isSupabaseConfigured && supabase) {
      // 1. Insert product into Supabase products table
      const { data: createdProduct, error } = await supabase
        .from('products')
        .insert([{
          store_id: dbFields.store_id,
          category_id: dbFields.category_id || null,
          name: dbFields.name.trim(),
          description: dbFields.description?.trim() || '',
          base_price: dbFields.base_price,
          image_url: dbFields.image_url || '',
          stock: dbFields.stock !== undefined ? dbFields.stock : null,
          is_digital: dbFields.is_digital ?? false,
          is_active: dbFields.is_active ?? true,
          sort_order: dbFields.sort_order ?? 1,
          ai_context: dbFields.ai_context?.trim() || '',
        }])
        .select()
        .single()

      if (error) {
        console.error('Error inserting product into Supabase:', error)
        throw error
      }

      // 2. If variants exist, insert into variant_groups & variant_options
      if (createdProduct && variant_groups && variant_groups.length > 0) {
        for (let gIdx = 0; gIdx < variant_groups.length; gIdx++) {
          const group = variant_groups[gIdx]
          const { data: createdGroup, error: groupErr } = await supabase
            .from('variant_groups')
            .insert([{
              product_id: createdProduct.id,
              name: group.name,
              sort_order: gIdx + 1,
            }])
            .select()
            .single()

          if (!groupErr && createdGroup && group.options && group.options.length > 0) {
            const optionsToInsert = group.options.map((opt, oIdx) => ({
              group_id: createdGroup.id,
              name: opt.name,
              price_delta: opt.price_delta || 0,
              sort_order: oIdx + 1,
            }))
            await supabase.from('variant_options').insert(optionsToInsert)
          }
        }
      }

      return {
        ...createdProduct,
        variant_groups: variant_groups || [],
      }
    }

    const newProd: Product = {
      ...productInput,
      id: 'prod-' + Date.now(),
      is_active: productInput.is_active ?? true,
      sort_order: productInput.sort_order ?? 1,
    }
    const current = getStoredProducts()
    const updated = [newProd, ...current]
    saveStoredProducts(updated)
    return newProd
  },

  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    const { variant_groups, ...dbFields } = updates

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .update(dbFields)
        .eq('id', productId)
        .select()
        .single()

      if (error) {
        console.error('Error updating product in Supabase:', error)
        throw error
      }

      // Sync variants if explicitly provided
      if (variant_groups !== undefined) {
        // Remove existing variant groups for this product (cascades to options)
        await supabase.from('variant_groups').delete().eq('product_id', productId)

        if (variant_groups.length > 0) {
          for (let gIdx = 0; gIdx < variant_groups.length; gIdx++) {
            const group = variant_groups[gIdx]
            const { data: createdGroup, error: groupErr } = await supabase
              .from('variant_groups')
              .insert([{
                product_id: productId,
                name: group.name,
                sort_order: gIdx + 1,
              }])
              .select()
              .single()

            if (!groupErr && createdGroup && group.options && group.options.length > 0) {
              const optionsToInsert = group.options.map((opt, oIdx) => ({
                group_id: createdGroup.id,
                name: opt.name,
                price_delta: opt.price_delta || 0,
                sort_order: oIdx + 1,
              }))
              await supabase.from('variant_options').insert(optionsToInsert)
            }
          }
        }
      }

      // Re-fetch product with newly nested variant groups & options
      const { data: refreshed } = await supabase
        .from('products')
        .select('*, variant_groups(*, variant_options(*))')
        .eq('id', productId)
        .single()

      return refreshed ? formatProductFromDb(refreshed) : { ...data, variant_groups: variant_groups || [] }
    }

    const current = getStoredProducts()
    const index = current.findIndex((p) => p.id === productId)
    if (index !== -1) {
      const updatedProduct = { ...current[index], ...updates }
      current[index] = updatedProduct
      saveStoredProducts(current)
      return updatedProduct
    }
    throw new Error('Product not found')
  },

  async deleteProduct(productId: string): Promise<void> {
    const current = getStoredProducts()
    const filtered = current.filter((p) => p.id !== productId)
    saveStoredProducts(filtered)

    if (isSupabaseConfigured && supabase) {
      await supabase.from('products').delete().eq('id', productId)
    }
  },

  async createOrder(orderInput: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`
    let activeOrderCode = orderInput.order_code || generateOrderCode()
    const newOrder: Order = {
      ...orderInput,
      id: generatedId,
      order_code: activeOrderCode,
      created_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase) {
      let attempts = 0
      let insertSuccess = false
      let insertedData: any = null

      while (attempts < 3 && !insertSuccess) {
        attempts++
        const { data, error } = await supabase
          .from('orders')
          .insert([{
            store_id: newOrder.store_id,
            order_code: activeOrderCode,
            buyer_name: newOrder.buyer_name,
            buyer_phone: newOrder.buyer_phone,
            shipping_address: newOrder.shipping_address,
            order_notes: newOrder.order_notes || '',
            subtotal: newOrder.subtotal,
            shipping_fee: newOrder.shipping_fee || 0,
            total_amount: newOrder.total_amount,
            payment_method: newOrder.payment_method || 'PENDING_WA',
            status: 'PENDING_WA',
            items_snapshot: newOrder.items_snapshot,
          }])
          .select()
          .single()

        if (!error && data) {
          insertSuccess = true
          insertedData = data
          break
        }

        // Retry with fresh order code if unique constraint collision occurred
        if (error && (error.code === '23505' || error.message?.includes('order_code'))) {
          activeOrderCode = generateOrderCode()
          newOrder.order_code = activeOrderCode
        } else {
          console.warn('Supabase createOrder error, falling back to local storage:', error)
          break
        }
      }

      // Decrement product stock if managed
      if (insertSuccess && newOrder.items_snapshot && Array.isArray(newOrder.items_snapshot)) {
        for (const item of newOrder.items_snapshot) {
          if (item.product_id) {
            try {
              const { data: prod } = await supabase
                .from('products')
                .select('stock')
                .eq('id', item.product_id)
                .single()

              if (prod && prod.stock !== null && prod.stock !== undefined) {
                const nextStock = Math.max(0, Number(prod.stock) - Number(item.quantity || 1))
                await supabase.from('products').update({ stock: nextStock }).eq('id', item.product_id)
              }
            } catch (stockErr) {
              console.warn('Error adjusting product stock on checkout:', stockErr)
            }
          }
        }
        return insertedData
      }
    }

    // LocalStorage fallback with local stock decrement
    const products = getStoredProducts()
    if (newOrder.items_snapshot && Array.isArray(newOrder.items_snapshot)) {
      for (const item of newOrder.items_snapshot) {
        const prod = products.find((p) => p.id === item.product_id)
        if (prod && prod.stock !== null && prod.stock !== undefined) {
          prod.stock = Math.max(0, prod.stock - Number(item.quantity || 1))
        }
      }
      saveStoredProducts(products)
    }

    const orders = getStoredOrders()
    const updated = [newOrder, ...orders]
    saveStoredOrders(updated)
    return newOrder
  },

  async getOrders(storeId: string): Promise<Order[]> {
    if (!storeId) return []
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
      return data || []
    }
    return getStoredOrders().filter((o) => o.store_id === storeId)
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    extra?: Partial<Order>
  ): Promise<Order> {
    const patch: Partial<Order> = {
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    }

    if (status === 'PAID' && !patch.paid_at) {
      patch.paid_at = new Date().toISOString()
    } else if (status === 'SHIPPED' && !patch.shipped_at) {
      patch.shipped_at = new Date().toISOString()
    } else if (status === 'COMPLETED' && !patch.completed_at) {
      patch.completed_at = new Date().toISOString()
    }

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('orders')
        .update(patch)
        .eq('id', orderId)
        .select()
        .single()
      if (data) return data
    }

    // Local update
    const orders = getStoredOrders()
    const index = orders.findIndex((o) => o.id === orderId)
    if (index !== -1) {
      const updatedOrder = { ...orders[index], ...patch }
      if (extra?.shipping_fee !== undefined) {
        updatedOrder.total_amount = updatedOrder.subtotal + extra.shipping_fee
      }
      orders[index] = updatedOrder
      saveStoredOrders(orders)
      return updatedOrder
    }
    throw new Error('Order not found')
  },

  async notifyCustomerOrderStatus({
    orderId,
    orderCode,
    newStatus,
    courierName,
    trackingNumber,
    sellerNote,
  }: {
    orderId?: string
    orderCode?: string
    newStatus: OrderStatus
    courierName?: string
    trackingNumber?: string
    sellerNote?: string
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderCode,
          newStatus,
          courierName,
          trackingNumber,
          sellerNote,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data
      }
      const errData = await res.json().catch(() => null)
      return { success: false, message: errData?.error || 'Gagal mengirim notifikasi status' }
    } catch (e: any) {
      console.warn('API /api/notify request error:', e)
      return { success: false, message: e.message || 'Koneksi pengiriman notifikasi terputus' }
    }
  },

  async getDashboardMetrics(storeId: string): Promise<DashboardMetrics> {
    const orders = await this.getOrders(storeId)

    const paidStatuses: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED']

    let total_settled_revenue = 0
    let pending_revenue = 0
    let paid_orders_count = 0
    let pending_orders_count = 0
    const methodCounts: Record<string, number> = {}

    for (const order of orders) {
      if (paidStatuses.includes(order.status)) {
        total_settled_revenue += order.total_amount || order.subtotal
        paid_orders_count += 1
      } else if (order.status === 'PENDING_WA') {
        pending_revenue += order.subtotal
        pending_orders_count += 1
      }

      const method = order.payment_method || 'Transfer Bank'
      methodCounts[method] = (methodCounts[method] || 0) + 1
    }

    const total_checkouts = orders.length
    const conversion_rate = total_checkouts > 0 ? (paid_orders_count / total_checkouts) * 100 : 0
    const aov = paid_orders_count > 0 ? total_settled_revenue / paid_orders_count : 0

    // Payment distribution
    const payment_distribution = Object.entries(methodCounts).map(([method, count]) => ({
      method,
      count,
      percentage: total_checkouts > 0 ? Math.round((count / total_checkouts) * 100) : 0,
    }))

    // 7-day weekly revenue trend from actual orders
    const now = new Date()
    const weekly_revenue_trends = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime()
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime()

      let settled = 0
      let pending = 0
      for (const order of orders) {
        const orderTime = new Date(order.created_at).getTime()
        if (orderTime >= dayStart && orderTime <= dayEnd) {
          if (paidStatuses.includes(order.status)) {
            settled += order.total_amount || order.subtotal
          } else if (order.status === 'PENDING_WA') {
            pending += order.subtotal
          }
        }
      }
      return { date: dateStr, settled, pending }
    })

    // 6-month monthly revenue trend
    const monthly_revenue_trends = Array.from({ length: 6 }, (_, i) => {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const dateStr = targetDate.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0).getTime()
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

      let settled = 0
      let pending = 0
      for (const order of orders) {
        const orderTime = new Date(order.created_at).getTime()
        if (orderTime >= monthStart && orderTime <= monthEnd) {
          if (paidStatuses.includes(order.status)) {
            settled += order.total_amount || order.subtotal
          } else if (order.status === 'PENDING_WA') {
            pending += order.subtotal
          }
        }
      }
      return { date: dateStr, settled, pending }
    })

    const reviews = await this.getReviews(storeId)
    const totalRatingSum = reviews.reduce((sum, r) => sum + r.rating, 0)
    const average_rating = reviews.length > 0 ? Number((totalRatingSum / reviews.length).toFixed(1)) : 0
    const total_reviews = reviews.length

    return {
      total_settled_revenue,
      pending_revenue,
      total_checkouts,
      paid_orders_count,
      pending_orders_count,
      conversion_rate,
      aov,
      revenue_trends: weekly_revenue_trends,
      weekly_revenue_trends,
      monthly_revenue_trends,
      payment_distribution,
      average_rating,
      total_reviews,
    }
  },

  async getReviews(storeId: string): Promise<Review[]> {
    if (!storeId) return []
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
      if (error) {
        return []
      }
      return data || []
    }
    return getStoredReviews().filter((r) => r.store_id === storeId)
  },

  async createReview(input: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
    const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rev-${Date.now()}`
    const newRev: Review = {
      ...input,
      id: generatedId,
      created_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase) {
      // Validate order_id: must be a valid UUID format or null
      const isValidUuid = (str?: string) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          store_id: input.store_id,
          order_id: isValidUuid(input.order_id) ? input.order_id : null,
          buyer_name: input.buyer_name,
          rating: input.rating,
          comment: input.comment,
        }])
        .select()
        .single()

      if (!error && data) return data
      if (error) {
        console.warn('Supabase createReview error, falling back to local storage:', error)
      }
    }

    const current = getStoredReviews()
    const updated = [newRev, ...current]
    saveStoredReviews(updated)

    return newRev
  },
}
