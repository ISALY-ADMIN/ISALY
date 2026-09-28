'use client'
import { Icon, useToast } from '@/components/ui-v2'

/** Boutons de partage de l'annonce (carte de prix), dans le style de la charte v2. */
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const toast = useToast()

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => toast('Lien copié')).catch(() => {})
  }

  function shareNative() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, url }).catch(() => {})
    } else {
      copyLink()
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`

  return (
    <>
      <span className="flabel">Partager</span>
      <div className="share">
        <button className="btn btn-glass btn-sm" type="button" onClick={copyLink}><Icon name="link" size={16} />Copier le lien</button>
        <a className="btn btn-glass btn-sm" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={16} />WhatsApp</a>
        <button className="btn btn-glass btn-sm" type="button" onClick={shareNative}><Icon name="share" size={16} />Partager</button>
      </div>
    </>
  )
}

/* [HIDDEN] Ancienne version (thème sombre), remplacée par le site v2 :
import { useState } from 'react'
import Emoji from '@/components/ui/Emoji'

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function shareNative() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, url }).catch(() => {})
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Partager
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={copyLink}
          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          {copied ? '✓ Copié !' : <><Emoji native="🔗" /> Copier le lien</>}
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', textAlign: 'center', padding: '10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: '10px', color: '#25D366', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
        >
          <Emoji native="📱" /> Partager sur WhatsApp
        </a>
        <button
          onClick={shareNative}
          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
        >
          ↗ Partager...
        </button>
      </div>
    </div>
  )
}
*/
