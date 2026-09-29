/** Chargement d'un écran d'administration : indicateurs et tableau en squelettes. */
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement" style={{ display: 'grid', gap: 18 }}>
      <section className="panel kpis" aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <div className="kpi" key={i} style={{ display: 'grid', gap: 8 }}>
            <span className="skel" style={{ display: 'block', height: 12, width: '60%' }} />
            <span className="skel" style={{ display: 'block', height: 28, width: '40%' }} />
          </div>
        ))}
      </section>
      <section className="panel" aria-hidden="true" style={{ display: 'grid', gap: 12 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="skel" style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none' }} />
            <span style={{ display: 'grid', gap: 6, flex: 1 }}>
              <span className="skel" style={{ display: 'block', height: 13, width: `${70 - i * 8}%` }} />
              <span className="skel" style={{ display: 'block', height: 11, width: '35%' }} />
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}
