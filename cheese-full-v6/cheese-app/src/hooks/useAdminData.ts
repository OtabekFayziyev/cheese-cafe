import { useEffect, useRef } from 'react'
import { useAdminStore } from '@/store/adminStore'
import { ordersAPI, adminAPI } from '@/api/client'

// Global hook — AdminShell da bir marta chaqiriladi
// Barcha admin sahifalariga real data yetkazadi
export function useAdminData() {
  const setOrders    = useAdminStore(s => s.setOrders)
  const setCustomers = useAdminStore(s => s.setCustomers)
  const intervalRef  = useRef<ReturnType<typeof setInterval>>()

  const fetchAll = async () => {
    try {
      // Orders
      const ordersData = await ordersAPI.adminGetAll({ limit: 200 })
      const rawOrders  = ordersData.orders || []
      const mappedOrders = rawOrders.map((o: any) => ({
        ...o,
        status:       (o.status || 'pending').toLowerCase(),
        deliveryType: (o.deliveryType || 'delivery').toLowerCase(),
        paymentType:  (o.paymentType  || 'cash').toLowerCase(),
        customerName: o.user
          ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim()
          : 'Noma\'lum',
        customerUsername: o.user?.username,
        items: (o.items || []).map((i: any) => ({
          ...i,
          menuItem:       i.menuItem || { id: i.menuItemId, name: 'Taom', emoji: '🍔', price: i.price },
          selectedExtras: i.extras || [],
          totalPrice:     i.price,
        })),
      }))
      setOrders(mappedOrders)
    } catch {}

    try {
      // Customers
      const usersData  = await adminAPI.users({ limit: 200 })
      const rawUsers   = usersData.users || []
      const mappedCustomers = rawUsers.map((u: any) => ({
        id:           String(u.id),
        telegramId:   String(u.telegramId),
        firstName:    u.firstName,
        lastName:     u.lastName,
        username:     u.username,
        phone:        u.phone,
        photoUrl:     u.photoUrl,
        role:         u.role,
        isBlocked:    u.isBlocked,
        blockReason:  u.blockReason,
        bonusPoints:  u.bonusPoints || 0,
        ordersCount:  u.ordersCount || 0,
        totalSpent:   u.totalSpent  || 0,
        lastOrderAt:  u.lastOrderAt,
        createdAt:    u.createdAt,
      }))
      setCustomers(mappedCustomers)
    } catch {}
  }

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, 2000) // 2s
    return () => clearInterval(intervalRef.current)
  }, [])

  return { refetch: fetchAll }
}
