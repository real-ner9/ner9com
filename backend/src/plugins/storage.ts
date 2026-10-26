import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import { MAX_UPLOAD_BYTES } from '../services/reviewImages'
import { ensureBucket, storageEnabled } from '../services/storage'

// Image uploads for reviews: multipart parsing (one file per request) and the S3 bucket, created
// on first start. Without S3 settings the site runs without uploads.
export default fp(async (fastify) => {
  await fastify.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } })

  fastify.addHook('onReady', async () => {
    if (!storageEnabled()) {
      fastify.log.warn('S3 is not configured: image uploads are off')
      return
    }
    await ensureBucket().catch((error) =>
      fastify.log.error({ err: error }, 'could not reach S3: image uploads will fail')
    )
  })
})
