'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Toggle {
  key: string
  label: string
  description: string
}

const NOTIF_TOGGLES: Toggle[] = [
  { key: 'notif_messages',  label: 'Nouveaux messages',       description: 'Recevoir une alerte à chaque message' },
  { key: 'notif_matches',   label: 'Nouveaux matchs',         description: 'Être notifié quand tu as un match' },
  { key: 'notif_annonces',  label: 'Annonces similaires',     description: 'Suggestions basées sur tes critères' },
  { key: 'notif_promotions',label: 'Promotions & actualités', description: 'Offres spéciales et mises à jour ISALY' },
]

const PRIVACY_TOGGLES: Toggle[] = [
  { key: 'visible_recherche', label: 'Visible dans la recherche', description: 'D\'autres utilisateurs peuvent te trouver' },
  { key: 'visible_swipe',     label: 'Visible dans le swipe',     description: 'Ton profil apparaît dans les suggestions' },
  { key: 'show_last_seen',    label: 'Afficher "vu récemment"',   description: 'Les contacts voient ta dernière activité' },
  { key: 'show_location',     label: 'Afficher ma ville',         description: 'Ta ville est visible sur ton profil' },
]

const DEFAULT_PREFS: Record<string, boolean> = {
  notif_messages: true,
  notif_matches: true,
  notif_annonces: false,
  notif_promotions: false,
  visible_recherche: true,
  visible_swipe: true,
  show_last_seen: true,
  show_location: true,
}

export default function ParametresPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email ?? '')
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, preferences')
        .eq('id', user.id)
        .single()
      if (data) {
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        if (data.preferences && typeof data.preferences === 'object') {
          setPrefs(p => ({ ...p, ...(data.preferences as Record<string, boolean>) }))
        }
      }
    }
    load()
  }, [])

  function togglePref(key: string) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  async function savePreferences() {
    if (!userId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ preferences: prefs, first_name: firstName, last_name: lastName })
      .eq('id', userId)
    setSaving(false)
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Paramètres sauvegardés', description: 'Tes préférences ont été mises à jour.', duration: 3000 })
    }
  }

  async function handleDeleteAccount() {
    if (!userId) return
    const supabase = createClient()
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
      return
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      <Topbar title="Paramètres" />
      <div className="flex-1 overflow-y-auto" style={{ background: '#F7F8FA' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px 64px' }}>

          {/* Account info */}
          <Section title="Informations du compte" icon="👤">
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-bold uppercase tracking-[1px] mb-1 block" style={{ color: '#9CA3AF' }}>Prénom</label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[10px] text-[13.5px] border outline-none transition-colors"
                    style={{ background: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827' }}
                    onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
                    onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-bold uppercase tracking-[1px] mb-1 block" style={{ color: '#9CA3AF' }}>Nom</label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[10px] text-[13.5px] border outline-none transition-colors"
                    style={{ background: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827' }}
                    onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
                    onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[1px] mb-1 block" style={{ color: '#9CA3AF' }}>Email</label>
                <input
                  value={email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-[10px] text-[13.5px] border"
                  style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#9CA3AF', cursor: 'not-allowed' }}
                />
              </div>
            </div>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" icon="🔔">
            <div className="flex flex-col gap-3">
              {NOTIF_TOGGLES.map(t => (
                <ToggleRow key={t.key} label={t.label} description={t.description} value={prefs[t.key] ?? false} onChange={() => togglePref(t.key)} />
              ))}
            </div>
          </Section>

          {/* Privacy */}
          <Section title="Confidentialité" icon="🔒">
            <div className="flex flex-col gap-3">
              {PRIVACY_TOGGLES.map(t => (
                <ToggleRow key={t.key} label={t.label} description={t.description} value={prefs[t.key] ?? false} onChange={() => togglePref(t.key)} />
              ))}
            </div>
          </Section>

          {/* Save button */}
          <button
            onClick={savePreferences}
            disabled={saving}
            className="w-full py-3 rounded-full text-[14px] font-bold text-white border-none cursor-pointer transition-all mb-10"
            style={{
              background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #4ECBA0, #2AA87C)',
              boxShadow: saving ? 'none' : '0 4px 16px rgba(78,203,160,.35)',
            }}
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder les paramètres'}
          </button>

          {/* Danger zone */}
          <Section title="Zone dangereuse" icon="⚠️">
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-[12px] border" style={{ background: '#FFF5F5', borderColor: '#FCA5A5' }}>
                <div className="text-[13px] font-bold mb-1" style={{ color: '#B91C1C' }}>Supprimer mon compte</div>
                <div className="text-[12px] mb-3" style={{ color: '#DC2626' }}>
                  Cette action est irréversible. Toutes tes données seront supprimées définitivement.
                </div>
                {deleteConfirm ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      className="flex-1 py-2 rounded-full text-[12px] font-bold text-white border-none cursor-pointer"
                      style={{ background: '#EF4444' }}
                    >
                      Oui, supprimer
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2 rounded-full text-[12px] font-semibold border-[1.5px] cursor-pointer bg-transparent"
                      style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-4 py-2 rounded-full text-[12px] font-semibold border-[1.5px] cursor-pointer bg-transparent transition-all"
                    style={{ borderColor: '#EF4444', color: '#EF4444' }}
                  >
                    Supprimer mon compte
                  </button>
                )}
              </div>
            </div>
          </Section>

        </div>
      </div>
    </>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[18px]">{icon}</span>
        <h2 className="text-[15px] font-bold" style={{ color: '#111827' }}>{title}</h2>
      </div>
      <div className="rounded-[16px] p-5 border" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 1px 8px rgba(0,0,0,.04)' }}>
        {children}
      </div>
    </div>
  )
}

function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="text-[13px] font-semibold" style={{ color: '#111827' }}>{label}</div>
        <div className="text-[11.5px]" style={{ color: '#9CA3AF' }}>{description}</div>
      </div>
      <button
        onClick={onChange}
        className="relative flex-shrink-0 rounded-full transition-all duration-200 border-none cursor-pointer"
        style={{
          width: '44px', height: '24px',
          background: value ? '#4ECBA0' : '#E5E7EB',
          boxShadow: value ? '0 2px 8px rgba(78,203,160,.3)' : 'none',
        }}
        role="switch"
        aria-checked={value}
      >
        <span
          className="absolute rounded-full bg-white transition-all duration-200"
          style={{
            width: '18px', height: '18px',
            top: '3px',
            left: value ? '23px' : '3px',
            boxShadow: '0 1px 4px rgba(0,0,0,.2)',
          }}
        />
      </button>
    </div>
  )
}
