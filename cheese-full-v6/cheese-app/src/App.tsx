import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useUserStore } from '@/store'
import { useColorScheme } from '@/hooks'
import { DevSwitcher } from '@/components/ui/DevSwitcher'
import type { AppUser } from '@/types'

// User
const Home         = lazy(() => import('@/pages/user/Home'))
const Search       = lazy(() => import('@/pages/user/Search'))
const Cart         = lazy(() => import('@/pages/user/Cart'))
const Favs         = lazy(() => import('@/pages/user/Favs').then(m=>({default:m.Favs})))
const Profile      = lazy(() => import('@/pages/user/Profile'))
const PizzaBuilder = lazy(() => import('@/pages/user/PizzaBuilder'))
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

const qc = new QueryClient({ defaultOptions:{ queries:{ staleTime:5*60*1000 } } })
const Loader = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:64,background:'var(--bg)'}}>☕</div>
)

function AppRoutes() {
  const setUser = useUserStore(s=>s.setUser)
  const user    = useUserStore(s=>s.user)
  useColorScheme()

  useEffect(() => {
    if (!user) {
      setUser({ telegramId:123456789, firstName:'Jasur', lastName:'Davlatov',
        username:'jasur_dev', photoUrl:'', phone:'+998 90 123 45 67',
        role:'user', bonusPoints:45, savedPromos:[], savedAddresses:[] })
    }
  }, [])

  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* User */}
          <Route path="/user"               element={<Home />} />
          <Route path="/user/search"        element={<Search />} />
          <Route path="/user/cart"          element={<Cart />} />
          <Route path="/user/favs"          element={<Favs />} />
          <Route path="/user/profile"       element={<Profile />} />
          <Route path="/user/pizza-builder" element={<PizzaBuilder />} />
          {/* Admin */}
          <Route path="/admin"              element={<AdminDashboard />} />
          <Route path="/admin/orders"       element={<AdminOrders />} />
          <Route path="/admin/menu"         element={<AdminMenu />} />
          <Route path="/admin/monitoring"   element={<AdminMonitor />} />
          <Route path="/admin/customers"    element={<AdminCustomers />} />
          <Route path="/admin/settings"     element={<AdminSettings />} />
          {/* Courier */}
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
          duration:2500,
          style:{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:14,
            borderRadius:14, background:'#1A1A1A', color:'#FAFAFA', boxShadow:'0 8px 32px rgba(0,0,0,.2)' },
          success:{ iconTheme:{ primary:'#F5C800', secondary:'#1A1A1A' } },
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
