import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import {
  ClipboardList, RefreshCw, MapPin as MapPinIcon,
  Settings, MessageCircle, ChevronRight
} from 'lucide-react'
import { useUserStore, useCartStore, useOrderStore } from '@/store'
import { ordersAPI } from '@/api/client'
import { useEffect } from 'react'
import { BONUS_REWARDS, VALID_PROMOS } from '@/api/mockData'
import { AppShell, Page } from '@/components/layout/AppShell'
import { Button } from '@/components/ui'
import { useFormat, useTelegram } from '@/hooks'
import styles from './Profile.module.css'

// ── Static menu — using direct icon refs, not dynamic ──
const MENU_ITEMS_CONFIG = [
  { key:'history',   label:'Buyurtmalar tarixi',  subFn: (cnt: number) => `${cnt} ta buyurtma`,  color:'#FFF3E0', iconColor:'#F59E0B' },
  { key:'reorder',   label:'Qayta buyurtma',       subFn: () => 'Oxirgi: Truffle Burger',          color:'#E3F2FD', iconColor:'#3B82F6' },
  { key:'addresses', label:'Saqlangan manzillar',  subFn: () => '3 ta manzil',                    color:'#E8F5E9', iconColor:'#22C55E' },
  { key:'settings',  label:'Sozlamalar',            subFn: () => 'Til, bildirishnoma',              color:'#F3E5F5', iconColor:'#8B5CF6' },
  { key:'help',      label:'Yordam va aloqa',       subFn: () => 'Muammo? Yozib qoldiring',        color:'#E0F7FA', iconColor:'#06B6D4' },
]

function MenuIcon({ itemKey, color }: { itemKey: string; color: string }) {
  const props = { size: 20, strokeWidth: 1.8, color }
  if (itemKey === 'history')   return <ClipboardList {...props} />
  if (itemKey === 'reorder')   return <RefreshCw {...props} />
  if (itemKey === 'addresses') return <MapPinIcon {...props} />
  if (itemKey === 'settings')  return <Settings {...props} />
  if (itemKey === 'help')      return <MessageCircle {...props} />
  return null
}

