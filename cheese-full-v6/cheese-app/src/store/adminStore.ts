import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Order, MenuItem, OrderStatus, CafeSettings } from '@/types'
import { MENU_ITEMS, CAFE_SETTINGS } from '@/api/mockData'

// ── Types ──
export type AdminRole = 'super_admin' | 'moderator' | 'cashier'

export interface AdminUser {
  id: string
  telegramId: number
  name: string
  phone: string
  role: AdminRole
  addedAt: string
  isActive: boolean
}

export interface AuditLog {
  id: string
  adminId: string
  adminName: string
  action: string
  entity: string
  entityId?: string
  oldValue?: string
  newValue?: string
  timestamp: string
}

export interface Customer {
  id: string
  telegramId: number
  firstName: string
  lastName?: string
  username?: string
  phone?: string
  registeredAt: string
  lastActiveAt: string
  totalOrders: number
  totalSpent: number
  bonusPoints: number
  isBlocked: boolean
  blockReason?: string
  blockUntil?: string // null = permanent
}

export interface CafeInfo {
  phone: string
  phone2?: string
  instagram?: string
  telegram?: string
  address: string
  mapLink?: string
}

// ── Mock helpers ──
const makeOrders = (): Order[] => {
  const statuses: OrderStatus[] = ['pending','accepted','preparing','ready','on_the_way','delivered','pending','accepted']
  const names  = ['Jasur D.','Sardor T.','Malika R.','Bobur K.','Nilufar S.','Akbar M.','Zulfiya H.','Otabek N.','Kamola A.','Dilshod R.']
  const phones = ['+998901234567','+998901112233','+998935556677','+998997778899','+998881234567']
  const addrs  = ['Yunusobod 19-uy, 4-qavat, 12-xona','Chilonzor 8-mavze, 45-uy','Mirzo Ulug\'bek 45, 2-qavat','Shayxontohur 12-uy','Yakkasaroy 3-mavze, 7-uy']
  const now = Date.now()
  return Array.from({ length: 24 }, (_, i) => ({
    id: `ORD-${1001 + i}`,
    userId: 100 + i,
    customerName: names[i % names.length],
    customerPhone: phones[i % phones.length],
    items: [
      {
        id: `item-${i}-1`,
        menuItem: MENU_ITEMS[i % MENU_ITEMS.length],
        quantity: 1 + (i % 3),
        extras: i % 3 === 0 ? [{ id:'e1', name:'🧀 Sir', price:3000 }] : [],
        note: i % 4 === 0 ? 'Sous ko\'p bo\'lsin, pomidor bolmasin' : '',
        price: MENU_ITEMS[i % MENU_ITEMS.length].price * (1 + (i % 3)),
      },
      ...(i % 2 === 0 ? [{
        id: `item-${i}-2`,
        menuItem: MENU_ITEMS[(i+3) % MENU_ITEMS.length],
        quantity: 1,
        extras: [],
        note: '',
        price: MENU_ITEMS[(i+3) % MENU_ITEMS.length].price,
      }] : []),
    ],
    status: statuses[i % statuses.length],
    deliveryType: i % 3 === 0 ? 'pickup' : 'delivery',
    address: addrs[i % addrs.length],
    addressDetail: i % 2 === 0 ? `${i+2}-qavat, ${10+i}-xona` : '',
    phone: phones[i % phones.length],
    secondPhone: i % 5 === 0 ? '+998907654321' : undefined,
    paymentType: 'cash',
    discount: i % 5 === 0 ? 10000 : 0,
    deliveryFee: i % 3 === 0 ? 0 : 5000,
    totalPrice: MENU_ITEMS[i % MENU_ITEMS.length].price * (1+(i%3)) + (i%3===0?0:5000) - (i%5===0?10000:0),
    promoCode: i % 5 === 0 ? 'CHEESE10' : undefined,
    // Spread orders across last 30 days with recent ones closer
    createdAt: new Date(now - (i < 6 ? i * 7 * 60000 : i * 3 * 3600000)).toISOString(),
    updatedAt: new Date(now - (i < 6 ? i * 3 * 60000 : i * 1 * 3600000)).toISOString(),
  } as any))
}

const makeMockCustomers = (): Customer[] => {
  const names = [
    ['Jasur','Davlatov'],['Sardor','Toshmatov'],['Malika','Rahimova'],
    ['Bobur','Karimov'],['Nilufar','Saidova'],['Akbar','Mirzayev'],
    ['Zulfiya','Hasanova'],['Otabek','Nazarov'],['Kamola','Aliyeva'],
    ['Dilshod','Rustamov'],['Feruza','Umarova'],['Sherzod','Yusupov'],
  ]
  const now = Date.now()
  return names.map(([f,l], i) => ({
    id: `user-${100+i}`,
    telegramId: 100000 + i * 1337,
    firstName: f, lastName: l,
    username: `${f.toLowerCase()}_${i}`,
    phone: `+99890${String(1000000+i*777).slice(0,7)}`,
    registeredAt: new Date(now - (30-i) * 24*3600000).toISOString(),
    lastActiveAt: new Date(now - i * 2*3600000).toISOString(),
    totalOrders: 2 + (i * 3) % 20,
    totalSpent: (2 + (i*3)%20) * (25000 + i*5000),
    bonusPoints: Math.floor(((2+(i*3)%20) * (25000+i*5000)) / 10000),
    isBlocked: i === 9,
    blockReason: i === 9 ? 'Soxta buyurtmalar' : undefined,
  }))
}

