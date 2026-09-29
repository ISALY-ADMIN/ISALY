'use client'

import { Icon, useToast } from '@/components/ui-v2'

/** Partage d'un article (copie du lien, WhatsApp, X), dans le style du site v2. */
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const toast = useToast()

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast('Lien copié')
    } catch {}
  }

  return (
    <div className="share">
      <button className="btn btn-glass btn-sm" type="button" onClick={copy}><Icon name="link" size={16} />Copier le lien</button>
      <a className="btn btn-glass btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer">
        <Icon name="chat" size={16} />WhatsApp
      </a>
      <a className="btn btn-glass btn-sm" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
        <Icon name="share" size={16} />Partager sur X
      </a>
    </div>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

/** Partage social d'un article (X/Twitter, WhatsApp, copie du lien). * /
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    padding: '9px 16px', borderRadius: '12px', cursor: 'pointer',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.75)', fontSize: '12.5px', fontWeight: 600,
    textDecoration: 'none', fontFamily: "'Outfit', sans-serif",
  }

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank" rel="noopener noreferrer" style={btn}
      >
        𝕏 Partager
      </a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank" rel="noopener noreferrer" style={btn}
      >
        💬 WhatsApp
      </a>
      <button onClick={copy} style={{ ...btn, borderColor: copied ? '#10B981' : 'rgba(255,255,255,0.1)', color: copied ? '#10B981' : 'rgba(255,255,255,0.75)' }}>
        {copied ? <Check size={13} /> : <Link2 size={13} />} {copied ? 'Copié !' : 'Copier le lien'}
      </button>
    </div>
  )
}
*/
