import React, { useState } from 'react'
import { useDebounce, useFormat, useTelegram } from '@/hooks'
import { MENU_ITEMS, HOT_TAGS } from '@/api/mockData'
import { AppShell, Page, SectionHeader } from '@/components/layout/AppShell'
import { MenuCard } from '@/components/features/MenuCard'
import { FoodModal } from '@/components/features/FoodModal'
import { EmptyState, Button } from '@/components/ui'
import type { MenuItem } from '@/types'
import styles from './Search.module.css'

export default function Search() {
  const [query, setQuery]           = useState('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const { haptic } = useTelegram()
  const debouncedQ = useDebounce(query, 300)

  const results = debouncedQ.trim().length > 0
    ? MENU_ITEMS.filter(m =>
        m.name.toLowerCase().includes(debouncedQ.toLowerCase()) ||
        m.description.toLowerCase().includes(debouncedQ.toLowerCase())
      )
    : []

  const showResults = debouncedQ.trim().length > 0
  const trendingItems = MENU_ITEMS.filter(m => m.isHot || m.soldCount > 200)

  return (
    <AppShell>
      <Page>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Qidiruv</h1>
        </div>

        {/* Search Input */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Taom nomi yoki kategoriya..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {!showResults ? (
          <>
            {/* Hot tags */}
            <div className={styles.tagsSection}>
              <div className={styles.tagsTitle}>🔥 Trendlar</div>
              <div className={styles.tags}>
                {HOT_TAGS.map(tag => (
                  <button
                    key={tag}
                    className={styles.tag}
                    onClick={() => { haptic.light(); setQuery(tag) }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending / Popular */}
            <SectionHeader title="Ko'p sotilganlar" />
            <div className={styles.grid}>
              {trendingItems.map(item => (
                <MenuCard
                  key={item.id}
                  item={item}
                  onClick={() => { haptic.light(); setSelectedItem(item) }}
                />
              ))}
            </div>
          </>
        ) : results.length > 0 ? (
          <>
            <div className={styles.resultCount}>
              {results.length} ta natija topildi
            </div>
            <div className={styles.grid}>
              {results.map(item => (
                <MenuCard
                  key={item.id}
                  item={item}
                  onClick={() => { haptic.light(); setSelectedItem(item) }}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            emoji="🍽️"
            title="Topilmadi!"
            description={`"${debouncedQ}" menyuda hozircha yo'q.\nOshpazdan maxsus buyurtma berishingiz mumkin!`}
            animateEmoji="float"
            action={
              <Button
                variant="primary"
                fullWidth
                onClick={() => haptic.success()}
                icon="👨‍🍳"
              >
                Maxsus taom so'rash
              </Button>
            }
          />
        )}

        <div style={{ height: 24 }} />
      </Page>

      {selectedItem && (
        <FoodModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </AppShell>
  )
}
