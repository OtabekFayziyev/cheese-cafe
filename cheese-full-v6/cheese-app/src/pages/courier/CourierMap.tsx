import React, { useState, useEffect, useRef } from 'react'
import { useCourierStore } from '@/store/courierStore'
import { ordersAPI } from '@/api/client'
import { CourierShell } from './CourierShell'
import styles from './CourierMap.module.css'

export default function CourierMap() {
  const activeOrders  = useCourierStore(s => s.activeOrders)
  const mapElRef      = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const courierMarker = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    // Load Leaflet
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const loadL = () => {
      if ((window as any).L) { initMap(); return }
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = initMap
      document.head.appendChild(s)
    }
    setTimeout(loadL, 100)
  }, [])

  function initMap() {
    if (!mapElRef.current || mapRef.current) return
    const L   = (window as any).L
    const map = L.map(mapElRef.current).setView([41.2995, 69.2401], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map)
    mapRef.current = map
    setMapReady(true)

    // Courier icon
    const cIcon = L.divIcon({
      html: '<div style="font-size:28px">🛵</div>',
      className: '', iconSize: [28, 28], iconAnchor: [14, 14],
    })
    courierMarker.current = L.marker([41.2995, 69.2401], { icon: cIcon }).addTo(map)
  }

  // Track courier position every 30s
  useEffect(() => {
    const update = () => {
      navigator.geolocation?.getCurrentPosition(pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (mapRef.current && courierMarker.current) {
          courierMarker.current.setLatLng([lat, lng])
          mapRef.current.setView([lat, lng], mapRef.current.getZoom())
        }
        try { ordersAPI.updateCourierLocation?.(lat, lng) } catch {}
      })
    }
    update()
    const t = setInterval(update, 30000)
    return () => clearInterval(t)
  }, [mapReady])

  // Add order markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const L = (window as any).L
    activeOrders.forEach((order: any) => {
      if (!order.lat || !order.lng) return
      const icon = L.divIcon({
        html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">📦</div>`,
        className: '', iconSize: [24, 24], iconAnchor: [12, 24],
      })
      L.marker([Number(order.lat), Number(order.lng)], { icon })
        .addTo(mapRef.current)
        .on('click', () => setSelected(order))
    })
  }, [activeOrders, mapReady])

  return (
    <CourierShell>
      <div className={styles.mapWrap}>
        <div ref={mapElRef} style={{ width:'100%', height:'60vh' }} />

        {!mapReady && (
          <div className={styles.loading}>
            <div style={{fontSize:48}}>🗺️</div>
            <div>Xarita yuklanmoqda...</div>
          </div>
        )}

        {/* Orders */}
        <div className={styles.ordersPanel}>
          {activeOrders.length === 0 ? (
            <div className={styles.empty}>🛵 Aktiv buyurtma yo'q</div>
          ) : activeOrders.map((o: any) => (
            <div key={o.id} className={styles.orderCard}
              style={{ borderColor: selected?.id === o.id ? '#F5C800' : 'var(--border)' }}
              onClick={() => {
                setSelected(o)
                if (o.lat && mapRef.current) {
                  mapRef.current.setView([Number(o.lat), Number(o.lng)], 16)
                }
              }}
            >
              <div className={styles.orderTop}>
                <span className={styles.orderId}>{o.orderNumber || o.id}</span>
                <span className={styles.orderStatus}>{o.status}</span>
              </div>
              <div className={styles.orderAddr}>📍 {o.address || 'Manzil yo\'q'}</div>
              <div className={styles.orderPhone}>📞 {o.phone}</div>
            </div>
          ))}
        </div>
      </div>
    </CourierShell>
  )
}
