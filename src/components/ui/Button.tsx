import type { ComponentProps } from 'react'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './button-styles'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />
}
