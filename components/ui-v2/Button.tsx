'use client'

import Link from 'next/link'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { Icon } from './primitives'
import type { IconName } from './icons'

export type ButtonVariant = 'main' | 'glass' | 'ghost' | 'danger'

interface Common {
  variant?: ButtonVariant
  size?: 'sm'
  block?: boolean
  icon?: IconName
  children?: ReactNode
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}

type AsButton = Common & {
  href?: undefined
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
}

type AsLink = Common & {
  href: string
  external?: boolean
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

/**
 * Bouton du dashboard v2. Règle de la charte : un seul bouton violet (main)
 * par zone d'action ; les autres en verre (glass) ou discrets (ghost).
 */
export function Button(props: AsButton | AsLink) {
  const { variant = 'glass', size, block, icon, children, className, style } = props
  const cls = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', block ? 'btn-block' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  const iconSize = size === 'sm' ? 16 : 18
  const inner = (
    <>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
    </>
  )
  if (props.href !== undefined) {
    if (props.external) {
      return (
        <a className={cls} style={style} href={props.href} onClick={props.onClick} aria-label={props['aria-label']}>
          {inner}
        </a>
      )
    }
    return (
      <Link className={cls} style={style} href={props.href} onClick={props.onClick} aria-label={props['aria-label']}>
        {inner}
      </Link>
    )
  }
  return (
    <button
      className={cls}
      style={style}
      type={props.type ?? 'button'}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-label={props['aria-label']}
    >
      {inner}
    </button>
  )
}
