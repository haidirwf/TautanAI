import { processIncomingWhatsAppMessage } from '../src/lib/gemini'

export default async function handler(req: any, res: any) {
  // CORS configuration
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

  // Health check / GET ping
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

    // Process incoming message with Gemini AI Engine
    const result = await processIncomingWhatsAppMessage({
      senderPhone: sender,
      messageText: message,
      mediaUrl: url,
      senderName: name,
      storeWhatsappOrDevice: device,
    })

    // Return JSON response format compatible with Fonnte Webhook auto-reply
    return res.status(200).json({
      reply: result.reply,
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
