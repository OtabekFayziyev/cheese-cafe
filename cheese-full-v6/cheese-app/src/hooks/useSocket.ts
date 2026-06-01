import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUserStore, useOrderStore } from '@/store'

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    const user = useUserStore.getState().user
    socket = io(API_URL, {
      auth: {
        userId: user?.telegramId,
        role:   (user?.role || 'USER').toUpperCase(),
      },
      transports:     ['websocket', 'polling'],
      reconnection:    true,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

// Global socket — App.tsx da bir marta chaqiriladi
export function useGlobalSocket() {
  const user           = useUserStore(s => s.user)
  const setActiveOrder = useOrderStore(s => s.setActiveOrder)
  const activeOrder    = useOrderStore(s => s.activeOrder)

  useEffect(() => {
    if (!user?.telegramId) return

    const s = io(API_URL, {
      auth: {
        userId: String(user.telegramId),
        role:   (user.role || 'USER').toUpperCase(),
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
    })

    socket = s

    s.on('connect', () => {
      console.log('🔌 Socket connected:', s.id)
      // Join active order room
      const order = useOrderStore.getState().activeOrder
      if (order?.id) s.emit('track:order', order.id)
    })

    // Order status changed
    s.on('order:status', (data: { id: string; status: string; courier?: any }) => {
      const current = useOrderStore.getState().activeOrder
      if (!current) return
      if (current.id === data.id || (current as any).id === data.id) {
        const newStatus = data.status.toLowerCase()
        useOrderStore.getState().setActiveOrder({
          ...current,
          status: newStatus as any,
          ...(data.courier && { courier: data.courier }),
        })
      }
    })

    s.on('disconnect', () => {
      console.log('🔌 Socket disconnected')
    })

    return () => {
      s.disconnect()
      socket = null
    }
  }, [user?.telegramId])
}

// Order tracking uchun — courier location
export function useOrderSocket(orderId: string | undefined) {
  const socketRef = useRef<Socket | null>(null)

  const onCourierMoved = useCallback((callback: (loc: { lat: number; lng: number }) => void) => {
    if (!orderId) return
    const s = getSocket()
    socketRef.current = s
    s.emit('track:order', orderId)
    s.on('courier:moved', callback)
    return () => s.off('courier:moved', callback)
  }, [orderId])

  useEffect(() => {
    return () => {
      if (socketRef.current && orderId) {
        socketRef.current.off('courier:moved')
      }
    }
  }, [orderId])

  return { onCourierMoved }
}

// Courier uchun — location yuborish
export function useCourierSocket() {
  const sendLocation = useCallback((lat: number, lng: number, orderId: string) => {
    const s = getSocket()
    s.emit('courier:location', { lat, lng, orderId })
  }, [])

  return { sendLocation }
}
