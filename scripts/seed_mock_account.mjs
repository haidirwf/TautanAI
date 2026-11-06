import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function seed() {
  const email = process.env.SEED_EMAIL || 'user@tautan.site'
  const password = process.env.SEED_PASSWORD || 'siswa123'
  console.log(`--- 1. Authenticating ${email} ---`)

  let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    console.log('SignIn failed, attempting signUp...', signInError.message)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: 'Batik Nusantara Official',
          store_slug: 'batik-nusantara',
          whatsapp_number: '6281234567890',
          tagline: 'Koleksi Batik Tulis & Tenun Warisan Nusantara Terkurasi',
        },
      },
    })
    if (signUpError) {
      throw new Error(`SignUp failed: ${signUpError.message}`)
    }
    signInData = signUpData
  }

  const user = signInData.user
  console.log('Logged in User ID:', user.id)

  // 2. Fetch or update store
  console.log('--- 2. Setting up store profile ---')
  let { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!store) {
    const { data: newStore, error: createStoreErr } = await supabase
      .from('stores')
      .insert([
        {
          user_id: user.id,
          name: 'Batik Nusantara Official',
          slug: 'batik-nusantara',
          whatsapp_number: '6281234567890',
          tagline: 'Koleksi Batik Tulis & Tenun Warisan Nusantara Terkurasi',
          is_onboarded: true,
        },
      ])
      .select()
      .single()
    if (createStoreErr) throw createStoreErr
    store = newStore
  } else {
    const { data: updatedStore, error: updateStoreErr } = await supabase
      .from('stores')
      .update({
        name: 'Batik Nusantara Official',
        slug: 'batik-nusantara',
        whatsapp_number: '6281234567890',
        tagline: 'Koleksi Batik Tulis & Tenun Warisan Nusantara Terkurasi',
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id)
      .select()
      .single()
    if (updateStoreErr) throw updateStoreErr
    store = updatedStore
  }

  const storeId = store.id
  console.log('Store Profile Ready:', store.name, `(ID: ${storeId}, Slug: ${store.slug})`)

  // 3. Clear existing dummy rows for this store to keep it clean and idempotent
  console.log('--- 3. Cleaning existing rows for store ---')
  await supabase.from('reviews').delete().eq('store_id', storeId)
  await supabase.from('orders').delete().eq('store_id', storeId)
  await supabase.from('products').delete().eq('store_id', storeId)
  await supabase.from('categories').delete().eq('store_id', storeId)
  await supabase.from('store_links').delete().eq('store_id', storeId)

  // 4. Insert Categories
  console.log('--- 4. Inserting Categories ---')
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .insert([
      { store_id: storeId, name: 'Kemeja Batik Pria', sort_order: 1 },
      { store_id: storeId, name: 'Dress & Outer Wanita', sort_order: 2 },
      { store_id: storeId, name: 'Kain Sutra & Tenun', sort_order: 3 },
    ])
    .select()

  if (catError) throw catError
  console.log(`Created ${categories.length} categories`)

  const catKemeja = categories.find((c) => c.name.includes('Kemeja'))?.id
  const catWanita = categories.find((c) => c.name.includes('Dress'))?.id
  const catKain = categories.find((c) => c.name.includes('Kain'))?.id

  // 5. Insert Products
  console.log('--- 5. Inserting Products ---')
  const productsToInsert = [
    {
      store_id: storeId,
      category_id: catKemeja,
      name: 'Kemeja Batik Tulis Sutra Solo Motif Parang',
      description: 'Kemeja batik tulis sutra ATBM premium khas Solo dengan motif Parang Kusumo. Furing katun adem, jahitan tailor rapi standar butik.',
      base_price: 450000,
      image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
      stock: 15,
      is_digital: false,
      is_active: true,
      sort_order: 1,
    },
    {
      store_id: storeId,
      category_id: catKemeja,
      name: 'Kemeja Batik Katun Primisima Lengan Panjang',
      description: 'Batik cap kombinasi tulis dengan bahan katun primisima morresst 50s. Lembut, tidak luntur, dan nyaman untuk acara formal maupun kerja.',
      base_price: 285000,
      image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
      stock: 22,
      is_digital: false,
      is_active: true,
      sort_order: 2,
    },
    {
      store_id: storeId,
      category_id: catWanita,
      name: 'Dress Batik Modern A-Line Tenun Jepara',
      description: 'Dress siluet A-line elegan kombinasi tenun troso Jepara dan katun toyobo jepang. Dilengkapi resleting belakang dan saku tersembunyi.',
      base_price: 375000,
      image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80',
      stock: 10,
      is_digital: false,
      is_active: true,
      sort_order: 3,
    },
    {
      store_id: storeId,
      category_id: catWanita,
      name: 'Outer Kimono Batik Cap Coletan Indigo',
      description: 'Outer santai motif mega mendung colet modern pewarnaan alam indigo. All size fit to XL, potongan loose drapery yang flowy.',
      base_price: 260000,
      image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
      stock: 18,
      is_digital: false,
      is_active: true,
      sort_order: 4,
    },
    {
      store_id: storeId,
      category_id: catKain,
      name: 'Kain Panjang Batik Tulis Gentongan Madura',
      description: 'Masterpiece batik gentongan khas Tanjungbumi Madura dengan teknik perendaman gentong tanah liat 6 bulan. Warna tegas dan tahan puluhan tahun.',
      base_price: 650000,
      image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80',
      stock: 5,
      is_digital: false,
      is_active: true,
      sort_order: 5,
    },
  ]

  const { data: createdProducts, error: prodErr } = await supabase
    .from('products')
    .insert(productsToInsert)
    .select()

  if (prodErr) throw prodErr
  console.log(`Created ${createdProducts.length} products`)

  // 6. Insert Store Links
  console.log('--- 6. Inserting Store Links ---')
  await supabase.from('store_links').insert([
    {
      store_id: storeId,
      title: 'Konsultasi Pesanan Khusus (WhatsApp)',
      url: 'https://wa.me/6281234567890',
      icon: 'message-circle',
      sort_order: 1,
    },
    {
      store_id: storeId,
      title: 'Instagram Resmi @batik.nusantara',
      url: 'https://instagram.com',
      icon: 'instagram',
      sort_order: 2,
    },
  ])

  // 7. Insert Orders
  console.log('--- 7. Inserting Orders ---')
  const now = new Date()
  const d1 = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
  const d2 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const d3 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const d4 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
  const d5 = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()
  const d6 = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()

  const ordersToInsert = [
    {
      store_id: storeId,
      order_code: 'ORD-2609-01',
      buyer_name: 'Anindya Putri',
      buyer_phone: '081298765432',
      shipping_address: 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan',
      subtotal: 450000,
      shipping_fee: 18000,
      total_amount: 468000,
      payment_method: 'Transfer BCA',
      status: 'COMPLETED',
      courier_name: 'JNE Regular',
      tracking_number: 'JNE9028341123',
      seller_internal_note: 'Sudah di-packing box hard cover + kartu ucapan',
      paid_at: d1,
      shipped_at: d1,
      completed_at: d2,
      created_at: d1,
      items_snapshot: [
        {
          product_id: createdProducts[0].id,
          product_name: createdProducts[0].name,
          unit_price: 450000,
          quantity: 1,
          subtotal: 450000,
        },
      ],
    },
    {
      store_id: storeId,
      order_code: 'ORD-2609-02',
      buyer_name: 'Rizky Pratama',
      buyer_phone: '081387654321',
      shipping_address: 'Cluster Lavender Blok B3 No. 10, BSD City, Tangerang Selatan',
      subtotal: 570000,
      shipping_fee: 15000,
      total_amount: 585000,
      payment_method: 'Mandiri Virtual Account',
      status: 'SHIPPED',
      courier_name: 'SiCepat REG',
      tracking_number: '004128941203',
      seller_internal_note: 'Pelanggan minta dikirim sebelum weekend',
      paid_at: d2,
      shipped_at: d3,
      created_at: d2,
      items_snapshot: [
        {
          product_id: createdProducts[1].id,
          product_name: createdProducts[1].name,
          unit_price: 285000,
          quantity: 2,
          subtotal: 570000,
        },
      ],
    },
    {
      store_id: storeId,
      order_code: 'ORD-2609-03',
      buyer_name: 'Dewi Lestari',
      buyer_phone: '081723456789',
      shipping_address: 'Jl. Dago Asri No. 17, Coblong, Bandung',
      subtotal: 375000,
      shipping_fee: 20000,
      total_amount: 395000,
      payment_method: 'QRIS',
      status: 'PROCESSING',
      courier_name: 'J&T Express',
      seller_internal_note: 'Sedang disiapkan dari gudang butik Solo',
      paid_at: d3,
      created_at: d3,
      items_snapshot: [
        {
          product_id: createdProducts[2].id,
          product_name: createdProducts[2].name,
          unit_price: 375000,
          quantity: 1,
          subtotal: 375000,
        },
      ],
    },
    {
      store_id: storeId,
      order_code: 'ORD-2609-04',
      buyer_name: 'Budi Setiawan',
      buyer_phone: '081911223344',
      shipping_address: 'Graha Famili Blok D-8, Dukuh Pakis, Surabaya',
      subtotal: 910000,
      shipping_fee: 22000,
      total_amount: 932000,
      payment_method: 'Transfer BCA',
      status: 'COMPLETED',
      courier_name: 'JNE YES',
      tracking_number: 'JNE8832109483',
      seller_internal_note: 'Pelanggan VIP kolektor kain nusantara',
      paid_at: d4,
      shipped_at: d4,
      completed_at: d4,
      created_at: d4,
      items_snapshot: [
        {
          product_id: createdProducts[4].id,
          product_name: createdProducts[4].name,
          unit_price: 650000,
          quantity: 1,
          subtotal: 650000,
        },
        {
          product_id: createdProducts[3].id,
          product_name: createdProducts[3].name,
          unit_price: 260000,
          quantity: 1,
          subtotal: 260000,
        },
      ],
    },
    {
      store_id: storeId,
      order_code: 'ORD-2609-05',
      buyer_name: 'Farhan Maulana',
      buyer_phone: '085699887766',
      shipping_address: 'Jl. Gejayan No. 88, Sleman, DI Yogyakarta',
      subtotal: 285000,
      shipping_fee: 0,
      total_amount: 285000,
      payment_method: 'Transfer BCA',
      status: 'PENDING_WA',
      seller_internal_note: 'Menunggu konfirmasi bukti transfer via WhatsApp',
      created_at: d5,
      items_snapshot: [
        {
          product_id: createdProducts[1].id,
          product_name: createdProducts[1].name,
          unit_price: 285000,
          quantity: 1,
          subtotal: 285000,
        },
      ],
    },
    {
      store_id: storeId,
      order_code: 'ORD-2609-06',
      buyer_name: 'Siti Rahmawati',
      buyer_phone: '082133445566',
      shipping_address: 'Jl. Kaliurang KM 5, Sleman',
      subtotal: 260000,
      shipping_fee: 0,
      total_amount: 260000,
      payment_method: 'QRIS',
      status: 'PENDING_WA',
      seller_internal_note: 'Baru saja checkout via etalase',
      created_at: d6,
      items_snapshot: [
        {
          product_id: createdProducts[3].id,
          product_name: createdProducts[3].name,
          unit_price: 260000,
          quantity: 1,
          subtotal: 260000,
        },
      ],
    },
  ]

  const { data: createdOrders, error: orderErr } = await supabase
    .from('orders')
    .insert(ordersToInsert)
    .select()

  if (orderErr) throw orderErr
  console.log(`Created ${createdOrders.length} orders`)

  // 8. Insert Reviews
  console.log('--- 8. Inserting Reviews ---')
  const reviewsToInsert = [
    {
      store_id: storeId,
      order_id: createdOrders[0].id,
      buyer_name: 'Anindya Putri',
      rating: 5,
      comment: 'Batik tulisnya luar biasa halus, jahitannya rapi standar butik mewah. Pengemasan sangat aman dengan box premium. Recommended seller!',
      created_at: d2,
    },
    {
      store_id: storeId,
      order_id: createdOrders[3].id,
      buyer_name: 'Budi Setiawan',
      rating: 5,
      comment: 'Kain gentongan Maduranya autentik dan warnanya pekat sekali. Koleksi yang bernilai seni tinggi. Terima kasih bonus selendangnya.',
      created_at: d4,
    },
    {
      store_id: storeId,
      order_id: createdOrders[1].id,
      buyer_name: 'Rizky Pratama',
      rating: 5,
      comment: 'Kemeja batiknya pas banget di badan, bahannya adem dipakai seharian di kantor AC maupun outdoor. Fast response via WhatsApp!',
      created_at: d3,
    },
    {
      store_id: storeId,
      order_id: createdOrders[2].id,
      buyer_name: 'Dewi Lestari',
      rating: 4,
      comment: 'Dress batiknya cantik dan elegan, bahannya jatuh tidak kaku. Pengiriman cepat sampai Bandung. Bakal langganan terus di sini.',
      created_at: d4,
    },
  ]

  const { data: createdReviews, error: revErr } = await supabase
    .from('reviews')
    .insert(reviewsToInsert)
    .select()

  if (revErr) throw revErr
  console.log(`Created ${createdReviews.length} reviews`)

  console.log('--- SEEDING COMPLETED SUCCESSFULLY! ---')
}

seed().catch((err) => {
  console.error('Seeding error:', err)
  process.exit(1)
})
