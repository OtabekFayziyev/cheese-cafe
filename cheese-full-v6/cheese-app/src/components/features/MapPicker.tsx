import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''

interface Props {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void
  onClose:  () => void
  initial?: { lat: number; lng: number }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!MAPS_KEY) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  try {
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}&language=uz`
    )
    const data = await res.json()
    if (data.status === 'OK' && data.results[0]) {
      return data.results[0].formatted_address
    }
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

declare global { interface Window { google: any; __initGMap: () => void } }

function MapPickerContent({ onSelect, onClose, initial }: Props) {
  const mapRef    = useRef<HTMLDivElement>(null)
  const gMapRef   = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const [address, setAddress] = useState('')
  const [coords,  setCoords]  = useState(initial || { lat: 41.2995, lng: 69.2401 })
  const [loading, setLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  function initMap() {
    if (!mapRef.current || !window.google?.maps) return
    const map = new window.google.maps.Map(mapRef.current, {
      center:          coords,
      zoom:            15,
      disableDefaultUI: true,
      zoomControl:     true,
      gestureHandling: 'greedy',
    })
    const marker = new window.google.maps.Marker({
      position: coords,
      map,
      draggable: true,
    })
    gMapRef.current   = map
    markerRef.current = marker
    setMapReady(true)

    const onPick = async (lat: number, lng: number) => {
      marker.setPosition({ lat, lng })
      setCoords({ lat, lng })
      setLoading(true)
      const addr = await reverseGeocode(lat, lng)
      setAddress(addr)
      setLoading(false)
    }

    map.addListener('click', (e: any) => onPick(e.latLng.lat(), e.latLng.lng()))
    marker.addListener('dragend', () => {
      const p = marker.getPosition()
      onPick(p.lat(), p.lng())
    })

    if (initial) {
      reverseGeocode(initial.lat, initial.lng).then(setAddress)
    }
  }

  useEffect(() => {
    if (window.google?.maps) {
      setTimeout(initMap, 100)
      return
    }
    window.__initGMap = initMap
    if (!document.getElementById('gmap-script')) {
      const s   = document.createElement('script')
      s.id      = 'gmap-script'
      s.src     = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=__initGMap&language=uz`
      s.async   = true
      s.defer   = true
      document.head.appendChild(s)
    } else {
      // Script loading, wait
      const check = setInterval(() => {
        if (window.google?.maps) { clearInterval(check); initMap() }
      }, 300)
      setTimeout(() => clearInterval(check), 10000)
    }
  }, [])

  const handleConfirm = () => {
    if (address && !loading) onSelect(address, coords)
  }

  return (
    <div style={{
      position:   'fixed',
      top:        0, left: 0, right: 0, bottom: 0,
      zIndex:     9999,
      background: 'var(--bg)',
      display:    'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding:    '12px 16px',
        background: 'var(--surface)',
        display:    'flex',
        alignItems: 'center',
        gap:        12,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--surface-2)', border: 'none',
          color: 'var(--text-primary)', fontSize: 20,
          cursor: 'pointer',
        }}>←</button>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontSize: 18, color: 'var(--text-primary)' }}>
            Manzilni tanlang
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Xaritaga bosing yoki pini torting
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {!mapReady && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#1a3a2a', gap: 12,
          }}>
            <div style={{ fontSize: 48 }}>🗺️</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)' }}>Xarita yuklanmoqda...</div>
          </div>
        )}

        {mapReady && (
          <div style={{
            position:   'absolute',
            bottom:     16, left: 16, right: 16,
            background: 'var(--surface)',
            borderRadius: 14, padding: '10px 14px',
            fontSize: 13,
            color: loading ? 'var(--text-muted)' : 'var(--text-primary)',
            boxShadow: '0 4px 20px rgba(0,0,0,.3)',
            border: '1.5px solid var(--border)',
          }}>
            {loading ? '📍 Manzil aniqlanmoqda...' : address || '👆 Xaritaga bosing'}
          </div>
        )}
      </div>

      {/* Confirm */}
      <div style={{
        padding:    '12px 16px',
        background: 'var(--surface)',
        borderTop:  '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button
          disabled={!address || loading}
          onClick={handleConfirm}
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
