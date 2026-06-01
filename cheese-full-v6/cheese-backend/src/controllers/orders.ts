// BigInt JSON serialization fix
;(BigInt.prototype as any).toJSON = function() { return this.toString() }

import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma }    from '../utils/db'
import { ok, err, paginate } from '../types/index'
import { generateOrderNumber, calcBonusPoints } from '../utils/helpers'
import type { OrderStatus } from '@prisma/client'
import { notifyAdminNewOrder, notifyUserOrderStatus, bot } from '../bot/index'
import { emitOrderStatusChanged, emitNewOrder, emitCourierAssigned } from '../services/socket'

// ── POST /api/orders ──
export async function createOrder(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user.userId
  const body   = req.body as any

  const {
    items, deliveryType, paymentType,
    address, addressDetail, lat, lng,
    phone, secondPhone,
    promoCode, note,
    deliveryFee: clientDeliveryFee,
  } = body

  if (!items?.length) return reply.code(400).send(err('Savat bo\'sh'))

  let subtotal    = 0
  // Yetkazish narxi: frontenddan kelgan yoki backend da qayta hisoblanadi
  let deliveryFee = 0
  if (deliveryType === 'PICKUP') {
    deliveryFee = 0
  } else if (clientDeliveryFee && typeof clientDeliveryFee === 'number' && clientDeliveryFee > 0) {
    deliveryFee = clientDeliveryFee
  } else if (lat && lng) {
    // Backend da qayta hisoblash (Distance Matrix fallback)
    try {
      const CAFE_LAT = 38.853373449716344
      const CAFE_LNG = 65.7889651753182
      const R    = 6371
      const dLat = (lat - CAFE_LAT) * Math.PI / 180
      const dLng = (lng - CAFE_LNG) * Math.PI / 180
      const a    = Math.sin(dLat/2)**2 + Math.cos(CAFE_LAT*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2
      const km   = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 100) / 100
      deliveryFee = km <= 1 ? 5000 : 5000 + Math.ceil((km-1)/0.5) * 1000
    } catch {
      deliveryFee = 5000
    }
  } else {
    deliveryFee = 5000
  }
  let discount    = 0
  const orderItems: any[] = []

  for (const item of items) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: item.menuItemId },
      include: { extras: true },
    })
    if (!menuItem || !menuItem.isAvailable) {
      return reply.code(400).send(err(`Taom mavjud emas: ${item.menuItemId}`))
    }

    let itemPrice = menuItem.price * item.quantity
    const itemExtras: any[] = []

    for (const extraId of (item.extraIds || [])) {
      const extra = menuItem.extras.find(e => e.id === extraId)
      if (extra) {
        itemPrice += extra.price * item.quantity
        itemExtras.push({ extraId, price: extra.price })
      }
    }

    subtotal += itemPrice
    orderItems.push({
      menuItemId: item.menuItemId,
      quantity:   item.quantity,
      price:      itemPrice,
      note:       item.note || null,
      extras: { create: itemExtras },
    })
  }

  if (promoCode) {
    const promo = await prisma.promoCode.findFirst({
      where: {
        code:     promoCode.toUpperCase(),
        isActive: true,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
          { OR: [{ maxUses: null }, { usedCount: { lt: 999999 } }] },
        ],
      },
    })
    if (promo && subtotal >= promo.minOrder) {
      discount = promo.discountType === 'FIXED'
        ? promo.discount
        : Math.floor(subtotal * promo.discount / 100)
      await prisma.promoCode.update({
        where: { id: promo.id },
        data:  { usedCount: { increment: 1 } },
      })
    }
  }

  const totalPrice  = subtotal + deliveryFee - discount
  const orderNumber = await generateOrderNumber(prisma)

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      deliveryType: deliveryType || 'DELIVERY',
      paymentType:  paymentType  || 'CASH',
      address, addressDetail, lat, lng,
      phone, secondPhone,
      subtotal, deliveryFee, discount, totalPrice,
      promoCode: promoCode?.toUpperCase() || null,
      note,
      items: { create: orderItems },
    },
    include: {
      items: { include: { menuItem: true, extras: { include: { extra: true } } } },
      user:  { select: { firstName: true, phone: true, telegramId: true } },
    },
  })

  // Bonus ball
  const bonusPoints = calcBonusPoints(totalPrice)
  if (bonusPoints > 0) {
    await prisma.user.update({
      where: { id: userId },
      data:  { bonusPoints: { increment: bonusPoints } },
    })
  }

  // Admin ga xabar (async — javobni kechiktirmasin)
  notifyAdminNewOrder(order).catch(console.error)
  // Socket — real-time admin notification
  emitNewOrder(order)

  return reply.code(201).send(ok(order, `Buyurtma qabul qilindi! +${bonusPoints} ball`))
}

