import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Shield,
  User as UserIcon,
  XCircle,
} from 'lucide-react'
import { createUser, listUsers, type CreateUserInput } from '../lib/api'

export default function Users() {
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [formError, setFormError] = useState<string | null>(null)

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      setDisplayName('')
      setEmail('')
      setRole('user')
      setFormError(null)
      setShowCreateForm(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.error || 'Failed to create user')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!displayName.trim()) {
      setFormError('Display name is required')
      return
    }

    const input: CreateUserInput = {
      displayName: displayName.trim(),
      role,
    }

    if (email.trim()) {
      input.email = email.trim()
    }

    createMutation.mutate(input)
  }

  const users = usersQuery.data ?? []

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Users</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage app users and their access permissions
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
              disabled={usersQuery.isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={['h-4 w-4', usersQuery.isFetching && 'animate-spin'].join(' ')} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Create User
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">New User</h2>
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Display Name
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="John Doe"
                    required
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email (optional)
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="john@example.com"
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Role
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormError(null)
                  }}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Create
                </button>
              </div>
              {formError && (
                <div className="sm:col-span-2">
                  <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <p className="text-sm text-rose-700">{formError}</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-950">All Users</h2>
            <p className="mt-0.5 text-sm text-slate-600">{users.length} total users</p>
          </div>

          {usersQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading users...</div>
          ) : usersQuery.isError ? (
            <div className="p-8">
              <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <h3 className="text-sm font-semibold text-rose-900">Failed to load users</h3>
                  <p className="mt-1 text-sm text-rose-700">
                    Could not fetch users from backend. Make sure you are logged in.
                  </p>
                </div>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <UserIcon className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-sm font-semibold text-slate-950">No users yet</h3>
              <p className="mt-1 text-sm text-slate-600">
                Create your first user to get started with access management.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Create User
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
                            <UserIcon className="h-4 w-4 text-slate-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-950">{user.displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{user.email || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold',
                            user.role === 'admin'
                              ? 'border-purple-200 bg-purple-50 text-purple-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600',
                          ].join(' ')}
                        >
                          {user.role === 'admin' && <Shield className="h-3 w-3" />}
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.disabled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                            <XCircle className="h-3 w-3" />
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">User Management Notes</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• Users can be assigned admin or user roles</li>
            <li>• Admin users have full access to all dashboard features</li>
            <li>• User contacts (WhatsApp, email) are managed separately per user</li>
            <li>• Navigate to WhatsApp Access screen to manage Nara Bot allowlist</li>
            <li>• Disabling a user prevents login but preserves their data</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
