'use client'

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('copy-btn')
      if (btn) { btn.textContent = '✓ Copié !'; setTimeout(() => { btn.textContent = '🔗 Copier le lien' }, 2000) }
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
          id="copy-btn"
          onClick={copyLink}
          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          🔗 Copier le lien
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', textAlign: 'center', padding: '10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: '10px', color: '#25D366', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
        >
          📱 Partager sur WhatsApp
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
