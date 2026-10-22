import type { ReactNode, Ref } from 'react'
import { Button } from './Button'
import styles from './Alert.module.css'

type AlertProps = {
  variant: 'error' | 'warning' | 'info' | 'success'
  title?: string
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  onDismiss?: () => void
}

const LABELS: Record<AlertProps['variant'], string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
  success: 'Success',
}

// Icons are decorative; the screen-reader label and the visible title carry the meaning.
const ICONS: Record<AlertProps['variant'], ReactNode> = {
  error: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M7 7l6 6M13 7l-6 6" />
    </>
  ),
  warning: (
    <>
      <path d="M10 2.5L18 17H2z" />
      <path d="M10 8v4M10 14.5v.5" />
    </>
  ),
  info: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5M10 6v.5" />
    </>
  ),
  success: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M6.5 10.5l2.5 2.5 4.5-5" />
    </>
  ),
}

export function Alert({ variant, title, children, ref, onDismiss }: AlertProps) {
  return (
    <div
      ref={ref}
      role={variant === 'error' ? 'alert' : 'status'}
      tabIndex={-1}
      className={`${styles.alert} ${styles[variant]}`}
    >
      <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        {ICONS[variant]}
      </svg>
      <div className={styles.body}>
        <p className={styles.title}>
          <span className={styles.srOnly}>{LABELS[variant]}: </span>
          {title}
        </p>
        <div className={styles.content}>{children}</div>
        {onDismiss && (
          <div className={styles.actions}>
            <Button onClick={onDismiss}>Dismiss</Button>
          </div>
        )}
      </div>
    </div>
  )
}