const makeMockAdmins = (): AdminUser[] => [
  { id:'admin-1', telegramId:123456789, name:'Jasur (Super Admin)', phone:'+998901234567', role:'super_admin', addedAt: new Date().toISOString(), isActive:true },
  { id:'admin-2', telegramId:987654321, name:'Sardor (Moderator)',  phone:'+998935556677', role:'moderator',   addedAt: new Date().toISOString(), isActive:true },
  { id:'admin-3', telegramId:456789123, name:'Malika (Kassir)',     phone:'+998997778899', role:'cashier',     addedAt: new Date().toISOString(), isActive:false },
]

// ── Store ──
interface AdminState {
  orders:     Order[]
  menuItems:  MenuItem[]
  settings:   CafeSettings
  customers:  Customer[]
  admins:     AdminUser[]
  auditLogs:  AuditLog[]
  cafeInfo:   CafeInfo

  // Data setters (real API)
  setOrders:    (orders: Order[]) => void
  setCustomers: (customers: Customer[]) => void

  // Orders
  updateOrderStatus: (id: string, status: OrderStatus, adminName?: string) => void
  assignCourier:     (orderId: string, courierId: number) => void
  cancelOrder:       (id: string, adminName?: string) => void

  // Menu
  addMenuItem:        (item: MenuItem, adminName?: string) => void
  updateMenuItem:     (id: string, patch: Partial<MenuItem>, adminName?: string) => void
  deleteMenuItem:     (id: string, adminName?: string) => void
  toggleAvailability: (id: string, adminName?: string) => void

  // Settings
  updateSettings: (patch: Partial<CafeSettings>) => void
  setIsOpen:      (open: boolean, adminName?: string) => void
  updateCafeInfo: (patch: Partial<CafeInfo>) => void

  // Customers
  blockCustomer:   (id: string, reason: string, until?: string) => void
  unblockCustomer: (id: string) => void

  // Admins
  addAdmin:    (admin: AdminUser) => void
  updateAdmin: (id: string, patch: Partial<AdminUser>) => void
  removeAdmin: (id: string) => void

  // Audit
  addLog: (log: Omit<AuditLog,'id'|'timestamp'>) => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      orders:    makeOrders(),
      menuItems: MENU_ITEMS,
      settings:  CAFE_SETTINGS,
      customers: makeMockCustomers(),
      admins:    makeMockAdmins(),
      auditLogs: [],
      cafeInfo:  {
        phone: '+998 90 123 45 67',
        phone2: '+998 71 123 45 67',
        instagram: '@cheese_cafe_uz',
        telegram: '@cheese_cafe',
        address: 'Toshkent, Yunusobod tumani, 19-mavze',
        mapLink: 'https://maps.google.com',
      },

      setOrders:    (orders) => set({ orders }),
      setCustomers: (customers) => set({ customers }),

      updateOrderStatus: (id, status, adminName = 'Admin') => {
        const old = get().orders.find(o=>o.id===id)
        set(s => ({ orders: s.orders.map(o => o.id===id ? {...o, status, updatedAt:new Date().toISOString()} : o) }))
        get().addLog({ adminId:'admin-1', adminName, action:'Buyurtma statusi o\'zgartirildi', entity:'order', entityId:id, oldValue:old?.status, newValue:status })
      },

      assignCourier: (orderId, courierId) =>
        set(s => ({ orders: s.orders.map(o => o.id===orderId ? {...o, courierId, status:'on_the_way' as OrderStatus} : o) })),

      cancelOrder: (id, adminName='Admin') => {
        set(s => ({ orders: s.orders.map(o => o.id===id ? {...o, status:'cancelled' as OrderStatus, updatedAt:new Date().toISOString()} : o) }))
        get().addLog({ adminId:'admin-1', adminName, action:'Buyurtma bekor qilindi', entity:'order', entityId:id })
      },

      addMenuItem: (item, adminName='Admin') => {
        set(s => ({ menuItems: [...s.menuItems, item] }))
        get().addLog({ adminId:'admin-1', adminName, action:'Yangi taom qo\'shildi', entity:'menu', entityId:item.id, newValue:item.name })
      },

