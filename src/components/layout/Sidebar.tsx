import { Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useStore } from '@/store/useStore'
import { NAV } from './nav'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const openTasks = useStore((state) => state.tasks.filter((task) => !task.completed).length)
  const profile = useStore((state) => state.profile)
  const counts: Record<string, number> = { '/tasks': openTasks }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-4">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {profile.name || 'Personal OS'}
          </p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {profile.tagline || 'Learn · Build · Track'}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-5">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition',
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {counts[item.to] ? (
                      <span className="rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {counts[item.to]}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <p className="px-2 text-[10px] text-slate-500 dark:text-slate-400">
        Your data syncs to your account.
      </p>
    </div>
  )
}
