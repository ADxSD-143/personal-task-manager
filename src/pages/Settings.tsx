import { AlertTriangle, Check, Cloud, Database, Download, LogOut, Monitor, Moon, RotateCcw, Sun, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { useOptionalCloudSync } from '@/components/auth/CloudSyncProvider'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { createExport, downloadBundle, parseImport, pickData } from '@/lib/exportImport'
import { useStore } from '@/store/useStore'
import type { DataState, Theme } from '@/types'

interface PendingImport {
  data: DataState
  warnings: string[]
}

export default function Settings() {
  const cloud = useOptionalCloudSync()
  const store = useStore()
  const setProfile = useStore((state) => state.setProfile)
  const setSettings = useStore((state) => state.setSettings)
  const importData = useStore((state) => state.importData)
  const resetAll = useStore((state) => state.resetAll)
  const clearAll = useStore((state) => state.clearAll)

  const [name, setName] = useState(store.profile.name)
  const [tagline, setTagline] = useState(store.profile.tagline)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [importError, setImportError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [accountError, setAccountError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const data = pickData(store)
  const counts = [
    { label: 'Tasks', value: data.tasks.length },
    { label: 'Habits', value: data.habits.length },
    { label: 'Courses', value: data.courses.length },
    { label: 'Days', value: data.courses.reduce((sum, course) => sum + course.days.length, 0) },
    { label: 'Videos', value: data.courses.reduce((sum, c) => sum + c.days.reduce((s, d) => s + d.videos.length, 0), 0) },
    { label: 'Code files', value: data.courses.reduce((sum, c) => sum + c.days.reduce((s, d) => s + d.codeFiles.length, 0), 0) },
    { label: 'Study sessions', value: data.studySessions.length },
    { label: 'Workouts', value: data.workouts.length },
    { label: 'Notes', value: data.notes.length },
    { label: 'LeetCode', value: data.leetcode.length },
    { label: 'CP problems', value: data.cp.length },
    { label: 'Contributions', value: data.github.length },
    { label: 'Projects', value: data.projects.length },
    { label: 'Goals', value: data.goals.length },
  ]

  const storageBytes = (() => {
    try {
      const raw = window.localStorage.getItem('personal-os-v1')
      return raw ? new Blob([raw]).size : 0
    } catch {
      return 0
    }
  })()

  const totalRecords = counts.reduce((sum, row) => sum + row.value, 0)

  const handleExport = () => {
    downloadBundle(createExport(data))
  }

  const handleFile = async (file: File) => {
    setImportError('')
    const text = await file.text()
    const result = parseImport(text)
    if (!result.ok) {
      setImportError(result.error)
      return
    }
    setPending({ data: result.data, warnings: result.warnings })
  }

  const themeOptions: Array<{ value: Theme; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]

  const pendingCounts = pending
    ? [
        { label: 'tasks', value: pending.data.tasks.length },
        { label: 'habits', value: pending.data.habits.length },
        { label: 'courses', value: pending.data.courses.length },
        { label: 'study sessions', value: pending.data.studySessions.length },
        { label: 'practice records', value: pending.data.leetcode.length + pending.data.cp.length },
        { label: 'projects', value: pending.data.projects.length },
        { label: 'goals', value: pending.data.goals.length },
      ]
    : []

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Personal profile, appearance and your data." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" description="Shown in the sidebar and on the dashboard" />
          <CardBody className="space-y-4">
            <Field label="Name">
              <TextInput
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setSaved(false)
                }}
                placeholder="Your name"
              />
            </Field>
            <Field label="Tagline">
              <TextInput
                value={tagline}
                onChange={(event) => {
                  setTagline(event.target.value)
                  setSaved(false)
                }}
                placeholder="Learn · Build · Track"
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setProfile({ name: name.trim() || 'My Personal OS', tagline: tagline.trim() })
                  setSaved(true)
                }}
              >
                Save profile
              </Button>
              {saved ? <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span> : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Appearance" description="Theme is applied instantly and remembered" />
          <CardBody className="space-y-4">
            <div>
              <p className="label">Theme</p>
              <SegmentedControl ariaLabel="Theme" value={store.settings.theme} onChange={(value) => setSettings({ theme: value })} options={themeOptions} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5" /> Light
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5" /> Dark
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" /> Follows your OS
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="label">Local backup</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalRecords} records · {(storageBytes / 1024).toFixed(1)} KB cached in this browser; cloud sync is enabled
              </p>
            </div>
          </CardBody>
        </Card>

        {cloud ? <Card>
          <CardHeader title="Cloud sync" description="Your account keeps this data in sync across devices" />
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <Cloud className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span className="min-w-0 flex-1 truncate">{cloud.email}</span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                {cloud.status === 'synced' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
                {cloud.status === 'synced' ? 'Synced' : cloud.status === 'saving' ? 'Saving…' : cloud.status === 'loading' ? 'Loading…' : cloud.status === 'offline' ? 'Offline' : cloud.status === 'migration' ? 'Needs migration' : cloud.status === 'conflict' ? 'Resolve conflict' : 'Sync error'}
              </span>
            </div>
            {cloud.error ? <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{cloud.error}</p> : null}
            {accountError ? <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{accountError}</p> : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAccountError('')
                void cloud?.signOut().catch((error: unknown) => {
                  setAccountError(error instanceof Error ? error.message : 'Could not sign out.')
                })
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </CardBody>
        </Card> : null}
      </div>

      <Card>
        <CardHeader title="Records" description="Everything currently stored" />
        <CardBody>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {counts.map((row) => (
              <div key={row.label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{row.label}</p>
                <p className="text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-100">{row.value}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Backup" description="Export everything to a JSON file, or restore from one" />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport}>
              <Download className="h-4 w-4" /> Export data
            </Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload className="h-4 w-4" /> Import data
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (file) await handleFile(file)
                event.target.value = ''
              }}
            />
          </div>
          {importError ? (
            <p className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" /> {importError}
            </p>
          ) : null}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Imports are validated before anything is written. You can replace everything or merge — merging keeps
            records whose ids already exist.
          </p>
        </CardBody>
      </Card>

      <Card className="border-rose-200 dark:border-rose-500/30">
        <CardHeader title="Danger zone" description="These actions cannot be undone" />
        <CardBody className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-4 w-4" /> Reset to sample data
          </Button>
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-4 w-4" /> Delete all data
          </Button>
          <span className="inline-flex items-center gap-1.5 self-center text-xs text-slate-500 dark:text-slate-400">
            <Database className="h-3.5 w-3.5" /> Changes sync to your signed-in account
          </span>
        </CardBody>
      </Card>

      <Modal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Import data"
        description="Review what was found in the file before restoring."
        footer={
          <>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (pending) importData(pending.data, 'merge')
                setPending(null)
              }}
            >
              Merge
            </Button>
            <Button
              onClick={() => {
                if (pending) importData(pending.data, 'replace')
                setPending(null)
              }}
            >
              Replace everything
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {pendingCounts.map((row) => (
              <Badge key={row.label} tone="slate">
                {row.value} {row.label}
              </Badge>
            ))}
          </div>
          {pending?.warnings.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <p className="mb-1 font-medium">Warnings</p>
              <ul className="list-inside list-disc space-y-0.5">
                {pending.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No problems were found. Choose how you want to apply this file.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmReset}
        title="Reset to sample data"
        message="Your current data will be replaced with the starter tasks, habits and the Machine Learning course."
        confirmLabel="Reset"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll()
          setConfirmReset(false)
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Delete all data"
        message="Every task, habit, course, session and record will be permanently deleted from this browser."
        confirmLabel="Delete everything"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAll()
          setConfirmClear(false)
        }}
      />
    </div>
  )
}
