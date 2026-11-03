import { useId, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

const inputClasses =
  'block h-8 w-full rounded-md border border-border-strong bg-surface px-2.5 text-sm text-fg placeholder:text-subtle transition-colors focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/40'

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined }) => ReactElement
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-fg">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger-fg">
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClasses, className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(inputClasses, 'pr-8', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClasses, 'h-auto min-h-20 py-2 leading-relaxed', className)} {...props} />
}
