import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Tu es l'assistant ISALY, une plateforme française de colocation intelligente.
Tu aides les utilisateurs à :
- Trouver un colocataire compatible grâce au système de matching
- Publier et gérer leurs annonces de colocation
- Comprendre le système de bail et de gestion locative
- Naviguer dans l'application (swipe, messages, dossier, carte)
- Résoudre leurs problèmes techniques

Réponds toujours en français, de façon chaleureuse et concise.
Si tu ne sais pas quelque chose sur ISALY spécifiquement, oriente vers le support.`

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
