import { ApiError } from '../api/client'
import type { MessageKey } from './en'
import { useI18n } from './i18n-context'

const KNOWN_CODES = [
  'forbidden',
  'unassigned',
  'checklist_incomplete',
  'duplicate_tag',
  'last_admin',
  'has_work_in_progress',
  'invalid_assignee',
] as const

type KnownCode = (typeof KNOWN_CODES)[number]

/** Localized message for an API error: specific when the server says why, generic otherwise. */
export function useErrorMessage() {
  const { t } = useI18n()
  return (error: unknown, fallback: MessageKey = 'errors.generic') => {
    if (error instanceof ApiError && KNOWN_CODES.includes(error.code as KnownCode)) {
      return t(`errors.${error.code as KnownCode}`)
    }
    return t(fallback)
  }
}
