import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''

interface Props {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void
  onClose:  () => void
  initial?: { lat: number; lng: number }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uz`,
      { headers: { 'Accept-Language': 'uz,ru' } }
    )
    const data = await res.json()
    if (data.display_name) {
      // Shorten address
      const parts = data.display_name.split(',')
      return parts.slice(0, 4).join(',').trim()
    }
  } catch {}
  // Fallback to Google if key exists
  if (MAPS_KEY) {
    try {
      const res  = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}&language=uz`
      )
      const data = await res.json()
      if (data.status === 'OK' && data.results[0]) return data.results[0].formatted_address
    } catch {}
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

function MapPickerContent({ onSelect, onClose, initial }: Props) {
  const mapElRef  = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const [address,  setAddress]  = useState('')
  const [coords,   setCoords]   = useState(initial || { lat: 41.2995, lng: 69.2401 })
  const [loading,  setLoading]  = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link  = document.createElement('link')
      link.id     = 'leaflet-css'
      link.rel    = 'stylesheet'
      link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      if ((window as any).L) { initLeaflet(); return }
      const script  = document.createElement('script')
      script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = initLeaflet
      document.head.appendChild(script)
    }

    const t = setTimeout(loadLeaflet, 100)
    return () => clearTimeout(t)
  }, [])

  function initLeaflet() {
    if (!mapElRef.current || mapRef.current) return
    const L   = (window as any).L
    const map = L.map(mapElRef.current, { zoomControl: true }).setView(
      [coords.lat, coords.lng], 15
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    // Custom pin icon
    const icon = L.divIcon({
      html: '<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">📍</div>',
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    })

    const marker = L.marker([coords.lat, coords.lng], { icon, draggable: true }).addTo(map)
    mapRef.current    = map
    markerRef.current = marker
    setMapReady(true)

    const onPick = async (lat: number, lng: number) => {
      marker.setLatLng([lat, lng])
      setCoords({ lat, lng })
      setLoading(true)
      const addr = await reverseGeocode(lat, lng)
      setAddress(addr)
      setLoading(false)
    }

    map.on('click', (e: any) => onPick(e.latlng.lat, e.latlng.lng))
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      onPick(pos.lat, pos.lng)
    })

    // Initial address
    if (initial) {
      reverseGeocode(initial.lat, initial.lng).then(setAddress)
    }
  }

  const detectGPS = () => {
    setGpsLoading(true)
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const L   = (window as any).L
        if (mapRef.current && L) {
          mapRef.current.setView([lat, lng], 16)
          markerRef.current?.setLatLng([lat, lng])
        }
        setCoords({ lat, lng })
        setLoading(true)
        setGpsLoading(false)
        const addr = await reverseGeocode(lat, lng)
        setAddress(addr)
        setLoading(false)
      },
      () => {
        setGpsLoading(false)
        alert('GPS ruxsat berilmagan. Telefoningiz sozlamalaridan joylashuvga ruxsat bering.')
      },
      { timeout: 10000 }
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: 'var(--surface)',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--surface-2)', border: 'none',
          color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize: 18, color: 'var(--text-primary)' }}>
            Manzilni tanlang
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Xaritaga bosing yoki pini torting
          </div>
        </div>
        {/* GPS button */}
        <button onClick={detectGPS} disabled={gpsLoading} style={{
          padding: '8px 12px', borderRadius: 10,
          background: gpsLoading ? 'var(--surface-2)' : 'var(--yellow)',
          border: 'none', color: gpsLoading ? 'var(--text-muted)' : '#1A1A1A',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: "var(--font-body)", whiteSpace: 'nowrap',
        }}>
          {gpsLoading ? '⏳' : '📡 Joyni aniqla'}
        </button>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapElRef} style={{ width: '100%', height: '100%' }} />

        {!mapReady && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#0d1f0d', gap: 12,
          }}>
            <div style={{ fontSize: 48 }}>🗺️</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>
              Xarita yuklanmoqda...
            </div>
          </div>
        )}

        {/* Address bubble */}
        {mapReady && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16, right: 16,
            background: 'var(--surface)', borderRadius: 14,
            padding: '10px 14px', fontSize: 13,
            color: loading ? 'var(--text-muted)' : 'var(--text-primary)',
            boxShadow: '0 4px 20px rgba(0,0,0,.3)',
            border: `1.5px solid ${address ? 'var(--yellow)' : 'var(--border)'}`,
            transition: 'border-color .2s',
          }}>
            {loading ? '📍 Manzil aniqlanmoqda...' : address || '👆 Xaritaga bosing'}
          </div>
        )}
      </div>

      {/* Confirm */}
      <div style={{
        padding: '12px 16px', background: 'var(--surface)',
        borderTop: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button
          disabled={!address || loading}
          onClick={() => address && onSelect(address, coords)}
          style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: (address && !loading) ? '#F5C800' : 'var(--surface-2)',
            border: 'none',
            color: (address && !loading) ? '#1A1A1A' : 'var(--text-muted)',
            fontSize: 15, fontWeight: 700,
            cursor: address ? 'pointer' : 'not-allowed',
            fontFamily: "var(--font-body)",
          }}
        >
          ✅ Shu manzilni tanlash
        </button>
      </div>
    </div>
  )
}

export default function MapPicker(props: Props) {
  return createPortal(<MapPickerContent {...props} />, document.body)
}
