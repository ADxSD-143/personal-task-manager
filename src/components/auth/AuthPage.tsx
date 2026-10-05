import { useState } from 'react'
import type { FormEvent } from 'react'
import { LockKeyhole, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Field, TextInput } from '@/components/ui/Field'
import { supabase } from '@/lib/supabase'

export function AuthPage({ initialError = '' }: { initialError?: string }) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
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
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
        })
        if (authError) throw authError
        if (!data.session) setNotice('Check your email to confirm your account, then sign in here.')
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
            {mode === 'sign-in' ? 'Sign in to your account' : 'Create your account'}
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
            {error ? <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
            {notice ? <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}
            <Button className="w-full" type="submit" disabled={busy}>
              <LockKeyhole className="h-4 w-4" />
              {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
            {mode === 'sign-in' ? 'New here?' : 'Already have an account?'}{' '}
            <button
              type="button"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              onClick={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
                setError('')
                setNotice('')
              }}
            >
              {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </CardBody>
      </Card>
    </main>
  )
}
