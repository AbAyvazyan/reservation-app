import type { ComponentProps } from 'react'
import styles from './Button.module.css'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  loading = false,
  type = 'button',
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classNames = [styles.button, styles[variant], className].filter(Boolean).join(' ')

  return (
    <button
      {...rest}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  )
}