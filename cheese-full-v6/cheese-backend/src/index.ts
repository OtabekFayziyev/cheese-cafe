// BigInt JSON serialization fix
;(BigInt.prototype as any).toJSON = function() { return this.toString() }

import 'dotenv/config'
import Fastify       from 'fastify'
import cors          from '@fastify/cors'
import jwt           from '@fastify/jwt'
import helmet        from '@fastify/helmet'
import rateLimit     from '@fastify/rate-limit'

import { registerRoutes } from './routes/index'
import { initSocket }     from './services/socket'
import { bot }            from './bot/index'

const app = Fastify({
  logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' },
})

async function bootstrap() {
  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin:      process.env.FRONTEND_URL || '*',
    credentials: true,
    methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'cheese-dev-secret-key-32-chars-minimum!!',
  })
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' })

  await registerRoutes(app)

  // Socket.io — Fastify serveriga ulash
  initSocket(app, process.env.FRONTEND_URL || 'http://localhost:5173')

  // Webhook (production)
  if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
    await bot.init()
    app.post('/webhook', async (req, reply) => {
      await bot.handleUpdate(req.body as any)
      return reply.send('ok')
    })
  }

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error)
    if (error.validation) {
      return reply.code(400).send({ success: false, error: 'Validation error', details: error.validation })
    }
    return reply.code(error.statusCode || 500).send({
      success: false,
      error:   (!error.statusCode || error.statusCode === 500) ? 'Server xatosi' : error.message,
    })
  })

  const port = Number(process.env.PORT) || 3000
  await app.listen({ port, host: '0.0.0.0' })

  // Bot
  if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
    const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`
    await bot.api.setWebhook(webhookUrl)
    console.log(`🤖 Bot webhook: ${webhookUrl}`)
  } else {
    bot.start({
      onStart: (info) => console.log(`🤖 Bot: @${info.username}`),
    })
  }

  console.log(`🧀 CHEESE Backend: http://localhost:${port}`)
}

bootstrap().catch(err => { console.error('❌ Server xatosi:', err); process.exit(1) })
