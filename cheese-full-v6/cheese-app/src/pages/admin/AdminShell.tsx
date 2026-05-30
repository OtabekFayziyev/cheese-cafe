import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed,
  TrendingUp, Users, Settings, Power
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdminStore } from '@/store/adminStore'
import { useAdminData } from '@/hooks/useAdminData'
import { ordersAPI, settingsAPI } from '@/api/client'
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
      {/* New order popup */}
      {newOrderPopup && (
        <div style={{
          position:'fixed', inset:0, zIndex:500,
          background:'rgba(0,0,0,.7)', backdropFilter:'blur(6px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'20px', animation:'fadeIn .3s ease',
        }}>
          <div style={{
            background:'var(--surface)', borderRadius:24,
            padding:'24px 20px', width:'100%', maxWidth:340,
            border:'2px solid var(--yellow)',
            boxShadow:'0 0 40px rgba(245,200,0,.3)',
            animation:'scaleIn .4s cubic-bezier(.34,1.56,.64,1)',
          }}>
            <div style={{textAlign:'center', marginBottom:16}}>
              <div style={{fontSize:48, animation:'bounce 1s infinite'}}>🔔</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'var(--yellow)', marginTop:8}}>
                YANGI BUYURTMA!
              </div>
              <div style={{fontSize:13, color:'var(--text-muted)', marginTop:4}}>
                {newOrderPopup.orderNumber || newOrderPopup.id}
              </div>
            </div>

            <div style={{background:'var(--surface-2)', borderRadius:12, padding:'12px', marginBottom:14}}>
              <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:6}}>👤 {newOrderPopup.customerName || 'Mijoz'}</div>
              <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:8}}>📞 {newOrderPopup.phone}</div>
              {(newOrderPopup.items || []).slice(0,3).map((item: any, i: number) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0'}}>
                  <span>{item.menuItem?.emoji} {item.menuItem?.name} ×{item.quantity}</span>
                </div>
              ))}
              <div style={{display:'flex', justifyContent:'space-between', fontFamily:"'Bebas Neue',sans-serif", fontSize:20, marginTop:8, borderTop:'1px solid var(--border)', paddingTop:8}}>
                <span>JAMI</span>
                <span style={{color:'var(--yellow)'}}>{newOrderPopup.totalPrice?.toLocaleString()} so'm</span>
              </div>
            </div>

            <div style={{display:'flex', gap:10}}>
              <button
                style={{flex:1, padding:'13px', borderRadius:12, background:'var(--surface-2)', border:'1.5px solid var(--border)', color:'var(--text-muted)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif"}}
                onClick={() => setNewOrderPopup(null)}>
                Keyinroq
              </button>
              <button
                style={{flex:2, padding:'13px', borderRadius:12, background:'var(--yellow)', border:'none', color:'#1A1A1A', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'0 4px 16px rgba(245,200,0,.4)'}}
                onClick={() => { setNewOrderPopup(null); navigate('/admin/orders') }}>
                ✅ Ko'rish
              </button>
            </div>
          </div>
        </div>
      )}
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
          onClick={async () => { 
            haptic.medium()
            const newVal = !settings.isOpen
            setIsOpen(newVal)
            try {
              await settingsAPI.update({ isOpen: String(newVal) })
            } catch {}
          }}
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
      {/* New order popup */}
      {newOrderPopup && (
        <div style={{
          position:'fixed', inset:0, zIndex:500,
          background:'rgba(0,0,0,.7)', backdropFilter:'blur(6px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'20px', animation:'fadeIn .3s ease',
        }}>
          <div style={{
            background:'var(--surface)', borderRadius:24,
            padding:'24px 20px', width:'100%', maxWidth:340,
            border:'2px solid var(--yellow)',
            boxShadow:'0 0 40px rgba(245,200,0,.3)',
            animation:'scaleIn .4s cubic-bezier(.34,1.56,.64,1)',
          }}>
            <div style={{textAlign:'center', marginBottom:16}}>
              <div style={{fontSize:48, animation:'bounce 1s infinite'}}>🔔</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'var(--yellow)', marginTop:8}}>
                YANGI BUYURTMA!
              </div>
              <div style={{fontSize:13, color:'var(--text-muted)', marginTop:4}}>
                {newOrderPopup.orderNumber || newOrderPopup.id}
              </div>
            </div>

            <div style={{background:'var(--surface-2)', borderRadius:12, padding:'12px', marginBottom:14}}>
              <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:6}}>👤 {newOrderPopup.customerName || 'Mijoz'}</div>
              <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:8}}>📞 {newOrderPopup.phone}</div>
              {(newOrderPopup.items || []).slice(0,3).map((item: any, i: number) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0'}}>
                  <span>{item.menuItem?.emoji} {item.menuItem?.name} ×{item.quantity}</span>
                </div>
              ))}
              <div style={{display:'flex', justifyContent:'space-between', fontFamily:"'Bebas Neue',sans-serif", fontSize:20, marginTop:8, borderTop:'1px solid var(--border)', paddingTop:8}}>
                <span>JAMI</span>
                <span style={{color:'var(--yellow)'}}>{newOrderPopup.totalPrice?.toLocaleString()} so'm</span>
              </div>
            </div>

            <div style={{display:'flex', gap:10}}>
              <button
                style={{flex:1, padding:'13px', borderRadius:12, background:'var(--surface-2)', border:'1.5px solid var(--border)', color:'var(--text-muted)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif"}}
                onClick={() => setNewOrderPopup(null)}>
                Keyinroq
              </button>
              <button
                style={{flex:2, padding:'13px', borderRadius:12, background:'var(--yellow)', border:'none', color:'#1A1A1A', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'0 4px 16px rgba(245,200,0,.4)'}}
                onClick={() => { setNewOrderPopup(null); navigate('/admin/orders') }}>
                ✅ Ko'rish
              </button>
            </div>
          </div>
        </div>
      )}
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
      {/* New order popup */}
      {newOrderPopup && (
        <div style={{
          position:'fixed', inset:0, zIndex:500,
          background:'rgba(0,0,0,.7)', backdropFilter:'blur(6px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'20px', animation:'fadeIn .3s ease',
        }}>
          <div style={{
            background:'var(--surface)', borderRadius:24,
            padding:'24px 20px', width:'100%', maxWidth:340,
            border:'2px solid var(--yellow)',
            boxShadow:'0 0 40px rgba(245,200,0,.3)',
            animation:'scaleIn .4s cubic-bezier(.34,1.56,.64,1)',
          }}>
            <div style={{textAlign:'center', marginBottom:16}}>
              <div style={{fontSize:48, animation:'bounce 1s infinite'}}>🔔</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'var(--yellow)', marginTop:8}}>
                YANGI BUYURTMA!
              </div>
              <div style={{fontSize:13, color:'var(--text-muted)', marginTop:4}}>
                {newOrderPopup.orderNumber || newOrderPopup.id}
              </div>
            </div>

            <div style={{background:'var(--surface-2)', borderRadius:12, padding:'12px', marginBottom:14}}>
              <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:6}}>👤 {newOrderPopup.customerName || 'Mijoz'}</div>
              <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:8}}>📞 {newOrderPopup.phone}</div>
              {(newOrderPopup.items || []).slice(0,3).map((item: any, i: number) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0'}}>
                  <span>{item.menuItem?.emoji} {item.menuItem?.name} ×{item.quantity}</span>
                </div>
              ))}
              <div style={{display:'flex', justifyContent:'space-between', fontFamily:"'Bebas Neue',sans-serif", fontSize:20, marginTop:8, borderTop:'1px solid var(--border)', paddingTop:8}}>
                <span>JAMI</span>
                <span style={{color:'var(--yellow)'}}>{newOrderPopup.totalPrice?.toLocaleString()} so'm</span>
              </div>
            </div>

            <div style={{display:'flex', gap:10}}>
              <button
                style={{flex:1, padding:'13px', borderRadius:12, background:'var(--surface-2)', border:'1.5px solid var(--border)', color:'var(--text-muted)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif"}}
                onClick={() => setNewOrderPopup(null)}>
                Keyinroq
              </button>
              <button
                style={{flex:2, padding:'13px', borderRadius:12, background:'var(--yellow)', border:'none', color:'#1A1A1A', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'0 4px 16px rgba(245,200,0,.4)'}}
                onClick={() => { setNewOrderPopup(null); navigate('/admin/orders') }}>
                ✅ Ko'rish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
