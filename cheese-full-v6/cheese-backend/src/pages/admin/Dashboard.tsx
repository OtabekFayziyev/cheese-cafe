import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useAdminStore, ORDER_STATUS_LABELS } from '@/store/adminStore'
import { useFormat, useTelegram } from '@/hooks'
import { AdminShell, AdminPageHeader } from './AdminShell'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const { fmt } = useFormat()
  const { orders, settings } = useAdminStore()

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today)
    return {
      total:     orders.length,
      pending:   orders.filter(o => o.status === 'pending').length,
      active:    orders.filter(o => ['accepted','preparing','ready','on_the_way'].includes(o.status)).length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      todayRev:  todayOrders.reduce((s, o) => s + o.totalPrice, 0),
      todayCount: todayOrders.length,
      weekRev:   orders.reduce((s, o) => s + o.totalPrice, 0),
    }
  }, [orders])

  // Recent + pending orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)

  const pendingOrders = orders.filter(o => o.status === 'pending')

  const statusColor: Record<string, string> = {
    pending:    '#F59E0B',
    accepted:   '#3B82F6',
    preparing:  '#8B5CF6',
    ready:      '#10B981',
    on_the_way: '#06B6D4',
    delivered:  '#22C55E',
    cancelled:  '#EF4444',
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Dashboard"
        subtitle={`Bugun · ${new Date().toLocaleDateString('uz-UZ')}`}
      />

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ borderColor: '#F5C800' }}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statValue}>{fmt(stats.todayRev)}</div>
          <div className={styles.statLabel}>Bugungi daromad</div>
        </div>
        <div className={styles.statCard} style={{ borderColor: '#F59E0B' }}>
          <div className={styles.statIcon}>🔔</div>
          <div className={styles.statValue}>{stats.pending}</div>
          <div className={styles.statLabel}>Yangi buyurtma</div>
          {stats.pending > 0 && <div className={styles.statBadge}>{stats.pending}</div>}
        </div>
        <div className={styles.statCard} style={{ borderColor: '#3B82F6' }}>
          <div className={styles.statIcon}>⚡</div>
          <div className={styles.statValue}>{stats.active}</div>
          <div className={styles.statLabel}>Aktiv</div>
        </div>
        <div className={styles.statCard} style={{ borderColor: '#22C55E' }}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statValue}>{stats.delivered}</div>
          <div className={styles.statLabel}>Yetkazildi</div>
        </div>
      </div>

      {/* Revenue bar */}
      <div className={styles.revenueCard}>
        <div className={styles.revenueTop}>
          <div>
            <div className={styles.revenueTitle}>Haftalik daromad</div>
            <div className={styles.revenueVal}>{fmt(stats.weekRev)}</div>
          </div>
          <div className={styles.revenueOrders}>{stats.todayCount} ta bugun</div>
        </div>
        <div className={styles.revenueBars}>
          {['Du', 'Se', 'Ch', 'Pa', 'Sh', 'Ya', 'Bu'].map((d, i) => {
            const h = 20 + Math.floor(Math.random() * 70)
            const isToday = i === 6
            return (
              <div key={d} className={styles.revenueBarWrap}>
                <div
                  className={clsx(styles.revenueBar, isToday && styles.revenueBarToday)}
                  style={{ height: `${h}%` }}
                />
                <div className={clsx(styles.revenueBarLabel, isToday && styles.revenueBarLabelToday)}>{d}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending alert */}
      {pendingOrders.length > 0 && (
        <div className={styles.alertBanner} onClick={() => { haptic.medium(); navigate('/admin/orders?status=pending') }}>
          <div className={styles.alertIcon}>🔔</div>
          <div className={styles.alertText}>
            <div className={styles.alertTitle}>{pendingOrders.length} ta yangi buyurtma kutmoqda!</div>
            <div className={styles.alertSub}>Ko'rish uchun bosing →</div>
          </div>
          <div className={styles.alertArrow}>›</div>
        </div>
      )}

      {/* Recent orders */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Oxirgi buyurtmalar</span>
        <button className={styles.sectionLink} onClick={() => navigate('/admin/orders?status=pending')}>
          Barchasi →
        </button>
      </div>

      <div className={styles.orderList}>
        {recentOrders.map(order => (
          <div
            key={order.id}
            className={styles.orderRow}
            onClick={() => { haptic.light(); navigate(`/admin/orders?id=${order.id}`) }}
          >
            <div className={styles.orderLeft}>
              <div className={styles.orderId}>{order.id}</div>
              <div className={styles.orderMeta}>
                {order.items.length} ta taom · {order.deliveryType === 'pickup' ? '🏃 Olib ketish' : '🛵 Yetkazish'}
              </div>
              <div className={styles.orderTime}>
                {new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className={styles.orderRight}>
              <div className={styles.orderPrice}>{fmt(order.totalPrice)}</div>
              <div
                className={styles.orderStatus}
                style={{ background: statusColor[order.status] + '22', color: statusColor[order.status] }}
              >
                {ORDER_STATUS_LABELS[order.status]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick stats bottom */}
      <div className={styles.quickStats}>
        <div className={styles.quickStat}>
          <div className={styles.quickIcon}>🍕</div>
          <div className={styles.quickNum}>{useAdminStore.getState().menuItems.length}</div>
          <div className={styles.quickLabel}>Taom</div>
        </div>
        <div className={styles.quickStat}>
          <div className={styles.quickIcon}>🚴</div>
          <div className={styles.quickNum}>3</div>
          <div className={styles.quickLabel}>Kuryer</div>
        </div>
        <div className={styles.quickStat}>
          <div className={styles.quickIcon}>⭐</div>
          <div className={styles.quickNum}>4.8</div>
          <div className={styles.quickLabel}>Reyting</div>
        </div>
        <div className={styles.quickStat}>
          <div className={styles.quickIcon}>{settings.isOpen ? '🟢' : '🔴'}</div>
          <div className={styles.quickNum}>{settings.isOpen ? 'Ochiq' : 'Yopiq'}</div>
          <div className={styles.quickLabel}>Holat</div>
        </div>
      </div>

      <div style={{ height: 16 }} />
    </AdminShell>
  )
}
