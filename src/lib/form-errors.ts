import type { z } from 'zod'
import type { MessageKey } from '../i18n/en'

/** Error codes the schemas use as messages (see `api/schemas.ts`). */
const FORM_ERRORS = [
  'titleShort',
  'titleLong',
  'descriptionLong',
  'assetRequired',
  'date',
  'hours',
  'tag',
  'nameShort',
  'nameLong',
  'locationShort',
  'locationLong',
  'commentEmpty',
  'commentLong',
] as const

type FormError = (typeof FORM_ERRORS)[number]

/** First error per top-level field, keyed by field name. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '')
    errors[field] ??= issue.message
  }
  return errors
}

export function formErrorKey(code: string): MessageKey {
  return FORM_ERRORS.includes(code as FormError) ? `form.error.${code as FormError}` : 'form.error.invalid'
}
