'use client'

import { useState } from 'react'
import Emoji from '@/components/ui/Emoji'

interface Props {
  onClose: () => void
  onSelectBlank: () => void
  onSelectTemplate: (templateId: string) => void
}

const TEMPLATES = [
  { id: 'bail_non_meuble', icon: '📋', title: 'Bail de location non meublé', subtitle: 'Contrat de location loi n°89-462' },
]

export default function CreateDocumentModal({ onClose, onSelectBlank, onSelectTemplate }: Props) {
  const [screen, setScreen] = useState<'choice' | 'templates'>('choice')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.82)' }} onClick={onClose}>
      <div className="rounded-[20px] p-7" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', maxWidth: '520px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-[18px] mb-0.5" style={{ fontFamily: "'DM Serif Display', serif", color: '#F1F5F9' }}>
              {screen === 'choice' ? 'Créer un document' : 'Choisir un modèle'}
            </h3>
            <p className="text-[12px]" style={{ color: '#6B7280' }}>
              {screen === 'choice' ? 'Partez d\'une page vierge ou d\'un modèle prêt à l\'emploi' : 'Modèles disponibles'}
            </p>
          </div>
          <button onClick={onClose} className="text-[18px] cursor-pointer border-none bg-transparent leading-none" style={{ color: '#6B7280' }}>✕</button>
        </div>

        {screen === 'choice' ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onSelectBlank}
              className="text-left p-5 rounded-[14px] cursor-pointer transition-colors"
              style={{ background: '#252525', border: '1px solid #2D2D2D' }}
            >
              <div className="text-[28px] mb-2"><Emoji native="📄" /></div>
              <div className="text-[13.5px] font-bold mb-1" style={{ color: '#F1F5F9' }}>Page vierge</div>
              <div className="text-[11.5px]" style={{ color: '#6B7280' }}>Document texte libre, exportable en PDF</div>
            </button>
            <button
              onClick={() => setScreen('templates')}
              className="text-left p-5 rounded-[14px] cursor-pointer transition-colors"
              style={{ background: '#252525', border: '1px solid #2D2D2D' }}
            >
              <div className="text-[28px] mb-2"><Emoji native="🗂️" /></div>
              <div className="text-[13.5px] font-bold mb-1" style={{ color: '#F1F5F9' }}>Modèles</div>
              <div className="text-[11.5px]" style={{ color: '#6B7280' }}>Bail, état des lieux et autres modèles</div>
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setScreen('choice')}
              className="text-[12px] font-semibold border-none bg-transparent cursor-pointer mb-3"
              style={{ color: '#4ECBA0' }}
            >
              ← Retour
            </button>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelectTemplate(t.id)}
                  className="text-left p-5 rounded-[14px] cursor-pointer transition-colors"
                  style={{ background: '#252525', border: '1px solid #2D2D2D' }}
                >
                  <div className="text-[28px] mb-2"><Emoji native={t.icon} size="28px" /></div>
                  <div className="text-[13.5px] font-bold mb-1" style={{ color: '#F1F5F9' }}>{t.title}</div>
                  <div className="text-[11.5px]" style={{ color: '#6B7280' }}>{t.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
