import type { FastifyInstance } from "fastify"
import { ClientError } from "./errors/client-error"
import { ZodError } from "zod"

//tratativa de erros

type FastifyErrorHandler = FastifyInstance['errorHandler']

export const errorHandler: FastifyErrorHandler = (error, request, reply) => {
  if (error instanceof ZodError) {          //erro de validação do zod
    return reply.status(400).send({
      message: 'Invalid input',
      errors: error.flatten().fieldErrors
    })
  }

  if (error instanceof ClientError) {       //clienteError classe criada e usada nas rotas (erros de entrada de dados por parte do cliente?)
    return reply.status(400).send({
      message: error.message
    })
  }
  
  return reply.status(500).send({ message: 'Internal server error' })
}