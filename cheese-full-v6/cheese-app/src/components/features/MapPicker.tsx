import React, { useState, useCallback, useRef } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

const MAPS_KEY   = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''
const TASHKENT   = { lat: 41.2995, lng: 69.2401 }
const MAP_STYLE  = { width: '100%', height: '100%' }
const LIBRARIES: any[] = ['places']

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

export default function MapPicker({ onSelect, onClose, initial }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: MAPS_KEY,
    libraries: LIBRARIES,
  })

  const [marker, setMarker]   = useState(initial || TASHKENT)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const mapRef = useRef<google.maps.Map>()

  const handleClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setMarker({ lat, lng })
    setLoading(true)
    const addr = await reverseGeocode(lat, lng)
    setAddress(addr)
    setLoading(false)
  }, [])

  const handleConfirm = () => {
    if (address) onSelect(address, marker)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', background: 'var(--surface)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--surface-2)', border: 'none',
          color: 'var(--text-primary)', fontSize: 18, cursor: 'pointer',
        }}>←</button>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: 'var(--text-primary)' }}>
            Manzilni tanlang
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Xaritaga bosing
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_STYLE}
            center={marker}
            zoom={15}
            onClick={handleClick}
            onLoad={map => { mapRef.current = map }}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
            }}
          >
            <Marker position={marker} />
          </GoogleMap>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Xarita yuklanmoqda...
          </div>
        )}

        {/* Center pin hint */}
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', borderRadius: 12, padding: '10px 16px',
          fontSize: 13, color: 'var(--text-primary)', maxWidth: '85%', textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,.3)',
        }}>
          {loading ? '📍 Manzil aniqlanmoqda...' : address || '👆 Manzilni belgilash uchun bosing'}
        </div>
      </div>

      {/* Confirm button */}
      <div style={{ padding: '12px 16px', background: 'var(--surface)' }}>
        <button
          disabled={!address || loading}
          onClick={handleConfirm}
          style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: address ? 'var(--yellow)' : 'var(--surface-2)',
            border: 'none', color: address ? '#1A1A1A' : 'var(--text-muted)',
            fontSize: 15, fontWeight: 700, cursor: address ? 'pointer' : 'not-allowed',
            fontFamily: "var(--font-body)",
          }}
        >
          ✅ Shu manzilni tanlash
        </button>
      </div>
    </div>
  )
}
