// ═══════════════════════════════════
// FAVS PAGE
// ═══════════════════════════════════
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/store'
import { MENU_ITEMS } from '@/api/mockData'
import { AppShell, Page } from '@/components/layout/AppShell'
import { MenuCard } from '@/components/features/MenuCard'
import { FoodModal } from '@/components/features/FoodModal'
import { EmptyState, Button } from '@/components/ui'
import { useTelegram } from '@/hooks'
import type { MenuItem } from '@/types'
import styles from './Favs.module.css'

export function Favs() {
  const navigate  = useNavigate()
  const { haptic } = useTelegram()
  const favIds = useUserStore(s => s.favIds)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  const favItems = MENU_ITEMS.filter(m => favIds.includes(m.id))

  return (
    <AppShell>
      <Page>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Sevimlilar</h1>
          {favItems.length > 0 && (
            <span className={styles.count}>{favItems.length} ta</span>
          )}
        </div>

        {favItems.length === 0 ? (
          <EmptyState
            emoji="🤍"
            title="Sevimlilar bo'sh"
            description={"Yoqtirgan taomlaringizni ❤️ bosib\nshu yerda saqlang. Keyingisida\ntezda topasiz!"}
            animateEmoji="heartbeat"
            action={
              <Button variant="primary" fullWidth onClick={() => navigate('/user')} icon="🍽️">
                Menyuni ko'rish
              </Button>
            }
          />
        ) : (
          <div className={styles.grid}>
            {favItems.map(item => (
              <MenuCard
                key={item.id}
                item={item}
                onClick={() => { haptic.light(); setSelectedItem(item) }}
              />
            ))}
          </div>
        )}

        <div style={{ height: 24 }} />
      </Page>

      {selectedItem && (
        <FoodModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </AppShell>
  )
}
