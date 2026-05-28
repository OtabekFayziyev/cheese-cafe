import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import { prisma } from '../utils/db'
import {
  emitNewOrder,
  emitOrderStatusChanged,
} from '../services/socket'

export const bot = new Bot(process.env.BOT_TOKEN!)

const MINI_APP_URL = process.env.FRONTEND_URL || 'https://your-app.vercel.app'
const ADMIN_IDS    = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).filter(Boolean)

// ── Telefon borligini tekshirish ──
async function checkPhone(ctx: any): Promise<boolean> {
  const tgUser = ctx.from!
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgUser.id) },
  })
  return !!(user?.phone)
}

// ── Telefon so'rash ──
async function askPhone(ctx: any) {
  await ctx.reply(
    `⚠️ *Avval telefon raqamingizni ulashing!*\n\n` +
    `Buyurtma berish uchun raqamingiz kerak.\n` +
    `Faqat *o'zingizning* raqamingizni ulashing!`,
    {
      parse_mode: 'Markdown',
      reply_markup: new Keyboard()
        .requestContact('📱 Raqamimni ulashish')
        .resized()
        .oneTime(),
    }
  )
}

// /start
bot.command('start', async (ctx) => {
  const tgUser = ctx.from!
  if (!tgUser) return

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgUser.id) },
  })

  if (!user || !user.phone) {
    await ctx.reply(
      `🧀 *Cheese Cafe ga xush kelibsiz, ${tgUser.first_name}!*\n\n` +
      `Buyurtma berish uchun avval *o'z telefon raqamingizni* ulashing.\n\n` +
      `Buyurtmani tezroq va sifatli yetkazib berish uchun kerak 🚀\n\n` +
      `⚠️ Faqat *o'zingizning* raqamingizni ulashing!`,
      {
        parse_mode: 'Markdown',
        reply_markup: new Keyboard()
          .requestContact('📱 Raqamimni ulashish')
          .resized()
          .oneTime(),
      }
    )
    return
  }

  await sendWelcomeBack(ctx, tgUser.first_name)
})

