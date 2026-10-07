import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { RealtimePostgresChangesPayload, Session } from '@supabase/supabase-js'
import { AuthPage, PasswordUpdatePage } from '@/components/auth/AuthPage'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { mergeData, parseImport, pickData } from '@/lib/exportImport'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import type { DataState } from '@/types'

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'offline' | 'error' | 'migration' | 'conflict'

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

export const useOptionalCloudSync = (): CloudContextValue | null => useContext(CloudContext)

export function CloudSyncProvider({ children }: PropsWithChildren) {
  const authClient = supabase
  const [session, setSession] = useState<Session | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
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
    }).catch((error: unknown) => {
      if (!active) return
      setAuthError(error instanceof Error ? error.message : 'Could not restore your session.')
      setAuthLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
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

  if (!supabaseConfigured || !authClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Cloud sync needs setup</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as GitHub Actions secrets and redeploy.
            See README.md for setup instructions.
          </p>
        </div>
      </div>
    )
  }

  if (authLoading) {
    return <div className="p-8 text-center text-sm text-slate-500" role="status">Restoring your account…</div>
  }

  if (authError && !session) return <AuthPage initialError={authError} />
  if (!session) return <AuthPage />
  if (passwordRecovery || window.location.hash.includes('type=recovery')) {
    return <PasswordUpdatePage onUpdated={() => setPasswordRecovery(false)} />
  }

  return (
    <CloudContext.Provider
      value={{
        email: session.user.email ?? '',
        status,
        error: syncError,
        signOut: async () => {
          const { error } = await authClient.auth.signOut()
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

type SyncGate =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'local-migration'; localData: DataState }
  | { kind: 'local-cloud-conflict'; localData: DataState; cloudData: DataState; cloudUpdatedAt: string }
  | { kind: 'error'; message: string }

interface SyncActions {
  migrate: (data: DataState) => Promise<void>
  resolveConflict: (
    choice: 'cloud' | 'merge',
    localData: DataState,
    cloudData: DataState,
    cloudUpdatedAt: string
  ) => Promise<void>
  cancelMigration: () => Promise<void>
  retry: () => Promise<void>
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
  const [gate, setGate] = useState<SyncGate>({ kind: 'loading' })
  const [actions, setActions] = useState<SyncActions | null>(null)
  const client = supabase

  const readData = useCallback((value: unknown): DataState | null => {
    const serialized = JSON.stringify(value)
    if (typeof serialized !== 'string') return null
    const parsed = parseImport(serialized)
    return parsed.ok ? parsed.data : null
  }, [])

  useEffect(() => {
    if (!client) return

    let cancelled = false
    let hydrated = false
    let applyingCloudData = false
    let dirty = false
    let loadInProgress = false
    let channelReady = false
    let reloadAfterSubscription = false
    let saveTimer: ReturnType<typeof setTimeout> | undefined
    let latestSnapshot = ''
    let cloudUpdatedAt: string | null = null
    let writeChain = Promise.resolve()

    const fail = (message: string) => {
      if (cancelled) return
      onError(message)
      onStatusChange('error')
      setGate({ kind: 'error', message })
    }

    const applyCloudData = (data: DataState) => {
      latestSnapshot = JSON.stringify(pickData(data))
      dirty = false
      applyingCloudData = true
      useStore.setState(data)
      applyingCloudData = false
    }

    const getLocalData = (): { data: DataState; persisted: boolean } => {
      const currentData = pickData(useStore.getState())
      try {
        const raw = window.localStorage.getItem('personal-os-v1')
        if (!raw) return { data: currentData, persisted: false }
        const persisted = JSON.parse(raw) as { state?: unknown }
        const data = readData(persisted.state)
        if (!data) throw new Error('The browser cache is not a valid Personal OS data snapshot.')
        return { data, persisted: true }
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? `Could not read the browser cache safely: ${error.message}`
            : 'Could not read the browser cache safely.'
        )
      }
    }

    const localHasRecords = (data: DataState) =>
      data.tasks.length + data.habits.length + data.courses.length + data.studySessions.length +
      data.leetcode.length + data.cp.length + data.github.length + data.projects.length + data.goals.length > 0

    const saveWithVersion = async (snapshot: DataState, expectedUpdatedAt: string | null) => {
      const { data, error } = await client.rpc('save_user_data', {
        p_data: snapshot,
        p_expected_updated_at: expectedUpdatedAt,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row || typeof row !== 'object' || !('saved' in row)) {
        throw new Error('Supabase returned an invalid sync response.')
      }
      return row as { saved: boolean; data: unknown; updated_at: string | null }
    }

    const persistSnapshot = (snapshot: DataState, initialInsert = false) => {
      const serialized = JSON.stringify(snapshot)
      latestSnapshot = serialized
      writeChain = writeChain.then(async () => {
        if (cancelled || !navigator.onLine) return
        onStatusChange('saving')
        const result = await saveWithVersion(snapshot, cloudUpdatedAt)
        if (!result.saved) {
          const { data: remoteRow, error } = await client
            .from('user_data')
            .select('data, updated_at')
            .eq('user_id', userId)
            .maybeSingle()
          if (error) throw error
          if (!remoteRow || typeof remoteRow.updated_at !== 'string') {
            throw new Error('Cloud data changed while syncing. Reload and try again.')
          }
          const remoteData = readData(remoteRow.data)
          if (!remoteData) throw new Error('Cloud data has an invalid format.')
          resolveRemoteData(remoteData, remoteRow.updated_at)
          return
        }
        cloudUpdatedAt = result.updated_at
        if (!cancelled && serialized === latestSnapshot) {
          dirty = false
          onError('')
          onStatusChange('synced')
          if (initialInsert) setGate({ kind: 'ready' })
        }
      }).catch((error: unknown) => {
        fail(error instanceof Error ? error.message : 'Could not save data to cloud.')
      })
    }

    const resolveRemoteData = (data: DataState, updatedAt: string) => {
      cloudUpdatedAt = updatedAt
      const currentData = pickData(useStore.getState())
      if (JSON.stringify(currentData) === JSON.stringify(pickData(data))) {
        latestSnapshot = JSON.stringify(pickData(data))
        dirty = false
        setGate({ kind: 'ready' })
        onError('')
        onStatusChange(navigator.onLine ? 'synced' : 'offline')
        return
      }
      if (dirty) {
        setGate({ kind: 'local-cloud-conflict', localData: currentData, cloudData: data, cloudUpdatedAt: updatedAt })
        onStatusChange('conflict')
        return
      }
      applyCloudData(data)
      setGate({ kind: 'ready' })
      onError('')
      onStatusChange(navigator.onLine ? 'synced' : 'offline')
    }

    const loadCloudData = async () => {
      if (loadInProgress || cancelled) return
      loadInProgress = true
      onStatusChange('loading')
      setGate({ kind: 'loading' })
      try {
        const { data: row, error } = await client
          .from('user_data')
          .select('data, updated_at')
          .eq('user_id', userId)
          .maybeSingle()
        if (cancelled) return
        if (error) throw error

        if (row) {
          const cloudData = readData(row.data)
          if (!cloudData) throw new Error('Cloud data has an invalid format and could not be loaded.')
          const local = getLocalData()
          const updatedAt = row.updated_at as string
          cloudUpdatedAt = updatedAt
          const cloudSnapshot = JSON.stringify(pickData(cloudData))
          if (local.persisted && localHasRecords(local.data) && JSON.stringify(pickData(local.data)) !== cloudSnapshot) {
            setGate({ kind: 'local-cloud-conflict', localData: local.data, cloudData, cloudUpdatedAt: updatedAt })
            onStatusChange('conflict')
          } else {
            applyCloudData(cloudData)
            hydrated = true
            setGate({ kind: 'ready' })
            onError('')
            onStatusChange('synced')
          }
        } else {
          const local = getLocalData()
          if (local.persisted && localHasRecords(local.data)) {
            setGate({ kind: 'local-migration', localData: local.data })
            onStatusChange('migration')
          } else {
            cloudUpdatedAt = null
            const starterData = pickData(useStore.getState())
            applyCloudData(starterData)
            hydrated = true
            persistSnapshot(starterData, true)
          }
        }
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Could not load data from cloud.'
        if (!navigator.onLine) {
          hydrated = true
          dirty = false
          setGate({ kind: 'ready' })
          onError('')
          onStatusChange('offline')
        } else {
          fail(message)
        }
      } finally {
        loadInProgress = false
        if (channelReady && reloadAfterSubscription && !cancelled) {
          reloadAfterSubscription = false
          void loadCloudData()
        }
      }
    }

    const scheduleSave = (snapshot: DataState) => {
      if (!hydrated) return
      dirty = true
      if (!navigator.onLine) {
        onStatusChange('offline')
        return
      }
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => persistSnapshot(snapshot), 450)
    }

    const unsubscribe = useStore.subscribe((state, previous) => {
      if (!hydrated || applyingCloudData) return
      const nextData = pickData(state)
      if (JSON.stringify(nextData) !== JSON.stringify(pickData(previous))) scheduleSave(nextData)
    })

    const handleRemoteChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (!hydrated) return
      if (payload.eventType === 'DELETE') {
        void loadCloudData()
        return
      }
      if (!payload.new || typeof payload.new !== 'object') return
      const remote = readData((payload.new as Record<string, unknown>).data)
      if (!remote) {
        fail('Received invalid cloud data from Supabase.')
        return
      }
      const updatedAt = (payload.new as Record<string, unknown>).updated_at
      if (typeof updatedAt !== 'string') {
        fail('Received cloud data without an update timestamp.')
        return
      }
      if (JSON.stringify(pickData(remote)) === latestSnapshot) {
        cloudUpdatedAt = updatedAt
        return
      }
      resolveRemoteData(remote, updatedAt)
    }

    const channel = client
      .channel(`user-data-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` },
        handleRemoteChange
      )
      .subscribe((state) => {
        if (state !== 'SUBSCRIBED') return
        channelReady = true
        if (loadInProgress) reloadAfterSubscription = true
        else void loadCloudData()
      })

    const handleOnline = () => {
      if (!hydrated) void loadCloudData()
      else if (dirty) void loadCloudData()
      else onStatusChange('synced')
    }
    const handleOffline = () => onStatusChange('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    void loadCloudData()

    const resolveMigration = async (localData: DataState) => {
      setGate({ kind: 'loading' })
      try {
        const result = await saveWithVersion(localData, null)
        if (!result.saved) {
          const { data: row, error } = await client
            .from('user_data')
            .select('data, updated_at')
            .eq('user_id', userId)
            .maybeSingle()
          if (error) throw error
          if (!row || typeof row.updated_at !== 'string') throw new Error('Cloud data changed during migration; retry.')
          const cloudData = readData(row.data)
          if (!cloudData) throw new Error('Cloud data has an invalid format.')
          dirty = true
          setGate({ kind: 'local-cloud-conflict', localData, cloudData, cloudUpdatedAt: row.updated_at })
          onStatusChange('conflict')
          return
        }
        cloudUpdatedAt = result.updated_at
        applyCloudData(localData)
        hydrated = true
        setGate({ kind: 'ready' })
        onError('')
        onStatusChange('synced')
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Could not migrate local data.')
      }
    }

    const resolveConflict = async (
      choice: 'cloud' | 'merge',
      localData: DataState,
      cloudData: DataState,
      expectedUpdatedAt: string
    ) => {
      const chosenData = choice === 'cloud' ? cloudData : mergeData(cloudData, localData)
      if (choice === 'cloud') {
        try {
          window.localStorage.setItem(`personal-os-pre-cloud-${userId}`, JSON.stringify(localData))
        } catch {
          onError('Could not save a browser backup of the local data; it has not been changed.')
          return
        }
        try {
          const { data: row, error } = await client
            .from('user_data')
            .select('data, updated_at')
            .eq('user_id', userId)
            .maybeSingle()
          if (error) throw error
          if (!row || typeof row.updated_at !== 'string') {
            throw new Error('Cloud data changed while resolving the conflict; retry.')
          }
          if (row.updated_at !== expectedUpdatedAt) {
            const currentCloudData = readData(row.data)
            if (!currentCloudData) throw new Error('Cloud data has an invalid format.')
            setGate({
              kind: 'local-cloud-conflict',
              localData,
              cloudData: currentCloudData,
              cloudUpdatedAt: row.updated_at,
            })
            onStatusChange('conflict')
            return
          }
          cloudUpdatedAt = row.updated_at
        } catch (error) {
          fail(error instanceof Error ? error.message : 'Could not verify the current cloud version.')
          return
        }
      }
      if (choice === 'merge') {
        setGate({ kind: 'loading' })
        try {
          dirty = true
          const result = await saveWithVersion(chosenData, expectedUpdatedAt)
          if (!result.saved) {
            const { data: row, error } = await client
              .from('user_data')
              .select('data, updated_at')
              .eq('user_id', userId)
              .maybeSingle()
            if (error) throw error
            if (!row || typeof row.updated_at !== 'string') {
              throw new Error('Cloud data changed while resolving the conflict; retry.')
            }
            const currentCloudData = readData(row.data)
            if (!currentCloudData) throw new Error('Cloud data has an invalid format.')
            setGate({
              kind: 'local-cloud-conflict',
              localData,
              cloudData: currentCloudData,
              cloudUpdatedAt: row.updated_at,
            })
            onStatusChange('conflict')
            return
          }
          cloudUpdatedAt = result.updated_at
        } catch (error) {
          fail(error instanceof Error ? error.message : 'Could not merge local and cloud data.')
          return
        }
      }
      applyCloudData(chosenData)
      hydrated = true
      setGate({ kind: 'ready' })
      onError('')
      onStatusChange('synced')
    }

    const signOutWithoutMigration = async () => {
      const { error } = await client.auth.signOut()
      if (error) fail(error.message)
    }

    setActions({
      migrate: resolveMigration,
      resolveConflict,
      cancelMigration: signOutWithoutMigration,
      retry: loadCloudData,
    })

    return () => {
      cancelled = true
      if (saveTimer) clearTimeout(saveTimer)
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      void client.removeChannel(channel)
    }
  }, [client, onError, onStatusChange, readData, userId])

  if (gate.kind === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">Loading your data from the cloud…</p>
      </div>
    )
  }

  if (gate.kind === 'local-migration') {
    return (
      <DecisionCard
        title="Local data found"
        description="This browser has saved Personal OS data, but your account has no cloud data yet. Nothing will be uploaded unless you choose to."
        primaryLabel="Upload & Sync"
        secondaryLabel="Cancel"
        onPrimary={() => {
            if (actions) void actions.migrate(gate.localData)
          }}
          onSecondary={() => {
            if (actions) void actions.cancelMigration()
          }}
        />
    )
  }

  if (gate.kind === 'local-cloud-conflict') {
    return (
      <DecisionCard
        title="Local and cloud data differ"
        description="Cloud data is authoritative. Choose to use it (the browser copy is backed up first) or merge local-only records into the cloud. For matching IDs, cloud records are kept."
        primaryLabel="Use cloud data"
        secondaryLabel="Merge local data"
        onPrimary={() => {
          if (actions) void actions.resolveConflict('cloud', gate.localData, gate.cloudData, gate.cloudUpdatedAt)
        }}
        onSecondary={() => {
          if (actions) void actions.resolveConflict('merge', gate.localData, gate.cloudData, gate.cloudUpdatedAt)
        }}
      />
    )
  }

  if (gate.kind === 'error') {
    return (
      <DecisionCard
        title="Could not load your cloud data"
        description={`${gate.message} Your cached data has not been uploaded or replaced.`}
        primaryLabel="Retry"
        onPrimary={() => {
          if (actions) void actions.retry()
        }}
      />
    )
  }

  return <>{children}</>
}

function DecisionCard({
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  title: string
  description: string
  primaryLabel: string
  secondaryLabel?: string
  onPrimary: () => void
  onSecondary?: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-lg">
        <CardBody className="space-y-4 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
          <div className="flex flex-wrap justify-end gap-2">
            {secondaryLabel && onSecondary ? (
              <Button variant="outline" onClick={onSecondary}>{secondaryLabel}</Button>
            ) : null}
            <Button onClick={onPrimary}>{primaryLabel}</Button>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
