import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { MapPin, Bell, User } from 'lucide-react'
import { useWorkHours, useLocation, useFormat, useTelegram, useColorScheme, useMenuItems, useCategories } from '@/hooks'
import { useUserStore, useOrderStore } from '@/store'
import { MENU_ITEMS, CATEGORIES } from '@/api/mockData'
import { AppShell, Page, SectionHeader } from '@/components/layout/AppShell'
import { MenuCard } from '@/components/features/MenuCard'
import { FoodModal } from '@/components/features/FoodModal'
import { Badge } from '@/components/ui'
import type { MenuItem } from '@/types'
import styles from './Home.module.css'

const SLIDES = [
  { id:'1', badge:'🔥 Qaynoq yangilik', badgeStyle:'yellow' as const,
    title:'Truffle Burger\nyangilandi!', sub:'Faqat bugun · Cheklangan miqdor',
    bg:'linear-gradient(160deg,#1A1A1A 0%,#3D2600 100%)', emoji:'🍔', menuId:'1' },
  { id:'2', badge:'✨ Yangi taom', badgeStyle:'dark' as const,
    title:'Cheesecake\nmenyuga qo\'shildi!', sub:'Sog\'lom · Mazali · Yangi',
    bg:'linear-gradient(160deg,#1A1A1A 0%,#2C1A00 100%)', emoji:'🍰', menuId:'9' },
  { id:'3', badge:'🎉 Aksiya', badgeStyle:'yellow' as const,
    title:'2 ta pizza =\n3 ta narxiga!', sub:'Bugun soat 18:00 gacha',
    bg:'linear-gradient(160deg,#1A1A1A 0%,#261A00 100%)', emoji:'🍕', menuId:'3' },
]

