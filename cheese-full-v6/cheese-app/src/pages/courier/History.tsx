import React, { useMemo } from 'react'
import { useCourierStore } from '@/store/courierStore'
import { useFormat } from '@/hooks'
import { CourierShell, CourierPageHeader } from './CourierShell'
import styles from './History.module.css'

export default function History() {
  const { fmt } = useFormat()
  const { history, stats } = useCourierStore()

  const today = new Date().toDateString()
  const todayOrders = history.filter(o => new Date(o.updatedAt!).toDateString() === today)
  const groups = useMemo(() => {
    const map: Record<string, typeof history> = {}
    history.forEach(o => {
      const d = new Date(o.updatedAt!).toLocaleDateString('uz-UZ',{day:'2-digit',month:'long'})
      if (!map[d]) map[d] = []
      map[d].push(o)
    })
    return Object.entries(map)
  }, [history])

  return (
    <CourierShell>
      <CourierPageHeader
        title="Tarix"
        subtitle={`${history.length} ta yetkazma`}
      />

      {/* Weekly summary */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryDecor}>🛵</div>
        <div className={styles.summaryTitle}>Haftalik hisobot</div>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <div className={styles.summaryVal}>{stats.weekDeliveries}</div>
            <div className={styles.summaryLbl}>Yetkazma</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryVal}>{fmt(stats.weekEarnings)}</div>
            <div className={styles.summaryLbl}>Daromad</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryVal}>⭐ {stats.rating}</div>
            <div className={styles.summaryLbl}>Reyting</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryVal}>{stats.totalDeliveries}</div>
            <div className={styles.summaryLbl}>Jami</div>
          </div>
        </div>
      </div>

      {/* Today summary */}
      {todayOrders.length > 0 && (
        <div className={styles.todayCard}>
          <span className={styles.todayIcon}>☀️</span>
          <div>
            <div className={styles.todayTitle}>Bugun</div>
            <div className={styles.todaySub}>{stats.todayDeliveries} ta · {fmt(stats.todayEarnings)}</div>
          </div>
        </div>
      )}

      {/* Grouped history */}
      {groups.map(([date, orders]) => (
        <div key={date}>
          <div className={styles.groupDate}>{date}</div>
          <div className={styles.groupList}>
            {orders.map((order, idx) => (
              <div key={order.id} className={styles.historyRow} style={{animationDelay:`${idx*.04}s`}}>
                <div className={styles.hRowLeft}>
                  <div className={styles.hIcon}>
                    {order.deliveryType==='pickup'?'🏃':'🛵'}
                  </div>
                  <div>
                    <div className={styles.hId}>{order.id}</div>
                    <div className={styles.hItems}>
                      {order.items.map((i:any)=>i.menuItem.emoji).join(' ')} · {order.items.length} ta taom
                    </div>
                    <div className={styles.hTime}>
                      {new Date(order.updatedAt!).toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                </div>
                <div className={styles.hRowRight}>
                  <div className={styles.hEarned}>+{fmt(order.deliveryFee||5000)}</div>
                  <div className={styles.hTotal}>{fmt(order.totalPrice)}</div>
                  <div className={styles.hDone}>✅</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {history.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <div className={styles.emptyText}>Hali yetkazma yo'q</div>
        </div>
      )}

      <div style={{height:16}} />
    </CourierShell>
  )
}
