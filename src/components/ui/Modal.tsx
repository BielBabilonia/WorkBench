import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useI18n } from '../../i18n/i18n-context'
import { XIcon } from './icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md'
}

/**
 * Built on the native <dialog>: focus trapping, Escape to close, inert
 * background and focus restoration come from the browser.
 */
export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose()
      }}
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl border border-border bg-surface p-0 text-fg shadow-overlay open:animate-dialog-in ${
        size === 'sm' ? 'max-w-md' : 'max-w-lg'
      }`}
    >
      {open && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="-m-1 rounded-md p-1 text-muted hover:bg-surface-muted hover:text-fg"
            >
              <XIcon className="size-5" />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}
