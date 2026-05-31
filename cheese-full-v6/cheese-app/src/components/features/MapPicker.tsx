import React, { useState, useEffect } from 'react'
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

function MapPickerContent({ onSelect, onClose, initial }: Props) {
  const center = initial || { lat: 41.2995, lng: 69.2401 }
  const [coords,     setCoords]     = useState(center)
  const [address,    setAddress]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${MAPS_KEY}&center=${coords.lat},${coords.lng}&zoom=16&maptype=roadmap`

  useEffect(() => {
    if (initial) {
      reverseGeocode(initial.lat, initial.lng).then(setAddress)
    }
  }, [])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const detectGPS = () => {
    if (!navigator.geolocation) { alert('GPS mavjud emas'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        setGpsLoading(false)
        setLoading(true)
        const addr = await reverseGeocode(lat, lng)
        setAddress(addr)
        setLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        alert(err.code === 1
          ? 'GPS ruxsat berilmagan. Sozlamalarda joylashuvga ruxsat bering.'
          : 'GPS xatosi. Qayta urining.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const style: React.CSSProperties = {
    position:   'fixed',
    top:        0,
    left:       0,
    right:      0,
    bottom:     0,
    width:      '100%',
    height:     '100%',
    zIndex:     2147483647, // max z-index
    background: '#111',
    display:    'flex',
    flexDirection: 'column',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }

  return (
    <div style={style}>
      {/* Header */}
      <div style={{
        padding:      '12px 16px',
        background:   '#1C1C1C',
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        borderBottom: '1px solid #333',
        flexShrink:   0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#252525', border: 'none',
          color: '#fff', fontSize: 20, cursor: 'pointer',
          flexShrink: 0,
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 18, color: '#fff' }}>
            Manzilni tanlang
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
            GPS yoki qo'lda kiriting
          </div>
        </div>
        <button onClick={detectGPS} disabled={gpsLoading} style={{
          padding:    '8px 14px',
          borderRadius: 10,
          background: gpsLoading ? '#252525' : '#F5C800',
          border:     'none',
          color:      gpsLoading ? 'rgba(255,255,255,.4)' : '#1A1A1A',
          fontSize:   12,
          fontWeight: 700,
          cursor:     'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {gpsLoading ? '⏳' : '📡 GPS'}
        </button>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <iframe
          key={`${coords.lat}-${coords.lng}`}
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          allowFullScreen
          loading="lazy"
        />
        {/* Center pin */}
        <div style={{
          position:       'absolute',
          top:            '50%',
          left:           '50%',
          transform:      'translate(-50%, -100%)',
          fontSize:       36,
          pointerEvents:  'none',
          filter:         'drop-shadow(0 3px 6px rgba(0,0,0,.6))',
          marginTop:      -4,
        }}>📍</div>

        {/* Address bubble */}
        <div style={{
          position:   'absolute',
          bottom:     16,
          left:       16,
          right:      16,
          background: 'rgba(0,0,0,.88)',
          borderRadius: 14,
          padding:    '10px 14px',
          fontSize:   13,
          color:      loading ? 'rgba(255,255,255,.4)' : '#fff',
          border:     `1.5px solid ${address ? '#F5C800' : 'rgba(255,255,255,.15)'}`,
          backdropFilter: 'blur(8px)',
        }}>
          {loading
            ? '📍 Manzil aniqlanmoqda...'
            : address || '👆 GPS bosing yoki quyida manzil kiriting'}
        </div>
      </div>

      {/* Input + confirm */}
      <div style={{
        padding:    '10px 16px 16px',
        background: '#1C1C1C',
        borderTop:  '1px solid #333',
        flexShrink: 0,
      }}>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Ko'cha, uy raqami, mo'ljal..."
          style={{
            width:        '100%',
            padding:      '10px 14px',
            borderRadius: 12,
            background:   '#252525',
            border:       '1.5px solid #333',
            color:        '#fff',
            fontSize:     14,
            outline:      'none',
            boxSizing:    'border-box',
            marginBottom: 10,
          }}
        />
        <button
          disabled={!address || loading}
          onClick={() => address && !loading && onSelect(address, coords)}
          style={{
            width:        '100%',
            padding:      14,
            borderRadius: 14,
            background:   (address && !loading) ? '#F5C800' : '#252525',
            border:       'none',
            color:        (address && !loading) ? '#1A1A1A' : 'rgba(255,255,255,.3)',
            fontSize:     15,
            fontWeight:   700,
            cursor:       (address && !loading) ? 'pointer' : 'not-allowed',
          }}
        >
          ✅ Tasdiqlash
        </button>
      </div>
    </div>
  )
}

// Portal to #root element for Telegram compatibility
export default function MapPicker(props: Props) {
  const [container, setContainer] = useState<Element | null>(null)

  useEffect(() => {
    // Try #root first, then body
    const root = document.getElementById('root') || document.body
    setContainer(root)
  }, [])

  if (!container) return null
  return createPortal(<MapPickerContent {...props} />, container)
}
