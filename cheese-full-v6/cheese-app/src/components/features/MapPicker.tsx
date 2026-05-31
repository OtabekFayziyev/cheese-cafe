import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''
const DEFAULT  = { lat: 38.853373, lng: 65.788965 }

interface Props {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void
  onClose:  () => void
  initial?: { lat: number; lng: number }
}

// Reverse geocode — Nominatim primary, Google fallback
async function geocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'CheeseCafeApp/1.0' } }
    )
    const d = await res.json()
    if (d?.display_name) {
      return d.display_name.split(',').slice(0, 4).join(',').trim()
    }
  } catch {}
  if (MAPS_KEY) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}&language=uz`
      )
      const d = await res.json()
      if (d?.results?.[0]) return d.results[0].formatted_address
    } catch {}
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

// Inject Leaflet CSS once
function injectLeafletCSS() {
  if (typeof document === 'undefined') return
  if (document.getElementById('leaflet-css')) return
  const link = document.createElement('link')
  link.id    = 'leaflet-css'
  link.rel   = 'stylesheet'
  link.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

// Load Leaflet JS dynamically
function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    const win = window as any
    if (win.L) { resolve(win.L); return }
    if (document.getElementById('leaflet-js')) {
      // Already loading — wait
      const check = setInterval(() => {
        if (win.L) { clearInterval(check); resolve(win.L) }
      }, 50)
      setTimeout(() => { clearInterval(check); reject(new Error('Timeout')) }, 10000)
      return
    }
    const s    = document.createElement('script')
    s.id       = 'leaflet-js'
    s.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.onload   = () => resolve(win.L)
    s.onerror  = () => reject(new Error('Failed to load Leaflet'))
    document.head.appendChild(s)
  })
}

// SVG red pin — no bundler icon issues
const RED_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
  <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z" fill="#EF4444" stroke="#fff" stroke-width="2"/>
  <circle cx="16" cy="16" r="6" fill="white"/>
</svg>`

