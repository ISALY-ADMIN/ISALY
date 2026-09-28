'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './primitives'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Fenêtre du dashboard v2 : centrée sur ordinateur, feuille du bas sur mobile
 * (règles .scrim et .modal de la maquette), focus piégé, fermeture avec Échap
 * ou en touchant le fond. Rendue dans #ui-v2-portal (à l'intérieur de .ui-v2,
 * pour hériter des jetons) : les panneaux en verre créent un bloc conteneur
 * qui casserait position: fixed.
 */
export function Modal({
  open, onClose, title, lead, children, footer, wide, labelledBy,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  lead?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  wide?: boolean
  labelledBy?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<Element | null>(null)
  const autoId = useId()
  const titleId = labelledBy ?? `mt-${autoId}`
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHost(document.getElementById('ui-v2-portal') ?? document.body)
  }, [])

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement
    const node = ref.current
    const t = window.setTimeout(() => {
      if (!node) return
      const preferred = node.querySelector<HTMLElement>('.mfoot .btn-main, .opt, input, select, textarea, button:not(.mclose)')
      ;(preferred ?? node.querySelector<HTMLElement>('.mclose'))?.focus({ preventScroll: true })
    }, 0)
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey, true)
      const prev = lastFocus.current
      if (prev instanceof HTMLElement && document.contains(prev)) prev.focus({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open || !host) return null

  return createPortal(
    <div
      className="scrim"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={ref} className={wide ? 'modal wide' : 'modal'} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
        <button className="mclose" type="button" aria-label="Fermer" onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
        {title && <h2 id={titleId}>{title}</h2>}
        {lead && <p className="lead">{lead}</p>}
        {children}
        {footer && <div className="mfoot">{footer}</div>}
      </div>
    </div>,
    host,
  )
}
