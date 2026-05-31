import type { FastifyRequest, FastifyReply } from 'fastify'

const CAFE_LAT = 38.853373449716344
const CAFE_LNG = 65.7889651753182

// Haversine formula — ikki nuqta orasidagi km masofasi
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  // Round to 2 decimal places to avoid floating-point issues
  return Math.round(R * c * 100) / 100
}

// Delivery fee formula:
// 0-1km    → 5,000 so'm (flat)
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

  const distance    = haversineKm(CAFE_LAT, CAFE_LNG, lat, lng)
  const deliveryFee = calcDeliveryFee(distance)

  return reply.send({
    ok: true,
    data: {
      distance,          // km
      deliveryFee,       // so'm
      distanceText: distance < 1
        ? `${Math.round(distance * 1000)} m`
        : `${distance.toFixed(1)} km`,
      feeText: `${deliveryFee.toLocaleString()} so'm`,
    },
  })
}
