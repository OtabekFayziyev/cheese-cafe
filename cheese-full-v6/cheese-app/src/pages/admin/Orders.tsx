import React, { useState, useEffect, useRef, useCallback } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAdminStore, ORDER_STATUS_LABELS, ORDER_STATUS_NEXT, MOCK_COURIERS, STATUS_COLORS } from '@/store/adminStore'
import { useFormat, useTelegram } from '@/hooks'
import { AdminShell, AdminPageHeader } from './AdminShell'
import type { Order, OrderStatus } from '@/types'
import styles from './Orders.module.css'

// ── Elapsed time helper ──
function useElapsed(createdAt: string) {
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(createdAt).getTime()
      const mins = Math.floor(diff / 60000)
      const hrs  = Math.floor(mins / 60)
      const secs = Math.floor((diff % 60000) / 1000)
      if (hrs > 0) setElapsed(`${hrs}s ${mins % 60}d`)
      else if (mins > 0) setElapsed(`${mins}d ${secs}s`)
      else setElapsed(`${secs}s`)
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [createdAt])
  return elapsed
}

// ── Sound bell ──
function playBell() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    // Ding-ding pattern
    const play = (freq: number, start: number, dur: number) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    play(880, 0, 0.4); play(1100, 0.15, 0.35); play(880, 0.45, 0.5); play(1100, 0.6, 0.4)
  } catch(e) {}
}

const FILTER_TABS: {key: OrderStatus|'all'; label:string}[] = [
  {key:'all',       label:'Barchasi'},
  {key:'pending',   label:'🔔 Yangi'},
  {key:'accepted',  label:'✅ Qabul'},
  {key:'preparing', label:'👨‍🍳 Tayyor'},
  {key:'ready',     label:'📦 Tayyor'},
  {key:'on_the_way',label:'🛵 Yo\'lda'},
  {key:'delivered', label:'✅ Yetdi'},
  {key:'cancelled', label:'❌ Bekor'},
]

