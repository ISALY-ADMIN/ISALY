'use client'

import { useEffect, useState } from 'react'

const ROWS = 5
const COLS = 4
const TOTAL = ROWS * COLS

export default function BuildingAnimation() {
  const [lit, setLit] = useState<Set<number>>(() => new Set([1, 4, 6, 9, 11, 15, 17]))

  useEffect(() => {
    const id = setInterval(() => {
      setLit(prev => {
        const next = new Set(prev)
        const idx = Math.floor(Math.random() * TOTAL)
        if (next.has(idx)) next.delete(idx)
        else next.add(idx)
        return next
      })
    }, 720)
    return () => clearInterval(id)
  }, [])

  // Window grid positions
  const colX = [52, 95, 138, 181]
  const rowY = [92, 140, 188, 236, 284]

  return (
    <svg
      viewBox="0 0 268 390"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: '320px', height: 'auto' }}
      aria-hidden="true"
    >
      {/* Night sky card background */}
      <rect width="268" height="390" rx="20" fill="#14171F" />

      {/* Stars */}
      {[
        [22, 24, 0.7], [48, 10, 0.4], [80, 18, 0.6], [210, 16, 0.5],
        [240, 28, 0.8], [255, 10, 0.4], [12, 60, 0.5], [258, 70, 0.6],
        [14, 180, 0.4], [256, 160, 0.5], [18, 300, 0.6], [250, 280, 0.4],
      ].map(([x, y, op], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#FFF8E7" opacity={op} />
      ))}

      {/* Moon — crescent */}
      <circle cx="225" cy="36" r="18" fill="#FFF8E7" opacity="0.9" />
      <circle cx="232" cy="29" r="14" fill="#14171F" />

      {/* Distant city silhouette */}
      <rect x="0"   y="345" width="30"  height="40" rx="2" fill="#1C2235" />
      <rect x="0"   y="358" width="15"  height="27" rx="2" fill="#1C2235" />
      <rect x="230" y="340" width="38"  height="45" rx="2" fill="#1C2235" />
      <rect x="242" y="332" width="16"  height="53" rx="2" fill="#1C2235" />
      <rect x="252" y="348" width="16"  height="37" rx="2" fill="#1C2235" />

      {/* Building drop shadow */}
      <rect x="38" y="78" width="196" height="290" rx="8" fill="#0A0D16" opacity="0.5" />

      {/* Building body */}
      <rect x="30" y="68" width="208" height="292" rx="6" fill="#1A1F2E" />

      {/* Vertical facade details */}
      <rect x="128" y="68" width="12" height="292" fill="#1C2235" opacity="0.4" />

      {/* Floor ledges */}
      {[116, 164, 212, 260].map((y, i) => (
        <rect key={i} x="30" y={y} width="208" height="3.5" rx="1" fill="#0D111A" />
      ))}

      {/* Roof / cornice */}
      <rect x="22" y="54" width="224" height="20" rx="4" fill="#0D111A" />
      <rect x="40" y="48" width="188" height="10" rx="3" fill="#14171F" />

      {/* Antenna left */}
      <rect x="68"  y="22" width="7" height="30" rx="2" fill="#0D111A" />
      <circle cx="71.5" cy="20" r="4.5" fill="#0D111A" />
      <circle cx="71.5" cy="20" r="2"   fill="#EF4444" opacity="0.8" />

      {/* Antenna right */}
      <rect x="192" y="18" width="5" height="36" rx="2" fill="#0D111A" />

      {/* Windows */}
      {rowY.map((wy, ri) =>
        colX.map((wx, ci) => {
          const idx = ri * COLS + ci
          const isLit = lit.has(idx)
          return (
            <g key={idx}>
              {/* Glow halo */}
              <rect
                x={wx - 5} y={wy - 5}
                width={40} height={36}
                rx={7}
                style={{
                  fill: '#FFC857',
                  opacity: isLit ? 0.22 : 0,
                  transition: 'opacity 0.55s ease',
                }}
              />
              {/* Window pane */}
              <rect
                x={wx} y={wy}
                width={30} height={26}
                rx={4}
                style={{
                  fill: isLit ? '#FFC857' : '#0D111A',
                  transition: 'fill 0.55s ease',
                }}
              />
              {/* Window cross-bar (only when lit) */}
              {isLit && (
                <>
                  <line x1={wx + 15} y1={wy}      x2={wx + 15} y2={wy + 26} stroke="#F59E0B" strokeWidth="1" opacity="0.4" />
                  <line x1={wx}      y1={wy + 13} x2={wx + 30} y2={wy + 13} stroke="#F59E0B" strokeWidth="1" opacity="0.4" />
                </>
              )}
            </g>
          )
        })
      )}

      {/* Entrance / door frame */}
      <rect x="104" y="322" width="60" height="38" rx="5" fill="#0D111A" />
      {/* Door arch */}
      <path d="M104 328 Q134 308 164 328" fill="#0D111A" />
      {/* Door center line */}
      <rect x="132" y="322" width="4" height="38" fill="#14171F" opacity="0.5" />

      {/* Ground */}
      <rect x="0" y="360" width="268" height="30" rx="0" fill="#0D111A" opacity="0.6" />
      <rect x="0" y="360" width="268" height="4"  fill="#1C2235" />
    </svg>
  )
}
