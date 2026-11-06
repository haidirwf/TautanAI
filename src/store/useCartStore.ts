import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product, VariantOption } from '@/types'

interface CustomerInfo {
  name: string
  phone: string
  address: string
  notes: string
  paymentMethod?: string
  senderName?: string
  senderAccount?: string
}

interface CartState {
  items: CartItem[]
  isCartOpen: boolean
  customerInfo: CustomerInfo
  addItem: (product: Product, selectedVariants?: Record<string, VariantOption>, quantity?: number) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, delta: number) => void
  clearCart: () => void
  setCartOpen: (open: boolean) => void
  setCustomerInfo: (info: Partial<CustomerInfo>) => void
  getSubtotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      customerInfo: {
        name: '',
        phone: '',
        address: '',
        notes: '',
        paymentMethod: 'Transfer BCA',
        senderName: '',
        senderAccount: '',
      },

      addItem: (product, selectedVariants = {}, quantity = 1) => {
        // Compute unit price including variants
        const variantDelta = Object.values(selectedVariants).reduce(
          (sum, opt) => sum + (opt.price_delta || 0),
          0
        )
        const unitPrice = product.base_price + variantDelta

        // Generate unique key based on product ID and sorted variant choices
        const variantKey = Object.entries(selectedVariants)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([group, opt]) => `${group}:${opt.id}`)
          .join('|')
        const itemId = `${product.id}-${variantKey}`

        const currentItems = get().items
        const existingIndex = currentItems.findIndex((i) => i.id === itemId)

        if (existingIndex > -1) {
          const updated = [...currentItems]
          updated[existingIndex].quantity += quantity
          set({ items: updated })
        } else {
          set({
            items: [
              ...currentItems,
              {
                id: itemId,
                product,
                selectedVariants,
                unitPrice,
                quantity,
              },
            ],
          })
        }
      },

      removeItem: (itemId) => {
        set({ items: get().items.filter((i) => i.id !== itemId) })
      },

      updateQuantity: (itemId, delta) => {
        const currentItems = get().items
        const updated = currentItems
          .map((item) => {
            if (item.id === itemId) {
              const newQty = item.quantity + delta
              return newQty > 0 ? { ...item, quantity: newQty } : null
            }
            return item
          })
          .filter((item): item is CartItem => item !== null)

        set({ items: updated })
      },

      clearCart: () => {
        set({ items: [] })
      },

      setCartOpen: (open) => {
        set({ isCartOpen: open })
      },

      setCustomerInfo: (info) => {
        set({
          customerInfo: { ...get().customerInfo, ...info },
        })
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'tautan_cart_storage',
      partialize: (state) => ({
        items: state.items,
        customerInfo: state.customerInfo,
      }),
    }
  )
)
