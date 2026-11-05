export type OrderStatus =
  | 'PENDING_WA'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface Store {
  id: string
  slug: string
  name: string
  tagline: string
  avatar_url: string
  whatsapp_number: string
  is_onboarded?: boolean
  ai_enabled?: boolean
  ai_persona?: string
  ai_instructions?: string
  ai_payment_info?: string
  ai_model?: string
  fonnte_token?: string
  created_at?: string
  updated_at?: string
}

export interface StoreLink {
  id: string
  store_id: string
  title: string
  url: string
  icon?: string
  sort_order: number
}

export interface Category {
  id: string
  store_id: string
  name: string
  sort_order: number
}

export interface VariantOption {
  id: string
  group_id: string
  name: string
  price_delta: number
  sort_order: number
}

export interface VariantGroup {
  id: string
  product_id: string
  name: string
  sort_order: number
  options: VariantOption[]
}

export interface Product {
  id: string
  store_id: string
  category_id?: string | null
  name: string
  description: string
  base_price: number // in IDR
  image_url: string
  is_digital: boolean
  is_active: boolean
  sort_order: number
  stock?: number | null // null or undefined means unlimited / selalu tersedia
  variant_groups?: VariantGroup[]
  ai_context?: string // Catatan/pengetahuan mendalam khusus untuk AI (cara pakai, bahan, rekomendasi ukuran, dsb)
}

export interface CartItem {
  id: string // unique item key: productId + variant selections
  product: Product
  selectedVariants: Record<string, VariantOption> // groupName -> selected option
  unitPrice: number
  quantity: number
}

export interface OrderItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
  variants?: Record<string, string> // e.g. { "Ukuran": "XL", "Warna": "Hitam" }
}

export interface Order {
  id: string
  store_id: string
  order_code: string
  buyer_name: string
  buyer_phone: string
  shipping_address: string
  order_notes?: string
  subtotal: number
  shipping_fee: number
  total_amount: number
  payment_method: string
  status: OrderStatus
  courier_name?: string
  tracking_number?: string
  seller_internal_note?: string
  managed_by_ai?: boolean
  ai_summary?: string
  payment_proof_url?: string
  items_snapshot: OrderItem[]
  paid_at?: string | null
  shipped_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at?: string
}

export interface AIChatMessage {
  id?: string
  store_id: string
  buyer_phone: string
  role: 'user' | 'model' | 'system'
  content: string
  created_at?: string
}

export interface DashboardMetrics {
  total_settled_revenue: number
  pending_revenue: number
  total_checkouts: number
  paid_orders_count: number
  pending_orders_count: number
  conversion_rate: number
  aov: number
  revenue_trends: {
    date: string
    settled: number
    pending: number
  }[]
  weekly_revenue_trends?: {
    date: string
    settled: number
    pending: number
  }[]
  monthly_revenue_trends?: {
    date: string
    settled: number
    pending: number
  }[]
  payment_distribution: {
    method: string
    count: number
    percentage: number
  }[]
  average_rating?: number
  total_reviews?: number
}

export interface Review {
  id: string
  store_id: string
  order_id?: string
  buyer_name: string
  rating: number // 1 to 5
  comment: string
  created_at: string
}
