import { PublicLayout } from '@/components/ui-v2/public'

/** Chargement de l'annonce publique : squelettes de la maquette (.skel). */
export default function Loading() {
  return (
    <PublicLayout>
      <div className="wrap" role="status" aria-label="Chargement de l’annonce">
        <div style={{ margin: '22px 0 14px' }}><span className="skel" style={{ display: 'block', width: 220, height: 14 }} /></div>
        <span className="skel" style={{ display: 'block', height: 410, borderRadius: 28 }} />
        <div className="lay">
          <div style={{ display: 'grid', gap: 14 }}>
            <span className="skel" style={{ display: 'block', height: 40, width: '70%' }} />
            <span className="skel" style={{ display: 'block', height: 16, width: '45%' }} />
            <span className="skel" style={{ display: 'block', height: 140, borderRadius: 20 }} />
          </div>
          <span className="skel" style={{ display: 'block', height: 320, borderRadius: 28 }} />
        </div>
      </div>
    </PublicLayout>
  )
}
