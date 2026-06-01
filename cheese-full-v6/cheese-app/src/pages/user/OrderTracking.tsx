import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, MessageCircle, MapPin,
  Clock, CheckCircle, ChefHat, Package,
  Truck, Star, RotateCcw
} from 'lucide-react'
import clsx from 'clsx'
import { useOrderStore } from '@/store'
import { ordersAPI } from '@/api/client'
import { useOrderSocket } from '@/hooks/useSocket'
import { useFormat, useTelegram } from '@/hooks'
import { AppShell } from '@/components/layout/AppShell'
import type { OrderStatus } from '@/types'
import styles from './OrderTracking.module.css'

const STATUS_STEPS: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'pending',    label: 'Qabul kutilmoqda', icon: <Clock size={18} /> },
  { key: 'accepted',   label: 'Qabul qilindi',    icon: <CheckCircle size={18} /> },
  { key: 'preparing',  label: 'Tayyorlanmoqda',   icon: <ChefHat size={18} /> },
  { key: 'ready',      label: 'Tayyor',            icon: <Package size={18} /> },
  { key: 'on_the_way', label: "Yo'lda",            icon: <Truck size={18} /> },
  { key: 'delivered',  label: 'Yetkazildi',        icon: <CheckCircle size={18} /> },
]

const STATUS_ORDER = STATUS_STEPS.map(s => s.key)

function useElapsed(date?: string) {
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!date) return
    const calc = () => {
      const diff = Date.now() - new Date(date).getTime()
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(m > 0 ? `${m} daqiqa ${s} soniya` : `${s} soniya`)
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [date])
  return elapsed
}

