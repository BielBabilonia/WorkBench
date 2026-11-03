import type { ReactNode } from 'react'
import { useI18n } from '../../i18n/i18n-context'
import { cn } from '../../lib/cn'
import { Button } from './Button'

interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('px-5 py-10 text-center text-sm', className)}>
      <p className="font-medium text-fg">{title}</p>
      {description && <p className="mt-1 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  const { t } = useI18n()
  return (
    <div role="alert">
      <EmptyState
        className={className}
        title={t('common.errorTitle')}
        description={t('common.errorBody')}
        action={onRetry && <Button onClick={onRetry}>{t('common.retry')}</Button>}
      />
    </div>
  )
}
