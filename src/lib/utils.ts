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
    `Halo kak ${store.name}! Saya tertarik dengan produk ini dan mau tanya-tanya / makesure dulu ya kak:`,
    ``,
    `*Rincian Barang:*`,
    itemsText,
    ``,
    `*Estimasi Subtotal:* ${formatIDR(order.subtotal)}`,
    ``,
    `*Data Saya:*`,
    `- Nama: ${order.buyer_name}`,
    `- Alamat Pengiriman: ${order.shipping_address}`,
    `- Kode Draf: ${order.order_code}`,
  ]

  if (order.order_notes?.trim()) {
    lines.push(``)
    lines.push(`*Catatan Tambahan:* ${order.order_notes.trim()}`)
  }

  lines.push(``)
  lines.push(`Apakah produk di atas masih ready kak? Sekalian mau makesure info ongkir atau tanya detail barangnya dulu ya. Terima kasih banyak! 😊`)

  return lines.join('\n')
}
