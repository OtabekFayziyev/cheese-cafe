import React, { useState, useEffect, useRef } from 'react'
import { useCourierStore } from '@/store/courierStore'
import { ordersAPI } from '@/api/client'
import { sendCourierLocation } from '@/hooks/useSocket'
import { CourierShell } from './CourierShell'
import styles from './CourierMap.module.css'

export default function CourierMap() {
  const activeOrders  = useCourierStore(s => s.activeOrders)
  const mapDiv        = useRef<HTMLDivElement>(null)
  const mapObj        = useRef<any>(null)
  const courierMark   = useRef<any>(null)
  const orderMarks    = useRef<Record<string, any>>({})

  const [mapReady,  setMapReady]  = useState(false)
  const [selected,  setSelected]  = useState<any>(null)
  const [myPos,     setMyPos]     = useState<{lat:number,lng:number}|null>(null)

  // Load Leaflet + init map
  useEffect(() => {
    const init = () => {
      if (!mapDiv.current || mapObj.current) return
      const L = (window as any).L
      if (!L) return

      const map = L.map(mapDiv.current, {
        center:             [41.2995, 69.2401],
        zoom:               13,
        zoomControl:        true,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      const cIcon = L.divIcon({
        className: '',
        html: '<div style="font-size:32px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))">🛵</div>',
        iconSize: [32, 32], iconAnchor: [16, 16],
      })
      courierMark.current = L.marker([41.2995, 69.2401], { icon: cIcon }).addTo(map)

      mapObj.current = map
      setMapReady(true)
    }

    if (!document.getElementById('lf-css')) {
      const l = document.createElement('link')
      l.id = 'lf-css'; l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(l)
    }
    if ((window as any).L) {
      setTimeout(init, 100)
    } else if (!document.getElementById('lf-js')) {
      const s = document.createElement('script')
      s.id = 'lf-js'
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = () => setTimeout(init, 100)
      document.head.appendChild(s)
    } else {
      const t = setInterval(() => {
        if ((window as any).L) { clearInterval(t); init() }
      }, 100)
      setTimeout(() => clearInterval(t), 8000)
    }
  }, [])

  // Add order markers when orders change
  useEffect(() => {
    if (!mapReady || !mapObj.current) return
    const L = (window as any).L

    // Remove old markers
    Object.values(orderMarks.current).forEach((m: any) => m.remove())
    orderMarks.current = {}

    activeOrders.forEach((order: any) => {
      if (!order.lat || !order.lng) return
      const icon = L.divIcon({
        className: '',
        html: `<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">📍</div>`,
        iconSize: [26, 26], iconAnchor: [13, 26],
      })
      const marker = L.marker([Number(order.lat), Number(order.lng)], { icon })
        .addTo(mapObj.current)
        .on('click', () => setSelected(order))
      orderMarks.current[order.id] = marker
    })
  }, [activeOrders, mapReady])

  // GPS tracking — har 30s
  useEffect(() => {
    const update = () => {
      navigator.geolocation?.getCurrentPosition(pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setMyPos({ lat, lng })

        if (mapObj.current && courierMark.current) {
          courierMark.current.setLatLng([lat, lng])
        }

        // Send to backend + socket
        activeOrders.forEach((o: any) => {
          sendCourierLocation(lat, lng, o.id)
        })
        try { ordersAPI.updateCourierLocation?.(lat, lng) } catch {}
      }, undefined, { enableHighAccuracy: true })
    }
    update()
    const t = setInterval(update, 30000)
    return () => clearInterval(t)
  }, [activeOrders.length])

  // Center on selected order
  const focusOrder = (order: any) => {
    setSelected(order)
    if (order.lat && mapObj.current) {
      mapObj.current.setView([Number(order.lat), Number(order.lng)], 16)
    }
  }

  const focusMe = () => {
    if (myPos && mapObj.current) {
      mapObj.current.setView([myPos.lat, myPos.lng], 16)
    }
  }

  return (
    <CourierShell>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Map */}
        <div style={{ position: 'relative', flex: 1, minHeight: 300 }}>
          <div ref={mapDiv} style={{ width: '100%', height: '100%' }} />

          {!mapReady && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: '#0d1a0d', gap: 12,
            }}>
              <div style={{ fontSize: 48 }}>🗺️</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Xarita yuklanmoqda...</div>
            </div>
          )}

          {/* My location button */}
          {mapReady && (
            <button onClick={focusMe} style={{
              position: 'absolute', top: 12, right: 12, zIndex: 10,
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              fontSize: 20, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,.3)',
            }}>📡</button>
          )}

          {/* LIVE badge */}
          {mapReady && (
            <div style={{
              position: 'absolute', top: 12, left: 12, zIndex: 10,
              background: 'rgba(239,68,68,.9)', color: '#fff',
              fontSize: 11, fontWeight: 800, padding: '4px 10px',
              borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: '#fff',
                animation: 'pulse 1s infinite',
              }} />
              LIVE
            </div>
          )}
        </div>

        {/* Orders list */}
        <div style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          maxHeight: '45%', overflowY: 'auto',
          padding: '12px 16px',
        }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 16,
            color: 'var(--text-primary)', marginBottom: 10,
          }}>
            Aktiv buyurtmalar ({activeOrders.length})
          </div>

          {activeOrders.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '20px 0',
              color: 'var(--text-muted)', fontSize: 14,
            }}>
              🛵 Hozircha buyurtma yo'q
            </div>
          ) : activeOrders.map((order: any) => (
            <div
              key={order.id}
              onClick={() => focusOrder(order)}
              style={{
                background: selected?.id === order.id ? 'rgba(245,200,0,.1)' : 'var(--surface-2)',
                border: `1.5px solid ${selected?.id === order.id ? 'var(--yellow)' : 'var(--border)'}`,
                borderRadius: 12, padding: '10px 14px', marginBottom: 8,
                cursor: 'pointer', transition: 'all .2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: 'var(--text-primary)' }}>
                  {order.orderNumber || order.id}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(245,200,0,.15)', color: 'var(--yellow-dark)',
                }}>
                  {order.status === 'ready' ? '📦 Tayyor' : "🛵 Yo'lda"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                📍 {order.address || 'Manzil yo\'q'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                📞 {order.phone}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CourierShell>
  )
}
