import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, MessageCircle, MapPin,
  Clock, CheckCircle, ChefHat, Package,
  Truck, Star, RotateCcw
} from 'lucide-react'
import clsx from 'clsx'
import { useOrderStore } from '@/store'
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

// Elapsed timer hook
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
  const navigate      = useNavigate()
  const { fmt }       = useFormat()
  const { haptic }    = useTelegram()
  const activeOrder   = useOrderStore(s => s.activeOrder)
  const orderHistory  = useOrderStore(s => s.orderHistory)
  const elapsed       = useElapsed(activeOrder?.createdAt)

  // Courier mock location animation
  const [courierPos, setCourierPos] = useState({ x: 35, y: 25 })
  useEffect(() => {
    const t = setInterval(() => {
      setCourierPos(p => ({
        x: Math.max(10, Math.min(85, p.x + (Math.random() - .5) * 6)),
        y: Math.max(15, Math.min(75, p.y + (Math.random() - .5) * 4)),
      }))
    }, 1800)
    return () => clearInterval(t)
  }, [])

  // Use most recent order if no active
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

  const currentIdx   = STATUS_ORDER.indexOf(order.status as OrderStatus)
  const isDelivered  = order.status === 'delivered'
  const isCancelled  = order.status === 'cancelled'
  const isOnTheWay   = order.status === 'on_the_way'

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

        {/* Status card */}
        {!isCancelled && (
          <div className={styles.statusCard}>
            <div className={styles.statusTitle}>
              {isDelivered ? '🎉 Yetkazildi!' : isOnTheWay ? '🛵 Kuryer yo\'lda' : '⏳ Buyurtma jarayonda'}
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

        {/* Courier live map (when on the way) */}
        {isOnTheWay && (
          <div className={styles.mapCard}>
            <div className={styles.mapTitle}>
              <Truck size={16} />
              Kuryer joylashuvi
              <span className={styles.liveBadge}>LIVE</span>
            </div>
            <div className={styles.mapStub}>
              {/* Grid */}
              <svg className={styles.mapGrid} viewBox="0 0 100 100" preserveAspectRatio="none">
                {[20,40,60,80].map(v => (
                  <React.Fragment key={v}>
                    <line x1={v} y1="0" x2={v} y2="100" stroke="rgba(255,255,255,.07)" strokeWidth=".5"/>
                    <line x1="0" y1={v} x2="100" y2={v} stroke="rgba(255,255,255,.07)" strokeWidth=".5"/>
                  </React.Fragment>
                ))}
                <path d="M0 50 Q30 40 50 50 Q70 60 100 50" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" fill="none"/>
                <path d="M50 0 Q45 30 50 50 Q55 70 50 100" stroke="rgba(255,255,255,.12)" strokeWidth="1" fill="none"/>
              </svg>
              {/* Courier dot */}
              <div className={styles.courierDot}
                style={{ left:`${courierPos.x}%`, top:`${courierPos.y}%` }}>
                <div className={styles.courierEmoji}>🛵</div>
                <div className={styles.courierRing} />
              </div>
              {/* Destination */}
              <div className={styles.destPin} style={{ left:'72%', top:'62%' }}>
                <MapPin size={20} color="#F5C800" fill="rgba(245,200,0,.3)" />
              </div>
              <div className={styles.mapEta}>⏱ ~12 daqiqa qoldi</div>
            </div>
            {/* Courier info */}
            <div className={styles.courierInfo}>
              <div className={styles.courierAva}>🚴</div>
              <div className={styles.courierDetails}>
                <div className={styles.courierName}>Jasur Karimov</div>
                <div className={styles.courierRating}>
                  <Star size={12} fill="#F5C800" color="#F5C800" /> 4.9 · 234 ta yetkazma
                </div>
              </div>
              <a href="tel:+998901234567" className={styles.courierCallBtn}>
                <Phone size={18} />
              </a>
            </div>
          </div>
        )}

        {/* Order details */}
        <div className={styles.detailCard}>
          <div className={styles.detailTitle}>📋 Buyurtma tarkibi</div>
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className={styles.detailItem}>
              <span className={styles.detailEmoji}>{item.menuItem?.emoji || '🍔'}</span>
              <span className={styles.detailName}>{item.menuItem?.name || 'Taom'}</span>
              <span className={styles.detailQty}>×{item.quantity}</span>
              <span className={styles.detailPrice}>{fmt(item.price)}</span>
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

        {/* Contact buttons */}
        <div className={styles.contactBtns}>
          <a href="tel:+998901234567" className={styles.contactBtn}>
            <Phone size={20} />
            <span>Kuryer bilan bog'lanish</span>
          </a>
          <a href="https://t.me/cheese_cafe" target="_blank" rel="noreferrer"
            className={clsx(styles.contactBtn, styles.contactBtnSecondary)}>
            <MessageCircle size={20} />
            <span>Restoran bilan bog'lanish</span>
          </a>
        </div>

        {/* Delivered state */}
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
            <button className={styles.reorderBtn}
              onClick={() => { haptic.light(); navigate('/user') }}>
              <RotateCcw size={16} />
              Qayta buyurtma
            </button>
          </div>
        )}

        {/* Cancelled state */}
        {isCancelled && (
          <div className={styles.cancelledCard}>
            <div className={styles.cancelledTitle}>❌ Buyurtma bekor qilindi</div>
            <div className={styles.cancelledSub}>
              {(order as any).cancelReason || 'Sabab: noma\'lum'}
            </div>
            <button className={styles.reorderBtn}
              onClick={() => { haptic.light(); navigate('/user') }}>
              Qayta buyurtma berish
            </button>
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>
    </AppShell>
  )
}
