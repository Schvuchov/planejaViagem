import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { ClientError } from '../errors/client-error'
import { env } from '../env'

// quando o participante utiliza o link de confirmação da viagem (confirm-trip)

export async function confirmParticipants(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/participants/:participantId/confirm',
    {
      schema: {
        params: z.object({
          participantId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { participantId } = request.params

      const participant = await prisma.participant.findUnique({
        where: {
          id: participantId,
        }
      })

      if (!participant) {                 //checa a existencia do participante
        throw new ClientError('Participant not found.')
      }

      if (participant.is_confirmed) {     //redireciona o participante confimado para a pag da viagem
        return reply.redirect(`${env.WEB_BASE_URL}/trips/${participant.trip_id}`)
      }

      await prisma.participant.update({     //atualiza o banco de dados
        where: { id: participantId },
        data: { is_confirmed: true }
      })

      return reply.redirect(`${env.WEB_BASE_URL}/trips/${participant.trip_id}`)
    },
  )
}
