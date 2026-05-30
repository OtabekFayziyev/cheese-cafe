import { useEffect, useState, useCallback, useRef } from 'react'
import { useCafeStore } from '@/store'

// ── Telegram WebApp hook ──
export function useTelegram() {
  const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null

  useEffect(() => {
    if (tg) {
      tg.ready()
      tg.expand()
    }
  }, [tg])

  // colorScheme: telegram dark/light
  const [colorScheme, setColorScheme] = useState<'light'|'dark'>(
    tg?.colorScheme ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )

  useEffect(() => {
    if (tg) {
      const handler = () => setColorScheme(tg.colorScheme ?? 'light')
      tg.onEvent?.('themeChanged', handler)
      return () => tg.offEvent?.('themeChanged', handler)
    } else {
      const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => setColorScheme(e.matches ? 'dark' : 'light')
      mq?.addEventListener('change', handler)
      return () => mq?.removeEventListener('change', handler)
    }
  }, [tg])

  return {
    tg,
    user: tg?.initDataUnsafe?.user ?? null,
    colorScheme,
    themeParams: tg?.themeParams ?? {},
    haptic: {
      light:   () => tg?.HapticFeedback?.impactOccurred('light'),
      medium:  () => tg?.HapticFeedback?.impactOccurred('medium'),
      heavy:   () => tg?.HapticFeedback?.impactOccurred('heavy'),
      success: () => tg?.HapticFeedback?.notificationOccurred('success'),
      error:   () => tg?.HapticFeedback?.notificationOccurred('error'),
      warning: () => tg?.HapticFeedback?.notificationOccurred('warning'),
    },
    showBackButton: (cb: () => void) => { tg?.BackButton?.show(); tg?.BackButton?.onClick(cb) },
    hideBackButton: () => { tg?.BackButton?.hide(); tg?.BackButton?.offClick() },
    close: () => tg?.close(),
  }
}

// ── Currency formatter ──
export function useFormat() {
  const fmt = useCallback((amount: number) =>
    amount.toLocaleString('uz-UZ') + ' so\'m', [])
  const fmtShort = useCallback((amount: number) => {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + ' mln'
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + ' k'
    return amount.toString()
  }, [])
  return { fmt, fmtShort }
}

// ── Work hours — UZB time (UTC+5), 09:00–05:00 ──
export function useWorkHours() {
  const { settings } = useCafeStore()
  const [backendIsOpen, setBackendIsOpen] = useState<boolean|null>(null)

  // Load isOpen from backend every 30s
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch((import.meta as any).env?.VITE_API_URL + '/api/settings' || '/api/settings')
        const data = await res.json()
        if (data?.data?.settings?.isOpen !== undefined) {
          const val = data.data.settings.isOpen === 'true' || data.data.settings.isOpen === true
          setBackendIsOpen(val)
        }
      } catch {}
    }
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const checkOpen = useCallback(() => {
    // Backend override takes priority
    if (backendIsOpen === false) return false
    if (backendIsOpen === true)  return true
    // UZB time = UTC + 5 hours
    const now = new Date()
    const uzbOffset = 5 * 60 // minutes
    const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes()
    const uzbMins = (utcMins + uzbOffset) % (24 * 60)

    const uzbDay = Math.floor((utcMins + uzbOffset) / (24 * 60)) % 7
    const day = (now.getUTCDay() + (utcMins + uzbOffset >= 24 * 60 ? 1 : 0)) % 7
    const hours = settings.workHours[day]
    if (!hours || hours.isOff) return false

    // 09:00 open, 05:00 next-day close → open range: 540..1740 (in minutes, wrapping)
    const [oh, om] = hours.open.split(':').map(Number)
    const [ch, cm] = hours.close.split(':').map(Number)
    const openMins  = oh * 60 + om           // 540
    let   closeMins = ch * 60 + cm           // 300
    if (closeMins <= openMins) closeMins += 24 * 60  // 300+1440=1740

    const cur = uzbMins < openMins ? uzbMins + 24 * 60 : uzbMins
    return cur >= openMins && cur < closeMins
  }, [settings])

  const [isOpen, setIsOpen] = useState(checkOpen())
  useEffect(() => {
    setIsOpen(checkOpen())
    const t = setInterval(() => setIsOpen(checkOpen()), 60_000)
    return () => clearInterval(t)
  }, [checkOpen, backendIsOpen])

  // UZB local day
  const now = new Date()
  const uzbHour = (now.getUTCHours() + 5) % 24
  const uzbDay  = now.getUTCDay() // close enough for display
  const todayHours = settings.workHours[uzbDay]

  return {
    isOpen,
    openTime:  todayHours?.open  ?? '09:00',
    closeTime: todayHours?.close ?? '05:00',
    isOff:     todayHours?.isOff ?? false,
  }
}

// ── Debounce ──
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── GPS Location with Google Geocoding ──
const MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!MAPS_KEY) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  try {
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}&language=uz`
    )
    const data = await res.json()
    if (data.status === 'OK' && data.results[0]) {
      return data.results[0].formatted_address
    }
  } catch {}
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

export function useLocation() {
  const [address, setAddress] = useState<string>('')
  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const detect = useCallback(() => {
    setLoading(true)
    if (!navigator.geolocation) {
      setAddress('')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        const addr = await reverseGeocode(lat, lng)
        setAddress(addr)
        setLoading(false)
      },
      () => { setAddress(''); setLoading(false) },
      { timeout: 8000, maximumAge: 30000 }
    )
  }, [])

  useEffect(() => { detect() }, [detect])
  return { address, coords, loading, reDetect: detect }
}

// ── Dark mode from Telegram ──
export function useColorScheme() {
  const { colorScheme } = useTelegram()
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorScheme)
  }, [colorScheme])
  return colorScheme
}

export { useMenuItems, useCategories, useCafeSettings } from './useMenu'
