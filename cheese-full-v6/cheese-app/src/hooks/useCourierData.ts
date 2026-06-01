import { useEffect, useCallback } from 'react'
import { useCourierStore } from '@/store/courierStore'
import { ordersAPI } from '@/api/client'
import { getSocket } from '@/hooks/useSocket'
import toast from 'react-hot-toast'

export function useCourierData() {
  const {
    setActiveOrders, setProfile, setHistory,
    setStats, addActiveOrder,
  } = useCourierStore()

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, ordersRes, historyRes, earningsRes] = await Promise.allSettled([
        ordersAPI.courierProfile?.()   || Promise.resolve(null),
        ordersAPI.courierGetActive?.() || Promise.resolve([]),
        ordersAPI.courierHistory?.()   || Promise.resolve([]),
        ordersAPI.courierEarnings?.()  || Promise.resolve(null),
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

  useEffect(() => {
    // Load on mount
    loadAll()

    // Har 30s da yangilash (socket ishlamasa fallback)
    const t = setInterval(loadAll, 30000)

    // Socket listeners
    const attach = () => {
      const s = getSocket()
      if (!s) return

      // Admin tayinladi — yangi vazifa
      const onNewTask = (data: any) => {
        console.log('🛵 courier:newTask', data)
        toast('📦 Yangi buyurtma tayinlandi!', { icon: '🛵', duration: 5000 })
        // Reload to get full order data
        loadAll()
      }

      // Pool dan yangi buyurtma
      const onPool = (order: any) => {
        console.log('📦 order:delivery_pool', order)
        addActiveOrder({ ...order, status: 'ready' })
        toast('🆕 Yangi buyurtma mavjud!', { icon: '📦', duration: 4000 })
      }

      // Order status o'zgardi (masalan cancelled)
      const onStatus = (data: any) => {
        if (data.status === 'CANCELLED') {
          setActiveOrders(
            useCourierStore.getState().activeOrders
              .filter(o => o.id !== data.id)
          )
        }
        loadAll()
      }

      s.on('courier:newTask',     onNewTask)
      s.on('order:delivery_pool', onPool)
      s.on('order:status',        onStatus)

      return () => {
        s.off('courier:newTask',     onNewTask)
        s.off('order:delivery_pool', onPool)
        s.off('order:status',        onStatus)
      }
    }

    // Socket tayyor bo'lgunicha kutish
    const socketTimer = setTimeout(attach, 1500)

    return () => {
      clearInterval(t)
      clearTimeout(socketTimer)
    }
  }, [])

  return { reload: loadAll }
}
