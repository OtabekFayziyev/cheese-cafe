import React, { useState, useMemo } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAdminStore } from '@/store/adminStore'
import { useFormat, useTelegram } from '@/hooks'
import { AdminShell, AdminPageHeader } from './AdminShell'
import type { Customer } from '@/store/adminStore'
import styles from './Customers.module.css'

export default function Customers() {
  const { haptic } = useTelegram()
  const { fmt }    = useFormat()
  const { customers, orders, blockCustomer, unblockCustomer } = useAdminStore()

  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState<'all'|'active'|'blocked'>('all')
  const [selected, setSelected]       = useState<Customer|null>(null)
  const [blockModal, setBlockModal]   = useState<Customer|null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [blockUntil, setBlockUntil]   = useState('')

  const filtered = useMemo(() =>
    customers.filter(c => {
      const matchSearch = !search ||
        c.firstName.toLowerCase().includes(search.toLowerCase()) ||
        c.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.username?.includes(search)
      const matchFilter = filter==='all' || (filter==='blocked'?c.isBlocked:!c.isBlocked)
      return matchSearch && matchFilter
    }).sort((a,b) => b.totalOrders - a.totalOrders),
    [customers, search, filter]
  )

  const handleBlock = () => {
    if (!blockModal || !blockReason.trim()) { toast.error('Sabab kiriting!'); return }
    haptic.heavy()
    blockCustomer(blockModal.id, blockReason, blockUntil||undefined)
    toast.error(`${blockModal.firstName} bloklandi`)
    setBlockModal(null); setBlockReason(''); setBlockUntil('')
    if (selected?.id === blockModal.id) setSelected(prev => prev ? {...prev, isBlocked:true} : null)
  }

  const handleUnblock = (c: Customer) => {
    haptic.medium()
    unblockCustomer(c.id)
    toast.success(`${c.firstName} blokdan chiqarildi`)
    if (selected?.id === c.id) setSelected(prev => prev ? {...prev, isBlocked:false} : null)
  }

  // Customer orders
  const customerOrders = (userId: number) =>
    orders.filter((o:any) => o.userId === userId).slice(0,5)

  return (
    <AdminShell>
      <AdminPageHeader
        title="Mijozlar"
        subtitle={`${customers.length} ta ro'yxatda · ${customers.filter(c=>c.isBlocked).length} ta bloklangan`}
      />

      {/* Search */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input className={styles.searchInput} placeholder="Ism, telefon yoki username..."
          value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {/* Filter */}
      <div className={styles.filterRow}>
        {([{k:'all',l:'Barchasi'},{k:'active',l:'Aktiv'},{k:'blocked',l:'Bloklangan'}] as any[]).map(f => (
          <button key={f.k}
            className={clsx(styles.filterBtn, filter===f.k && styles.filterActive)}
            onClick={() => { haptic.light(); setFilter(f.k) }}
          >
            {f.l}
            <span className={styles.filterCnt}>
              {f.k==='all'?customers.length:f.k==='blocked'?customers.filter(c=>c.isBlocked).length:customers.filter(c=>!c.isBlocked).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className={styles.list}>
        {filtered.map((c, idx) => (
          <div key={c.id}
            className={clsx(styles.customerRow, c.isBlocked && styles.customerBlocked)}
            style={{ animationDelay:`${idx*.03}s` }}
            onClick={() => { haptic.light(); setSelected(c) }}
          >
            <div className={styles.avatar}>
              {c.isBlocked ? '🚫' : c.firstName[0]+((c.lastName||'')[0]||'')}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>
                {c.firstName} {c.lastName}
                {c.username && <span className={styles.username}>@{c.username}</span>}
              </div>
              <div className={styles.meta}>{c.phone} · {c.totalOrders} ta buyurtma</div>
            </div>
            <div className={styles.right}>
              <div className={styles.spent}>{fmt(c.totalSpent)}</div>
              <div className={styles.pts}>{c.bonusPoints} ball</div>
            </div>
          </div>
        ))}
      </div>

      {/* Customer detail */}
      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <div className={styles.sheet} onClick={e=>e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.detailTop}>
              <div className={styles.detailAvatar}>
                {selected.isBlocked ? '🚫' : selected.firstName[0]+((selected.lastName||'')[0]||'')}
              </div>
              <div>
                <div className={styles.detailName}>{selected.firstName} {selected.lastName}</div>
                {selected.username && <div className={styles.detailSub}>@{selected.username}</div>}
                {selected.isBlocked && <div className={styles.blockedBadge}>🚫 Bloklangan</div>}
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}><div className={styles.detailCellLbl}>Telefon</div><div>{selected.phone||'—'}</div></div>
              <div className={styles.detailCell}><div className={styles.detailCellLbl}>Telegram ID</div><div>{selected.telegramId}</div></div>
              <div className={styles.detailCell}><div className={styles.detailCellLbl}>Buyurtmalar</div><div className={styles.detailCellBig}>{selected.totalOrders}</div></div>
              <div className={styles.detailCell}><div className={styles.detailCellLbl}>Jami xarid</div><div className={styles.detailCellBig}>{fmt(selected.totalSpent)}</div></div>
              <div className={styles.detailCell}><div className={styles.detailCellLbl}>Bonus ball</div><div className={styles.detailCellBig}>{selected.bonusPoints}</div></div>
              <div className={styles.detailCell}>
                <div className={styles.detailCellLbl}>Ro'yxat sanasi</div>
                <div>{new Date(selected.registeredAt).toLocaleDateString('uz-UZ')}</div>
              </div>
            </div>

            {/* Recent orders */}
            <div className={styles.ordersSection}>
              <div className={styles.ordersSectionTitle}>Oxirgi buyurtmalar</div>
              {customerOrders(selected.telegramId).length === 0
                ? <div className={styles.noOrders}>Buyurtma yo'q</div>
                : customerOrders(selected.telegramId).map((o:any) => (
                  <div key={o.id} className={styles.orderMini}>
                    <span className={styles.orderMiniId}>{o.id}</span>
                    <span className={styles.orderMiniItems}>{o.items.length} taom</span>
                    <span className={styles.orderMiniTotal}>{fmt(o.totalPrice)}</span>
                  </div>
                ))
              }
            </div>

            {/* Block/unblock */}
            <div className={styles.actions}>
              {selected.isBlocked ? (
                <button className={styles.unblockBtn} onClick={() => handleUnblock(selected)}>
                  ✅ Blokdan chiqarish
                </button>
              ) : (
                <button className={styles.blockBtn} onClick={() => { setBlockModal(selected); setSelected(null) }}>
                  🚫 Bloklash
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Block modal */}
      {blockModal && (
        <div className={styles.overlay} onClick={() => setBlockModal(null)}>
          <div className={styles.blockCard} onClick={e=>e.stopPropagation()}>
            <div className={styles.blockIcon}>🚫</div>
            <div className={styles.blockTitle}>{blockModal.firstName}ni bloklash</div>
            <textarea className={styles.reasonInput} rows={3} placeholder="Bloklash sababi (majburiy)..."
              value={blockReason} onChange={e=>setBlockReason(e.target.value)} />
            <div className={styles.untilRow}>
              <label className={styles.untilLabel}>Muddatli blok (ixtiyoriy)</label>
              <input type="date" className={styles.untilInput}
                value={blockUntil} onChange={e=>setBlockUntil(e.target.value)} />
            </div>
            <div className={styles.blockBtns}>
              <button className={styles.blockCancelBtn} onClick={() => setBlockModal(null)}>Bekor</button>
              <button className={styles.blockConfirmBtn} onClick={handleBlock}>Bloklash</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
