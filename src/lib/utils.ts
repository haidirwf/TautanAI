import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Order, Store } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function sanitizeWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned
  } else if (cleaned.startsWith('+62')) {
    cleaned = cleaned.slice(1)
  }
  return cleaned
}

export function generateOrderCode(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const randomSuffix = typeof crypto !== 'undefined' && crypto.getRandomValues
    ? Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map((b) => b.toString(36).padStart(2, '0'))
        .join('')
        .slice(0, 6)
        .toUpperCase()
    : Math.random().toString(36).substring(2, 8).toUpperCase()
  return `#ORD-${year}${month}${day}-${randomSuffix}`
}

export function buildWhatsAppOrderMessage(
  order: Pick<
    Order,
    | 'order_code'
    | 'buyer_name'
    | 'buyer_phone'
    | 'shipping_address'
    | 'order_notes'
    | 'items_snapshot'
    | 'subtotal'
    | 'payment_method'
    | 'payment_sender_name'
    | 'payment_sender_account'
  >,
  store: Store
): string {
  const itemsText = order.items_snapshot
    .map((item) => {
      const variantDesc = item.variants && Object.keys(item.variants).length > 0
        ? ` (${Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(', ')})`
        : ''
      return `- ${item.quantity}x ${item.product_name}${variantDesc} — ${formatIDR(item.subtotal)}`
    })
    .join('\n')

  const lines = [
    `Halo kak ${store.name}, saya ingin memesan:`,
    ``,
    `*Pesanan:* ${order.order_code}`,
    `*Nama:* ${order.buyer_name}`,
    `*No. WA:* ${order.buyer_phone}`,
    `*Alamat:* ${order.shipping_address}`,
    ``,
    `*Rincian Barang:*`,
    itemsText,
    ``,
    `*Subtotal:* ${formatIDR(order.subtotal)}`,
  ]

  if (order.payment_method || order.payment_sender_name || order.payment_sender_account) {
    lines.push(``)
    lines.push(`*Data Pembayaran Pengirim:*`)
    if (order.payment_method) lines.push(`- Bank / E-Wallet: ${order.payment_method}`)
    if (order.payment_sender_name) lines.push(`- Atas Nama Pengirim: ${order.payment_sender_name}`)
    if (order.payment_sender_account) lines.push(`- No. Rekening / No. HP: ${order.payment_sender_account}`)
  }

  if (order.order_notes?.trim()) {
    lines.push(``)
    lines.push(`*Catatan:* ${order.order_notes.trim()}`)
  }

  lines.push(``)
  lines.push(`Mohon konfirmasi pesanan dan estimasi pengirimannya ya kak. Terima kasih!`)

  return lines.join('\n')
}
