import { FastifyPluginAsync } from 'fastify'

const apiRoutes: FastifyPluginAsync = async (_fastify) => {
  // Маршрут оставлен только для обратной совместимости: Google отключён.
  // Используй /library/* эндпоинты.
}

export const autoPrefix = '/api'

export default apiRoutes
