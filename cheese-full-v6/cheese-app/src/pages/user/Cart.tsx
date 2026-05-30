import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'
import {
  ShoppingCart, MapPin, Phone, Trash2,
  ChevronDown, ChevronUp, Tag, MessageSquare, Bike, Store
} from 'lucide-react'
import { useCartStore, useUserStore, useOrderStore } from '@/store'
import { useFormat, useLocation, useTelegram } from '@/hooks'
import { ordersAPI } from '@/api/client'
import { VALID_PROMOS } from '@/api/mockData'
import { AppShell, Page } from '@/components/layout/AppShell'
import MapPicker from '@/components/features/MapPicker'
import { Button, EmptyState } from '@/components/ui'
import type { PaymentType } from '@/types'
import styles from './Cart.module.css'

export default function Cart() {
  const navigate   = useNavigate()
  const { haptic } = useTelegram()
  const { fmt }    = useFormat()
  const { address: gpsAddress } = useLocation()

  const {
    items, deliveryType, deliveryFee, promoCode, discount,
    removeItem, updateQty, applyPromo, clearPromo, setDeliveryType, clear,
    subtotal, total, totalItems,
  } = useCartStore()

  const user           = useUserStore(s => s.user)
  const addSavedPromo  = useUserStore(s => s.addSavedPromo)
  const addBonusPoints = useUserStore(s => s.addBonusPoints)
  const setActiveOrder = useOrderStore(s => s.setActiveOrder)
  const addToHistory   = useOrderStore(s => s.addToHistory)

  const [promoInput,   setPromoInput]   = useState('')
  const [addrInput,    setAddrInput]    = useState('')
  const [addrDetail,   setAddrDetail]   = useState('')
  const [secondPhone,  setSecondPhone]  = useState('')
  const [payMethod,    setPayMethod]    = useState<PaymentType>('cash')
  const [cashNotice,   setCashNotice]   = useState(false)
  const [placing,      setPlacing]      = useState(false)
  const [showLocModal, setShowLocModal] = useState(false)
  const [showRestNote, setShowRestNote] = useState(false)
  const [restNote,     setRestNote]     = useState('')

  useEffect(() => {
    if (gpsAddress && !addrInput) setAddrInput(gpsAddress)
  }, [gpsAddress])

  const handlePhone = (val: string) =>
    setSecondPhone(val.replace(/\D/g, '').slice(0, 9))

  const handlePromo = () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    const promo = VALID_PROMOS[code]
    if (!promo) { haptic.error(); toast.error('Noto\'g\'ri yoki muddati o\'tgan kod'); return }
    const sub = subtotal()
    if (sub < promo.minOrder) { haptic.warning(); toast.error(`Minimum: ${fmt(promo.minOrder)}`); return }
    const discAmount = promo.discountType === 'fixed'
      ? promo.discount : Math.floor(sub * promo.discount / 100)
    applyPromo(code, discAmount)
    addSavedPromo({ code, discount: discAmount, discountType: promo.discountType, expiresAt: promo.expiresAt })
    haptic.success()
    confetti({ particleCount:100, spread:80, origin:{y:.6}, colors:['#F5C800','#1A1A1A','#fff'] })
    setTimeout(() => confetti({ particleCount:50, angle:60,  spread:55, origin:{x:0,y:.7}, colors:['#F5C800'] }), 200)
    setTimeout(() => confetti({ particleCount:50, angle:120, spread:55, origin:{x:1,y:.7}, colors:['#F5C800'] }), 400)
    toast.success(`🎉 "${code}" — −${fmt(discAmount)}`, { duration: 3000 })
    setPromoInput('')
  }

  const handlePlaceOrder = async () => {
    if (!items.length) return
    if (deliveryType === 'delivery' && !addrInput.trim()) {
      toast.error('Manzilni kiriting'); return
    }
    haptic.medium(); setPlacing(true)

    try {
      // Try real API first
      const orderData = {
        items: items.map(i => ({
          menuItemId: i.menuItem.id,
          quantity:   i.quantity,
          extraIds:   (i.selectedExtras || []).map((e: any) => e.id),
          note:       i.note || '',
          price:      i.totalPrice,
        })),
        deliveryType: deliveryType.toUpperCase(),
        paymentType:  payMethod.toUpperCase(),
        address:      addrInput,
        addressDetail: addrDetail,
        phone:        user?.phone || '+998900000000',
        secondPhone:  secondPhone ? `+998${secondPhone}` : undefined,
        promoCode:    promoCode || undefined,
        note:         restNote || undefined,
      }
      const realOrder = await ordersAPI.create(orderData)
      setActiveOrder(realOrder)
      addToHistory(realOrder)
      addBonusPoints(Math.floor(total() / 1000)) // 10 ball per 10,000
      clear(); haptic.success()
      confetti({ particleCount:80, spread:70, origin:{y:.5}, colors:['#F5C800','#1A1A1A'] })
      toast.success('🎉 Buyurtma berildi!', { duration: 3000 })
      setPlacing(false)
      navigate('/user/order-tracking')
      return
    } catch (e) {
      // Fallback to mock
    }

    await new Promise(r => setTimeout(r, 1200))
    const mockOrder: any = {
      id: `ORD-${Date.now()}`,
      orderNumber: `ORD-${1001 + Math.floor(Math.random()*100)}`,
      items: items.map(i => ({ id:i.id, menuItem:i.menuItem, quantity:i.quantity, extras:i.selectedExtras, note:i.note, price:i.totalPrice })),
      status: 'pending', deliveryType,
      address: addrInput, addressDetail: addrDetail,
      phone: user?.phone ?? '+998 90 000 00 00',
      secondPhone: secondPhone ? `+998${secondPhone}` : undefined,
      paymentType: payMethod, promoCode: promoCode ?? undefined,
      discount, deliveryFee, totalPrice: total(),
      note: restNote || undefined,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    setActiveOrder(mockOrder); addToHistory(mockOrder)
    addBonusPoints(Math.floor(total() / 1000)) // 10 ball per 10,000
    clear(); haptic.success()
    confetti({ particleCount:80, spread:70, origin:{y:.5}, colors:['#F5C800','#1A1A1A'] })
    toast.success('🎉 Buyurtma berildi!', { duration: 3000 })
    setPlacing(false)
    navigate('/user/order-tracking')
    setOrdering(false)
  }

  if (!items.length) {
    return (
      <AppShell>
        <Page>
          <div className={styles.header}>
            <ShoppingCart size={22} strokeWidth={1.5} />
            <h1 className={styles.pageTitle}>Savat</h1>
          </div>
          <EmptyState emoji="🛒" title="Savat bo'sh!"
            description={"Savatingiz g'amgin 😅\nBitta burger uni xursand qiladi!"}
            animateEmoji="jiggle"
            action={<Button variant="primary" fullWidth onClick={() => navigate('/user')} icon="🍔">Menyuga o'tish</Button>}
          />
        </Page>
      </AppShell>
    )
  }

  return (
    <>
    {showMap && (
      <MapPicker
        initial={coords || undefined}
        onClose={() => setShowMap(false)}
        onSelect={(addr, c) => {
          setAddrInput(addr)
          setShowMap(false)
        }}
      />
    )}
    <AppShell>
      <Page>
        <div className={styles.header}>
          <ShoppingCart size={22} strokeWidth={1.5} />
          <h1 className={styles.pageTitle}>Savat</h1>
          <span className={styles.itemCount}>{totalItems()} ta</span>
        </div>

        {/* Items */}
        <div className={styles.items}>
          {items.map((item, idx) => (
            <div key={item.id} className={styles.item} style={{ animationDelay:`${idx*.05}s` }}>
              <div className={styles.itemImg}>{item.menuItem.emoji}</div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{item.menuItem.name}</div>
                {item.selectedExtras.length > 0 && (
                  <div className={styles.itemExtras}>{item.selectedExtras.map(e=>e.name).join(', ')}</div>
                )}
                {item.note && <div className={styles.itemNote}>📝 {item.note}</div>}
                <div className={styles.itemQty}>
                  <button className={styles.qBtn} onClick={() => updateQty(item.id, item.quantity-1)}>−</button>
                  <span className={styles.qVal}>{item.quantity}</span>
                  <button className={styles.qBtn} onClick={() => updateQty(item.id, item.quantity+1)}>+</button>
                </div>
              </div>
              <div className={styles.itemRight}>
                <div className={styles.itemPrice}>{fmt(item.totalPrice)}</div>
                <button className={styles.delBtn} onClick={() => { haptic.light(); removeItem(item.id) }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery type */}
        <div className={styles.block}>
          <div className={styles.blockTitle}>Yetkazish usuli</div>
          <div className={styles.delOpts}>
            <button className={clsx(styles.delOpt, deliveryType==='delivery' && styles.delActive)}
              onClick={() => { haptic.light(); setDeliveryType('delivery') }}>
              <Bike size={22} /><div className={styles.delLabel}>Yetkazish</div><div className={styles.delPrice}>5 000 so'm</div>
            </button>
            <button className={clsx(styles.delOpt, deliveryType==='pickup' && styles.delActive)}
              onClick={() => { haptic.light(); setDeliveryType('pickup') }}>
              <Store size={22} /><div className={styles.delLabel}>Olib ketish</div><div className={styles.delPrice}>Bepul</div>
            </button>
          </div>
        </div>

        {/* Address */}
        {deliveryType === 'delivery' && (
          <div className={styles.block}>
            <div className={styles.blockTitle}><MapPin size={14} /> Manzil</div>
            <div className={styles.addrHint}>💡 Ko'cha, uy, qavat, mo'ljal — to'liq yozing</div>
            <div className={styles.addrRow}>
              <input className={styles.addrInput} value={addrInput}
                onChange={e => setAddrInput(e.target.value)} placeholder="Ko'cha, uy raqami..." />
              <button className={styles.mapBtn} onClick={() => setShowLocModal(true)}>🗺️</button>
            </div>
            <input className={styles.addrInput} value={addrDetail}
              onChange={e => setAddrDetail(e.target.value)}
              placeholder="Xonadon, qavat, mo'ljal..." />
          </div>
        )}

        {/* Phone */}
        <div className={styles.block}>
          <div className={styles.blockTitle}><Phone size={14} /> Telefon</div>
          {user?.phone && (
            <div className={styles.phoneSaved}>
              <span>✅</span>
              <span className={styles.phoneSavedNum}>{user.phone}</span>
            </div>
          )}
          <div className={styles.phoneRow}>
            <div className={styles.phonePrefix}>+998</div>
            <input className={styles.phoneInput}
              placeholder="Qo'shimcha raqam (ixtiyoriy)"
              type="tel" inputMode="numeric" maxLength={9}
              value={secondPhone} onChange={e => handlePhone(e.target.value)} />
          </div>
          {secondPhone.length > 0 && secondPhone.length < 9 && (
            <div className={styles.phoneHint}>⚠️ {9-secondPhone.length} ta raqam yana kerak</div>
          )}
        </div>

        {/* Restaurant note */}
        <div className={styles.block}>
          <button className={styles.restNoteToggle}
            onClick={() => { haptic.light(); setShowRestNote(v=>!v) }}>
            <div className={styles.restNoteLeft}>
              <MessageSquare size={15} />
              <span>Restoran / kuryer uchun izoh</span>
            </div>
            {showRestNote ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
          </button>
          {showRestNote && (
            <textarea className={styles.restNoteArea} rows={2}
              placeholder="Masalan: eshikni qo'ng'iroq qiling, ovqat issiq kelsin..."
              value={restNote} onChange={e => setRestNote(e.target.value)} />
          )}
        </div>

        {/* Promo */}
        <div className={styles.block}>
          <div className={styles.blockTitle}><Tag size={14} /> Promo kod</div>
          {promoCode ? (
            <div className={styles.promoApplied}>
              <span>🎉 <strong>{promoCode}</strong> — −{fmt(discount)}</span>
              <button className={styles.promoRemove} onClick={() => { clearPromo(); haptic.light() }}>✕</button>
            </div>
          ) : (
            <div className={styles.promoRow}>
              <input className={styles.promoInput} placeholder="Kodni kiriting..."
                value={promoInput}
                onChange={e => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key==='Enter' && handlePromo()} />
              <button className={styles.promoBtn} onClick={handlePromo}>Qo'llash</button>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className={styles.block}>
          <div className={styles.blockTitle}>💳 To'lov usuli</div>
          <div className={styles.payMethods}>
            {([
              {type:'cash' as PaymentType,  icon:'💵', label:'Naqd' },
              {type:'payme' as PaymentType, icon:'📱', label:'Payme'},
              {type:'click' as PaymentType, icon:'💳', label:'Click'},
            ]).map(m => (
              <button key={m.type}
                className={clsx(styles.payMethod, payMethod===m.type && styles.payActive)}
                onClick={() => { haptic.light(); if(m.type!=='cash') { if(!cashNotice) setCashNotice(true) } else setPayMethod(m.type) }}>
                <span className={styles.payIcon}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className={styles.summary}>
          <div className={styles.sumRow}><span>Taomlar</span><span>{fmt(subtotal())}</span></div>
          <div className={styles.sumRow}><span>Yetkazish</span><span>{deliveryFee>0?fmt(deliveryFee):'Bepul'}</span></div>
          {discount>0 && <div className={clsx(styles.sumRow,styles.sumDiscount)}><span>Chegirma</span><span>−{fmt(discount)}</span></div>}
          <div className={clsx(styles.sumRow,styles.sumTotal)}><span>Jami</span><span>{fmt(total())}</span></div>
        </div>

        <div className={styles.orderBtnWrap}>
          <Button variant="primary" size="lg" fullWidth loading={placing}
            onClick={handlePlaceOrder} icon={placing?undefined:'✨'}>
            {placing?'Buyurtma berilmoqda...':'Buyurtma berish'}
          </Button>
        </div>

        {/* Modals */}
        {cashNotice && (
          <div className={styles.cashOverlay} onClick={() => setCashNotice(false)}>
            <div className={styles.cashCard} onClick={e=>e.stopPropagation()}>
              <div className={styles.cashIcon}>💵</div>
              <h3 className={styles.cashTitle}>Hozircha naqd pul</h3>
              <p className={styles.cashText}>Payme va Click tez orada ishga tushadi!<br/>Naqd pul orqali to'lash mumkin.</p>
              <Button variant="primary" fullWidth onClick={() => setCashNotice(false)}>Tushunarli 👍</Button>
            </div>
          </div>
        )}
        {showLocModal && (
          <div className={styles.cashOverlay} onClick={() => setShowLocModal(false)}>
            <div className={styles.cashCard} style={{padding:20}} onClick={e=>e.stopPropagation()}>
              <h3 className={styles.cashTitle} style={{fontSize:18,marginBottom:12}}>📍 Xaritadan tanlash</h3>
              <div style={{height:130,background:'linear-gradient(135deg,#1a3a1a,#2d5a2d)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12,fontSize:36}}>📍</div>
              <input style={{width:'100%',padding:'10px 12px',borderRadius:10,background:'var(--surface-2)',border:'2px solid var(--border)',color:'var(--text-primary)',fontSize:14,fontFamily:'var(--font-body)',marginBottom:10,outline:'none'}}
                placeholder="Manzil qidiring..." defaultValue={addrInput}
                onChange={e=>setAddrInput(e.target.value)} />
              <Button variant="primary" fullWidth onClick={() => { setShowLocModal(false); toast.success('✅ Manzil saqlandi') }}>Tasdiqlash</Button>
            </div>
          </div>
        )}
      </Page>
    </AppShell>
  </>
  )
}
