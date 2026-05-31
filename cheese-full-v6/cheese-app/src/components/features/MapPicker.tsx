import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''

interface Props {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void
  onClose:  () => void
  initial?: { lat: number; lng: number }
}

// Load Google Maps script once
let mapsLoaded = false
let mapsLoading = false
const mapsCallbacks: (() => void)[] = []

function loadGoogleMaps(callback: () => void) {
  if (mapsLoaded) { callback(); return }
  mapsCallbacks.push(callback)
  if (mapsLoading) return
  mapsLoading = true

  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geocoder&language=uz&v=weekly`
  script.async = true
  script.defer = true
  script.onload = () => {
    mapsLoaded = true
    mapsLoading = false
    mapsCallbacks.forEach(cb => cb())
    mapsCallbacks.length = 0
  }
  script.onerror = () => {
    mapsLoading = false
  }
  document.head.appendChild(script)
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const geocoder = new (window as any).google.maps.Geocoder()
    const result = await geocoder.geocode({ location: { lat, lng } })
    if (result.results[0]) return result.results[0].formatted_address
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

function MapPickerContent({ onSelect, onClose, initial }: Props) {
  const mapElRef  = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const [address,    setAddress]    = useState('')
  const [coords,     setCoords]     = useState(initial || { lat: 41.2995, lng: 69.2401 })
  const [loading,    setLoading]    = useState(false)
  const [mapReady,   setMapReady]   = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    loadGoogleMaps(() => {
      if (!mapElRef.current) return
      const google = (window as any).google

      const map = new google.maps.Map(mapElRef.current, {
        center:           coords,
        zoom:             15,
        disableDefaultUI: true,
        zoomControl:      true,
        gestureHandling:  'greedy',
      })
      mapRef.current = map

      const marker = new google.maps.Marker({
        map,
        position:  coords,
        draggable: true,
      })
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

      map.addListener('click', (e: any) => {
        onPick(e.latLng.lat(), e.latLng.lng())
      })

      marker.addListener('dragend', () => {
        const pos = marker.getPosition()
        onPick(pos.lat(), pos.lng())
      })

      if (initial) {
        reverseGeocode(initial.lat, initial.lng).then(setAddress)
      }
    })
  }, [])

  const detectGPS = () => {
    if (!navigator.geolocation) {
      alert('Bu qurilmada GPS mavjud emas')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        mapRef.current?.setCenter({ lat, lng })
        mapRef.current?.setZoom(16)
        markerRef.current?.setPosition({ lat, lng })
        setCoords({ lat, lng })
        setLoading(true)
        setGpsLoading(false)
        const addr = await reverseGeocode(lat, lng)
        setAddress(addr)
        setLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === 1) {
          alert('GPS ruxsat berilmagan. Telefoningiz sozlamalarida joylashuvga ruxsat bering.')
        } else {
          alert('Joylashuvni aniqlashda xato. Qayta urining.')
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
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
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--border)', flexShrink: 0,
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
            Xaritaga bosing yoki pini torting
          </div>
        </div>
        <button onClick={detectGPS} disabled={gpsLoading} style={{
          padding: '7px 12px', borderRadius: 10,
          background: gpsLoading ? 'var(--surface-2)' : '#F5C800',
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

        {!mapReady && !error && (
          <div style={{
            position: 'absolute', inset: 0,
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

        {mapReady && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16, right: 16,
            background: 'var(--surface)', borderRadius: 14,
            padding: '10px 14px', fontSize: 13,
            color: loading ? 'var(--text-muted)' : 'var(--text-primary)',
            boxShadow: '0 4px 20px rgba(0,0,0,.3)',
            border: `1.5px solid ${address ? '#F5C800' : 'var(--border)'}`,
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
          ✅ Shu manzilni tanlash
        </button>
      </div>
    </div>
  )
}

export default function MapPicker(props: Props) {
  return createPortal(<MapPickerContent {...props} />, document.body)
}
