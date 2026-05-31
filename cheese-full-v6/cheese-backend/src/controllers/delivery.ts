import type { FastifyRequest, FastifyReply } from 'fastify'

const CAFE_LAT = 38.853373449716344
const CAFE_LNG = 65.7889651753182
const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

// Fallback: Haversine formula
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

// Google Distance Matrix API — haqiqiy yo'l masofasi
async function getRealDistance(userLat: number, userLng: number): Promise<number> {
  if (!MAPS_KEY) throw new Error('No API key')

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${CAFE_LAT},${CAFE_LNG}` +
    `&destinations=${userLat},${userLng}` +
    `&mode=driving` +
    `&key=${MAPS_KEY}`

  const res  = await fetch(url)
  const data = await res.json()

  if (data.status !== 'OK') throw new Error(`API error: ${data.status}`)

  const element = data.rows?.[0]?.elements?.[0]
  if (element?.status !== 'OK') throw new Error(`Element error: ${element?.status}`)

  // meters → km, 2 decimal
  return Math.round(element.distance.value / 10) / 100
}

// Delivery fee formula:
// 0-1km    → 5,000 so'm
// +500m    → +1,000 so'm
function calcDeliveryFee(km: number): number {
  if (km <= 1) return 5000
  const extra500m = Math.ceil((km - 1) / 0.5)
  return 5000 + extra500m * 1000
}

// POST /api/delivery/calculate-fee
export async function calculateFee(req: FastifyRequest, reply: FastifyReply) {
  const { lat, lng } = req.body as { lat: number; lng: number }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return reply.code(400).send({ ok: false, error: 'lat va lng kerak' })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return reply.code(400).send({ ok: false, error: 'Noto\'g\'ri koordinatalar' })
  }

  let distance: number
  let method = 'driving'

  try {
    // Haqiqiy yo'l masofasi
    distance = await getRealDistance(lat, lng)
  } catch {
    // Fallback — to'g'ri chiziq
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