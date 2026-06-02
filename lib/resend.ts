import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = 'ISALY <contact@isaly.fr>'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
