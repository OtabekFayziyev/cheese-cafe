import React, { useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAdminStore } from '@/store/adminStore'
import { menuAPI } from '@/api/client'
import { CATEGORIES } from '@/api/mockData'
import { useFormat, useTelegram } from '@/hooks'
import { AdminShell, AdminPageHeader } from './AdminShell'
import type { MenuItem } from '@/types'
import styles from './MenuManager.module.css'

const EMPTY_ITEM: Omit<MenuItem,'id'> = {
  categoryId: 'burgers', name: '', description: '', price: 0,
  emoji: '🍔', prepTime: 15, extras: [],
  isAvailable: true, isHot: false, isNew: false, rating: 0, soldCount: 0,
}

export default function MenuManager() {
  const { haptic } = useTelegram()
  const { fmt } = useFormat()
  const { menuItems, updateMenuItem, deleteMenuItem, toggleAvailability, addMenuItem } = useAdminStore()
  const [activeCat, setActiveCat]     = useState('all')
  const [editItem, setEditItem]       = useState<MenuItem | null>(null)
  const [isAdding, setIsAdding]       = useState(false)
  const [newItem, setNewItem]         = useState(EMPTY_ITEM)
  const [search, setSearch]           = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = menuItems.filter(m => {
    const matchCat = activeCat === 'all' || m.categoryId === activeCat
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleSaveEdit = () => {
    if (!editItem) return
    if (!editItem.name.trim()) { toast.error('Taom nomi bo\'sh!'); return }
    updateMenuItem(editItem.id, editItem)
    haptic.success()
    toast.success(`"${editItem.name}" saqlandi`)
    setEditItem(null)
  }

  const handleAdd = () => {
    if (!newItem.name.trim()) { toast.error('Taom nomi bo\'sh!'); return }
    if (newItem.price <= 0) { toast.error('Narx 0 dan katta bo\'lishi kerak'); return }
    addMenuItem({ ...newItem, id: `menu-${Date.now()}` })
    haptic.success()
    toast.success(`"${newItem.name}" qo'shildi!`)
    setNewItem(EMPTY_ITEM)
    setIsAdding(false)
  }

  const handleDelete = (id: string) => {
    const item = menuItems.find(m => m.id === id)
    deleteMenuItem(id)
    haptic.heavy()
    toast.success(`"${item?.name}" o'chirildi`)
    setConfirmDelete(null)
    if (editItem?.id === id) setEditItem(null)
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Menyu"
        subtitle={`${menuItems.length} ta taom`}
        action={
          <button className={styles.addBtn} onClick={() => { haptic.light(); setIsAdding(true) }}>
            + Yangi taom
          </button>
        }
      />

      {/* Search */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.searchInput}
          placeholder="Taom nomi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Category tabs */}
      <div className={styles.catTabs}>
        {[{ id:'all', name:'Barchasi', emoji:'🍽️' }, ...CATEGORIES.filter(c=>c.id!=='all')].map(cat => (
          <button
            key={cat.id}
            className={clsx(styles.catTab, activeCat === cat.id && styles.catTabActive)}
            onClick={() => { haptic.light(); setActiveCat(cat.id) }}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div className={styles.itemList}>
        {filtered.map((item, idx) => (
          <div
            key={item.id}
            className={clsx(styles.itemRow, !item.isAvailable && styles.itemUnavail)}
            style={{ animationDelay:`${idx*.03}s` }}
          >
            <div className={styles.itemEmoji}>{item.emoji}</div>
            <div className={styles.itemInfo}>
              <div className={styles.itemName}>
                {item.name}
                {item.isHot && <span className={styles.hotChip}>🔥</span>}
                {item.isNew && <span className={styles.newChip}>✨</span>}
              </div>
              <div className={styles.itemMeta}>
                {fmt(item.price)} · ⏱{item.prepTime}daq · ⭐{item.rating}
              </div>
            </div>
            <div className={styles.itemActions}>
              {/* Availability toggle */}
              <button
                className={clsx(styles.toggleAvail, item.isAvailable && styles.toggleAvailOn)}
                onClick={() => { haptic.light(); toggleAvailability(item.id) }}
                title={item.isAvailable ? 'Yopish' : 'Ochish'}
              >
                {item.isAvailable ? '👁️' : '🚫'}
              </button>
              {/* Edit */}
              <button
                className={styles.editBtn}
                onClick={() => { haptic.light(); setEditItem({ ...item }) }}
              >
                ✏️
              </button>
              {/* Delete */}
              <button
                className={styles.deleteBtn}
                onClick={() => { haptic.light(); setConfirmDelete(item.id) }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🍽️</div>
            <div className={styles.emptyText}>Taom topilmadi</div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editItem && (
        <div className={styles.overlay} onClick={() => setEditItem(null)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.sheetTitle}>✏️ Taomni tahrirlash</h3>
            <ItemForm item={editItem} onChange={setEditItem} />
            <div className={styles.sheetFooter}>
              <button className={styles.deleteModalBtn} onClick={() => setConfirmDelete(editItem.id)}>
                🗑️ O'chirish
              </button>
              <button className={styles.saveBtn} onClick={handleSaveEdit}>
                ✅ Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {isAdding && (
        <div className={styles.overlay} onClick={() => setIsAdding(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.sheetTitle}>➕ Yangi taom qo'shish</h3>
            <ItemForm item={newItem as any} onChange={setNewItem as any} isNew />
            <div className={styles.sheetFooter}>
              <button className={styles.cancelBtn} onClick={() => setIsAdding(false)}>
                Bekor
              </button>
              <button className={styles.saveBtn} onClick={handleAdd}>
                ➕ Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>🗑️</div>
            <div className={styles.confirmTitle}>Rostdan o'chirilsinmi?</div>
            <div className={styles.confirmSub}>
              "{menuItems.find(m=>m.id===confirmDelete)?.name}" menyudan butunlay o'chiriladi.
            </div>
            <div className={styles.confirmBtns}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDelete(null)}>Bekor</button>
              <button className={styles.dangerBtn} onClick={() => handleDelete(confirmDelete)}>O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

// ── Shared form component ──
function ItemForm({
  item,
  onChange,
  isNew = false,
}: {
  item: MenuItem
  onChange: (item: MenuItem) => void
  isNew?: boolean
}) {
  const { fmt } = useFormat()
  return (
    <div className={styles.form}>
      <div className={styles.formRow}>
        <label className={styles.formLabel}>Emoji</label>
        <input
          className={clsx(styles.formInput, styles.emojiInput)}
          value={item.emoji}
          onChange={e => onChange({ ...item, emoji: e.target.value })}
          maxLength={4}
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.formLabel}>Nomi *</label>
        <input
          className={styles.formInput}
          value={item.name}
          placeholder="Taom nomi..."
          onChange={e => onChange({ ...item, name: e.target.value })}
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.formLabel}>Tavsif</label>
        <textarea
          className={styles.formTextarea}
          value={item.description}
          placeholder="Qisqacha tavsif..."
          rows={2}
          onChange={e => onChange({ ...item, description: e.target.value })}
        />
      </div>
      <div className={styles.formRowDouble}>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Narx (so'm) *</label>
          <input
            className={styles.formInput}
            type="number" min={0} step={500}
            value={item.price || ''}
            onChange={e => onChange({ ...item, price: Number(e.target.value) })}
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Tayyor (daq)</label>
          <input
            className={styles.formInput}
            type="number" min={1} max={120}
            value={item.prepTime || ''}
            onChange={e => onChange({ ...item, prepTime: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className={styles.formRow}>
        <label className={styles.formLabel}>Kategoriya</label>
        <select
          className={styles.formSelect}
          value={item.categoryId}
          onChange={e => onChange({ ...item, categoryId: e.target.value })}
        >
          {CATEGORIES.filter(c=>c.id!=='all').map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
      </div>
      <div className={styles.formCheckRow}>
        {[
          { key:'isAvailable', label:'Mavjud' },
          { key:'isHot',       label:'🔥 Hot' },
          { key:'isNew',       label:'✨ Yangi' },
        ].map(({ key, label }) => (
          <label key={key} className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={!!(item as any)[key]}
              onChange={e => onChange({ ...item, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  )
}
