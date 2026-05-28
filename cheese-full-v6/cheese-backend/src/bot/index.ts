import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import { prisma } from '../utils/db'
import {
  emitNewOrder,
  emitOrderStatusChanged,
} from '../services/socket'

// ── Bot instance ──
export const bot = new Bot(process.env.BOT_TOKEN!)

// ── Mini App URL ──
const MINI_APP_URL = process.env.FRONTEND_URL || 'https://your-app.vercel.app'
const ADMIN_IDS    = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).filter(Boolean)

// ═══════════════════════════════════════
// /start — birinchi kirish
// ═══════════════════════════════════════
bot.command('start', async (ctx) => {
  const tgUser = ctx.from!
  if (!tgUser) return

  // DB dan tekshirish
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgUser.id) },
  })

  // Yangi foydalanuvchi yoki telefon raqami yo'q
  if (!user || !user.phone) {
    await ctx.reply(
      `🧀 *CHEESE Cafe ga xush kelibsiz, ${tgUser.first_name}!*\n\n` +
      `Buyurtma berish va yetkazib olish uchun avval *telefon raqamingizni* yuboring.\n\n` +
      `Bu sizning buyurtmangizni to'g'ri yetkazib berish uchun kerak 🚀`,
      {
        parse_mode: 'Markdown',
        reply_markup: new Keyboard()
          .requestContact('📱 Raqamimni yuborish')
          .resized()
          .oneTime(),
      }
    )
    return
  }

  // Avval ro'yxatdan o'tgan — Mini App tugmasi
  await sendWelcomeBack(ctx, tgUser.first_name)
})

// ── Telefon raqami kelganda ──
bot.on('message:contact', async (ctx) => {
  const contact = ctx.message.contact
  const tgUser  = ctx.from!

  // Faqat o'z raqamini yuborishi kerak
  if (contact.user_id !== tgUser.id) {
    await ctx.reply('❌ Iltimos, faqat *o\'z raqamingizni* yuboring.', { parse_mode: 'Markdown' })
    return
  }

  const phone = contact.phone_number.startsWith('+')
    ? contact.phone_number
    : `+${contact.phone_number}`

  // DB ga saqlash
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
    `Endi CHEESE Cafe dan buyurtma bera olasiz! 🍔🍕`,
    {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true },
    }
  )

  // Mini App tugmasini ko'rsatish
  await sendWelcomeBack(ctx, tgUser.first_name)
})

// ── /menu buyrug'i ──
bot.command('menu', async (ctx) => {
  await ctx.reply(
    '🍽️ *CHEESE Cafe Menyu*\n\nQuyidagi tugmani bosib to\'liq menyuni ko\'ring:',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .webApp('🍔 Menyuni ko\'rish', MINI_APP_URL),
    }
  )
})

// ── /order buyrug'i ──
bot.command('order', async (ctx) => {
  await ctx.reply(
    '🛒 *Buyurtma berish*',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .webApp('🛒 Buyurtma berish', MINI_APP_URL),
    }
  )
})

// ── /status buyrug'i ──
bot.command('status', async (ctx) => {
  const tgUser = ctx.from!
  const user   = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgUser.id) },
  })
  if (!user) { await ctx.reply('Siz ro\'yxatdan o\'tmagansiz. /start ni bosing.'); return }

  const activeOrder = await prisma.order.findFirst({
    where:   { userId: user.id, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'desc' },
  })

  if (!activeOrder) {
    await ctx.reply('📭 Hozirda faol buyurtmangiz yo\'q.\n\n/order — yangi buyurtma berish')
    return
  }

  const statusEmoji: Record<string, string> = {
    PENDING:    '🔔 Yangi — qabul kutilmoqda',
    ACCEPTED:   '✅ Qabul qilindi',
    PREPARING:  '👨‍🍳 Tayyorlanmoqda',
    READY:      '📦 Tayyor — kuryer kelmoqda',
    ON_THE_WAY: '🛵 Yo\'lda — tez yetadi!',
    DELIVERED:  '✅ Yetkazildi',
    CANCELLED:  '❌ Bekor qilindi',
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
        .webApp('🔍 Batafsil ko\'rish', MINI_APP_URL),
    }
  )
})

