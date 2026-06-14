import { env } from '../config/env.js'

type AgentResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

type Task = {
  id: string
  title: string
  done: boolean
  userId?: string
}

type User = {
  id: string
  displayName: string
  email?: string
}

type Reminder = {
  id: string
  name: string
  enabled: boolean
  kind: 'once' | 'recurring'
  userId?: string
}

const backendUrl = process.env.NARA_BACKEND_URL ?? `http://127.0.0.1:${env.PORT}`
const cleanup = process.argv.includes('--cleanup')

const argValue = (name: string) => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function callJson<T>(path: string, body: unknown = {}) {
  const response = await fetch(`${backendUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json() as T
  return { response, payload }
}

async function ensureUser() {
  const explicitUserId = argValue('--user-id')
  if (explicitUserId) return { id: explicitUserId, displayName: 'Existing agent smoke user' }

  const suffix = Date.now()
  const email = `agent-smoke-${suffix}@nara.local`
  const { response, payload } = await callJson<{ user: User }>('/api/auth/register', {
    displayName: 'Agent Smoke User',
    email,
    password: 'agent-smoke-password',
  })

  if (!response.ok) {
    throw new Error(`Failed to create smoke user: HTTP ${response.status}`)
  }

  return payload.user
}

async function callTool<T>(path: string, body: unknown = {}) {
  const response = await fetch(`${backendUrl}/api/agent${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-secret': env.AGENT_API_SECRET,
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json()) as AgentResponse<T>

  if (!response.ok || !payload.ok) {
    const error = payload.ok ? `HTTP ${response.status}` : payload.error
    throw new Error(`${path} failed: ${error}`)
  }

  return payload.data
}

async function main() {
  const user = await ensureUser()
  const context = { userId: user.id }
  const title = `Agent smoke test ${new Date().toISOString()}`

  console.log(`Backend: ${backendUrl}`)
  console.log(`Agent user: ${user.id}`)

  const agentContext = await callTool<{ instructions: string[]; taskSummary: unknown }>(
    '/users/context',
    context,
  )
  console.log(`Instructions: ${agentContext.instructions.length}`)

  const created = await callTool<{ task: Task; message: string }>('/tasks/create', {
    ...context,
    title,
    description: 'Created by local agent smoke test.',
    confirmed: true,
  })
  console.log(`Created: ${created.task.id}`)

  const listed = await callTool<{ tasks: Task[]; count: number }>('/tasks/list', {
    ...context,
    done: false,
  })
  const found = listed.tasks.some((task) => task.id === created.task.id)
  if (!found) throw new Error('Created task was not returned by list_tasks')
  console.log(`Pending tasks for user: ${listed.count}`)

  const completed = await callTool<{ task: Task; message: string }>('/tasks/complete', {
    ...context,
    id: created.task.id,
    confirmed: true,
  })
  if (!completed.task.done) throw new Error('Completed task is not marked done')
  if (completed.task.userId !== user.id) throw new Error('Completed task is not scoped to smoke user')
  console.log(`Completed: ${completed.task.id}`)

  const reminderName = `Agent reminder ${new Date().toISOString()}`
  const createdReminder = await callTool<{ reminder: Reminder; message: string }>(
    '/reminders/create',
    {
      ...context,
      name: reminderName,
      kind: 'once',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      confirmed: true,
    },
  )
  console.log(`Reminder created: ${createdReminder.reminder.id}`)

  const listedReminders = await callTool<{ reminders: Reminder[]; count: number }>(
    '/reminders/list',
    context,
  )
  if (!listedReminders.reminders.some((item) => item.id === createdReminder.reminder.id)) {
    throw new Error('Created reminder was not returned by list_reminders')
  }
  console.log(`Reminders for user: ${listedReminders.count}`)

  const pausedReminder = await callTool<{ reminder: Reminder; message: string }>(
    '/reminders/update',
    {
      ...context,
      id: createdReminder.reminder.id,
      enabled: false,
      confirmed: true,
    },
  )
  if (pausedReminder.reminder.enabled) throw new Error('Reminder was not paused')
  console.log(`Reminder paused: ${pausedReminder.reminder.id}`)

  const summary = await callTool<{ summary: unknown }>('/summary', context)
  console.log(`Summary: ${JSON.stringify(summary.summary)}`)

  if (cleanup) {
    await callTool('/tasks/delete', {
      ...context,
      id: created.task.id,
      confirmed: true,
    })
    console.log(`Deleted: ${created.task.id}`)
    await callTool('/reminders/delete', {
      ...context,
      id: createdReminder.reminder.id,
      confirmed: true,
    })
    console.log(`Reminder deleted: ${createdReminder.reminder.id}`)
  }

  console.log('Agent smoke test passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
