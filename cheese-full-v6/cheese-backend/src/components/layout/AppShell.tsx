import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useCartStore } from '@/store'
import { useTelegram, useFormat } from '@/hooks'
import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { path:'/user',         icon:'🏠', label:'Asosiy'  },
  { path:'/user/search',  icon:'🔍', label:'Qidiruv' },
  { path:'/user/cart',    icon:'🛒', label:'Savat'   },
  { path:'/user/favs',    icon:'❤️', label:'Sevimli' },
  { path:'/user/profile', icon:'👤', label:'Profil'  },
]

interface AppShellProps {
  children: React.ReactNode
  showNav?: boolean
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  const navigate      = useNavigate()
  const { pathname }  = useLocation()
  const totalItems    = useCartStore(s => s.totalItems())
  const total         = useCartStore(s => s.total())
  const { haptic }    = useTelegram()
  const { fmt }       = useFormat()

  const isCartPage = pathname === '/user/cart'

  const handleNav = (path: string) => {
    haptic.light()
    navigate(path)
  }

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        {children}
      </main>

      {/* Floating cart button — cart sahifasida ko'rinmaydi */}
      {showNav && totalItems > 0 && !isCartPage && (
        <button
          className={styles.floatingCart}
          onClick={() => { haptic.medium(); navigate('/user/cart') }}
        >
          <div className={styles.fcLeft}>
            <span className={styles.fcCount}>{totalItems}</span>
            <span className={styles.fcLabel}>Savat</span>
          </div>
          <span className={styles.fcTotal}>{fmt(total)}</span>
          <span className={styles.fcArrow}>›</span>
        </button>
      )}

      {showNav && (
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => {
            const isActive  = pathname === item.path ||
              (item.path !== '/user' && pathname.startsWith(item.path))
            const isCart    = item.path === '/user/cart'

            return (
              <button
                key={item.path}
                className={clsx(styles.navItem, isActive && styles.navActive)}
                onClick={() => handleNav(item.path)}
              >
                <span className={styles.navIcon}>
                  {item.icon}
                  {isCart && totalItems > 0 && (
                    <span className={styles.cartBadge}>
                      {totalItems > 9 ? '9+' : totalItems}
                    </span>
                  )}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
                {isActive && <span className={styles.navBar} />}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

interface PageProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Page({ children, className, style }: PageProps) {
  return (
    <div className={clsx(styles.page, className)} style={style}>
      {children}
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={clsx(styles.sectionHeader, className)}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {action && <div className={styles.sectionAction}>{action}</div>}
    </div>
  )
}
