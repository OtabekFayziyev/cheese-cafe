import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void
  onClose:  () => void
  initial?: { lat: number; lng: number }
}

const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''
const DEFAULT  = { lat: 38.853373, lng: 65.788965 }

async function geocode(lat: number, lng: number): Promise<string> {
  // Nominatim — bepul, API key kerak emas
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'CheeseCafeApp/1.0' } }
    )
    const d = await res.json()
    if (d.display_name) {
      const p = d.display_name.split(',')
      return p.slice(0, 4).join(',').trim()
    }
  } catch {}
  // Google fallback
  if (MAPS_KEY) {
    try {
      const res  = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}&language=uz`
      )
      const d = await res.json()
      if (d.results?.[0]) return d.results[0].formatted_address
    } catch {}
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

function MapContent({ onSelect, onClose, initial }: Props) {
  const mapDiv    = useRef<HTMLDivElement>(null)
  const mapObj    = useRef<any>(null)
  const markerObj = useRef<any>(null)

  const start = initial || DEFAULT
  const [coords,   setCoords]   = useState(start)
  const [address,  setAddress]  = useState('')
  const [addrLoad, setAddrLoad] = useState(false)
  const [gpsLoad,  setGpsLoad]  = useState(false)
  const [ready,    setReady]    = useState(false)

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Load Leaflet then init map
  useEffect(() => {
    const initMap = () => {
      if (!mapDiv.current || mapObj.current) return
      const L = (window as any).L

      // Init map
      const map = L.map(mapDiv.current, {
        center:           [start.lat, start.lng],
        zoom:             15,
        zoomControl:      true,
        attributionControl: false,
      })

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Red pin marker
      const redIcon = L.divIcon({
        className: '',
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="#EF4444"/>
          <circle cx="18" cy="18" r="8" fill="white"/>
          <circle cx="18" cy="18" r="5" fill="#EF4444"/>
        </svg>`,
        iconSize:   [36, 48],
        iconAnchor: [18, 48],
      })

      const marker = L.marker([start.lat, start.lng], {
        icon:      redIcon,
        draggable: true,
      }).addTo(map)

      mapObj.current    = map
      markerObj.current = marker
      setReady(true)

      const pick = async (lat: number, lng: number) => {
        marker.setLatLng([lat, lng])
        setCoords({ lat, lng })
        setAddrLoad(true)
        const addr = await geocode(lat, lng)
        setAddress(addr)
        setAddrLoad(false)
      }

      map.on('click', (e: any) => pick(e.latlng.lat, e.latlng.lng))
      marker.on('dragend', () => {
        const p = marker.getLatLng()
        pick(p.lat, p.lng)
      })

      // Initial geocode
      geocode(start.lat, start.lng).then(addr => {
        setAddress(addr)
      })
    }

    // Load CSS
    if (!document.getElementById('lf-css')) {
      const link = document.createElement('link')
      link.id    = 'lf-css'
      link.rel   = 'stylesheet'
      link.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load JS
    if ((window as any).L) {
      initMap()
    } else if (!document.getElementById('lf-js')) {
      const s    = document.createElement('script')
      s.id       = 'lf-js'
      s.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload   = initMap
      document.head.appendChild(s)
    } else {
      // Script loading — wait
      const t = setInterval(() => {
        if ((window as any).L) { clearInterval(t); initMap() }
      }, 100)
      setTimeout(() => clearInterval(t), 10000)
    }
  }, [])

  // GPS detect
  const detectGPS = () => {
    if (!navigator.geolocation) { alert('GPS mavjud emas'); return }
    setGpsLoad(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        setGpsLoad(false)
        mapObj.current?.setView([lat, lng], 17)
        markerObj.current?.setLatLng([lat, lng])
        setAddrLoad(true)
        const addr = await geocode(lat, lng)
        setAddress(addr)
        setAddrLoad(false)
      },
      err => {
        setGpsLoad(false)
        if (err.code === 1) alert('GPS ruxsat berilmagan. Sozlamalarda joylashuvga ruxsat bering.')
        else alert('GPS xatosi. Qayta urining.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2147483647,
      display: 'flex', flexDirection: 'column',
      background: '#111', fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: '#1C1C1C',
        borderBottom: '1px solid #2a2a2a', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#2a2a2a', border: 'none',
          color: '#fff', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>

        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18, color: '#fff', lineHeight: 1,
          }}>Manzilni tanlang</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
            Xaritaga bosing yoki pini torting
          </div>
        </div>

        <button onClick={detectGPS} disabled={gpsLoad} style={{
          padding: '8px 14px', borderRadius: 10,
          background: gpsLoad ? '#2a2a2a' : '#F5C800',
          border: 'none', color: gpsLoad ? '#555' : '#1A1A1A',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          whiteSpace: 'nowrap', transition: 'all .2s',
        }}>
          {gpsLoad ? '⏳' : '📡 GPS'}
        </button>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapDiv} style={{ width: '100%', height: '100%' }} />

        {/* Loading overlay */}
        {!ready && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#0d1a0d', gap: 14,
          }}>
            <div style={{ fontSize: 52 }}>🗺️</div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 14 }}>
              Xarita yuklanmoqda...
            </div>
          </div>
        )}

        {/* Address bubble */}
        {ready && (
          <div style={{
            position: 'absolute', bottom: 14, left: 14, right: 14, zIndex: 10,
            background: 'rgba(17,17,17,.92)', borderRadius: 14,
            padding: '10px 14px', fontSize: 13,
            color: addrLoad ? 'rgba(255,255,255,.4)' : '#fff',
            border: `1.5px solid ${address ? '#F5C800' : 'rgba(255,255,255,.12)'}`,
            backdropFilter: 'blur(8px)',
            transition: 'border-color .3s',
          }}>
            {addrLoad ? '📍 Manzil aniqlanmoqda...' : address || '👆 Xaritaga bosing'}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{
        padding: '12px 16px 20px', background: '#1C1C1C',
        borderTop: '1px solid #2a2a2a', flexShrink: 0,
      }}>
        {/* Manual input */}
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Yoki manzilni qo'lda kiriting..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 12,
            background: '#252525', border: '1.5px solid #333',
            color: '#fff', fontSize: 14, outline: 'none',
            boxSizing: 'border-box', marginBottom: 10,
            fontFamily: "inherit",
          }}
        />
        <button
          disabled={!address || addrLoad}
          onClick={() => address && !addrLoad && onSelect(address, coords)}
          style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: (address && !addrLoad) ? '#F5C800' : '#252525',
            border: 'none',
            color: (address && !addrLoad) ? '#1A1A1A' : 'rgba(255,255,255,.25)',
            fontSize: 15, fontWeight: 700, cursor: address ? 'pointer' : 'not-allowed',
            fontFamily: "inherit", transition: 'all .2s',
          }}
        >
          ✅ Tasdiqlash
        </button>
      </div>
    </div>
  )
}

export default function MapPicker(props: Props) {
  const [el, setEl] = useState<Element | null>(null)
  useEffect(() => {
    setEl(document.getElementById('root') || document.body)
  }, [])
  if (!el) return null
  return createPortal(<MapContent {...props} />, el)
}
