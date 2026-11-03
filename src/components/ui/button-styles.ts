import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-90',
  secondary: 'border border-border-strong bg-surface text-fg hover:bg-surface-muted',
  ghost: 'text-muted hover:bg-surface-muted hover:text-fg',
  danger: 'bg-danger text-white hover:opacity-90',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[13px]',
  md: 'h-8 px-3 text-sm',
}

export function buttonStyles({
  variant = 'secondary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className)
}
