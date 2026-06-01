import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../utils/db'
import { emitOrderStatusChanged } from '../services/socket'
import { io } from '../services/socket'

const CAFE_LAT = 38.853373449716344
const CAFE_LNG = 65.7889651753182
const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

function ok(data: any, msg?: string)  { return { ok: true,  data, message: msg } }
function err(msg: string)             { return { ok: false, error: msg } }

// Haversine fallback
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 100) / 100
}

// Delivery fee: 0-1km=5000, +1000 per 500m
function calcFee(km: number): number {
  if (km <= 1) return 5000
  return 5000 + Math.ceil((km - 1) / 0.5) * 1000
}

async function getRealDistanceKm(lat: number, lng: number): Promise<number> {
  if (!MAPS_KEY) throw new Error('No key')
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${CAFE_LAT},${CAFE_LNG}&destinations=${lat},${lng}&mode=driving&key=${MAPS_KEY}`
  const res  = await fetch(url)
  const data = await res.json() as any
  if (data.status !== 'OK') throw new Error(data.status)
  const el = data.rows?.[0]?.elements?.[0]
  if (el?.status !== 'OK') throw new Error(el?.status)
  return Math.round(el.distance.value / 10) / 100
}

// ── GET /api/courier/orders ──
export async function getCourierOrders(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId

  const orders = await prisma.order.findMany({
    where:   { courierId, status: { in: ['ON_THE_WAY', 'READY'] } },
    include: {
      items:   { include: { menuItem: true } },
      user:    { select: { firstName: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return reply.send(ok(orders))
}

// ── GET /api/courier/history ──
export async function getCourierHistory(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId

  const orders = await prisma.order.findMany({
    where:   { courierId, status: 'DELIVERED' },
    include: { items: { include: { menuItem: true } } },
    orderBy: { deliveredAt: 'desc' },
    take:    50,
  })

  return reply.send(ok(orders))
}

// ── GET /api/courier/profile ──
export async function getCourierProfile(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId

  const courier = await prisma.user.findUnique({
    where:  { id: courierId },
    select: {
      id: true, firstName: true, lastName: true,
      phone: true, photoUrl: true,
      isOnline: true, balance: true,
      courierOrders: {
        where:  { status: 'DELIVERED' },
        select: { deliveryFee: true, deliveredAt: true },
      },
    },
  })

  if (!courier) return reply.code(404).send(err('Kuryer topilmadi'))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayOrders = courier.courierOrders.filter(o =>
    o.deliveredAt && new Date(o.deliveredAt) >= today
  )

  const stats = {
    totalDeliveries: courier.courierOrders.length,
    todayDeliveries: todayOrders.length,
    todayEarnings:   todayOrders.reduce((s, o) => s + o.deliveryFee, 0),
    balance:         courier.balance,
  }

  return reply.send(ok({ ...courier, stats, courierOrders: undefined }))
}

// ── PATCH /api/courier/online ──
export async function toggleOnline(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId
  const { isOnline } = req.body as { isOnline: boolean }

  const updated = await prisma.user.update({
    where:  { id: courierId },
    data:   { isOnline },
    select: { isOnline: true },
  })

  // Notify admins
  io?.to('admins').emit('courier:status', { courierId, isOnline })

  return reply.send(ok(updated))
}

// ── PATCH /api/courier/orders/:id/status ──
export async function updateOrderStatus(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId
  const { id }    = req.params as { id: string }
  const { status } = req.body as { status: string }
  const statusUpper = status.toUpperCase()

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user:    { select: { telegramId: true, firstName: true } },
      courier: { select: { firstName: true, phone: true } },
      items:   { include: { menuItem: true } },
    },
  })

  if (!order) return reply.code(404).send(err('Buyurtma topilmadi'))
  if (order.courierId !== courierId) return reply.code(403).send(err('Ruxsat yo\'q'))

  const data: any = { status: statusUpper as any }

  if (statusUpper === 'ON_THE_WAY') {
    data.pickedAt = new Date()
  }

  if (statusUpper === 'DELIVERED') {
    data.deliveredAt = new Date()
    data.courierId   = null  // free courier

    // Add delivery fee to courier balance
    await prisma.user.update({
      where: { id: courierId },
      data:  {
        balance:        { increment: order.deliveryFee },
        isOnline:       true,
        lastSeenAt:     new Date(),
      },
    })

    // Bonus points for user (10% of deliveryFee in points)
    const bonus = Math.floor(order.deliveryFee / 1000)
    if (bonus > 0) {
      await prisma.user.update({
        where: { id: order.userId },
        data:  { bonusPoints: { increment: bonus } },
      })
    }
  }

  const updated = await prisma.order.update({
    where:   { id },
    data,
    include: {
      user:    { select: { telegramId: true, firstName: true, phone: true } },
      courier: { select: { id: true, firstName: true, phone: true } },
      items:   { include: { menuItem: true } },
    },
  })

  // Socket broadcast
  emitOrderStatusChanged(updated)

  return reply.send(ok(updated))
}

// ── PATCH /api/courier/location ──
export async function updateLocation(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId
  const { lat, lng } = req.body as { lat: number; lng: number }

  await prisma.user.update({
    where: { id: courierId },
    data:  { lat, lng, lastSeenAt: new Date() },
  })

  // Broadcast to active order rooms
  const activeOrders = await prisma.order.findMany({
    where:  { courierId, status: 'ON_THE_WAY' },
    select: { id: true },
  })

  activeOrders.forEach(o => {
    io?.to(`order:${o.id}`).emit('courier:moved', { lat, lng, ts: Date.now() })
  })

  return reply.send({ ok: true })
}

// ── GET /api/courier/:id/location ──
export async function getCourierLocation(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }

  const courier = await prisma.user.findUnique({
    where:  { id: Number(id) },
    select: { lat: true, lng: true, firstName: true, phone: true, lastSeenAt: true },
  })

  if (!courier) return reply.code(404).send(err('Kuryer topilmadi'))
  return reply.send(ok(courier))
}

// ── GET /api/courier/earnings ──
export async function getEarnings(req: FastifyRequest, reply: FastifyReply) {
  const courierId = (req as any).user.userId

  const courier = await prisma.user.findUnique({
    where:  { id: courierId },
    select: { balance: true },
  })

  const now   = new Date()
  const today = new Date(now); today.setHours(0,0,0,0)
  const week  = new Date(now); week.setDate(week.getDate() - 7)
  const month = new Date(now); month.setDate(1); month.setHours(0,0,0,0)

  const [todayOrders, weekOrders, monthOrders] = await Promise.all([
    prisma.order.findMany({
      where:  { courierId, status: 'DELIVERED', deliveredAt: { gte: today } },
      select: { deliveryFee: true },
    }),
    prisma.order.findMany({
      where:  { courierId, status: 'DELIVERED', deliveredAt: { gte: week } },
      select: { deliveryFee: true },
    }),
    prisma.order.findMany({
      where:  { courierId, status: 'DELIVERED', deliveredAt: { gte: month } },
      select: { deliveryFee: true },
    }),
  ])

  return reply.send(ok({
    balance:        courier?.balance ?? 0,
    today:          { count: todayOrders.length,  earnings: todayOrders.reduce((s,o)  => s+o.deliveryFee, 0) },
    week:           { count: weekOrders.length,   earnings: weekOrders.reduce((s,o)   => s+o.deliveryFee, 0) },
    month:          { count: monthOrders.length,  earnings: monthOrders.reduce((s,o)  => s+o.deliveryFee, 0) },
  }))
}