// Telefon kelganda
bot.on('message:contact', async (ctx) => {
  const contact = ctx.message.contact
  const tgUser  = ctx.from!

  // Qat'iy tekshirish
  if (!contact.user_id || contact.user_id !== tgUser.id) {
    await ctx.reply(
      `❌ *Boshqa raqam qabul qilinmaydi!*\n\n` +
      `Iltimos, faqat *o'zingizning* Telegram raqamingizni ulashing.\n\n` +
      `Pastdagi tugmani bosing:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new Keyboard()
          .requestContact("📱 O'z raqamimni ulashish")
          .resized()
          .oneTime(),
      }
    )
    return
  }

  const phone = contact.phone_number.startsWith('+')
    ? contact.phone_number
    : `+${contact.phone_number}`

  await prisma.user.upsert({
    where:  { telegramId: BigInt(tgUser.id) },
    update: { phone, firstName: tgUser.first_name, lastName: tgUser.last_name, username: tgUser.username },
    create: {
      telegramId: BigInt(tgUser.id),
      firstName:  tgUser.first_name,
      lastName:   tgUser.last_name,
      username:   tgUser.username,
      phone,
    },
  })

  await ctx.reply(
    `✅ *Rahmat, ${tgUser.first_name}!*\n\n` +
    `Raqamingiz saqlandi: *${phone}*\n\n` +
    `Endi Cheese Cafe dan buyurtma bera olasiz! 🍔🍕`,
    {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true },
    }
  )

  await sendWelcomeBack(ctx, tgUser.first_name)
})

// /menu
bot.command('menu', async (ctx) => {
  if (!await checkPhone(ctx)) { await askPhone(ctx); return }
  await ctx.reply('🍽️ *Cheese Cafe Menyu*', {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .webApp("🍔 Menyuni ko'rish", `${MINI_APP_URL}/user`),
  })
})

// /order
bot.command('order', async (ctx) => {
  if (!await checkPhone(ctx)) { await askPhone(ctx); return }
  await ctx.reply(
    "🛒 *Buyurtma berish*\n\n👇 Pastdagi *Buyurtma* tugmasini bosing!",
    { parse_mode: 'Markdown' }
  )
})

// /status
bot.command('status', async (ctx) => {
  if (!await checkPhone(ctx)) { await askPhone(ctx); return }

  const tgUser = ctx.from!
  const user   = await prisma.user.findUnique({ where: { telegramId: BigInt(tgUser.id) } })
  if (!user) return

  const activeOrder = await prisma.order.findFirst({
    where:   { userId: user.id, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'desc' },
  })

  if (!activeOrder) {
    await ctx.reply("📭 Hozirda faol buyurtmangiz yo'q.\n\n👇 Pastdagi *Buyurtma* tugmasini bosing!", { parse_mode: 'Markdown' })
    return
  }

  const statusEmoji: Record<string, string> = {
    PENDING:    "🔔 Yangi — qabul kutilmoqda",
    ACCEPTED:   "✅ Qabul qilindi",
    PREPARING:  "👨‍🍳 Tayyorlanmoqda",
    READY:      "📦 Tayyor — kuryer kelmoqda",
    ON_THE_WAY: "🛵 Yo'lda — tez yetadi!",
    DELIVERED:  "✅ Yetkazildi",
    CANCELLED:  "❌ Bekor qilindi",
  }

  const elapsed = Math.floor((Date.now() - new Date(activeOrder.createdAt).getTime()) / 60000)

  await ctx.reply(
    `📦 *Buyurtma ${activeOrder.orderNumber}*\n\n` +
    `Holat: ${statusEmoji[activeOrder.status] || activeOrder.status}\n` +
    `Vaqt: ${elapsed} daqiqa oldin berilgan\n\n` +
    `Taomlar:\n${activeOrder.items.map(i => `• ${i.menuItem.emoji} ${i.menuItem.name} ×${i.quantity}`).join('\n')}\n\n` +
    `💰 Jami: *${activeOrder.totalPrice.toLocaleString()} so'm*`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .webApp("🔍 Batafsil ko'rish", MINI_APP_URL),
    }
  )
})

// /profile
bot.command('profile', async (ctx) => {
  if (!await checkPhone(ctx)) { await askPhone(ctx); return }

  const tgUser = ctx.from!
  const user   = await prisma.user.findUnique({ where: { telegramId: BigInt(tgUser.id) } })
  if (!user) return

  const ordersCount = await prisma.order.count({ where: { userId: user.id, status: 'DELIVERED' } })

  await ctx.reply(
    `👤 *Profil*\n\n` +
    `Ism: ${user.firstName} ${user.lastName || ''}\n` +
    `Telefon: ${user.phone || 'Kiritilmagan'}\n` +
    `Bonus ball: ⭐ *${user.bonusPoints}*\n` +
    `Yetkazilgan buyurtmalar: ${ordersCount} ta`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .webApp("👤 Profilni ochish", `${MINI_APP_URL}/user/profile`),
    }
  )
})

// /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    `🧀 *CHEESE Cafe — Buyruqlar*\n\n` +
    `/start — Boshlash\n` +
    `/menu — Menyuni ko'rish\n` +
    `/order — Buyurtma berish\n` +
    `/status — Buyurtma holati\n` +
    `/profile — Profil\n` +
    `/help — Yordam\n\n` +
    `📞 Muammo bo'lsa: @cheese_cafe`,
    { parse_mode: 'Markdown' }
  )
})

// Noma'lum xabar
bot.on('message:text', async (ctx) => {
  const tgUser = ctx.from!
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgUser.id) } })

  if (!user?.phone) {
    await askPhone(ctx)
    return
  }

  await ctx.reply("👇 Pastdagi *Buyurtma* tugmasini bosing!", { parse_mode: 'Markdown' })
})

// ═══════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════

