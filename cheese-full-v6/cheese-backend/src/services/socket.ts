import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'

let io: SocketServer

export function initSocket(server: HttpServer, frontendUrl: string) {
  io = new SocketServer(server, {
    cors: {
      origin:      frontendUrl,
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    const { userId, role } = socket.handshake.auth

    // Xonalarga qo'shish
    if (userId) socket.join(`user:${userId}`)
    if (role === 'ADMIN' || role === 'MODERATOR') socket.join('admins')
    if (role === 'COURIER') socket.join(`courier:${userId}`)

    console.log(`🔌 Connected: ${role || 'unknown'} #${userId} (${socket.id})`)

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.id}`)
    })

    // Kuryer lokatsiyasini update qilish
    socket.on('courier:location', (data: { lat: number; lng: number; orderId: string }) => {
      // Mijozga yetkazish
      io.to(`order:${data.orderId}`).emit('courier:moved', {
        lat: data.lat,
        lng: data.lng,
      })
    })

    // Buyurtma tracking uchun xonaga kirish
    socket.on('track:order', (orderId: string) => {
      socket.join(`order:${orderId}`)
    })
  })

  return io
}

// ── Emit helpers (controllerlarda ishlatiladi) ──

// Yangi buyurtma — adminga xabar
export function emitNewOrder(order: any) {
  if (!io) return
  io.to('admins').emit('order:new', {
    id:          order.id,
    orderNumber: order.orderNumber,
    totalPrice:  order.totalPrice,
    customerName:`${order.user?.firstName || 'Mijoz'}`,
    createdAt:   order.createdAt,
  })
}

// Buyurtma status o'zgardi — mijozga xabar
export function emitOrderStatusChanged(order: any) {
  if (!io) return
  io.to(`user:${order.userId}`).emit('order:status', {
    id:     order.id,
    status: order.status,
  })
  io.to(`order:${order.id}`).emit('order:status', {
    id:     order.id,
    status: order.status,
    courier: order.courier,
  })
  // Adminlarga ham
  io.to('admins').emit('order:updated', {
    id:     order.id,
    status: order.status,
  })
}

// Kuryerga yangi vazifa
export function emitCourierAssigned(courierId: number, order: any) {
  if (!io) return
  io.to(`courier:${courierId}`).emit('courier:newTask', {
    orderId:     order.id,
    orderNumber: order.orderNumber,
    address:     order.address,
    totalPrice:  order.totalPrice,
  })
}

export { io }
