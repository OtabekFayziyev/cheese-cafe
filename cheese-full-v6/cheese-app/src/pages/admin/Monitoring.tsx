import React, { useState, useMemo } from 'react'
import clsx from 'clsx'
import { useAdminStore } from '@/store/adminStore'
import { useFormat, useTelegram } from '@/hooks'
import { AdminShell, AdminPageHeader } from './AdminShell'
import styles from './Monitoring.module.css'

type Period = 'today' | 'week' | 'month' | 'custom'

function startOf(period: Period, from?: string, to?: string): [Date, Date] {
  const now   = new Date()
  const end   = new Date(now)
  end.setHours(23, 59, 59, 999)
  if (period === 'today') {
    const s = new Date(now); s.setHours(0,0,0,0)
    return [s, end]
  }
  if (period === 'week') {
    const s = new Date(now); s.setDate(now.getDate()-6); s.setHours(0,0,0,0)
    return [s, end]
  }
  if (period === 'month') {
    const s = new Date(now); s.setDate(now.getDate()-29); s.setHours(0,0,0,0)
    return [s, end]
  }
  // custom
  const s = from ? new Date(from+'T00:00:00') : new Date(now.setDate(now.getDate()-6))
  const e = to   ? new Date(to+'T23:59:59')   : new Date()
  return [s, e]
}

