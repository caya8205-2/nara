import { useState, type FormEvent } from 'react'
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

const statusTone: Record<NonNullable<CreateClientInput['status']>, 'neutral' | 'success' | 'warning' | 'info'> = {
  active: 'success',
  lead: 'info',
  inactive: 'neutral',
  archived: 'warning',
}

const contactIcon = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageSquare,
  other: UserRound,
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response
    return response?.data?.error ?? fallback
  }
  return fallback
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
    onError: (error: unknown) => {
      setFormError(getErrorMessage(error, 'Failed to create client'))
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
    onError: (error: unknown) => {
      setFormError(getErrorMessage(error, 'Failed to add contact'))
    },
  })

  const handleCreateClient = (event: FormEvent) => {
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

  const handleAddContact = (event: FormEvent) => {
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
  const activeCount = clients.filter((client) => client.status === 'active').length
  const leadCount = clients.filter((client) => client.status === 'lead').length
  const contactCount = clients.reduce((total, client) => total + client.contacts.length, 0)
  const selectedClient = clients.find((client) => client.id === contactClientId)

  const renderClient = (client: Client) => {
    const primaryContact = client.contacts.find((contact) => contact.isPrimary) ?? client.contacts[0] ?? null

    return (
      <tr key={client.id} className="hover:bg-slate-50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
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
          <StatusBadge tone={statusTone[client.status]}>{client.status}</StatusBadge>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">{client.contacts.length}</td>
        <td className="px-4 py-3 text-right">
          <AdminButton variant="secondary" className="h-9" onClick={() => setContactClientId(client.id)}>
            <Plus className="h-4 w-4" />
            Contact
          </AdminButton>
        </td>
      </tr>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Clients"
          description="Keep client records and practical contact details available for follow-up context."
          actions={
            <>
              <AdminButton variant="secondary" onClick={refreshClients} disabled={clientsQuery.isFetching}>
                <RefreshCw className={['h-4 w-4', clientsQuery.isFetching && 'animate-spin'].filter(Boolean).join(' ')} />
                Refresh
              </AdminButton>
              <AdminButton onClick={() => setShowCreateForm((value) => !value)}>
                <Plus className="h-4 w-4" />
                New Client
              </AdminButton>
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <MetricTile label="Clients" value={clients.length} description={`${activeCount} active`} icon={Building2} tone="neutral" />
          <MetricTile label="Leads" value={leadCount} description="Open follow-up records" icon={UserRound} tone={leadCount > 0 ? 'info' : 'neutral'} />
          <MetricTile label="Contacts" value={contactCount} description="Saved contact methods" icon={MessageSquare} tone={contactCount > 0 ? 'success' : 'neutral'} />
        </div>

        {formError && (
          <div className="mt-5">
            <InlineNotice tone="danger" title="Client action failed">
              {formError}
            </InlineNotice>
          </div>
        )}

        {showCreateForm && (
          <Panel className="mt-5">
            <PanelHeader title="New Client" description="Create a client record for admin and agent context." />
            <form onSubmit={handleCreateClient} className="p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-medium text-slate-700">
                  Name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Company
                  <input
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as CreateClientInput['status'])}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-4">
                  Notes
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="mt-1 min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <AdminButton type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </AdminButton>
                <AdminButton type="submit" disabled={createMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  Create Client
                </AdminButton>
              </div>
            </form>
          </Panel>
        )}

        {contactClientId && (
          <Panel className="mt-5">
            <PanelHeader title="Add Contact" description={selectedClient ? selectedClient.name : 'Selected client'} />
            <form onSubmit={handleAddContact} className="p-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <label className="text-sm font-medium text-slate-700">
                  Type
                  <select
                    value={contactType}
                    onChange={(event) => setContactType(event.target.value as CreateClientContactInput['type'])}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Label
                  <input
                    value={contactLabel}
                    onChange={(event) => setContactLabel(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={contactPrimary}
                    onChange={(event) => setContactPrimary(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Primary
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <AdminButton type="button" variant="secondary" onClick={() => setContactClientId(null)}>
                  Cancel
                </AdminButton>
                <AdminButton type="submit" disabled={addContactMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  Add Contact
                </AdminButton>
              </div>
            </form>
          </Panel>
        )}

        <Panel className="mt-5">
          <PanelHeader title="Client Records" description={`${clients.length} total clients`} />

          {clientsQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading clients...</div>
          ) : clientsQuery.isError ? (
            <div className="p-4">
              <InlineNotice tone="danger" title="Failed to load clients">
                Check the operator session and backend connection.
              </InlineNotice>
            </div>
          ) : clients.length === 0 ? (
            <EmptyState icon={Building2} title="No clients yet" description="Create a client record to start tracking contacts and follow-up context." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Primary Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Contacts</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">{clients.map(renderClient)}</tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </main>
  )
}
