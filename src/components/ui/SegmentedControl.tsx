import clsx from 'clsx'

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string; count?: number }>
  value: T
  onChange: (value: T) => void
  className?: string
  ariaLabel?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={clsx(
        'inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/70',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          {option.label}
          {typeof option.count === 'number' ? (
            <span className="rounded-full bg-slate-200 px-1.5 text-[10px] tabular-nums text-slate-600 dark:bg-slate-600 dark:text-slate-200">
              {option.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
