import crypto from 'crypto'

/**
 * Telegram WebApp initData ni tekshiradi
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return false

    params.delete('hash')

    // Sort keys alphabetically
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')

    // HMAC-SHA256 with key = HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    return computedHash === hash
  } catch {
    return false
  }
}

/**
 * initData dan user ob'ektini olish
 */
export function parseTelegramInitData(initData: string) {
  const params = new URLSearchParams(initData)
  const userStr = params.get('user')
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Order raqamini generatsiya qilish: ORD-1001
 */
export async function generateOrderNumber(prisma: any): Promise<string> {
  const count = await prisma.order.count()
  return `ORD-${1001 + count}`
}

/**
 * Bonus ball hisoblash
 */
export function calcBonusPoints(totalPrice: number, bonusPer10k = 1): number {
  return Math.floor(totalPrice / 10000) * bonusPer10k
}

/**
 * Yetkazish narxini hisoblash
 */
export function calcDeliveryFee(
  distanceKm: number,
  baseFee = 5000,
  perKm = 1000
): number {
  if (distanceKm <= 0) return baseFee
  return baseFee + Math.ceil(distanceKm) * perKm
}
