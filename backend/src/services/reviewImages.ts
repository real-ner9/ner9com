import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { putObject } from './storage'

/**
 * Images attached to reviews and replies. Every upload is re-encoded to webp: it proves the file
 * is an image, drops its metadata (phone photos carry GPS) and keeps sizes sane. Animated GIFs
 * stay animated.
 */
const FULL_PX = 1600
const THUMB_PX = 480

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
/** Per review or reply (the owner wants one). */
export const MAX_IMAGES = 1

export const imageKey = (id: string, thumb = false) => `reviews/${id}${thumb ? '-480' : ''}.webp`

export const imageUrls = (id: string) => ({
  url: `/media/${imageKey(id)}`,
  thumbUrl: `/media/${imageKey(id, true)}`
})

async function encode(input: Buffer, px: number, animated: boolean) {
  let image = sharp(input, { animated, limitInputPixels: 50_000_000 })
  if (!animated) image = image.rotate() // honour the EXIF orientation before it is dropped
  return image
    .resize(px, px, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
}

/** Stores an upload in S3; throws if it isn't an image sharp can read. */
export async function storeImage(input: Buffer) {
  const meta = await sharp(input, { animated: true }).metadata()
  const animated = (meta.pages ?? 1) > 1
  const id = randomUUID()
  const [full, thumb] = await Promise.all([
    encode(input, FULL_PX, animated),
    encode(input, THUMB_PX, animated)
  ])
  await Promise.all([
    putObject(imageKey(id), full.data, 'image/webp'),
    putObject(imageKey(id, true), thumb.data, 'image/webp')
  ])
  // For animated images sharp reports the height of the whole strip of frames.
  const height = animated ? (full.info.pageHeight ?? full.info.height) : full.info.height
  return { id, width: full.info.width, height }
}
