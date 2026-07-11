'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Trash2 } from 'lucide-react'
import type { SearchAlert } from '@/app/api/alerts/route'

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} j`
  return `il y a ${Math.floor(days / 30)} mois`
}

/** Section "Alertes de recherche" — page paramètres. */
export default function AlertsSettings() {
  const [alerts, setAlerts] = useState<SearchAlert[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts')
      if (res.ok) setAlerts((await res.json()).alerts ?? [])
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(alert: SearchAlert) {
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_active: !a.is_active } : a))
    await fetch(`/api/alerts/${alert.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !alert.is_active }),
    }).catch(() => {})
  }

  async function remove(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id))
    await fetch(`/api/alerts/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  function label(a: SearchAlert): string {
    if (a.name) return a.name
    const parts = [
      a.city,
      a.budget_max ? `< ${a.budget_max}€` : null,
      a.rooms ? `${a.rooms}+ ch.` : null,
      a.meuble ? 'meublé' : null,
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'Toutes les annonces'
  }

  return (
    <div>
      {!loaded ? (
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', padding: '12px 0' }}>Chargement…</div>
      ) : alerts.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, padding: '4px 0 12px' }}>
          Aucune alerte pour le moment. Crée une alerte depuis la recherche pour être notifié des nouvelles annonces.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          {alerts.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '12px 14px',
              opacity: a.is_active ? 1 : 0.55,
            }}>
              <Bell size={16} color={a.is_active ? '#10B981' : 'rgba(255,255,255,0.35)'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {label(a)}
                </div>
                <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  Créée {timeAgo(a.created_at)}
                  {a.last_triggered_at ? ` · dernière notif ${timeAgo(a.last_triggered_at)}` : ' · jamais déclenchée'}
                </div>
              </div>
              {/* Toggle actif/inactif */}
              <button
                onClick={() => toggle(a)}
                role="switch"
                aria-checked={a.is_active}
                title={a.is_active ? 'Désactiver' : 'Activer'}
                className="border-none cursor-pointer flex-shrink-0"
                style={{
                  width: 40, height: 22, borderRadius: '12px', position: 'relative',
                  background: a.is_active ? '#10B981' : 'rgba(255,255,255,0.15)',
                  transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: a.is_active ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
              <button
                onClick={() => remove(a.id)}
                aria-label="Supprimer l'alerte"
                className="border-none cursor-pointer rounded-full flex items-center justify-center flex-shrink-0"
                style={{ width: 30, height: 30, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Link href="/app/recherche" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        fontSize: '13px', fontWeight: 700, color: '#10B981', textDecoration: 'none',
        fontFamily: "'Outfit', sans-serif",
      }}>
        <Bell size={14} /> Créer une nouvelle alerte →
      </Link>
    </div>
  )
}
