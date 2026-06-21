'use client'

import { useState } from 'react'
import { jsPDF } from 'jspdf'

export default function BlankDocumentEditor({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('Document sans titre')
  const [content, setContent] = useState('')

  function handleDownload() {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(17, 24, 39)
    doc.text(title || 'Document sans titre', 15, 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(31, 41, 55)
    const lines = doc.splitTextToSize(content, 180)
    doc.text(lines, 15, 32)
    doc.save(`${(title || 'document').replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.82)' }} onClick={onClose}>
      <div
        className="rounded-[20px] p-7 flex flex-col"
        style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', maxWidth: '640px', width: '100%', height: '80vh', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-[18px] font-semibold border-none bg-transparent outline-none flex-1"
            style={{ fontFamily: "'DM Serif Display', serif", color: '#F1F5F9' }}
          />
          <button onClick={onClose} className="text-[18px] cursor-pointer border-none bg-transparent leading-none ml-3" style={{ color: '#6B7280' }}>✕</button>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Écrivez votre document ici…"
          className="flex-1 w-full rounded-[12px] p-4 text-[13.5px] outline-none resize-none"
          style={{ background: '#252525', border: '1px solid #2D2D2D', color: '#F1F5F9', lineHeight: 1.6 }}
        />

        <button
          onClick={handleDownload}
          className="mt-4 w-full py-3 rounded-full text-[13.5px] font-bold text-white border-none cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
        >
          📄 Télécharger le PDF
        </button>
      </div>
    </div>
  )
}
