import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed,
  TrendingUp, Users, Settings, Power
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdminStore } from '@/store/adminStore'
import { ordersAPI } from '@/api/client'
import { useTelegram } from '@/hooks'
import styles from './AdminShell.module.css'

const NAV = [
  { path:'/admin',            Icon: LayoutDashboard,  label:'Dashboard' },
  { path:'/admin/orders',     Icon: ShoppingBag,      label:'Buyurtma'  },
  { path:'/admin/menu',       Icon: UtensilsCrossed,  label:'Menyu'     },
  { path:'/admin/monitoring', Icon: TrendingUp,       label:'Monitor'   },
  { path:'/admin/customers',  Icon: Users,            label:'Mijozlar'  },
  { path:'/admin/settings',   Icon: Settings,         label:'Sozlama'   },
]

// ── Clock ──
function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  // UZB time UTC+5
  const uzb = new Date(time.getTime() + 5*60*60*1000)
  const hh  = String(uzb.getUTCHours()).padStart(2,'0')
  const mm  = String(uzb.getUTCMinutes()).padStart(2,'0')
  const ss  = String(uzb.getUTCSeconds()).padStart(2,'0')
  const days = ['Yak','Dush','Sesh','Chor','Pay','Jum','Shan']
  const day = days[uzb.getUTCDay()]
  const date = `${uzb.getUTCDate()}.${String(uzb.getUTCMonth()+1).padStart(2,'0')}.${uzb.getUTCFullYear()}`
  return (
    <div className={styles.clock}>
      <div className={styles.clockTime}>{hh}:{mm}:{ss}</div>
      <div className={styles.clockDate}>{day}, {date}</div>
    </div>
  )
}

interface AdminShellProps { children: React.ReactNode }

export function AdminShell({ children }: AdminShellProps) {
  const navigate      = useNavigate()
  const { pathname }  = useLocation()
  const { haptic }    = useTelegram()
  const { settings, setIsOpen, orders } = useAdminStore()
  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <div className={styles.shell}>
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
          onClick={() => { haptic.medium(); setIsOpen(!settings.isOpen) }}
        >
          <span className={styles.toggleDot} />
          {settings.isOpen ? 'Ochiq' : 'Yopiq'}
        </button>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.nav}>
        {NAV.map(item => {
          const active = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))
          const isOrders = item.path === '/admin/orders'
          return (
            <button key={item.path}
              className={clsx(styles.navItem, active && styles.navActive)}
              onClick={() => { haptic.light(); navigate(item.path) }}
            >
              <span className={styles.navIcon}>
                <item.Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  color={active ? 'var(--yellow)' : 'rgba(255,255,255,.45)'}
                />
                {isOrders && pendingCount > 0 && (
                  <span className={styles.navBadge}>{pendingCount}</span>
                )}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
              {active && <span className={styles.navBar} />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function AdminPageHeader({ title, subtitle, action }: { title:string; subtitle?:string; action?:React.ReactNode }) {
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
