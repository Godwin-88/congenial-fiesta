'use client'

import { useEffect, useState } from 'react'
import {
  UserCog,
  KeyRound,
  Mail,
  ShieldCheck,
  BadgeCheck,
  LogIn,
  History,
  AlertTriangle,
} from 'lucide-react'
import { useAdmin } from '@/context/AdminContext'

interface MeView {
  id: string
  displayName: string
  role: string
  email: string | null
  emailConfirmedAt: string | null
  lastSignInAt: string | null
  createdAt: string | null
  providers: string[]
  hasPassword: boolean
}

interface TeamView {
  id: string
  display_name: string
  role: string
  email?: string
  created_at: string
}

interface AuditView {
  id: number
  action: string
  target_email: string | null
  admin_email: string | null
  created_at: string
}

interface AccountData {
  me: MeView
  team: TeamView[]
  audit: AuditView[]
}

const ACTION_LABELS: Record<string, string> = {
  change_password: 'Changed own password',
  change_email: 'Changed own email',
  reset_password: 'Password reset by owner',
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

export function AccountPanel({ notify }: { notify: (m: string, t?: 'success' | 'error') => void }) {
  const { isOwner } = useAdmin()
  const [data, setData] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)

  // Change-password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Change-email form
  const [newEmail, setNewEmail] = useState('')
  const [emailNote, setEmailNote] = useState<string | null>(null)

  // Owner: reset another admin's password
  const [targetId, setTargetId] = useState('')
  const [resetPass, setResetPass] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')

  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/account')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setEmailNote(null)
      } else {
        notify('Failed to load account info', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      notify('New password must be at least 8 characters.', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      notify('New passwords do not match.', 'error')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-password', currentPassword, newPassword }),
      })
      const json = await res.json()
      if (res.ok) {
        notify('Password updated. Please use it on your next sign-in.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        await load()
      } else {
        notify(json.error ?? 'Password change failed.', 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      notify('Please enter a valid email address.', 'error')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-email', newEmail }),
      })
      const json = await res.json()
      if (res.ok) {
        notify(json.message ?? 'Email change requested.')
        setEmailNote(json.message ?? null)
        setNewEmail('')
        await load()
      } else {
        notify(json.error ?? 'Email change failed.', 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetId) {
      notify('Select a team member first.', 'error')
      return
    }
    if (resetPass.length < 8) {
      notify('New password must be at least 8 characters.', 'error')
      return
    }
    if (resetPass !== resetConfirm) {
      notify('New passwords do not match.', 'error')
      return
    }
    if (!window.confirm('Forcibly reset this member\u2019s password? They will need the new password on their next sign-in.')) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', targetAdminId: targetId, newPassword: resetPass }),
      })
      const json = await res.json()
      if (res.ok) {
        notify('Password reset saved + audit logged.')
        setTargetId('')
        setResetPass('')
        setResetConfirm('')
        await load()
      } else {
        notify(json.error ?? 'Reset failed.', 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
        <span className="text-sm text-muted-foreground">Loading account & security…</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
        <span className="text-sm text-muted-foreground">Couldn&apos;t load account info.</span>
      </div>
    )
  }

  const { me, team, audit } = data
  const passwordProvider = Array.isArray(me.providers) && me.providers.includes('email')

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* My account summary */}
      <section className="rounded-lg border-2 border-border bg-background/50 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <UserCog size={18} className="text-brand-primary" />
          My account
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Sign-in email</dt>
            <dd className="text-right font-medium text-foreground">{me.email ?? '—'}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Email confirmed</dt>
            <dd>
              {me.emailConfirmedAt ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck size={14} /> Confirmed
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">Pending</span>
              )}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="font-medium capitalize text-foreground">{me.role}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Password</dt>
            <dd className="text-foreground">{passwordProvider ? 'Password set' : 'Magic link only'}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Last sign-in</dt>
            <dd className="text-right text-muted-foreground">{fmtDateTime(me.lastSignInAt)}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="text-right text-muted-foreground">{fmtDateTime(me.createdAt)}</dd>
          </div>
        </dl>
      </section>
      {/* Change password */}
      <section className="rounded-lg border-2 border-border bg-background/50 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <KeyRound size={18} className="text-brand-primary" />
          Change my password
        </h2>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              {passwordProvider
                ? 'Current password'
                : 'Current password (leave blank if you use magic link)'}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-brand-primary/30 focus:ring-2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Min 8 characters"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-brand-primary/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Repeat password"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-brand-primary/30 focus:ring-2"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/80 disabled:opacity-40"
          >
            <KeyRound size={15} />
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
      {/* Change email */}
      <section className="rounded-lg border-2 border-border bg-background/50 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Mail size={18} className="text-brand-primary" />
          Change my email
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          A confirmation email is sent to the new address. Your sign-in email only changes once confirmed.
        </p>
        <form onSubmit={changeEmail} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">New email address</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-brand-primary/30 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/80 disabled:opacity-40"
          >
            <Mail size={15} />
            {busy ? 'Saving…' : 'Request email change'}
          </button>
          {emailNote && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
              {emailNote}
            </p>
          )}
        </form>
      </section>
{/* Owner: reset another admin's password */}
      <section className="rounded-lg border-2 border-border bg-background/50 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
          <ShieldCheck size={18} className="text-brand-primary" />
          Team security
          {!isOwner && <span className="text-xs font-normal text-muted-foreground">(owner only)</span>}
        </h2>
        {!isOwner ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            Only the owner can reset another team member&apos;s password.
          </div>
        ) : (
          <form onSubmit={resetPassword} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Team member</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-brand-primary/30 focus:ring-2"
              >
                <option value="">Select a team member…</option>
                {team
                  .filter((m) => m.id !== me.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name} ({m.role}){m.email ? ` — ${m.email}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">New password</label>
                <input
                  type="password"
                  value={resetPass}
                  onChange={(e) => setResetPass(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-brand-primary/30 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Confirm password</label>
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-brand-primary/30 focus:ring-2"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-40 dark:text-red-400"
            >
              <ShieldCheck size={15} />
              {busy ? 'Resetting…' : 'Force reset password'}
            </button>
          </form>
        )}
      </section>
{/* Team roster */}
      <section className="rounded-lg border-2 border-border bg-background/50 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <LogIn size={18} className="text-brand-primary" />
          Team roster
        </h2>
        <ul className="divide-y divide-border text-sm">
          {team.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {m.display_name}
                  {m.id === me.id && <span className="text-muted-foreground"> (you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email ?? '—'}</p>
              </div>
              <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent account-security activity */}
      <section className="rounded-lg border-2 border-border bg-background/50 p-5 lg:col-span-2">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <History size={18} className="text-brand-primary" />
          Recent account-security activity
        </h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No password or email changes recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <span className="font-medium text-foreground">{ACTION_LABELS[a.action] ?? a.action}</span>
                  <span className="ml-2 text-muted-foreground">
                    {a.target_email ? `→ ${a.target_email}` : ''}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {fmtDateTime(a.created_at)} · {a.admin_email ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}