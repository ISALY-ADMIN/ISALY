'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui-v2'

const EMPTY = { name: '', city: '', phone: '', email: '', address: '', opening_hours: '', active: true }

/** Formulaire « Ajouter une agence » : écrit via /api/admin/agencies. */
export default function AgencyForm() {
  const router = useRouter()
  const [f, setF] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(x => ({ ...x, [k]: k === 'active' ? e.target.checked : e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ ok: false, t: json.error ?? 'Impossible d’ajouter l’agence.' }); return }
      setF(EMPTY)
      setMsg({ ok: true, t: 'Agence ajoutée.' })
      router.refresh()
    } catch {
      setMsg({ ok: false, t: 'Impossible d’ajouter l’agence.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <div className="phead" style={{ margin: 0 }}><h2>Ajouter une agence</h2></div>
      <div className="field"><label htmlFor="an">Nom</label><input id="an" className="input" required value={f.name} onChange={set('name')} /></div>
      <div className="f2">
        <div className="field"><label htmlFor="ac">Ville</label><input id="ac" className="input" required value={f.city} onChange={set('city')} /></div>
        <div className="field"><label htmlFor="at">Téléphone</label><input id="at" className="input" inputMode="tel" value={f.phone} onChange={set('phone')} /></div>
      </div>
      <div className="field"><label htmlFor="am">E-mail</label><input id="am" className="input" type="email" value={f.email} onChange={set('email')} /></div>
      <div className="field"><label htmlFor="aa">Adresse</label><input id="aa" className="input" value={f.address} onChange={set('address')} /></div>
      <div className="field"><label htmlFor="ah">Horaires</label><input id="ah" className="input" placeholder="Du lundi au vendredi, de 9 h à 18 h" value={f.opening_hours} onChange={set('opening_hours')} /></div>
      <label className="checkl"><input type="checkbox" checked={f.active} onChange={set('active')} /><span>Active : proposée aux bailleurs de cette ville</span></label>
      {msg && (
        <div className={msg.ok ? 'alert ok' : 'alert'} role={msg.ok ? 'status' : 'alert'}>
          <Icon name={msg.ok ? 'check' : 'alert'} size={18} /><span>{msg.t}</span>
        </div>
      )}
      <button className="btn btn-main" type="submit" disabled={saving}>{saving ? 'Ajout…' : 'Ajouter l’agence'}</button>
    </form>
  )
}
