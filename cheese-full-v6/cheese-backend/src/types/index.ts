import type { FastifyRequest } from 'fastify'

export interface JwtPayload {
  userId:     number
  telegramId: string
  role:       string
}

export interface AuthRequest extends FastifyRequest {
  user: JwtPayload
}

export interface TelegramUser {
  id:         number
  first_name: string
  last_name?: string
  username?:  string
  photo_url?: string
}

export const ok = <T>(data: T, message?: string) => ({
  success: true, data, ...(message && { message }),
})
export const err = (message: string) => ({
  success: false, error: message,
})
export const paginate = (page = 1, limit = 20) => {
  const take = Math.min(Number(limit), 100)
  const skip = (Math.max(Number(page), 1) - 1) * take
  return { take, skip }
}
