import { useState } from 'react'
import type { FormEvent } from 'react'
import { LockKeyhole, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Field, TextInput } from '@/components/ui/Field'
import { supabase } from '@/lib/supabase'

type AuthMode = 'sign-in' | 'sign-up' | 'reset-password'

export function AuthPage({ initialError = '' }: { initialError?: string }) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      setError('Cloud sync is not configured. Check the project environment settings.')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'sign-in') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
      } else if (mode === 'sign-up') {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
        })
        if (authError) throw authError
        if (!data.session) setNotice('Check your email to confirm your account, then sign in here.')
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        })
        if (authError) throw authError
        setNotice('If an account exists for that email, a password reset link has been sent.')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <CardBody className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Personal OS</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your tasks and daily progress, synced.</p>
            </div>
          </div>

          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {mode === 'sign-in' ? 'Sign in to your account' : mode === 'sign-up' ? 'Create your account' : 'Reset your password'}
          </h2>
          <form className="mt-4 space-y-4" onSubmit={submit}>
            <Field label="Email">
              <TextInput
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            {mode !== 'reset-password' ? (
              <Field label="Password">
                <TextInput
                  type="password"
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
            ) : null}
            {error ? <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
            {notice ? <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}
            <Button className="w-full" type="submit" disabled={busy}>
              <LockKeyhole className="h-4 w-4" />
              {busy
                ? 'Please wait…'
                : mode === 'sign-in'
                  ? 'Sign in'
                  : mode === 'sign-up'
                    ? 'Create account'
                    : 'Send reset link'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
            {mode === 'sign-in' ? 'New here?' : mode === 'sign-up' ? 'Already have an account?' : 'Remembered it?'}{' '}
            <button
              type="button"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              onClick={() => {
                setMode(mode === 'sign-up' || mode === 'reset-password' ? 'sign-in' : 'sign-up')
                setError('')
                setNotice('')
              }}
            >
              {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          {mode === 'sign-in' ? (
            <button
              type="button"
              className="mt-3 block w-full text-center text-xs text-slate-500 hover:underline dark:text-slate-400"
              onClick={() => {
                setMode('reset-password')
                setError('')
                setNotice('')
              }}
            >
              Forgot password?
            </button>
          ) : null}
        </CardBody>
      </Card>
    </main>
  )
}

export function PasswordUpdatePage({ onUpdated }: { onUpdated: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      setError('Cloud sync is not configured.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSaved(true)
      window.history.replaceState({}, document.title, window.location.pathname)
      onUpdated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Choose a new password</h1>
          {saved ? (
            <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
              Password updated. You can now continue using Personal OS.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <Field label="New password">
                <TextInput
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              {error ? <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
              <Button className="w-full" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Update password'}
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </main>
  )
}