export default function OrderTracking() {
  const navigate       = useNavigate()
  const { fmt }        = useFormat()
  const { haptic }     = useTelegram()
  const activeOrder    = useOrderStore(s => s.activeOrder)
  const orderHistory   = useOrderStore(s => s.orderHistory)
  const setActiveOrder = useOrderStore(s => s.setActiveOrder)
  const elapsed        = useElapsed(activeOrder?.createdAt)

  // Poll real order status every 5s
  useEffect(() => {
    if (!activeOrder?.id) return
    const poll = async () => {
      try {
        const updated = await ordersAPI.getOne(activeOrder.id)
        if (!updated) return
        const newStatus = (updated.status || '').toLowerCase()
        const curStatus = (activeOrder.status || '').toLowerCase()
        // Always update to get latest data
        setActiveOrder({
          ...activeOrder,
          ...updated,
          status: newStatus,
          items: updated.items || activeOrder.items,
          courier: updated.courier || (activeOrder as any).courier,
        })
      } catch {}
    }
    poll()
    const t = setInterval(poll, 3000) // har 3s
    return () => clearInterval(t)
  }, [activeOrder?.id])

  // Real courier location via Socket.io + HTTP fallback
  const [courierLoc,  setCourierLoc]  = useState<{ lat: number; lng: number } | null>(null)
  const [courierInfo, setCourierInfo] = useState<{ name: string; phone: string } | null>(null)

  const { onCourierMoved } = useOrderSocket(activeOrder?.id)

  useEffect(() => {
    if (activeOrder?.status !== 'on_the_way') return

    // Socket.io real-time
    const cleanup = onCourierMoved((loc) => {
      setCourierLoc({ lat: loc.lat, lng: loc.lng })
    })

    // HTTP fallback — first load + every 30s
    const loadCourierInfo = async () => {
      if (!(activeOrder as any)?.courierId) return
      try {
        const loc = await ordersAPI.getCourierLocation(String((activeOrder as any).courierId))
        if (loc?.lat && loc?.lng) {
          setCourierLoc({ lat: Number(loc.lat), lng: Number(loc.lng) })
        }
        if (loc?.firstName) {
          setCourierInfo({
            name:  loc.firstName || 'Kuryer',
            phone: loc.phone     || '',
          })
        }
      } catch {}
    }
    loadCourierInfo()
    const t = setInterval(loadCourierInfo, 30000)

    return () => {
      cleanup?.()
      clearInterval(t)
    }
  }, [(activeOrder as any)?.courierId, activeOrder?.status])

  const order = activeOrder || orderHistory[0]

  if (!order) {
    return (
      <AppShell>
        <div className={styles.empty}>
          <Package size={64} color="var(--text-muted)" strokeWidth={1} />
          <h2 className={styles.emptyTitle}>Buyurtma topilmadi</h2>
          <p className={styles.emptySub}>Hali buyurtma berilmagan</p>
          <button className={styles.emptyBtn} onClick={() => navigate('/user')}>
            Menyuga o'tish
          </button>
        </div>
      </AppShell>
    )
  }

  const currentIdx  = STATUS_ORDER.indexOf(order.status as OrderStatus)
  const isDelivered = order.status === 'delivered'
  const isCancelled = order.status === 'cancelled'
  const isOnTheWay  = order.status === 'on_the_way'

  const courierName  = courierInfo?.name  || (order as any)?.courier?.firstName || 'Kuryer'
  const courierPhone = courierInfo?.phone || (order as any)?.courier?.phone     || ''

  return (
    <AppShell showNav={false}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => { haptic.light(); navigate('/user') }}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className={styles.headerTitle}>Buyurtma holati</h1>
          <div className={styles.headerSub}>{(order as any).orderNumber || order.id}</div>
        </div>
        <div className={styles.elapsed}>
          <Clock size={14} />
          {elapsed}
        </div>
      </div>

      <div className={styles.body}>

        {/* Status steps */}
        {!isCancelled && (
          <div className={styles.statusCard}>
            <div className={styles.statusTitle}>
              {isDelivered ? '🎉 Yetkazildi!' : isOnTheWay ? "🛵 Kuryer yo'lda" : '⏳ Buyurtma jarayonda'}
            </div>
            <div className={styles.statusSteps}>
              {STATUS_STEPS.filter(s => s.key !== 'cancelled').map((step, idx) => {
                const isDone    = idx <= currentIdx
                const isCurrent = idx === currentIdx
                return (
                  <React.Fragment key={step.key}>
                    <div className={clsx(styles.step, isDone && styles.stepDone, isCurrent && styles.stepCurrent)}>
                      <div className={styles.stepIcon}>
                        {isDone ? <CheckCircle size={14} /> : step.icon}
                      </div>
                      <div className={styles.stepLabel}>{step.label}</div>
                    </div>
                    {idx < STATUS_STEPS.length - 2 && (
                      <div className={clsx(styles.stepLine, idx < currentIdx && styles.stepLineDone)} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        )}

        {/* Courier map — only when on_the_way */}
        {isOnTheWay && (
          <div className={styles.mapCard}>
            <div className={styles.mapTitle}>
              <Truck size={16} />
              Kuryer joylashuvi
              <span className={styles.liveBadge}>LIVE</span>
            </div>

            {/* Map */}
            <div style={{ height: 180, borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
              {courierLoc ? (
                <CourierMap
                  courierLat={courierLoc.lat}
                  courierLng={courierLoc.lng}
                  orderLat={(order as any).lat}
                  orderLng={(order as any).lng}
                />
              ) : (
                <div style={{
                  height: '100%', background: '#1a2a1a',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <div style={{ fontSize: 36 }}>🛵</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
                    Kuryer joylashuvi aniqlanmoqda...
                  </div>
                </div>
              )}
            </div>

            {/* Courier info */}
            <div className={styles.courierInfo}>
              <div className={styles.courierAva}>🛵</div>
              <div className={styles.courierDetails}>
                <div className={styles.courierName}>{courierName}</div>
                <div className={styles.courierRating}>
                  <Star size={12} fill="#F5C800" color="#F5C800" /> 4.9
                </div>
              </div>
              {courierPhone && (
                <button
                  className={styles.courierCallBtn}
                  onClick={() => window.open(`tel:${courierPhone}`)}
                >
                  <Phone size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Order items */}
        <div className={styles.detailCard}>
          <div className={styles.detailTitle}>📋 Buyurtma tarkibi</div>
          {(order.items || []).map((item: any, idx: number) => (
            <div key={idx} className={styles.detailItem}>
              <span className={styles.detailEmoji}>{item.menuItem?.emoji || '🍔'}</span>
              <span className={styles.detailName}>{item.menuItem?.name || 'Taom'}</span>
              <span className={styles.detailQty}>×{item.quantity}</span>
              <span className={styles.detailPrice}>{fmt(item.price || item.totalPrice || 0)}</span>
            </div>
          ))}
          <div className={styles.detailDivider} />
          <div className={styles.detailTotal}>
            <span>Jami</span>
            <span>{fmt(order.totalPrice)}</span>
          </div>
        </div>

        {/* Delivery info */}
        <div className={styles.detailCard}>
          <div className={styles.detailTitle}>📍 Yetkazish ma'lumotlari</div>
          <div className={styles.infoRow}>
            <MapPin size={16} color="var(--text-muted)" />
            <span>{order.address || 'Olib ketish'}</span>
          </div>
          <div className={styles.infoRow}>
            <Phone size={16} color="var(--text-muted)" />
            <span>{order.phone}</span>
          </div>
        </div>

        {/* Contact */}
        <div className={styles.contactBtns}>
          {courierPhone && (
            <a href={`tel:${courierPhone}`} className={styles.contactBtn}>
              <Phone size={20} />
              <span>Kuryer bilan bog'lanish</span>
            </a>
          )}
          <button
            className={clsx(styles.contactBtn, styles.contactBtnSecondary)}
            onClick={() => {
              const tg = (window as any).Telegram?.WebApp
              if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/cheese_cafe')
              else window.open('https://t.me/cheese_cafe', '_blank')
            }}
          >
            <MessageCircle size={20} />
            <span>Restoran bilan bog'lanish</span>
          </button>
        </div>

        {/* Delivered */}
        {isDelivered && (
          <div className={styles.deliveredCard}>
            <div className={styles.deliveredTitle}>🎉 Taomingizdan zavqlaning!</div>
            <div className={styles.ratingRow}>
              {[1,2,3,4,5].map(star => (
                <button key={star} className={styles.starBtn}>
                  <Star size={28} color="#F5C800" strokeWidth={1.5} />
                </button>
              ))}
            </div>
            <button
              className={styles.reorderBtn}
              onClick={() => { haptic.light(); navigate('/user') }}
            >
              <RotateCcw size={16} />
              Qayta buyurtma
            </button>
          </div>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <div className={styles.cancelledCard}>
            <div className={styles.cancelledTitle}>❌ Buyurtma bekor qilindi</div>
            <div className={styles.cancelledSub}>
              {(order as any).cancelReason || "Sabab: noma'lum"}
            </div>
            <button
              className={styles.reorderBtn}
              onClick={() => { haptic.light(); navigate('/user') }}
            >
              Qayta buyurtma berish
            </button>
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>
    </AppShell>
  )
}

// ── Courier Map ──
function CourierMap({ courierLat, courierLng, orderLat, orderLng }: {
  courierLat: number
  courierLng: number
  orderLat?:  number
  orderLng?:  number
}) {
  const divRef        = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const courierMarker = useRef<any>(null)

  useEffect(() => {
    const init = () => {
      if (!divRef.current || mapRef.current) return
      const L = (window as any).L
      if (!L) return

      const map = L.map(divRef.current, {
        center: [courierLat, courierLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

      const cIcon = L.divIcon({
        className: '',
        html: '<div style="font-size:28px">🛵</div>',
        iconSize: [28, 28], iconAnchor: [14, 14],
      })
      courierMarker.current = L.marker([courierLat, courierLng], { icon: cIcon }).addTo(map)

      if (orderLat && orderLng) {
        const dIcon = L.divIcon({
          className: '',
          html: '<div style="font-size:28px">📍</div>',
          iconSize: [28, 28], iconAnchor: [14, 28],
        })
        L.marker([orderLat, orderLng], { icon: dIcon }).addTo(map)
      }

      mapRef.current = map
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'; link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if ((window as any).L) {
      setTimeout(init, 50)
    } else if (!document.getElementById('leaflet-js')) {
      const s = document.createElement('script')
      s.id = 'leaflet-js'
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = () => setTimeout(init, 50)
      document.head.appendChild(s)
    } else {
      const t = setInterval(() => {
        if ((window as any).L) { clearInterval(t); init() }
      }, 100)
      setTimeout(() => clearInterval(t), 8000)
    }
  }, [])

  useEffect(() => {
    if (!courierMarker.current || !mapRef.current) return
    courierMarker.current.setLatLng([courierLat, courierLng])
    mapRef.current.setView([courierLat, courierLng], 15)
  }, [courierLat, courierLng])

  return <div ref={divRef} style={{ width: '100%', height: '100%' }} />
}
