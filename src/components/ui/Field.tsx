import clsx from 'clsx'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('block', className)}>
      {label ? (
        <label className="block">
          <span className="label">{label}</span>
          {children}
        </label>
      ) : (
        children
      )}
      {error ? (
        <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      ) : null}
    </div>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx('input', className)} {...props} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx('input min-h-[80px] resize-y', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx('input pr-8', className)} {...props}>
      {children}
    </select>
  )
}

export function Checkbox({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={clsx(
        'h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800',
        className
      )}
      {...props}
    />
  )
}
