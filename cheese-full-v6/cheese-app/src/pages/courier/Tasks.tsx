import React, { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { useCourierStore } from '@/store/courierStore'
import { ordersAPI } from '@/api/client'
import { useCourierSocket } from '@/hooks/useSocket'
import { useFormat, useTelegram } from '@/hooks'
import { CourierShell, CourierPageHeader } from './CourierShell'
import type { Order } from '@/types'
import styles from './Tasks.module.css'

// Elapsed timer
function useElapsed(date: string) {
  const [v, setV] = useState('')
  useEffect(() => {
    const calc = () => {
      const d = Date.now() - new Date(date).getTime()
      const m = Math.floor(d/60000), s = Math.floor((d%60000)/1000)
      setV(m > 0 ? `${m}d ${s}s` : `${s}s`)
    }
    calc(); const t = setInterval(calc, 1000); return ()=>clearInterval(t)
  }, [date])
  return v
}

export default function Tasks() {
  const { haptic } = useTelegram()
  const { fmt }    = useFormat()
  const { profile, activeOrders, stats, updateOrderStatus, completeOrder } = useCourierStore()

  const [selectedOrder, setSelectedOrder] = useState<Order|null>(null)
  const [confirmDone, setConfirmDone]     = useState<Order|null>(null)
  const [callModal, setCallModal]         = useState<Order|null>(null)

  const onTheWay  = activeOrders.filter(o => o.status === 'on_the_way')
  const readyPick = activeOrders.filter(o => o.status === 'ready')

  const handlePickup = (order: Order) => {
    haptic.medium()
    updateOrderStatus(order.id, 'on_the_way')
    toast.success(`${order.id} qabul qilindi — yo'lga chiqildi!`)
  }

  const handleComplete = async () => {
    if (!confirmDone) return
    haptic.success()
    try {
      // Backend ga DELIVERED yuborish
      await ordersAPI.courierUpdateStatus(confirmDone.id, 'DELIVERED')
    } catch {}
    completeOrder(confirmDone.id)
    confetti({ particleCount:80, spread:70, origin:{y:.5}, colors:['#F5C800','#22C55E','#fff'] })
    toast.success('🎉 Yetkazildi! +' + fmt(confirmDone.deliveryFee || 0))
    setConfirmDone(null)
    setSelectedOrder(null)
  }

  if (!profile.isOnline) {
    return (
      <CourierShell>
        <div className={styles.offlineScreen}>
          <div className={styles.offlineIcon}>😴</div>
          <h2 className={styles.offlineTitle}>Siz offline'siz</h2>
          <p className={styles.offlineSub}>Buyurtma qabul qilish uchun<br/>Online tugmasini yoqing</p>
          <div className={styles.offlineStats}>
            <div className={styles.offlineStat}>
              <div className={styles.offlineStatVal}>{stats.todayDeliveries}</div>
              <div className={styles.offlineStatLbl}>Bugun</div>
            </div>
            <div className={styles.offlineStat}>
              <div className={styles.offlineStatVal}>{fmt(stats.todayEarnings)}</div>
              <div className={styles.offlineStatLbl}>Daromad</div>
            </div>
            <div className={styles.offlineStat}>
              <div className={styles.offlineStatVal}>⭐ {stats.rating}</div>
              <div className={styles.offlineStatLbl}>Reyting</div>
            </div>
          </div>
        </div>
      </CourierShell>
    )
  }

  return (
    <CourierShell>
      {/* Today quick stats */}
      <div className={styles.statsRow}>
        <div className={styles.statPill}>
          <span className={styles.statPillIcon}>📦</span>
          <span className={styles.statPillVal}>{stats.todayDeliveries}</span>
          <span className={styles.statPillLbl}>Bugun</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statPillIcon}>💰</span>
          <span className={styles.statPillVal}>{fmt(stats.todayEarnings)}</span>
          <span className={styles.statPillLbl}>Daromad</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statPillIcon}>⭐</span>
          <span className={styles.statPillVal}>{stats.rating}</span>
          <span className={styles.statPillLbl}>Reyting</span>
        </div>
      </div>

      {activeOrders.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🕐</div>
          <div className={styles.emptyTitle}>Hozircha buyurtma yo'q</div>
          <div className={styles.emptySub}>Yangi buyurtma tushganda bildirishnoma keladi</div>
          <div className={styles.emptyAnim}>
            {[0,1,2].map(i => <div key={i} className={styles.emptyDot} style={{animationDelay:`${i*.3}s`}} />)}
          </div>
        </div>
      )}

      {/* Ready to pick up */}
      {readyPick.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            <span>📦 Olib ketish kerak</span>
            <span className={styles.sectionCount}>{readyPick.length}</span>
          </div>
          {readyPick.map(order => (
            <OrderTaskCard
              key={order.id}
              order={order}
              type="pickup"
              fmt={fmt}
              onDetail={() => { haptic.light(); setSelectedOrder(order) }}
              onAction={() => handlePickup(order)}
              onCall={() => setCallModal(order)}
            />
          ))}
        </>
      )}

      {/* On the way */}
      {onTheWay.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            <span>🛵 Yetkazilmoqda</span>
            <span className={styles.sectionCount}>{onTheWay.length}</span>
          </div>
          {onTheWay.map(order => (
            <OrderTaskCard
              key={order.id}
              order={order}
              type="delivering"
              fmt={fmt}
              onDetail={() => { haptic.light(); setSelectedOrder(order) }}
              onAction={() => { haptic.light(); setConfirmDone(order) }}
              onCall={() => setCallModal(order)}
            />
          ))}
        </>
      )}

      {/* Detail modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          fmt={fmt}
          onClose={() => setSelectedOrder(null)}
          onPickup={() => { handlePickup(selectedOrder); setSelectedOrder(null) }}
          onDone={() => { setConfirmDone(selectedOrder); setSelectedOrder(null) }}
          onCall={() => setCallModal(selectedOrder)}
        />
      )}

      {/* Confirm delivered */}
      {confirmDone && (
        <div className={styles.overlay} onClick={() => setConfirmDone(null)}>
          <div className={styles.confirmCard} onClick={e=>e.stopPropagation()}>
            <div className={styles.confirmIcon}>✅</div>
            <div className={styles.confirmTitle}>Yetkazildi deb belgilansinmi?</div>
            <div className={styles.confirmSub}>
              <strong>{confirmDone.id}</strong><br/>
              Mijoz: {(confirmDone as any).customerName}<br/>
              To'lov: 💵 {fmt(confirmDone.totalPrice)} naqd
            </div>
            <div className={styles.confirmBtns}>
              <button className={styles.confirmNo} onClick={() => setConfirmDone(null)}>Yo'q</button>
              <button className={styles.confirmYes} onClick={handleComplete}>✅ Ha, yetkazildi</button>
            </div>
          </div>
        </div>
      )}

      {/* Call modal */}
      {callModal && (
        <div className={styles.overlay} onClick={() => setCallModal(null)}>
          <div className={styles.callCard} onClick={e=>e.stopPropagation()}>
            <div className={styles.callIcon}>📞</div>
            <div className={styles.callName}>{(callModal as any).customerName}</div>
            <a className={styles.callBtn} href={`tel:${callModal.phone}`} onClick={() => setCallModal(null)}>
              {callModal.phone}
            </a>
            {callModal.secondPhone && (
              <a className={styles.callBtn} href={`tel:${callModal.secondPhone}`} onClick={() => setCallModal(null)}>
                {callModal.secondPhone}
              </a>
            )}
            <button className={styles.callClose} onClick={() => setCallModal(null)}>Yopish</button>
          </div>
        </div>
      )}
    </CourierShell>
  )
}

