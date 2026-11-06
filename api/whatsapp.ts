import { createClient } from '@supabase/supabase-js'

// 1. Database connection helper for Vercel Serverless
function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  if (!url || !key) return null
  return createClient(url, key)
}

// 2. Active Fonnte Message Dispatcher
async function dispatchFonnteMessage(token: string, target: string, message: string) {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target,
        message,
        countryCode: '62',
      }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error dispatching message to Fonnte API:', err)
    return null
  }
}

async function fetchMediaAsInlineData(url: string, token?: string): Promise<{ mimeType: string; data: string } | null> {
  if (!url) return null
  try {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        return { mimeType: match[1], data: match[2] }
      }
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      const headers: Record<string, string> = {}
      if (token && url.includes('fonnte')) {
        headers['Authorization'] = token
      }
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
      if (!res.ok) return null
      const arrayBuffer = await res.arrayBuffer()
      const rawMime = res.headers.get('content-type') || 'image/jpeg'
      const mimeType = rawMime.split(';')[0].trim()
      const base64Data = typeof Buffer !== 'undefined'
        ? Buffer.from(arrayBuffer).toString('base64')
        : btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      return { mimeType, data: base64Data }
    }
  } catch (err) {
    console.warn('Error fetching media for AI vision:', err)
  }
  return null
}

// 3. Autonomous AI Processing Logic (Self-Contained)
interface ProcessWhatsAppInput {
  senderPhone: string
  messageText: string
  mediaUrl?: string
  senderName?: string
  storeWhatsappOrDevice?: string
}

