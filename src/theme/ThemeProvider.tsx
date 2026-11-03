import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { storage } from '../lib/storage'
import { THEME_PREFERENCES, ThemeContext, type ThemePreference } from './theme-context'

// Must match the inline script in index.html that applies the theme before first paint.
const STORAGE_KEY = 'workbench.theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function systemPrefersDark() {
  return window.matchMedia(DARK_QUERY).matches
}

function initialPreference(): ThemePreference {
  const stored = storage.get(STORAGE_KEY)
  return THEME_PREFERENCES.includes(stored as ThemePreference) ? (stored as ThemePreference) : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(initialPreference)
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, systemPrefersDark)
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.style.colorScheme = resolved
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    storage.set(STORAGE_KEY, next)
    setPreferenceState(next)
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
