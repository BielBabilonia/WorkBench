import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type Tone = 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'accent'

const TONES: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-neutral-soft text-neutral-fg', dot: 'bg-neutral' },
  info: { badge: 'bg-info-soft text-info-fg', dot: 'bg-info' },
  warning: { badge: 'bg-warning-soft text-warning-fg', dot: 'bg-warning' },
  danger: { badge: 'bg-danger-soft text-danger-fg', dot: 'bg-danger' },
  success: { badge: 'bg-success-soft text-success-fg', dot: 'bg-success' },
  accent: { badge: 'bg-accent-soft text-accent', dot: 'bg-accent' },
}

/** Colored pill. The text always carries the meaning; color only reinforces it. */
export function Badge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone].badge,
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Dot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-1.5 shrink-0 rounded-full', TONES[tone].dot, className)} />
}
