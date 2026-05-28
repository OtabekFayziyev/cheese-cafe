import React, { useState, useEffect } from 'react'
import { useCourierStore } from '@/store/courierStore'
import { useFormat, useTelegram } from '@/hooks'
import { CourierShell, CourierPageHeader } from './CourierShell'
import styles from './CourierMap.module.css'

// Animated courier dot on a map stub
function MapStub({ address }: { address?: string }) {
  const [pos, setPos] = useState({ x: 40, y: 30 })

  useEffect(() => {
    const t = setInterval(() => {
      setPos(p => ({
        x: Math.max(10, Math.min(85, p.x + (Math.random()-0.5)*8)),
        y: Math.max(15, Math.min(75, p.y + (Math.random()-0.5)*5)),
      }))
    }, 1500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className={styles.mapStub}>
      {/* Grid lines */}
      <svg className={styles.mapGrid} viewBox="0 0 100 100" preserveAspectRatio="none">
        {[20,40,60,80].map(v => (
          <React.Fragment key={v}>
            <line x1={v} y1="0" x2={v} y2="100" stroke="rgba(255,255,255,.07)" strokeWidth=".5"/>
            <line x1="0" y1={v} x2="100" y2={v} stroke="rgba(255,255,255,.07)" strokeWidth=".5"/>
          </React.Fragment>
        ))}
        {/* Roads */}
        <path d="M0 50 Q30 40 50 50 Q70 60 100 50" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" fill="none"/>
        <path d="M50 0 Q45 30 50 50 Q55 70 50 100" stroke="rgba(255,255,255,.15)" strokeWidth="1" fill="none"/>
        <path d="M0 70 Q20 65 40 70 Q60 75 100 68" stroke="rgba(255,255,255,.1)" strokeWidth=".8" fill="none"/>
      </svg>

      {/* Courier dot (animated) */}
      <div className={styles.courierDot} style={{ left:`${pos.x}%`, top:`${pos.y}%` }}>
        <div className={styles.courierDotInner}>🛵</div>
        <div className={styles.courierDotRing} />
      </div>

      {/* Destination pin */}
      <div className={styles.destPin} style={{ left:'70%', top:'60%' }}>
        📍
        <div className={styles.destLabel}>{address?.slice(0,14) || 'Manzil'}...</div>
      </div>

      {/* Live badge */}
      <div className={styles.liveBadge}>
        <span className={styles.liveDot} />
        LIVE
      </div>

      <div className={styles.mapNote}>Xarita integratsiyasi (Yandex/Google Maps API)</div>
    </div>
  )
}

export default function CourierMap() {
  const { fmt }    = useFormat()
  const { haptic } = useTelegram()
  const { activeOrders, profile } = useCourierStore()

  const currentOrder = activeOrders.find(o => o.status === 'on_the_way')
  const nextOrder    = activeOrders.find(o => o.status === 'ready')

  return (
    <CourierShell>
      <CourierPageHeader title="Xarita" subtitle="Joriy joylashuv" />

      {/* Map */}
      <MapStub address={currentOrder?.address || nextOrder?.address} />

      {/* Current location */}
      <div className={styles.locationCard}>
        <span className={styles.locationIcon}>📡</span>
        <div>
          <div className={styles.locationTitle}>Joriy joylashuv (GPS)</div>
          <div className={styles.locationVal}>Yunusobod, 19-mavze · aniqlanmoqda...</div>
        </div>
        <button className={styles.refreshBtn} onClick={() => haptic.light()}>🔄</button>
      </div>

      {/* Active order directions */}
      {currentOrder ? (
        <div className={styles.dirCard}>
          <div className={styles.dirTitle}>🧭 Yo'nalish</div>
          <div className={styles.dirSteps}>
            <div className={styles.dirStep}>
              <div className={styles.dirDot} style={{background:'var(--yellow)'}} />
              <div className={styles.dirStepText}>
                <div className={styles.dirStepTitle}>Siz</div>
                <div className={styles.dirStepSub}>Joriy joylashuv</div>
              </div>
            </div>
            <div className={styles.dirLine} />
            <div className={styles.dirStep}>
              <div className={styles.dirDot} style={{background:'var(--green)'}} />
              <div className={styles.dirStepText}>
                <div className={styles.dirStepTitle}>{currentOrder.address}</div>
                <div className={styles.dirStepSub}>{currentOrder.addressDetail || 'Kirish raqamini soʻrang'}</div>
              </div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(currentOrder.address||'')}`}
                target="_blank" rel="noreferrer"
                className={styles.navBtn}
              >
                🗺️ Navigatsiya
              </a>
            </div>
          </div>

          <div className={styles.etaRow}>
            <div className={styles.etaItem}>
              <div className={styles.etaVal}>~12</div>
              <div className={styles.etaLbl}>daqiqa</div>
            </div>
            <div className={styles.etaItem}>
              <div className={styles.etaVal}>2.4</div>
              <div className={styles.etaLbl}>km</div>
            </div>
            <div className={styles.etaItem}>
              <div className={styles.etaVal}>{fmt(currentOrder.totalPrice)}</div>
              <div className={styles.etaLbl}>to'lov</div>
            </div>
          </div>
        </div>
      ) : nextOrder ? (
        <div className={styles.dirCard}>
          <div className={styles.dirTitle}>📦 Keyingi vazifa</div>
          <div className={styles.pickupInfo}>
            <span>Cafeda: buyurtmani olib keting</span>
          </div>
          <a href="https://maps.google.com" target="_blank" rel="noreferrer" className={styles.cafeNavBtn}>
            🧀 Cafega yo'nalish →
          </a>
        </div>
      ) : (
        <div className={styles.noOrderCard}>
          <div className={styles.noOrderIcon}>🕐</div>
          <div className={styles.noOrderText}>Faol buyurtma yo'q</div>
          <div className={styles.noOrderSub}>Yangi buyurtma tushganda xaritada ko'rinadi</div>
        </div>
      )}
    </CourierShell>
  )
}
