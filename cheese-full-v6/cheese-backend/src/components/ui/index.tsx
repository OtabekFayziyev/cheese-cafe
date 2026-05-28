import React from 'react'
import clsx from 'clsx'
import styles from './UI.module.css'

// ── Button ──
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
}

export function Button({
  children, variant = 'primary', size = 'md',
  loading, fullWidth, icon, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.btn,
        styles[`btn-${variant}`],
        styles[`btn-${size}`],
        fullWidth && styles['btn-full'],
        (loading || disabled) && styles['btn-disabled'],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {icon && <span className={styles.btnIcon}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  )
}

// ── Badge ──
interface BadgeProps {
  children: React.ReactNode
  variant?: 'yellow' | 'dark' | 'green' | 'red' | 'blue'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'yellow', size = 'md', className }: BadgeProps) {
  return (
    <span className={clsx(styles.badge, styles[`badge-${variant}`], styles[`badge-${size}`], className)}>
      {children}
    </span>
  )
}

// ── Input ──
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export function Input({ label, error, prefix, suffix, className, ...props }: InputProps) {
  return (
    <div className={styles.inputWrap}>
      {label && <label className={styles.inputLabel}>{label}</label>}
      <div className={clsx(styles.inputInner, error && styles.inputError)}>
        {prefix && <span className={styles.inputPrefix}>{prefix}</span>}
        <input className={clsx(styles.input, className)} {...props} />
        {suffix && <span className={styles.inputSuffix}>{suffix}</span>}
      </div>
      {error && <span className={styles.inputErrMsg}>{error}</span>}
    </div>
  )
}

// ── Skeleton ──
interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, className }: SkeletonProps) {
  return (
    <div
      className={clsx(styles.skeleton, className)}
      style={{ width, height, borderRadius }}
    />
  )
}

// ── Divider ──
export function Divider({ className }: { className?: string }) {
  return <div className={clsx(styles.divider, className)} />
}

// ── Empty State ──
interface EmptyStateProps {
  emoji: string
  title: string
  description: string
  action?: React.ReactNode
  animateEmoji?: 'bounce' | 'heartbeat' | 'jiggle' | 'float'
}

export function EmptyState({ emoji, title, description, action, animateEmoji = 'bounce' }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={clsx(styles.emptyEmoji, styles[`emoji-${animateEmoji}`])}>
        {emoji}
      </div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyDesc}>{description}</p>
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  )
}
