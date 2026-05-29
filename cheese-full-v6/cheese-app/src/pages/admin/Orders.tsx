import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAdminStore, ORDER_STATUS_LABELS, ORDER_STATUS_NEXT, MOCK_COURIERS, STATUS_COLORS } from '@/store/adminStore'
import { ordersAPI } from '@/api/client'
import { AdminShell, AdminPageHeader } from './AdminShell'
import { useFormat, useTelegram } from '@/hooks'
import type { Order, OrderStatus } from '@/types'
import styles from './Orders.module.css'

function useElapsed(date?: string) {
  const [e, setE] = useState('')
  useEffect(() => {
    if (!date) return
    const calc = () => {
      const diff = Date.now() - new Date(date).getTime()
      const m = Math.floor(diff/60000)
      setE(m > 59 ? `${Math.floor(m/60)}s ${m%60}d` : m > 0 ? `${m}d` : 'Hozir')
    }
    calc(); const t = setInterval(calc, 10000); return () => clearInterval(t)
  }, [date])
  return e
}

export default function Orders() {
  const { haptic }   = useTelegram()
  const { fmt }      = useFormat()
  const { orders: mockOrders, updateOrderStatus, assignCourier, cancelOrder } = useAdminStore()

  const [searchParams] = useSearchParams()
  const initialStatus = (searchParams.get('status') || 'all') as OrderStatus | 'all'
  const [filter, setFilter]             = useState<OrderStatus|'all'>(initialStatus)
  const [detailOrder, setDetailOrder]   = useState<Order|null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order|null>(null)
  const [courierModal, setCourierModal] = useState<Order|null>(null)
  const [search, setSearch]             = useState('')

  // Real API state
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const prevCountRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const data = await ordersAPI.adminGetAll({ limit: 200 })
      const raw = data.orders || data || []
      const mapped: Order[] = raw.map((o: any) => ({
        ...o,
        status:       (o.status || 'pending').toLowerCase() as OrderStatus,
        deliveryType: (o.deliveryType || 'delivery').toLowerCase(),
        paymentType:  (o.paymentType  || 'cash').toLowerCase(),
        customerName: o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() : 'Noma\'lum',
        customerUsername: o.user?.username,
        items: (o.items || []).map((i: any) => ({
          ...i,
          menuItem: i.menuItem || { id: i.menuItemId, name: 'Taom', emoji: '🍔', price: i.price },
          selectedExtras: i.extras || [],
          totalPrice: i.price,
        })),
      }))
      
      // New order notification
      const pendingCount = mapped.filter(o => o.status === 'pending').length
      if (prevCountRef.current > 0 && pendingCount > prevCountRef.current) {
        const diff = pendingCount - prevCountRef.current
        toast.success(`🔔 ${diff} ta yangi buyurtma!`, { duration: 5000 })
        haptic.medium()
      }
      prevCountRef.current = pendingCount
      setOrders(mapped)
    } catch {
      if (orders.length === 0) setOrders(mockOrders as any)
    } finally {
      setLoading(false)
    }
  }, [mockOrders])

  useEffect(() => {
    fetchOrders()
    const t = setInterval(fetchOrders, 3000) // 3 soniyada bir
    return () => clearInterval(t)
  }, [fetchOrders])

  const handleNext = async (order: Order) => {
    const next = ORDER_STATUS_NEXT[order.status]
    if (!next) return
    haptic.medium()
    if (next === 'on_the_way') { setCourierModal(order); return }
    try {
      await ordersAPI.adminUpdateStatus(order.id, next.toUpperCase())
      toast.success(`✅ ${ORDER_STATUS_LABELS[next]}`)
      await fetchOrders()
    } catch {
      toast.error('Xato yuz berdi')
    }
    updateOrderStatus(order.id, next)
  }

  const handleCourierAssign = async (courierId: number) => {
    if (!courierModal) return
    haptic.success()
    try {
      await ordersAPI.adminUpdateStatus(courierModal.id, 'ON_THE_WAY', { courierId })
      await fetchOrders()
    } catch {}
    assignCourier(courierModal.id, courierId)
    const c = MOCK_COURIERS.find(c=>c.id===courierId)
    toast.success(`🛵 ${c?.name || 'Kuryer'} tayinlandi!`)
    setCourierModal(null)
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    haptic.heavy()
    try {
      await ordersAPI.adminUpdateStatus(cancelTarget.id, 'CANCELLED')
      await fetchOrders()
    } catch {}
    cancelOrder(cancelTarget.id)
    toast.error('❌ Buyurtma bekor qilindi')
    setCancelTarget(null)
    if (detailOrder?.id === cancelTarget.id) setDetailOrder(null)
  }

  const displayOrders = orders.length > 0 ? orders : (mockOrders as any)
  
  const filtered = displayOrders.filter((o: Order) => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o as any).customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.includes(search)
    return matchStatus && matchSearch
  })

  const pendingCount = displayOrders.filter((o: Order) => o.status === 'pending').length
  const activeCount  = displayOrders.filter((o: Order) => 
    !['delivered','cancelled'].includes(o.status)).length

  const STATUS_FILTERS: (OrderStatus|'all')[] = ['all','pending','accepted','preparing','ready','on_the_way','delivered','cancelled']
  const STATUS_LABELS: Record<string, string> = {
    all:'Barchasi', pending:'Yangi', accepted:'Qabul', preparing:'Tayyorlanmoqda',
    ready:'Tayyor', on_the_way:"Yo'lda", delivered:'Yetkazildi', cancelled:'Bekor'
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Buyurtmalar"
        subtitle={`${displayOrders.length} ta jami · ${pendingCount} ta yangi`}
      />

      {/* Search */}
      <div className={styles.searchWrap}>
        <input className={styles.searchInput}
          placeholder="ID yoki mijoz ismi..."
          value={search} onChange={e => setSearch(e.target.value)} />
        {loading && <div className={styles.loadingDot} />}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {STATUS_FILTERS.map(s => {
          const cnt = s === 'all' ? displayOrders.length 
            : displayOrders.filter((o: Order) => o.status === s).length
          if (cnt === 0 && s !== 'all' && s !== 'pending') return null
          return (
            <button key={s}
              className={clsx(styles.filterBtn, filter === s && styles.filterActive,
                s === 'pending' && cnt > 0 && styles.filterPending)}
              onClick={() => setFilter(s)}>
              {s === 'pending' && cnt > 0 && <span className={styles.filterDot} />}
              {STATUS_LABELS[s]}
              {cnt > 0 && <span className={styles.filterCount}>{cnt}</span>}
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div style={{fontSize:48,marginBottom:12}}>📭</div>
            <div>Buyurtma topilmadi</div>
          </div>
        ) : filtered.map((order: Order) => (
          <OrderCard key={order.id} order={order} fmt={fmt}
            onDetail={() => { haptic.light(); setDetailOrder(order) }}
            onNext={() => handleNext(order)}
            onCancel={() => setCancelTarget(order)}
          />
        ))}
      </div>

      {/* Detail modal */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder} fmt={fmt}
          onClose={() => setDetailOrder(null)}
          onNext={() => { handleNext(detailOrder); setDetailOrder(null) }}
          onCancel={() => { setCancelTarget(detailOrder); setDetailOrder(null) }}
        />
      )}

      {/* Cancel confirm */}
      {cancelTarget && (
        <div className={styles.overlay} onClick={() => setCancelTarget(null)}>
          <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
            <div style={{fontSize:48,marginBottom:12}}>❌</div>
            <h3 className={styles.confirmTitle}>Bekor qilinsinmi?</h3>
            <p className={styles.confirmSub}>{cancelTarget.id}</p>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className={styles.confirmNo} onClick={() => setCancelTarget(null)}>Yo'q</button>
              <button className={styles.confirmYes} onClick={confirmCancel}>Ha, bekor qil</button>
            </div>
          </div>
        </div>
      )}

      {/* Courier modal */}
      {courierModal && (
        <div className={styles.overlay} onClick={() => setCourierModal(null)}>
          <div className={styles.courierCard} onClick={e => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>🛵 Kuryer tanlash</h3>
            {MOCK_COURIERS.map(c => (
              <button key={c.id} className={styles.courierItem}
                onClick={() => handleCourierAssign(c.id)}>
                <span>🛵 {c.name}</span>
                <span className={styles.courierPhone}>{c.phone}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  )
}

// ── Order Card ──
function OrderCard({ order, fmt, onDetail, onNext, onCancel }: any) {
  const elapsed = useElapsed(order.createdAt)
  const col     = STATUS_COLORS[order.status] || { bg:'#f0f0f0', text:'#666' }
  const next    = ORDER_STATUS_NEXT[order.status]

  return (
    <div className={clsx(styles.card, order.status === 'pending' && styles.cardNew)}
      onClick={onDetail}>
      <div className={styles.cardTop}>
        <div>
          <div className={styles.cardId}>{order.orderNumber || order.id}</div>
          <div className={styles.cardTime}>⏱ {elapsed}</div>
        </div>
        <div className={styles.cardStatus} style={{ background: col.bg, color: col.text }}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </div>
      </div>

      <div className={styles.cardMeta}>
        <span>👤 {(order as any).customerName || 'Mijoz'}</span>
        <span>📞 {order.phone}</span>
      </div>

      <div className={styles.cardItems}>
        {(order.items || []).slice(0,3).map((i: any, idx: number) => (
          <span key={idx}>{i.menuItem?.emoji || '🍔'} {i.menuItem?.name}</span>
        ))}
        {(order.items || []).length > 3 && <span>+{order.items.length-3} ta</span>}
      </div>

      <div className={styles.cardBottom}>
        <div className={styles.cardTotal}>{fmt(order.totalPrice)}</div>
        <div className={styles.cardActions} onClick={e => e.stopPropagation()}>
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <>
              <button className={styles.cancelBtn} onClick={onCancel}>✕</button>
              {next && (
                <button className={styles.nextBtn} onClick={onNext}>
                  {ORDER_STATUS_LABELS[next]} →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Order Detail Modal ──
function OrderDetailModal({ order, fmt, onClose, onNext, onCancel }: any) {
  const elapsed = useElapsed(order?.createdAt)
  if (!order) return null

  const col  = STATUS_COLORS[order.status] || { bg:'#f0f0f0', text:'#666' }
  const next = ORDER_STATUS_NEXT[order.status]

  const createdTime = order.createdAt ? new Date(order.createdAt).toLocaleString('uz-UZ', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  }) : ''

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detailSheet} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />

        {/* Header */}
        <div className={styles.detailHeader}>
          <div>
            <div className={styles.detailId}>{order.orderNumber || order.id}</div>
            <div className={styles.detailTime}>{createdTime}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div className={styles.detailStatus} style={{ background:col.bg, color:col.text }}>
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </div>
            <div className={styles.detailElapsed}>⏱ {elapsed} oldin</div>
          </div>
        </div>

        {/* Customer */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>👤 Mijoz</div>
          <div className={styles.detailRow}>
            <span>Ismi</span>
            <span>{(order as any).customerName || order.user?.firstName || 'Noma\'lum'}</span>
          </div>
          <div className={styles.detailRow}>
            <span>Telefon</span>
            <a href={`tel:${order.phone}`} className={styles.phoneLink}>{order.phone}</a>
          </div>
          {order.secondPhone && (
            <div className={styles.detailRow}>
              <span>2-telefon</span>
              <a href={`tel:${order.secondPhone}`} className={styles.phoneLink}>{order.secondPhone}</a>
            </div>
          )}
          {(order as any).customerUsername && (
            <div className={styles.detailRow}>
              <span>Telegram</span>
              <a href={`https://t.me/${(order as any).customerUsername}`} target="_blank" rel="noreferrer" className={styles.phoneLink}>
                @{(order as any).customerUsername}
              </a>
            </div>
          )}
        </div>

        {/* Delivery */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>📍 Yetkazish</div>
          <div className={styles.detailRow}>
            <span>Turi</span>
            <span>{order.deliveryType === 'pickup' ? '🏃 Olib ketish' : '🛵 Yetkazish'}</span>
          </div>
          {order.address && (
            <div className={styles.detailRow}>
              <span>Manzil</span>
              <span>{order.address}</span>
            </div>
          )}
          {order.addressDetail && (
            <div className={styles.detailRow}>
              <span>Qo'shimcha</span>
              <span>{order.addressDetail}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span>To'lov</span>
            <span>{order.paymentType === 'cash' ? '💵 Naqd' : order.paymentType}</span>
          </div>
        </div>

        {/* Items */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>🍔 Buyurtma tarkibi</div>
          {(order.items || []).map((item: any, idx: number) => (
            <div key={idx} className={styles.detailItem}>
              <span style={{fontSize:20}}>{item.menuItem?.emoji || '🍔'}</span>
              <span style={{flex:1}}>{item.menuItem?.name || 'Taom'}</span>
              <span style={{color:'var(--text-muted)'}}>×{item.quantity}</span>
              <span style={{fontWeight:700}}>{fmt(item.totalPrice || item.price || 0)}</span>
            </div>
          ))}
          <div className={styles.detailTotal}>
            <span>Taomlar</span><span>{fmt(order.subtotal || 0)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className={styles.detailRow}>
              <span>Yetkazish</span><span>{fmt(order.deliveryFee)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className={styles.detailRow} style={{color:'var(--green)'}}>
              <span>Chegirma</span><span>−{fmt(order.discount)}</span>
            </div>
          )}
          <div className={styles.detailGrandTotal}>
            <span>JAMI</span><span>{fmt(order.totalPrice)}</span>
          </div>
        </div>

        {order.note && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>📝 Izoh</div>
            <div className={styles.noteText}>{order.note}</div>
          </div>
        )}

        {/* Actions */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className={styles.detailActions}>
            <button className={styles.detailCancelBtn} onClick={onCancel}>❌ Bekor qilish</button>
            {next && (
              <button className={styles.detailNextBtn} onClick={onNext}>
                ✅ {ORDER_STATUS_LABELS[next]}
              </button>
            )}
          </div>
        )}

        <div style={{height:24}} />
      </div>
    </div>
  )
}
