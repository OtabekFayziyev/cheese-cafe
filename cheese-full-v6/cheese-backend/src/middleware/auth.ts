import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyTelegramInitData, parseTelegramInitData } from '../utils/helpers'
import { prisma } from '../utils/db'
import { err } from '../types/index'

// ── JWT auth (barcha himoyalangan routelar uchun) ──
export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send(err('Token yaroqsiz yoki muddati o\'tgan'))
  }
}

// ── Admin tekshirish ──
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user
  if (!['ADMIN', 'MODERATOR', 'CASHIER'].includes(user?.role)) {
    return reply.code(403).send(err('Admin ruxsati talab qilinadi'))
  }
}

// ── Super Admin tekshirish ──
export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user
  if (user?.role !== 'ADMIN') {
    return reply.code(403).send(err('Faqat Super Admin uchun'))
  }
}

// ── Kuryer tekshirish ──
export async function requireCourier(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user
  if (!['ADMIN', 'COURIER'].includes(user?.role)) {
    return reply.code(403).send(err('Kuryer ruxsati talab qilinadi'))
  }
}

// ── Telegram initData orqali login ──
export async function telegramAuth(req: FastifyRequest, reply: FastifyReply) {
  const { initData } = req.body as { initData: string }

  if (!initData) {
    return reply.code(400).send(err('initData talab qilinadi'))
  }

  const botToken = process.env.BOT_TOKEN!

  // Dev mode'da tekshirishni o'tkazib ketish
  if (process.env.NODE_ENV !== 'production') {
    const tgUser = parseTelegramInitData(initData)
    if (!tgUser) {
      // Dev uchun mock user
      const mockUser = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
      }
      return handleUserLogin(mockUser, reply, req)
    }
    return handleUserLogin(tgUser, reply, req)
  }

  // Production: to'liq tekshirish
  if (!verifyTelegramInitData(initData, botToken)) {
    return reply.code(401).send(err('Telegram ma\'lumotlari yaroqsiz'))
  }

  const tgUser = parseTelegramInitData(initData)
  if (!tgUser) {
    return reply.code(400).send(err('Foydalanuvchi ma\'lumotlari topilmadi'))
  }

  return handleUserLogin(tgUser, reply, req)
}

async function handleUserLogin(tgUser: any, reply: FastifyReply, req: FastifyRequest) {
  // Upsert user
  const user = await prisma.user.upsert({
    where:  { telegramId: BigInt(tgUser.id) },
    update: {
      firstName: tgUser.first_name,
      lastName:  tgUser.last_name  ?? undefined,
      username:  tgUser.username   ?? undefined,
      photoUrl:  tgUser.photo_url  ?? undefined,
    },
    create: {
      telegramId: BigInt(tgUser.id),
      firstName:  tgUser.first_name,
      lastName:   tgUser.last_name  ?? undefined,
      username:   tgUser.username   ?? undefined,
      photoUrl:   tgUser.photo_url  ?? undefined,
    },
  })

  if (user.isBlocked) {
    return reply.code(403).send(err('Sizning hisobingiz bloklangan: ' + (user.blockReason || '')))
  }

  // JWT token yaratish
  const token = await (reply as any).jwtSign(
    { userId: user.id, telegramId: String(user.telegramId), role: user.role },
    { expiresIn: '7d' }
  )

  return reply.send({
    success: true,
    data: {
      token,
      user: {
        id:          user.id,
        telegramId:  String(user.telegramId),
        firstName:   user.firstName,
        lastName:    user.lastName,
        username:    user.username,
        photoUrl:    user.photoUrl,
        phone:       user.phone,
        role:        user.role,
        bonusPoints: user.bonusPoints,
      },
    },
  })
}