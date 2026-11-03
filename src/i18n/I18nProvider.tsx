import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { storage } from '../lib/storage'
import { en, type MessageKey, type Messages } from './en'
import { I18nContext, LOCALES, type Locale, type TranslateVars } from './i18n-context'
import { ptBR } from './pt-BR'

const STORAGE_KEY = 'workbench.locale'
const MESSAGES: Record<Locale, Messages> = { en, 'pt-BR': ptBR }

function initialLocale(): Locale {
  const stored = storage.get(STORAGE_KEY)
  if (LOCALES.includes(stored as Locale)) return stored as Locale
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

function interpolate(template: string, vars?: TranslateVars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

export function I18nProvider({ children, locale: forced }: { children: ReactNode; locale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => forced ?? initialLocale())

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    storage.set(STORAGE_KEY, next)
    setLocaleState(next)
  }, [])

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: MessageKey, vars?: TranslateVars) => {
        const messages: Record<string, string> = MESSAGES[locale]
        // Singular form when the dictionary has one: "dashboard.jobs.one" for count 1.
        const template = (vars?.count === 1 && messages[`${key}.one`]) || messages[key]
        return interpolate(template, vars)
      },
    }),
    [locale, setLocale],
  )

  return <I18nContext value={value}>{children}</I18nContext>
}
