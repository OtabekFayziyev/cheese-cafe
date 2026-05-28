import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  Home, Search, ShoppingCart, Heart, User,
} from 'lucide-react'
import { useCartStore } from '@/store'
import { useTelegram, useFormat } from '@/hooks'
import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { path: '/user',         Icon: Home,         label: 'Asosiy'  },
  { path: '/user/search',  Icon: Search,       label: 'Qidiruv' },
  { path: '/user/cart',    Icon: ShoppingCart, label: 'Savat'   },
  { path: '/user/favs',    Icon: Heart,        label: 'Sevimli' },
  { path: '/user/profile', Icon: User,         label: 'Profil'  },
]

interface AppShellProps {
  children:     React.ReactNode
  showNav?:     boolean
  // sticky header slot — renders OUTSIDE scroll area
  stickyHeader?: React.ReactNode
}

export function AppShell({ children, showNav = true, stickyHeader }: AppShellProps) {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const totalItems   = useCartStore(s => s.totalItems())
  const total        = useCartStore(s => s.total())
  const { haptic }   = useTelegram()
  const { fmt }      = useFormat()
  const isCartPage   = pathname === '/user/cart'

  return (
    <div className={styles.shell}>

      {/* ── Sticky header slot (does NOT scroll) ── */}
      {stickyHeader && (
        <div className={styles.stickyHeaderWrap}>
          {stickyHeader}
        </div>
      )}

      {/* ── Scrollable content ── */}
      <main className={styles.main}>
        {children}
      </main>

      {/* ── Floating cart ── */}
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

      {/* ── Bottom nav ── */}
      {showNav && (
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ path, Icon, label }) => {
            const active  = pathname === path ||
              (path !== '/user' && pathname.startsWith(path))
            const isCart  = path === '/user/cart'
            return (
              <button
                key={path}
                className={clsx(styles.navItem, active && styles.navActive)}
                onClick={() => { haptic.light(); navigate(path) }}
              >
                <span className={styles.navIcon}>
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.2 : 1.8}
                    color={active ? 'var(--text-primary)' : 'var(--text-muted)'}
                  />
                  {isCart && totalItems > 0 && (
                    <span className={styles.cartBadge}>
                      {totalItems > 9 ? '9+' : totalItems}
                    </span>
                  )}
                </span>
                <span className={styles.navLabel}>{label}</span>
                {active && <span className={styles.navBar} />}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

// ── Page wrapper ──
export function Page({ children, className, style }: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={clsx(styles.page, className)} style={style}>
      {children}
    </div>
  )
}

// ── Section header ──
export function SectionHeader({ title, action, className }: {
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx(styles.sectionHeader, className)}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {action && <div className={styles.sectionAction}>{action}</div>}
    </div>
  )
}