export default function Monitoring() {
  const { haptic } = useTelegram()
  const { fmt }    = useFormat()
  const { orders, menuItems } = useAdminStore()

  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<Period>('week')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')

  const [start, end] = startOf(period, fromDate, toDate)

  const filtered = useMemo(() =>
    orders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= start && d <= end
    }),
    [orders, start, end]
  )

  const delivered = filtered.filter(o => o.status === 'delivered')
  const cancelled = filtered.filter(o => o.status === 'cancelled')
  const active    = filtered.filter(o => !['delivered','cancelled'].includes(o.status))

  const totalRevenue = delivered.reduce((s,o) => s+o.totalPrice, 0)
  const avgOrder     = delivered.length ? Math.floor(totalRevenue / delivered.length) : 0
  const successRate  = filtered.length  ? Math.round(delivered.length / filtered.length * 100) : 0

  // Top items
  const itemSales = useMemo(() => {
    const map: Record<string, { name:string; emoji:string; qty:number; revenue:number }> = {}
    delivered.forEach(o => o.items.forEach((it:any) => {
      const id = it.menuItem.id
      if (!map[id]) map[id] = { name:it.menuItem.name, emoji:it.menuItem.emoji, qty:0, revenue:0 }
      map[id].qty     += it.quantity
      map[id].revenue += it.price
    }))
    return Object.values(map).sort((a,b) => b.qty-a.qty).slice(0,6)
  }, [delivered])

  // Daily chart data (last 7 days)
  const chartDays = useMemo(() => {
    const days: { label:string; revenue:number; count:number }[] = []
    for (let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0)
      const e = new Date(d); e.setHours(23,59,59,999)
      const dayOrders = orders.filter(o => {
        const od = new Date(o.createdAt)
        return od >= d && od <= e && o.status==='delivered'
      })
      const dayLabels = ['Yak','Dush','Sesh','Chor','Pay','Jum','Shan']
      days.push({
        label: i===0 ? 'Bugun' : dayLabels[d.getDay()],
        revenue: dayOrders.reduce((s,o) => s+o.totalPrice, 0),
        count:   dayOrders.length,
      })
    }
    return days
  }, [orders])

  const maxRevenue = Math.max(...chartDays.map(d=>d.revenue), 1)

  // Payment split
  const cashCount   = delivered.filter(o=>o.paymentType==='cash').length
  const onlineCount = delivered.filter(o=>o.paymentType!=='cash').length
  const deliveryCount = delivered.filter(o=>o.deliveryType==='delivery').length
  const pickupCount   = delivered.filter(o=>o.deliveryType==='pickup').length

  return (
    <AdminShell>
      <AdminPageHeader title="Monitoring" subtitle="Savdo tahlili va statistika" />

      {/* Period selector */}
      <div className={styles.periodRow}>
        {([
          {k:'today',  l:'Bugun'},
          {k:'week',   l:'7 kun'},
          {k:'month',  l:'30 kun'},
          {k:'custom', l:'Maxsus'},
        ] as {k:Period;l:string}[]).map(p => (
          <button key={p.k}
            className={clsx(styles.periodBtn, period===p.k && styles.periodActive)}
            onClick={() => { haptic.light(); setPeriod(p.k) }}
          >
            {p.l}
          </button>
        ))}
      </div>

      {period==='custom' && (
        <div className={styles.dateRow}>
          <input type="date" className={styles.dateInput}
            value={fromDate} onChange={e=>setFromDate(e.target.value)} />
          <span className={styles.dateSep}>—</span>
          <input type="date" className={styles.dateInput}
            value={toDate} onChange={e=>setToDate(e.target.value)} />
        </div>
      )}

      {/* KPI cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpi} style={{borderColor:'#F5C800'}}>
          <div className={styles.kpiIcon}>💰</div>
          <div className={styles.kpiVal}>{fmt(totalRevenue)}</div>
          <div className={styles.kpiLabel}>Daromad</div>
        </div>
        <div className={styles.kpi} style={{borderColor:'#22C55E'}}>
          <div className={styles.kpiIcon}>📦</div>
          <div className={styles.kpiVal}>{delivered.length}</div>
          <div className={styles.kpiLabel}>Yetkazildi</div>
        </div>
        <div className={styles.kpi} style={{borderColor:'#3B82F6'}}>
          <div className={styles.kpiIcon}>📊</div>
          <div className={styles.kpiVal}>{fmt(avgOrder)}</div>
          <div className={styles.kpiLabel}>O'rtacha</div>
        </div>
        <div className={styles.kpi} style={{borderColor:'#8B5CF6'}}>
          <div className={styles.kpiIcon}>✅</div>
          <div className={styles.kpiVal}>{successRate}%</div>
          <div className={styles.kpiLabel}>Muvaffaqiyat</div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>Kunlik daromad (so'm)</div>
        <div className={styles.chart}>
          {chartDays.map((d, i) => (
            <div key={i} className={styles.chartCol}>
              <div className={styles.chartBarWrap}>
                <div className={styles.chartBarVal} style={{ opacity: d.revenue>0?1:0 }}>
                  {d.count}
                </div>
                <div
                  className={clsx(styles.chartBar, i===6 && styles.chartBarToday)}
                  style={{ height:`${Math.max(4, (d.revenue/maxRevenue)*100)}%` }}
                />
              </div>
              <div className={clsx(styles.chartLabel, i===6 && styles.chartLabelToday)}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top items */}
      <div className={styles.sectionTitle}>🏆 Ko'p sotilgan taomlar</div>
      <div className={styles.topList}>
        {itemSales.length === 0 && <div className={styles.noData}>Ma'lumot yo'q</div>}
        {itemSales.map((item, i) => (
          <div key={item.name} className={styles.topItem}>
            <div className={styles.topRank}>#{i+1}</div>
            <div className={styles.topEmoji}>{item.emoji}</div>
            <div className={styles.topInfo}>
              <div className={styles.topName}>{item.name}</div>
              <div className={styles.topMeta}>{item.qty} ta · {fmt(item.revenue)}</div>
            </div>
            <div className={styles.topBar}>
              <div className={styles.topBarFill}
                style={{ width:`${Math.round(item.qty/(itemSales[0]?.qty||1)*100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Split stats */}
      <div className={styles.splitGrid}>
        <div className={styles.splitCard}>
          <div className={styles.splitTitle}>To'lov usuli</div>
          <div className={styles.splitRow}>
            <span>💵 Naqd</span>
            <span className={styles.splitVal}>{cashCount}</span>
          </div>
          <div className={styles.splitRow}>
            <span>📱 Online</span>
            <span className={styles.splitVal}>{onlineCount}</span>
          </div>
          <div className={styles.splitBar}>
            <div className={styles.splitFill1} style={{ width:`${cashCount+onlineCount>0?Math.round(cashCount/(cashCount+onlineCount)*100):50}%` }} />
          </div>
        </div>
        <div className={styles.splitCard}>
          <div className={styles.splitTitle}>Yetkazish turi</div>
          <div className={styles.splitRow}>
            <span>🛵 Yetkazish</span>
            <span className={styles.splitVal}>{deliveryCount}</span>
          </div>
          <div className={styles.splitRow}>
            <span>🏃 Olib ketish</span>
            <span className={styles.splitVal}>{pickupCount}</span>
          </div>
          <div className={styles.splitBar}>
            <div className={styles.splitFill2} style={{ width:`${deliveryCount+pickupCount>0?Math.round(deliveryCount/(deliveryCount+pickupCount)*100):50}%` }} />
          </div>
        </div>
      </div>

      <div style={{height:16}} />
    </AdminShell>
  )
}
