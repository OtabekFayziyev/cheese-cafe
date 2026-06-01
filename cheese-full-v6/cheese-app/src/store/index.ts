import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppUser, CartItem, MenuItem, Extra,
  Order, SavedPromo, SavedAddress, CafeSettings,
} from '@/types'
import { CAFE_SETTINGS } from '@/api/mockData'

// ─────────────────────────────────────
// CART STORE
// ─────────────────────────────────────
interface CartState {
  items: CartItem[]
  promoCode: string | null
  discount: number
  deliveryType: 'delivery' | 'pickup'
  deliveryFee: number
  addItem: (item: MenuItem, qty: number, extras: Extra[], note: string) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  applyPromo: (code: string, discount: number) => void
  clearPromo: () => void
  setDeliveryType: (type: 'delivery' | 'pickup') => void
  setDeliveryFee:  (fee: number) => void
  clear: () => void
  totalItems: () => number
  subtotal: () => number
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      discount: 0,
      deliveryType: 'delivery',
      deliveryFee: 5000,

      addItem: (menuItem, quantity, selectedExtras, note) => {
        const extraTotal = selectedExtras.reduce((s, e) => s + e.price, 0)
        const totalPrice = (menuItem.price + extraTotal) * quantity
        const newItem: CartItem = {
          id: `${menuItem.id}-${Date.now()}`,
          menuItem, quantity, selectedExtras, note, totalPrice,
        }
        set(s => ({ items: [...s.items, newItem] }))
      },

      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),

      updateQty: (id, qty) => set(s => ({
        items: s.items.map(i => {
          if (i.id !== id) return i
          const extraTotal = i.selectedExtras.reduce((sum, e) => sum + e.price, 0)
          return { ...i, quantity: qty, totalPrice: (i.menuItem.price + extraTotal) * qty }
        }).filter(i => i.quantity > 0)
      })),

      applyPromo: (code, discount) => set({ promoCode: code, discount }),
      clearPromo: () => set({ promoCode: null, discount: 0 }),

      setDeliveryType: (type) => set(s => ({
        deliveryType: type,
        deliveryFee: type === 'pickup' ? 0 : s.deliveryFee || 5000,
      })),

      setDeliveryFee: (fee: number) => set({ deliveryFee: fee }),

      clear: () => set({ items: [], promoCode: null, discount: 0 }),

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.totalPrice, 0),
      total: () => {
        const { subtotal, discount, deliveryFee } = get()
        return Math.max(0, subtotal() - discount + deliveryFee)
      },
    }),
    { name: 'cheese-cart' }
  )
)

// ─────────────────────────────────────
// USER STORE
// ─────────────────────────────────────
interface UserState {
  user: AppUser | null
  favIds: string[]
  setUser: (user: AppUser) => void
  setPhone: (phone: string) => void
  toggleFav: (id: string) => void
  addSavedPromo: (promo: SavedPromo) => void
  addSavedAddress: (addr: SavedAddress) => void
  addBonusPoints: (pts: number) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      favIds: [],

      setUser: (user) => set({ user }),
      setPhone: (phone) => set(s => s.user ? { user: { ...s.user, phone } } : {}),

      toggleFav: (id) => set(s => ({
        favIds: s.favIds.includes(id)
          ? s.favIds.filter(f => f !== id)
          : [...s.favIds, id],
      })),

      addSavedPromo: (promo) => set(s => {
        if (!s.user) return {}
        const exists = s.user.savedPromos.find(p => p.code === promo.code)
        if (exists) return {}
        return { user: { ...s.user, savedPromos: [...s.user.savedPromos, promo] } }
      }),

      addSavedAddress: (addr) => set(s => {
        if (!s.user) return {}
        return { user: { ...s.user, savedAddresses: [...s.user.savedAddresses, addr] } }
      }),

      addBonusPoints: (pts) => set(s => {
        if (!s.user) return {}
        return { user: { ...s.user, bonusPoints: s.user.bonusPoints + pts } }
      }),
    }),
    { name: 'cheese-user' }
  )
)

// ─────────────────────────────────────
// ORDER STORE
// ─────────────────────────────────────
interface OrderState {
  activeOrder: Order | null
  orderHistory: Order[]
  setActiveOrder: (order: Order | null) => void
  addToHistory: (order: Order) => void
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      activeOrder: null,
      orderHistory: [],
      setActiveOrder: (order) => set({ activeOrder: order }),
      addToHistory: (order) => set(s => ({
        orderHistory: [order, ...s.orderHistory].slice(0, 50),
      })),
    }),
    { name: 'cheese-orders' }
  )
)

// ─────────────────────────────────────
// CAFE SETTINGS STORE
// ─────────────────────────────────────
interface CafeState {
  settings: CafeSettings
  isOpen: boolean
  setSettings: (s: CafeSettings) => void
  checkOpen: () => boolean
}

export const useCafeStore = create<CafeState>()((set, get) => ({
  settings: CAFE_SETTINGS,
  isOpen: true,

  setSettings: (settings) => set({ settings }),

  checkOpen: () => {
    const { settings } = get()
    const now = new Date()
    const day = now.getDay()
    const hours = settings.workHours[day]
    if (!hours || hours.isOff) return false

    const [oh, om] = hours.open.split(':').map(Number)
    const [ch, cm] = hours.close.split(':').map(Number)
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const openMins = oh * 60 + om
    let closeMins = ch * 60 + cm
    if (closeMins < openMins) closeMins += 24 * 60

    const nowAdj = nowMins < openMins ? nowMins + 24 * 60 : nowMins
    return nowAdj >= openMins && nowAdj < closeMins
  },
}))
