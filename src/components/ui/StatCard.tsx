import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'text-brand-600 dark:text-brand-400',
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: string
  className?: string
}) {
  return (
    <div className={clsx('card p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className={clsx('rounded-lg bg-slate-100 p-2 dark:bg-slate-800', tone)}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
