import { apiGet } from './http-client'

export type ExampleResponse = any

/**
 * Request the sample message from the Fastify example route.
 * @returns Demo payload returned by the backend.
 */
export async function fetchExampleMessage() {
  return apiGet<ExampleResponse>('/example')
}