export default function Home() {
  const navigate   = useNavigate()
  const { haptic, user: tgUser } = useTelegram()
  useColorScheme()

  const { isOpen, openTime, closeTime } = useWorkHours()
  const { address }  = useLocation()
  const user         = useUserStore(s => s.user)
  const activeOrder  = useOrderStore(s => s.activeOrder)
  const displayName  = tgUser?.first_name || user?.firstName || ''

  const [slide, setSlide] = useState(0)
  const isDragging  = useRef(false)
  const dragStart   = useRef<number|null>(null)
  const dragDelta   = useRef(0)
  const autoRef     = useRef<ReturnType<typeof setInterval>>()

  const [activeCat,    setActiveCat]    = useState('all')
  const [selectedItem, setSelectedItem] = useState<MenuItem|null>(null)
  const [showLocModal, setShowLocModal] = useState(false)
  const [notifOpen,    setNotifOpen]    = useState(false)

  const { items: allItems } = useMenuItems()
  const { categories: allCats } = useCategories()
  const filteredMenu = activeCat === 'all'
    ? allItems
    : allItems.filter((m: any) => m.categoryId === activeCat)

  const nextSlide = useCallback(() => setSlide(s => (s+1) % SLIDES.length), [])

  useEffect(() => {
    autoRef.current = setInterval(nextSlide, 3800)
    return () => clearInterval(autoRef.current)
  }, [nextSlide])

  const goSlide = (i: number) => {
    clearInterval(autoRef.current)
    setSlide(i)
    autoRef.current = setInterval(nextSlide, 3800)
  }

  const startDrag = (x: number) => {
    dragStart.current = x; dragDelta.current = 0
    isDragging.current = false; clearInterval(autoRef.current)
  }
  const moveDrag = (x: number) => {
    if (dragStart.current === null) return
    dragDelta.current = x - dragStart.current
    if (Math.abs(dragDelta.current) > 5) isDragging.current = true
  }
  const endDrag = () => {
    if (dragStart.current === null) return
    if (Math.abs(dragDelta.current) > 45) {
      setSlide(s => dragDelta.current < 0
        ? (s + 1) % SLIDES.length
        : (s + SLIDES.length - 1) % SLIDES.length)
    }
    dragStart.current = null; dragDelta.current = 0
    isDragging.current = false
    autoRef.current = setInterval(nextSlide, 3800)
  }

  // ── Sticky header: work banner + location/bell/user bar ──
  // Clock is NOT here — it scrolls away with content
  const stickyHeader = (
    <div className={styles.stickyBlock}>
      {/* Top bar only — location + bell + profile (always visible) */}
      <div className={styles.topBar}>
        <button className={styles.locBtn} onClick={() => setShowLocModal(true)}>
          <MapPin size={16} color="#F5C800" strokeWidth={2.5} />
          <div className={styles.locTexts}>
            <div className={styles.locLabel}>Joylashuv</div>
            <div className={styles.locValue}>{address || 'Manzil tanlang'}</div>
          </div>
        </button>
        <div className={styles.topActions}>
          <button className={styles.actionBtn} onClick={() => setNotifOpen(true)}>
            <Bell size={18} strokeWidth={1.8} color="#F5C800" />
            <span className={styles.notifBadge}>2</span>
          </button>
          <button className={styles.actionBtn} onClick={() => navigate('/user/profile')}>
            <User size={18} strokeWidth={1.8} color="#F5C800" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <AppShell stickyHeader={stickyHeader}>
      <Page>
        {/* Work hours — scrolls with content */}
        <div className={clsx(styles.workBanner, !isOpen && styles.workClosed)}>
          <div className={styles.bannerLeft}>
            <span className={clsx(styles.bannerDot, !isOpen && styles.bannerDotRed)} />
            <div>
              <div className={styles.bannerText}>
                {isOpen ? `Ochiq · ${openTime} – ${closeTime}` : `Yopiq · ${openTime} – ${closeTime}`}
              </div>
              <div className={styles.bannerSub}>
                {isOpen ? 'Buyurtma berishingiz mumkin' : 'Ertaga keling!'}
              </div>
            </div>
          </div>
          <div className={styles.bannerTime}>
            {isOpen ? `⏰ ${closeTime} gacha` : '🌙 Yopiq'}
          </div>
        </div>

        {/* Greeting */}
        <div className={styles.greeting}>
          <h1 className={styles.greetTitle}>
            Salom{displayName ? `, ${displayName}` : ''}! 👋
          </h1>
          <p className={styles.greetSub}>Bugun nimani tatib ko'rasiz?</p>
        </div>

        {/* Carousel */}
        <div
          className={styles.carouselWrap}
          onMouseDown={e => startDrag(e.clientX)}
          onMouseMove={e => moveDrag(e.clientX)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={e => startDrag(e.touches[0].clientX)}
          onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX) }}
          onTouchEnd={endDrag}
          style={{ touchAction:'pan-y' }}
        >
          <div className={styles.carouselTrack}
            style={{ transform:`translateX(-${slide * 100}%)` }}>
            {SLIDES.map(s => (
              <div key={s.id} className={styles.slide} style={{ background: s.bg }}
                onClick={() => {
                  if (isDragging.current) return
                  haptic.light()
                  const item = MENU_ITEMS.find(m => m.id === s.menuId)
                  if (item) setSelectedItem(item)
                }}>
                <div className={styles.slideContent}>
                  <Badge variant={s.badgeStyle} size="sm">{s.badge}</Badge>
                  <h2 className={styles.slideTitle}>
                    {s.title.split('\n').map((line, j, arr) => (
                      <React.Fragment key={j}>{line}{j < arr.length-1 && <br/>}</React.Fragment>
                    ))}
                  </h2>
                  <p className={styles.slideSub}>{s.sub}</p>
                  <div className={styles.slideAction}>Ko'proq bilish →</div>
                </div>
                <div className={styles.slideEmoji}>{s.emoji}</div>
              </div>
            ))}
          </div>
          <div className={styles.dots}>
            {SLIDES.map((_, i) => (
              <button key={i}
                className={clsx(styles.dot2, i === slide && styles.dotActive)}
                onClick={() => goSlide(i)} />
            ))}
          </div>
        </div>

        {/* Active order → tracking */}
        {activeOrder && (
          <div className={styles.trackingBanner}
            onClick={() => { haptic.light(); navigate('/user/order-tracking') }}>
            <div className={styles.trackingLeft}>
              <span className={styles.trackingIcon}>📦</span>
              <div>
                <div className={styles.trackingTitle}>Buyurtma holati</div>
                <div className={styles.trackingSub}>
                  {(activeOrder as any).orderNumber} · Kuzatish uchun bosing
                </div>
              </div>
            </div>
            <span className={styles.trackingArrow}>›</span>
          </div>
        )}

        {/* Pizza builder */}
        <div className={styles.builderBanner}
          onClick={() => { haptic.light(); navigate('/user/pizza-builder') }}>
          <div>
            <div className={styles.builderTitle}>🍕 O'z Pitsangni Yarat!</div>
            <div className={styles.builderSub}>Ingredientlarni o'zing tanla · Narx avto</div>
          </div>
          <div className={styles.builderArrow}>→</div>
        </div>

        {/* Categories */}
        <SectionHeader title="Menyu" action={
          <button onClick={() => setActiveCat('all')}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:'var(--yellow-dark)' }}>
            Barchasi →
          </button>
        } />
        <div className={styles.catsScroll}>
          {allCats.map((cat: any) => (
            <button key={cat.id}
              className={clsx(styles.catPill, activeCat === cat.id && styles.catActive)}
              onClick={() => { haptic.light(); setActiveCat(cat.id) }}>
              <span>{cat.emoji}</span>
              <span className={styles.catName}>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Menu grid */}
        <div className={styles.menuGrid}>
          {filteredMenu.map(item => (
            <MenuCard key={item.id} item={item}
              onClick={() => { haptic.light(); setSelectedItem(item) }} />
          ))}
        </div>

        <div style={{ height: 24 }} />
      </Page>

      {/* Modals */}
      {selectedItem && (
        <FoodModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {showLocModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLocModal(false)}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHandle} />
            <h3 className={styles.modalTitle}>📍 Joylashuvni belgilash</h3>
            <div className={styles.mapStub}>
              <div className={styles.mapPin}>📍</div>
              <div className={styles.mapLabel}>Xaritada manzilni bosing</div>
            </div>
            <input className={styles.mapInput} defaultValue={address || ''}
              placeholder="Ko'cha, uy raqami, mo'ljal..." />
            <input className={styles.mapInput} placeholder="Qo'shimcha: xonadon, qavat..." />
            <button className={styles.mapConfirm}
              onClick={() => { setShowLocModal(false); toast.success('✅ Manzil saqlandi') }}>
              ✅ Tasdiqlash
            </button>
          </div>
        </div>
      )}

      {notifOpen && (
        <div className={styles.modalOverlay} onClick={() => setNotifOpen(false)}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHandle} />
            <h3 className={styles.modalTitle}>🔔 Bildirishnomalar</h3>
            {[
              { icon:'🎉', title:'CHEESE10 promo kod!', sub:"Birinchi buyurtmangizga 10 000 so'm chegirma", time:'5 min' },
              { icon:'🍕', title:"Yangi taom: Cheesecake", sub:"Menyuga yangi desert qo'shildi", time:'1 soat' },
            ].map((n, i) => (
              <div key={i} className={styles.notifItem}>
                <div className={styles.notifIcon}>{n.icon}</div>
                <div className={styles.notifBody}>
                  <div className={styles.notifTitle}>{n.title}</div>
                  <div className={styles.notifSub}>{n.sub}</div>
                </div>
                <div className={styles.notifTime}>{n.time}</div>
              </div>
            ))}
            <button className={styles.mapConfirm} onClick={() => setNotifOpen(false)}>Yopish</button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
