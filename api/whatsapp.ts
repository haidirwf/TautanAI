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
      signal: AbortSignal.timeout(12000),
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

  // Identify Store
  let storeQuery = supabase.from('stores').select('*')
  if (storeWhatsappOrDevice) {
    storeQuery = storeQuery.or(
      `whatsapp_number.eq.${storeWhatsappOrDevice},whatsapp_number.eq.62${storeWhatsappOrDevice.replace(/^0/, '')},fonnte_token.eq.${storeWhatsappOrDevice}`
    )
  }

  const { data: matchedStores } = await storeQuery.limit(1)
  let store: any = matchedStores && matchedStores.length > 0 ? matchedStores[0] : null

  if (!store) {
    const { data: defaultStore } = await supabase.from('stores').select('*').eq('ai_enabled', true).limit(1)
    if (defaultStore && defaultStore.length > 0) {
      store = defaultStore[0]
    }
  }

  if (!store || !store.ai_enabled) {
    return { reply: 'Terima kasih telah menghubungi kami. Pesan Anda telah kami terima dan akan segera dibalas oleh admin.' }
  }

  // Fetch Catalog Products with ai_context
  const { data: rawProducts } = await supabase
    .from('products')
    .select('*, variant_groups(*, variant_options(*))')
    .eq('store_id', store.id)
    .eq('is_active', true)

  const products: any[] = rawProducts || []

  // Fetch Recent Orders for Buyer
  const cleanPhone = senderPhone.replace(/[^0-9]/g, '')
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('store_id', store.id)
    .eq('buyer_phone', cleanPhone)
    .order('created_at', { ascending: false })
    .limit(3)

  // Fetch Previous Chat History
  const { data: chatHistory } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('store_id', store.id)
    .eq('buyer_phone', cleanPhone)
    .order('created_at', { ascending: false })
    .limit(6)

  const orderedHistory = (chatHistory || []).reverse()

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

  const contents: any[] = []
  for (const item of orderedHistory) {
    contents.push({
      role: item.role === 'model' ? 'model' : 'user',
      parts: [{ text: item.content }],
    })
  }

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
    let firstRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstructionText }] },
        tools,
        generationConfig: { temperature: 0.3, maxOutputTokens: 350 },
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
          generationConfig: { temperature: 0.3, maxOutputTokens: 350 },
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
            generationConfig: { temperature: 0.4 },
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
        } else if (fnName === 'confirm_buyer_payment' && toolResult.success) {
          finalReply = `Terima kasih banyak Kak! Pembayaran untuk pesanan *${toolResult.order_code}* telah berhasil diverifikasi lunas. Kami akan segera memproses pengirimannya! 🙏`
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
    orderUpdated,
    orderCreated,
    orderCode: targetOrderCode,
    fonnteToken: store.fonnte_token,
  }
}

// In-memory deduplication cache to prevent Fonnte duplicate webhook retries
const processedMessagesCache = new Map<string, number>()

function isDuplicateRequest(body: any): boolean {
  const now = Date.now()
  for (const [key, timestamp] of processedMessagesCache.entries()) {
    if (now - timestamp > 30000) {
      processedMessagesCache.delete(key)
    }
  }

  const uniqueId = body.inboxid || body.id
  if (uniqueId) {
    if (processedMessagesCache.has(`id:${uniqueId}`)) {
      return true
    }
    processedMessagesCache.set(`id:${uniqueId}`, now)
    return false
  }

  const sender = String(body.sender || body.from || body.phone || '')
  const message = String(body.message || body.text || '')
  const cacheKey = `msg:${sender}:${message.trim()}`
  if (processedMessagesCache.has(cacheKey)) {
    const lastSeen = processedMessagesCache.get(cacheKey) || 0
    if (now - lastSeen < 3000) {
      return true
    }
  }

  processedMessagesCache.set(cacheKey, now)
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
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body || {}

    // Extract Fonnte Webhook Payload
    const sender = String(body.sender || body.from || body.phone || '').trim()
    const message = String(body.message || body.text || '').trim()
    const name = String(body.name || body.pushName || 'Pelanggan').trim()
    const url = body.url || body.file || undefined
    const device = String(body.device || body.token || '').trim()

    if (!sender) {
      return res.status(400).json({ error: 'Sender phone number is required' })
    }

    // Deduplication gate: If Fonnte retries the exact same message within 4 seconds, exit immediately
    if (isDuplicateRequest(body)) {
      return res.status(200).json({ status: 'ignored_duplicate_webhook' })
    }

    // Process incoming message with Gemini AI Engine
    const result = await processIncomingWhatsAppMessage({
      senderPhone: sender,
      messageText: message,
      mediaUrl: url,
      senderName: name,
      storeWhatsappOrDevice: device,
    })

    // Fonnte official protocol: Dispatch reply to https://api.fonnte.com/send
    const activeFonnteToken = result.fonnteToken || process.env.FONNTE_TOKEN || 'SFjQ1582ANj1k7JvUEtV'
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
    return res.status(500).json({
      error: 'Internal server error processing webhook',
      reply: 'Halo kak, sistem kami sedang mengalami kendala teknis sementara.',
    })
  }
}
