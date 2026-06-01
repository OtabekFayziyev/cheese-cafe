import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

// Singleton socket instance
let _socket: Socket | null = null
let _userId: string | null = null

function createSocket(userId: string, role: string): Socket {
  if (_socket?.connected && _userId === userId) return _socket

  if (_socket) {
    _socket.removeAllListeners()
    _socket.disconnect()
  }

  _userId = userId
  _socket = io(API_URL, {
    auth:              { userId, role: role.toUpperCase() },
    transports:        ['polling', 'websocket'],  // polling first for Render
    reconnection:      true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    timeout:           20000,
    forceNew:          false,
  })

  _socket.on('connect', () => {
    console.log('🔌 Socket connected:', _socket?.id)
  })
  _socket.on('connect_error', (e) => {
    console.warn('🔌 Socket error:', e.message)
  })
  _socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason)
  })

  return _socket
}

export function getSocket() { return _socket }

// ── Global hook — App.tsx da bir marta chaqiriladi ──
export function useGlobalSocket(
  userId: string | null,
  role: string,
  onOrderStatus: (data: { id: string; status: string; courier?: any }) => void
) {
  const cbRef = useRef(onOrderStatus)
  cbRef.current = onOrderStatus

  useEffect(() => {
    if (!userId) return

    const s = createSocket(userId, role)

    const handler = (data: any) => {
      console.log('📦 order:status received:', data)
      cbRef.current(data)
    }

    s.on('order:status', handler)

    return () => {
      s.off('order:status', handler)
    }
  }, [userId, role])
}

// ── Order tracking xonasiga kirish ──
export function useTrackOrder(orderId: string | undefined) {
  useEffect(() => {
    if (!orderId || !_socket) return
    _socket.emit('track:order', orderId)
    console.log('👁 Tracking order:', orderId)
  }, [orderId, _socket?.connected])
}

// ── Courier location listener ──
export function useCourierLocation(
  orderId: string | undefined,
  onMoved: (loc: { lat: number; lng: number }) => void
) {
  const cbRef = useRef(onMoved)
  cbRef.current = onMoved

  useEffect(() => {
    if (!orderId || !_socket) return

    _socket.emit('track:order', orderId)

    const handler = (loc: { lat: number; lng: number }) => {
      console.log('🛵 courier:moved:', loc)
      cbRef.current(loc)
    }

    _socket.on('courier:moved', handler)
    return () => { _socket?.off('courier:moved', handler) }
  }, [orderId, _socket?.connected])
}

// ── Courier location sender ──
export function sendCourierLocation(lat: number, lng: number, orderId: string) {
  if (_socket?.connected) {
    _socket.emit('courier:location', { lat, lng, orderId })
  }
}
