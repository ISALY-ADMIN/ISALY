'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LeaseRow { id: string; address: string; city: string | null }

interface DocRow {
  id: string
  document_type: string | null
  file_url: string | null
  file_name: string | null
  status: string
  created_at: string
}

const DOC_TYPES = [
  { id: 'bail_signe', icon: '📄', label: 'Bail signé' },
  { id: 'etat_lieux_entree', icon: '🔑', label: "État des lieux d'entrée" },
  { id: 'etat_lieux_sortie', icon: '📸', label: 'État des lieux de sortie' },
  { id: 'dpe', icon: '🌡️', label: 'DPE' },
  { id: 'plomb', icon: '🧪', label: 'Diagnostic plomb' },
  { id: 'amiante', icon: '🧱', label: 'Diagnostic amiante' },
  { id: 'quittance', icon: '🧾', label: 'Quittance de loyer' },
  { id: 'assurance', icon: '🛡️', label: 'Assurance' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DocumentsStorage({ lease }: { lease: LeaseRow }) {
  const [docs, setDocs] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingType = useRef<string | null>(null)

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('lease_documents')
      .select('*')
      .eq('lease_id', lease.id)
      .neq('document_type', 'bail_genere')
      .order('created_at', { ascending: false })
    setDocs((data ?? []) as DocRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [lease.id])

  function triggerUpload(typeId: string) {
    pendingType.current = typeId
    fileInputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const typeId = pendingType.current
    if (!file || !typeId) return
    setUploadingType(typeId)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const path = `${lease.id}/${typeId}/${Date.now()}-${file.name.replace(/\s/g, '_')}`
      const { error: upErr } = await supabase.storage.from('documents-bailleur').upload(path, file)
      if (upErr) { setUploadingType(null); return }

      await supabase.from('lease_documents').insert({
        lease_id: lease.id,
        uploaded_by: user.id,
        document_type: typeId,
        file_url: path,
        file_name: file.name,
        status: 'final',
      })
      await load()
    } catch {}
    setUploadingType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDownload(docId: string) {
    try {
      const res = await fetch(`/api/documents/${docId}`)
      const json = await res.json()
      if (json.url) window.open(json.url, '_blank')
    } catch {}
  }

  async function handleDelete(docId: string) {
    if (!confirm('Supprimer ce document ?')) return
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch {}
  }

  return (
    <div className="mb-8">
      <h3 className="text-[16px] font-bold mb-3" style={{ color: '#fff' }}>📁 Documents du contrat — {lease.address}</h3>

      <input ref={fileInputRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={handleFile} />

      {loading ? (
        <div className="text-center py-8"><div className="text-[32px]" style={{ animation: 'bop 1s ease infinite' }}>📁</div></div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {DOC_TYPES.map(type => {
            const existing = docs.filter(d => d.document_type === type.id)
            return (
              <div key={type.id} className="p-3.5 rounded-[12px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    <span className="text-[12.5px] font-semibold" style={{ color: '#374151' }}>{type.label}</span>
                  </div>
                  <button
                    onClick={() => triggerUpload(type.id)}
                    disabled={uploadingType === type.id}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full border-none cursor-pointer disabled:opacity-50"
                    style={{ background: '#ECFDF5', color: '#2AA87C' }}
                  >
                    {uploadingType === type.id ? '…' : '+ Ajouter'}
                  </button>
                </div>
                {existing.length === 0 ? (
                  <p className="text-[11px]" style={{ color: '#9CA3AF' }}>Aucun fichier</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {existing.map(d => (
                      <div key={d.id} className="flex items-center justify-between">
                        <span className="text-[11px] truncate" style={{ color: '#6B7280', maxWidth: '120px' }} title={d.file_name ?? ''}>
                          {d.file_name} · {formatDate(d.created_at)}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => handleDownload(d.id)} className="text-[10.5px] font-semibold border-none bg-transparent cursor-pointer" style={{ color: '#4ECBA0' }}>Télécharger</button>
                          <button onClick={() => handleDelete(d.id)} className="text-[10.5px] font-semibold border-none bg-transparent cursor-pointer" style={{ color: '#EF4444' }}>Suppr.</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
