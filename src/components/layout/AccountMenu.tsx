import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useResetDemo, useUsers } from '../../api/queries'
import { LOCALE_LABELS, LOCALES, useI18n } from '../../i18n/i18n-context'
import { cn } from '../../lib/cn'
import { REPO_URL } from '../../lib/links'
import { useSession } from '../../session/session-context'
import { THEME_PREFERENCES, useTheme } from '../../theme/theme-context'
import { Avatar } from '../ui/Avatar'
import { CheckIcon } from '../ui/icons'
import { useToast } from '../ui/toast-context'

function Section({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="py-1">
      <p id={id} className="px-3 pt-1.5 pb-1 text-xs text-subtle">
        {label}
      </p>
      {children}
    </div>
  )
}

function Option({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] hover:bg-surface-muted"
    >
      {children}
      <CheckIcon className={cn('ml-auto size-3.5 shrink-0', !selected && 'invisible')} />
    </button>
  )
}

/**
 * Who you are and how the app looks, in one place: the demo user switcher,
 * theme and language. Built on the native popover (light dismiss, Escape, top layer).
 */
export function AccountMenu({ placement }: { placement: 'up' | 'down' }) {
  const { t, locale, setLocale } = useI18n()
  const { preference, setPreference } = useTheme()
  const { user, signInAs } = useSession()
  const { data: users = [] } = useUsers()
  const toast = useToast()
  const reset = useResetDemo()
  const popoverId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Popovers default to `inset: 0`, so every side is set explicitly.
  const [position, setPosition] = useState<CSSProperties>({})

  if (!user) return null

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition(
      placement === 'up'
        ? { left: rect.left, right: 'auto', top: 'auto', bottom: window.innerHeight - rect.top + 6 }
        : { left: Math.max(8, rect.right - 256), right: 'auto', top: rect.bottom + 6, bottom: 'auto' },
    )
  }

  const close = () => document.getElementById(popoverId)?.hidePopover?.()

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        popoverTarget={popoverId}
        aria-label={t('account.menu', { name: user.name })}
        className="flex w-full min-w-0 items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-surface-muted"
      >
        <Avatar user={user} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted">{t(`role.${user.role}`)}</span>
        </span>
      </button>

      <div
        id={popoverId}
        popover="auto"
        onBeforeToggle={(event) => {
          if ((event as unknown as ToggleEvent).newState === 'open') place()
        }}
        style={position}
        className="fixed m-0 max-h-[calc(100dvh-4rem)] w-64 overflow-y-auto rounded-lg border border-border bg-surface p-0 text-fg shadow-overlay"
      >
        <Section label={t('account.viewAs')}>
          {users.map((u) => (
            <Option
              key={u.id}
              selected={u.id === user.id}
              onSelect={() => {
                signInAs(u.id)
                close()
              }}
            >
              <Avatar user={u} size="sm" />
              <span className="min-w-0 truncate">{u.name}</span>
              <span className="text-xs text-muted">{t(`role.${u.role}`)}</span>
            </Option>
          ))}
        </Section>

        <div className="border-t border-border">
          <Section label={t('theme.label')}>
            {THEME_PREFERENCES.map((value) => (
              <Option key={value} selected={preference === value} onSelect={() => setPreference(value)}>
                {t(`theme.${value}`)}
              </Option>
            ))}
          </Section>
        </div>

        <div className="border-t border-border">
          <Section label={t('language.label')}>
            {LOCALES.map((value) => (
              <Option key={value} selected={locale === value} onSelect={() => setLocale(value)}>
                <span lang={value}>{LOCALE_LABELS[value]}</span>
              </Option>
            ))}
          </Section>
        </div>

        <div className="border-t border-border py-1 text-[13px]">
          <button
            type="button"
            disabled={reset.isPending}
            onClick={() =>
              reset.mutate(undefined, {
                onSuccess: () => {
                  toast(t('toast.reset'))
                  close()
                },
              })
            }
            className="block w-full px-3 py-1.5 text-left hover:bg-surface-muted"
          >
            {t('app.resetDemo')}
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="block px-3 py-1.5 text-muted hover:bg-surface-muted hover:text-fg"
          >
            {t('app.sourceCode')} ↗
          </a>
        </div>
      </div>
    </>
  )
}
