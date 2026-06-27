'use client'

export type BoostOption = 'standard' | 'featured' | 'priority'

const BOOST_CARDS = [
  {
    id: 'standard' as BoostOption,
    icon: '📋',
    label: 'Standard',
    badge: 'Gratuit',
    badgeColor: '#9CA3AF',
    badgeBg: 'rgba(156,163,175,0.15)',
    price: 'Gratuit',
    priceColor: '#9CA3AF',
    borderSelected: '#6B7280',
    bgSelected: 'rgba(107,114,128,0.08)',
    features: [
      { ok: true,  text: 'Visible dans les résultats de recherche' },
      { ok: true,  text: 'Accessible aux locataires compatibles' },
      { ok: false, text: 'Pas de mise en avant' },
      { ok: false, text: 'Position standard dans les résultats' },
    ],
  },
  {
    id: 'featured' as BoostOption,
    icon: '🚀',
    label: 'Mis en avant',
    badge: 'Populaire',
    badgeColor: '#4ECBA0',
    badgeBg: 'rgba(78,203,160,0.15)',
    price: '9,99€/mois',
    priceColor: '#4ECBA0',
    borderSelected: '#4ECBA0',
    bgSelected: 'rgba(78,203,160,0.08)',
    features: [
      { ok: true, text: 'Tout ce qui est inclus dans Standard' },
      { ok: true, text: 'Badge "Mis en avant" sur l\'annonce' },
      { ok: true, text: 'Priorité dans les résultats de recherche' },
      { ok: true, text: 'Visible en tête de liste dans ta ville' },
      { ok: true, text: 'Statistiques de vues détaillées' },
    ],
  },
  {
    id: 'priority' as BoostOption,
    icon: '⭐',
    label: 'Prioritaire',
    badge: 'Premium',
    badgeColor: '#F59E0B',
    badgeBg: 'rgba(245,158,11,0.15)',
    price: '24,99€/mois',
    priceColor: '#F59E0B',
    borderSelected: '#F59E0B',
    bgSelected: 'rgba(245,158,11,0.08)',
    features: [
      { ok: true, text: 'Tout ce qui est inclus dans Mis en avant' },
      { ok: true, text: 'Position n°1 garantie dans ta ville' },
      { ok: true, text: 'Mise en avant sur la landing page ISALY' },
      { ok: true, text: 'Notification push aux locataires compatibles' },
      { ok: true, text: 'Support prioritaire' },
    ],
  },
]

interface Props {
  selected: BoostOption
  onSelect: (opt: BoostOption) => void
  disabled?: boolean
}

export default function BoostSelector({ selected, onSelect, disabled }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
    }}>
      {BOOST_CARDS.map(card => {
        const isSelected = selected === card.id
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => !disabled && onSelect(card.id)}
            disabled={disabled}
            style={{
              background: isSelected ? card.bgSelected : 'rgba(255,255,255,0.04)',
              border: `${isSelected ? '2px' : '1px'} solid ${isSelected ? card.borderSelected : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '16px',
              padding: '20px 16px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              opacity: disabled ? 0.6 : 1,
              transform: isSelected && card.id === 'featured' ? 'scale(1.02)' : 'scale(1)',
              width: '100%',
            }}
            onMouseEnter={e => {
              if (!disabled && !isSelected) {
                (e.currentTarget as HTMLElement).style.borderColor = card.borderSelected
                ;(e.currentTarget as HTMLElement).style.background = card.bgSelected.replace('0.08', '0.04')
              }
            }}
            onMouseLeave={e => {
              if (!disabled && !isSelected) {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }
            }}
          >
            {/* Header: icon + badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '22px' }}>{card.icon}</span>
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                color: card.badgeColor, background: card.badgeBg,
                textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0,
              }}>
                {card.badge}
              </span>
            </div>

            {/* Title */}
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#E5E7EB', marginBottom: '4px' }}>
              {card.label}
            </div>

            {/* Price */}
            <div style={{ fontSize: '17px', fontWeight: 800, color: card.priceColor, marginBottom: '12px' }}>
              {card.price}
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {card.features.map((f, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '6px',
                  fontSize: '11.5px',
                  color: f.ok ? 'rgba(209,250,229,0.9)' : 'rgba(255,255,255,0.25)',
                }}>
                  <span style={{ flexShrink: 0, fontWeight: 700, fontSize: '11px' }}>
                    {f.ok ? '✓' : '✗'}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            {/* Selected pill */}
            {isSelected && (
              <div style={{
                marginTop: '12px', padding: '5px 8px', borderRadius: '8px',
                background: card.borderSelected, color: '#0A0A0A',
                fontSize: '11px', fontWeight: 700, textAlign: 'center',
              }}>
                ✓ Sélectionné
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
