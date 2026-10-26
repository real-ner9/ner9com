import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import type { Readable } from 'node:stream'

/**
 * S3 storage for images attached to reviews: SeaweedFS in docker-compose locally and on the VPS
 * (any S3 works). Configured by S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY and S3_SECRET_KEY; without
 * them uploads are switched off and the rest of the site works as before. The bucket is private:
 * the backend serves the files (routes/media), so nothing else has to be exposed.
 */
const endpoint = process.env.S3_ENDPOINT
const bucket = process.env.S3_BUCKET
const accessKeyId = process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.S3_SECRET_KEY

const client =
  endpoint && bucket && accessKeyId && secretAccessKey
    ? new S3Client({
        endpoint,
        region: 'us-east-1',
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true
      })
    : null

export const storageEnabled = () => client !== null

/** Creates the bucket on first start. */
export async function ensureBucket() {
  if (!client) return
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
  }
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  if (!client) throw new Error('Storage is not configured')
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  )
}

export async function getObject(key: string) {
  if (!client) throw new Error('Storage is not configured')
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  return {
    body: object.Body as Readable,
    contentType: object.ContentType ?? 'application/octet-stream',
    length: object.ContentLength
  }
}
