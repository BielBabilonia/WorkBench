import { createContext, useContext } from 'react'
import type { MessageKey } from './en'

export const LOCALES = ['en', 'pt-BR'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', 'pt-BR': 'Português' }

export type TranslateVars = Record<string, string | number>

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, vars?: TranslateVars) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>')
  return context
}
