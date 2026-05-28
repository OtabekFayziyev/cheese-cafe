import React, { useState } from 'react'
import { useDebounce, useFormat, useTelegram } from '@/hooks'
import { MENU_ITEMS, HOT_TAGS } from '@/api/mockData'
import { AppShell, Page, SectionHeader } from '@/components/layout/AppShell'
import { MenuCard } from '@/components/features/MenuCard'
import { FoodModal } from '@/components/features/FoodModal'
import { EmptyState, Button } from '@/components/ui'
import type { MenuItem } from '@/types'
import styles from './Search.module.css'

// Fuzzy search - xato yozishga chidamli
function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return false
  if (t.includes(q)) return true

  // Transliteration map (lotincha-kirill va teskari)
  const aliases: Record<string, string[]> = {
    'pitsa':  ['pizza','piza','picca','pica','pssa'],
    'pizza':  ['pitsa','piza','pica'],
    'burger': ['borger','burgar','brgr'],
    'lagmon': ["lag'mon",'lagman','loghmon'],
    'espresso':['esspresso','expresso','espreso'],
    'limonata':['limonad','lemonade','limonat'],
    'salad':  ['salat','salatlar'],
  }

  // Check aliases
  for (const [key, vals] of Object.entries(aliases)) {
    if (t.includes(key) && vals.some(v => q.includes(v) || v.includes(q))) return true
    if (vals.some(v => t.includes(v)) && (q.includes(key) || key.includes(q))) return true
  }

  // Levenshtein distance for short queries
  if (q.length >= 3) {
    const words = t.split(/\s+/)
    for (const word of words) {
      if (word.length < 3) continue
      const dist = levenshtein(q, word.slice(0, q.length + 2))
      if (dist <= Math.floor(q.length / 3)) return true
    }
  }
  return false
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[a.length][b.length]
}

export default function Search() {
  const [query, setQuery]           = useState('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const { haptic } = useTelegram()
  const debouncedQ = useDebounce(query, 300)

  const results = debouncedQ.trim().length > 0
    ? MENU_ITEMS.filter(m =>
        m.name.toLowerCase().includes(debouncedQ.toLowerCase()) ||
        m.description.toLowerCase().includes(debouncedQ.toLowerCase()) ||
        fuzzyMatch(m.name, debouncedQ) ||
        fuzzyMatch(m.description, debouncedQ)
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
