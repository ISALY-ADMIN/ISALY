'use client'

import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'

/**
 * État « Aucun bail actif » commun aux pages locataire.
 * Remplace les anciens redirects silencieux vers /app/swipe : on explique
 * pourquoi la page est vide et on propose un CTA, sans jamais rediriger.
 */
export default function NoLeaseState({ title, message }: { title: string; message: string }) {
  return (
    <>
      <Topbar title={title} />
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-7 text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden>
          <circle cx="44" cy="44" r="40" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.2)" />
          <path d="M28 44 L44 30 L60 44" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M32 42 V58 H56 V42" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="40" y="48" width="8" height="10" rx="1.5" stroke="#10B981" strokeWidth="2" fill="rgba(16,185,129,0.15)" />
        </svg>
        <h2 className="text-[17px] font-bold" style={{ color: '#fff' }}>Aucun bail actif</h2>
        <p className="text-[13.5px] max-w-[380px]" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{message}</p>
        <Link
          href="/app/swipe"
          className="mt-2 px-5 py-2.5 rounded-[10px] text-[12.5px] font-extrabold"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none' }}
        >
          Trouver une colocation →
        </Link>
      </div>
    </>
  )
}
