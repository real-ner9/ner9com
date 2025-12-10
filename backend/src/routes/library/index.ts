import { FastifyPluginAsync } from 'fastify'
import {
  getAlbumTracks,
  getCoverBuffer,
  getTrackStream,
  listAlbums
} from '../../services/local-music.service'

const libraryRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/albums', async function (_request, reply) {
    try {
      const albums = await listAlbums()
      return reply.send({ albums })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Не удалось загрузить альбомы' })
    }
  })

  fastify.get<{ Params: { id: string } }>('/albums/:id/tracks', async function (request, reply) {
    const albumId = request.params.id
    if (!albumId) {
      return reply.code(400).send({ error: 'albumId обязателен' })
    }

    try {
      const result = await getAlbumTracks(albumId)
      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.code(404).send({ error: 'Альбом не найден' })
    }
  })

  fastify.get<{ Params: { id: string } }>('/cover/:id', async function (request, reply) {
    const albumId = request.params.id
    if (!albumId) return reply.code(400).send({ error: 'albumId обязателен' })

    try {
      const cover = await getCoverBuffer(albumId)
      if (!cover) return reply.code(404).send({ error: 'Обложка не найдена' })

      reply.header('Content-Type', cover.mime)
      reply.header('Cache-Control', 'public, max-age=3600')
      return reply.send(cover.buffer)
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Не удалось отдать обложку' })
    }
  })

  fastify.get<{ Params: { id: string } }>('/stream/:id', async function (request, reply) {
    const trackId = request.params.id
    if (!trackId) return reply.code(400).send({ error: 'trackId обязателен' })

    try {
      const result = await getTrackStream(trackId, request.headers.range)
      reply.code(result.statusCode)
      Object.entries(result.headers).forEach(([key, value]) => reply.header(key, value))
      return reply.send(result.stream)
    } catch (error) {
      fastify.log.error(error)
      return reply.code(404).send({ error: 'Трек не найден' })
    }
  })
}

export const autoPrefix = '/library'

export default libraryRoutes
