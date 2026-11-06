import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function verify() {
  const email = process.env.SEED_EMAIL || 'user@tautan.site'
  const password = process.env.SEED_PASSWORD || 'siswa123'
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  const user = signInData.user
  console.log('User logged in:', user.email)

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  console.log('Store:', {
    name: store.name,
    slug: store.slug,
    is_onboarded: store.is_onboarded,
    whatsapp_number: store.whatsapp_number,
  })

  const { data: products } = await supabase
    .from('products')
    .select('name, base_price, stock')
    .eq('store_id', store.id)

  console.log('Products Count:', products.length)
  products.forEach((p) => console.log(` - ${p.name}: Rp ${p.base_price.toLocaleString('id-ID')} (Stok: ${p.stock})`))

  const { data: orders } = await supabase
    .from('orders')
    .select('order_code, buyer_name, total_amount, status')
    .eq('store_id', store.id)

  console.log('Orders Count:', orders.length)
  let settled = 0
  let pendingOrders = 0
  const paidStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED']
  orders.forEach((o) => {
    if (paidStatuses.includes(o.status)) settled += o.total_amount
    if (o.status === 'PENDING_WA') pendingOrders += 1
    console.log(` - [${o.status}] ${o.order_code} (${o.buyer_name}): Rp ${o.total_amount.toLocaleString('id-ID')}`)
  })

  const { data: reviews } = await supabase
    .from('reviews')
    .select('buyer_name, rating, comment')
    .eq('store_id', store.id)

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
  console.log('Reviews Count:', reviews.length, 'Average Rating:', avgRating)

  console.log('=== METRICS SUMMARY ===')
  console.log('Pendapatan Selesai (Settled):', `Rp ${settled.toLocaleString('id-ID')}`)
  console.log('Pesanan Aktif (Pending):', pendingOrders)
  console.log('Total Ulasan:', reviews.length, `(${avgRating} / 5.0)`)
}

verify().catch(console.error)
