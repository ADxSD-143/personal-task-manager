import { Menu, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useOptionalCloudSync } from '@/components/auth/CloudSyncProvider'
import { useThemeEffect } from '@/hooks/useTheme'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const cloud = useOptionalCloudSync()
  useThemeEffect()

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <Sidebar />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-in border-r border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex justify-end px-3 pt-3">
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-[calc(100%-3rem)]">
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/80 px-3 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/80">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            to="/"
            className="text-sm font-semibold text-slate-900 lg:hidden dark:text-slate-100"
          >
            Personal OS
          </Link>

          <div className="ml-auto flex items-center gap-1">
            {cloud ? (
              <Link
                to="/settings"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-[11px] text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                role="status"
                aria-live="polite"
                title={cloud.error || `Cloud status: ${cloud.status}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    cloud.status === 'synced'
                      ? 'bg-emerald-500'
                      : cloud.status === 'offline'
                        ? 'bg-amber-500'
                        : cloud.status === 'error' || cloud.status === 'conflict'
                          ? 'bg-rose-500'
                          : 'animate-pulse bg-brand-500'
                  }`}
                />
                <span className="hidden sm:inline">
                  {cloud.status === 'synced'
                    ? 'Synced'
                    : cloud.status === 'saving'
                      ? 'Saving…'
                      : cloud.status === 'offline'
                        ? 'Offline'
                        : cloud.status === 'error'
                          ? 'Sync issue'
                          : cloud.status === 'conflict'
                            ? 'Resolve conflict'
                            : 'Connecting…'}
                </span>
              </Link>
            ) : null}
            <Link to="/search">
              <Button variant="ghost" size="icon" aria-label="Search">
                <Search className="h-4 w-4" />
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
