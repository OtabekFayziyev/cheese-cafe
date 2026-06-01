import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUserStore, useOrderStore } from '@/store'

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

// Singleton socket
let _socket: Socket | null = null

export function getSocket(userId?: string, role?: string): Socket {
  if (_socket?.connected) return _socket
  _socket = io(API_URL, {
    auth:       { userId, role: (role || 'USER').toUpperCase() },
    transports: ['websocket', 'polling'],
    reconnection:      true,
    reconnectionDelay: 1000,
    timeout:           10000,
  })
  return _socket
}

// ── Global hook — App.tsx da bir marta ──
export function useGlobalSocket() {
  const user    = useUserStore(s => s.user)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!user?.telegramId) return

    const s = io(API_URL, {
      auth:       { userId: String(user.telegramId), role: (user.role || 'USER').toUpperCase() },
      transports: ['websocket', 'polling'],
      reconnection:      true,
      reconnectionDelay: 1000,
    })

    socketRef.current = s
    _socket = s

    s.on('connect', () => {
      console.log('🔌 Socket connected')
      // Aktiv buyurtma xonasiga qo'shilish
      const order = useOrderStore.getState().activeOrder
      if (order?.id) s.emit('track:order', order.id)
    })

    // ── ORDER STATUS CHANGED ──
    s.on('order:status', (data: { id: string; status: string; courier?: any }) => {
      console.log('📦 order:status', data)
      const store   = useOrderStore.getState()
      const current = store.activeOrder
      if (!current) return

      const newStatus = data.status.toLowerCase()
      store.setActiveOrder({
        ...current,
        status:  newStatus as any,
        courier: data.courier || (current as any).courier,
      })
    })

    s.on('connect_error', (err) => {
      console.warn('🔌 Socket error:', err.message)
    })

    s.on('disconnect', () => {
      console.log('🔌 Socket disconnected')
    })

    return () => {
      s.removeAllListeners()
      s.disconnect()
      _socket = null
      socketRef.current = null
    }
  }, [user?.telegramId])
}

// ── Order tracking — courier location ──
export function useOrderSocket(orderId: string | undefined, onLocation: (loc: {lat: number, lng: number}) => void) {
  useEffect(() => {
    if (!orderId) return
    const s = _socket
    if (!s) return

    s.emit('track:order', orderId)
    s.on('courier:moved', onLocation)

    return () => { s.off('courier:moved', onLocation) }
  }, [orderId, onLocation])
}

// ── Courier location sender ──
export function sendCourierLocation(lat: number, lng: number, orderId: string) {
  if (_socket?.connected) {
    _socket.emit('courier:location', { lat, lng, orderId })
  }
}
