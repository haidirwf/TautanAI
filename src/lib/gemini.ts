import { createClient } from '@supabase/supabase-js'
import type { Store, Product } from '../types'

declare const process: any

// Initialize Supabase admin/client for serverless/edge environments
function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
  // Prefer service role key if available for administrative writes in webhook, fallback to anon key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  if (!url || !key) return null
  return createClient(url, key)
}

export interface ProcessWhatsAppMessageInput {
  senderPhone: string
  messageText: string
  mediaUrl?: string
  senderName?: string
  storeWhatsappOrDevice?: string
}

export interface ProcessWhatsAppMessageResult {
  reply: string
  isDuplicate?: boolean
  orderUpdated?: boolean
  orderCreated?: boolean
  orderCode?: string
  fonnteToken?: string
}

export async function processIncomingWhatsAppMessage(
  input: ProcessWhatsAppMessageInput
): Promise<ProcessWhatsAppMessageResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { reply: 'Sistem sedang pemeliharaan koneksi database. Mohon coba beberapa saat lagi.' }
  }

  const { senderPhone, messageText, mediaUrl, senderName, storeWhatsappOrDevice } = input

  // 1. Identify Store
  let storeQuery = supabase.from('stores').select('*')
  if (storeWhatsappOrDevice) {
    storeQuery = storeQuery.or(
      `whatsapp_number.eq.${storeWhatsappOrDevice},whatsapp_number.eq.62${storeWhatsappOrDevice.replace(/^0/, '')},fonnte_token.eq.${storeWhatsappOrDevice}`
    )
  }

  const { data: matchedStores } = await storeQuery.limit(1)
  let store: Store | null = matchedStores && matchedStores.length > 0 ? matchedStores[0] : null

  // Fallback: If no exact match by device, get the first active store with AI enabled
  if (!store) {
    const { data: defaultStore } = await supabase.from('stores').select('*').eq('ai_enabled', true).limit(1)
    if (defaultStore && defaultStore.length > 0) {
      store = defaultStore[0]
    }
  }

  if (!store || !store.ai_enabled) {
    return { reply: 'Terima kasih telah menghubungi kami. Pesan Anda telah kami terima dan akan segera dibalas oleh admin.' }
  }

  const cleanPhone = senderPhone.replace(/[^0-9]/g, '')

  // 2. Fetch Catalog, Recent Orders, and Previous Chat History in parallel
  const [productsRes, ordersRes, chatRes] = await Promise.all([
    supabase
      .from('products')
      .select('*, variant_groups(*, variant_options(*))')
      .eq('store_id', store.id)
      .eq('is_active', true),
    supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .eq('buyer_phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('store_id', store.id)
      .eq('buyer_phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const products: Product[] = (productsRes.data as Product[]) || []
  const recentOrders: any[] = ordersRes.data || []
  const rawHistory: any[] = chatRes.data || []

  // Database-level deduplication: If this exact message was already replied to in the last 15 minutes, abort retry
  if (rawHistory.length > 0 && messageText) {
    const normalizedIncoming = messageText.trim().toLowerCase()
    const latestMsg = rawHistory[0]
    const recentUserMsg = rawHistory.find((m: any) => m.role === 'user')
    if (recentUserMsg && recentUserMsg.content.trim().toLowerCase() === normalizedIncoming) {
      const msgTime = new Date(recentUserMsg.created_at).getTime()
      const diffMs = Date.now() - msgTime
      if (diffMs < 15 * 60 * 1000 && latestMsg.role === 'model') {
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

  // 5. Initialize Google Gemini AI REST Endpoint
  const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
  if (!geminiApiKey) {
    console.error('Missing GEMINI_API_KEY')
    return { reply: 'Halo! Mohon maaf sistem AI kami sedang dalam konfigurasi kunci API. Pesan Anda segera dibalas penjual.' }
  }

  const modelName = store.ai_model || process.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`

  // Prepare Catalog Context String
  const catalogContext = products.map((p) => {
    const variants = (p.variant_groups || []).map(g => `${g.name}: [${(g.options || []).map(o => `${o.name} (+${o.price_delta})`).join(', ')}]`).join('; ')
    return `- ${p.name} (ID: ${p.id}) | Harga: Rp${p.base_price.toLocaleString('id-ID')} | Stok: ${p.stock !== null && p.stock !== undefined ? p.stock : 'Tersedia'}${variants ? ` | Varian: ${variants}` : ''}${p.ai_context ? ` | Catatan Khusus AI: ${p.ai_context}` : ''}`
  }).join('\n')

  const pendingOrdersContext = (recentOrders || []).map(o => {
    return `- Kode: ${o.order_code} | Total: Rp${o.total_amount.toLocaleString('id-ID')} | Status: ${o.status} | Item: ${JSON.stringify(o.items_snapshot)}`
  }).join('\n')

  // System Instruction
  const systemInstructionText = `Anda adalah Asisten Penjualan & Layanan Pelanggan WhatsApp Otonom untuk toko "${store.name}".
Gaya Karakter / Persona Toko: "${store.ai_persona || 'Ramah, sopan, sigap membantu, dan mengedepankan keramahan wirausaha Bali.'}"
Instruksi Operasional Toko: "${store.ai_instructions || 'Bantu pembeli menjawab pertanyaan seputar katalog, cek stok, rekap pesanan, dan verifikasi pembayaran transfer.'}"
Panduan Rekening Pembayaran Toko: "${store.ai_payment_info || 'BCA: 1234567890 a/n Toko'}"

KATALOG PRODUK TOKO SAAT INI:
${catalogContext || '(Katalog belum memiliki produk aktif)'}

PESANAN TERAKHIR DARI NOMOR INI:
${pendingOrdersContext || '(Belum ada pesanan sebelumnya)'}

ATURAN UTAMA ANDA:
1. Jawab pertanyaan seputar barang secara informatif dengan memanfaatkan 'Catatan Khusus AI' dari masing-masing produk.
2. Jika pembeli ingin memesan barang, rekap nama barang, jumlah, dan alamat pengiriman, lalu gunakan tool "create_order_draft" untuk membuat pesanan di sistem.
3. Berikan instruksi transfer/QRIS sesuai rekening toko saat pesanan dibuat.
4. Jika pembeli mengirim konfirmasi atau bukti transfer (termasuk foto bukti bayar), gunakan tool "confirm_buyer_payment" untuk mengubah status pesanan dari PENDING_WA menjadi PAID/PROCESSING secara otomatis di sistem toko.
5. Jangan gunakan tanda pagar tiga (###) dalam pesan WhatsApp Anda. Gunakan format WhatsApp yang rapi (*tebal*, _miring_, poin-poin).`

  // Define Function Calling Tools for REST API
  const tools = [
    {
      functionDeclarations: [
        {
          name: 'check_stock',
          description: 'Mengecek ketersediaan stok produk dan varian yang tersedia di katalog toko.',
          parameters: {
            type: 'OBJECT',
            properties: {
              product_name: {
                type: 'STRING',
                description: 'Nama atau kata kunci produk yang ingin dicari',
              },
            },
            required: ['product_name'],
          },
        },
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
            },
            required: ['buyer_name'],
          },
        },
        {
          name: 'confirm_buyer_payment',
          description: 'Mengubah status pesanan menjadi PAID atau PROCESSING saat pembeli mengirim bukti transfer atau konfirmasi lunas.',
          parameters: {
            type: 'OBJECT',
            properties: {
              order_code: { type: 'STRING', description: 'Kode pesanan pembeli (misal: ORD-...)' },
              payment_notes: { type: 'STRING', description: 'Catatan bukti pembayaran / bank pengirim' },
            },
            required: ['order_code'],
          },
        },
      ],
    },
  ]

  // Construct Conversation Contents
  const contents: any[] = []

  for (const item of orderedHistory) {
    contents.push({
      role: item.role === 'model' ? 'model' : 'user',
      parts: [{ text: item.content }],
    })
  }

  // Current User Message
  const currentParts: any[] = []
  if (mediaUrl) {
    currentParts.push({ text: `[Pelanggan mengirim file/foto bukti: ${mediaUrl}]` })
  }
  currentParts.push({ text: messageText || 'Halo' })

  contents.push({
    role: 'user',
    parts: currentParts,
  })

  let finalReply = ''
  let orderUpdated = false
  let orderCreated = false
  let targetOrderCode: string | undefined

  try {
    const firstRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstructionText }] },
        tools,
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    })

    const firstData = await firstRes.json()
    const firstCandidate = firstData?.candidates?.[0]?.content

    // Check for Function Calls
    const functionCallPart = firstCandidate?.parts?.find((p: any) => p.functionCall)

    if (functionCallPart && functionCallPart.functionCall) {
      const toolCall = functionCallPart.functionCall
      const fnName = toolCall.name
      const fnArgs = toolCall.args || {}

      let toolResult: any = {}

      if (fnName === 'check_stock') {
        const query = String(fnArgs.product_name || '').toLowerCase()
        const found = products.filter(p => p.name.toLowerCase().includes(query))
        toolResult = {
          success: true,
          matches: found.map(p => ({
            name: p.name,
            price: p.base_price,
            stock: p.stock !== null && p.stock !== undefined ? p.stock : 'Selalu Tersedia',
            ai_context: p.ai_context,
          })),
        }
      } else if (fnName === 'create_order_draft') {
        const orderCode = `ORD-${Date.now().toString(36).toUpperCase()}`
        const pId = fnArgs.product_id
        const prod = products.find(p => p.id === pId) || products[0]
        const qty = Number(fnArgs.quantity) || 1
        const unitPrice = prod ? prod.base_price : 100000
        const subtotal = unitPrice * qty

        const { data: newOrder, error: orderErr } = await supabase
          .from('orders')
          .insert([{
            store_id: store.id,
            order_code: orderCode,
            buyer_name: String(fnArgs.buyer_name || senderName || 'Pelanggan WhatsApp'),
            buyer_phone: cleanPhone,
            shipping_address: String(fnArgs.shipping_address || 'Menunggu konfirmasi alamat'),
            subtotal,
            shipping_fee: 0,
            total_amount: subtotal,
            payment_method: 'MANUAL_TRANSFER',
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
          }])
          .select()
          .single()

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
      } else if (fnName === 'confirm_buyer_payment') {
        const orderCode = String(fnArgs.order_code || '').trim()
        const { data: updatedOrder, error: updateErr } = await supabase
          .from('orders')
          .update({
            status: 'PAID',
            paid_at: new Date().toISOString(),
            managed_by_ai: true,
            payment_proof_url: mediaUrl || '',
            seller_internal_note: `Lunas terverifikasi oleh AI WhatsApp: ${fnArgs.payment_notes || 'Bukti bayar terlampir'}`,
          })
          .eq('store_id', store.id)
          .ilike('order_code', `%${orderCode.replace(/^#/, '')}%`)
          .select()
          .single()

        if (!updateErr && updatedOrder) {
          orderUpdated = true
          targetOrderCode = updatedOrder.order_code
          toolResult = {
            success: true,
            order_code: updatedOrder.order_code,
            new_status: 'PAID',
            message: 'Status pesanan berhasil diubah menjadi Lunas (PAID). Siap dipacking oleh penjual.',
          }
        } else {
          if (recentOrders && recentOrders.length > 0) {
            const latest = recentOrders[0]
            await supabase.from('orders').update({
              status: 'PAID',
              paid_at: new Date().toISOString(),
              managed_by_ai: true,
              payment_proof_url: mediaUrl || '',
            }).eq('id', latest.id)
            orderUpdated = true
            targetOrderCode = latest.order_code
            toolResult = {
              success: true,
              order_code: latest.order_code,
              new_status: 'PAID',
            }
          } else {
            toolResult = { success: false, message: 'Pesanan tidak ditemukan' }
          }
        }
      }

      // Second turn with tool result to get final reply text
      const secondContents = [
        ...contents,
        firstCandidate,
        {
          role: 'user',
          parts: [{
            functionResponse: {
              name: fnName,
              response: toolResult,
            },
          }],
        },
      ]

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
      finalReply = secondData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Baik kak, pesanan Anda telah kami catat.'
    } else {
      finalReply = firstCandidate?.parts?.[0]?.text || 'Halo kak, ada yang bisa kami bantu seputar produk toko kami?'
    }
  } catch (error: any) {
    console.error('Gemini REST API execution error:', error)
    finalReply = 'Halo kak, mohon maaf terjadi kendala sementara di sistem AI kami. Pesan Anda segera dijawab oleh admin toko kami.'
  }

  // 6. Save Chat History to Supabase
  try {
    await supabase.from('ai_chat_sessions').insert([
      {
        store_id: store.id,
        buyer_phone: cleanPhone,
        role: 'user',
        content: messageText || (mediaUrl ? '[Kirim Foto]' : ''),
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
