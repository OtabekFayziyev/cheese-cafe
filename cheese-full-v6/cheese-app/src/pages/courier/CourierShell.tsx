import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Package, Map, ClipboardList, UserCircle, Wifi, WifiOff } from 'lucide-react'
import { useCourierStore } from '@/store/courierStore'
import { useCourierData } from '@/hooks/useCourierData'
import { useTelegram } from '@/hooks'
import styles from './CourierShell.module.css'

const NAV = [
  { path:'/courier',           Icon: Package,       label:'Vazifalar' },
  { path:'/courier/map',       Icon: Map,           label:'Xarita'    },
  { path:'/courier/history',   Icon: ClipboardList, label:'Tarix'     },
  { path:'/courier/profile',   Icon: UserCircle,    label:'Profil'    },
]

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(i)
  }, [])
  const uzb = new Date(t.getTime() + 5*60*60*1000)
  const hh  = String(uzb.getUTCHours()).padStart(2,'0')
  const mm  = String(uzb.getUTCMinutes()).padStart(2,'0')
  const ss  = String(uzb.getUTCSeconds()).padStart(2,'0')
  return <div className={styles.clock}>{hh}:{mm}:{ss}</div>
}

export function CourierShell({ children }: { children: React.ReactNode }) {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const { haptic }   = useTelegram()
  const { profile, setOnline, activeOrders } = useCourierStore()
  useCourierData() // Real data

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>🧀</div>
          <div>
            <div className={styles.logoText}>CHEESE</div>
            <div className={styles.logoSub}>Kuryer Panel</div>
          </div>
        </div>

        <LiveClock />

        <button
          className={clsx(styles.onlineBtn, profile.isOnline && styles.onlineOn)}
          onClick={() => { haptic.medium(); setOnline(!profile.isOnline) }}
        >
          {profile.isOnline
            ? <Wifi size={14} strokeWidth={2} />
            : <WifiOff size={14} strokeWidth={2} />
          }
          {profile.isOnline ? 'Online' : 'Offline'}
        </button>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.nav}>
        {NAV.map(({ path, Icon, label }) => {
          const active   = pathname === path || (path !== '/courier' && pathname.startsWith(path))
          const isTasks  = path === '/courier'
          return (
            <button key={path}
              className={clsx(styles.navItem, active && styles.navActive)}
              onClick={() => { haptic.light(); navigate(path) }}
            >
              <span className={styles.navIcon}>
                <Icon
                  size={21}
                  strokeWidth={active ? 2.2 : 1.6}
                  color={active ? 'var(--yellow)' : 'rgba(255,255,255,.45)'}
                />
                {isTasks && activeOrders.length > 0 && (
                  <span className={styles.navBadge}>{activeOrders.length}</span>
                )}
              </span>
              <span className={styles.navLabel}>{label}</span>
              {active && <span className={styles.navBar} />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function CourierPageHeader({ title, subtitle, action }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
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