      updateMenuItem: (id, patch, adminName='Admin') => {
        const old = get().menuItems.find(m=>m.id===id)
        set(s => ({ menuItems: s.menuItems.map(m => m.id===id ? {...m,...patch} : m) }))
        if (patch.price) get().addLog({ adminId:'admin-1', adminName, action:'Taom narxi o\'zgartirildi', entity:'menu', entityId:id, oldValue:String(old?.price), newValue:String(patch.price) })
        else get().addLog({ adminId:'admin-1', adminName, action:'Taom ma\'lumotlari yangilandi', entity:'menu', entityId:id, newValue:patch.name||old?.name })
      },

      deleteMenuItem: (id, adminName='Admin') => {
        const item = get().menuItems.find(m=>m.id===id)
        set(s => ({ menuItems: s.menuItems.filter(m => m.id!==id) }))
        get().addLog({ adminId:'admin-1', adminName, action:'Taom o\'chirildi', entity:'menu', entityId:id, oldValue:item?.name })
      },

      toggleAvailability: (id, adminName='Admin') => {
        const item = get().menuItems.find(m=>m.id===id)
        set(s => ({ menuItems: s.menuItems.map(m => m.id===id ? {...m, isAvailable:!m.isAvailable} : m) }))
        get().addLog({ adminId:'admin-1', adminName, action:`Taom ${item?.isAvailable?'yopildi':'ochildi'}`, entity:'menu', entityId:id, newValue:item?.name })
      },

      updateSettings: (patch) => set(s => ({ settings: {...s.settings, ...patch} })),

      setIsOpen: (open, adminName='Admin') => {
        set(s => ({ settings: {...s.settings, isOpen:open} }))
        get().addLog({ adminId:'admin-1', adminName, action:`Cafe ${open?'ochildi':'yopildi'}`, entity:'settings' })
      },

      updateCafeInfo: (patch) => set(s => ({ cafeInfo: {...s.cafeInfo, ...patch} })),

      blockCustomer: (id, reason, until) =>
        set(s => ({ customers: s.customers.map(c => c.id===id ? {...c, isBlocked:true, blockReason:reason, blockUntil:until} : c) })),

      unblockCustomer: (id) =>
        set(s => ({ customers: s.customers.map(c => c.id===id ? {...c, isBlocked:false, blockReason:undefined, blockUntil:undefined} : c) })),

      addAdmin:    (admin)       => set(s => ({ admins: [...s.admins, admin] })),
      updateAdmin: (id, patch)   => set(s => ({ admins: s.admins.map(a => a.id===id ? {...a,...patch} : a) })),
      removeAdmin: (id)          => set(s => ({ admins: s.admins.filter(a => a.id!==id) })),

      addLog: (log) => set(s => ({
        auditLogs: [{ ...log, id:`log-${Date.now()}`, timestamp:new Date().toISOString() }, ...s.auditLogs].slice(0, 500)
      })),
    }),
    { name: 'cheese-admin-v3' }
  )
)

// ── Constants ──
export const MOCK_COURIERS = [
  { id:1, name:'Jasur K.',  phone:'+998901234567', rating:4.9, active:true,  deliveries:234 },
  { id:2, name:'Sardor M.', phone:'+998935556677', rating:4.7, active:true,  deliveries:187 },
  { id:3, name:'Bobur T.',  phone:'+998997778899', rating:4.8, active:false, deliveries:312 },
]

export const ORDER_STATUS_LABELS: Record<OrderStatus,string> = {
  pending:'Yangi', accepted:'Qabul qilindi', preparing:'Tayyorlanmoqda',
  ready:'Tayyor', on_the_way:'Yo\'lda', delivered:'Yetkazildi', cancelled:'Bekor qilindi',
}
export const ORDER_STATUS_NEXT: Record<OrderStatus, OrderStatus|null> = {
  pending:'accepted', accepted:'preparing', preparing:'ready',
  ready:'on_the_way', on_the_way:'delivered', delivered:null, cancelled:null,
}
export const ROLE_LABELS: Record<AdminRole,string> = {
  super_admin:'Super Admin', moderator:'Moderator', cashier:'Kassir/Kuryer',
}
export const STATUS_COLORS: Record<string,{bg:string;text:string}> = {
  pending:   {bg:'rgba(245,158,11,.15)', text:'#F59E0B'},
  accepted:  {bg:'rgba(59,130,246,.15)', text:'#3B82F6'},
  preparing: {bg:'rgba(139,92,246,.15)', text:'#8B5CF6'},
  ready:     {bg:'rgba(16,185,129,.15)', text:'#10B981'},
  on_the_way:{bg:'rgba(6,182,212,.15)',  text:'#06B6D4'},
  delivered: {bg:'rgba(34,197,94,.15)',  text:'#22C55E'},
  cancelled: {bg:'rgba(239,68,68,.15)',  text:'#EF4444'},
}
