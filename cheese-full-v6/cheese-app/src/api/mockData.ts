import type { Category, MenuItem, CafeSettings, BonusReward } from '@/types'

export const CATEGORIES: Category[] = [
  { id: 'all',      name: 'Barchasi',    emoji: '🍽️', sortOrder: 0 },
  { id: 'burgers',  name: 'Burgerlar',   emoji: '🍔', sortOrder: 1 },
  { id: 'hotdogs',  name: 'Hot Dog',     emoji: '🌭', sortOrder: 2 },
  { id: 'pizza',    name: 'Pitsa',       emoji: '🍕', sortOrder: 3 },
  { id: 'salads',   name: 'Salatlar',    emoji: '🥗', sortOrder: 4 },
  { id: 'soups',    name: "Sho'rvalar",  emoji: '🍜', sortOrder: 5 },
  { id: 'sets',     name: 'Setlar',      emoji: '🎁', sortOrder: 6 },
  { id: 'drinks',   name: 'Ichimliklar', emoji: '🥤', sortOrder: 7 },
  { id: 'desserts', name: 'Desertlar',   emoji: '🍰', sortOrder: 8 },
]

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1', categoryId: 'burgers',
    name: 'Truffle Burger',
    description: "Qo'l bilan tayyorlangan kotlet, truffle sousi, karamelized piyoz, arugula va briosh non.",
    price: 45000, emoji: '🍔', prepTime: 15,
    extras: [
      { id: 'e1', name: '🧀 Sir',      price: 3000 },
      { id: 'e2', name: '🥓 Bekon',    price: 5000 },
      { id: 'e3', name: '🥫 Sous',     price: 1000 },
      { id: 'e4', name: '🌶 Jalapeno', price: 2000 },
    ],
    isAvailable: true, isHot: true, isNew: false, rating: 4.9, soldCount: 312,
  },
  {
    id: 'm2', categoryId: 'burgers',
    name: 'Classic BBQ',
    description: "Klassik BBQ sousi, cheddor sir va tandir kotlet bilan tayyorlangan burger.",
    price: 35000, emoji: '🍔', prepTime: 12,
    extras: [
      { id: 'e1', name: '🧀 Sir',   price: 3000 },
      { id: 'e2', name: '🥓 Bekon', price: 5000 },
      { id: 'e3', name: '🥫 Sous',  price: 1000 },
    ],
    isAvailable: true, isHot: false, isNew: false, rating: 4.7, soldCount: 198,
  },
  // HOT DOGS — with bread type + preset notes
  {
    id: 'hd1', categoryId: 'hotdogs',
    name: 'Classic Hot Dog',
    description: "Klassik sosiska, tursha bodring, ketchup va xantal sousi bilan.",
    price: 18000, emoji: '🌭', prepTime: 7,
    extras: [
      { id: 'hd_e1', name: '🧀 Sir',        price: 2000 },
      { id: 'hd_e2', name: '🌶 Jalapeno',   price: 1000 },
      { id: 'hd_e3', name: '🥒 Qo\'shimcha bodring', price: 500 },
    ],
    breadOptions: ['Non', 'Bulochka'],
    presetNotes: [
      'Chips bolmasin',
      'Qizil ketchup bolmasin',
      'Funchoza salati bolmasin',
      'Pomidor bodring bolmasin',
      'Xantal bolmasin',
      'Sous ko\'p bo\'lsin',
    ],
    isAvailable: true, isHot: true, isNew: false, rating: 4.6, soldCount: 287,
  },
  {
    id: 'hd2', categoryId: 'hotdogs',
    name: 'Cheese Dog',
    description: "Ikki qavat sir, sosiska va maxsus sous bilan.",
    price: 22000, emoji: '🌭', prepTime: 8,
    extras: [
      { id: 'hd_e1', name: '🧀 Qo\'shimcha sir', price: 2000 },
      { id: 'hd_e4', name: '🥓 Bekon',           price: 4000 },
    ],
    breadOptions: ['Non', 'Bulochka'],
    presetNotes: [
      'Chips bolmasin',
      'Qizil ketchup bolmasin',
      'Funchoza salati bolmasin',
      'Pomidor bodring bolmasin',
      'Sous oz bo\'lsin',
    ],
    isAvailable: true, isHot: false, isNew: true, rating: 4.5, soldCount: 134,
  },
  {
    id: 'm3', categoryId: 'pizza',
    name: 'Margarita',
    description: "Italyan uslubida tayyorlangan, yangi mozzarella va tomat sousi bilan.",
    price: 55000, emoji: '🍕', prepTime: 20,
    extras: [
      { id: 'e5', name: '🧀 Pishloq',    price: 4000 },
      { id: 'e6', name: '🫒 Zaytun',     price: 2000 },
      { id: 'e7', name: '🍄 Qo\'ziqorin', price: 3000 },
    ],
    isAvailable: true, isHot: true, isNew: false, rating: 4.8, soldCount: 275,
  },
  {
    id: 'm4', categoryId: 'pizza',
    name: 'Pepperoni',
    description: "Isiqqina, o'tkir pepperoni va mozzarella bilan to'lib-toshgan pitsa.",
    price: 65000, emoji: '🍕', prepTime: 22,
    extras: [
      { id: 'e5', name: '🧀 Pishloq', price: 4000 },
      { id: 'e4', name: '🌶 Jalapeno', price: 2000 },
    ],
    isAvailable: true, isHot: false, isNew: false, rating: 4.6, soldCount: 187,
  },
  {
    id: 'm5', categoryId: 'salads',
    name: 'Avokado Salad',
    description: "Yangi avokado, pomidor, rukola va sitrus dressing bilan tayyorlangan.",
    price: 28000, emoji: '🥗', prepTime: 8,
    extras: [
      { id: 'e8', name: '🍗 Tovuq',    price: 8000 },
      { id: 'e9', name: '🦐 Krevetka', price: 12000 },
    ],
    isAvailable: true, isHot: false, isNew: true, rating: 4.5, soldCount: 143,
  },
  {
    id: 'm6', categoryId: 'soups',
    name: "Lag'mon",
    description: "O'zbek uslubida qo'l qorilgan xamir va mol go'shti bilan.",
    price: 22000, emoji: '🍜', prepTime: 18,
    extras: [
      { id: 'e10', name: "🥩 Go'sht qo'shish", price: 6000 },
      { id: 'e11', name: "🌶 O'tkir",          price: 500 },
    ],
    isAvailable: true, isHot: false, isNew: false, rating: 4.8, soldCount: 421,
  },
  {
    id: 'm7', categoryId: 'sets',
    name: 'Family Set',
    description: "2 ta Truffle Burger + 1 ta Margarita + 2 ta Limonata. Oilalar uchun ideal!",
    price: 120000, emoji: '🎁', prepTime: 25,
    extras: [],
    isAvailable: true, isHot: true, isNew: false, rating: 4.9, soldCount: 89,
  },
  {
    id: 'm8', categoryId: 'drinks',
    name: 'Limonata',
    description: "Uy limonatasi, yangi limon va nana barg bilan tayyorlangan.",
    price: 12000, emoji: '🍋', prepTime: 5,
    extras: [
      { id: 'e12', name: '🧊 Buz',  price: 500 },
      { id: 'e13', name: '🌿 Nana', price: 500 },
    ],
    isAvailable: true, isHot: false, isNew: false, rating: 4.4, soldCount: 356,
  },
  {
    id: 'm9', categoryId: 'desserts',
    name: 'Cheesecake',
    description: "Klassik New York cheesecake, malina sousi bilan.",
    price: 32000, emoji: '🍰', prepTime: 5,
    extras: [
      { id: 'e14', name: '🍓 Malina sousi', price: 2000 },
      { id: 'e15', name: '🍫 Shokolad',    price: 2000 },
    ],
    isAvailable: true, isHot: false, isNew: true, rating: 4.9, soldCount: 201,
  },
  {
    id: 'm10', categoryId: 'drinks',
    name: 'Espresso',
    description: "Italyan arabika qahvasi, kuchli va xushbo'y.",
    price: 15000, emoji: '☕', prepTime: 4,
    extras: [
      { id: 'e16', name: '🥛 Sut',    price: 2000 },
      { id: 'e17', name: '🍦 Qaymoq', price: 3000 },
    ],
    isAvailable: true, isHot: true, isNew: false, rating: 4.7, soldCount: 498,
  },
]

