import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Order, OrderStatus } from '@/types'
import { MENU_ITEMS } from '@/api/mockData'

export interface CourierStats {
  todayDeliveries: number
  todayEarnings:   number
  weekDeliveries:  number
  weekEarnings:    number
  rating:          number
  totalDeliveries: number
}

export interface CourierProfile {
  id:         number
  telegramId: number
  firstName:  string
  lastName:   string
  phone:      string
  photoUrl?:  string
  rating:     number
  totalDeliveries: number
  isOnline:   boolean
  vehicleType: 'bicycle' | 'scooter' | 'car'
}

// mock active deliveries for courier
const makeCourierOrders = (): Order[] => {
  const now = Date.now()
  return [
    {
      id: 'ORD-1007',
      userId: 107,
      customerName: 'Malika R.',
      customerPhone: '+998901112233',
      items: [
        { id:'ci1', menuItem: MENU_ITEMS[0], quantity:2, extras:[{id:'e1',name:'🧀 Sir',price:3000}], note:'Sous ko\'p bo\'lsin', price:96000 },
        { id:'ci2', menuItem: MENU_ITEMS[7], quantity:1, extras:[], note:'', price:12000 },
      ],
      status: 'on_the_way' as OrderStatus,
      deliveryType: 'delivery',
      address: 'Yunusobod 19-mavze, 45-uy',
      addressDetail: '3-qavat, 12-xona',
      phone: '+998901112233',
      paymentType: 'cash',
      discount: 0,
      deliveryFee: 5000,
      totalPrice: 113000,
      courierId: 1,
      createdAt: new Date(now - 18 * 60000).toISOString(),
      updatedAt: new Date(now - 5  * 60000).toISOString(),
    } as any,
    {
      id: 'ORD-1009',
      userId: 109,
      customerName: 'Bobur K.',
      customerPhone: '+998997778899',
      items: [
        { id:'ci3', menuItem: MENU_ITEMS[2], quantity:1, extras:[], note:'', price:55000 },
      ],
      status: 'ready' as OrderStatus,
      deliveryType: 'delivery',
      address: 'Chilonzor 8-mavze, 12-uy',
      addressDetail: '1-qavat',
      phone: '+998997778899',
      paymentType: 'cash',
      discount: 10000,
      deliveryFee: 7000,
      totalPrice: 52000,
      courierId: 1,
      createdAt: new Date(now - 8 * 60000).toISOString(),
      updatedAt: new Date(now - 2 * 60000).toISOString(),
    } as any,
  ]
}

const makeHistory = (): Order[] => {
  const now = Date.now()
  return Array.from({ length: 12 }, (_, i) => ({
    id: `ORD-${900 + i}`,
    userId: 200 + i,
    customerName: ['Jasur D.','Sardor T.','Nilufar S.','Akbar M.','Zulfiya H.'][i%5],
    customerPhone: '+998901234567',
    items: [{ id:`hi${i}`, menuItem: MENU_ITEMS[i%MENU_ITEMS.length], quantity:1+(i%2), extras:[], note:'', price: MENU_ITEMS[i%MENU_ITEMS.length].price*(1+(i%2)) }],
    status: 'delivered' as OrderStatus,
    deliveryType: i%4===0 ? 'pickup' : 'delivery',
    address: ['Yunusobod 19','Chilonzor 8','Mirzo Ulug\'bek 45','Shayxontohur 12'][i%4],
    phone: '+998901234567',
    paymentType: 'cash',
    discount: 0,
    deliveryFee: i%4===0 ? 0 : 5000,
    totalPrice: MENU_ITEMS[i%MENU_ITEMS.length].price*(1+(i%2)) + (i%4===0?0:5000),
    courierId: 1,
    createdAt: new Date(now - (i+1)*45*60000).toISOString(),
    updatedAt: new Date(now - i*40*60000).toISOString(),
  } as any))
}

interface CourierState {
  profile:      CourierProfile
  activeOrders: Order[]
  history:      Order[]
  stats:        CourierStats

  setOnline:       (online: boolean) => void
  updateOrderStatus: (id: string, status: OrderStatus) => void
  completeOrder:   (id: string) => void
}

export const useCourierStore = create<CourierState>()(
  persist(
    (set, get) => ({
      profile: {
        id: 1,
        telegramId: 456789123,
        firstName: 'Jasur',
        lastName:  'Karimov',
        phone:     '+998901234567',
        rating:    4.9,
        totalDeliveries: 234,
        isOnline:  true,
        vehicleType: 'scooter',
      },
      activeOrders: makeCourierOrders(),
      history:      makeHistory(),
      stats: {
        todayDeliveries: 7,
        todayEarnings:   87500,
        weekDeliveries:  38,
        weekEarnings:    421000,
        rating:          4.9,
        totalDeliveries: 234,
      },

      setOnline: (online) =>
        set(s => ({ profile: { ...s.profile, isOnline: online } })),

      updateOrderStatus: (id, status) =>
        set(s => ({
          activeOrders: s.activeOrders.map(o =>
            o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
          ),
        })),

      completeOrder: (id) => {
        const order = get().activeOrders.find(o => o.id === id)
        if (!order) return
        const completed = { ...order, status: 'delivered' as OrderStatus, updatedAt: new Date().toISOString() }
        set(s => ({
          activeOrders: s.activeOrders.filter(o => o.id !== id),
          history: [completed, ...s.history],
          stats: {
            ...s.stats,
            todayDeliveries: s.stats.todayDeliveries + 1,
            todayEarnings:   s.stats.todayEarnings + order.deliveryFee,
            weekDeliveries:  s.stats.weekDeliveries + 1,
            weekEarnings:    s.stats.weekEarnings + order.deliveryFee,
            totalDeliveries: s.stats.totalDeliveries + 1,
          },
        }))
      },
    }),
    { name: 'cheese-courier' }
  )
)

export const VEHICLE_ICONS = { bicycle:'🚲', scooter:'🛵', car:'🚗' }
