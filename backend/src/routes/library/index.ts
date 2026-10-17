import { FastifyPluginAsync } from 'fastify'
import {
  getAlbumTracks,
  getAllTracks,
  getCover,
  getTrackStream,
  listAlbums,
  RangeNotSatisfiableError
} from '../../services/local-music.service'

type IdParams = { Params: { id: string } }

const libraryRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Reading the tags of a few thousand files takes a while: do it at startup, not on the first
  // visitor's request.
  fastify.addHook('onReady', async () => {
    const started = Date.now()
    listAlbums()
      .then((albums) =>
        fastify.log.info({ albums: albums.length, ms: Date.now() - started }, 'music library indexed')
      )
      .catch((error) => fastify.log.error({ err: error }, 'music library index failed'))
  })

  fastify.get('/albums', async () => ({ albums: await listAlbums() }))

  fastify.get('/tracks', async () => ({ tracks: await getAllTracks() }))

  fastify.get<IdParams>('/albums/:id/tracks', async (request, reply) => {
    try {
      return await getAlbumTracks(request.params.id)
    } catch (error) {
      request.log.warn({ err: error }, 'album not found')
      return reply.notFound('Альбом не найден')
    }
  })

  fastify.get<IdParams>('/cover/:id', async (request, reply) => {
    const cover = await getCover(request.params.id).catch(() => null)
    if (!cover) return reply.notFound('Обложка не найдена')

    return reply
      .header('Content-Type', cover.mime)
      .header('Cache-Control', 'public, max-age=86400')
      .send(cover.buffer)
  })

  fastify.get<IdParams>('/stream/:id', async (request, reply) => {
    try {
      const { statusCode, headers, stream } = await getTrackStream(
        request.params.id,
        request.headers.range
      )
      return reply.code(statusCode).headers(headers).send(stream)
    } catch (error) {
      if (error instanceof RangeNotSatisfiableError) {
        return reply
          .code(416)
          .header('Content-Range', `bytes */${error.fileSize}`)
          .send()
      }
      request.log.warn({ err: error }, 'track not found')
      return reply.notFound('Трек не найден')
    }
  })
}

export const autoPrefix = '/library'

export default libraryRoutes
