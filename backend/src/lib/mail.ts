import nodemailer from 'nodemailer'

//para enviar emails, como não queremos pagar, usamos um fake que não realmente envia email mas serve para testar

//smtp servidor para envio de email

export async function getMailClient() {
  const account = await nodemailer.createTestAccount()    //createTestAccount cria uma caixa de entrada ficticia

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',   //ethereal é uma ferramenta, um serviço de smtp fake
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  })

  return transporter
}
