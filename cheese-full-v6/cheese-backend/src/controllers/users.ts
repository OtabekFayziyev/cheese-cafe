import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../utils/db'
import { ok, err, paginate } from '../types/index'

// ── USER ──

// GET /api/user/me
export async function getMe(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user.userId
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: {
      savedAddresses: true,
      savedPromos:    { include: { promoCode: true } },
    },
  })
  if (!user) return reply.code(404).send(err('Foydalanuvchi topilmadi'))
  return reply.send(ok({ ...user, telegramId: String(user.telegramId) }))
}

// PATCH /api/user/me — telefon raqamini saqlash
export async function updateMe(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user.userId
  const { phone } = req.body as { phone?: string }

  const user = await prisma.user.update({
    where: { id: userId },
    data:  { ...(phone && { phone }) },
  })

  return reply.send(ok({ ...user, telegramId: String(user.telegramId) }))
}

// POST /api/user/address — manzil saqlash
export async function saveAddress(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user.userId
  const body   = req.body as any

  const address = await prisma.savedAddress.create({
    data: { userId, ...body },
  })
  return reply.code(201).send(ok(address))
}

// DELETE /api/user/address/:id
export async function deleteAddress(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user.userId
  const { id } = req.params as { id: string }

  const addr = await prisma.savedAddress.findFirst({ where: { id, userId } })
  if (!addr) return reply.code(404).send(err('Manzil topilmadi'))

  await prisma.savedAddress.delete({ where: { id } })
  return reply.send(ok(null, 'O\'chirildi'))
}

// ── PROMO ──

// POST /api/promo/validate — promo kodni tekshirish
export async function validatePromo(req: FastifyRequest, reply: FastifyReply) {
  const { code, orderTotal } = req.body as { code: string; orderTotal: number }

  const promo = await prisma.promoCode.findFirst({
    where: {
      code:     code.toUpperCase(),
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
  })

  if (!promo) return reply.code(404).send(err('Promo kod topilmadi yoki muddati o\'tgan'))
  if (orderTotal < promo.minOrder) {
    return reply.code(400).send(err(`Minimum buyurtma: ${promo.minOrder.toLocaleString()} so'm`))
  }

  const discount = promo.discountType === 'FIXED'
    ? promo.discount
    : Math.floor(orderTotal * promo.discount / 100)

  return reply.send(ok({ promo, discount }))
}

// POST /api/promo/save — profilga saqlash
export async function savePromo(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user.userId
  const { code } = req.body as { code: string }

  const promo = await prisma.promoCode.findFirst({
    where: { code: code.toUpperCase(), isActive: true },
  })
  if (!promo) return reply.code(404).send(err('Promo kod topilmadi'))

  const existing = await prisma.userPromo.findUnique({
    where: { userId_promoCodeId: { userId, promoCodeId: promo.id } },
  })
  if (existing) return reply.send(ok(existing, 'Avval saqlangan'))

  const userPromo = await prisma.userPromo.create({
    data: { userId, promoCodeId: promo.id },
    include: { promoCode: true },
  })

  return reply.code(201).send(ok(userPromo, 'Saqlandi'))
}

// ── ADMIN: USERS ──

// GET /api/admin/users
export async function getUsers(req: FastifyRequest, reply: FastifyReply) {
  const { page, limit, search, blocked } = req.query as any
  const { take, skip } = paginate(page, limit)

  const where: any = {}
  if (blocked === 'true') where.isBlocked = true
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName:  { contains: search, mode: 'insensitive' } },
      { phone:     { contains: search } },
      { username:  { contains: search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, telegramId: true, firstName: true, lastName: true,
        username: true, phone: true, role: true,
        isBlocked: true, blockReason: true, bonusPoints: true,
        createdAt: true, updatedAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take, skip,
    }),
    prisma.user.count({ where }),
  ])

  // Add totalSpent for each user
  const userIds = users.map(u => u.id)
  const spentData = await prisma.order.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, status: 'DELIVERED' },
    _sum: { totalPrice: true },
  })
  const spentMap = Object.fromEntries(spentData.map(s => [s.userId, s._sum.totalPrice || 0]))

  return reply.send(ok({
    users: users.map(u => ({
      ...u,
      telegramId:  String(u.telegramId),
      ordersCount: u._count?.orders || 0,
      totalSpent:  spentMap[u.id] || 0,
    })),
    total, page: Number(page) || 1, limit: take,
  }))
}