export default function Orders() {
  const { haptic }   = useTelegram()
  const { fmt }      = useFormat()
  const { orders, updateOrderStatus, assignCourier, cancelOrder } = useAdminStore()

  const [filter, setFilter]               = useState<OrderStatus|'all'>('all')
  const [detailOrder, setDetailOrder]     = useState<Order|null>(null)
  const [cancelTarget, setCancelTarget]   = useState<Order|null>(null)
  const [courierModal, setCourierModal]   = useState<Order|null>(null)
  const [newOrderPopup, setNewOrderPopup] = useState<Order|null>(null)
  const prevPendingRef = useRef(orders.filter(o=>o.status==='pending').length)
  const [search, setSearch] = useState('')

  // ── Auto-detect new orders + sound ──
  useEffect(() => {
    const pending = orders.filter(o=>o.status==='pending').length
    if (pending > prevPendingRef.current) {
      const newest = orders.filter(o=>o.status==='pending')
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      playBell()
      setNewOrderPopup(newest)
      haptic.heavy()
      setTimeout(() => setNewOrderPopup(null), 6000)
    }
    prevPendingRef.current = pending
  }, [orders])

  // ── Simulate new order for demo (every 30s) ──
  useEffect(() => {
    const t = setTimeout(() => {
      // In production this comes from Socket.io
    }, 30000)
    return () => clearTimeout(t)
  }, [])

  const filtered = [...orders]
    .filter(o => {
      const matchStatus = filter==='all' || o.status===filter
      const matchSearch = !search || o.id.includes(search) || (o as any).customerName?.toLowerCase().includes(search.toLowerCase())
      return matchStatus && matchSearch
    })
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleNext = (order: Order) => {
    const next = ORDER_STATUS_NEXT[order.status]
    if (!next) return
    haptic.medium()
    if (next === 'on_the_way') { setCourierModal(order); return }
    updateOrderStatus(order.id, next)
    toast.success(`${order.id} → ${ORDER_STATUS_LABELS[next]}`)
  }

  const handleCourierAssign = (courierId: number) => {
    if (!courierModal) return
    haptic.success()
    assignCourier(courierModal.id, courierId)
    const c = MOCK_COURIERS.find(c=>c.id===courierId)
    toast.success(`${c?.name} tayinlandi`)
    setCourierModal(null)
  }

  const confirmCancel = () => {
    if (!cancelTarget) return
    haptic.heavy()
    cancelOrder(cancelTarget.id)
    toast.error(`${cancelTarget.id} bekor qilindi`)
    setCancelTarget(null)
    if (detailOrder?.id === cancelTarget.id) setDetailOrder(null)
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Buyurtmalar"
        subtitle={`${orders.length} ta jami · ${orders.filter(o=>o.status==='pending').length} ta yangi`}
      />

      {/* Search */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input className={styles.searchInput} placeholder="ID yoki mijoz ismi..."
            value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
      </div>

      {/* Filter tabs */}
      <div className={styles.filterTabs}>
        {FILTER_TABS.map(tab => {
          const count = tab.key==='all' ? orders.length : orders.filter(o=>o.status===tab.key).length
          return (
            <button key={tab.key}
              className={clsx(styles.filterTab, filter===tab.key && styles.filterTabActive)}
              onClick={() => { haptic.light(); setFilter(tab.key) }}
            >
              {tab.label}
              {count > 0 && <span className={styles.filterCount}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Orders */}
      <div className={styles.orderList}>
        {filtered.length === 0 && (
          <div className={styles.empty}><div>📭</div><div>Buyurtma topilmadi</div></div>
        )}
        {filtered.map((order, idx) => (
          <OrderCard
            key={order.id}
            order={order}
            idx={idx}
            fmt={fmt}
            onDetail={() => { haptic.light(); setDetailOrder(order) }}
            onNext={() => handleNext(order)}
            onCancel={() => { haptic.light(); setCancelTarget(order) }}
          />
        ))}
      </div>

      {/* ── NEW ORDER POPUP ── */}
      {newOrderPopup && (
        <div className={styles.newOrderPopup}>
          <div className={styles.newOrderInner}>
            <div className={styles.newOrderIcon}>🔔</div>
            <div className={styles.newOrderText}>
              <div className={styles.newOrderTitle}>Yangi buyurtma!</div>
              <div className={styles.newOrderSub}>{newOrderPopup.id} · {fmt((newOrderPopup as any).totalPrice)}</div>
            </div>
            <button className={styles.newOrderBtn}
              onClick={() => { setDetailOrder(newOrderPopup); setNewOrderPopup(null) }}>
              Ko'rish
            </button>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          fmt={fmt}
          onClose={() => setDetailOrder(null)}
          onNext={() => { handleNext(detailOrder); setDetailOrder(null) }}
          onCancel={() => { setCancelTarget(detailOrder); setDetailOrder(null) }}
        />
      )}

      {/* ── CANCEL CONFIRM ── */}
      {cancelTarget && (
        <div className={styles.overlay} onClick={() => setCancelTarget(null)}>
          <div className={styles.confirmCard} onClick={e=>e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠️</div>
            <div className={styles.confirmTitle}>Bekor qilinsinmi?</div>
            <div className={styles.confirmSub}>
              <strong>{cancelTarget.id}</strong> buyurtma bekor qilinadi.<br/>
              Bu amalni qaytarib bo'lmaydi.
            </div>
            <div className={styles.confirmBtns}>
              <button className={styles.confirmNo} onClick={() => setCancelTarget(null)}>
                Yo'q, qaytish
              </button>
              <button className={styles.confirmYes} onClick={confirmCancel}>
                Ha, bekor qil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COURIER MODAL ── */}
      {courierModal && (
        <div className={styles.overlay} onClick={() => setCourierModal(null)}>
          <div className={styles.sheet} onClick={e=>e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.sheetTitle}>🛵 Kuryer tayinlash</h3>
            <div className={styles.sheetSub}>{courierModal.id} · {courierModal.address}</div>
            {MOCK_COURIERS.map(c => (
              <button key={c.id}
                className={clsx(styles.courierRow, !c.active && styles.courierBusy)}
                onClick={() => c.active && handleCourierAssign(c.id)}
                disabled={!c.active}
              >
                <div className={styles.courierAva}>🚴</div>
                <div className={styles.courierInfo}>
                  <div className={styles.courierName}>{c.name}</div>
                  <div className={styles.courierMeta}>⭐{c.rating} · {c.deliveries} ta · {c.phone}</div>
                </div>
                <span className={clsx(styles.courierBadge, c.active ? styles.courierFree : styles.courierBusyBadge)}>
                  {c.active ? 'Bo\'sh' : 'Band'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  )
}

// ── Order card ──
function OrderCard({ order, idx, fmt, onDetail, onNext, onCancel }: any) {
  const elapsed   = useElapsed(order.createdAt)
  const col       = STATUS_COLORS[order.status]
  const next      = ORDER_STATUS_NEXT[order.status]
  const isNew     = order.status === 'pending'
  const isUrgent  = isNew && (Date.now() - new Date(order.createdAt).getTime()) > 5 * 60000

  return (
    <div
      className={clsx(styles.orderCard, isNew && styles.orderCardNew, isUrgent && styles.orderCardUrgent)}
      style={{ animationDelay:`${idx*.04}s` }}
    >
      <div className={styles.cardHeader} onClick={onDetail}>
        <div className={styles.cardId}>
          {order.id}
          {isNew && <span className={styles.newDot} />}
        </div>
        <div className={styles.cardElapsed} style={{ color: isUrgent ? '#EF4444' : undefined }}>
          ⏱ {elapsed}
        </div>
        <div className={styles.cardStatus} style={{ background:col.bg, color:col.text }}>
          {ORDER_STATUS_LABELS[order.status]}
        </div>
      </div>

      <div className={styles.cardItems} onClick={onDetail}>
        {order.items.slice(0,2).map((item: any) => (
          <div key={item.id} className={styles.cardItem}>
            <span>{item.menuItem.emoji}</span>
            <span className={styles.cardItemName}>{item.menuItem.name}</span>
            <span className={styles.cardItemQty}>×{item.quantity}</span>
            <span className={styles.cardItemPrice}>{fmt(item.price)}</span>
          </div>
        ))}
        {order.items.length > 2 && (
          <div className={styles.cardMoreItems}>+{order.items.length-2} ta yana</div>
        )}
      </div>

      <div className={styles.cardMeta} onClick={onDetail}>
        <span>{order.deliveryType==='pickup'?'🏃 Olib ketish':`🛵 ${order.address?.slice(0,22)}...`}</span>
        <span>📞 {order.phone}</span>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.cardTotal}>{fmt(order.totalPrice)}</div>
        <div className={styles.cardActions}>
          <button className={styles.detailBtn} onClick={onDetail}>🔍</button>
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <button className={styles.cancelBtn} onClick={onCancel}>✕</button>
          )}
          {next && order.status !== 'cancelled' && (
            <button className={clsx(styles.nextBtn, isNew && styles.nextBtnNew)} onClick={onNext}>
              {next==='accepted'  ? '✅ Qabul' :
               next==='preparing' ? '👨‍🍳 Boshlash' :
               next==='ready'     ? '📦 Tayyor' :
               next==='on_the_way'? '🛵 Kuryerga' :
               next==='delivered' ? '✅ Yetdi' : ORDER_STATUS_LABELS[next]}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Order detail modal ──
function OrderDetailModal({ order, fmt, onClose, onNext, onCancel }: any) {
  const elapsed = useElapsed(order.createdAt)
  const col     = STATUS_COLORS[order.status]
  const next    = ORDER_STATUS_NEXT[order.status]

  const createdTime = new Date(order.createdAt).toLocaleString('uz-UZ', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit',
  })

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detailSheet} onClick={e=>e.stopPropagation()}>
        <div className={styles.sheetHandle} />

        {/* Header */}
        <div className={styles.detailHeader}>
          <div>
            <div className={styles.detailId}>{order.id}</div>
            <div className={styles.detailTime}>{createdTime}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div className={styles.detailStatus} style={{ background:col.bg, color:col.text }}>
              {ORDER_STATUS_LABELS[order.status]}
            </div>
            <div className={styles.detailElapsed}>⏱ {elapsed} oldin</div>
          </div>
        </div>

        {/* Customer */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>👤 Mijoz</div>
          <div className={styles.detailRow}><span>Ismi</span><span>{(order as any).customerName || 'Noma\'lum'}</span></div>
          <div className={styles.detailRow}><span>Telefon</span><span>{order.phone}</span></div>
          {order.secondPhone && <div className={styles.detailRow}><span>2-telefon</span><span>{order.secondPhone}</span></div>}
        </div>

        {/* Delivery */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>
            {order.deliveryType==='pickup' ? '🏃 Olib ketish' : '🛵 Yetkazish'}
          </div>
          {order.deliveryType === 'delivery' && (
            <>
              <div className={styles.detailRow}><span>Manzil</span><span>{order.address}</span></div>
              {order.addressDetail && <div className={styles.detailRow}><span>Batafsil</span><span>{order.addressDetail}</span></div>}
            </>
          )}
        </div>

        {/* Items */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>🍽️ Buyurtma tarkibi</div>
          {order.items.map((item: any) => (
            <div key={item.id} className={styles.detailItem}>
              <div className={styles.detailItemTop}>
                <span className={styles.detailItemEmoji}>{item.menuItem.emoji}</span>
                <span className={styles.detailItemName}>{item.menuItem.name}</span>
                <span className={styles.detailItemQty}>×{item.quantity}</span>
                <span className={styles.detailItemPrice}>{fmt(item.price)}</span>
              </div>
              {item.extras.length > 0 && (
                <div className={styles.detailItemExtras}>
                  {item.extras.map((e:any)=>e.name).join(', ')}
                </div>
              )}
              {item.note && <div className={styles.detailItemNote}>📝 {item.note}</div>}
            </div>
          ))}
        </div>

        {/* Payment summary */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>💳 To'lov</div>
          <div className={styles.detailRow}><span>Taomlar</span><span>{fmt(order.items.reduce((s:number,i:any)=>s+i.price,0))}</span></div>
          {order.deliveryFee > 0 && <div className={styles.detailRow}><span>Yetkazish</span><span>{fmt(order.deliveryFee)}</span></div>}
          {order.discount > 0 && (
            <div className={clsx(styles.detailRow, styles.detailRowGreen)}>
              <span>Chegirma {order.promoCode && `(${order.promoCode})`}</span>
              <span>−{fmt(order.discount)}</span>
            </div>
          )}
          <div className={clsx(styles.detailRow, styles.detailRowTotal)}>
            <span>Jami</span><span>{fmt(order.totalPrice)}</span>
          </div>
          <div className={styles.detailRow}><span>To'lov usuli</span><span>💵 {order.paymentType==='cash'?'Naqd':'Online'}</span></div>
        </div>

        {/* Actions */}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <div className={styles.detailActions}>
            <button className={styles.detailCancelBtn} onClick={onCancel}>
              ✕ Bekor qilish
            </button>
            {next && (
              <button className={styles.detailNextBtn} onClick={onNext}>
                {next==='accepted'  ? '✅ Qabul qilish' :
                 next==='preparing' ? '👨‍🍳 Tayyorlashni boshlash' :
                 next==='ready'     ? '📦 Tayyor' :
                 next==='on_the_way'? '🛵 Kuryerga berish' :
                 next==='delivered' ? '✅ Yetkazildi' : ORDER_STATUS_LABELS[next]}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
