import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Vite plugin to serve the WhatsApp webhook locally during development
function localWhatsAppWebhookPlugin() {
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
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localWhatsAppWebhookPlugin()],
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
})
