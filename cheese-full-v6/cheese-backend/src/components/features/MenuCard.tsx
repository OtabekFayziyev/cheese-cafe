import React from 'react'
import clsx from 'clsx'
import { useUserStore, useCartStore } from '@/store'
import { useFormat, useTelegram } from '@/hooks'
import { Badge } from '@/components/ui'
import type { MenuItem } from '@/types'
import styles from './MenuCard.module.css'

interface MenuCardProps {
  item: MenuItem
  onClick?: () => void
  className?: string
}

export function MenuCard({ item, onClick, className }: MenuCardProps) {
  const { fmt } = useFormat()
  const { haptic } = useTelegram()
  const favIds   = useUserStore(s => s.favIds)
  const toggleFav = useUserStore(s => s.toggleFav)
  const addItem  = useCartStore(s => s.addItem)

  const isFav = favIds.includes(item.id)

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation()
    haptic.light()
    toggleFav(item.id)
  }

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    haptic.medium()
    addItem(item, 1, [], '')
  }

  return (
    <div className={clsx(styles.card, !item.isAvailable && styles.unavailable, className)} onClick={onClick}>
      {/* Image area */}
      <div className={styles.imgWrap}>
        <span className={styles.emoji}>{item.emoji}</span>

        {/* Fav button */}
        <button
          className={clsx(styles.favBtn, isFav && styles.favActive)}
          onClick={handleFav}
          aria-label={isFav ? "Sevimlilardan chiqarish" : "Sevimliga qo'shish"}
        >
          {isFav ? '❤️' : '🤍'}
        </button>

        {/* Badges */}
        <div className={styles.badges}>
          {item.isHot && <Badge variant="yellow" size="sm">🔥 HOT</Badge>}
          {item.isNew && <Badge variant="dark" size="sm">✨ YANGI</Badge>}
          {!item.isAvailable && <Badge variant="red" size="sm">Mavjud emas</Badge>}
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <h4 className={styles.name}>{item.name}</h4>
        <p className={styles.desc}>{item.description.slice(0, 42)}…</p>

        <div className={styles.meta}>
          <span className={styles.rating}>⭐ {item.rating}</span>
          <span className={styles.sold}>{item.soldCount} ta sotilgan</span>
        </div>

        <div className={styles.footer}>
          <span className={styles.price}>{fmt(item.price)}</span>
          {item.isAvailable && (
            <button
              className={styles.addBtn}
              onClick={handleQuickAdd}
              aria-label="Savatga qo'shish"
            >
              <span>+</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Horizontal list card (for search trending) ──
export function MenuCardHorizontal({ item, onClick }: MenuCardProps) {
  const { fmt } = useFormat()
  const { haptic } = useTelegram()
  const favIds    = useUserStore(s => s.favIds)
  const toggleFav = useUserStore(s => s.toggleFav)
  const addItem   = useCartStore(s => s.addItem)
  const isFav = favIds.includes(item.id)

  return (
    <div className={styles.hCard} onClick={onClick}>
      <div className={styles.hEmoji}>{item.emoji}</div>
      <div className={styles.hInfo}>
        <div className={styles.hName}>{item.name}</div>
        <div className={styles.hPrice}>{fmt(item.price)}</div>
      </div>
      <div className={styles.hActions}>
        <button className={clsx(styles.hFav, isFav && styles.hFavActive)}
          onClick={e => { e.stopPropagation(); haptic.light(); toggleFav(item.id) }}>
          {isFav ? '❤️' : '🤍'}
        </button>
        <button className={styles.hAdd}
          onClick={e => { e.stopPropagation(); haptic.medium(); addItem(item, 1, [], '') }}>
          +
        </button>
      </div>
    </div>
  )
}
