import { useEffect, useCallback } from 'react'
import { useCourierStore } from '@/store/courierStore'
import { ordersAPI } from '@/api/client'
import { getSocket } from '@/hooks/useSocket'

export function useCourierData() {
  const {
    setActiveOrders, setProfile, setHistory, setStats,
    addActiveOrder, removeActiveOrder,
  } = useCourierStore()

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, ordersRes, historyRes, earningsRes] = await Promise.allSettled([
        ordersAPI.courierProfile?.()    || Promise.resolve(null),
        ordersAPI.courierGetActive?.()  || Promise.resolve([]),
        ordersAPI.courierHistory?.()    || Promise.resolve([]),
        ordersAPI.courierEarnings?.()   || Promise.resolve(null),
      ])

      if (profileRes.status  === 'fulfilled' && profileRes.value) {
        setProfile(profileRes.value)
      }
      if (ordersRes.status   === 'fulfilled' && ordersRes.value) {
        setActiveOrders(Array.isArray(ordersRes.value) ? ordersRes.value : [])
      }
      if (historyRes.status  === 'fulfilled' && historyRes.value) {
        setHistory(Array.isArray(historyRes.value) ? historyRes.value : [])
      }
      if (earningsRes.status === 'fulfilled' && earningsRes.value) {
        const e = earningsRes.value
        setStats({
          todayDeliveries: e.today?.count    ?? 0,
          todayEarnings:   e.today?.earnings ?? 0,
          weekDeliveries:  e.week?.count     ?? 0,
          weekEarnings:    e.week?.earnings  ?? 0,
          totalDeliveries: e.month?.count    ?? 0,
          balance:         e.balance         ?? 0,
        })
      }
    } catch {}
  }, [])

  // Socket — new order in pool
  useEffect(() => {
    loadAll()

    const s = getSocket()
    if (!s) return

    const onPool = (order: any) => {
      addActiveOrder?.({ ...order, status: 'ready' })
    }

    s.on('order:delivery_pool', onPool)
    return () => { s.off('order:delivery_pool', onPool) }
  }, [])

  return { reload: loadAll }
}
