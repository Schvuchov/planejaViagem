import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { dayjs } from '../lib/dayjs'
import { ClientError } from '../errors/client-error'

// rota de listagem das atividades criadas

export async function getActivities(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/activities',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (request) => {
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { 
          activities: {
            orderBy: {
              occurs_at: 'asc',
            }
          } 
        },
      })

      if (!trip) {
        throw new ClientError('Trip not found')
      }

      //quero agrupar as atividades por dias, pegando mesmo os dias sem atividades

      const differenceInDaysBetweenTripStartAndEnd = dayjs(trip.ends_at).diff(trip.starts_at, 'days')

      //+1 pq inclui o dia inicial e o dia final
      //pego a quantidade de dias, para cada dia tenho um index e pra cada index uma data
      const activities = Array.from({ length: differenceInDaysBetweenTripStartAndEnd + 1 }).map((_, index) => {
        const date = dayjs(trip.starts_at).add(index, 'days')

        return {
          date: date.toDate(),
          activities: trip.activities.filter(activity => {
            return dayjs(activity.occurs_at).isSame(date, 'day')  //day vai compara de dia, mes e ano são iguais
          })
        }
      })

      return { activities }
    },
  )
}
