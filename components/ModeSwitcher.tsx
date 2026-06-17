'use client'

interface ModeSwitcherProps {
  currentMode: 'locataire' | 'loueur'
  onSwitch: (mode: 'locataire' | 'loueur') => void
}

export default function ModeSwitcher({ currentMode, onSwitch }: ModeSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Changer de mode"
      className="relative flex mx-3 my-2 rounded-full p-0.5 select-none"
      style={{ background: 'rgba(255,255,255,0.07)' }}
    >
      {/* Sliding active pill */}
      <div
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full pointer-events-none"
        style={{
          background: '#4ECBA0',
          left: '2px',
          transform: currentMode === 'loueur' ? 'translateX(calc(100% + 2px))' : 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        }}
      />

      <button
        role="radio"
        aria-checked={currentMode === 'locataire'}
        onClick={() => onSwitch('locataire')}
        className="relative z-10 flex-1 py-1.5 rounded-full border-none cursor-pointer transition-colors duration-200"
        style={{
          background: 'transparent',
          color: currentMode === 'locataire' ? '#1A1A1A' : 'rgba(255,255,255,0.45)',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        Locataire
      </button>

      <button
        role="radio"
        aria-checked={currentMode === 'loueur'}
        onClick={() => onSwitch('loueur')}
        className="relative z-10 flex-1 py-1.5 rounded-full border-none cursor-pointer transition-colors duration-200"
        style={{
          background: 'transparent',
          color: currentMode === 'loueur' ? '#1A1A1A' : 'rgba(255,255,255,0.45)',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        Loueur
      </button>
    </div>
  )
}
