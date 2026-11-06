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

  if (!store || !store.ai_enabled) {
    return { reply: '' }
  }

  let cleanPhone = senderPhone.replace(/@.*$/, '').replace(/[^0-9]/g, '')
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1)
  } else if (cleanPhone.startsWith('8')) {
    cleanPhone = '62' + cleanPhone
  }
  const altPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone

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

KATALOG PRODUK TOKO SAAT INI:
${catalogContext || '(Katalog belum memiliki produk aktif)'}

PESANAN TERAKHIR DARI NOMOR INI:
${pendingOrdersContext || '(Belum ada pesanan sebelumnya)'}

ATURAN UTAMA ANDA:
1. Jawab pertanyaan seputar barang secara informatif dengan memanfaatkan 'Catatan Khusus AI' dari masing-masing produk.
2. Jika pembeli ingin memesan barang, rekap nama barang, jumlah, dan alamat pengiriman, lalu gunakan tool "create_order_draft" untuk membuat pesanan di sistem.
3. Berikan instruksi transfer/QRIS sesuai rekening toko saat pesanan dibuat.
4. SANGAT PENTING - MENGUBAH STATUS PESANAN (PAID / LUNAS / BATAL):
   - Jika pembeli mengirim bukti transfer, foto struk, atau menyatakan sudah bayar/transfer, Anda WAJIB MEMANGGIL tool "confirm_buyer_payment" (atau "update_order_status" dengan status "PAID") agar status di sistem toko dan dashboard penjual otomatis berubah menjadi PAID.
   - Jika pembeli membatalkan pesanan, panggil tool "update_order_status" dengan status "CANCELLED".
   - Jika pembeli tidak menyebutkan kode pesanan, gunakan kode pesanan pending yang tercatat di riwayat "PESANAN TERAKHIR DARI NOMOR INI" di atas.
   - JANGAN PERNAH menyatakan pesanan sudah Lunas (PAID) dalam teks balasan tanpa berhasil mengeksekusi tool database terlebih dahulu!
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
          description: 'Mengubah status pesanan menjadi PAID (Lunas) di database saat pembeli mengirim bukti transfer atau konfirmasi lunas.',
          parameters: {
            type: 'OBJECT',
            properties: {
              order_code: { type: 'STRING', description: 'Kode pesanan pembeli (misal: ORD-...). Boleh kosong jika merujuk pesanan terakhir.' },
              payment_notes: { type: 'STRING', description: 'Catatan bukti pembayaran / bank pengirim' },
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
  currentParts.push({ text: messageText || (mediaUrl ? 'Saya mengirimkan foto/bukti pembayaran transfer ini, mohon segera diverifikasi.' : 'Halo') })

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
      } else if (fnName === 'confirm_buyer_payment' || fnName === 'update_order_status') {
        const rawCode = String(fnArgs.order_code || '').trim().replace(/^#/, '')
        const targetStatus = String(fnArgs.status || 'PAID').toUpperCase()
        const notes = fnArgs.notes || fnArgs.payment_notes || (mediaUrl ? 'Bukti transfer terlampir' : 'Dikonfirmasi oleh pembeli via WA')

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
            if (matchedOrder.status === targetStatus) {
              updatedSuccess = true
              updatedOrderCode = matchedOrder.order_code
            } else {
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

              const { data: directUpdated, error: directErr } = await supabase
                .from('orders')
                .update(patchData)
                .eq('id', matchedOrder.id)
                .select()
                .maybeSingle()

              if (!directErr && directUpdated) {
                updatedSuccess = true
                updatedOrderCode = directUpdated.order_code
              } else if (directErr) {
                console.error('Direct order update error:', directErr)
              }
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
            message: `Status pesanan ${updatedOrderCode} berhasil diubah menjadi ${targetStatus} di database.`,
          }
        } else {
          toolResult = {
            success: false,
            message: 'Tidak ditemukan pesanan pending yang sesuai untuk nomor WhatsApp Anda atau database gagal diperbarui.',
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
