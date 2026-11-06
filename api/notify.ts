import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false },
    realtime: { transport: class DummyWS {} as any },
  })
}

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

export default async function handler(req: any, res: any) {
  // Set CORS headers
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return res.status(500).json({ error: 'Database connection failed' })
  }

  try {
    const { orderId, orderCode, newStatus, courierName, trackingNumber, sellerNote } = req.body || {}

    if (!newStatus) {
      return res.status(400).json({ error: 'newStatus is required' })
    }

    // 1. Fetch Order
    let order: any = null
    if (orderId) {
      const { data } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
      order = data
    } else if (orderCode) {
      const cleanCode = String(orderCode).replace(/^#/, '').trim()
      const { data } = await supabase.from('orders').select('*').ilike('order_code', `%${cleanCode}%`).maybeSingle()
      order = data
    }

    if (!order) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' })
    }

    // 2. Fetch Store Details
    const { data: store } = await supabase.from('stores').select('*').eq('id', order.store_id).maybeSingle()
    if (!store) {
      return res.status(404).json({ error: 'Toko tidak ditemukan' })
    }

    const fonnteToken = store.fonnte_token || process.env.FONNTE_TOKEN || ''
    if (!fonnteToken) {
      return res.status(400).json({ error: 'Token Fonnte WhatsApp toko belum dikonfigurasi di Pengaturan' })
    }

    // 3. Format Phone Number
    let cleanPhone = String(order.buyer_phone || '').replace(/@.*$/, '').replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1)
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone
    }

    if (!cleanPhone) {
      return res.status(400).json({ error: 'Nomor WhatsApp pembeli tidak valid' })
    }

    const storeName = store.name || 'Toko Kami'
    const buyerName = order.buyer_name || 'Kak'
    const orderDisplayCode = order.order_code || orderCode || 'ORD'
    const statusUpper = String(newStatus).toUpperCase()

    // 4. Construct Professional AI WhatsApp Notification Message
    let messageText = ''

    switch (statusUpper) {
      case 'PROCESSING':
        messageText = `Halo Kak *${buyerName}*! 🙏\n\nKabar baik dari *${storeName}*. Pesanan Kakak:\n📋 Kode: *#${orderDisplayCode}*\n\nStatus saat ini telah diperbarui menjadi:\n📦 *SEDANG DIPROSES (PROCESSING)*\n\nPesanan Kakak sedang kami siapkan dan kemas dengan rapi. Kami akan mengabarkan kembali begitu paket siap diserahkan ke kurir pengiriman ya Kak.\n\nTerima kasih banyak atas kepercayaannya berbelanja di ${storeName}! 😊`
        break

      case 'SHIPPED':
        messageText = `Halo Kak *${buyerName}*! 🚀\n\nPesanan Kakak dari *${storeName}* telah dikirimkan:\n📋 Kode Pesanan: *#${orderDisplayCode}*\n🚚 Ekspedisi / Kurir: *${courierName || order.courier_name || 'Kurir Pengiriman'}*\n${
          trackingNumber || order.tracking_number ? `📦 No. Resi: *${trackingNumber || order.tracking_number}*\n` : ''
        }\nStatus saat ini:\n🚚 *DALAM PENGIRIMAN (SHIPPED)*\n\nMohon ditunggu kedatangan paketnya ya Kak. Jika ada kendala dalam penerimaan, silakan hubungi kami di sini.\n\nTerima kasih banyak! 🙏`
        break

      case 'COMPLETED':
        messageText = `Halo Kak *${buyerName}*! 🎉\n\nPesanan Kakak:\n📋 Kode: *#${orderDisplayCode}*\n\nTelah dinyatakan:\n✅ *SELESAI (COMPLETED)*\n\nTerima kasih banyak telah berbelanja di *${storeName}*! Semoga produk yang diterima memuaskan dan bermanfaat ya Kak.\n\nJika Kakak berkenan, kami sangat menghargai ulasan atau testimoni pengalaman belanja Kakak di tautan berikut:\n⭐ tautanAI/${store.slug || ''}\n\nSampai jumpa di pesanan berikutnya! 🙏`
        break

      case 'PAID':
        messageText = `Halo Kak *${buyerName}*! 🙏\n\nPembayaran pesanan Kakak telah berhasil diverifikasi oleh tim *${storeName}*:\n📋 Kode Pesanan: *#${orderDisplayCode}*\n💰 Total Tagihan: *Rp${Number(order.total_amount || order.subtotal).toLocaleString('id-ID')}*\n\nStatus saat ini:\n✅ *LUNAS (PAID)*\n\nPesanan Kakak sedang kami siapkan dan segera diproses ya! 📦\n\n⭐ *Pertanyaan Kepuasan Pelanggan:*\nBagaimana pelayanan kami sejauh ini? Boleh bantu berikan rating *1 - 5 bintang*? (Cukup balas pesan ini dengan angka *1* sampai *5* beserta kesan/masukan Kakak ya!).\n\nTerima kasih banyak! 😊`
        break

      case 'CANCELLED':
        messageText = `Halo Kak *${buyerName}*.\n\nKami menginformasikan bahwa pesanan Kakak:\n📋 Kode: *#${orderDisplayCode}*\n\nTelah diubah statusnya menjadi:\n❌ *DIBATALKAN (CANCELLED)*\n${
          sellerNote || order.seller_internal_note ? `\nCatatan Toko: ${sellerNote || order.seller_internal_note}\n` : ''
        }\nApabila ada kekeliruan atau Kakak ingin memesan kembali, silakan hubungi kami kapan saja. Terima kasih banyak! 🙏`
        break

      default:
        messageText = `Halo Kak *${buyerName}*! Kami menginformasikan status pesanan *#${orderDisplayCode}* di *${storeName}* telah diperbarui menjadi *${statusUpper}*. Terima kasih! 🙏`
        break
    }

    // 5. Dispatch via Fonnte
    const fonnteRes = await dispatchFonnteMessage(fonnteToken, cleanPhone, messageText)

    // 6. Record message in ai_chat_sessions so chat thread stays synchronized
    try {
      await supabase.from('ai_chat_sessions').insert([
        {
          store_id: store.id,
          buyer_phone: cleanPhone,
          role: 'model',
          content: messageText,
        },
      ])
    } catch (logErr) {
      console.warn('Could not log status notification to ai_chat_sessions:', logErr)
    }

    return res.status(200).json({
      success: true,
      orderCode: orderDisplayCode,
      status: statusUpper,
      recipient: cleanPhone,
      messageText,
      fonnteResponse: fonnteRes,
    })
  } catch (error: any) {
    console.error('Error in notify API handler:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
