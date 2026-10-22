import styles from './Skeleton.module.css'

type SkeletonProps = {
  lines?: number
  height?: string
}

// Decorative only: the consumer owns aria-busy and any live-region text.
export function Skeleton({ lines = 3, height = '1rem' }: SkeletonProps) {
  const count = Math.max(0, Math.floor(lines))

  return (
    <div className={styles.skeleton} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={styles.bar}
          style={{ height, width: index === count - 1 && count > 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}