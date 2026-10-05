import { createContext, useContext, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthPage } from '@/components/auth/AuthPage'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { parseImport, pickData } from '@/lib/exportImport'
import { useStore } from '@/store/useStore'
import type { DataState } from '@/types'

type SyncStatus = 'loading' | 'synced' | 'saving' | 'offline' | 'error'

interface CloudContextValue {
  email: string
  status: SyncStatus
  error: string
  signOut: () => Promise<void>
}

const CloudContext = createContext<CloudContextValue | null>(null)

export const useCloudSync = (): CloudContextValue => {
  const context = useContext(CloudContext)
  if (!context) throw new Error('useCloudSync must be used inside CloudSyncProvider')
  return context
}

export function CloudSyncProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [status, setStatus] = useState<SyncStatus>('loading')
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    let active = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setAuthError(error.message)
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthError('')
      setAuthLoading(false)
      setStatus('loading')
      setSyncError('')
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (!supabaseConfigured || !supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Cloud sync needs setup</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Add the Supabase project URL and anon key as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
            environment variables, then restart the app. See README.md for setup instructions.
          </p>
        </div>
      </div>
    )
  }

  if (authLoading) {
    return <div className="p-8 text-center text-sm text-slate-500" role="status">Loading account…</div>
  }

  if (authError && !session) {
    return <AuthPage initialError={authError} />
  }

  if (!session) return <AuthPage />

  return (
    <CloudContext.Provider
      value={{
        email: session.user.email ?? '',
        status,
        error: syncError,
        signOut: async () => {
          if (!supabase) return
          const { error } = await supabase.auth.signOut()
          if (error) throw error
        },
      }}
    >
      <CloudDataSync
        userId={session.user.id}
        onStatusChange={setStatus}
        onError={setSyncError}
      >
        {children}
      </CloudDataSync>
    </CloudContext.Provider>
  )
}

function CloudDataSync({
  userId,
  onStatusChange,
  onError,
  children,
}: PropsWithChildren<{
  userId: string
  onStatusChange: (status: SyncStatus) => void
  onError: (message: string) => void
}>) {
  useEffect(() => {
    const client = supabase
    if (!client) return

    let cancelled = false
    let hydrated = false
    let saveTimer: ReturnType<typeof setTimeout> | undefined
    let latestSnapshot = ''
    let writeChain = Promise.resolve()
    let loading = false

    const setFailure = (message: string) => {
      if (cancelled) return
      onError(message)
      onStatusChange('error')
    }

    const applyCloudData = (value: unknown): boolean => {
      const parsed = parseImport(JSON.stringify(value))
      if (!parsed.ok) {
        setFailure(`Cloud data could not be read: ${parsed.error}`)
        return false
      }
      latestSnapshot = JSON.stringify(pickData(parsed.data))
      useStore.setState(parsed.data)
      return true
    }

    const saveSnapshot = (snapshot: DataState) => {
      const serialized = JSON.stringify(snapshot)
      latestSnapshot = serialized
      writeChain = writeChain.then(async () => {
        if (cancelled) return
        onStatusChange(navigator.onLine ? 'saving' : 'offline')
        const { error } = await client
          .from('user_data')
          .upsert(
            { user_id: userId, data: snapshot, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
        if (error) throw error
        if (!cancelled && serialized === latestSnapshot) {
          onError('')
          onStatusChange(navigator.onLine ? 'synced' : 'offline')
        }
      }).catch((error: unknown) => {
        setFailure(error instanceof Error ? error.message : 'Could not save data to cloud.')
      })
    }

    const scheduleSave = (snapshot: DataState) => {
      if (!hydrated) return
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => saveSnapshot(snapshot), 500)
    }

    const unsubscribe = useStore.subscribe((state, previous) => {
      if (!hydrated) return
      const nextData = pickData(state)
      if (JSON.stringify(nextData) !== JSON.stringify(pickData(previous))) {
        scheduleSave(nextData)
      }
    })

    const channel = client
      .channel(`user-data-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (!hydrated || !payload.new || typeof payload.new !== 'object') return
          const remoteData = (payload.new as { data?: unknown }).data
          if (JSON.stringify(remoteData) === latestSnapshot) return
          if (remoteData !== undefined && applyCloudData(remoteData)) {
            onError('')
            onStatusChange('synced')
          }
        }
      )
      .subscribe()

    const load = async () => {
      if (loading) return
      loading = true
      onStatusChange('loading')
      try {
        const { data: row, error } = await client
          .from('user_data')
          .select('data')
          .eq('user_id', userId)
          .maybeSingle()

        if (cancelled) return
        if (error) {
          setFailure(error.message)
          return
        }

        if (row) {
          if (!applyCloudData(row.data)) return
        } else {
          const localData = pickData(useStore.getState())
          saveSnapshot(localData)
        }
        hydrated = true
        onStatusChange(navigator.onLine ? 'synced' : 'offline')
      } catch (error) {
        setFailure(error instanceof Error ? error.message : 'Could not load data from cloud.')
      } finally {
        loading = false
      }
    }

    const handleOnline = () => {
      if (hydrated) scheduleSave(pickData(useStore.getState()))
      else void load()
    }
    const handleOffline = () => onStatusChange('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    void load()

    return () => {
      cancelled = true
      if (saveTimer) clearTimeout(saveTimer)
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      void client.removeChannel(channel)
    }
  }, [userId, onError, onStatusChange])

  return <>{children}</>
}
