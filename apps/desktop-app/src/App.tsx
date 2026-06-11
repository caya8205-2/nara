import {
  Bell,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircle,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'

const tasks = [
  { title: 'Follow up supplier invoice', due: 'Today, 14:00', source: 'WhatsApp', urgent: true },
  { title: 'Prepare weekly client summary', due: 'Tomorrow', source: 'Schedule', urgent: false },
  { title: 'Confirm office server backup', due: 'Friday', source: 'Nara', urgent: false },
]

const approvals = [
  {
    title: 'Send payment reminder',
    detail: 'Nara wants to send a WhatsApp reminder to a vendor contact.',
    risk: 'Medium',
  },
]

const navItems = [
  { label: 'Home', icon: Bot, active: true },
  { label: 'Tasks', icon: CheckCircle2 },
  { label: 'Reminders', icon: CalendarClock },
  { label: 'Assistant', icon: SlidersHorizontal },
  { label: 'Settings', icon: ShieldCheck },
]

export default function App() {
  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-5 px-4 py-5 sm:px-6">
        <aside className="hidden w-64 shrink-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:block">
          <div className="flex items-center gap-3 border-b border-slate-100 px-2 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-700 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Nara</p>
              <p className="text-xs text-slate-500">Assistant App</p>
            </div>
          </div>
          <nav className="mt-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={[
                  'flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium',
                  item.active
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                ].join(' ')}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-teal-700">Connected to office server</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">Today with Nara</h1>
                <p className="mt-1 text-sm text-slate-500">Tasks, reminders, and assistant decisions in one calm place.</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>
          </header>

          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
                Pending tasks
              </div>
              <p className="mt-3 text-3xl font-semibold">3</p>
              <p className="text-sm text-slate-500">1 needs attention today</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Bell className="h-4 w-4 text-amber-500" />
                Reminders
              </div>
              <p className="mt-3 text-3xl font-semibold">5</p>
              <p className="text-sm text-slate-500">2 scheduled this week</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <MessageCircle className="h-4 w-4" />
                WhatsApp agent
              </div>
              <p className="mt-3 text-3xl font-semibold text-emerald-800">Ready</p>
              <p className="text-sm text-emerald-700">OpenClaw bridge is the primary channel</p>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <h2 className="text-base font-semibold">Next Tasks</h2>
                <p className="text-sm text-slate-500">A focused list for the work that matters soon.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <article key={task.title} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {task.urgent ? (
                          <Clock3 className="h-4 w-4 shrink-0 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
                        )}
                        <h3 className="truncate text-sm font-semibold">{task.title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{task.due} · {task.source}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </article>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold">Assistant Setup</h2>
                <p className="mt-1 text-sm text-slate-500">Current personality: balanced, concise, approval-first.</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium">Tone</span>
                    <span className="text-slate-500">Professional</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium">External sends</span>
                    <span className="text-emerald-700">Needs approval</span>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <h2 className="text-base font-semibold text-amber-900">Pending Approval</h2>
                {approvals.map((approval) => (
                  <div key={approval.title} className="mt-3">
                    <p className="text-sm font-semibold text-amber-950">{approval.title}</p>
                    <p className="mt-1 text-sm text-amber-800">{approval.detail}</p>
                    <div className="mt-4 flex gap-2">
                      <button className="h-9 rounded-md bg-amber-900 px-3 text-sm font-semibold text-white">Review</button>
                      <span className="inline-flex h-9 items-center rounded-md border border-amber-300 px-3 text-sm font-semibold text-amber-900">
                        {approval.risk}
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
