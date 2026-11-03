import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n-context'
import { buttonStyles } from '../ui/button-styles'
import { EmptyState } from '../ui/States'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <EmptyState
      className="py-24"
      title={<span className="text-2xl">404 · {t('common.notFoundTitle')}</span>}
      description={t('common.notFoundBody')}
      action={
        <Link to="/" className={buttonStyles({ variant: 'primary' })}>
          {t('common.backHome')}
        </Link>
      }
    />
  )
}
