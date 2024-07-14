import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getMailClient } from '../lib/mail'
import { dayjs } from '../lib/dayjs'
import { ClientError } from '../errors/client-error'
import { env } from '../env'

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips',
    {                                                   //schema para a validação
      schema: {
        body: z.object({
          destination: z.string().min(4),
          starts_at: z.coerce.date(),                   //coerce é para tentar converter a string que chega para uma data
          ends_at: z.coerce.date(),
          owner_name: z.string(),
          owner_email: z.string().email(),
          emails_to_invite: z.array(z.string().email()),
        }),
      },
    },
    async (request) => {
      const {
        destination,
        starts_at,
        ends_at,
        owner_name,
        owner_email,
        emails_to_invite,
      } = request.body

      //dayjs é uma biblioteca para lidar com datas no js
      //vamos validar que as datas façam sentido

      if (dayjs(starts_at).isBefore(new Date())) {        //valida se a data de inicio da viagem não seja anterior que a data atual
        throw new ClientError('Invalid trip start date.')
      }

      if (dayjs(ends_at).isBefore(starts_at)) {        //valida se a data de termino da viagem não seja anterior que a data inicial
        throw new ClientError('Invalid trip end date.')
      }

      const trip = await prisma.trip.create({
        data: {
          destination,
          starts_at,
          ends_at,
          participants: {     //insere junto os participantes pra garantir que apos criada a viagem, não de erro nos participantes depois
            createMany: {
              data: [
                {             // o primeiro participante é o dono da viagem
                  name: owner_name,
                  email: owner_email,
                  is_owner: true,
                  is_confirmed: true,
                },            // os demais participantes temos apenas o email
                ...emails_to_invite.map((email) => {    // o ... faz com que cada item seja inserido no array 'data' e não um array dentro do array
                  return { email }
                }),
              ],
            },
          },
        },
      })

      //formatação da data
      const formattedStartDate = dayjs(starts_at).format('LL')
      const formattedEndDate = dayjs(ends_at).format('LL')

      const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`

      const mail = await getMailClient()      //getMailClient é a função que criamos em mail.ts para poder testar o envio de emails

      //email
      const message = await mail.sendMail({
        from: {
          name: 'Equipe plann.er',
          address: 'oi@plann.er',
        },
        to: {
          name: owner_name,
          address: owner_email,
        }, 
        //formatação do email
        subject: `Confirme sua viagem para ${destination} em ${formattedStartDate}`,
        html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
          <p>Você solicitou a criação de uma viagem para <strong>${destination}</strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
          <p></p>
          <p>Para confirmar sua viagem, clique no link abaixo:</p>
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

      return { tripId: trip.id }  //retorna um id, necessario para entrar na pag de atividades da viagem criada aqui
    },
  )
}
