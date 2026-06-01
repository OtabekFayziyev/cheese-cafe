import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''

interface Props {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void
  onClose:  () => void
  initial?: { lat: number; lng: number }
}

const CAFE_CENTER = { lat: 38.853373, lng: 65.788965 }

// ── Dark premium map style ──
const MAP_STYLE = [
  { elementType: 'geometry',                                stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke',                      stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill',                        stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road',          elementType: 'geometry',  stylers: [{ color: '#2d2d44' }] },
  { featureType: 'road.arterial', elementType: 'geometry',  stylers: [{ color: '#373756' }] },
  { featureType: 'road.highway',  elementType: 'geometry',  stylers: [{ color: '#3f3f5c' }] },
  { featureType: 'road.highway',  elementType: 'geometry.stroke', stylers: [{ color: '#F5C800' }, { weight: 0.5 }, { lightness: -60 }] },
  { featureType: 'water',         elementType: 'geometry',  stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'water',         elementType: 'labels.text.fill', stylers: [{ color: '#4e6d8c' }] },
  { featureType: 'landscape',     elementType: 'geometry',  stylers: [{ color: '#1f1f35' }] },
  { featureType: 'poi',           stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',       stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#F5C800' }, { weight: 0.3 }, { lightness: -60 }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d1d5db' }] },
]

// ── Red animated pin HTML ──
const PIN_HTML = `
<div style="position:relative;width:44px;height:56px;cursor:grab">
  <svg width="44" height="56" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg"
    style="filter:drop-shadow(0 6px 12px rgba(239,68,68,.5))">
    <path d="M22 0C9.85 0 0 9.85 0 22c0 16.5 22 34 22 34S44 38.5 44 22C44 9.85 34.15 0 22 0z"
      fill="#EF4444"/>
    <circle cx="22" cy="22" r="10" fill="white"/>
    <circle cx="22" cy="22" r="6" fill="#EF4444"/>
  </svg>
  <div style="
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%);
    width:44px;height:44px;border-radius:50%;
    border:2px solid rgba(239,68,68,.4);
    animation:mapPinPulse 2s ease-out infinite;
  "/>
</div>
<style>
@keyframes mapPinPulse {
  0%   { transform:translate(-50%,-50%) scale(1); opacity:.8 }
  100% { transform:translate(-50%,-50%) scale(2.2); opacity:0 }
}
</style>`

// ── Singleton loader ──
let _gmLoaded  = false
let _gmLoading = false
const _queue: Array<(err?: Error) => void> = []

function loadGM(): Promise<void> {
  return new Promise((res, rej) => {
    if (_gmLoaded) { res(); return }
    _queue.push((e) => e ? rej(e) : res())
    if (_gmLoading) return
    _gmLoading = true

    if (!MAPS_KEY) {
      const e = new Error('VITE_GOOGLE_MAPS_API_KEY topilmadi')
      _queue.forEach(cb => cb(e)); _queue.length = 0; return
    }

    const s    = document.createElement('script')
    s.src      = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=maps,marker&language=uz&v=weekly`
    s.async    = true
    s.defer    = true
    s.onload   = () => {
      _gmLoaded  = true
      _gmLoading = false
      _queue.forEach(cb => cb())
      _queue.length = 0
    }
    s.onerror  = () => {
      _gmLoading = false
      const e = new Error('Google Maps skripti yuklanmadi')
      _queue.forEach(cb => cb(e)); _queue.length = 0
    }
    document.head.appendChild(s)
  })
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const g = (window as any).google
  if (!g?.maps?.Geocoder) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  try {
    const result = await new g.maps.Geocoder().geocode({ location: { lat, lng } })
    if (result?.results?.[0]?.formatted_address) {
      return result.results[0].formatted_address
    }
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

// ── Main content ──
function MapContent({ onSelect, onClose, initial }: Props) {
  const mapDiv    = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const mounted   = useRef(true)

  const start = initial ?? CAFE_CENTER

  const [coords,  setCoords]  = useState(start)
  const [address, setAddress] = useState('')
  const [addrBusy,setAddrBusy]= useState(false)
  const [gpsBusy, setGpsBusy] = useState(false)
  const [mapReady,setMapReady] = useState(false)
  const [mapErr,  setMapErr]  = useState('')

  useEffect(() => {
    mounted.current = true
    document.body.style.overflow = 'hidden'
    return () => {
      mounted.current = false
      document.body.style.overflow = ''
    }
  }, [])

  // ── Init map ──
  useEffect(() => {
    loadGM()
      .then(async () => {
        if (!mounted.current || !mapDiv.current) return
        const g = (window as any).google

        const map = new g.maps.Map(mapDiv.current, {
          center:             start,
          zoom:               15,
          disableDefaultUI:   true,
          zoomControl:        true,
          zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_CENTER },
          gestureHandling:    'greedy',
          mapTypeId:          'roadmap',
          styles:             MAP_STYLE,
        })

        // ── Marker ──
        let marker: any
        const AME = g.maps.marker?.AdvancedMarkerElement

        if (AME) {
          const el = document.createElement('div')
          el.innerHTML = PIN_HTML
          marker = new AME({ map, position: start, content: el, gmpDraggable: true })
          marker.addListener('dragend', () => onPick(marker.position.lat, marker.position.lng))
        } else {
          marker = new g.maps.Marker({
            map,
            position:  start,
            draggable: true,
            icon: {
              url: `data:image/svg+xml;utf8,${encodeURIComponent(
                `<svg width="44" height="56" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 0C9.85 0 0 9.85 0 22c0 16.5 22 34 22 34S44 38.5 44 22C44 9.85 34.15 0 22 0z" fill="#EF4444"/>
                  <circle cx="22" cy="22" r="10" fill="white"/>
                  <circle cx="22" cy="22" r="6" fill="#EF4444"/>
                </svg>`
              )}`,
              scaledSize: new g.maps.Size(44, 56),
              anchor:     new g.maps.Point(22, 56),
            },
          })
          marker.addListener('dragend', () => {
            const p = marker.getPosition()
            onPick(p.lat(), p.lng())
          })
        }

        map.addListener('click', (e: any) => {
          const lat = e.latLng.lat()
          const lng = e.latLng.lng()
          if (AME) marker.position = { lat, lng }
          else      marker.setPosition({ lat, lng })
          onPick(lat, lng)
        })

        mapRef.current    = map
        markerRef.current = { marker, isAdvanced: !!AME }
        if (mounted.current) setMapReady(true)

        // Initial address
        if (initial) {
          setAddrBusy(true)
          reverseGeocode(initial.lat, initial.lng).then(a => {
            if (mounted.current) { setAddress(a); setAddrBusy(false) }
          })
        }
      })
      .catch(e => { if (mounted.current) setMapErr(e.message) })
  }, [])

  const onPick = async (lat: number, lng: number) => {
    if (!mounted.current) return
    setCoords({ lat, lng })
    setAddrBusy(true)
    const a = await reverseGeocode(lat, lng)
    if (mounted.current) { setAddress(a); setAddrBusy(false) }
  }

  const moveTo = (lat: number, lng: number) => {
    const m = markerRef.current
    const map = mapRef.current
    if (!m || !map) return
    if (m.isAdvanced) m.marker.position = { lat, lng }
    else              m.marker.setPosition({ lat, lng })
    map.panTo({ lat, lng })
    map.setZoom(17)
    onPick(lat, lng)
  }

  const gps = () => {
    if (!navigator.geolocation) { alert('GPS mavjud emas'); return }
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(
      p  => { setGpsBusy(false); moveTo(p.coords.latitude, p.coords.longitude) },
      err => {
        setGpsBusy(false)
        alert(err.code === 1 ? 'GPS ruxsat yo\'q. Sozlamalardan ruxsat bering.' : 'GPS xatosi.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const canConfirm = address.trim().length > 0 && !addrBusy

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:2147483647,
      display:'flex', flexDirection:'column',
      background:'#111', fontFamily:"'Plus Jakarta Sans',sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'12px 16px', background:'#1C1C1C',
        borderBottom:'1px solid #2a2a2a', flexShrink:0,
      }}>
        <button onClick={onClose} style={{
          width:36, height:36, borderRadius:'50%',
          background:'#2a2a2a', border:'none', color:'#fff',
          fontSize:20, cursor:'pointer', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>←</button>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontFamily:"'Bebas Neue',sans-serif",
            fontSize:18, color:'#fff', lineHeight:1,
          }}>Manzilni tanlang</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 }}>
            Xaritaga bosing yoki pini torting
          </div>
        </div>

        <button onClick={gps} disabled={gpsBusy} style={{
          padding:'8px 14px', borderRadius:10, flexShrink:0,
          background: gpsBusy ? '#2a2a2a' : '#F5C800',
          border:'none',
          color: gpsBusy ? '#555' : '#1A1A1A',
          fontSize:12, fontWeight:700,
          cursor: gpsBusy ? 'not-allowed' : 'pointer',
          whiteSpace:'nowrap',
        }}>
          {gpsBusy ? '⏳' : '📡 GPS'}
        </button>
      </div>

      {/* ── Map ── */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <div ref={mapDiv} style={{ width:'100%', height:'100%' }} />

        {/* Loading */}
        {!mapReady && !mapErr && (
          <div style={{
            position:'absolute', inset:0, zIndex:10,
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            background:'#0d1117', gap:14,
          }}>
            <div style={{ fontSize:52 }}>🗺️</div>
            <div style={{ color:'rgba(255,255,255,.55)', fontSize:14 }}>
              Google Maps yuklanmoqda...
            </div>
          </div>
        )}

        {/* Error */}
        {mapErr && (
          <div style={{
            position:'absolute', inset:0, zIndex:10,
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            background:'#1a0d0d', gap:12, padding:24,
          }}>
            <div style={{ fontSize:44 }}>⚠️</div>
            <div style={{ color:'#f87171', fontSize:13, textAlign:'center', lineHeight:1.5 }}>
              {mapErr}
            </div>
            <button onClick={onClose} style={{
              padding:'10px 24px', borderRadius:10,
              background:'#2a2a2a', border:'1.5px solid #444',
              color:'#fff', fontSize:14, cursor:'pointer',
            }}>Yopish</button>
          </div>
        )}

        {/* Floating address bar */}
        {mapReady && (
          <div style={{
            position:'absolute', bottom:14, left:14, right:14, zIndex:10,
            background:'rgba(17,17,17,.92)', borderRadius:14,
            padding:'10px 14px', fontSize:13,
            color: addrBusy ? 'rgba(255,255,255,.35)' : '#fff',
            border:`1.5px solid ${address && !addrBusy ? '#F5C800' : 'rgba(255,255,255,.1)'}`,
            backdropFilter:'blur(10px)',
            transition:'border-color .3s',
            pointerEvents:'none',
            display:'flex', alignItems:'center', gap:8,
          }}>
            <span style={{ fontSize:16, flexShrink:0 }}>
              {addrBusy ? '⏳' : address ? '📍' : '👆'}
            </span>
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {addrBusy ? 'Manzil aniqlanmoqda...' : address || 'Xaritaga bosing'}
            </span>
          </div>
        )}
      </div>

      {/* ── Bottom panel ── */}
      <div style={{
        padding:'12px 16px 20px', background:'#1C1C1C',
        borderTop:'1px solid #2a2a2a', flexShrink:0,
      }}>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Yoki manzilni qo'lda kiriting..."
          style={{
            width:'100%', padding:'10px 14px', borderRadius:12,
            background:'#252525', border:'1.5px solid #333',
            color:'#fff', fontSize:14, outline:'none',
            boxSizing:'border-box', marginBottom:10,
            fontFamily:'inherit',
          }}
        />
        <button
          disabled={!canConfirm}
          onClick={() => canConfirm && onSelect(address.trim(), coords)}
          style={{
            width:'100%', padding:14, borderRadius:14,
            background: canConfirm ? '#F5C800' : '#252525',
            border:'none',
            color: canConfirm ? '#1A1A1A' : 'rgba(255,255,255,.2)',
            fontSize:15, fontWeight:700,
            cursor: canConfirm ? 'pointer' : 'not-allowed',
            fontFamily:'inherit', transition:'all .2s',
          }}
        >
          ✅ Tasdiqlash
        </button>
      </div>
    </div>
  )
}

// ── Portal wrapper ──
export default function MapPicker(props: Props) {
  const [el, setEl] = useState<Element | null>(null)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setEl(document.getElementById('root') || document.body)
    }
  }, [])
  if (!el) return null
  return createPortal(<MapContent {...props} />, el)
}