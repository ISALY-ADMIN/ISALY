import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = 'ISALY <onboarding@resend.dev>'
export const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