// ── /profile buyrug'i ──
bot.command('profile', async (ctx) => {
  const tgUser = ctx.from!
  const user   = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgUser.id) },
  })
  if (!user) { await ctx.reply('Avval /start ni bosing.'); return }

  const ordersCount = await prisma.order.count({
    where: { userId: user.id, status: 'DELIVERED' },
  })

  await ctx.reply(
    `👤 *Profil*\n\n` +
    `Ism: ${user.firstName} ${user.lastName || ''}\n` +
    `Telefon: ${user.phone || 'Kiritilmagan'}\n` +
    `Bonus ball: ⭐ *${user.bonusPoints}*\n` +
    `Yetkazilgan buyurtmalar: ${ordersCount} ta\n\n` +
    `Profil sozlamalari uchun ilovani oching:`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .webApp('👤 Profilni ochish', MINI_APP_URL),
    }
  )
})

// ── /help buyrug'i ──
bot.command('help', async (ctx) => {
  await ctx.reply(
    `🧀 *CHEESE Cafe — Buyruqlar*\n\n` +
    `/start — Boshlash\n` +
    `/menu — Menyuni ko\'rish\n` +
    `/order — Buyurtma berish\n` +
    `/status — Buyurtma holati\n` +
    `/profile — Profil\n` +
    `/help — Yordam\n\n` +
    `📞 Muammo bo'lsa: @cheese_cafe`,
    { parse_mode: 'Markdown' }
  )
})

// ── Noma'lum xabar ──
bot.on('message:text', async (ctx) => {
  await ctx.reply(
    '🍔 CHEESE Cafe ga xush kelibsiz!\n\nBuyurtma berish uchun quyidagi tugmani bosing:',
    {
      reply_markup: new InlineKeyboard()
        .webApp('🛒 Buyurtma berish', MINI_APP_URL),
    }
  )
})

// ═══════════════════════════════════════
// PUSH NOTIFICATIONS (backend dan chaqiriladi)
// ═══════════════════════════════════════

// Foydalanuvchiga — buyurtma holati o'zgarganda
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
    CANCELLED:  `❌ *${orderNumber}* buyurtmangiz bekor qilindi.\n${extra || 'Sabab: noma\'lum'}\n\nQayta buyurtma berish uchun /order`,
  }

  const msg = statusMessages[status]
  if (!msg) return

  try {
    await bot.api.sendMessage(String(telegramId), msg, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .webApp('📦 Buyurtmani ko\'rish', MINI_APP_URL),
    })
  } catch (e) {
    console.error('Push notification xatosi:', e)
  }
}

// Adminga — yangi buyurtma kelganda
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
          .webApp('✅ Admin Panel', `${MINI_APP_URL}?panel=admin`),
      })
    } catch (e) {
      console.error(`Admin ${adminId} ga xabar yuborishda xato:`, e)
    }
  }
}

// Kuryerga — yangi vazifa
export async function notifyCourierNewTask(courierTelegramId: bigint, order: any) {
  try {
    await bot.api.sendMessage(
      String(courierTelegramId),
      `🛵 *Yangi vazifa!*\n\n` +
      `📋 ${order.orderNumber}\n` +
      `📍 ${order.address || 'Manzil yo\'q'}\n` +
      `${order.addressDetail ? `🏠 ${order.addressDetail}\n` : ''}` +
      `📞 ${order.phone}\n` +
      `💰 Yetkazish: *${order.deliveryFee?.toLocaleString()} so'm*`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .webApp('📦 Vazifani ko\'rish', `${MINI_APP_URL}?panel=courier`),
      }
    )
  } catch (e) {
    console.error('Kuryer xabarnomasi xatosi:', e)
  }
}

// ── Helper ──
async function sendWelcomeBack(ctx: any, name: string) {
  await ctx.reply(
    `🧀 *Xush kelibsiz, ${name}!*\n\n` +
    `CHEESE Cafe dan mazali taomlar buyurtma qiling 🍔🍕🍰\n\n` +
    `⏰ Ish vaqti: 09:00 – 05:00\n` +
    `🚀 Yetkazish: 30-45 daqiqa`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .webApp('🛒 Buyurtma berish', MINI_APP_URL)
        .row()
        .webApp('🍽️ Menyuni ko\'rish', MINI_APP_URL)
        .row()
        .webApp('👤 Profilim', MINI_APP_URL),
    }
  )
}

// ── Error handler ──
bot.catch((err) => {
  console.error('Bot xatosi:', err.message)
})
