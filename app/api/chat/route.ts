import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Tu es l'assistant virtuel d'ISALY, plateforme française de colocation.
Tu aides à : trouver une colocation (matching Tinder), gérer le dossier et le bail,
comprendre les offres (assurance dossier 3% du loyer, mise en avant 9,99€/mois ou 24,99€/mois),
répondre aux questions sur la législation du bail en France.
Réponds en français, de façon concise et chaleureuse. Maximum 3 phrases.`

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to get response', reply: "Je suis là pour vous aider ! Réessayez dans quelques instants." },
      { status: 500 }
    )
  }
}
