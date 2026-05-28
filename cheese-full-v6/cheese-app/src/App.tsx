import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useUserStore } from '@/store'
import { useColorScheme } from '@/hooks'
import { DevSwitcher } from '@/components/ui/DevSwitcher'
import { PhoneModal } from '@/components/features/PhoneModal'
import { authAPI, menuAPI } from '@/api/client'
import type { AppUser } from '@/types'

// User
const Home          = lazy(() => import('@/pages/user/Home'))
const Search        = lazy(() => import('@/pages/user/Search'))
const Cart          = lazy(() => import('@/pages/user/Cart'))
const Favs          = lazy(() => import('@/pages/user/Favs').then(m=>({default:m.Favs})))
const Profile       = lazy(() => import('@/pages/user/Profile'))
const PizzaBuilder  = lazy(() => import('@/pages/user/PizzaBuilder'))
const OrderTracking = lazy(() => import('@/pages/user/OrderTracking'))
// Admin
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminOrders    = lazy(() => import('@/pages/admin/Orders'))
const AdminMenu      = lazy(() => import('@/pages/admin/MenuManager'))
const AdminMonitor   = lazy(() => import('@/pages/admin/Monitoring'))
const AdminCustomers = lazy(() => import('@/pages/admin/Customers'))
const AdminSettings  = lazy(() => import('@/pages/admin/Settings'))
// Courier
const CourierTasks   = lazy(() => import('@/pages/courier/Tasks'))
const CourierMap     = lazy(() => import('@/pages/courier/CourierMap'))
const CourierHistory = lazy(() => import('@/pages/courier/History'))
const CourierProfile = lazy(() => import('@/pages/courier/CourierProfile'))

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5*60*1000 } } })

const Loader = () => (
  <div style={{
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    height:'100vh', gap:16, background:'var(--bg)',
  }}>
    <div style={{
      width:72, height:72, borderRadius:20, background:'#F5C800',
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:36,
      boxShadow:'0 8px 32px rgba(245,200,0,.4)',
      animation:'bounce 1.5s ease-in-out infinite',
    }}>🧀</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'var(--text-primary)', letterSpacing:4 }}>
      CHEESE
    </div>
    <div style={{ fontSize:13, color:'var(--text-muted)', fontFamily:"'Plus Jakarta Sans',sans-serif", animation:'pulse 1.5s ease-in-out infinite' }}>
      Yuklanmoqda...
    </div>
    <div style={{ width:100, height:3, borderRadius:2, background:'var(--border)', overflow:'hidden' }}>
      <div style={{ height:'100%', borderRadius:2, background:'#F5C800', animation:'loadBar 1.8s ease-in-out infinite' }} />
    </div>
    <style>{`
      @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes loadBar{0%{width:0%;margin-left:0}50%{width:70%;margin-left:0}100%{width:0%;margin-left:100px}}
    `}</style>
  </div>
)

function AppRoutes() {
  const setUser  = useUserStore(s => s.setUser)
  const user     = useUserStore(s => s.user)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  useColorScheme()

  // Agar store da user bor va telefon bor — modal chiqmasin
  const shouldShowModal = !user?.phone

  useEffect(() => {
    const init = async () => {
      const tg = (window as any).Telegram?.WebApp

      if (tg?.initData) {
        // ── Production: backend orqali login ──
        try {
          const backendUser = await authAPI.telegram(tg.initData)
          setUser({
            telegramId:     backendUser.telegramId,
            firstName:      backendUser.firstName,
            lastName:       backendUser.lastName,
            username:       backendUser.username,
            photoUrl:       backendUser.photoUrl,
            phone:          backendUser.phone,
            role:           backendUser.role?.toLowerCase() || 'user',
            bonusPoints:    backendUser.bonusPoints || 0,
            savedPromos:    [],
            savedAddresses: [],
          })
          // Telefon yo'q bo'lsa modal — faqat bir marta
          if (!backendUser.phone) {
            setTimeout(() => setShowPhoneModal(true), 800)
          }
          // Agar telefon bor — modal chiqmasin, store ni yangilash yetarli
          // Role ga qarab yo'naltirish
          if (backendUser.role === 'ADMIN' || backendUser.role === 'MODERATOR') {
            window.location.href = '/admin'
          } else if (backendUser.role === 'COURIER') {
            window.location.href = '/courier'
          }
        } catch (e) {
          // Backend xato — Telegram dan olish
          if (tg?.initDataUnsafe?.user) {
            const tgUser = tg.initDataUnsafe.user
            setUser({
              telegramId:  tgUser.id,
              firstName:   tgUser.first_name,
              lastName:    tgUser.last_name,
              username:    tgUser.username,
              photoUrl:    tgUser.photo_url,
              phone:       undefined,
              role:        'user',
              bonusPoints: 0,
              savedPromos: [], savedAddresses: [],
            })
            setTimeout(() => setShowPhoneModal(true), 800)
          }
        }
      } else if (!user) {
        // ── Dev fallback ──
        setUser({
          telegramId: 123456789, firstName: 'Jasur', lastName: 'Davlatov',
          username: 'jasur_dev', photoUrl: '', phone: '+998 90 123 45 67',
          role: 'user', bonusPoints: 45, savedPromos: [], savedAddresses: [],
        })
      }
    }

    init()
  }, [])

  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/user"                element={<Home />} />
          <Route path="/user/search"         element={<Search />} />
          <Route path="/user/cart"           element={<Cart />} />
          <Route path="/user/favs"           element={<Favs />} />
          <Route path="/user/profile"        element={<Profile />} />
          <Route path="/user/pizza-builder"  element={<PizzaBuilder />} />
          <Route path="/user/order-tracking" element={<OrderTracking />} />

          <Route path="/admin"              element={<AdminDashboard />} />
          <Route path="/admin/orders"       element={<AdminOrders />} />
          <Route path="/admin/menu"         element={<AdminMenu />} />
          <Route path="/admin/monitoring"   element={<AdminMonitor />} />
          <Route path="/admin/customers"    element={<AdminCustomers />} />
          <Route path="/admin/settings"     element={<AdminSettings />} />

          <Route path="/courier"            element={<CourierTasks />} />
          <Route path="/courier/map"        element={<CourierMap />} />
          <Route path="/courier/history"    element={<CourierHistory />} />
          <Route path="/courier/profile"    element={<CourierProfile />} />

          <Route path="*" element={<Navigate to="/user" replace />} />
        </Routes>
      </Suspense>

      {showPhoneModal && shouldShowModal && (
        <PhoneModal onClose={() => setShowPhoneModal(false)} />
      )}

      <DevSwitcher />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-center" toastOptions={{
          duration: 2500,
          style: {
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:14,
            borderRadius:14, background:'#1A1A1A', color:'#FAFAFA',
            boxShadow:'0 8px 32px rgba(0,0,0,.2)', maxWidth:'90vw',
          },
          success: { iconTheme: { primary:'#F5C800', secondary:'#1A1A1A' } },
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