// ── GET /api/orders ──
export async function getUserOrders(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user.userId
  const { page, limit } = req.query as any
  const { take, skip }  = paginate(page, limit)

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where:   { userId },
      include: { items: { include: { menuItem: true } } },
      orderBy: { createdAt: 'desc' },
      take, skip,
    }),
    prisma.order.count({ where: { userId } }),
  ])

  return reply.send(ok({ orders, total, page: Number(page) || 1, limit: take }))
}

// ── GET /api/orders/:id ──
export async function getOrder(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const userId = (req as any).user.userId
  const role   = (req as any).user.role

  const order = await prisma.order.findUnique({
    where:   { id },
    include: {
      items:   { include: { menuItem: true, extras: { include: { extra: true } } } },
      user:    { select: { firstName: true, lastName: true, phone: true } },
      courier: { select: { id: true, firstName: true, phone: true } },
    },
  })

  if (!order) return reply.code(404).send(err('Buyurtma topilmadi'))
  if (role === 'USER' && order.userId !== userId) {
    return reply.code(403).send(err('Ruxsat yo\'q'))
  }

  return reply.send(ok(order))
}

// ── GET /api/admin/orders ──
export async function getAdminOrders(req: FastifyRequest, reply: FastifyReply) {
  const { status, page, limit, search } = req.query as any
  const { take, skip } = paginate(page, limit)

  const where: any = {}
  if (status && status !== 'all') where.status = status.toUpperCase()
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { phone:       { contains: search } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items:   { include: { menuItem: true } },
        user:    { select: { firstName: true, lastName: true, username: true, phone: true, telegramId: true } },
        courier: { select: { firstName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take, skip,
    }),
    prisma.order.count({ where }),
  ])

  return reply.send(ok({ orders, total, page: Number(page) || 1, limit: take }))
}