export default function Profile() {
  const navigate    = useNavigate()
  const { haptic, user: tgUser } = useTelegram()
  const { fmt }     = useFormat()
  const user        = useUserStore(s => s.user)
  const addSavedPromo  = useUserStore(s => s.addSavedPromo)
  const applyPromo     = useCartStore(s => s.applyPromo)
  const orderHistory   = useOrderStore(s => s.orderHistory)
  const activeOrder    = useOrderStore(s => s.activeOrder)

  const bonusPoints = user?.bonusPoints ?? 0
  const savedPromos = user?.savedPromos ?? []
  const [promoInput,   setPromoInput]   = useState('')
  const [showHistory,  setShowHistory]  = useState(false)

  const nextReward  = BONUS_REWARDS.find(r => r.pointsRequired > bonusPoints)
  const progressPct = nextReward
    ? Math.min(100, Math.floor(bonusPoints / nextReward.pointsRequired * 100))
    : 100

  const handleSavePromo = () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    const promo = VALID_PROMOS[code]
    if (!promo) { haptic.error(); toast.error("Noto'g'ri yoki muddati o'tgan kod"); return }
    const disc = promo.discountType === 'fixed' ? promo.discount : promo.discount
    addSavedPromo({ code, discount: disc, discountType: promo.discountType, expiresAt: promo.expiresAt })
    haptic.success()
    confetti({ particleCount:60, spread:60, origin:{y:.4}, colors:['#F5C800','#1A1A1A'] })
    toast.success(`🎟️ "${code}" profilda saqlandi!`)
    setPromoInput('')
  }

  const handleUsePromo = (code: string, discount: number) => {
    haptic.medium()
    if (!useCartStore.getState().items.length) {
      haptic.warning()
      toast.error("🛒 Savat bo'sh! Avval taom qo'shing.")
      return
    }
    applyPromo(code, discount)
    toast.success(`🎉 "${code}" savatga qo'llandi!`)
    navigate('/user/cart')
  }

  const handleMenuClick = (key: string) => {
    haptic.light()
    if (key === 'history')   { setShowHistory(true); return }
    if (key === 'reorder')   { navigate('/user'); toast("Tez kunda!"); return }
    if (key === 'help')      { window.open('https://t.me/cheese_cafe', '_blank'); return }
    toast("Tez kunda!")
  }

  const displayName = tgUser
    ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`
    : user ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 'Foydalanuvchi'

  const displayUsername = tgUser?.username
    ? `@${tgUser.username}`
    : user?.username ? `@${user.username}` : null
  const displayPhone = user?.phone ?? null
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <AppShell>
      <Page>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <div className={styles.avatar}>{initials || '👤'}</div>
            <div className={styles.heroInfo}>
              <div className={styles.heroName}>{displayName}</div>
              {displayUsername && <div className={styles.heroUsername}>{displayUsername}</div>}
              {displayPhone && <div className={styles.heroPhone}>{displayPhone}</div>}
            </div>
          </div>
        </div>

        {/* Bonus */}
        <div className={styles.bonusCard}>
          <div className={styles.bonusTop}>
            <div>
              <div className={styles.bonusTitle}>⭐ Bonus ballar</div>
              <div className={styles.bonusPoints}>{bonusPoints} ball</div>
            </div>
            {nextReward && (
              <div className={styles.bonusNext}>
                <div className={styles.bonusNextLabel}>Keyingi sovrin</div>
                <div className={styles.bonusNextVal}>{nextReward.emoji} {nextReward.name}</div>
                <div className={styles.bonusNextPts}>{nextReward.pointsRequired} ball kerak</div>
              </div>
            )}
          </div>
          <div className={styles.bonusBar}>
            <div className={styles.bonusBarFill} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.bonusBarLabels}>
            <span>{bonusPoints} ball</span>
            <span>{nextReward ? nextReward.pointsRequired : bonusPoints} ball</span>
          </div>
          <div className={styles.bonusInfo}>
            <div className={styles.bonusInfoItem}>⭐ Har 10 000 so'm = 10 ball</div>
            <div className={styles.bonusInfoItem}>🎁 10 ball = 1 000 so'm</div>
          </div>
        </div>

        {/* Saved promos */}
        {savedPromos.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>🎟️ Promo kodlarim</div>
            <div className={styles.promoList}>
              {savedPromos.map((p, i) => (
                <div key={i} className={styles.promoCard}>
                  <div>
                    <div className={styles.promoCode}>{p.code}</div>
                    <div className={styles.promoDisc}>
                      {p.discountType === 'fixed' ? `−${fmt(p.discount)}` : `−${p.discount}%`}
                    </div>
                  </div>
                  <button className={styles.promoUseBtn}
                    onClick={() => handleUsePromo(p.code, p.discount)}>
                    Ishlatish
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Promo input */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>➕ Promo kod saqlash</div>
          <div className={styles.promoInputRow}>
            <input
              className={styles.promoInput}
              placeholder="Yangi kod kiriting..."
              value={promoInput}
              onChange={e => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSavePromo()}
            />
            <button className={styles.promoSaveBtn} onClick={handleSavePromo}>Saqlash</button>
          </div>
        </div>

        {/* Menu */}
        <div className={styles.menuList}>
          {MENU_ITEMS_CONFIG.map(item => (
            <button
              key={item.key}
              className={styles.menuItem}
              onClick={() => handleMenuClick(item.key)}
            >
              <div className={styles.menuItemIcon} style={{ background: item.color }}>
                <MenuIcon itemKey={item.key} color={item.iconColor} />
              </div>
              <div className={styles.menuItemText}>
                <div className={styles.menuItemLabel}>{item.label}</div>
                <div className={styles.menuItemSub}>
                  {item.subFn(orderHistory.length)}
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={1.5} color="var(--text-muted)" />
            </button>
          ))}
        </div>

        <div className={styles.version}>CHEESE v1.0.0</div>
        <div style={{ height: 24 }} />
      </Page>

      {/* Order history modal */}
      {showHistory && (
        <div className={styles.historyOverlay} onClick={() => setShowHistory(false)}>
          <div className={styles.historySheet} onClick={e => e.stopPropagation()}>
            <div className={styles.historyHandle} />
            <h3 className={styles.historyTitle}>📋 Buyurtmalar tarixi</h3>

            {activeOrder && (
              <button className={styles.activeOrderCard}
                onClick={() => { setShowHistory(false); navigate('/user/order-tracking') }}>
                <div className={styles.activeOrderLeft}>
                  <span className={styles.activeDot} />
                  <div>
                    <div className={styles.activeOrderId}>{(activeOrder as any).orderNumber || activeOrder.id}</div>
                    <div className={styles.activeOrderSub}>Aktiv buyurtma — ko'rish uchun bosing</div>
                  </div>
                </div>
                <ChevronRight size={18} strokeWidth={1.5} color="var(--blue)" />
              </button>
            )}

            {allOrders.length === 0 && !activeOrder ? (
              <div className={styles.historyEmpty}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Buyurtma tarixi bo'sh
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Birinchi buyurtmangizni bering!
                </div>
              </div>
            ) : (
              <div className={styles.historyList}>
                {allOrders.map((order: any) => (
                  <div key={order.id} className={styles.historyItem}>
                    <div className={styles.historyLeft}>
                      <div className={styles.historyId}>{order.orderNumber || order.id}</div>
                      <div className={styles.historyItems2}>
                        {order.items?.slice(0,3).map((i: any) => i.menuItem?.emoji).join(' ')}
                        {order.items?.length > 3 ? ` +${order.items.length - 3}` : ''}
                      </div>
                      <div className={styles.historyDate}>
                        {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                          day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className={styles.historyRight}>
                      <div className={styles.historyTotal}>{fmt(order.totalPrice)}</div>
                      <div className={clsx(
                        styles.historyStatus,
                        order.status === 'delivered' ? styles.statusDelivered :
                        order.status === 'cancelled' ? styles.statusCancelled :
                        styles.statusActive
                      )}>
                        {order.status === 'delivered' ? '✅ Yetkazildi' :
                         order.status === 'cancelled' ? '❌ Bekor' : '⏳ Jarayonda'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
