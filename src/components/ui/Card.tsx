import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('card', className)}>{children}</div>
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={clsx(
        'flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800',
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('p-4', className)}>{children}</div>
}
