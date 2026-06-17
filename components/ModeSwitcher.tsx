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
      className="relative flex select-none w-full"
      style={{
        background: 'rgba(255,255,255,0.07)',
        borderRadius: '10px',
        padding: '4px',
      }}
    >
      {/* Sliding active pill */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: '4px',
          bottom: '4px',
          left: '4px',
          width: 'calc(50% - 4px)',
          background: '#4ECBA0',
          borderRadius: '7px',
          transform: currentMode === 'loueur' ? 'translateX(100%)' : 'translateX(0)',
          transition: 'transform 0.25s ease',
        }}
      />

      <button
        role="switch"
        aria-checked={currentMode === 'locataire'}
        onClick={() => onSwitch('locataire')}
        className="relative z-10 flex-1 border-none cursor-pointer"
        style={{
          background: 'transparent',
          color: currentMode === 'locataire' ? '#1A1A1A' : 'rgba(255,255,255,0.45)',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.3px',
          padding: '6px 0',
          borderRadius: '6px',
          transition: 'color 0.2s ease',
        }}
      >
        Locataire
      </button>

      <button
        role="switch"
        aria-checked={currentMode === 'loueur'}
        onClick={() => onSwitch('loueur')}
        className="relative z-10 flex-1 border-none cursor-pointer"
        style={{
          background: 'transparent',
          color: currentMode === 'loueur' ? '#1A1A1A' : 'rgba(255,255,255,0.45)',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.3px',
          padding: '6px 0',
          borderRadius: '6px',
          transition: 'color 0.2s ease',
        }}
      >
        Loueur
      </button>
    </div>
  )
}