// Pizza builder ingredients
export const PIZZA_BASE = [
  { id: 'pb1', name: 'Klassik (yupqa)',   price: 0    },
  { id: 'pb2', name: 'Qalin qoʻlda',     price: 5000 },
  { id: 'pb3', name: 'Pishloqli qirra',  price: 8000 },
]
export const PIZZA_SAUCE = [
  { id: 'ps1', name: 'Tomat sousi',   price: 0    },
  { id: 'ps2', name: 'BBQ sousi',     price: 2000 },
  { id: 'ps3', name: 'Slivka sousi',  price: 3000 },
  { id: 'ps4', name: 'Sousiz',        price: 0    },
]
export const PIZZA_CHEESE = [
  { id: 'pc1', name: 'Mozzarella',    price: 0    },
  { id: 'pc2', name: 'Cheddor',       price: 3000 },
  { id: 'pc3', name: 'Parmesan',      price: 4000 },
  { id: 'pc4', name: 'Mikst (3 xil)', price: 6000 },
]
export const PIZZA_TOPPINGS = [
  { id: 'pt1',  name: '🍗 Tovuq',          price: 8000  },
  { id: 'pt2',  name: '🥩 Mol goʻshti',    price: 10000 },
  { id: 'pt3',  name: '🥓 Bekon',          price: 7000  },
  { id: 'pt4',  name: '🦐 Krevetka',       price: 12000 },
  { id: 'pt5',  name: '🍄 Qoʻziqorin',     price: 3000  },
  { id: 'pt6',  name: '🫒 Zaytun',         price: 2000  },
  { id: 'pt7',  name: '🧅 Piyoz',          price: 1000  },
  { id: 'pt8',  name: '🌶 Jalapeno',       price: 2000  },
  { id: 'pt9',  name: '🍍 Ananas',         price: 3000  },
  { id: 'pt10', name: '🫑 Bolgar qalampir', price: 2000 },
  { id: 'pt11', name: '🥦 Brokkoli',       price: 2000  },
  { id: 'pt12', name: '🍅 Pomidor',        price: 1500  },
]

