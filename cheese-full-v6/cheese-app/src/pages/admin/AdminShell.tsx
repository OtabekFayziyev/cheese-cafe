import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed,
  TrendingUp, Users, Settings, Power, Wifi, WifiOff
} from 'lucide-react'
import { useAdminStore } from '@/store/adminStore'
import { useAdminData } from '@/hooks/useAdminData'
import { ordersAPI, settingsAPI } from '@/api/client'
import { useTelegram } from '@/hooks'
import styles from './AdminShell.module.css'

const NAV = [
  { path:'/admin',            Icon: LayoutDashboard, label:'Dashboard' },
  { path:'/admin/orders',     Icon: ShoppingBag,     label:'Buyurtma'  },
  { path:'/admin/menu',       Icon: UtensilsCrossed, label:'Menyu'     },
  { path:'/admin/monitoring', Icon: TrendingUp,      label:'Monitor'   },
  { path:'/admin/customers',  Icon: Users,           label:'Mijozlar'  },
  { path:'/admin/settings',   Icon: Settings,        label:'Sozlama'   },
]

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(i)
  }, [])
  const h = String(t.getHours()).padStart(2,'0')
  const m = String(t.getMinutes()).padStart(2,'0')
  const s = String(t.getSeconds()).padStart(2,'0')
  const days = ['Yak','Dush','Sesh','Chor','Pay','Jum','Shan']
  const months = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']
  return (
    <div className={styles.clockWrap}>
      <div className={styles.clockTime}>{h}:{m}:{s}</div>
      <div className={styles.clockDate}>
        {days[t.getDay()]}, {t.getDate()} {months[t.getMonth()]}. {t.getFullYear()}
      </div>
    </div>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const { haptic }   = useTelegram()
  const { settings, setIsOpen, orders } = useAdminStore()

  useAdminData() // Real data for all pages

  const [newOrderPopup, setNewOrderPopup] = useState<any>(null)
  const prevPendingRef = useRef(0)

  // Global new order polling
  useEffect(() => {
    const poll = async () => {
      try {
        const data   = await ordersAPI.adminGetAll({ limit: 200 })
        const list   = data.orders || data || []
        const cnt    = list.filter((o: any) => o.status?.toLowerCase() === 'pending').length
        if (prevPendingRef.current > 0 && cnt > prevPendingRef.current) {
          haptic.medium()
          const newest = list
            .filter((o: any) => o.status?.toLowerCase() === 'pending')
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
          if (newest) setNewOrderPopup(newest)
        }
        prevPendingRef.current = cnt
      } catch {}
    }
    poll()
    const t = setInterval(poll, 5000)
    return () => clearInterval(t)
  }, [])

  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <div className={styles.shell}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>🧀</div>
          <div>
            <div className={styles.logoText}>CHEESE</div>
            <div className={styles.logoSub}>Admin Panel</div>
          </div>
        </div>

        <LiveClock />

        <button
          className={clsx(styles.toggleBtn, settings.isOpen && styles.toggleOpen)}
          onClick={async () => {
            haptic.medium()
            const newVal = !settings.isOpen
            setIsOpen(newVal)
            ;(window as any).__cafeIsOpen = newVal
            try { await settingsAPI.update({ isOpen: String(newVal) }) } catch {}
          }}
        >
          {settings.isOpen ? <Wifi size={14} /> : <WifiOff size={14} />}
          {settings.isOpen ? 'Ochiq' : 'Yopiq'}
        </button>
      </header>

      {/* Content */}
      <main className={styles.main}>{children}</main>

      {/* Bottom nav */}
      <nav className={styles.nav}>
        {NAV.map(({ path, Icon, label }) => {
          const active   = pathname === path || (path !== '/admin' && pathname.startsWith(path))
          const isOrders = path === '/admin/orders'
          return (
            <button key={path}
              className={clsx(styles.navItem, active && styles.navActive)}
              onClick={() => { haptic.light(); navigate(path) }}
            >
              <span className={styles.navIcon}>
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  color={active ? 'var(--yellow)' : 'rgba(255,255,255,.45)'}
                />
                {isOrders && pendingCount > 0 && (
                  <span className={styles.navBadge}>{pendingCount > 9 ? '9+' : pendingCount}</span>
                )}
              </span>
              <span className={styles.navLabel}>{label}</span>
              {active && <span className={styles.navBar} />}
            </button>
          )
        })}
      </nav>

      {/* New order popup */}
      {newOrderPopup && (
        <div style={{
          position:'fixed', inset:0, zIndex:500,
          background:'rgba(0,0,0,.75)', backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'20px',
        }}>
          <div style={{
            background:'var(--surface)', borderRadius:24, padding:'24px 20px',
            width:'100%', maxWidth:340,
            border:'2px solid var(--yellow)',
            boxShadow:'0 0 40px rgba(245,200,0,.3)',
          }}>
            <div style={{textAlign:'center', marginBottom:16}}>
              <div style={{fontSize:48}}>🔔</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'var(--yellow)', marginTop:8}}>
                YANGI BUYURTMA!
              </div>
              <div style={{fontSize:13, color:'var(--text-muted)', marginTop:4}}>
                {newOrderPopup.orderNumber || newOrderPopup.id}
              </div>
            </div>

            <div style={{background:'var(--surface-2)', borderRadius:12, padding:12, marginBottom:14}}>
              <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:4}}>
                👤 {newOrderPopup.customerName || 'Mijoz'}
              </div>
              <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:8}}>
                📞 {newOrderPopup.phone}
              </div>
              {(newOrderPopup.items || []).slice(0,3).map((item: any, i: number) => (
                <div key={i} style={{fontSize:13, padding:'3px 0', color:'var(--text-primary)'}}>
                  {item.menuItem?.emoji} {item.menuItem?.name} ×{item.quantity}
                </div>
              ))}
              <div style={{
                display:'flex', justifyContent:'space-between',
                fontFamily:"'Bebas Neue',sans-serif", fontSize:20,
                marginTop:8, borderTop:'1px solid var(--border)', paddingTop:8,
              }}>
                <span style={{color:'var(--text-primary)'}}>JAMI</span>
                <span style={{color:'var(--yellow)'}}>
                  {newOrderPopup.totalPrice?.toLocaleString()} so'm
                </span>
              </div>
            </div>

            <div style={{display:'flex', gap:10}}>
              <button style={{
                flex:1, padding:13, borderRadius:12,
                background:'var(--surface-2)', border:'1.5px solid var(--border)',
                color:'var(--text-muted)', fontSize:14, fontWeight:700,
                cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
              }} onClick={() => setNewOrderPopup(null)}>
                Keyinroq
              </button>
              <button style={{
                flex:2, padding:13, borderRadius:12,
                background:'var(--yellow)', border:'none',
                color:'#1A1A1A', fontSize:14, fontWeight:700,
                cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
                boxShadow:'0 4px 16px rgba(245,200,0,.4)',
              }} onClick={() => { setNewOrderPopup(null); navigate('/admin/orders') }}>
                ✅ Ko'rish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminPageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSub}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
