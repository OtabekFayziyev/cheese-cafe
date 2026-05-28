import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useCourierStore } from '@/store/courierStore'
import { useTelegram } from '@/hooks'
import styles from './CourierShell.module.css'

const NAV = [
  { path:'/courier',          icon:'📦', label:'Vazifalar' },
  { path:'/courier/map',      icon:'🗺️', label:'Xarita'   },
  { path:'/courier/history',  icon:'📋', label:'Tarix'    },
  { path:'/courier/profile',  icon:'👤', label:'Profil'   },
]

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i=setInterval(()=>setT(new Date()),1000); return()=>clearInterval(i) }, [])
  const uzb = new Date(t.getTime()+5*60*60*1000)
  const hh  = String(uzb.getUTCHours()).padStart(2,'0')
  const mm  = String(uzb.getUTCMinutes()).padStart(2,'0')
  const ss  = String(uzb.getUTCSeconds()).padStart(2,'0')
  return <div className={styles.clock}>{hh}:{mm}:{ss}</div>
}

interface CourierShellProps { children: React.ReactNode }

export function CourierShell({ children }: CourierShellProps) {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const { haptic }   = useTelegram()
  const { profile, setOnline, activeOrders } = useCourierStore()

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
          <span className={clsx(styles.onlineDot, profile.isOnline && styles.onlineDotOn)} />
          {profile.isOnline ? 'Online' : 'Offline'}
        </button>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.nav}>
        {NAV.map(item => {
          const active  = pathname===item.path || (item.path!=='/courier' && pathname.startsWith(item.path))
          const isTasks = item.path==='/courier'
          return (
            <button key={item.path}
              className={clsx(styles.navItem, active && styles.navActive)}
              onClick={() => { haptic.light(); navigate(item.path) }}
            >
              <span className={styles.navIcon}>
                {item.icon}
                {isTasks && activeOrders.length > 0 && (
                  <span className={styles.navBadge}>{activeOrders.length}</span>
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

export function CourierPageHeader({ title, subtitle, action }: { title:string; subtitle?:string; action?:React.ReactNode }) {
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
