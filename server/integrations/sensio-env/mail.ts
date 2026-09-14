import nodemailer from 'nodemailer'
import { z } from 'zod'
import { loadSensioEnvironmentSnapshot } from './runtime'

const emailAddressSchema = z.string().trim().email().max(320)

function required(values: Record<string, string>, key: string) {
  const value = values[key]?.trim()
  if (!value) throw new Error(`Sensio Env SMTP configuration is missing ${key}.`)
  return value
}

function smtpConfig(values: Record<string, string>) {
  const port = Number(required(values, 'SMTP_PORT'))
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Sensio Env SMTP port is invalid.')

  return {
    host: required(values, 'SMTP_HOST'),
    port,
    username: required(values, 'SMTP_USERNAME'),
    password: required(values, 'SMTP_PASSWORD'),
    from: emailAddressSchema.parse(required(values, 'SMTP_FROM')),
  }
}

export async function sendRegistrationVerificationCode(to: string, code: string) {
  const { data } = await loadSensioEnvironmentSnapshot()
  const smtp = smtpConfig(data)
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.username, pass: smtp.password },
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  })

  await transport.sendMail({
    from: { name: 'Situm Explore', address: smtp.from },
    to,
    subject: 'Verify your Situm Explore email',
    text: [
      'Verify your email',
      '',
      'Enter this code in Situm Explore to finish creating your account:',
      '',
      code,
      '',
      'This code expires in 5 minutes.',
      '',
      "If you didn't request this code, you can safely ignore this email.",
    ].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6"><h2 style="margin-bottom:8px">Verify your email</h2><p>Enter this code in Situm Explore to finish creating your account:</p><p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:24px 0">${code}</p><p>This code expires in 5 minutes.</p><p style="color:#6b7280">If you didn't request this code, you can safely ignore this email.</p></div>`,
  })
}
