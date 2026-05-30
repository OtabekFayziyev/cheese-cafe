import type { FastifyInstance } from 'fastify'
import { authenticate, requireAdmin, requireSuperAdmin, requireCourier, telegramAuth } from '../middleware/auth'

// Controllers
import * as menu    from '../controllers/menu'
import * as orders  from '../controllers/orders'
import * as users   from '../controllers/users'

export async function registerRoutes(app: FastifyInstance) {

  // ═══════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════
  app.post('/api/auth/telegram', telegramAuth)

  // ═══════════════════════════════════════
  // PUBLIC
  // ═══════════════════════════════════════
  app.get('/api/menu',              menu.getMenu)
  app.get('/api/menu/categories',   menu.getCategories)
  app.get('/api/menu/:id',          menu.getMenuItem)
  app.get('/api/settings',          users.getSettings)
  app.post('/api/promo/validate',   { preHandler: [authenticate] }, users.validatePromo)

  // ═══════════════════════════════════════
  // USER (himoyalangan)
  // ═══════════════════════════════════════
  app.get('/api/user/me',             { preHandler: [authenticate] }, users.getMe)
  app.patch('/api/user/me',           { preHandler: [authenticate] }, users.updateMe)
  app.post('/api/user/address',       { preHandler: [authenticate] }, users.saveAddress)
  app.delete('/api/user/address/:id', { preHandler: [authenticate] }, users.deleteAddress)
  app.post('/api/promo/save',         { preHandler: [authenticate] }, users.savePromo)

  app.post('/api/orders',             { preHandler: [authenticate] }, orders.createOrder)
  app.get('/api/orders',              { preHandler: [authenticate] }, orders.getUserOrders)
  app.get('/api/orders/:id',          { preHandler: [authenticate] }, orders.getOrder)

  // ═══════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════
  app.get('/api/admin/orders',              { preHandler: [authenticate, requireAdmin] }, orders.getAdminOrders)
  app.patch('/api/admin/orders/:id/status', { preHandler: [authenticate, requireAdmin] }, orders.updateOrderStatus)

  app.post('/api/admin/menu',               { preHandler: [authenticate, requireAdmin] }, menu.createMenuItem)
  app.patch('/api/admin/menu/:id',          { preHandler: [authenticate, requireAdmin] }, menu.updateMenuItem)
  app.delete('/api/admin/menu/:id',         { preHandler: [authenticate, requireAdmin] }, menu.deleteMenuItem)
  app.patch('/api/admin/menu/:id/toggle',   { preHandler: [authenticate, requireAdmin] }, menu.toggleAvailability)

  app.get('/api/admin/users',               { preHandler: [authenticate, requireAdmin] }, users.getUsers)
  app.patch('/api/admin/users/:id/block',   { preHandler: [authenticate, requireAdmin] }, users.blockUser)
  app.patch('/api/admin/users/:id/unblock', { preHandler: [authenticate, requireAdmin] }, users.unblockUser)

  app.get('/api/admin/stats',               { preHandler: [authenticate, requireAdmin] }, users.getStats)
  app.get('/api/admin/audit-logs',          { preHandler: [authenticate, requireSuperAdmin] }, users.getAuditLogs)
  app.patch('/api/admin/settings',          { preHandler: [authenticate, requireAdmin] }, users.updateSettings)
  app.patch('/api/admin/settings/hours',    { preHandler: [authenticate, requireAdmin] }, users.updateWorkHours)

  // ═══════════════════════════════════════
  // COURIER
  // ═══════════════════════════════════════
  app.get('/api/courier/orders',              { preHandler: [authenticate, requireCourier] }, orders.getCourierOrders)
  app.patch('/api/courier/orders/:id/status', { preHandler: [authenticate, requireCourier] }, orders.updateCourierOrderStatus)
  app.patch('/api/courier/location',          { preHandler: [authenticate, requireCourier] }, orders.updateCourierLocation)
  app.get('/api/courier/:id/location',        { preHandler: [authenticate] },                 orders.getCourierLocation)

  // ═══════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════
  app.get('/health', async () => ({
    status: 'ok',
    time:   new Date().toISOString(),
    env:    process.env.NODE_ENV,
  }))
}
