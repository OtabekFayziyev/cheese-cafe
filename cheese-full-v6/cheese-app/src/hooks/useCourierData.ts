import { useEffect, useRef } from 'react'
import { useCourierStore } from '@/store/courierStore'
import { ordersAPI } from '@/api/client'
import { useUserStore } from '@/store'

export function useCourierData() {
  const setActiveOrders = useCourierStore(s => s.setActiveOrders)
  const setHistory      = useCourierStore(s => s.setHistory)
  const setStats        = useCourierStore(s => s.setStats)
  const user            = useUserStore(s => s.user)
  const intervalRef     = useRef<ReturnType<typeof setInterval>>()

  const fetch = async () => {
    try {
      const data = await ordersAPI.courierGetActive()
      const orders = (data || []).map((o: any) => ({
        ...o,
        status:       (o.status || 'ready').toLowerCase(),
        deliveryType: (o.deliveryType || 'delivery').toLowerCase(),
        customerName: o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() : 'Mijoz',
        items: (o.items || []).map((i: any) => ({
          ...i,
          menuItem:   i.menuItem || { name: 'Taom', emoji: '🍔', price: i.price },
          totalPrice: i.price,
        })),
      }))
      setActiveOrders(orders)

      // Stats from completed orders
      const today = new Date().toDateString()
      const todayDone = orders.filter((o: any) => 
        o.status === 'delivered' && new Date(o.updatedAt).toDateString() === today
      )
      setStats({
        todayDeliveries: todayDone.length,
        todayEarnings:   todayDone.reduce((s: number, o: any) => s + (o.deliveryFee || 5000), 0),
        weekDeliveries:  orders.filter((o: any) => o.status === 'delivered').length,
        weekEarnings:    orders.filter((o: any) => o.status === 'delivered')
                               .reduce((s: number, o: any) => s + (o.deliveryFee || 5000), 0),
        rating:          4.9,
        totalDeliveries: user?.bonusPoints ? Math.floor(user.bonusPoints / 10) : 0,
      })
    } catch {}
  }

  useEffect(() => {
    fetch()
    intervalRef.current = setInterval(fetch, 5000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return { refetch: fetch }
}
