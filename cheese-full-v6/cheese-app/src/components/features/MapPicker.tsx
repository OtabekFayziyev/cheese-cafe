import React, { useState, useEffect, useRef } from 'react'

const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''

interface Props {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void
  onClose:  () => void
  initial?: { lat: number; lng: number }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
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

declare global { interface Window { google: any; initMap: () => void } }

export default function MapPicker({ onSelect, onClose, initial }: Props) {
  const mapRef    = useRef<HTMLDivElement>(null)
  const gMapRef   = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const [address, setAddress] = useState('')
  const [coords,  setCoords]  = useState(initial || { lat: 41.2995, lng: 69.2401 })
  const [loading, setLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    // Load Google Maps script
    if (window.google?.maps) { initMap(); return }

    window.initMap = initMap
    const existing = document.getElementById('gmap-script')
    if (!existing) {
      const script  = document.createElement('script')
      script.id     = 'gmap-script'
      script.src    = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initMap&language=uz`
      script.async  = true
      script.defer  = true
      document.head.appendChild(script)
    }

    return () => { window.initMap = () => {} }
  }, [])

  function initMap() {
    if (!mapRef.current) return
    const center = coords
    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      disableDefaultUI:  true,
      zoomControl:       true,
      gestureHandling:   'greedy',
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    })
    const marker = new window.google.maps.Marker({
      position: center,
      map,
      draggable: true,
    })
    gMapRef.current   = map
    markerRef.current = marker
    setMapReady(true)

    // Click on map
    map.addListener('click', async (e: any) => {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      marker.setPosition({ lat, lng })
      setCoords({ lat, lng })
      setLoading(true)
      const addr = await reverseGeocode(lat, lng)
      setAddress(addr)
      setLoading(false)
    })

    // Drag marker
    marker.addListener('dragend', async () => {
      const pos = marker.getPosition()
      const lat = pos.lat()
      const lng = pos.lng()
      setCoords({ lat, lng })
      setLoading(true)
      const addr = await reverseGeocode(lat, lng)
      setAddress(addr)
      setLoading(false)
    })

    // Initial geocode if from GPS
    if (initial) {
      reverseGeocode(initial.lat, initial.lng).then(addr => {
        setAddress(addr)
      })
    }
  }

  const handleConfirm = () => {
    if (address) onSelect(address, coords)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--surface-2)', border: 'none',
          color: 'var(--text-primary)', fontSize: 20,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
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

      {/* Map container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {!mapReady && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', gap: 12,
          }}>
            <div style={{ fontSize: 40 }}>🗺️</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Xarita yuklanmoqda...</div>
          </div>
        )}

        {/* Address bubble */}
        {mapReady && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16, right: 16,
            background: 'var(--surface)',
            borderRadius: 14, padding: '10px 14px',
            fontSize: 13, color: loading ? 'var(--text-muted)' : 'var(--text-primary)',
            boxShadow: '0 4px 20px rgba(0,0,0,.25)',
            border: '1.5px solid var(--border)',
          }}>
            {loading
              ? '📍 Manzil aniqlanmoqda...'
              : address || '👆 Manzilni belgilash uchun xaritaga bosing'}
          </div>
        )}
      </div>

      {/* Confirm */}
      <div style={{ padding: '12px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <button
          disabled={!address || loading}
          onClick={handleConfirm}
          style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: address && !loading ? 'var(--yellow)' : 'var(--surface-2)',
            border: 'none',
            color: address && !loading ? '#1A1A1A' : 'var(--text-muted)',
            fontSize: 15, fontWeight: 700,
            cursor: address ? 'pointer' : 'not-allowed',
            fontFamily: "var(--font-body)",
            transition: 'all .2s',
          }}
        >
          ✅ Shu manzilni tanlash
        </button>
      </div>
    </div>
  )
}
