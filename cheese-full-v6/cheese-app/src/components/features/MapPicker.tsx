import React, { useState, useRef, useEffect } from 'react'
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
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}&language=uz`
    )
    const data = await res.json()
    if (data.status === 'OK' && data.results[0]) {
      return data.results[0].formatted_address
    }
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

function MapPickerContent({ onSelect, onClose, initial }: Props) {
  const center  = initial || { lat: 41.2995, lng: 69.2401 }
  const [coords,     setCoords]     = useState(center)
  const [address,    setAddress]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [mapLat,     setMapLat]     = useState(center.lat)
  const [mapLng,     setMapLng]     = useState(center.lng)
  const [zoom,       setZoom]       = useState(15)

  // Embed URL — updates when coords change
  const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${MAPS_KEY}&center=${mapLat},${mapLng}&zoom=${zoom}&maptype=roadmap`

  // Auto-geocode initial position
  useEffect(() => {
    if (initial) {
      reverseGeocode(initial.lat, initial.lng).then(setAddress)
    }
  }, [])

  const detectGPS = () => {
    if (!navigator.geolocation) { alert('GPS mavjud emas'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        setMapLat(lat)
        setMapLng(lng)
        setZoom(17)
        setGpsLoading(false)
        setLoading(true)
        const addr = await reverseGeocode(lat, lng)
        setAddress(addr)
        setLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === 1) alert('GPS ruxsat berilmagan. Sozlamalarda joylashuvga ruxsat bering.')
        else alert('GPS xatosi. Qayta urining.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const handleUseCurrentView = async () => {
    setLoading(true)
    const addr = await reverseGeocode(mapLat, mapLng)
    setAddress(addr)
    setCoords({ lat: mapLat, lng: mapLng })
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--surface-2)', border: 'none',
          color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: 'var(--text-primary)' }}>
            Manzilni tanlang
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            GPS yoki qo'lda kiriting
          </div>
        </div>
        <button onClick={detectGPS} disabled={gpsLoading} style={{
          padding: '7px 12px', borderRadius: 10,
          background: gpsLoading ? 'var(--surface-2)' : '#F5C800',
          border: 'none', color: gpsLoading ? 'var(--text-muted)' : '#1A1A1A',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: "var(--font-body)", whiteSpace: 'nowrap',
        }}>
          {gpsLoading ? '⏳' : '📡 GPS'}
        </button>
      </div>

      {/* Map iframe */}
      <div style={{ flex: 1, position: 'relative', background: '#1a2a1a' }}>
        <iframe
          key={`${mapLat}-${mapLng}-${zoom}`}
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Center crosshair */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -100%)',
          fontSize: 32, pointerEvents: 'none',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.5))',
        }}>📍</div>

        {/* Use this location button */}
        <button onClick={handleUseCurrentView} style={{
          position: 'absolute', top: 12, right: 12,
          padding: '8px 14px', borderRadius: 10,
          background: '#1A1A1A', border: '2px solid #F5C800',
          color: '#F5C800', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: "var(--font-body)",
        }}>
          📍 Shu joyni tanlash
        </button>

        {/* Address display */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16, right: 16,
          background: 'rgba(0,0,0,.85)', borderRadius: 14,
          padding: '10px 14px', fontSize: 13,
          color: loading ? 'rgba(255,255,255,.5)' : '#fff',
          backdropFilter: 'blur(8px)',
          border: `1.5px solid ${address ? '#F5C800' : 'rgba(255,255,255,.2)'}`,
        }}>
          {loading ? '📍 Manzil aniqlanmoqda...' : address || '👆 "Shu joyni tanlash" ni bosing'}
        </div>
      </div>

      {/* Manual address input */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Yoki manzilni qo'lda kiriting..."
          style={{
            width: '100%', padding: '10px 14px',
            borderRadius: 12, background: 'var(--surface-2)',
            border: '1.5px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 14,
            fontFamily: "var(--font-body)",
            outline: 'none', boxSizing: 'border-box',
            marginBottom: 10,
          }}
        />
        <button
          disabled={!address || loading}
          onClick={() => address && !loading && onSelect(address, coords)}
          style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: (address && !loading) ? '#F5C800' : 'var(--surface-2)',
            border: 'none',
            color: (address && !loading) ? '#1A1A1A' : 'var(--text-muted)',
            fontSize: 15, fontWeight: 700,
            cursor: (address && !loading) ? 'pointer' : 'not-allowed',
            fontFamily: "var(--font-body)",
          }}
        >
          ✅ Shu manzilni tasdiqlash
        </button>
      </div>
    </div>
  )
}

export default function MapPicker(props: Props) {
  if (typeof document === 'undefined') return null
  return createPortal(<MapPickerContent {...props} />, document.body)
}
