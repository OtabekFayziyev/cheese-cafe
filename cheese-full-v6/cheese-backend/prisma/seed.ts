import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')

  // Work hours
  for (let day = 0; day < 7; day++) {
    await prisma.workHours.upsert({
      where:  { day },
      update: {},
      create: { day, open: '09:00', close: '05:00', isOff: false },
    })
  }

  // Cafe settings
  const settings = [
    { key: 'delivery_fee_base',   value: '5000'  },
    { key: 'delivery_fee_per_km', value: '1000'  },
    { key: 'min_order_amount',    value: '20000' },
    { key: 'estimated_time',      value: '30'    },
    { key: 'is_open',             value: 'true'  },
    { key: 'cafe_phone',          value: '+998901234567' },
    { key: 'cafe_address',        value: 'Toshkent, Yunusobod tumani, 19-mavze' },
    { key: 'cafe_instagram',      value: '@cheese_cafe_uz' },
    { key: 'cafe_telegram',       value: '@cheese_cafe' },
    { key: 'bonus_per_10k',       value: '1' },
  ]
  for (const s of settings) {
    await prisma.cafeSetting.upsert({
      where: { key: s.key }, update: {}, create: s,
    })
  }

  // Categories
  const cats = [
    { id: 'burgers',  name: 'Burgerlar',   emoji: '🍔', sortOrder: 1 },
    { id: 'hotdogs',  name: 'Hot Dog',     emoji: '🌭', sortOrder: 2 },
    { id: 'pizza',    name: 'Pitsa',       emoji: '🍕', sortOrder: 3 },
    { id: 'salads',   name: 'Salatlar',    emoji: '🥗', sortOrder: 4 },
    { id: 'soups',    name: "Sho'rvalar",  emoji: '🍜', sortOrder: 5 },
    { id: 'sets',     name: 'Setlar',      emoji: '🎁', sortOrder: 6 },
    { id: 'drinks',   name: 'Ichimliklar', emoji: '🥤', sortOrder: 7 },
    { id: 'desserts', name: 'Desertlar',   emoji: '🍰', sortOrder: 8 },
  ]
  for (const c of cats) {
    await prisma.category.upsert({ where: { id: c.id }, update: {}, create: c })
  }

  // Menu items
  type MenuItem = {
    id: string; categoryId: string; name: string; description: string
    price: number; emoji: string; prepTime: number
    isHot?: boolean; isNew?: boolean; rating: number; soldCount: number
    extras: { name: string; price: number }[]
  }

  const items: MenuItem[] = [
    {
      id: 'm1', categoryId: 'burgers',
      name: 'Truffle Burger',
      description: "Qo'l bilan tayyorlangan kotlet, truffle sousi, karamelized piyoz, arugula va briosh non.",
      price: 45000, emoji: '🍔', prepTime: 15, isHot: true, rating: 4.9, soldCount: 312,
      extras: [{ name: '🧀 Sir', price: 3000 }, { name: '🥓 Bekon', price: 5000 }, { name: '🥫 Sous', price: 1000 }, { name: '🌶 Jalapeno', price: 2000 }],
    },
    {
      id: 'm2', categoryId: 'burgers',
      name: 'Classic BBQ',
      description: "Klassik BBQ sousi, cheddor sir va tandir kotlet bilan tayyorlangan burger.",
      price: 35000, emoji: '🍔', prepTime: 12, rating: 4.7, soldCount: 198,
      extras: [{ name: '🧀 Sir', price: 3000 }, { name: '🥓 Bekon', price: 5000 }, { name: '🥫 Sous', price: 1000 }],
    },
    {
      id: 'm3', categoryId: 'hotdogs',
      name: 'Classic Hot Dog',
      description: "Klassik sosiska, tursha bodring, ketchup va xantal sousi bilan.",
      price: 18000, emoji: '🌭', prepTime: 7, isHot: true, rating: 4.6, soldCount: 287,
      extras: [{ name: '🧀 Sir', price: 2000 }, { name: '🌶 Jalapeno', price: 1000 }],
    },
    {
      id: 'm4', categoryId: 'pizza',
      name: 'Margarita',
      description: "Italyan uslubida, yangi mozzarella va tomat sousi bilan.",
      price: 55000, emoji: '🍕', prepTime: 20, isHot: true, rating: 4.8, soldCount: 275,
      extras: [{ name: "🧀 Pishloq", price: 4000 }, { name: '🫒 Zaytun', price: 2000 }, { name: "🍄 Qo'ziqorin", price: 3000 }],
    },
    {
      id: 'm5', categoryId: 'pizza',
      name: 'Pepperoni',
      description: "O'tkir pepperoni va mozzarella bilan to'lib-toshgan pitsa.",
      price: 65000, emoji: '🍕', prepTime: 22, rating: 4.6, soldCount: 187,
      extras: [{ name: "🧀 Pishloq", price: 4000 }, { name: '🌶 Jalapeno', price: 2000 }],
    },
    {
      id: 'm6', categoryId: 'salads',
      name: 'Avokado Salad',
      description: "Yangi avokado, pomidor, rukola va sitrus dressing bilan.",
      price: 28000, emoji: '🥗', prepTime: 8, isNew: true, rating: 4.5, soldCount: 143,
      extras: [{ name: "🍗 Tovuq", price: 8000 }, { name: '🦐 Krevetka', price: 12000 }],
    },
    {
      id: 'm7', categoryId: 'soups',
      name: "Lag'mon",
      description: "O'zbek uslubida qo'l qorilgan xamir va mol go'shti bilan.",
      price: 22000, emoji: '🍜', prepTime: 18, rating: 4.8, soldCount: 421,
      extras: [{ name: "🥩 Go'sht qo'shish", price: 6000 }, { name: "🌶 O'tkir", price: 500 }],
    },
    {
      id: 'm8', categoryId: 'sets',
      name: 'Family Set',
      description: "2 ta Truffle Burger + 1 ta Margarita + 2 ta Limonata.",
      price: 120000, emoji: '🎁', prepTime: 25, isHot: true, rating: 4.9, soldCount: 89,
      extras: [],
    },
    {
      id: 'm9', categoryId: 'drinks',
      name: 'Limonata',
      description: "Uy limonatasi, yangi limon va nana barg bilan.",
      price: 12000, emoji: '🍋', prepTime: 5, rating: 4.4, soldCount: 356,
      extras: [{ name: '🧊 Buz', price: 500 }, { name: '🌿 Nana', price: 500 }],
    },
    {
      id: 'm10', categoryId: 'desserts',
      name: 'Cheesecake',
      description: "Klassik New York cheesecake, malina sousi bilan.",
      price: 32000, emoji: '🍰', prepTime: 5, isNew: true, rating: 4.9, soldCount: 201,
      extras: [{ name: '🍓 Malina sousi', price: 2000 }, { name: '🍫 Shokolad', price: 2000 }],
    },
    {
      id: 'm11', categoryId: 'drinks',
      name: 'Espresso',
      description: "Italyan arabika qahvasi, kuchli va xushbo'y.",
      price: 15000, emoji: '☕', prepTime: 4, isHot: true, rating: 4.7, soldCount: 498,
      extras: [{ name: '🥛 Sut', price: 2000 }, { name: '🍦 Qaymoq', price: 3000 }],
    },
  ]

  for (const item of items) {
    const { extras, ...data } = item
    await prisma.menuItem.upsert({
      where:  { id: data.id },
      update: {},
      create: {
        ...data,
        isHot:     data.isHot     ?? false,
        isNew:     data.isNew     ?? false,
        extras:    { create: extras.map(e => ({ ...e, id: `${data.id}-${e.name.slice(0,4)}` })) },
      },
    })
  }

  // Promo codes
  const promos = [
    { code: 'CHEESE10', discountType: 'FIXED'   as const, discount: 10000, minOrder: 30000, expiresAt: new Date('2025-12-31') },
    { code: 'WELCOME',  discountType: 'FIXED'   as const, discount: 5000,  minOrder: 20000, expiresAt: new Date('2025-06-30') },
    { code: 'SUMMER25', discountType: 'PERCENT' as const, discount: 25,    minOrder: 50000, expiresAt: new Date('2025-08-31') },
    { code: 'FREESHIP', discountType: 'FIXED'   as const, discount: 5000,  minOrder: 40000, expiresAt: new Date('2025-09-30') },
  ]
  for (const p of promos) {
    await prisma.promoCode.upsert({ where: { code: p.code }, update: {}, create: p })
  }

  // Bonus rewards
  const rewards = [
    { id: 'bonus-1', name: 'Bepul Limonata',   emoji: '🍋', pointsRequired: 100,  menuItemId: 'm9'  },
    { id: 'bonus-2', name: 'Bepul Espresso',   emoji: '☕', pointsRequired: 200,  menuItemId: 'm11' },
    { id: 'bonus-3', name: 'Bepul Cheesecake', emoji: '🍰', pointsRequired: 400,  menuItemId: 'm10' },
    { id: 'bonus-4', name: 'Bepul Margarita',  emoji: '🍕', pointsRequired: 700,  menuItemId: 'm4'  },
    { id: 'bonus-5', name: 'Bepul Family Set', emoji: '🎁', pointsRequired: 1200, menuItemId: 'm8'  },
  ]
  for (const r of rewards) {
    await prisma.bonusReward.upsert({ where: { id: r.id }, update: {}, create: { ...r, isActive: true } })
  }

  console.log('✅ Seed complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