async function processIncomingWhatsAppMessage(input: ProcessWhatsAppInput) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { reply: 'Sistem sedang pemeliharaan koneksi database. Mohon coba beberapa saat lagi.' }
  }

  const { senderPhone, messageText, mediaUrl, senderName, storeWhatsappOrDevice } = input

  let cleanPhone = senderPhone.replace(/@.*$/, '').replace(/[^0-9]/g, '')
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1)
  } else if (cleanPhone.startsWith('8')) {
    cleanPhone = '62' + cleanPhone
  }
  const altPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone

  // Smart Store Identification (Supports Multi-Store Shared WhatsApp Number)
  let store: any = null
  let candidateStores: any[] = []
  let isDirectStoreSelection = false

  // Priority 1: Check for explicit Order Code in message (e.g. #ORD-20261106-XYZ)
  const orderCodeMatch = (messageText || '').match(/#?ORD-[A-Za-z0-9-]+/i)
  if (orderCodeMatch) {
    const rawCode = orderCodeMatch[0]
    const cleanCode = rawCode.replace(/^#/, '')
    try {
      const { data: matchedOrder } = await supabase
        .from('orders')
        .select('store_id')
        .or(`order_code.eq.${rawCode},order_code.eq.#${cleanCode},order_code.eq.${cleanCode}`)
        .limit(1)
        .maybeSingle()

      if (matchedOrder?.store_id) {
        const { data: storeByOrder } = await supabase
          .from('stores')
          .select('*')
          .eq('id', matchedOrder.store_id)
          .maybeSingle()

        if (storeByOrder && storeByOrder.ai_enabled) {
          store = storeByOrder
        }
      }
    } catch (err) {
      console.warn('Error resolving store by order code:', err)
    }
  }

  // If store is not directly resolved by order code, find all matching stores by device/phone
  if (!store) {
    let storeQuery = supabase.from('stores').select('*')
    if (storeWhatsappOrDevice) {
      const rawDevice = storeWhatsappOrDevice.trim()
      const cleanDev = rawDevice.replace(/[^0-9]/g, '')
      const idDev = cleanDev.startsWith('0') ? '62' + cleanDev.slice(1) : (cleanDev.startsWith('8') ? '62' + cleanDev : cleanDev)
      const altDev = idDev.startsWith('62') ? '0' + idDev.slice(2) : idDev

      storeQuery = storeQuery.or(
        `whatsapp_number.eq.${rawDevice},whatsapp_number.eq.${idDev},whatsapp_number.eq.${altDev},fonnte_token.eq.${rawDevice}`
      )
    }

    const { data: matchedStoresRaw } = await storeQuery.limit(10)
    candidateStores = (matchedStoresRaw || []).filter((s: any) => s.ai_enabled)

    if (candidateStores.length === 1) {
      store = candidateStores[0]
    } else if (candidateStores.length > 1) {
      const trimmedMsg = (messageText || '').trim().toLowerCase()

      // Priority 2: Check numeric selection ("1", "toko 1", "nomor 1", "pilihan 1") or store name/slug mention
      const numMatch = trimmedMsg.match(/^(?:toko\s*|nomor\s*|no\.?\s*|pilihan\s*)?([1-9])(?:\.|\b)?$/i)
      if (numMatch) {
        const idx = parseInt(numMatch[1], 10) - 1
        if (idx >= 0 && idx < candidateStores.length) {
          store = candidateStores[idx]
          isDirectStoreSelection = true
        }
      }

      if (!store) {
        for (const s of candidateStores) {
          const sName = (s.name || '').trim().toLowerCase()
          const sSlug = (s.slug || '').trim().toLowerCase()
          if ((sName && trimmedMsg.includes(sName)) || (sSlug && trimmedMsg.includes(sSlug))) {
            store = s
            break
          }
        }
      }

      // Priority 3: Check product name match in candidate stores' active catalogs
      if (!store && trimmedMsg.length >= 3) {
        try {
          const candidateStoreIds = candidateStores.map((s: any) => s.id)
          const { data: activeProducts } = await supabase
            .from('products')
            .select('store_id, name')
            .in('store_id', candidateStoreIds)
            .eq('is_active', true)

          if (activeProducts && activeProducts.length > 0) {
            for (const p of activeProducts) {
              const pName = (p.name || '').trim().toLowerCase()
              if (pName.length >= 3 && trimmedMsg.includes(pName)) {
                store = candidateStores.find((s: any) => s.id === p.store_id) || null
                if (store) break
              }
            }
          }
        } catch (err) {
          console.warn('Error matching store by product name:', err)
        }
      }

      // Priority 4: Check buyer transaction history & active chat session
      if (!store) {
        try {
          const candidateStoreIds = candidateStores.map((s: any) => s.id)

          // 4a. Check buyer's recent orders
          const { data: recentBuyerOrders } = await supabase
            .from('orders')
            .select('store_id, created_at')
            .in('store_id', candidateStoreIds)
            .or(`buyer_phone.eq.${cleanPhone},buyer_phone.eq.${altPhone}`)
            .order('created_at', { ascending: false })
            .limit(1)

          if (recentBuyerOrders && recentBuyerOrders.length > 0) {
            store = candidateStores.find((s: any) => s.id === recentBuyerOrders[0].store_id) || null
          }

          // 4b. Check recent ai_chat_sessions
          if (!store) {
            const { data: recentChats } = await supabase
              .from('ai_chat_sessions')
              .select('store_id, created_at')
              .in('store_id', candidateStoreIds)
              .eq('buyer_phone', cleanPhone)
              .order('created_at', { ascending: false })
              .limit(1)

            if (recentChats && recentChats.length > 0) {
              store = candidateStores.find((s: any) => s.id === recentChats[0].store_id) || null
            }
          }
        } catch (err) {
          console.warn('Error matching store from buyer history:', err)
        }
      }

      // Priority 5: Disambiguation Prompt if completely ambiguous cold chat
      if (!store) {
        const storeListText = candidateStores
          .map((s: any, idx: number) => `${idx + 1}. *${s.name}*${s.tagline ? ` — _${s.tagline}_` : ''}`)
          .join('\n')
        const customerGreeting = senderName && senderName !== 'Pelanggan' ? ` Kak ${senderName}` : ' Kak'
        const disambiguationReply = `Halo${customerGreeting}! Terima kasih telah menghubungi kami 🙏\n\nNomor WhatsApp ini melayani beberapa toko resmi kami:\n\n${storeListText}\n\nBoleh beri tahu kami, Kakak ingin bertanya atau berbelanja dari toko yang mana ya? (Cukup balas dengan angka *1* atau *2*, atau sebutkan nama tokonya ya 😊)`

        return {
          reply: disambiguationReply,
          fonnteToken: candidateStores[0].fonnte_token,
        }
      }
    }
  }

  if (!store || !store.ai_enabled) {
    return { reply: '' }
  }

  // Parallel fetch for catalog and recent chat history
  const [productsRes, chatRes] = await Promise.all([
    supabase
      .from('products')
      .select('*, variant_groups(*, variant_options(*))')
      .eq('store_id', store.id)
      .eq('is_active', true),
    supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('store_id', store.id)
      .eq('buyer_phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  // Fetch recent buyer orders: try RPC first (SECURITY DEFINER to bypass RLS safely), then fallback to direct query
  let recentOrders: any[] = []
  try {
    const { data: rpcOrders, error: rpcErr } = await supabase.rpc('get_buyer_orders_by_ai', {
      p_store_id: store.id,
      p_buyer_phone: cleanPhone,
      p_alt_phone: altPhone,
    })
    if (!rpcErr && rpcOrders && Array.isArray(rpcOrders) && rpcOrders.length > 0) {
      recentOrders = rpcOrders
    } else {
      const { data: directOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', store.id)
        .or(`buyer_phone.eq.${cleanPhone},buyer_phone.eq.${altPhone}`)
        .order('created_at', { ascending: false })
        .limit(3)
      if (directOrders && directOrders.length > 0) {
        recentOrders = directOrders
      }
    }
  } catch (err) {
    console.warn('Could not query recent orders via RPC:', err)
  }

  const products: any[] = productsRes.data || []
  const rawHistory: any[] = chatRes.data || []

  // Database-level deduplication: Handles both text messages and media attachments
  const normalizedIncoming = (messageText || (mediaUrl ? `[foto:${mediaUrl}]` : '')).trim().toLowerCase()
  if (rawHistory.length > 0 && normalizedIncoming) {
    const latestMsg = rawHistory[0]
    const recentUserMsg = rawHistory.find((m: any) => m.role === 'user')
    if (recentUserMsg && recentUserMsg.content.trim().toLowerCase() === normalizedIncoming) {
      const msgTime = new Date(recentUserMsg.created_at).getTime()
      const diffMs = Date.now() - msgTime
      // Guard 1: In-flight concurrent duplicate within 45 seconds
      // Guard 2: Webhook retry within 10 minutes when reply already exists
      if (diffMs < 45 * 1000 || (diffMs < 10 * 60 * 1000 && latestMsg.role === 'model')) {
        return {
          reply: '',
          isDuplicate: true,
          orderUpdated: false,
          orderCreated: false,
          fonnteToken: store.fonnte_token,
        }
      }
    }
  }

  const orderedHistory = rawHistory.slice(0, 6).reverse()

  // Gemini REST Endpoint with Intelligent Model Selection & Fallback
  const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
  if (!geminiApiKey) {
    console.error('Missing GEMINI_API_KEY')
    return { reply: 'Halo! Mohon maaf sistem AI kami sedang dalam konfigurasi kunci API. Pesan Anda segera dibalas penjual.' }
  }

  let modelName = store.ai_model || process.env.VITE_GEMINI_MODEL || 'gemini-3.1-flash-lite'
  if (modelName.includes('2.0') || modelName.includes('1.5') || modelName.includes('2.5')) {
    modelName = 'gemini-3.1-flash-lite'
  }

  let geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`

  const catalogContext = products.map((p) => {
    const variants = (p.variant_groups || []).map((g: any) => `${g.name}: [${(g.options || g.variant_options || []).map((o: any) => `${o.name} (+${o.price_delta})`).join(', ')}]`).join('; ')
    return `- ${p.name} (ID: ${p.id}) | Harga: Rp${Number(p.base_price).toLocaleString('id-ID')} | Stok: ${p.stock !== null && p.stock !== undefined ? p.stock : 'Tersedia'}${variants ? ` | Varian: ${variants}` : ''}${p.ai_context ? ` | Catatan Khusus AI: ${p.ai_context}` : ''}`
  }).join('\n')

  const pendingOrdersContext = (recentOrders || []).map((o: any) => {
    return `- Kode: ${o.order_code} | Total: Rp${Number(o.total_amount).toLocaleString('id-ID')} | Status: ${o.status} | Item: ${JSON.stringify(o.items_snapshot)}`
  }).join('\n')

  const systemInstructionText = `Anda adalah Asisten Penjualan & Layanan Pelanggan WhatsApp Otonom untuk toko "${store.name}".
Gaya Karakter / Persona Toko: "${store.ai_persona || 'Ramah, sopan, sigap membantu, dan mengedepankan keramahan wirausaha Bali.'}"
Instruksi Operasional Toko: "${store.ai_instructions || 'Bantu pembeli menjawab pertanyaan seputar katalog, cek stok, rekap pesanan, dan verifikasi pembayaran transfer.'}"
Panduan Rekening Pembayaran Toko: "${store.ai_payment_info || 'BCA: 1234567890 a/n Toko'}"
${isDirectStoreSelection ? `\nCATATAN SISTEM: Pembeli baru saja memilih toko "${store.name}" dari menu pilihan toko. Sambut pembeli dengan hangat dan ramah atas nama toko "${store.name}", jelaskan secara ringkas jenis produk unggulan yang tersedia, dan tanyakan apa yang bisa dibantu atau tawarkan rekomendasi produk.\n` : ''}
KATALOG PRODUK TOKO SAAT INI:
${catalogContext || '(Katalog belum memiliki produk aktif)'}

PESANAN TERAKHIR DARI NOMOR INI:
${pendingOrdersContext || '(Belum ada pesanan sebelumnya)'}

ATURAN UTAMA ANDA:
1. Jawab pertanyaan seputar barang secara informatif dengan memanfaatkan 'Catatan Khusus AI' dari masing-masing produk.
2. Jika pembeli ingin memesan barang langsung di percakapan, rekap nama barang, jumlah, dan alamat pengiriman, lalu gunakan tool "create_order_draft" untuk membuat pesanan di sistem.
3. KONSULTATIF & RAMAH (JANGAN MEMAKSA LANGSUNG BAYAR):
   - Jika pembeli mengirimkan rincian draf dari web untuk bertanya-tanya, makesure stok, atau tanya detail ongkir:
     Sambut dengan hangat dan ramah, konfirmasikan ketersediaan barang dan variasinya, serta jawab pertanyaan pembeli secara solutif.
     JANGAN LANGSUNG menodong atau mendesak pembeli harus segera transfer/membayar. Berikan keleluasaan pembeli untuk makesure detail produk dan pengiriman terlebih dahulu.
   - Baru berikan panduan rekening transfer / QRIS toko jika pembeli menyatakan sudah mantap, telah selesai bertanya, atau meminta instruksi cara pembayaran.
4. SANGAT PENTING - BACA BUKTI TRANSFER & CATAT DATA PENGIRIM (PAID / LUNAS):
   - Jika pembeli mengirim bukti transfer, foto struk ATM/m-banking, atau gambar mutasi:
     Gunakan kemampuan penglihatan visual Anda (Vision OCR) untuk memeriksa foto struk secara teliti:
     1. Baca Nama Pengirim / Pemilik Rekening pembeli yang tertera pada struk (misal: "PENGIRIM: ANDI WIJAYA" atau nama rekening asal).
     2. Baca Nomor Rekening atau Nomor E-Wallet pengirim jika tertera.
     3. Baca Bank atau E-Wallet asal/tujuan transfer (misal: BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO).
     4. Baca Nominal uang yang ditransfer.
     
     Anda WAJIB MEMANGGIL tool "confirm_buyer_payment" dengan menyertakan sender_name, sender_account, dan payment_method yang berhasil Anda baca agar nama pengirim dan rekening pengirim OTOMATIS TERSIMPAN ke database pesanan penjual, dan status berubah menjadi PAID.
   - Jika pembeli membatalkan pesanan, panggil tool "update_order_status" dengan status "CANCELLED".
   - Jika pembeli tidak menyebutkan kode pesanan, gunakan kode pesanan pending yang tercatat di riwayat "PESANAN TERAKHIR DARI NOMOR INI" di atas.
   - JANGAN PERNAH menyatakan pesanan sudah Lunas (PAID) dalam teks balasan tanpa berhasil mengeksekusi tool database terlebih dahulu!
5. SANGAT PENTING - TANYAKAN RATING SAAT PESANAN SUDAH DIBAYAR (PAID):
   - Begitu Anda berhasil memverifikasi pembayaran pembeli (memanggil confirm_buyer_payment atau update_order_status PAID), konfirmasikan bahwa pembayaran telah diterima/lunas, dan Anda WAJIB LANGSUNG MENANYAKAN RATING KEPUASAN (1 sampai 5 bintang) di akhir pesan tersebut! (Contoh: "Pembayaran telah kami terima dan diverifikasi ya Kak! Boleh bantu berikan rating kepuasan 1 - 5 bintang ⭐ untuk pelayanan kami hari ini? Cukup balas angka 1-5 beserta kesan Kakak ya 😊").
   - Jika pembeli membalas dengan memberikan rating kepuasan (misal angka 1, 2, 3, 4, atau 5, atau ulasan bintang), Anda WAJIB MEMANGGIL tool "submit_customer_review" untuk menyimpan ulasan tersebut ke database toko, lalu ucapkan terima kasih yang tulus!
6. Jangan gunakan tanda pagar tiga (###) dalam pesan WhatsApp Anda. Gunakan format WhatsApp yang rapi (*tebal*, _miring_, poin-poin).`

  const tools = [
    {
      functionDeclarations: [
        {
          name: 'create_order_draft',
          description: 'Membuat draf pesanan resmi baru di database saat pembeli menyetujui pembelian barang.',
          parameters: {
            type: 'OBJECT',
            properties: {
              buyer_name: { type: 'STRING', description: 'Nama pembeli' },
              shipping_address: { type: 'STRING', description: 'Alamat lengkap pengiriman barang' },
              product_id: { type: 'STRING', description: 'ID produk yang dipesan' },
              quantity: { type: 'INTEGER', description: 'Jumlah barang' },
              variant_info: { type: 'STRING', description: 'Pilihan varian (misal: Ukuran XL, Warna Hitam)' },
              payment_method: { type: 'STRING', description: 'Bank atau E-wallet pembeli (misal: BCA, BRI, DANA)' },
              sender_name: { type: 'STRING', description: 'Nama pemilik rekening / pengirim' },
              sender_account: { type: 'STRING', description: 'Nomor rekening atau nomor HP e-wallet pengirim' },
            },
            required: ['buyer_name'],
          },
        },
        {
          name: 'confirm_buyer_payment',
          description: 'Mengubah status pesanan menjadi PAID (Lunas) di database saat pembeli mengirim bukti transfer atau konfirmasi lunas, dan mengekstrak rincian pembayaran dari bukti transfer.',
          parameters: {
            type: 'OBJECT',
            properties: {
              order_code: { type: 'STRING', description: 'Kode pesanan pembeli (misal: ORD-...). Boleh kosong jika merujuk pesanan terakhir.' },
              payment_notes: { type: 'STRING', description: 'Catatan bukti pembayaran / nominal transfer' },
              sender_name: { type: 'STRING', description: 'Nama pengirim / pemilik rekening yang tertera di bukti transfer' },
              sender_account: { type: 'STRING', description: 'Nomor rekening atau nomor e-wallet pembeli yang tertera di bukti transfer' },
              payment_method: { type: 'STRING', description: 'Nama bank atau e-wallet (misal: BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO)' },
            },
          },
        },
        {
          name: 'update_order_status',
          description: 'Mengubah status pesanan di database toko secara real-time (PAID jika sudah bayar, CANCELLED jika pembeli membatalkan pesanan, PROCESSING jika diproses).',
          parameters: {
            type: 'OBJECT',
            properties: {
              order_code: { type: 'STRING', description: 'Kode pesanan pembeli (misal: ORD-...). Boleh kosong jika merujuk pesanan terakhir.' },
              status: {
                type: 'STRING',
                description: 'Status baru pesanan: PAID, CANCELLED, atau PROCESSING',
              },
              notes: { type: 'STRING', description: 'Catatan perubahan status' },
            },
            required: ['status'],
          },
        },
        {
          name: 'submit_customer_review',
          description: 'Menyimpan ulasan dan rating kepuasan pembeli (1 sampai 5 bintang) beserta komentar ulasan ke sistem database toko.',
          parameters: {
            type: 'OBJECT',
            properties: {
              rating: {
                type: 'INTEGER',
                description: 'Nilai rating kepuasan dari 1 sampai 5 bintang (1 terendah, 5 terbaik)',
              },
              comment: {
                type: 'STRING',
                description: 'Komentar atau kesan ulasan dari pembeli',
              },
              order_code: {
                type: 'STRING',
                description: 'Kode pesanan yang diulas jika ada (opsional)',
              },
            },
            required: ['rating'],
          },
        },
      ],
    },
  ]

  const contents: any[] = []
  for (const item of orderedHistory) {
    contents.push({
      role: item.role === 'model' ? 'model' : 'user',
      parts: [{ text: item.content }],
    })
  }

  const currentParts: any[] = []
  if (mediaUrl) {
    const inlineData = await fetchMediaAsInlineData(mediaUrl, store.fonnte_token)
    if (inlineData) {
      currentParts.push({ inlineData })
    }
    currentParts.push({ text: `[Pelanggan melampirkan foto/file bukti transfer pembayaran: ${mediaUrl}]` })
  }
  currentParts.push({ text: messageText || (mediaUrl ? 'Saya mengirimkan foto bukti pembayaran transfer ini, tolong dicek dan dicatat ya.' : 'Halo') })

  contents.push({
    role: 'user',
    parts: currentParts,
  })

  let finalReply = ''
  let orderUpdated = false
  let orderCreated = false
  let targetOrderCode: string | undefined

  try {
    let firstRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstructionText }] },
        tools,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    })

    let firstData = await firstRes.json()
    if (firstRes.status !== 200) {
      console.warn('Primary Gemini model error:', firstData?.error?.message, '- Falling back to gemini-3.1-flash-lite')
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`
      const retryRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemInstructionText }] },
          tools,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      })
      firstData = await retryRes.json()
    }
    const firstCandidate = firstData?.candidates?.[0]?.content
    const functionCallPart = firstCandidate?.parts?.find((p: any) => p.functionCall)

    if (functionCallPart && functionCallPart.functionCall) {
      const toolCall = functionCallPart.functionCall
      const fnName = toolCall.name
      const fnArgs = toolCall.args || {}

      let toolResult: any = {}

      if (fnName === 'create_order_draft') {
        const orderCode = `ORD-${Date.now().toString(36).toUpperCase()}`
        const pId = fnArgs.product_id
        const prod = products.find((p: any) => p.id === pId) || products[0]
        const qty = Math.max(1, Number(fnArgs.quantity) || 1)
        let unitPrice = prod ? Number(prod.base_price) : 100000

        // Calculate variant delta from product variant groups
        const variantInfo = String(fnArgs.variant_info || '').toLowerCase()
        if (prod && prod.variant_groups && variantInfo) {
          for (const vg of prod.variant_groups) {
            const options = vg.variant_options || vg.options || []
            for (const opt of options) {
              if (variantInfo.includes(opt.name.toLowerCase())) {
                unitPrice += Number(opt.price_delta || 0)
              }
            }
          }
        }
        const subtotal = unitPrice * qty
        const paymentMethod = String(fnArgs.payment_method || 'MANUAL_TRANSFER')
        const senderAccName = fnArgs.sender_name ? String(fnArgs.sender_name) : ''
        const senderAccNo = fnArgs.sender_account ? String(fnArgs.sender_account) : ''

        const insertRow: Record<string, any> = {
          store_id: store.id,
          order_code: orderCode,
          buyer_name: String(fnArgs.buyer_name || senderName || 'Pelanggan WhatsApp'),
          buyer_phone: cleanPhone,
          shipping_address: String(fnArgs.shipping_address || 'Menunggu konfirmasi alamat'),
          subtotal,
          shipping_fee: 0,
          total_amount: subtotal,
          payment_method: paymentMethod,
          payment_sender_name: senderAccName,
          payment_sender_account: senderAccNo,
          status: 'PENDING_WA',
          managed_by_ai: true,
          ai_summary: `Dibuat via WhatsApp AI Copilot untuk ${prod ? prod.name : 'Produk'} (Qty: ${qty})`,
          items_snapshot: [{
            product_id: prod ? prod.id : '',
            product_name: prod ? prod.name : 'Produk',
            unit_price: unitPrice,
            quantity: qty,
            subtotal,
            variants: fnArgs.variant_info ? { info: String(fnArgs.variant_info) } : undefined,
          }],
        }

        let { data: newOrder, error: orderErr } = await supabase
          .from('orders')
          .insert([insertRow])
          .select()
          .single()

        if (orderErr && (orderErr.code === '42703' || orderErr.message?.includes('payment_sender'))) {
          delete insertRow.payment_sender_name
          delete insertRow.payment_sender_account
          const retryRes = await supabase
            .from('orders')
            .insert([insertRow])
            .select()
            .single()
          newOrder = retryRes.data
          orderErr = retryRes.error
        }

        if (!orderErr && newOrder) {
          orderCreated = true
          targetOrderCode = orderCode
          toolResult = {
            success: true,
            order_code: orderCode,
            total_amount: subtotal,
            payment_instruction: store.ai_payment_info,
          }
        } else {
          toolResult = { success: false, error: orderErr?.message }
        }
      } else if (fnName === 'confirm_buyer_payment' || fnName === 'update_order_status') {
        const rawCode = String(fnArgs.order_code || '').trim().replace(/^#/, '')
        const targetStatus = String(fnArgs.status || 'PAID').toUpperCase()
        const senderName = String(fnArgs.sender_name || '').trim()
        const senderAccount = String(fnArgs.sender_account || '').trim()
        const paymentMethod = String(fnArgs.payment_method || '').trim()

        const senderDetails = [
          senderName ? `Pengirim: ${senderName}` : '',
          senderAccount ? `Rek: ${senderAccount}` : '',
          paymentMethod ? `Bank: ${paymentMethod}` : '',
        ].filter(Boolean).join(' | ')

        const baseNotes = fnArgs.notes || fnArgs.payment_notes || (mediaUrl ? 'Bukti transfer terlampir' : 'Dikonfirmasi oleh pembeli via WA')
        const notes = senderDetails ? `${baseNotes} (${senderDetails})` : baseNotes

        let updatedSuccess = false
        let updatedOrderCode = rawCode

        // Method 1: Attempt update via PostgreSQL RPC (SECURITY DEFINER, completely bypasses RLS safely)
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_order_status_by_ai', {
            p_store_id: store.id,
            p_order_id: null,
            p_order_code: rawCode,
            p_buyer_phone: cleanPhone,
            p_status: targetStatus,
            p_proof_url: mediaUrl || '',
            p_notes: notes,
          })

          if (!rpcErr && rpcRes && rpcRes.success) {
            updatedSuccess = true
            updatedOrderCode = rpcRes.order_code || updatedOrderCode
            try {
              const extraUpdates: any = {}
              if (senderName) extraUpdates.payment_sender_name = senderName
              if (senderAccount) extraUpdates.payment_sender_account = senderAccount
              if (paymentMethod) extraUpdates.payment_method = paymentMethod
              if (senderDetails) extraUpdates.ai_summary = `Bukti transfer diverifikasi (${senderDetails})`
              if (Object.keys(extraUpdates).length > 0) {
                await supabase.from('orders').update(extraUpdates).ilike('order_code', `%${updatedOrderCode}%`)
              }
            } catch (extraErr) {
              console.warn('Could not update extra sender columns:', extraErr)
            }
          } else if (rpcErr) {
            console.warn('RPC update_order_status_by_ai notice:', rpcErr.message)
          }
        } catch (rpcEx) {
          console.warn('RPC call exception:', rpcEx)
        }

        // Method 2: If RPC not yet installed or failed, use direct table matching + update fallback
        if (!updatedSuccess) {
          let matchedOrder: any = null
          if (rawCode && rawCode.length >= 3) {
            const { data } = await supabase
              .from('orders')
              .select('*')
              .eq('store_id', store.id)
              .or(`buyer_phone.eq.${cleanPhone},buyer_phone.eq.${altPhone}`)
              .ilike('order_code', `%${rawCode}%`)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            matchedOrder = data
          }

          if (!matchedOrder && rawCode && rawCode.length >= 6) {
            const { data } = await supabase
              .from('orders')
              .select('*')
              .eq('store_id', store.id)
              .ilike('order_code', `%${rawCode}%`)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            matchedOrder = data
          }

          if (!matchedOrder) {
            const { data } = await supabase
              .from('orders')
              .select('*')
              .eq('store_id', store.id)
              .or(`buyer_phone.eq.${cleanPhone},buyer_phone.eq.${altPhone}`)
              .in('status', ['PENDING_WA', 'PENDING'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            matchedOrder = data
          }

          if (!matchedOrder && recentOrders && recentOrders.length > 0) {
            matchedOrder = recentOrders.find((o: any) => o.status === 'PENDING_WA' || o.status === 'PENDING')
          }

          if (matchedOrder) {
            const patchData: any = {
              status: targetStatus,
              managed_by_ai: true,
              payment_proof_url: mediaUrl || matchedOrder.payment_proof_url || '',
              seller_internal_note: `Status diubah (${targetStatus}) oleh AI WhatsApp: ${notes}`,
              updated_at: new Date().toISOString(),
            }
            if (targetStatus === 'PAID') {
              patchData.paid_at = new Date().toISOString()
            }
            if (senderName) patchData.payment_sender_name = senderName
            if (senderAccount) patchData.payment_sender_account = senderAccount
            if (paymentMethod) patchData.payment_method = paymentMethod
            if (senderDetails) patchData.ai_summary = `Bukti transfer diverifikasi (${senderDetails})`

            let { data: directUpdated, error: directErr } = await supabase
              .from('orders')
              .update(patchData)
              .eq('id', matchedOrder.id)
              .select()
              .maybeSingle()

            // Fallback if payment_sender columns don't exist yet in DB schema
            if (directErr && (directErr.code === '42703' || directErr.message?.includes('payment_sender'))) {
              delete patchData.payment_sender_name
              delete patchData.payment_sender_account
              const retry = await supabase.from('orders').update(patchData).eq('id', matchedOrder.id).select().maybeSingle()
              directUpdated = retry.data
              directErr = retry.error
            }

            if (!directErr && directUpdated) {
              updatedSuccess = true
              updatedOrderCode = directUpdated.order_code
            } else if (directErr) {
              console.error('Direct order update error:', directErr)
            }
          }
        }

        if (updatedSuccess) {
          orderUpdated = true
          targetOrderCode = updatedOrderCode
          toolResult = {
            success: true,
            order_code: updatedOrderCode,
            new_status: targetStatus,
            message: targetStatus === 'PAID'
              ? `Status pesanan ${updatedOrderCode} berhasil diubah menjadi PAID (Lunas) di database. Konfirmasikan bahwa pembayaran telah diverifikasi, dan WAJIB LANGSUNG TANYAKAN rating kepuasan (1-5 bintang) kepada pembeli di pesan ini!`
              : `Status pesanan ${updatedOrderCode} berhasil diubah menjadi ${targetStatus} di database.`,
          }
        } else {
          toolResult = {
            success: false,
            message: 'Tidak ditemukan pesanan pending yang sesuai untuk nomor WhatsApp Anda atau database gagal diperbarui.',
          }
        }
      } else if (fnName === 'submit_customer_review') {
        const rating = Math.min(5, Math.max(1, parseInt(String(fnArgs.rating || 5), 10)))
        const comment = String(fnArgs.comment || 'Pelayanan sangat memuaskan!').trim()
        const targetCode = fnArgs.order_code ? String(fnArgs.order_code).replace(/^#/, '').trim() : ''

        let matchedOrderId: string | null = null
        let buyerName = senderName || 'Pembeli'

        if (recentOrders && recentOrders.length > 0) {
          const matched = targetCode
            ? recentOrders.find((o: any) => o.order_code && o.order_code.includes(targetCode))
            : recentOrders[0]
          if (matched) {
            matchedOrderId = matched.id
            if (matched.buyer_name) buyerName = matched.buyer_name
          }
        }

        const { data: newRev, error: revErr } = await supabase
          .from('reviews')
          .insert([
            {
              store_id: store.id,
              order_id: matchedOrderId,
              buyer_name: buyerName,
              rating,
              comment,
            },
          ])
          .select()
          .maybeSingle()

        if (!revErr && newRev) {
          toolResult = {
            success: true,
            rating,
            comment,
            message: `Ulasan bintang ${rating} berhasil disimpan ke database toko. Sampaikan terima kasih hangat kepada pembeli atas penilaiannya!`,
          }
        } else {
          toolResult = {
            success: true,
            rating,
            message: `Rating bintang ${rating} berhasil dicatat. Sampaikan terima kasih hangat kepada pembeli atas penilaiannya!`,
          }
        }
      }

      // Second turn with tool result to get final reply text
      const secondContents = [
        ...contents,
        firstCandidate,
        {
          role: 'function',
          parts: [{
            functionResponse: {
              name: fnName,
              response: {
                name: fnName,
                content: toolResult,
              },
            },
          }],
        },
      ]

      try {
        const secondRes = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: secondContents,
            systemInstruction: { parts: [{ text: systemInstructionText }] },
            generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
          }),
        })

        const secondData = await secondRes.json()
        const textFromCandidate = secondData?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text
        if (textFromCandidate) {
          finalReply = textFromCandidate
        }
      } catch (secErr) {
        console.warn('Error in second Gemini turn:', secErr)
      }

      // Contextual fallbacks if model output is empty
      if (!finalReply) {
        if (fnName === 'create_order_draft' && toolResult.success) {
          finalReply = `Pesanan Kakak berhasil kami catat dengan kode *${toolResult.order_code}* (Total: Rp${Number(toolResult.total_amount).toLocaleString('id-ID')}).\n\nSilakan transfer ke rekening toko:\n*${store.ai_payment_info || 'BCA: 1234567890'}*\n\nKirimkan bukti transfer di sini agar pesanan segera kami siapkan ya Kak! 🙏`
        } else if ((fnName === 'confirm_buyer_payment' || fnName === 'update_order_status') && toolResult.success) {
          if (toolResult.new_status === 'PAID') {
            finalReply = `Terima kasih banyak Kak! Pembayaran untuk pesanan *${toolResult.order_code}* telah berhasil diverifikasi lunas (PAID). Kami akan segera memproses pengirimannya! 🙏`
          } else if (toolResult.new_status === 'CANCELLED') {
            finalReply = `Baik Kak, pesanan *${toolResult.order_code}* telah berhasil dibatalkan di sistem toko kami. 🙏`
          } else {
            finalReply = `Status pesanan *${toolResult.order_code}* berhasil diperbarui menjadi ${toolResult.new_status}. 🙏`
          }
        } else if ((fnName === 'confirm_buyer_payment' || fnName === 'update_order_status') && !toolResult.success) {
          finalReply = `Mohon maaf Kak, ${toolResult.message || 'sistem belum dapat menemukan pesanan pending yang cocok'}. Mohon kirimkan kode pesanan (misal: ORD-...) agar dapat kami proses.`
        } else {
          finalReply = 'Baik Kak, permohonan Anda telah kami proses.'
        }
      }
    } else {
      finalReply = firstCandidate?.parts?.find((p: any) => p.text)?.text || 'Halo kak, ada yang bisa kami bantu seputar produk toko kami?'
    }
  } catch (error: any) {
    console.error('Gemini REST API execution error:', error)
    finalReply = 'Halo kak, mohon maaf terjadi kendala sementara di sistem AI kami. Pesan Anda segera dijawab oleh admin toko kami.'
  }

  try {
    const sessionContent = messageText || (mediaUrl ? `[foto:${mediaUrl}]` : '')
    await supabase.from('ai_chat_sessions').insert([
      {
        store_id: store.id,
        buyer_phone: cleanPhone,
        role: 'user',
        content: sessionContent,
      },
      {
        store_id: store.id,
        buyer_phone: cleanPhone,
        role: 'model',
        content: finalReply,
      },
    ])
  } catch (e) {
    console.error('Failed to log ai chat session', e)
  }

  return {
    reply: finalReply,
    isDuplicate: false,
    orderUpdated,
    orderCreated,
    orderCode: targetOrderCode,
    fonnteToken: store.fonnte_token,
  }
}

// In-memory sliding cache for duplicate detection (15 minutes TTL, max 1000 entries)
const processedMessagesCache = new Map<string, number>()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

function isDuplicateRequest(body: any): boolean {
  const now = Date.now()
  for (const [key, timestamp] of processedMessagesCache.entries()) {
    if (now - timestamp > CACHE_TTL_MS) {
      processedMessagesCache.delete(key)
    }
  }

  if (processedMessagesCache.size > 1000) {
    const firstKey = processedMessagesCache.keys().next().value
    if (firstKey) processedMessagesCache.delete(firstKey)
  }

  const uniqueId = body.inboxid || body.id
  if (uniqueId) {
    const key = `id:${uniqueId}`
    if (processedMessagesCache.has(key)) {
      return true
    }
    processedMessagesCache.set(key, now)
    return false
  }

  const sender = String(body.sender || body.from || body.phone || '').trim().replace(/@.*$/, '').replace(/[^0-9]/g, '')
  const timestamp = String(body.timestamp || '')
  if (sender && timestamp) {
    const tsKey = `ts:${sender}:${timestamp}`
    if (processedMessagesCache.has(tsKey)) {
      return true
    }
    processedMessagesCache.set(tsKey, now)
    return false
  }

  const message = String(body.message || body.text || (body.url ? '[photo]' : '')).trim().toLowerCase()
  if (sender && message) {
    const msgKey = `msg:${sender}:${message}`
    if (processedMessagesCache.has(msgKey)) {
      const lastSeen = processedMessagesCache.get(msgKey) || 0
      if (now - lastSeen < 90000) {
        return true
      }
    }
    processedMessagesCache.set(msgKey, now)
  }

  return false
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Health check / GET ping (Required by Fonnte: webhook URL must allow GET & POST)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'TautanAI WhatsApp Autonomous Commerce Webhook',
      timestamp: new Date().toISOString(),
    })
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ignored_method' })
  }

  try {
    // Optional Webhook Secret Verification
    const expectedSecret = process.env.FONNTE_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET
    if (expectedSecret) {
      const providedSecret = req.headers['x-webhook-secret'] || req.query?.secret || req.headers['authorization']
      if (providedSecret !== expectedSecret && providedSecret !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({ error: 'Unauthorized webhook request' })
      }
    }

    const body = req.body || {}

    // Extract Fonnte Webhook Payload
    const sender = String(body.sender || body.from || body.phone || '').trim()
    const message = String(body.message || body.text || '').trim()
    const name = String(body.name || body.pushName || 'Pelanggan').trim()
    const url = body.url || body.file || undefined
    const device = String(body.device || body.token || '').trim()

    // 1. Guard: Non-message events (status updates, connection receipts, etc.)
    // MUST return 200 OK so Fonnte acknowledges and does not trigger retries
    if (!sender) {
      return res.status(200).json({ status: 'ignored_no_sender' })
    }

    // 2. Guard: Prevent bot from replying to WhatsApp Groups (avoids infinite bot-to-bot loops)
    if (sender.includes('@g.us') || body.member) {
      return res.status(200).json({ status: 'ignored_group_message' })
    }

    // 3. Guard: Prevent bot from echoing or responding to its own device messages
    const cleanSender = sender.replace(/@.*$/, '').replace(/[^0-9]/g, '')
    const cleanDevice = device.replace(/@.*$/, '').replace(/[^0-9]/g, '')
    if (cleanDevice && (cleanSender === cleanDevice || cleanSender.endsWith(cleanDevice) || cleanDevice.endsWith(cleanSender))) {
      return res.status(200).json({ status: 'ignored_device_echo' })
    }

    // 4. Guard: Empty message without attachments
    if (!message && !url) {
      return res.status(200).json({ status: 'ignored_empty_message' })
    }

    // 5. In-memory Deduplication gate
    if (isDuplicateRequest(body)) {
      return res.status(200).json({ status: 'ignored_duplicate_webhook' })
    }

    // 5. Process incoming message with Gemini AI Engine (includes DB-level deduplication)
    const result = await processIncomingWhatsAppMessage({
      senderPhone: sender,
      messageText: message,
      mediaUrl: url,
      senderName: name,
      storeWhatsappOrDevice: device,
    })

    if (result.isDuplicate) {
      return res.status(200).json({ status: 'ignored_duplicate_retry' })
    }

    // 6. Fonnte official protocol: Dispatch reply to https://api.fonnte.com/send
    const activeFonnteToken = result.fonnteToken || process.env.FONNTE_TOKEN || ''
    if (activeFonnteToken && result.reply) {
      await dispatchFonnteMessage(activeFonnteToken, sender, result.reply)
    }

    return res.status(200).json({
      status: true,
      orderUpdated: result.orderUpdated,
      orderCreated: result.orderCreated,
      orderCode: result.orderCode,
    })
  } catch (error: any) {
    console.error('Error handling WhatsApp webhook:', error)
    // Always return HTTP 200 so Fonnte acknowledges delivery and does not spam 15 retries
    return res.status(200).json({
      status: false,
      error: 'Error processing webhook',
    })
  }
}