export async function notifyUserOrderStatus(
  telegramId: bigint,
  orderNumber: string,
  status: string,
  extra?: string
) {
  const statusMessages: Record<string, string> = {
    ACCEPTED:   `✅ *${orderNumber}* buyurtmangiz qabul qilindi!\n👨‍🍳 Tayyorlanmoqda...`,
    PREPARING:  `👨‍🍳 *${orderNumber}* buyurtmangiz tayyorlanmoqda!\n⏱ Biroz kutib turing...`,
    READY:      `📦 *${orderNumber}* buyurtmangiz tayyor!\n🛵 Kuryer yo'lda...`,
    ON_THE_WAY: `🛵 *${orderNumber}* buyurtmangiz yo'lda!\n${extra || 'Tez yetib keladi!'}`,
    DELIVERED:  `🎉 *${orderNumber}* yetkazildi!\nTaomingizdan zavqlaning! 😋\n\nIlovada baho bering ⭐`,
    CANCELLED:  `❌ *${orderNumber}* buyurtmangiz bekor qilindi.\n${extra || "Sabab: noma'lum"}\n\nQayta buyurtma berish uchun /order`,
  }

  const msg = statusMessages[status]
  if (!msg) return

  try {
    await bot.api.sendMessage(String(telegramId), msg, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .webApp("📦 Buyurtmani ko'rish", MINI_APP_URL),
    })
  } catch (e) {
    console.error('Push notification xatosi:', e)
  }
}

export async function notifyAdminNewOrder(order: any) {
  if (!ADMIN_IDS.length) return

  const itemsList = order.items
    ?.map((i: any) => `• ${i.menuItem?.emoji || ''} ${i.menuItem?.name} ×${i.quantity}`)
    .join('\n') || ''

  const msg =
    `🔔 *Yangi buyurtma!*\n\n` +
    `📋 ${order.orderNumber}\n` +
    `👤 ${order.user?.firstName || 'Mijoz'} · ${order.phone}\n` +
    `${order.deliveryType === 'PICKUP' ? '🏃 Olib ketish' : `🛵 ${order.address || ''}`}\n\n` +
    `${itemsList}\n\n` +
    `💰 *${order.totalPrice?.toLocaleString()} so'm*`

  for (const adminId of ADMIN_IDS) {
    try {
      await bot.api.sendMessage(String(adminId), msg, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .webApp('✅ Admin Panel', `${MINI_APP_URL}/admin`),
      })
    } catch (e) {
      console.error(`Admin ${adminId} ga xabar yuborishda xato:`, e)
    }
  }
}

export async function notifyCourierNewTask(courierTelegramId: bigint, order: any) {
  try {
    await bot.api.sendMessage(
      String(courierTelegramId),
      `🛵 *Yangi vazifa!*\n\n` +
      `📋 ${order.orderNumber}\n` +
      `📍 ${order.address || "Manzil yo'q"}\n` +
      `${order.addressDetail ? `🏠 ${order.addressDetail}\n` : ''}` +
      `📞 ${order.phone}\n` +
      `💰 Yetkazish: *${order.deliveryFee?.toLocaleString()} so'm*`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .webApp("📦 Vazifani ko'rish", `${MINI_APP_URL}/courier`),
      }
    )
  } catch (e) {
    console.error('Kuryer xabarnomasi xatosi:', e)
  }
}

// Helper
async function sendWelcomeBack(ctx: any, name: string) {
  await ctx.reply(
    `🧀 *Xush kelibsiz, ${name}!*\n\n` +
    `Cheese Cafe dan mazali taomlar buyurtma qiling 🍔🍕🍰\n\n` +
    `⏰ Ish vaqti: 09:00 – 04:30\n` +
    `🚀 Yetkazish: 20-30 daqiqa\n\n` +
    `👇 Pastdagi *Buyurtma* tugmasini bosing!`,
    { parse_mode: 'Markdown' }
  )
}

bot.catch((err) => {
  console.error('Bot xatosi:', err.message)
})