function MapContent({ onSelect, onClose, initial }: Props) {
  const mapDiv    = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const initDone  = useRef(false)

  const start = initial || DEFAULT

  const [coords,   setCoords]   = useState(start)
  const [address,  setAddress]  = useState('')
  const [addrLoad, setAddrLoad] = useState(false)
  const [gpsLoad,  setGpsLoad]  = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState('')

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Initialize map — only client side, only once
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (initDone.current) return
    initDone.current = true

    injectLeafletCSS()

    loadLeaflet()
      .then(L => {
        if (!mapDiv.current) return

        // Fix default icon paths (bundler bug)
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        const map = L.map(mapDiv.current, {
          center:             [start.lat, start.lng],
          zoom:               15,
          zoomControl:        true,
          attributionControl: false,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map)

        // Custom red pin
        const icon = L.divIcon({
          className: '',
          html:      RED_PIN_SVG,
          iconSize:  [32, 42],
          iconAnchor:[16, 42],
        })

        const marker = L.marker([start.lat, start.lng], {
          icon,
          draggable: true,
        }).addTo(map)

        mapRef.current    = map
        markerRef.current = marker
        setMapReady(true)

        const onPick = async (lat: number, lng: number) => {
          marker.setLatLng([lat, lng])
          setCoords({ lat, lng })
          setAddrLoad(true)
          const addr = await geocode(lat, lng)
          setAddress(addr)
          setAddrLoad(false)
        }

        map.on('click', (e: any) => {
          if (e?.latlng) onPick(e.latlng.lat, e.latlng.lng)
        })

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          if (pos) onPick(pos.lat, pos.lng)
        })

        // Initial address
        geocode(start.lat, start.lng).then(setAddress)
      })
      .catch(err => {
        setMapError('Xarita yuklanmadi: ' + err.message)
      })
  }, [])

  const detectGPS = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('GPS mavjud emas')
      return
    }
    setGpsLoad(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        setGpsLoad(false)
        if (mapRef.current)    mapRef.current.setView([lat, lng], 17)
        if (markerRef.current) markerRef.current.setLatLng([lat, lng])
        setAddrLoad(true)
        const addr = await geocode(lat, lng)
        setAddress(addr)
        setAddrLoad(false)
      },
      err => {
        setGpsLoad(false)
        if (err.code === 1) {
          alert('GPS ruxsat berilmagan. Sozlamalarda joylashuvga ruxsat bering.')
        } else {
          alert('GPS xatosi. Qayta urining.')
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return (
    <div style={{
      position:      'fixed',
      top:           0, left: 0, right: 0, bottom: 0,
      zIndex:        2147483647,
      display:       'flex',
      flexDirection: 'column',
      background:    '#111111',
      fontFamily:    "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '12px 16px',
        background:   '#1C1C1C',
        borderBottom: '1px solid #2a2a2a',
        flexShrink:   0,
      }}>
        <button
          onClick={onClose}
          style={{
            width:          36, height: 36,
            borderRadius:   '50%',
            background:     '#2a2a2a',
            border:         'none',
            color:          '#ffffff',
            fontSize:       20,
            cursor:         'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}
        >←</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize:   18,
            color:      '#ffffff',
            lineHeight: 1,
          }}>
            Manzilni tanlang
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
            Xaritaga bosing yoki pini torting
          </div>
        </div>

        <button
          onClick={detectGPS}
          disabled={gpsLoad}
          style={{
            padding:    '8px 14px',
            borderRadius: 10,
            background: gpsLoad ? '#2a2a2a' : '#F5C800',
            border:     'none',
            color:      gpsLoad ? '#555555' : '#1A1A1A',
            fontSize:   12,
            fontWeight: 700,
            cursor:     gpsLoad ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {gpsLoad ? '⏳' : '📡 GPS'}
        </button>
      </div>

      {/* Map container */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Leaflet mounts here */}
        <div
          ref={mapDiv}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Loading state */}
        {!mapReady && !mapError && (
          <div style={{
            position:       'absolute',
            inset:          0,
            zIndex:         20,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            background:     '#0d1a0d',
            gap:            14,
          }}>
            <div style={{ fontSize: 52 }}>🗺️</div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 14 }}>
              Xarita yuklanmoqda...
            </div>
          </div>
        )}

        {/* Error state */}
        {mapError && (
          <div style={{
            position:       'absolute',
            inset:          0,
            zIndex:         20,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            background:     '#1a0d0d',
            gap:            12,
            padding:        20,
          }}>
            <div style={{ fontSize: 44 }}>⚠️</div>
            <div style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>
              {mapError}
            </div>
            <button
              onClick={onClose}
              style={{
                padding:      '10px 24px',
                borderRadius: 10,
                background:   '#2a2a2a',
                border:       '1.5px solid #444',
                color:        '#fff',
                fontSize:     14,
                cursor:       'pointer',
              }}
            >Yopish</button>
          </div>
        )}

        {/* Address bubble */}
        {mapReady && (
          <div style={{
            position:       'absolute',
            bottom:         14, left: 14, right: 14,
            zIndex:         10,
            background:     'rgba(17,17,17,.93)',
            borderRadius:   14,
            padding:        '10px 14px',
            fontSize:       13,
            color:          addrLoad ? 'rgba(255,255,255,.35)' : '#ffffff',
            border:         `1.5px solid ${address ? '#F5C800' : 'rgba(255,255,255,.1)'}`,
            backdropFilter: 'blur(8px)',
            transition:     'border-color .3s',
            pointerEvents:  'none',
          }}>
            {addrLoad
              ? '📍 Manzil aniqlanmoqda...'
              : address || '👆 Xaritaga bosing'}
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div style={{
        padding:    '12px 16px 20px',
        background: '#1C1C1C',
        borderTop:  '1px solid #2a2a2a',
        flexShrink: 0,
      }}>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Yoki manzilni qo'lda kiriting..."
          style={{
            width:        '100%',
            padding:      '10px 14px',
            borderRadius: 12,
            background:   '#252525',
            border:       '1.5px solid #333333',
            color:        '#ffffff',
            fontSize:     14,
            outline:      'none',
            boxSizing:    'border-box',
            marginBottom: 10,
            fontFamily:   'inherit',
          }}
        />
        <button
          disabled={!address || addrLoad}
          onClick={() => {
            if (address && !addrLoad) onSelect(address, coords)
          }}
          style={{
            width:        '100%',
            padding:      14,
            borderRadius: 14,
            background:   (address && !addrLoad) ? '#F5C800' : '#252525',
            border:       'none',
            color:        (address && !addrLoad) ? '#1A1A1A' : 'rgba(255,255,255,.2)',
            fontSize:     15,
            fontWeight:   700,
            cursor:       (address && !addrLoad) ? 'pointer' : 'not-allowed',
            fontFamily:   'inherit',
            transition:   'all .2s',
          }}
        >
          ✅ Tasdiqlash
        </button>
      </div>
    </div>
  )
}

export default function MapPicker(props: Props) {
  const [container, setContainer] = useState<Element | null>(null)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setContainer(document.getElementById('root') || document.body)
    }
  }, [])

  if (!container) return null
  return createPortal(<MapContent {...props} />, container)
}
