import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Building2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Star,
  UserRound,
} from 'lucide-react'
import {
  addClientContact,
  createClient,
  listClients,
  type Client,
  type CreateClientContactInput,
  type CreateClientInput,
} from '../lib/api'

const statusClass = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  lead: 'border-blue-200 bg-blue-50 text-blue-700',
  inactive: 'border-slate-200 bg-slate-50 text-slate-600',
  archived: 'border-amber-200 bg-amber-50 text-amber-700',
}

const contactIcon = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageSquare,
  other: UserRound,
}

export default function Clients() {
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [status, setStatus] = useState<CreateClientInput['status']>('active')
  const [notes, setNotes] = useState('')
  const [contactClientId, setContactClientId] = useState<string | null>(null)
  const [contactType, setContactType] = useState<CreateClientContactInput['type']>('whatsapp')
  const [contactValue, setContactValue] = useState('')
  const [contactLabel, setContactLabel] = useState('')
  const [contactPrimary, setContactPrimary] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: listClients,
  })

  const refreshClients = () => queryClient.invalidateQueries({ queryKey: ['clients'] })

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      setName('')
      setCompany('')
      setContactInfo('')
      setNotes('')
      setStatus('active')
      setShowCreateForm(false)
      setFormError(null)
      refreshClients()
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.error || 'Failed to create client')
    },
  })

  const addContactMutation = useMutation({
    mutationFn: ({ clientId, input }: { clientId: string; input: CreateClientContactInput }) =>
      addClientContact(clientId, input),
    onSuccess: () => {
      setContactClientId(null)
      setContactValue('')
      setContactLabel('')
      setContactPrimary(true)
      setFormError(null)
      refreshClients()
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.error || 'Failed to add contact')
    },
  })

  const handleCreateClient = (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (!name.trim()) {
      setFormError('Client name is required')
      return
    }

    createMutation.mutate({
      name: name.trim(),
      company: company.trim() || undefined,
      contactInfo: contactInfo.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
    })
  }

  const handleAddContact = (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (!contactClientId || !contactValue.trim()) {
      setFormError('Contact value is required')
      return
    }

    addContactMutation.mutate({
      clientId: contactClientId,
      input: {
        type: contactType,
        value: contactValue.trim(),
        label: contactLabel.trim() || undefined,
        isPrimary: contactPrimary,
      },
    })
  }

  const clients = clientsQuery.data ?? []

  const renderClient = (client: Client) => {
    const primaryContact = client.contacts.find((contact) => contact.isPrimary) ?? client.contacts[0] ?? null

    return (
      <tr key={client.id} className="hover:bg-slate-50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100">
              <Building2 className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">{client.name}</p>
              <p className="text-xs text-slate-500">{client.company || 'No company'}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {primaryContact ? (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              {(() => {
                const Icon = contactIcon[primaryContact.type]
                return <Icon className="h-4 w-4 text-slate-500" />
              })()}
              <span>{primaryContact.value}</span>
              {primaryContact.isPrimary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
            </div>
          ) : (
            <span className="text-sm text-slate-500">{client.contactInfo || '-'}</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={['inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', statusClass[client.status]].join(' ')}>
            {client.status}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">
          {client.contacts.length}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setContactClientId(client.id)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Contact
          </button>
        </td>
      </tr>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Clients</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage client records and practical contact details
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refreshClients}
              disabled={clientsQuery.isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={['h-4 w-4', clientsQuery.isFetching && 'animate-spin'].join(' ')} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              New Client
            </button>
          </div>
        </div>

        {formError && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="text-sm font-semibold text-rose-800">{formError}</p>
          </div>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateClient} className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">New Client</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium text-slate-700">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Company
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as CreateClientInput['status'])}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="lead">Lead</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Quick Contact
                <input
                  value={contactInfo}
                  onChange={(event) => setContactInfo(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-4">
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Create Client
              </button>
            </div>
          </form>
        )}

        {contactClientId && (
          <form onSubmit={handleAddContact} className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">
              Add Contact
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <label className="text-sm font-medium text-slate-700">
                Type
                <select
                  value={contactType}
                  onChange={(event) => setContactType(event.target.value as CreateClientContactInput['type'])}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Value
                <input
                  value={contactValue}
                  onChange={(event) => setContactValue(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Label
                <input
                  value={contactLabel}
                  onChange={(event) => setContactLabel(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={contactPrimary}
                  onChange={(event) => setContactPrimary(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Primary
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setContactClientId(null)}
                className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addContactMutation.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </button>
            </div>
          </form>
        )}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-950">Client Records</h2>
            <p className="mt-0.5 text-sm text-slate-600">{clients.length} total clients</p>
          </div>

          {clientsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading clients...</div>
          ) : clientsQuery.isError ? (
            <div className="p-8">
              <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                <p className="text-sm font-semibold text-rose-800">Failed to load clients.</p>
              </div>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-sm font-semibold text-slate-950">No clients yet</h3>
              <p className="mt-1 text-sm text-slate-600">
                Create a client record to start tracking contacts and follow-up context.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Primary Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Contacts</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map(renderClient)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
