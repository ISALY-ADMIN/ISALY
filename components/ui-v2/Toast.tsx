'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './primitives'

type ToastFn = (message: string) => void

const ToastCtx = createContext<ToastFn>(() => {})

/** Message flash du dashboard v2 (pastille sombre en bas de l'écran). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const timer = useRef<number>(0)

  const toast = useCallback<ToastFn>(message => {
    setMsg(message)
    setShow(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShow(false), 2800)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={show ? 'v-toast show' : 'v-toast'} role="status" aria-live="polite">
        {msg && (
          <>
            <Icon name="check" size={18} />
            <span>{msg}</span>
          </>
        )}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastFn {
  return useContext(ToastCtx)
}
