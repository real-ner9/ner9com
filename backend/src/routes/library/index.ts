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
type FileQuery = { Querystring: { v?: string; size?: string } }

// URLs carry the file's version (?v=), so a versioned response never changes and browsers and
// Cloudflare may keep it for a year; unversioned (old) URLs get a short lifetime.
const cacheControl = (v?: string) =>
  v ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'

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

  // The whole library for Songs and Artists. Lean: clients rebuild streamUrl from id and v and
  // take the cover from the album, which roughly halves the response.
  fastify.get('/tracks', async () => ({
    tracks: (await getAllTracks()).map(({ streamUrl: _s, coverUrl: _c, ...track }) => track)
  }))

  fastify.get<IdParams>('/albums/:id/tracks', async (request, reply) => {
    try {
      return await getAlbumTracks(request.params.id)
    } catch (error) {
      request.log.warn({ err: error }, 'album not found')
      return reply.notFound('Альбом не найден')
    }
  })

  // ?size=small is the 160 px thumbnail for lists and the mini player.
  fastify.get<IdParams & FileQuery>('/cover/:id', async (request, reply) => {
    const { v, size } = request.query
    const cover = await getCover(request.params.id, size === 'small' ? 'small' : 'large', v).catch(
      () => null
    )
    if (!cover) return reply.notFound('Обложка не найдена')

    return reply
      .header('Content-Type', cover.mime)
      .header('Cache-Control', cacheControl(v))
      .send(cover.buffer)
  })

  fastify.get<IdParams & FileQuery>('/stream/:id', async (request, reply) => {
    try {
      const { statusCode, headers, stream } = await getTrackStream(
        request.params.id,
        request.headers.range
      )
      return reply
        .code(statusCode)
        .headers({ ...headers, 'Cache-Control': cacheControl(request.query.v) })
        .send(stream)
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
