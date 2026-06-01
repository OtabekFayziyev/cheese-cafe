import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''

interface Props {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void
  onClose:  () => void
  initial?: { lat: number; lng: number }
}

const CAFE = { lat: 38.853373, lng: 65.788965 }

// Load Google Maps once globally
let _mapsLoaded  = false
let _mapsLoading = false
const _callbacks: Array<() => void> = []

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (_mapsLoaded) { resolve(); return }
    _callbacks.push(resolve)
    if (_mapsLoading) return
    _mapsLoading = true

    const script   = document.createElement('script')
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=maps,geocoder&language=uz&v=weekly`
    script.async   = true
    script.defer   = true
    script.onload  = () => {
      _mapsLoaded  = true
      _mapsLoading = false
      _callbacks.forEach(cb => cb())
      _callbacks.length = 0
    }
    script.onerror = () => reject(new Error('Google Maps yuklanmadi'))
    document.head.appendChild(script)
  })
}

async function geocode(lat: number, lng: number): Promise<string> {
  const g   = (window as any).google
  if (!g)   return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  try {
    const geocoder = new g.maps.Geocoder()
    const res = await geocoder.geocode({ location: { lat, lng } })
    if (res.results?.[0]) return res.results[0].formatted_address
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

function MapContent({ onSelect, onClose, initial }: Props) {
  const mapDiv    = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const start = initial || CAFE

  const [coords,   setCoords]   = useState(start)
  const [address,  setAddress]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [gpsLoad,  setGpsLoad]  = useState(false)
  const [ready,    setReady]    = useState(false)
  const [error,    setError]    = useState('')

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Init Google Maps
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if (!mapDiv.current) return
        const g   = (window as any).google
        const map = new g.maps.Map(mapDiv.current, {
          center:           start,
          zoom:             15,
          disableDefaultUI: true,
          zoomControl:      true,
          gestureHandling:  'greedy',
          mapTypeId:        'roadmap',
          styles: [
            { featureType: 'all',        elementType: 'geometry',        stylers: [{ color: '#1a1a2e' }] },
            { featureType: 'all',        elementType: 'labels.text.fill',stylers: [{ color: '#ffffff' }] },
            { featureType: 'all',        elementType: 'labels.text.stroke',stylers:[{ color: '#000000' },{ lightness: 13 }] },
            { featureType: 'road',       elementType: 'geometry.fill',   stylers: [{ color: '#2a2a4a' }] },
            { featureType: 'road',       elementType: 'geometry.stroke', stylers: [{ color: '#F5C800' }, { lightness: -50 }, { weight: 0.4 }] },
            { featureType: 'water',      elementType: 'geometry',        stylers: [{ color: '#0d1b2a' }] },
            { featureType: 'poi',        elementType: 'all',             stylers: [{ visibility: 'off' }] },
            { featureType: 'transit',    elementType: 'all',             stylers: [{ visibility: 'off' }] },
            { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#F5C800' }, { lightness: -50 }] },
          ],
        })

        // Red pin SVG marker
        const markerEl   = document.createElement('div')
        markerEl.innerHTML = `
          <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"
            style="filter:drop-shadow(0 4px 8px rgba(0,0,0,.6));cursor:grab">
            <path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32S40 35 40 20C40 9 31 0 20 0z" fill="#EF4444"/>
            <circle cx="20" cy="20" r="9" fill="white"/>
            <circle cx="20" cy="20" r="6" fill="#EF4444"/>
          </svg>`
        markerEl.style.cssText = 'position:absolute;transform:translate(-50%,-100%);'

        const { AdvancedMarkerElement } = g.maps.marker || {}

        let marker: any
        if (AdvancedMarkerElement) {
          marker = new AdvancedMarkerElement({
            map,
            position:   start,
            content:    markerEl,
            gmpDraggable: true,
          })
          marker.addListener('dragend', async () => {
            const p = marker.position
            const c = { lat: p.lat, lng: p.lng }
            setCoords(c)
            setLoading(true)
            setAddress(await geocode(c.lat, c.lng))
            setLoading(false)
          })
        } else {
          // Fallback for older Maps API versions
          marker = new g.maps.Marker({
            map,
            position:  start,
            draggable: true,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32S40 35 40 20C40 9 31 0 20 0z" fill="#EF4444"/>
                  <circle cx="20" cy="20" r="9" fill="white"/>
                  <circle cx="20" cy="20" r="6" fill="#EF4444"/>
                </svg>`)}`,
              scaledSize: new g.maps.Size(40, 52),
              anchor:     new g.maps.Point(20, 52),
            },
          })
          marker.addListener('dragend', async () => {
            const p = marker.getPosition()
            const c = { lat: p.lat(), lng: p.lng() }
            setCoords(c)
            setLoading(true)
            setAddress(await geocode(c.lat, c.lng))
            setLoading(false)
          })
        }

        // Click on map
        map.addListener('click', async (e: any) => {
          const lat = e.latLng.lat()
          const lng = e.latLng.lng()
          const c   = { lat, lng }
          if (AdvancedMarkerElement && marker.position !== undefined) {
            marker.position = c
          } else {
            marker.setPosition(c)
          }
          setCoords(c)
          setLoading(true)
          setAddress(await geocode(lat, lng))
          setLoading(false)
        })

        mapRef.current    = map
        markerRef.current = marker
        setReady(true)

        // Initial geocode
        if (initial) {
          setLoading(true)
          geocode(initial.lat, initial.lng).then(a => { setAddress(a); setLoading(false) })
        }
      })
      .catch(e => setError(e.message))
  }, [])

  // GPS
  const detectGPS = () => {
    if (!navigator.geolocation) { alert('GPS mavjud emas'); return }
    setGpsLoad(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const c   = { lat, lng }
        setCoords(c)
        setGpsLoad(false)
        mapRef.current?.setCenter(c)
        mapRef.current?.setZoom(17)
        const g = (window as any).google
        if (markerRef.current) {
          if (g?.maps?.marker?.AdvancedMarkerElement) {
            markerRef.current.position = c
          } else {
            markerRef.current.setPosition(c)
          }
        }
        setLoading(true)
        setAddress(await geocode(lat, lng))
        setLoading(false)
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
          background: '#2a2a2a', border: 'none', color: '#fff',
          fontSize: 20, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18, color: '#fff', lineHeight: 1,
          }}>Manzilni tanlang</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
            Xaritaga bosing yoki pini torting
          </div>
        </div>

        <button onClick={detectGPS} disabled={gpsLoad} style={{
          padding: '8px 14px', borderRadius: 10, flexShrink: 0,
          background: gpsLoad ? '#2a2a2a' : '#F5C800',
          border: 'none', color: gpsLoad ? '#555' : '#1A1A1A',
          fontSize: 12, fontWeight: 700, cursor: gpsLoad ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}>
          {gpsLoad ? '⏳' : '📡 GPS'}
        </button>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={mapDiv} style={{ width: '100%', height: '100%' }} />

        {/* Loading */}
        {!ready && !error && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#0d1117', gap: 14,
          }}>
            <div style={{ fontSize: 52 }}>🗺️</div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 14 }}>
              Google Maps yuklanmoqda...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#1a0d0d', gap: 12, padding: 24,
          }}>
            <div style={{ fontSize: 44 }}>⚠️</div>
            <div style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>{error}</div>
            <button onClick={onClose} style={{
              padding: '10px 24px', borderRadius: 10,
              background: '#2a2a2a', border: '1.5px solid #444',
              color: '#fff', fontSize: 14, cursor: 'pointer',
            }}>Yopish</button>
          </div>
        )}

        {/* Address bubble */}
        {ready && (
          <div style={{
            position: 'absolute', bottom: 14, left: 14, right: 14, zIndex: 10,
            background: 'rgba(17,17,17,.93)', borderRadius: 14,
            padding: '10px 14px', fontSize: 13,
            color: loading ? 'rgba(255,255,255,.4)' : '#fff',
            border: `1.5px solid ${address && !loading ? '#F5C800' : 'rgba(255,255,255,.1)'}`,
            backdropFilter: 'blur(8px)',
            transition: 'border-color .3s',
            pointerEvents: 'none',
          }}>
            {loading ? '📍 Manzil aniqlanmoqda...' : address || '👆 Xaritaga bosing'}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{
        padding: '12px 16px 20px', background: '#1C1C1C',
        borderTop: '1px solid #2a2a2a', flexShrink: 0,
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
            fontFamily: 'inherit',
          }}
        />
        <button
          disabled={!address || loading}
          onClick={() => address && !loading && onSelect(address, coords)}
          style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: (address && !loading) ? '#F5C800' : '#252525',
            border: 'none',
            color: (address && !loading) ? '#1A1A1A' : 'rgba(255,255,255,.25)',
            fontSize: 15, fontWeight: 700,
            cursor: (address && !loading) ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all .2s',
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