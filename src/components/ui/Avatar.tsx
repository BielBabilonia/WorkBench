import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'

// Hues for avatar backgrounds, picked from the user id so a person keeps their color.
const HUES = [25, 70, 150, 200, 250, 300, 340]

function hueOf(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return HUES[Math.abs(hash) % HUES.length]
}

interface AvatarProps {
  user: { id: string; name: string } | null | undefined
  size?: 'sm' | 'md'
  className?: string
  /** Decorative when the name is already next to it. */
  decorative?: boolean
}

export function Avatar({ user, size = 'md', className, decorative = true }: AvatarProps) {
  const sizes = size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs'
  if (!user) {
    return (
      <span
        aria-hidden
        className={cn('inline-block shrink-0 rounded-full border border-dashed border-border-strong', sizes, className)}
      />
    )
  }
  const hue = hueOf(user.id)
  return (
    <span
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : user.name}
      title={user.name}
      style={{ backgroundColor: `oklch(0.9 0.06 ${hue})`, color: `oklch(0.35 0.1 ${hue})` }}
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold', sizes, className)}
    >
      {initials(user.name)}
    </span>
  )
}
