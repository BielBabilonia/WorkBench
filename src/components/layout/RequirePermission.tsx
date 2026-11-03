import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n-context'
import type { Permission } from '../../lib/permissions'
import { useSession } from '../../session/session-context'
import { buttonStyles } from '../ui/button-styles'
import { EmptyState } from '../ui/States'

/** Route guard. The API refuses the same requests, so this is about UX, not security. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { t } = useI18n()
  const { can } = useSession()
  if (can(permission)) return children
  return (
    <EmptyState
      className="py-24"
      title={t('common.forbiddenTitle')}
      description={t('common.forbiddenBody')}
      action={
        <Link to="/" className={buttonStyles({ variant: 'primary' })}>
          {t('common.backHome')}
        </Link>
      }
    />
  )
}
