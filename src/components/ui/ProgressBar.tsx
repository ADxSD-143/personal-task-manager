import clsx from 'clsx'

export function ProgressBar({
  value,
  className,
  color = '#6366f1',
  height = 8,
  showLabel = false,
  label = 'Progress',
}: {
  value: number
  className?: string
  color?: string
  height?: number
  showLabel?: boolean
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div
        className="w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        style={{ height }}
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${clamped}%`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      {showLabel ? (
        <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
          {clamped}%
        </span>
      ) : null}
    </div>
  )
}
