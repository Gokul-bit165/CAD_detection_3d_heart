import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Info, Loader2 } from 'lucide-react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx('rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,42,67,.04),0_4px_16px_-8px_rgba(15,42,67,.08)]', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div>
        <h2 className="text-[15px] font-semibold text-navy-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-navy-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; loading?: boolean }
export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-navy-900 text-white hover:bg-navy-700 shadow-sm',
    secondary: 'bg-white text-navy-900 border border-line hover:bg-canvas',
    ghost: 'text-navy-700 hover:bg-navy-900/5',
  }[variant]
  return (
    <button {...rest} disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', styles, className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

const tones = {
  neutral: 'bg-navy-900/5 text-navy-700',
  teal: 'bg-teal-soft text-teal-800',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-900',
}
export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-navy-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}…
    </div>
  )
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-navy-300/70 bg-canvas/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-navy-300">{icon}</div>}
      <p className="text-sm font-semibold text-navy-900">{title}</p>
      {children && <div className="mt-1 max-w-md text-[13px] leading-relaxed text-navy-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Alert({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'error'; title?: string; children?: ReactNode }) {
  const t = {
    info: 'border-blue-200 bg-blue-50 text-blue-950',
    warn: 'border-amber-300 bg-amber-50 text-amber-950',
    error: 'border-red-300 bg-red-50 text-red-950',
  }[tone]
  const Icon = tone === 'info' ? Info : AlertTriangle
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={cx('flex gap-3 rounded-xl border px-4 py-3 text-sm', t)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{title && <p className="font-semibold">{title}</p>}{children && <div className="leading-relaxed">{children}</div>}</div>
    </div>
  )
}
