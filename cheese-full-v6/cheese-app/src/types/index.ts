export type UserRole = 'user' | 'admin' | 'courier'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

export interface AppUser {
  telegramId: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  phone?: string
  role: UserRole
  bonusPoints: number
  savedPromos: SavedPromo[]
  savedAddresses: SavedAddress[]
}

export interface Category {
  id: string
  name: string
  emoji: string
  sortOrder: number
}

export interface Extra {
  id: string
  name: string
  price: number
}

export interface MenuItem {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  emoji: string
  image?: string
  prepTime: number        // minutes
  extras: Extra[]
  breadOptions?: string[] // for hotdogs: ['Non','Bulochka']
  presetNotes?: string[]  // for hotdogs preset comments
  isAvailable: boolean
  isHot: boolean
  isNew: boolean
  rating: number
  soldCount: number
}

export interface CartItem {
  id: string
  menuItem: MenuItem
  quantity: number
  selectedExtras: Extra[]
  note: string
  breadChoice?: string
  totalPrice: number
}

export type OrderStatus = 'pending'|'accepted'|'preparing'|'ready'|'on_the_way'|'delivered'|'cancelled'
export type DeliveryType = 'delivery' | 'pickup'
export type PaymentType  = 'cash' | 'payme' | 'click'

export interface OrderItem {
  id: string
  menuItem: MenuItem
  quantity: number
  extras: Extra[]
  note: string
  price: number
}

export interface Order {
  id: string
  userId: number
  items: OrderItem[]
  status: OrderStatus
  deliveryType: DeliveryType
  address?: string
  addressDetail?: string
  lat?: number
  lng?: number
  phone: string
  secondPhone?: string
  paymentType: PaymentType
  promoCode?: string
  discount: number
  deliveryFee: number
  totalPrice: number
  courierId?: number
  courier?: CourierInfo
  note?: string
  createdAt: string
  updatedAt: string
}

export interface CourierInfo {
  id: number
  firstName: string
  rating: number
  deliveryCount: number
  currentLat?: number
  currentLng?: number
  phone: string
}

export interface PromoCode {
  code: string
  discount: number
  discountType: 'fixed' | 'percent'
  minOrder: number
  expiresAt: string
  isActive: boolean
}

export interface SavedPromo {
  code: string
  discount: number
  discountType: 'fixed' | 'percent'
  expiresAt: string
}

export interface SavedAddress {
  id: string
  label: string
  address: string
  detail?: string
  lat?: number
  lng?: number
}

export interface WorkHours {
  day: number
  open: string
  close: string
  isOff: boolean
}

export interface CafeSettings {
  isOpen: boolean
  workHours: WorkHours[]
  deliveryFeeBase: number
  deliveryFeePerKm: number
  minOrderAmount: number
  estimatedTime: number
}

export interface BonusReward {
  id: string
  name: string
  emoji: string
  pointsRequired: number
  menuItemId?: string
}

export interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  pendingOrders: number
  activeOrders: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

// Pizza Builder
export interface PizzaIngredient {
  id: string
  name: string
  price: number
}
