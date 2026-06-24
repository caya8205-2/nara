import { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, CircleDashed, LucideIcon } from 'lucide-react'
import type { DependencyStatus } from '../lib/api'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const toneClasses: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-white text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-teal-200 bg-teal-50 text-teal-700',
}

const dotClasses: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-teal-500',
}

export const dependencyTone = (status?: DependencyStatus): Tone => {
  if (!status) return 'neutral'
  if (status.ok) return 'success'
  if (status.status === 'disabled' || status.status === 'missing') return 'warning'
  return 'danger'
}

export const statusLabel = (status?: DependencyStatus) => {
  if (!status) return 'Checking'
  if (status.ok) return 'Online'
  return status.status.charAt(0).toUpperCase() + status.status.slice(1)
}

export function StatusBadge({
  children,
  tone = 'neutral',
  withDot = true,
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  withDot?: boolean
  className?: string
}) {
  return (
    <span
      className={[
        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold',
        toneClasses[tone],
        className,
      ].join(' ')}
    >
      {withDot && <span className={['h-1.5 w-1.5 rounded-full', dotClasses[tone]].join(' ')} />}
      {children}
    </span>
  )
}

export function DependencyBadge({ status }: { status?: DependencyStatus }) {
  return <StatusBadge tone={dependencyTone(status)}>{statusLabel(status)}</StatusBadge>
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nara Admin</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={['rounded-lg border border-slate-200 bg-white shadow-sm', className].join(' ')}>
      {children}
    </section>
  )
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function MetricTile({
  label,
  value,
  description,
  icon: Icon,
  badge,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  description?: string
  icon: LucideIcon
  badge?: ReactNode
  tone?: Tone
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-500">
          <span className={['flex h-8 w-8 shrink-0 items-center justify-center rounded-md border', toneClasses[tone]].join(' ')}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="truncate">{label}</span>
        </div>
        {badge}
      </div>
      <div className="mt-4 text-2xl font-semibold text-slate-950">{value}</div>
      {description && <p className="mt-1 min-h-5 text-sm text-slate-500">{description}</p>}
    </Panel>
  )
}

export function EmptyState({
  icon: Icon = CircleDashed,
  title,
  description,
}: {
  icon?: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  )
}

export function InlineNotice({
  tone = 'info',
  title,
  children,
}: {
  tone?: Tone
  title: string
  children: ReactNode
}) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div className={['rounded-lg border p-4', toneClasses[tone]].join(' ')}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <div className="mt-1 text-sm opacity-90">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function AdminButton({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  const classes = {
    primary: 'bg-teal-600 text-white shadow-sm hover:bg-teal-700',
    secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
    danger: 'border border-rose-200 bg-rose-50 text-rose-700 shadow-sm hover:bg-rose-100',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }

  return (
    <button
      type="button"
      className={[
        'inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        classes[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
