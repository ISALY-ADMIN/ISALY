import { NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json()
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }
    await resend.emails.send({
      from: 'ISALY Contact <contact@isaly.fr>',
      to: 'plak.reseaux@gmail.com',
      replyTo: email,
      subject: `[ISALY Contact] ${subject} — ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0A0A0A; padding: 32px; border-radius: 12px;">
            <h2 style="color: #10B981; margin: 0 0 24px;">Nouveau message ISALY</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="color: #9CA3AF; padding: 8px 0; width: 120px;">De</td><td style="color: #fff;">${name}</td></tr>
              <tr><td style="color: #9CA3AF; padding: 8px 0;">Email</td><td style="color: #10B981;">${email}</td></tr>
              <tr><td style="color: #9CA3AF; padding: 8px 0;">Sujet</td><td style="color: #fff;">${subject}</td></tr>
            </table>
            <div style="margin-top: 24px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid #10B981;">
              <p style="color: #fff; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #6B7280; font-size: 12px; margin-top: 24px;">
              Pour répondre, clique sur "Répondre" dans ton client mail — la réponse ira directement à ${name}.
            </p>
          </div>
        </div>
      `,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Contact email error:', error)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}