// ── Order task card ──
function OrderTaskCard({ order, type, fmt, onDetail, onAction, onCall }: any) {
  const elapsed = useElapsed(order.createdAt)
  const isUrgent = type==='pickup' && (Date.now()-new Date(order.createdAt).getTime()) > 10*60000

  return (
    <div className={clsx(styles.taskCard, isUrgent && styles.taskUrgent)}>
      {/* Header */}
      <div className={styles.taskHeader} onClick={onDetail}>
        <div className={styles.taskId}>
          {order.id}
          {isUrgent && <span className={styles.urgentBadge}>⚠️ Kechikmoqda</span>}
        </div>
        <div className={styles.taskElapsed}>⏱ {elapsed}</div>
      </div>

      {/* Customer */}
      <div className={styles.taskCustomer} onClick={onDetail}>
        <div className={styles.custAvatar}>{(order.customerName||'?')[0]}</div>
        <div className={styles.custInfo}>
          <div className={styles.custName}>{order.customerName}</div>
          <div className={styles.custPhone}>{order.phone}</div>
        </div>
        <button className={styles.callIconBtn} onClick={e=>{e.stopPropagation();onCall()}}>📞</button>
      </div>

      {/* Address */}
      <div className={styles.taskAddress} onClick={onDetail}>
        <span className={styles.addrIcon}>📍</span>
        <div>
          <div className={styles.addrMain}>{order.address}</div>
          {order.addressDetail && <div className={styles.addrDetail}>{order.addressDetail}</div>}
        </div>
        <button className={styles.mapIconBtn} onClick={e=>{
          e.stopPropagation()
          window.open(`https://maps.google.com/?q=${encodeURIComponent(order.address)}`)
        }}>🗺️</button>
      </div>

      {/* Items */}
      <div className={styles.taskItems} onClick={onDetail}>
        {order.items.map((item:any) => (
          <span key={item.id} className={styles.taskItem}>
            {item.menuItem.emoji} {item.menuItem.name} ×{item.quantity}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className={styles.taskFooter}>
        <div>
          <div className={styles.taskTotal}>{fmt(order.totalPrice)}</div>
          <div className={styles.taskPay}>💵 Naqd</div>
        </div>
        <div className={styles.taskActions}>
          <button className={styles.detailBtn} onClick={onDetail}>🔍 Batafsil</button>
          <button
            className={clsx(styles.actionBtn, type==='delivering' && styles.actionBtnGreen)}
            onClick={onAction}
          >
            {type==='pickup' ? '📦 Qabul qildim' : '✅ Yetkazildi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Order detail modal ──
function OrderDetailModal({ order, fmt, onClose, onPickup, onDone, onCall }: any) {
  const elapsed = useElapsed(order.createdAt)
  const isPicking = order.status === 'ready'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detailSheet} onClick={e=>e.stopPropagation()}>
        <div className={styles.sheetHandle} />

        <div className={styles.detailHead}>
          <div>
            <div className={styles.detailId}>{order.id}</div>
            <div className={styles.detailTime}>
              {new Date(order.createdAt).toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})} · ⏱ {elapsed} oldin
            </div>
          </div>
          <div className={clsx(styles.detailBadge, isPicking ? styles.badgeReady : styles.badgeOtw)}>
            {isPicking ? '📦 Tayyor' : '🛵 Yo\'lda'}
          </div>
        </div>

        {/* Customer */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>👤 Mijoz</div>
          <div className={styles.detailRow}><span>Ism</span><span>{order.customerName}</span></div>
          <div className={styles.detailRow}>
            <span>Telefon</span>
            <a href={`tel:${order.phone}`} className={styles.phoneLink}>{order.phone}</a>
          </div>
          {order.secondPhone && (
            <div className={styles.detailRow}>
              <span>Qo'shimcha</span>
              <a href={`tel:${order.secondPhone}`} className={styles.phoneLink}>{order.secondPhone}</a>
            </div>
          )}
        </div>

        {/* Address */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>📍 Manzil</div>
          <div className={styles.detailRow}><span>Ko'cha</span><span>{order.address}</span></div>
          {order.addressDetail && <div className={styles.detailRow}><span>Batafsil</span><span>{order.addressDetail}</span></div>}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(order.address)}`}
            target="_blank" rel="noreferrer"
            className={styles.mapLink}
          >
            🗺️ Xaritada ochish →
          </a>
        </div>

        {/* Items */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>🍽️ Buyurtma</div>
          {order.items.map((item:any) => (
            <div key={item.id} className={styles.detailItem}>
              <span className={styles.detailItemEmoji}>{item.menuItem.emoji}</span>
              <span className={styles.detailItemName}>{item.menuItem.name}</span>
              <span className={styles.detailItemQty}>×{item.quantity}</span>
              <span className={styles.detailItemPrice}>{fmt(item.price)}</span>
            </div>
          ))}
        </div>

        {/* Payment */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>💳 To'lov</div>
          <div className={styles.detailRow}><span>Jami</span><span style={{fontWeight:800}}>{fmt(order.totalPrice)}</span></div>
          <div className={styles.detailRow}><span>Usul</span><span>💵 Naqd pul</span></div>
          <div className={styles.detailRow}><span>Yetkazish uchun</span><span style={{color:'var(--green)',fontWeight:700}}>+{fmt(order.deliveryFee)}</span></div>
        </div>

        {/* Actions */}
        <div className={styles.detailActions}>
          <button className={styles.callBtn2} onClick={onCall}>📞 Qo'ng'iroq</button>
          {isPicking
            ? <button className={styles.pickupBtn} onClick={onPickup}>📦 Qabul qildim</button>
            : <button className={styles.doneBtn} onClick={onDone}>✅ Yetkazildi</button>
          }
        </div>
      </div>
    </div>
  )
}
