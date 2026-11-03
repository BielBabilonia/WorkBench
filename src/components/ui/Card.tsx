import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('rounded-lg border border-border bg-surface', className)} {...props} />
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  id?: string
}

export function CardHeader({ title, description, actions, id }: CardHeaderProps) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-4 py-2.5">
      <div className="min-w-0">
        <h2 id={id} className="text-[13px] font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  )
}
