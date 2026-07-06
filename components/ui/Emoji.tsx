'use client'
import { useEffect, useState } from 'react'

// ═══════════════════════════════════════════════════════════════
// Rendu uniforme des emojis (set Apple via emoji-mart) sur tous
// les navigateurs/OS. Le set n'est initialisé qu'UNE fois par
// session (singleton module) et chargé en lazy (hors bundle main).
// Fallback : emoji natif tant que emoji-mart n'est pas prêt, ou
// définitivement si l'init échoue (CDN bloqué, offline…).
// ═══════════════════════════════════════════════════════════════

const EMOJI_SET = 'apple'

let ready = false
let readyPromise: Promise<boolean> | null = null

function ensureEmojiMart(): Promise<boolean> {
  if (!readyPromise) {
    readyPromise = Promise.all([import('emoji-mart'), import('@emoji-mart/data')])
      .then(([{ init }, data]) => {
        init({ data: (data as { default: unknown }).default, set: EMOJI_SET })
        ready = true
        return true
      })
      .catch(() => false)
  }
  return readyPromise
}

/** Custom element <em-emoji> fourni par emoji-mart. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'em-emoji': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        native?: string
        id?: string
        set?: string
        size?: string
        fallback?: string
      }
    }
  }
}

function useEmojiReady(): boolean {
  const [isReady, setIsReady] = useState(ready)
  useEffect(() => {
    if (ready) return
    let mounted = true
    ensureEmojiMart().then(ok => { if (mounted && ok) setIsReady(true) })
    return () => { mounted = false }
  }, [])
  return isReady
}

/**
 * Emoji uniforme (set Apple).
 * - `native` : le caractère emoji ("🔥") — sert aussi de fallback.
 * - `name`   : shortcode (":fire:" ou "fire") — alternative à native.
 * - `size`   : taille CSS (défaut 1em).
 */
export default function Emoji({ native, name, size = '1em', title }: {
  native?: string
  name?: string
  size?: string
  title?: string
}) {
  const isReady = useEmojiReady()
  const id = name?.replace(/:/g, '') || undefined

  return (
    <span
      aria-hidden
      title={title}
      style={{ display: 'inline-block', verticalAlign: 'middle', lineHeight: 1, fontSize: size }}
    >
      {isReady
        ? <em-emoji native={native} id={native ? undefined : id} set={EMOJI_SET} size={size} />
        : (native ?? '')}
    </span>
  )
}

// Séquence emoji : pictographique (+ VS16) éventuellement liée par ZWJ,
// ou paire de drapeaux régionaux. Construit via new RegExp pour rester
// compatible avec le check de target TS sur les littéraux regex.
const EMOJI_SEQ = new RegExp(
  '((?:\\p{Extended_Pictographic}\\uFE0F?(?:\\u200D\\p{Extended_Pictographic}\\uFE0F?)*)|(?:[\\u{1F1E6}-\\u{1F1FF}]{2}))',
  'gu'
)

/**
 * Rend un texte libre (message utilisateur, titre de notification…) en
 * remplaçant chaque emoji par <Emoji> — le contenu source n'est pas modifié.
 */
export function EmojiText({ text, size = '1em' }: { text: string; size?: string }) {
  const parts = text.split(EMOJI_SEQ)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <Emoji key={i} native={part} size={size} /> : part
      )}
    </>
  )
}
