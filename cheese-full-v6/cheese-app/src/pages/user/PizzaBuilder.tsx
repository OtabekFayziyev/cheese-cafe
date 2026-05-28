import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import {
  PIZZA_BASE, PIZZA_SAUCE, PIZZA_CHEESE, PIZZA_TOPPINGS
} from '@/api/mockData'
import { useCartStore } from '@/store'
import { useFormat, useTelegram } from '@/hooks'
import { AppShell, Page } from '@/components/layout/AppShell'
import { Button } from '@/components/ui'
import type { MenuItem, Extra } from '@/types'
import styles from './PizzaBuilder.module.css'

const STEPS = ['Xamir', 'Sous', 'Pishloq', 'Topping', 'Tasdiq']

export default function PizzaBuilder() {
  const navigate    = useNavigate()
  const { haptic }  = useTelegram()
  const { fmt }     = useFormat()
  const addItem     = useCartStore(s => s.addItem)

  const [step, setStep]           = useState(0)
  const [base, setBase]           = useState(PIZZA_BASE[0])
  const [sauce, setSauce]         = useState(PIZZA_SAUCE[0])
  const [cheese, setCheese]       = useState(PIZZA_CHEESE[0])
  const [toppings, setToppings]   = useState<typeof PIZZA_TOPPINGS>([])
  const [size, setSize]           = useState<'S'|'M'|'L'>('M')
  const [qty, setQty]             = useState(1)
  const [note, setNote]           = useState('')

  const sizeMultiplier = size==='S' ? 0.8 : size==='L' ? 1.4 : 1
  const sizePrices     = { S:35000, M:45000, L:60000 }

  const basePrice = useMemo(() => {
    const toppingTotal = toppings.reduce((s,t) => s+t.price, 0)
    return Math.floor((sizePrices[size] + base.price + sauce.price + cheese.price + toppingTotal) * (size==='S'?.8:size==='L'?1.4:1) / 100) * 100
  }, [base, sauce, cheese, toppings, size])

  const totalPrice = basePrice * qty

  const toggleTopping = (t: typeof PIZZA_TOPPINGS[0]) => {
    haptic.light()
    setToppings(prev =>
      prev.find(p=>p.id===t.id) ? prev.filter(p=>p.id!==t.id) : prev.length >= 6 ? prev : [...prev, t]
    )
  }

  const handleAddToCart = () => {
    haptic.success()
    const fakeMenuItem: MenuItem = {
      id: `custom-pizza-${Date.now()}`,
      categoryId: 'pizza',
      name: `Maxsus Pizza (${size})`,
      description: `${base.name} | ${sauce.name} | ${cheese.name} | ${toppings.map(t=>t.name).join(', ')||'Topingsiz'}`,
      price: basePrice,
      emoji: '🍕',
      prepTime: 22,
      extras: [],
      isAvailable: true, isHot: false, isNew: false,
      rating: 5, soldCount: 0,
    }
    addItem(fakeMenuItem, qty, [], note)
    confetti({ particleCount:80, spread:70, origin:{y:.5}, colors:['#F5C800','#1A1A1A'] })
    toast.success('🍕 Maxsus pitsangiz savatga qo\'shildi!')
    navigate('/user/cart')
  }

  const canNext = () => {
    if (step===2 && !cheese) return false
    return true
  }

  return (
    <AppShell showNav={false}>
      <Page>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => step===0 ? navigate('/user') : setStep(s=>s-1)}>
            ←
          </button>
          <h1 className={styles.title}>Pizza Builder</h1>
          <div className={styles.priceTag}>{fmt(totalPrice)}</div>
        </div>

        {/* Pizza preview */}
        <div className={styles.preview}>
          <div className={styles.pizzaViz}>
            <div className={styles.pizzaBase} style={{
              background: base.id==='pb3'
                ? 'radial-gradient(circle, #F5C800 0%,#C9A200 60%,#8B5E00 100%)'
                : 'radial-gradient(circle, #FDE8B0 0%,#E8C070 60%,#C8A050 100%)'
            }}>
              {/* Sauce layer */}
              <div className={styles.sauceLayer} style={{
                background: sauce.id==='ps4' ? 'transparent'
                  : sauce.id==='ps2' ? 'radial-gradient(circle,rgba(90,30,0,.7) 0%,transparent 70%)'
                  : sauce.id==='ps3' ? 'radial-gradient(circle,rgba(255,255,240,.5) 0%,transparent 70%)'
                  : 'radial-gradient(circle,rgba(180,40,0,.65) 0%,transparent 70%)'
              }} />
              {/* Toppings */}
              <div className={styles.toppingDots}>
                {toppings.slice(0,6).map((t,i) => (
                  <span key={t.id} className={styles.toppingDot}
                    style={{ top:`${15+Math.sin(i*1.2)*30}%`, left:`${20+Math.cos(i*1.1)*35}%`, fontSize:i%2===0?20:16 }}>
                    {t.name.split(' ')[0]}
                  </span>
                ))}
              </div>
              <div className={styles.pizzaLabel}>
                {size === 'S' ? '🍕' : size === 'M' ? '🍕🍕' : '🍕🍕🍕'}
              </div>
            </div>
          </div>

          {/* Size */}
          <div className={styles.sizeRow}>
            {(['S','M','L'] as const).map(s => (
              <button key={s} className={clsx(styles.sizeBtn, size===s && styles.sizeBtnActive)}
                onClick={() => { haptic.light(); setSize(s) }}>
                <div className={styles.sizeLetter}>{s}</div>
                <div className={styles.sizePrice}>{fmt(sizePrices[s])}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step indicator */}
        <div className={styles.steps}>
          {STEPS.map((s,i) => (
            <div key={s} className={clsx(styles.stepItem, i===step && styles.stepActive, i<step && styles.stepDone)}>
              <div className={styles.stepCircle}>{i<step ? '✓' : i+1}</div>
              <div className={styles.stepLabel}>{s}</div>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className={styles.stepContent}>

          {/* Step 0: Base */}
          {step===0 && (
            <div>
              <div className={styles.stepTitle}>Xamir turini tanlang</div>
              {PIZZA_BASE.map(b => (
                <button key={b.id} className={clsx(styles.optionRow, base.id===b.id && styles.optionActive)}
                  onClick={() => { haptic.light(); setBase(b) }}>
                  <div className={styles.optionName}>{b.name}</div>
                  <div className={styles.optionPrice}>{b.price>0?`+${fmt(b.price)}`:'Asosiy'}</div>
                  {base.id===b.id && <div className={styles.optionCheck}>✓</div>}
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Sauce */}
          {step===1 && (
            <div>
              <div className={styles.stepTitle}>Sous tanlang</div>
              {PIZZA_SAUCE.map(s => (
                <button key={s.id} className={clsx(styles.optionRow, sauce.id===s.id && styles.optionActive)}
                  onClick={() => { haptic.light(); setSauce(s) }}>
                  <div className={styles.optionName}>{s.name}</div>
                  <div className={styles.optionPrice}>{s.price>0?`+${fmt(s.price)}`:'Asosiy'}</div>
                  {sauce.id===s.id && <div className={styles.optionCheck}>✓</div>}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Cheese */}
          {step===2 && (
            <div>
              <div className={styles.stepTitle}>Pishloq tanlang</div>
              {PIZZA_CHEESE.map(c => (
                <button key={c.id} className={clsx(styles.optionRow, cheese.id===c.id && styles.optionActive)}
                  onClick={() => { haptic.light(); setCheese(c) }}>
                  <div className={styles.optionName}>{c.name}</div>
                  <div className={styles.optionPrice}>{c.price>0?`+${fmt(c.price)}`:'Asosiy'}</div>
                  {cheese.id===c.id && <div className={styles.optionCheck}>✓</div>}
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Toppings */}
          {step===3 && (
            <div>
              <div className={styles.stepTitle}>
                Topping tanlang <span className={styles.stepNote}>(max 6)</span>
              </div>
              <div className={styles.toppingGrid}>
                {PIZZA_TOPPINGS.map(t => {
                  const sel = !!toppings.find(tp=>tp.id===t.id)
                  return (
                    <button key={t.id}
                      className={clsx(styles.toppingChip, sel && styles.toppingChipActive)}
                      onClick={() => toggleTopping(t)}
                      disabled={!sel && toppings.length>=6}
                    >
                      <span>{t.name.split(' ')[0]}</span>
                      <span className={styles.toppingName}>{t.name.slice(t.name.indexOf(' ')+1)}</span>
                      <span className={styles.toppingPrice}>+{fmt(t.price)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step===4 && (
            <div>
              <div className={styles.stepTitle}>Buyurtmangizni tekshiring</div>
              <div className={styles.reviewCard}>
                <div className={styles.reviewRow}><span>Pitsa o'lchami</span><span>{size}</span></div>
                <div className={styles.reviewRow}><span>Xamir</span><span>{base.name}</span></div>
                <div className={styles.reviewRow}><span>Sous</span><span>{sauce.name}</span></div>
                <div className={styles.reviewRow}><span>Pishloq</span><span>{cheese.name}</span></div>
                <div className={styles.reviewRow}>
                  <span>Toppinglar</span>
                  <span>{toppings.length>0 ? toppings.map(t=>t.name.split(' ')[0]).join(' ') : 'Yo\'q'}</span>
                </div>
              </div>
              <div className={styles.qtyRow}>
                <button className={styles.qBtn} onClick={() => { haptic.light(); setQty(q=>Math.max(1,q-1)) }}>−</button>
                <span className={styles.qVal}>{qty}</span>
                <button className={styles.qBtn} onClick={() => { haptic.light(); setQty(q=>q+1) }}>+</button>
                <div className={styles.qTotal}>{fmt(totalPrice)}</div>
              </div>
              <div className={styles.noteWrap}>
                <div className={styles.noteLabel}>Izoh (ixtiyoriy)</div>
                <textarea className={styles.noteArea} rows={2}
                  placeholder="Masalan: qoʻshimcha ingredientlar, taqiqlar..."
                  value={note} onChange={e=>setNote(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className={styles.navBtns}>
          {step < STEPS.length-1 ? (
            <Button variant="primary" size="lg" fullWidth onClick={() => { haptic.light(); setStep(s=>s+1) }}>
              Keyingi →
            </Button>
          ) : (
            <Button variant="primary" size="lg" fullWidth onClick={handleAddToCart} icon="🛒">
              Savatga qo'shish
            </Button>
          )}
        </div>
      </Page>
    </AppShell>
  )
}