// PATCH /api/admin/users/:id/block
export async function blockUser(req: FastifyRequest, reply: FastifyReply) {
  const { id }                      = req.params as { id: string }
  const { reason, until }           = req.body as any
  const adminUser                   = (req as any).user

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data:  {
      isBlocked:   true,
      blockReason: reason,
      blockUntil:  until ? new Date(until) : null,
    },
  })

  await prisma.auditLog.create({
    data: {
      adminId: adminUser.userId,
      action:  'Foydalanuvchi bloklandi',
      entity:  'user',
      entityId: String(id),
      newValue: reason,
    },
  })

  return reply.send(ok({ ...user, telegramId: String(user.telegramId) }))
}

// PATCH /api/admin/users/:id/unblock
export async function unblockUser(req: FastifyRequest, reply: FastifyReply) {
  const { id }    = req.params as { id: string }
  const adminUser = (req as any).user

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data:  { isBlocked: false, blockReason: null, blockUntil: null },
  })

  await prisma.auditLog.create({
    data: { adminId: adminUser.userId, action: 'Foydalanuvchi blokdan chiqarildi', entity: 'user', entityId: String(id) },
  })

  return reply.send(ok({ ...user, telegramId: String(user.telegramId) }))
}

// ── SETTINGS ──

// GET /api/settings
export async function getSettings(req: FastifyRequest, reply: FastifyReply) {
  const [settings, workHours] = await Promise.all([
    prisma.cafeSetting.findMany(),
    prisma.workHours.findMany({ orderBy: { day: 'asc' } }),
  ])

  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))
  return reply.send(ok({ settings: settingsMap, workHours }))
}

// PATCH /api/admin/settings
export async function updateSettings(req: FastifyRequest, reply: FastifyReply) {
  const body      = req.body as Record<string, string>
  const adminUser = (req as any).user

  for (const [key, value] of Object.entries(body)) {
    await prisma.cafeSetting.upsert({
      where:  { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }

  await prisma.auditLog.create({
    data: { adminId: adminUser.userId, action: 'Sozlamalar yangilandi', entity: 'settings' },
  })

  return reply.send(ok(null, 'Saqlandi'))
}

// PATCH /api/admin/settings/hours
export async function updateWorkHours(req: FastifyRequest, reply: FastifyReply) {
  const hours     = req.body as Array<{ day: number; open: string; close: string; isOff: boolean }>
  const adminUser = (req as any).user

  for (const h of hours) {
    await prisma.workHours.upsert({
      where:  { day: h.day },
      update: { open: h.open, close: h.close, isOff: h.isOff },
      create: h,
    })
  }

  await prisma.auditLog.create({
    data: { adminId: adminUser.userId, action: 'Ish vaqti yangilandi', entity: 'settings' },
  })

  return reply.send(ok(null, 'Ish vaqti saqlandi'))
}

// GET /api/admin/stats — dashboard uchun
export async function getStats(req: FastifyRequest, reply: FastifyReply) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6)

  const [
    pendingCount, activeCount, todayOrders, weekOrders,
    totalUsers, totalMenuItems,
  ] = await Promise.all([
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: { in: ['ACCEPTED', 'PREPARING', 'READY', 'ON_THE_WAY'] } } }),
    prisma.order.findMany({ where: { createdAt: { gte: today } } }),
    prisma.order.findMany({ where: { createdAt: { gte: weekAgo }, status: 'DELIVERED' } }),
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.menuItem.count({ where: { isAvailable: true } }),
  ])

  const todayRevenue = todayOrders
    .filter(o => o.status === 'DELIVERED')
    .reduce((s, o) => s + o.totalPrice, 0)

  const weekRevenue = weekOrders.reduce((s, o) => s + o.totalPrice, 0)

  return reply.send(ok({
    pendingCount,
    activeCount,
    todayCount:   todayOrders.length,
    todayRevenue,
    weekRevenue,
    weekDelivered: weekOrders.length,
    totalUsers,
    totalMenuItems,
  }))
}

// GET /api/admin/audit-logs
export async function getAuditLogs(req: FastifyRequest, reply: FastifyReply) {
  const { page, limit } = req.query as any
  const { take, skip }  = paginate(page, limit)

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { admin: { select: { firstName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take, skip,
    }),
    prisma.auditLog.count(),
  ])

  return reply.send(ok({ logs, total }))
}