// ── PATCH /api/admin/orders/:id/status ──
export async function updateOrderStatus(req: FastifyRequest, reply: FastifyReply) {
  const { id }     = req.params as { id: string }
  const { status, courierId, cancelReason } = req.body as any
  const adminUser  = (req as any).user

  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: { select: { telegramId: true, firstName: true } } },
  })
  if (!order) return reply.code(404).send(err('Buyurtma topilmadi'))

  const statusUpper = status.toUpperCase() as OrderStatus

  const timestamps: any = {}
  if (statusUpper === 'ACCEPTED')   timestamps.acceptedAt  = new Date()
  if (statusUpper === 'PREPARING')  timestamps.preparedAt  = new Date()
  if (statusUpper === 'ON_THE_WAY') timestamps.pickedAt    = new Date()
  if (statusUpper === 'DELIVERED') {
    timestamps.deliveredAt = new Date()
    // Bonus ball berish — har 1000 so'm = 1 ball
    const bonusPoints = Math.floor(order.totalPrice / 1000)
    if (bonusPoints > 0) {
      await prisma.user.update({
        where: { id: order.userId },
        data:  { bonusPoints: { increment: bonusPoints } },
      })
      // Userga xabar
      if (order.user?.telegramId) {
        notifyUserOrderStatus(
          order.user.telegramId,
          order.orderNumber,
          'DELIVERED'
        ).catch(console.error)
      }
    }
  }
  if (statusUpper === 'CANCELLED')  {
    timestamps.cancelledAt  = new Date()
    timestamps.cancelReason = cancelReason || 'Admin tomonidan'
  }

  const updated = await prisma.order.update({
    where: { id },
    data:  {
      status: statusUpper,
      ...(courierId && { courierId }),
      ...timestamps,
    },
    include: {
      items:   { include: { menuItem: true } },
      user:    { select: { firstName: true, lastName: true, username: true, phone: true, telegramId: true } },
      courier: { select: { firstName: true, phone: true } },
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId:  adminUser.userId,
      action:   `Buyurtma statusi: ${order.status} → ${statusUpper}`,
      entity:   'order',
      entityId: id,
      oldValue: order.status,
      newValue: statusUpper,
    },
  })

  // Socket — real-time status update to user
  emitOrderStatusChanged(updated)

  // Kuryer tayinlanganda unga ham xabar
  if (courierId && statusUpper === 'ON_THE_WAY') {
    emitCourierAssigned(courierId, updated)
  }

  // Userga bot orqali xabar
  if (order.user?.telegramId) {
    notifyUserOrderStatus(
      order.user.telegramId,
      order.orderNumber,
      statusUpper,
      cancelReason
    ).catch(console.error)
  }

  return reply.send(ok(updated))
}

// ── GET /api/courier/orders ──
export async function getCourierOrders(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId

  const orders = await prisma.order.findMany({
    where:   { courierId, status: { in: ['READY', 'ON_THE_WAY'] } },
    include: { items: { include: { menuItem: true } }, user: { select: { firstName: true, phone: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return reply.send(ok(orders))
}

// ── PATCH /api/courier/orders/:id/status ──
export async function updateCourierOrderStatus(req: FastifyRequest, reply: FastifyReply) {
  const { id }     = req.params as { id: string }
  const { status } = req.body as { status: string }
  const courierId  = (req as any).user.userId

  const order = await prisma.order.findFirst({
    where: { id, courierId },
    include: { user: { select: { telegramId: true } } },
  })
  if (!order) return reply.code(404).send(err('Buyurtma topilmadi'))

  const allowed = ['ON_THE_WAY', 'DELIVERED']
  if (!allowed.includes(status.toUpperCase())) {
    return reply.code(400).send(err('Noto\'g\'ri status'))
  }

  const updated = await prisma.order.update({
    where: { id },
    data:  {
      status: status.toUpperCase() as OrderStatus,
      ...(status.toUpperCase() === 'DELIVERED' && { deliveredAt: new Date() }),
    },
  })

  // Userga xabar
  if (order.user?.telegramId) {
    notifyUserOrderStatus(order.user.telegramId, order.orderNumber, status.toUpperCase())
      .catch(console.error)
  }

  return reply.send(ok(updated))
}

// ── PATCH /api/courier/location ──
export async function updateCourierLocation(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId
  const { lat, lng } = req.body as { lat: number; lng: number }

  await prisma.user.update({
    where: { id: courierId },
    data:  { lat, lng, lastSeenAt: new Date() },
  })

  // Broadcast to all orders this courier is delivering
  const { io } = await import('../services/socket')
  if (io) {
    const activeOrders = await prisma.order.findMany({
      where: { courierId, status: 'ON_THE_WAY' },
      select: { id: true },
    })
    activeOrders.forEach(o => {
      io.to(`order:${o.id}`).emit('courier:moved', { lat, lng })
    })
  }

  return reply.send({ ok: true })
}

// ── GET /api/courier/:id/location — user tracks courier ──
export async function getCourierLocation(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }

  const courier = await prisma.user.findUnique({
    where:  { id: Number(id) },
    select: { lat: true, lng: true, lastSeenAt: true, firstName: true, phone: true },
  })

  if (!courier) return reply.code(404).send({ ok: false })
  return reply.send({ ok: true, data: courier })
}