import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
      <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
        <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
