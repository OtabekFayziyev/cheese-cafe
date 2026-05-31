import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Loader } from '@googlemaps/js-api-loader'

const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''

const loader = new Loader({
  apiKey:    MAPS_KEY,
  version:   'weekly',
  language:  'uz',
  libraries: ['maps', 'geocoding', 'marker'],
})

interface Props {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void
  onClose:  () => void
  initial?: { lat: number; lng: number }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    await loader.load()
    const geocoder = new google.maps.Geocoder()
    const result   = await geocoder.geocode({ location: { lat, lng } })
    if (result.results[0]) return result.results[0].formatted_address
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

function MapPickerContent({ onSelect, onClose, initial }: Props) {
  const mapElRef  = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)

  const center = initial || { lat: 41.2995, lng: 69.2401 }
  const [coords,     setCoords]     = useState(center)
  const [address,    setAddress]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [mapReady,   setMapReady]   = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    loader.load().then(() => {
      if (!mapElRef.current) return

      const map = new google.maps.Map(mapElRef.current, {
        center,
        zoom:             15,
        disableDefaultUI: true,
        zoomControl:      true,
        gestureHandling:  'greedy',
      })

      const marker = new google.maps.Marker({
        map,
        position:  center,
        draggable: true,
      })

      mapRef.current    = map
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

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) onPick(e.latLng.lat(), e.latLng.lng())
      })

      marker.addListener('dragend', () => {
        const pos = marker.getPosition()
        if (pos) onPick(pos.lat(), pos.lng())
      })

      if (initial) reverseGeocode(initial.lat, initial.lng).then(setAddress)

    }).catch(() => setError('Xarita yuklanmadi'))
  }, [])

  const detectGPS = () => {
    if (!navigator.geolocation) { alert('GPS mavjud emas'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        mapRef.current?.setCenter({ lat, lng })
        mapRef.current?.setZoom(17)
        markerRef.current?.setPosition({ lat, lng })
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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 2147483647, background: '#111',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: '#1C1C1C',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid #333', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#252525', border: 'none',
          color: '#fff', fontSize: 20, cursor: 'pointer',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 18, color: '#fff' }}>
            Manzilni tanlang
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
            Xaritaga bosing yoki pini torting
          </div>
        </div>
        <button onClick={detectGPS} disabled={gpsLoading} style={{
          padding: '8px 14px', borderRadius: 10,
          background: gpsLoading ? '#333' : '#F5C800',
          border: 'none', color: gpsLoading ? '#666' : '#1A1A1A',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          {gpsLoading ? '⏳' : '📡 GPS'}
        </button>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapElRef} style={{ width: '100%', height: '100%' }} />

        {!mapReady && !error && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#0d1a0d', gap: 12,
          }}>
            <div style={{ fontSize: 48 }}>🗺️</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>
              Xarita yuklanmoqda...
            </div>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#1a0d0d', gap: 12, padding: 20,
          }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div style={{ fontSize: 14, color: '#f87171', textAlign: 'center' }}>{error}</div>
          </div>
        )}

        {mapReady && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 10,
            background: 'rgba(0,0,0,.88)', borderRadius: 14, padding: '10px 14px',
            fontSize: 13, color: loading ? 'rgba(255,255,255,.4)' : '#fff',
            border: `1.5px solid ${address ? '#F5C800' : 'rgba(255,255,255,.15)'}`,
          }}>
            {loading ? '📍 Manzil aniqlanmoqda...' : address || '👆 Xaritaga bosing'}
          </div>
        )}
      </div>

      {/* Input + confirm */}
      <div style={{
        padding: '10px 16px 16px', background: '#1C1C1C',
        borderTop: '1px solid #333', flexShrink: 0,
      }}>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Yoki manzilni qo'lda kiriting..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 12,
            background: '#252525', border: '1.5px solid #333',
            color: '#fff', fontSize: 14, outline: 'none',
            boxSizing: 'border-box', marginBottom: 10,
          }}
        />
        <button
          disabled={!address || loading}
          onClick={() => address && !loading && onSelect(address, coords)}
          style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: (address && !loading) ? '#F5C800' : '#252525',
            border: 'none',
            color: (address && !loading) ? '#1A1A1A' : 'rgba(255,255,255,.3)',
            fontSize: 15, fontWeight: 700,
            cursor: (address && !loading) ? 'pointer' : 'not-allowed',
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
  return createPortal(<MapPickerContent {...props} />, el)
}
