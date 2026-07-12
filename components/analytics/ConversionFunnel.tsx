/**
 * Mission 18 — funnel de conversion (barres horizontales, données Supabase).
 * Composant présentationnel sans hook : utilisable en Server Component.
 */

export interface FunnelStep {
  label: string
  count: number
}

export default function ConversionFunnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map(s => s.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {steps.map((step, i) => {
        const prev = i > 0 ? steps[i - 1].count : null
        const conversion = prev && prev > 0 ? Math.round((step.count / prev) * 100) : null
        const width = Math.max(2, Math.round((step.count / max) * 100))
        return (
          <div key={step.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#E5E7EB', fontFamily: "'Outfit', sans-serif" }}>
                {step.label}
              </span>
              <span style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: "'Outfit', sans-serif" }}>
                <strong style={{ color: '#fff', fontSize: '13px' }}>{step.count.toLocaleString('fr-FR')}</strong>
                {conversion !== null && (
                  <span style={{ marginLeft: '8px', color: conversion >= 50 ? '#10B981' : conversion >= 20 ? '#F59E0B' : '#EF4444', fontWeight: 700 }}>
                    {conversion} %
                  </span>
                )}
              </span>
            </div>
            <div style={{ height: '22px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${width}%`,
                  borderRadius: '8px',
                  background: 'linear-gradient(90deg, #10B981, #059669)',
                  opacity: 1 - i * 0.09,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
