import { FastifyPluginAsync } from 'fastify'

const example: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async function () {
    fastify.log.info('Example endpoint responded with demo message')
    return {
      text: '123',
      test: {
        value: '1234',
      },
      array: [1, 2, 3]
    }
  })
}

export const autoPrefix = '/example'

export default example
