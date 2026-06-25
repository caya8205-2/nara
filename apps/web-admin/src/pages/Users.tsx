import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  User as UserIcon,
  XCircle,
} from 'lucide-react'
import { createUser, listUsers, type CreateUserInput } from '../lib/api'
import {
  AdminButton,
  EmptyState,
  InlineNotice,
  MetricTile,
  PageHeader,
  Panel,
  PanelHeader,
  StatusBadge,
} from '../components/admin-ui'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response
    return response?.data?.error ?? fallback
  }
  return fallback
}

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

  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      setDisplayName('')
      setEmail('')
      setRole('user')
      setFormError(null)
      setShowCreateForm(false)
      refreshUsers()
    },
    onError: (error: unknown) => {
      setFormError(getErrorMessage(error, 'Failed to create user'))
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (!displayName.trim()) {
      setFormError('Display name is required')
      return
    }

    const input: CreateUserInput = {
      displayName: displayName.trim(),
      role,
    }

    if (email.trim()) input.email = email.trim()

    createMutation.mutate(input)
  }

  const users = usersQuery.data ?? []
  const adminCount = users.filter((user) => user.role === 'admin').length
  const disabledCount = users.filter((user) => user.disabled).length
  const activeCount = users.length - disabledCount

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Users"
          description="Create app users, review roles, and keep access state visible for operator handoff."
          actions={
            <>
              <AdminButton variant="secondary" onClick={refreshUsers} disabled={usersQuery.isFetching}>
                <RefreshCw className={['h-4 w-4', usersQuery.isFetching && 'animate-spin'].filter(Boolean).join(' ')} />
                Refresh
              </AdminButton>
              <AdminButton onClick={() => setShowCreateForm((value) => !value)}>
                <Plus className="h-4 w-4" />
                Create User
              </AdminButton>
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <MetricTile label="Total Users" value={users.length} description={`${activeCount} active`} icon={UserIcon} tone="neutral" />
          <MetricTile label="Admins" value={adminCount} description="Operator-level accounts" icon={Shield} tone={adminCount > 0 ? 'success' : 'warning'} />
          <MetricTile label="Disabled" value={disabledCount} description="Accounts blocked from login" icon={XCircle} tone={disabledCount > 0 ? 'warning' : 'success'} />
        </div>

        {showCreateForm && (
          <Panel className="mt-5">
            <PanelHeader title="New User" description="Create a Nara app user record." />
            <form onSubmit={handleSubmit} className="grid gap-4 p-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Display Name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="John Doe"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="john@example.com"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as 'user' | 'admin')}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div className="flex items-end gap-2">
                <AdminButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormError(null)
                  }}
                >
                  Cancel
                </AdminButton>
                <AdminButton type="submit" className="flex-1" disabled={createMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  Create
                </AdminButton>
              </div>
              {formError && (
                <div className="sm:col-span-2">
                  <InlineNotice tone="danger" title="User action failed">
                    {formError}
                  </InlineNotice>
                </div>
              )}
            </form>
          </Panel>
        )}

        <Panel className="mt-5">
          <PanelHeader title="User Records" description={`${users.length} total users`} />

          {usersQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading users...</div>
          ) : usersQuery.isError ? (
            <div className="p-4">
              <InlineNotice tone="danger" title="Failed to load users">
                Could not fetch users from backend. Make sure the operator session is active.
              </InlineNotice>
            </div>
          ) : users.length === 0 ? (
            <EmptyState icon={UserIcon} title="No users yet" description="Create the first app user before testing user-scoped agent flows." />
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
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                            <UserIcon className="h-4 w-4 text-slate-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-950">{user.displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span>{user.email || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={user.role === 'admin' ? 'info' : 'neutral'}>
                          {user.role === 'admin' && <Shield className="h-3 w-3" />}
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={user.disabled ? 'danger' : 'success'}>
                          {user.disabled ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {user.disabled ? 'Disabled' : 'Active'}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="mt-5">
          <InlineNotice tone="info" title="User scope">
            WhatsApp access, contacts, tasks, reminders, clients, and context are user-scoped. Use this page for records, then review channel access in WhatsApp Access.
          </InlineNotice>
        </div>
      </div>
    </main>
  )
}
