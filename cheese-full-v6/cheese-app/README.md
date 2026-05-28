# 🧀 CHEESE Cafe — Frontend

## Loyiha tuzilmasi

```
cheese-app/
├── src/
│   ├── pages/
│   │   ├── user/
│   │   │   ├── Home.tsx        ← Bosh sahifa (karusel, menyu, kategoriyalar)
│   │   │   ├── Search.tsx      ← Qidiruv sahifasi
│   │   │   ├── Cart.tsx        ← Savat + checkout
│   │   │   ├── Favs.tsx        ← Sevimlilar
│   │   │   └── Profile.tsx     ← Profil (bonus, promo, tarix)
│   │   ├── admin/              ← (keyingi bosqich)
│   │   └── courier/            ← (keyingi bosqich)
│   ├── components/
│   │   ├── ui/                 ← Button, Badge, Input, Skeleton, EmptyState
│   │   ├── layout/             ← AppShell (bottom nav), Page, SectionHeader
│   │   └── features/           ← MenuCard, FoodModal
│   ├── store/
│   │   └── index.ts            ← Zustand: cartStore, userStore, orderStore, cafeStore
│   ├── hooks/
│   │   └── index.ts            ← useTelegram, useFormat, useWorkHours, useDebounce, useLocation
│   ├── api/
│   │   └── mockData.ts         ← Mock menu, kategoriyalar, sozlamalar
│   ├── types/
│   │   └── index.ts            ← Barcha TypeScript tiplari
│   ├── App.tsx                 ← Router + QueryClient
│   ├── main.tsx                ← Entry point
│   └── index.css               ← Global CSS (CHEESE design system)
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Rang sxemasi (CHEESE Brand)

| Token | Rang | Qayerda |
|-------|------|---------|
| `--yellow` | `#F5C800` | Tugmalar, aktiv elementlar, badge |
| `--dark` | `#1A1A1A` | Asosiy fon (dark), matn |
| `--white` | `#FAFAFA` | Sahifa foni, kartalar |

## O'rnatish

```bash
cd cheese-app
npm install
npm run dev
```

## Promo kodlar (test uchun)

| Kod | Chegirma | Minimum |
|-----|----------|---------|
| `CHEESE10` | 10 000 so'm | 30 000 so'm |
| `WELCOME`  | 5 000 so'm  | 20 000 so'm |
| `SUMMER25` | 25%         | 50 000 so'm |
| `FREESHIP` | Bepul yetkazish | 40 000 so'm |

## Texnologiyalar

- **React 18** + TypeScript
- **Vite** (tez build)
- **Zustand** + persist (global state)
- **React Query** (server state)
- **React Router v6** (routing)
- **canvas-confetti** (promo effect)
- **react-hot-toast** (bildirisnomalar)
- **Telegram WebApp SDK** (TWA integratsiya)

## Keyingi bosqich

1. Admin panel (`/admin`)
2. Kuryer panel (`/courier`)
3. Backend API (Fastify + Prisma)
4. Grammy bot
5. Deploy (Railway + Vercel)
