import type { FastifyRequest, FastifyReply } from 'fastify'

const CAFE_LAT = 38.853373449716344
const CAFE_LNG = 65.7889651753182
const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

// Haversine fallback
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100
}

// Google Distance Matrix API
async function getRealDistance(userLat: number, userLng: number): Promise<number> {
  if (!MAPS_KEY) throw new Error('No API key')

  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${CAFE_LAT},${CAFE_LNG}` +
    `&destinations=${userLat},${userLng}` +
    `&mode=driving` +
    `&key=${MAPS_KEY}`

  const res  = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json() as any

  // Log for debugging
  console.log('[Delivery] Distance Matrix response status:', data.status)

  if (data.status !== 'OK') {
    throw new Error(`API status: ${data.status} — ${data.error_message || ''}`)
  }

  const row     = data.rows?.[0]
  const element = row?.elements?.[0]

  console.log('[Delivery] Element status:', element?.status)

  if (!element || element.status !== 'OK') {
    throw new Error(`Element status: ${element?.status || 'undefined'}`)
  }

  if (!element.distance?.value) {
    throw new Error('No distance value in response')
  }

  return Math.round(element.distance.value / 10) / 100
}

// Fee formula: 0-1km = 5000, +1000 per 500m
function calcDeliveryFee(km: number): number {
  if (km <= 1) return 5000
  return 5000 + Math.ceil((km - 1) / 0.5) * 1000
}

// POST /api/delivery/calculate-fee
export async function calculateFee(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as any
  const lat  = Number(body?.lat)
  const lng  = Number(body?.lng)

  if (isNaN(lat) || isNaN(lng)) {
    return reply.code(400).send({ ok: false, error: 'lat va lng kerak' })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return reply.code(400).send({ ok: false, error: 'Noto\'g\'ri koordinatalar' })
  }

  let distance: number
  let method = 'driving'

  try {
    distance = await getRealDistance(lat, lng)
    console.log(`[Delivery] Real distance: ${distance} km`)
  } catch (e: any) {
    console.warn(`[Delivery] Fallback to Haversine: ${e.message}`)
    distance = haversineKm(CAFE_LAT, CAFE_LNG, lat, lng)
    method   = 'straight'
  }

  const deliveryFee = calcDeliveryFee(distance)

  return reply.send({
    ok: true,
    data: {
      distance,
      deliveryFee,
      method,
      distanceText: distance < 1
        ? `${Math.round(distance * 1000)} m`
        : `${distance.toFixed(1)} km`,
      feeText: `${deliveryFee.toLocaleString()} so'm`,
    },
  })
}