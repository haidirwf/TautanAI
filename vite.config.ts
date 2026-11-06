import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Vite plugin to serve the WhatsApp webhook locally during development
function localWhatsAppWebhookPlugin(envConfig: Record<string, string> = {}) {
  return {
    name: 'local-whatsapp-webhook-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/whatsapp', async (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            status: 'active',
            mode: 'local-dev-tunnel',
            service: 'TautanAI WhatsApp Webhook',
            timestamp: new Date().toISOString(),
          }))
          return
        }

        if (req.method === 'POST') {
          let rawBody = ''
          req.on('data', (chunk: any) => {
            rawBody += chunk
          })

          req.on('end', async () => {
            try {
              let parsed: any = {}
              try {
                parsed = JSON.parse(rawBody || '{}')
              } catch {
                parsed = Object.fromEntries(new URLSearchParams(rawBody))
              }

              const { processIncomingWhatsAppMessage } = await server.ssrLoadModule('/src/lib/gemini.ts')
              const sender = String(parsed.sender || parsed.from || parsed.phone || '').trim()
              const message = String(parsed.message || parsed.text || '').trim()
              const name = String(parsed.name || parsed.pushName || 'Pelanggan').trim()
              const url = parsed.url || parsed.file || undefined
              const device = String(parsed.device || parsed.token || '').trim()

              const result = await processIncomingWhatsAppMessage({
                senderPhone: sender,
                messageText: message,
                mediaUrl: url,
                senderName: name,
                storeWhatsappOrDevice: device,
              })

              // Dispatch via Fonnte REST API if token available
              const token = result.fonnteToken || process.env.FONNTE_TOKEN
              if (token && result.reply && sender) {
                try {
                  await fetch('https://api.fonnte.com/send', {
                    method: 'POST',
                    headers: {
                      Authorization: token,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      target: sender,
                      message: result.reply,
                      typing: false,
                    }),
                  })
                } catch (e) {
                  console.error('Local webhook Fonnte dispatch error:', e)
                }
              }

              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 200
              res.end(JSON.stringify({
                reply: result.reply,
                orderUpdated: result.orderUpdated,
                orderCreated: result.orderCreated,
                orderCode: result.orderCode,
              }))
            } catch (err: any) {
              console.error('Local webhook processing error:', err)
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 500
              res.end(JSON.stringify({
                error: err.message,
                reply: 'Halo, terjadi kendala teknis pada webhook lokal.',
              }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // Vite middleware to serve /api/notify locally during development
      server.middlewares.use('/api/notify', async (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        if (req.method === 'POST') {
          let rawBody = ''
          req.on('data', (chunk: any) => {
            rawBody += chunk
          })

          req.on('end', async () => {
            try {
              let parsed: any = {}
              try {
                parsed = JSON.parse(rawBody || '{}')
              } catch {
                parsed = Object.fromEntries(new URLSearchParams(rawBody))
              }

              const { orderId, orderCode, newStatus, courierName, trackingNumber, sellerNote } = parsed
              const { createClient } = await import('@supabase/supabase-js')
              const url = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
              const key = envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

              if (!url || !key) {
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Supabase URL/Key belum terkonfigurasi di env' }))
                return
              }

              const supabase = createClient(url, key, {
                auth: { persistSession: false },
                realtime: { transport: class DummyWS {} as any },
              })
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
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Pesanan tidak ditemukan' }))
                return
              }

              const { data: store } = await supabase.from('stores').select('*').eq('id', order.store_id).maybeSingle()
              const fonnteToken = store?.fonnte_token || envConfig.FONNTE_TOKEN || process.env.FONNTE_TOKEN || ''

              if (!fonnteToken) {
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Token Fonnte WhatsApp toko belum diisi di Pengaturan Toko' }))
                return
              }

              let cleanPhone = String(order.buyer_phone || '').replace(/@.*$/, '').replace(/[^0-9]/g, '')
              if (cleanPhone.startsWith('0')) {
                cleanPhone = '62' + cleanPhone.slice(1)
              } else if (cleanPhone.startsWith('8')) {
                cleanPhone = '62' + cleanPhone
              }

              const storeName = store?.name || 'Toko Kami'
              const buyerName = order.buyer_name || 'Kak'
              const orderDisplayCode = order.order_code || orderCode || 'ORD'
              const statusUpper = String(newStatus || '').toUpperCase()

              let messageText = ''
              switch (statusUpper) {
                case 'PROCESSING':
                  messageText = `Halo Kak *${buyerName}*! 🙏\n\nKabar baik dari *${storeName}*. Pesanan Kakak:\n📋 Kode: *#${orderDisplayCode}*\n\nStatus saat ini telah diperbarui menjadi:\n📦 *SEDANG DIPROSES (PROCESSING)*\n\nPesanan Kakak sedang kami siapkan dan kemas dengan rapi. Kami akan mengabarkan kembali begitu paket siap diserahkan ke kurir ya Kak.\n\nTerima kasih banyak atas kepercayaannya berbelanja di ${storeName}! 😊`
                  break
                case 'SHIPPED':
                  messageText = `Halo Kak *${buyerName}*! 🚀\n\nPesanan Kakak dari *${storeName}* telah dikirimkan:\n📋 Kode Pesanan: *#${orderDisplayCode}*\n🚚 Ekspedisi / Kurir: *${courierName || order.courier_name || 'Kurir Pengiriman'}*\n${
                    trackingNumber || order.tracking_number ? `📦 No. Resi: *${trackingNumber || order.tracking_number}*\n` : ''
                  }\nStatus saat ini:\n🚚 *DALAM PENGIRIMAN (SHIPPED)*\n\nMohon ditunggu kedatangan paketnya ya Kak. Jika ada kendala dalam penerimaan, silakan hubungi kami di sini.\n\nTerima kasih banyak! 🙏`
                  break
                case 'COMPLETED':
                  messageText = `Halo Kak *${buyerName}*! 🎉\n\nPesanan Kakak:\n📋 Kode: *#${orderDisplayCode}*\n\nTelah dinyatakan:\n✅ *SELESAI (COMPLETED)*\n\nTerima kasih banyak telah berbelanja di *${storeName}*! Semoga produk yang diterima memuaskan dan bermanfaat ya Kak.\n\nJika Kakak berkenan, kami sangat menghargai ulasan di etalase kami:\n⭐ https://tautan.site/${store?.slug || ''}\n\nSampai jumpa di pesanan berikutnya! 🙏`
                  break
                case 'PAID':
                  messageText = `Halo Kak *${buyerName}*! 🙏\n\nPembayaran pesanan Kakak telah berhasil diverifikasi oleh tim *${storeName}*:\n📋 Kode Pesanan: *#${orderDisplayCode}*\n💰 Total Tagihan: *Rp${Number(order.total_amount || order.subtotal).toLocaleString('id-ID')}*\n\nStatus saat ini:\n✅ *LUNAS (PAID)*\n\nPesanan Kakak akan segera masuk ke tahap pemrosesan dan pengemasan. Terima kasih banyak! 😊`
                  break
                case 'CANCELLED':
                  messageText = `Halo Kak *${buyerName}*.\n\nKami menginformasikan bahwa pesanan Kakak (*#${orderDisplayCode}*) telah diubah statusnya menjadi *DIBATALKAN (CANCELLED)*.\n${
                    sellerNote || order.seller_internal_note ? `\nCatatan Toko: ${sellerNote || order.seller_internal_note}\n` : ''
                  }\nTerima kasih! 🙏`
                  break
                default:
                  messageText = `Halo Kak *${buyerName}*! Status pesanan *#${orderDisplayCode}* di *${storeName}* telah diperbarui menjadi *${statusUpper}*. Terima kasih! 🙏`
                  break
              }

              let fonnteRes = null
              try {
                const fRes = await fetch('https://api.fonnte.com/send', {
                  method: 'POST',
                  headers: {
                    Authorization: fonnteToken,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    target: cleanPhone,
                    message: messageText,
                    countryCode: '62',
                  }),
                })
                fonnteRes = await fRes.json()
              } catch (fErr) {
                console.error('Fonnte dispatch error in local dev middleware:', fErr)
              }

              try {
                await supabase.from('ai_chat_sessions').insert([{
                  store_id: store?.id,
                  buyer_phone: cleanPhone,
                  role: 'model',
                  content: messageText,
                }])
              } catch (logErr) {
                console.warn('Could not log chat session:', logErr)
              }

              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 200
              res.end(JSON.stringify({
                success: true,
                orderCode: orderDisplayCode,
                status: statusUpper,
                recipient: cleanPhone,
                messageText,
                fonnteResponse: fonnteRes,
              }))
            } catch (err: any) {
              console.error('Local dev /api/notify error:', err)
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message || 'Internal server error' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [react(), localWhatsAppWebhookPlugin(env)],
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
            supabase: ['@supabase/supabase-js'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  }
})
