import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n/i18n-context'
import { cn } from '../../lib/cn'
import { AlertIcon, CheckIcon, XIcon } from './icons'
import { ToastContext, type ToastTone } from './toast-context'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const DURATION_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-2), { id, message, tone }])
      window.setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext value={value}>
      {children}
      <section
        aria-label={t('toast.region')}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        <div role="status" aria-live="polite" className="contents">
          <ol className="contents">
            {toasts.map((item) => (
              <li
                key={item.id}
                className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-overlay"
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full',
                    item.tone === 'success' ? 'bg-success-soft text-success-fg' : 'bg-danger-soft text-danger-fg',
                  )}
                >
                  {item.tone === 'success' ? <CheckIcon className="size-3.5" /> : <AlertIcon className="size-3.5" />}
                </span>
                <p className="min-w-0 flex-1 text-fg">{item.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label={t('toast.dismiss')}
                  className="rounded-md p-1 text-muted hover:bg-surface-muted hover:text-fg"
                >
                  <XIcon className="size-4" />
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </ToastContext>
  )
}
