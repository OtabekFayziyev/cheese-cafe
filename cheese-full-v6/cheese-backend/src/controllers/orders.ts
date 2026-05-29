import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../utils/db'
import { ok, err, paginate } from '../types/index'
import { generateOrderNumber, calcBonusPoints } from '../utils/helpers'
import type { OrderStatus } from '@prisma/client'

// POST /api/orders — yangi buyurtma yaratish
export async function createOrder(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user.userId
  const body   = req.body as any

  const {
    items, deliveryType, paymentType,
    address, addressDetail, lat, lng,
    phone, secondPhone,
    promoCode, note,
  } = body

  // Taomlarni tekshirish
  if (!items?.length) return reply.code(400).send(err('Savat bo\'sh'))

  // Narxlarni DB dan olish (frontend narxiga ishonmaslik)
  let subtotal    = 0
  let deliveryFee = deliveryType === 'PICKUP' ? 0 : 5000
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

  // Promo kod tekshirish
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
      // Use count++
      await prisma.promoCode.update({
        where: { id: promo.id },
        data:  { usedCount: { increment: 1 } },
      })
    }
  }

  const totalPrice = subtotal + deliveryFee - discount
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
      user:  { select: { firstName: true, phone: true } },
    },
  })

  // Bonus ball qo'shish
  const bonusPoints = calcBonusPoints(totalPrice)
  if (bonusPoints > 0) {
    await prisma.user.update({
      where: { id: userId },
      data:  { bonusPoints: { increment: bonusPoints } },
    })
  }

  return reply.code(201).send(ok(order, `Buyurtma qabul qilindi! +${bonusPoints} ball`))
}

// GET /api/orders — foydalanuvchi buyurtmalari
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

// GET /api/orders/:id — bitta buyurtma
export async function getOrder(req: FastifyRequest, reply: FastifyReply) {
  const { id }   = req.params as { id: string }
  const userId   = (req as any).user.userId
  const role     = (req as any).user.role

  const order = await prisma.order.findUnique({
    where:   { id },
    include: {
      items:   { include: { menuItem: true, extras: { include: { extra: true } } } },
      user:    { select: { firstName: true, lastName: true, phone: true } },
      courier: { select: { firstName: true, phone: true } },
    },
  })

  if (!order) return reply.code(404).send(err('Buyurtma topilmadi'))
  if (role === 'USER' && order.userId !== userId) {
    return reply.code(403).send(err('Ruxsat yo\'q'))
  }

  return reply.send(ok(order))
}

// ── ADMIN: GET /api/admin/orders ──
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
        user:    { select: { firstName: true, lastName: true, phone: true, telegramId: true } },
        courier: { select: { firstName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take, skip,
    }),
    prisma.order.count({ where }),
  ])

  // BigInt → String (JSON serialization fix)
  const serialized = orders.map((o: any) => ({
    ...o,
    user: o.user ? { ...o.user, telegramId: String(o.user.telegramId) } : null,
  }))

  return reply.send(ok({ orders: serialized, total, page: Number(page) || 1, limit: take }))
}

// PATCH /api/admin/orders/:id/status — status o'zgartirish
export async function updateOrderStatus(req: FastifyRequest, reply: FastifyReply) {
  const { id }     = req.params as { id: string }
  const { status, courierId, cancelReason } = req.body as any
  const adminUser  = (req as any).user

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return reply.code(404).send(err('Buyurtma topilmadi'))

  const statusUpper = status.toUpperCase() as OrderStatus

  const timestamps: any = {}
  if (statusUpper === 'ACCEPTED')   timestamps.acceptedAt  = new Date()
  if (statusUpper === 'PREPARING')  timestamps.preparedAt  = new Date()
  if (statusUpper === 'ON_THE_WAY') timestamps.pickedAt    = new Date()
  if (statusUpper === 'DELIVERED')  timestamps.deliveredAt = new Date()
  if (statusUpper === 'CANCELLED')  {
    timestamps.cancelledAt = new Date()
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
      user:    { select: { firstName: true, telegramId: true } },
      courier: { select: { firstName: true, phone: true } },
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId: adminUser.userId,
      action:  `Buyurtma statusi o'zgartirildi: ${order.status} → ${statusUpper}`,
      entity:  'order',
      entityId: id,
      oldValue: order.status,
      newValue: statusUpper,
    },
  })

  // BigInt fix
  const result = {
    ...updated,
    user: updated.user ? { ...updated.user, telegramId: String((updated.user as any).telegramId) } : null,
  }
  return reply.send(ok(result))
}

// ── COURIER: GET /api/courier/orders ──
export async function getCourierOrders(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId

  const orders = await prisma.order.findMany({
    where:   { courierId, status: { in: ['READY', 'ON_THE_WAY'] } },
    include: { items: { include: { menuItem: true } }, user: { select: { firstName: true, phone: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return reply.send(ok(orders))
}

// PATCH /api/courier/orders/:id/status
export async function updateCourierOrderStatus(req: FastifyRequest, reply: FastifyReply) {
  const { id }     = req.params as { id: string }
  const { status } = req.body as { status: string }
  const courierId  = (req as any).user.userId

  const order = await prisma.order.findFirst({ where: { id, courierId } })
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

  return reply.send(ok(updated))
}
