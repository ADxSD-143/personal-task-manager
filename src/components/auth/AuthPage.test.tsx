import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(async () => ({ error: null })),
  signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { auth },
  supabaseConfigured: true,
}))

import { AuthPage } from '@/components/auth/AuthPage'

describe('email authentication', () => {
  beforeEach(() => {
    auth.signInWithPassword.mockClear()
    auth.signUp.mockClear()
    auth.resetPasswordForEmail.mockClear()
  })

  it('signs in with the submitted email and password', async () => {
    const user = userEvent.setup()
    render(<AuthPage />)
    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'correct-horse',
    })
  })

  it('creates an account and handles email confirmation', async () => {
    const user = userEvent.setup()
    render(<AuthPage />)
    await user.click(screen.getByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.com',
      password: 'correct-horse',
      options: { emailRedirectTo: expect.stringContaining('/') },
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('Check your email')
  })

  it('sends password recovery without revealing whether an account exists', async () => {
    const user = userEvent.setup()
    render(<AuthPage />)
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'person@example.com',
      { redirectTo: expect.stringContaining('/') }
    )
    expect(await screen.findByRole('status')).toHaveTextContent('If an account exists')
  })
})
