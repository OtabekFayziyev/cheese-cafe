import React, { useState, useEffect, useCallback } from 'react'
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api'
import { useCourierStore } from '@/store/courierStore'
import { ordersAPI } from '@/api/client'
import { CourierShell } from './CourierShell'
import styles from './CourierMap.module.css'

const MAPS_KEY  = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''
const LIBRARIES: any[] = ['places']
const MAP_STYLE = { width: '100%', height: '100%' }

export default function CourierMap() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: MAPS_KEY,
    libraries: LIBRARIES,
  })

  const activeOrders = useCourierStore(s => s.activeOrders)
  const [courierPos, setCourierPos] = useState<{ lat: number; lng: number } | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Track courier position every 30s
  useEffect(() => {
    const updatePos = () => {
      navigator.geolocation?.getCurrentPosition(pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCourierPos(coords)
        // Send to backend
        try {
          ordersAPI.updateCourierLocation?.(coords.lat, coords.lng)
        } catch {}
      })
    }
    updatePos()
    const t = setInterval(updatePos, 30000)
    return () => clearInterval(t)
  }, [])

  // Get directions to selected order
  useEffect(() => {
    if (!isLoaded || !courierPos || !selectedOrder?.lat || !selectedOrder?.lng) return
    const svc = new google.maps.DirectionsService()
    svc.route({
      origin:      courierPos,
      destination: { lat: Number(selectedOrder.lat), lng: Number(selectedOrder.lng) },
      travelMode:  google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === 'OK') setDirections(result)
    })
  }, [courierPos, selectedOrder, isLoaded])

  const center = courierPos || { lat: 41.2995, lng: 69.2401 }

  return (
    <CourierShell>
      <div className={styles.mapWrap}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_STYLE}
            center={center}
            zoom={14}
            options={{ disableDefaultUI: true, zoomControl: true }}
          >
            {/* Courier position */}
            {courierPos && (
              <Marker
                position={courierPos}
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="#F5C800" stroke="#1A1A1A" stroke-width="3"/>
                      <text x="20" y="26" text-anchor="middle" font-size="18">🛵</text>
                    </svg>
                  `),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20),
                }}
              />
            )}

            {/* Order destinations */}
            {activeOrders.map((order: any) => order.lat && (
              <Marker
                key={order.id}
                position={{ lat: Number(order.lat), lng: Number(order.lng) }}
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="#EF4444" stroke="white" stroke-width="2"/>
                      <text x="18" y="24" text-anchor="middle" font-size="16">📍</text>
                    </svg>
                  `),
                  scaledSize: new google.maps.Size(36, 36),
                  anchor: new google.maps.Point(18, 18),
                }}
                onClick={() => setSelectedOrder(order)}
              />
            ))}

            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
          </GoogleMap>
        ) : (
          <div className={styles.loading}>🗺️ Xarita yuklanmoqda...</div>
        )}

        {/* Orders list */}
        <div className={styles.ordersPanel}>
          {activeOrders.length === 0 ? (
            <div className={styles.empty}>Aktiv buyurtma yo'q</div>
          ) : activeOrders.map((order: any) => (
            <div key={order.id}
              className={styles.orderCard}
              style={{ borderColor: selectedOrder?.id === order.id ? 'var(--yellow)' : 'var(--border)' }}
              onClick={() => setSelectedOrder(order)}
            >
              <div className={styles.orderTop}>
                <span className={styles.orderId}>{order.orderNumber || order.id}</span>
                <span className={styles.orderStatus}>{order.status}</span>
              </div>
              <div className={styles.orderAddr}>📍 {order.address || 'Manzil yo\'q'}</div>
              <div className={styles.orderPhone}>📞 {order.phone}</div>
            </div>
          ))}
        </div>
      </div>
    </CourierShell>
  )
}
