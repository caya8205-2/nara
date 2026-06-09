import type { FastifyPluginAsync } from 'fastify'

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ message: 'reports — not implemented yet' }))
}

export default plugin
