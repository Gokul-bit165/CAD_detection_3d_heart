import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Info, Loader2 } from 'lucide-react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cx(
        'rounded-2xl border border-line bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_-8px_rgba(0,0,0,0.08)] transition-colors',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
}

export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-ink text-surface hover:opacity-90 shadow-sm active:scale-[0.98]',
    secondary: 'bg-surface text-ink border border-line hover:bg-surface-2 active:scale-[0.98]',
    ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink active:scale-[0.98]',
  }[variant]

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

const tones = {
  neutral: 'bg-surface-2 text-ink-2 border border-line/60',
  teal: 'bg-accent-soft text-accent border border-accent/20',
  amber: 'bg-warn-soft text-warn border border-warn/25',
  red: 'bg-danger-soft text-danger border border-danger/25',
  blue: 'bg-info-soft text-info border border-info/25',
}

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-ink-3">
      <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden /> {label}...
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-2/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-[13px] leading-relaxed text-ink-3">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'error'
  title?: string
  children?: ReactNode
}) {
  const t = {
    info: 'border-info/30 bg-info-soft text-ink',
    warn: 'border-warn/30 bg-warn-soft text-ink',
    error: 'border-danger/30 bg-danger-soft text-ink',
  }[tone]
  const Icon = tone === 'info' ? Info : AlertTriangle
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={cx('flex gap-3 rounded-xl border px-4 py-3 text-sm', t)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}