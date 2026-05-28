import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { useUserStore, useCartStore } from '@/store'
import { BONUS_REWARDS, VALID_PROMOS } from '@/api/mockData'
import { AppShell, Page } from '@/components/layout/AppShell'
import { Button } from '@/components/ui'
import { useFormat, useTelegram } from '@/hooks'
import styles from './Profile.module.css'

const MENU_LIST = [
  { icon:'📋', label:'Buyurtmalar tarixi', sub:'12 ta buyurtma',           color:'#FFF3E0' },
  { icon:'🔄', label:'Qayta buyurtma',     sub:'Oxirgi: Truffle Burger',   color:'#E3F2FD' },
  { icon:'📍', label:'Saqlangan manzillar', sub:'3 ta manzil',             color:'#E8F5E9' },
  { icon:'⚙️', label:'Sozlamalar',         sub:'Til, bildirishnoma',       color:'#F3E5F5' },
  { icon:'💬', label:'Yordam va aloqa',    sub:'Muammo? Yozib qoldiring',  color:'#E0F7FA' },
]

export default function Profile() {
  const navigate    = useNavigate()
  const { haptic, user: tgUser } = useTelegram()
  const { fmt }     = useFormat()
  const user        = useUserStore(s => s.user)
  const addSavedPromo = useUserStore(s => s.addSavedPromo)
  const applyPromo    = useCartStore(s => s.applyPromo)

  const bonusPoints = user?.bonusPoints ?? 0
  const savedPromos = user?.savedPromos ?? []
  const [promoInput, setPromoInput] = useState('')

  const nextReward   = BONUS_REWARDS.find(r => r.pointsRequired > bonusPoints)
  const progressPct  = nextReward
    ? Math.min(100, Math.floor((bonusPoints / nextReward.pointsRequired) * 100))
    : 100

  // Save promo to profile
  const handleSavePromo = () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    const promo = VALID_PROMOS[code]
    if (!promo) { haptic.error(); toast.error('Noto\'g\'ri yoki muddati o\'tgan kod'); return }
    const disc = promo.discountType==='fixed' ? promo.discount : promo.discount
    addSavedPromo({ code, discount:disc, discountType:promo.discountType, expiresAt:promo.expiresAt })
    haptic.success()
    confetti({ particleCount:60, spread:60, origin:{y:.4}, colors:['#F5C800','#1A1A1A'] })
    toast.success(`🎟️ "${code}" profilda saqlandi!`)
    setPromoInput('')
  }

  // Use saved promo → check cart first
  const handleUsePromo = (code: string, discount: number) => {
    haptic.medium()
    const cartItems = useCartStore.getState().items
    if (!cartItems.length) {
      haptic.warning()
      toast.error('🛒 Savat bo'sh! Avval taom qo'shing.')
      return
    }
    applyPromo(code, discount)
    toast.success(`🎉 "${code}" savatga qo'llandi!`)
    navigate('/user/cart')
  }

  // Telegram user info
  const displayName = tgUser
    ? `${tgUser.first_name}${tgUser.last_name ? ' '+tgUser.last_name : ''}`
    : user ? `${user.firstName}${user.lastName ? ' '+user.lastName : ''}` : 'Foydalanuvchi'

  const displayUsername = tgUser?.username ? `@${tgUser.username}` : (user?.username ? `@${user.username}` : null)
  const displayId       = tgUser?.id ?? user?.telegramId ?? null
  const displayPhone    = user?.phone ?? null
  const photoUrl        = tgUser?.photo_url ?? user?.photoUrl ?? null

  const initials = displayName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)

  return (
    <AppShell>
      <Page>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroBg} />
          <div className={styles.avatarRow}>
            {photoUrl ? (
              <img src={photoUrl} alt="avatar" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatar}>{initials}</div>
            )}
            <div className={styles.userInfo}>
              <div className={styles.userName}>{displayName}</div>
              {displayUsername && <div className={styles.userSub}>{displayUsername}</div>}
              {displayPhone && <div className={styles.userPhone}>{displayPhone}</div>}
              {displayId && <div className={styles.userId}>ID: {displayId}</div>}
              <div className={styles.verified}>✅ Tasdiqlangan</div>
            </div>
          </div>
        </div>

        {/* Bonus card */}
        <div className={styles.bonusCard}>
          <div className={styles.bonusDecor}>☕</div>
          <div className={styles.bonusTop}>
            <div>
              <div className={styles.bonusPts}>{bonusPoints}</div>
              <div className={styles.bonusPtsLbl}>bonus ball</div>
            </div>
            {nextReward && (
              <div className={styles.bonusNext}>
                <div className={styles.bonusNextLbl}>Keyingi mukofot</div>
                <div className={styles.bonusNextReward}>{nextReward.emoji} {nextReward.name}</div>
                <div className={styles.bonusNextPts}>{nextReward.pointsRequired - bonusPoints} ball qoldi</div>
              </div>
            )}
          </div>
          <div className={styles.bonusBarWrap}>
            <div className={styles.bonusBar} style={{ width:`${progressPct}%` }} />
          </div>
          <div className={styles.bonusMeta}>
            {bonusPoints} / {nextReward?.pointsRequired ?? bonusPoints} ball · 10 000 so'm = 1 ball
          </div>

          {/* Rewards list */}
          <div className={styles.rewardsList}>
            {BONUS_REWARDS.map(r => {
              const done = bonusPoints >= r.pointsRequired
              return (
                <div key={r.id} className={clsx(styles.reward, done && styles.rewardDone)}>
                  <span className={styles.rewardEmoji}>{r.emoji}</span>
                  <div className={styles.rewardInfo}>
                    <div className={styles.rewardName}>{r.name}</div>
                    <div className={styles.rewardPts}>{r.pointsRequired} ball</div>
                  </div>
                  {done
                    ? <span className={styles.rewardCheck}>✅</span>
                    : <div className={styles.rewardMini} style={{width:`${Math.min(100,Math.floor(bonusPoints/r.pointsRequired*100))}%`}} />
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* Saved Promos */}
        <div className={styles.block}>
          <div className={styles.blockTitle}>🎟️ Promo kodlar</div>
          {savedPromos.length > 0 && (
            <div className={styles.promoList}>
              {savedPromos.map(p => (
                <div key={p.code} className={styles.savedPromo}>
                  <div>
                    <div className={styles.savedCode}>{p.code}</div>
                    <div className={styles.savedExp}>−{fmt(p.discount)} · {p.expiresAt} gacha</div>
                  </div>
                  <button
                    className={styles.useBtn}
                    onClick={() => handleUsePromo(p.code, p.discount)}
                  >
                    Ishlatish →
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.promoInputRow}>
            <input
              className={styles.promoInput}
              placeholder="Yangi kod kiriting..."
              value={promoInput}
              onChange={e => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key==='Enter' && handleSavePromo()}
            />
            <button className={styles.promoSaveBtn} onClick={handleSavePromo}>Saqlash</button>
          </div>
        </div>

        {/* Menu */}
        <div className={styles.menuList}>
          {MENU_LIST.map(item => (
            <button key={item.label} className={styles.menuItem}
              onClick={() => { haptic.light(); toast(item.label) }}>
              <div className={styles.menuItemIcon} style={{ background:item.color }}>{item.icon}</div>
              <div className={styles.menuItemText}>
                <div className={styles.menuItemLabel}>{item.label}</div>
                <div className={styles.menuItemSub}>{item.sub}</div>
              </div>
              <span className={styles.menuItemArrow}>›</span>
            </button>
          ))}
        </div>

        <div className={styles.version}>CHEESE v1.0.0</div>
        <div style={{ height:24 }} />
      </Page>
    </AppShell>
  )
}
