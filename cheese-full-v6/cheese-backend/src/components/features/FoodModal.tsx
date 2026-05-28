import React, { useState, useCallback } from 'react'
import clsx from 'clsx'
import confetti from 'canvas-confetti'
import { useCartStore, useUserStore } from '@/store'
import { useFormat, useTelegram } from '@/hooks'
import { Button, Badge } from '@/components/ui'
import type { MenuItem, Extra } from '@/types'
import styles from './FoodModal.module.css'

interface FoodModalProps {
  item: MenuItem | null
  onClose: () => void
}

export function FoodModal({ item, onClose }: FoodModalProps) {
  const [qty, setQty]                     = useState(1)
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([])
  const [note, setNote]                   = useState('')
  const [selectedBread, setSelectedBread] = useState<string>('')
  const [activeNotes, setActiveNotes]     = useState<string[]>([])
  const { fmt }    = useFormat()
  const { haptic } = useTelegram()
  const addItem    = useCartStore(s => s.addItem)
  const favIds     = useUserStore(s => s.favIds)
  const toggleFav  = useUserStore(s => s.toggleFav)

  // Combine preset + typed note
  const combinedNote = [
    ...activeNotes,
    ...(note.trim() ? [note.trim()] : []),
  ].join('; ')

  const isFav       = item ? favIds.includes(item.id) : false
  const extraTotal  = selectedExtras.reduce((s, e) => s + e.price, 0)
  const unitPrice   = item ? item.price + extraTotal : 0
  const totalPrice  = unitPrice * qty

  const toggleExtra = useCallback((extra: Extra) => {
    haptic.light()
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    )
  }, [haptic])

  const togglePresetNote = (n: string) => {
    haptic.light()
    setActiveNotes(prev =>
      prev.includes(n) ? prev.filter(p => p !== n) : [...prev, n]
    )
  }

  const handleAdd = () => {
    if (!item) return
    if (item.breadOptions?.length && !selectedBread) {
      haptic.error()
      return
    }
    haptic.success()
    const breadExtra = selectedBread ? `Non turi: ${selectedBread}` : ''
    const finalNote  = [breadExtra, combinedNote].filter(Boolean).join(' | ')
    addItem(item, qty, selectedExtras, finalNote)
    confetti({
      particleCount: 35, spread: 60, origin: { y: 0.7 },
      colors: ['#F5C800', '#1A1A1A', '#FAFAFA'], scalar: 0.8,
    })
    onClose()
  }

  if (!item) return null

  const isHotdog = !!item.breadOptions?.length

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        {/* Emoji hero */}
        <div className={styles.hero}>
          <span className={styles.heroEmoji}>{item.emoji}</span>
          <div className={styles.heroBadges}>
            {item.isHot && <Badge variant="yellow" size="sm">🔥 HOT</Badge>}
            {item.isNew && <Badge variant="dark" size="sm">✨ YANGI</Badge>}
          </div>
        </div>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{item.name}</h2>
            <div className={styles.meta}>
              <span>⭐ {item.rating}</span>
              <span>·</span>
              <span>{item.soldCount} ta sotilgan</span>
              <span>·</span>
              <span>⏱ ~{item.prepTime} daq</span>
            </div>
          </div>
          <button className={clsx(styles.favBtn, isFav && styles.favActive)}
            onClick={() => { haptic.light(); toggleFav(item.id) }}>
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>

        <p className={styles.desc}>{item.description}</p>

        {/* Bread choice (hotdogs) */}
        {isHotdog && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              Non turi tanlang <span className={styles.required}>*majburiy</span>
            </h4>
            <div className={styles.breadOpts}>
              {item.breadOptions!.map(b => (
                <button
                  key={b}
                  className={clsx(styles.breadBtn, selectedBread===b && styles.breadActive)}
                  onClick={() => { haptic.light(); setSelectedBread(b) }}
                >
                  {b==='Non' ? '🍞' : '🫓'} {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preset notes (hotdogs) */}
        {item.presetNotes && item.presetNotes.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Tez izoh (bosing)</h4>
            <div className={styles.extrasGrid}>
              {item.presetNotes.map(n => {
                const active = activeNotes.includes(n)
                return (
                  <button
                    key={n}
                    className={clsx(styles.presetNote, active && styles.presetNoteActive)}
                    onClick={() => togglePresetNote(n)}
                  >
                    {active ? '✓ ' : ''}{n}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Extras */}
        {item.extras.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Qo'shimcha ingredientlar</h4>
            <div className={styles.extrasGrid}>
              {item.extras.map(extra => {
                const sel = !!selectedExtras.find(e => e.id === extra.id)
                return (
                  <button
                    key={extra.id}
                    className={clsx(styles.extraChip, sel && styles.extraSelected)}
                    onClick={() => toggleExtra(extra)}
                  >
                    {extra.name}
                    <span className={styles.extraPrice}>+{fmt(extra.price)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Custom note */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Qo'shimcha izoh</h4>
          <textarea
            className={styles.noteArea} rows={2}
            placeholder="Masalan: sous ko'p bo'lsin, pomidor bo'lmasin..."
            value={note} onChange={e => setNote(e.target.value)}
          />
          {activeNotes.length > 0 && (
            <div className={styles.noteSummary}>
              📝 {activeNotes.join(' · ')}
            </div>
          )}
        </div>

        {/* Qty + total */}
        <div className={styles.qtyRow}>
          <div className={styles.qtyCtrl}>
            <button className={styles.qtyBtn} onClick={() => { haptic.light(); setQty(q => Math.max(1,q-1)) }}>−</button>
            <span className={styles.qtyVal}>{qty}</span>
            <button className={styles.qtyBtn} onClick={() => { haptic.light(); setQty(q => q+1) }}>+</button>
          </div>
          <div className={styles.totalPrice}>{fmt(totalPrice)}</div>
        </div>

        <Button
          variant="primary" size="lg" fullWidth onClick={handleAdd} icon="🛒"
          disabled={isHotdog && !selectedBread}
        >
          {isHotdog && !selectedBread ? 'Non turini tanlang' : 'Savatga qo\'shish'}
        </Button>

        <button className={styles.closeBtn} onClick={onClose}>Yopish</button>
      </div>
    </div>
  )
}
