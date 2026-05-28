import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useUserStore } from '@/store'
import { useColorScheme } from '@/hooks'
import { DevSwitcher } from '@/components/ui/DevSwitcher'
import { authAPI } from '@/api/client'

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
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', height:'100vh', gap:16, background:'var(--bg)',
  }}>
    <div style={{
      width:72, height:72, borderRadius:20, background:'#F5C800',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:36, boxShadow:'0 8px 32px rgba(245,200,0,.4)',
      animation:'bounce 1.5s ease-in-out infinite',
    }}>🧀</div>
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'var(--text-primary)', letterSpacing:4 }}>
      CHEESE
    </div>
    <style>{`
      @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    `}</style>
  </div>
)

function AppRoutes() {
  const setUser = useUserStore(s => s.setUser)
  const [loading, setLoading] = useState(true)
  useColorScheme()

  useEffect(() => {
    const init = async () => {
      const tg = (window as any).Telegram?.WebApp

      if (tg?.initData) {
        try {
          // Backend orqali login — token memory ga saqlanadi
          const backendUser = await authAPI.telegram(tg.initData)

          // DB dan kelgan barcha ma'lumotlar — phone ham bor
          setUser({
            telegramId:     Number(backendUser.telegramId),
            firstName:      backendUser.firstName  || tg.initDataUnsafe?.user?.first_name || '',
            lastName:       backendUser.lastName   || tg.initDataUnsafe?.user?.last_name,
            username:       backendUser.username   || tg.initDataUnsafe?.user?.username,
            photoUrl:       backendUser.photoUrl   || tg.initDataUnsafe?.user?.photo_url,
            phone:          backendUser.phone      || undefined,
            role:           (backendUser.role || 'USER').toLowerCase(),
            bonusPoints:    backendUser.bonusPoints || 0,
            savedPromos:    [],
            savedAddresses: [],
          })

          // Role ga qarab yo'naltirish — faqat bir marta
          const role = backendUser.role || 'USER'
          const currentPath = window.location.pathname
          if (['ADMIN','MODERATOR','CASHIER'].includes(role)) {
            if (!currentPath.startsWith('/admin')) {
              window.location.href = '/admin'
            }
          } else if (role === 'COURIER') {
            if (!currentPath.startsWith('/courier')) {
              window.location.href = '/courier'
            }
          }

        } catch (e) {
          // Backend xato — Telegram dan olish (fallback)
          const tgUser = tg?.initDataUnsafe?.user
          if (tgUser) {
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
          }
        }
      } else {
        // Dev fallback
        setUser({
          telegramId: 123456789, firstName: 'Otabek', lastName: 'Fayziyev',
          username: 'otabek_RT', photoUrl: '', phone: '+998906746297',
          role: 'user', bonusPoints: 45, savedPromos: [], savedAddresses: [],
        })
      }
      setLoading(false)
    }

    init()
  }, [])

  if (loading) return <Loader />

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