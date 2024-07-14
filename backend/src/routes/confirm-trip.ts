import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { dayjs } from '../lib/dayjs'
import { getMailClient } from '../lib/mail'
import { prisma } from '../lib/prisma'
import { ClientError } from '../errors/client-error'
import { env } from '../env'

// rota de confirmaçao da viagem do participante (manda o email)

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/confirm',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {             //reply serve tbm para poder redirecionar a pag
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({     //verifica a existencia da viagem pelo id
        where: {
          id: tripId,
        },
        include: {
          participants: {      //buscar os participantes menos o dono da viagem, que são os que falta para manda o email de confirmação
            where: {
              is_owner: false,
            }
          }
        }
      })

      if (!trip) {                                    //caso não exista a viagem
        throw new ClientError('Trip not found.')
      }

      if (trip.is_confirmed) {                        //caso a viagem ja tenha sido confirmada
        return reply.redirect(`${env.WEB_BASE_URL}/trips/${tripId}`)
      }

      await prisma.trip.update({        //atualiza a confirmação da viagem
        where: { id: tripId },
        data: { is_confirmed: true },
      })

      const formattedStartDate = dayjs(trip.starts_at).format('LL')
      const formattedEndDate = dayjs(trip.ends_at).format('LL')

      const mail = await getMailClient()

      await Promise.all(
        trip.participants.map(async (participant) => {        //usamos async pois queremos um array de promises
          const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`

          const message = await mail.sendMail({
            from: {
              name: 'Equipe plann.er',
              address: 'oi@plann.er',
            },
            to: participant.email,
            subject: `Confirme sua presença na viagem para ${trip.destination} em ${formattedStartDate}`,
            html: `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
              <p>Você foi convidado(a) para participar de uma viagem para <strong>${trip.destination}</strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
              <p></p>
              <p>Para confirmar sua presença na viagem, clique no link abaixo:</p>
              <p></p>
              <p>
                <a href="${confirmationLink}">Confirmar viagem</a>
              </p>
              <p></p>
              <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
            </div>
          `.trim(),
          })
    
          console.log(nodemailer.getTestMessageUrl(message))
        })
      )

      return reply.redirect(`${env.WEB_BASE_URL}/trips/${tripId}`)
    },
  )
}
