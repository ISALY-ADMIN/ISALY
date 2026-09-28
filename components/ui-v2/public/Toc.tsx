'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * Sommaire collant des articles et pages de texte (.toc de la maquette) :
 * suit le titre visible (aria-current="true") pendant la lecture.
 */
export function Toc({ items, children }: { items: { id: string; t: string }[]; children?: ReactNode }) {
  const [cur, setCur] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const els = items.map(i => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      entries => {
        const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setCur(vis[0].target.id)
      },
      { rootMargin: '-90px 0px -60% 0px' },
    )
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [items])

  return (
    <nav className="toc" aria-label="Sommaire">
      <b>Sommaire</b>
      {items.map(i => (
        <a key={i.id} href={`#${i.id}`} aria-current={cur === i.id ? 'true' : undefined}>{i.t}</a>
      ))}
      {children}
    </nav>
  )
}
