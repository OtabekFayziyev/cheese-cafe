import { Server as SocketServer } from 'socket.io'
import type { FastifyInstance } from 'fastify'

let io: SocketServer | null = null

export function initSocket(app: FastifyInstance, frontendUrl: string) {
  // Fastify server tayyor bo'lgandan keyin Socket.io ni ulash
  app.server.on('listening', () => {
    io = new SocketServer(app.server, {
      transports:           ['polling', 'websocket'],
      pingTimeout:          60000,
      pingInterval:         20000,
      upgradeTimeout:       10000,
      allowEIO3:            true,
      cors: {
        origin:      [frontendUrl, 'https://cheese-cafe.netlify.app', 'http://localhost:5173'],
        credentials: true,
        methods:     ['GET', 'POST'],
      },
    })

    io.on('connection', (socket) => {
      const { userId, role } = socket.handshake.auth

      if (userId) socket.join(`user:${userId}`)
      if (role === 'ADMIN' || role === 'MODERATOR') socket.join('admins')
      if (role === 'COURIER') socket.join(`courier:${userId}`)

      console.log(`🔌 Connected: ${role || 'unknown'} uid=${userId} sid=${socket.id}`)

      // User buyurtmani kuzatmoqchi
      socket.on('track:order', (orderId: string) => {
        socket.join(`order:${orderId}`)
        console.log(`👁 Tracking order: ${orderId}`)
      })

      // Kuryer lokatsiyasi
      socket.on('courier:location', (data: { lat: number; lng: number; orderId: string }) => {
        if (!data.lat || !data.lng || !data.orderId) return
        io!.to(`order:${data.orderId}`).emit('courier:moved', {
          lat: data.lat,
          lng: data.lng,
          ts:  Date.now(),
        })
      })

      socket.on('disconnect', (reason) => {
        console.log(`🔌 Disconnected: ${socket.id} reason=${reason}`)
      })

      socket.on('error', (err) => {
        console.error(`🔌 Socket error: ${err.message}`)
      })
    })

    console.log('✅ Socket.io initialized on Fastify server')
  })
}

export function emitNewOrder(order: any) {
  if (!io) return
  io.to('admins').emit('order:new', {
    id:          order.id,
    orderNumber: order.orderNumber,
    totalPrice:  order.totalPrice,
    customerName: `${order.user?.firstName || 'Mijoz'}`,
    phone:        order.phone,
    items:        (order.items || []).slice(0, 3).map((i: any) => ({
      name:  i.menuItem?.name  || 'Taom',
      emoji: i.menuItem?.emoji || '🍔',
      qty:   i.quantity,
    })),
    createdAt: order.createdAt,
  })
}

export function emitOrderStatusChanged(order: any) {
  if (!io) return

  const payload = {
    id:          order.id,
    status:      order.status,
    orderNumber: order.orderNumber,
    courier:     order.courier ? {
      id:        order.courier.id,
      firstName: order.courier.firstName,
      phone:     order.courier.phone,
      lat:       order.courier.lat,
      lng:       order.courier.lng,
    } : null,
  }

  // Userga (telegramId bo'yicha)
  if (order.userId) {
    io.to(`user:${order.userId}`).emit('order:status', payload)
  }

  // Order room da (tracking)
  io.to(`order:${order.id}`).emit('order:status', payload)

  // Adminlarga
  io.to('admins').emit('order:updated', payload)
}

export function emitCourierAssigned(courierId: number, order: any) {
  if (!io) return
  io.to(`courier:${courierId}`).emit('courier:newTask', {
    orderId:     order.id,
    orderNumber: order.orderNumber,
    address:     order.address,
    totalPrice:  order.totalPrice,
    phone:       order.phone,
  })
}

export { io }

// Cafe ochiq/yopiq holati o'zgardi
export function emitCafeStatus(isOpen: boolean) {
  if (!io) return
  io.emit('cafe:status', { isOpen })
}

// READY buyurtma — barcha online kuryerlarga
export function emitDeliveryPool(order: any) {
  if (!io) return
  io.to('couriers').emit('order:delivery_pool', {
    id:          order.id,
    orderNumber: order.orderNumber,
    address:     order.address,
    deliveryFee: order.deliveryFee,
    totalPrice:  order.totalPrice,
    items:       (order.items || []).slice(0, 3).map((i: any) => ({
      name:  i.menuItem?.name  || 'Taom',
      emoji: i.menuItem?.emoji || '🍔',
      qty:   i.quantity,
    })),
    createdAt: order.createdAt,
  })
}
