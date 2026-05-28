import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../utils/db'
import { ok, err, paginate } from '../types/index'

// GET /api/menu — barcha taomlar
export async function getMenu(req: FastifyRequest, reply: FastifyReply) {
  const { categoryId, search, hot, available = 'true' } = req.query as any

  const where: any = {}
  if (available === 'true') where.isAvailable = true
  if (categoryId) where.categoryId = categoryId
  if (hot === 'true') where.isHot = true
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const items = await prisma.menuItem.findMany({
    where,
    include: { extras: true, category: true },
    orderBy: [{ sortOrder: 'asc' }, { soldCount: 'desc' }],
  })

  return reply.send(ok(items))
}

// GET /api/menu/categories
export async function getCategories(req: FastifyRequest, reply: FastifyReply) {
  const cats = await prisma.category.findMany({
    where:   { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return reply.send(ok(cats))
}

// GET /api/menu/:id
export async function getMenuItem(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const item = await prisma.menuItem.findUnique({
    where:   { id },
    include: { extras: true, category: true },
  })
  if (!item) return reply.code(404).send(err('Taom topilmadi'))
  return reply.send(ok(item))
}

// ── ADMIN: POST /api/admin/menu ──
export async function createMenuItem(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as any
  const { extras = [], ...data } = body

  const item = await prisma.menuItem.create({
    data: {
      ...data,
      extras: { create: extras },
    },
    include: { extras: true },
  })

  // Audit log
  const user = (req as any).user
  await prisma.auditLog.create({
    data: { adminId: user.userId, action: 'Yangi taom qo\'shildi', entity: 'menu', entityId: item.id, newValue: item.name },
  })

  return reply.code(201).send(ok(item, 'Taom qo\'shildi'))
}

// PATCH /api/admin/menu/:id
export async function updateMenuItem(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const body   = req.body as any
  const { extras, ...data } = body

  const old = await prisma.menuItem.findUnique({ where: { id } })
  if (!old) return reply.code(404).send(err('Taom topilmadi'))

  const item = await prisma.menuItem.update({
    where: { id },
    data,
    include: { extras: true },
  })

  const user = (req as any).user
  await prisma.auditLog.create({
    data: {
      adminId: user.userId,
      action: 'Taom yangilandi',
      entity: 'menu',
      entityId: id,
      oldValue: old.price !== item.price ? String(old.price) : undefined,
      newValue: old.price !== item.price ? String(item.price) : item.name,
    },
  })

  return reply.send(ok(item, 'Yangilandi'))
}

// DELETE /api/admin/menu/:id
export async function deleteMenuItem(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (!item) return reply.code(404).send(err('Taom topilmadi'))

  await prisma.menuItem.delete({ where: { id } })

  const user = (req as any).user
  await prisma.auditLog.create({
    data: { adminId: user.userId, action: 'Taom o\'chirildi', entity: 'menu', entityId: id, oldValue: item.name },
  })

  return reply.send(ok(null, 'O\'chirildi'))
}

// PATCH /api/admin/menu/:id/toggle
export async function toggleAvailability(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (!item) return reply.code(404).send(err('Taom topilmadi'))

  const updated = await prisma.menuItem.update({
    where: { id },
    data:  { isAvailable: !item.isAvailable },
  })

  const user = (req as any).user
  await prisma.auditLog.create({
    data: { adminId: user.userId, action: `Taom ${updated.isAvailable ? 'ochildi' : 'yopildi'}`, entity: 'menu', entityId: id, newValue: item.name },
  })

  return reply.send(ok(updated))
}
