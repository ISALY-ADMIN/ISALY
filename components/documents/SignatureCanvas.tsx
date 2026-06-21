'use client'

import { useRef, useState, useImperativeHandle, forwardRef } from 'react'

export interface SignatureCanvasHandle {
  toDataURL: () => string | null
  clear: () => void
  isEmpty: () => boolean
}

interface Props {
  label: string
  onChange?: (signed: boolean) => void
}

const SignatureCanvas = forwardRef<SignatureCanvasHandle, Props>(function SignatureCanvas({ label, onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasDrawn = useRef(false)
  const [signed, setSigned] = useState(false)

  function getCtx() {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const point = 'touches' in e ? e.touches[0] : e
    return { x: point.clientX - rect.left, y: point.clientY - rect.top }
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    hasDrawn.current = true
    setSigned(true)
    onChange?.(true)
  }

  function end() {
    drawing.current = false
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawn.current = false
    setSigned(false)
    onChange?.(false)
  }

  useImperativeHandle(ref, () => ({
    toDataURL: () => (hasDrawn.current ? canvasRef.current?.toDataURL('image/png') ?? null : null),
    clear: clearCanvas,
    isEmpty: () => !hasDrawn.current,
  }))

  return (
    <div>
      <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>{label}</label>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        className="rounded-[10px] cursor-crosshair w-full"
        style={{ background: '#F9FAFB', border: `1.5px dashed ${signed ? '#4ECBA0' : '#E5E7EB'}`, touchAction: 'none' }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px]" style={{ color: signed ? '#2AA87C' : '#9CA3AF' }}>
          {signed ? '✓ Lu et approuvé' : 'Signez dans le cadre ci-dessus'}
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          className="text-[11px] font-semibold border-none bg-transparent cursor-pointer"
          style={{ color: '#9CA3AF' }}
        >
          Effacer
        </button>
      </div>
    </div>
  )
})

export default SignatureCanvas