export const CAFE_SETTINGS: CafeSettings = {
  isOpen: true,
  workHours: [0,1,2,3,4,5,6].map(day => ({
    day,
    open:  '09:00',
    close: '05:00',
    isOff: false,
  })),
  deliveryFeeBase: 5000,
  deliveryFeePerKm: 1000,
  minOrderAmount: 20000,
  estimatedTime: 30,
}

export const BONUS_REWARDS: BonusReward[] = [
  { id: 'b1', name: 'Bepul Limonata',   emoji: '🍋', pointsRequired: 100,  menuItemId: '8'  },
  { id: 'b2', name: 'Bepul Espresso',   emoji: '☕', pointsRequired: 200,  menuItemId: '10' },
  { id: 'b3', name: 'Bepul Cheesecake', emoji: '🍰', pointsRequired: 400,  menuItemId: '9'  },
  { id: 'b4', name: 'Bepul Margarita',  emoji: '🍕', pointsRequired: 700,  menuItemId: '3'  },
  { id: 'b5', name: 'Bepul Family Set', emoji: '🎁', pointsRequired: 1200, menuItemId: '7'  },
]

export const VALID_PROMOS: Record<string, {
  discount: number
  discountType: 'fixed' | 'percent'
  minOrder: number
  expiresAt: string
}> = {
  'CHEESE10': { discount: 10000, discountType: 'fixed',   minOrder: 30000, expiresAt: '2025-12-31' },
  'WELCOME':  { discount: 5000,  discountType: 'fixed',   minOrder: 20000, expiresAt: '2025-06-30' },
  'SUMMER25': { discount: 25,    discountType: 'percent', minOrder: 50000, expiresAt: '2025-08-31' },
  'FREESHIP': { discount: 5000,  discountType: 'fixed',   minOrder: 40000, expiresAt: '2025-09-30' },
}

export const HOT_TAGS = ['Burger', 'Hot Dog', 'Pitsa', "Lag'mon", 'Cheesecake', 'Set', 'Espresso']
