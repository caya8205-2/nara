import { ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  Bot,
  Brain,
  Building2,
  Database,
  FileText,
  HardDrive,
  Info,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { getCurrentOperator, logoutOperator, type Operator } from '../lib/api'
import { AdminButton, StatusBadge } from './admin-ui'

type LayoutProps = {
  children: ReactNode
}

const navGroups = [
  {
    label: 'Operations',
    items: [
      { path: '/', label: 'Overview', icon: Activity },
      { path: '/health', label: 'Health', icon: Database },
      { path: '/backup', label: 'Backup', icon: HardDrive },
      { path: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'Agent',
    items: [
      { path: '/agent-tools', label: 'Agent Tools', icon: Wrench },
      { path: '/context', label: 'Context', icon: Brain },
      { path: '/group-digests', label: 'Group Digests', icon: MessageSquare },
      { path: '/whatsapp-access', label: 'WhatsApp Access', icon: MessageSquare },
    ],
  },
  {
    label: 'Records',
    items: [
      { path: '/users', label: 'Users', icon: Users },
      { path: '/clients', label: 'Clients', icon: Building2 },
      { path: '/logs', label: 'Logs', icon: FileText },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/config', label: 'Config', icon: Settings },
      { path: '/attribution', label: 'Attribution', icon: Info },
    ],
  },
]

export default function Layout({ children }: LayoutProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const hasToken = Boolean(localStorage.getItem('token'))

  const operatorQuery = useQuery<Operator, any>({
    queryKey: ['operator'],
    queryFn: getCurrentOperator,
    enabled: hasToken,
    retry: false,
    refetchOnMount: 'always',
  })

  useEffect(() => {
    if (operatorQuery.isError && (operatorQuery.error as any)?.response?.status === 401) {
      logoutOperator()
      queryClient.removeQueries({ queryKey: ['operator'] })
      navigate('/')
    }
  }, [operatorQuery.error, operatorQuery.isError, queryClient, navigate])

  const operator = operatorQuery.data
  const currentItem = navGroups.flatMap((group) => group.items).find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  )

  const handleLogout = () => {
    logoutOperator()
    queryClient.removeQueries({ queryKey: ['operator'] })
    navigate('/')
  }

  const renderNavigation = () => (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {group.label}
            </div>
            <div className="mt-2 space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      [
                        'group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition',
                        isActive
                          ? 'bg-slate-950 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={[
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-teal-300' : 'text-slate-400 group-hover:text-slate-700',
                          ].join(' ')}
                        />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )

  const renderOperator = () => (
    <div className="border-t border-slate-200 p-4">
      {operator ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-slate-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-950">{operator.username}</div>
                <div className="text-xs capitalize text-slate-500">{operator.role}</div>
              </div>
              <StatusBadge tone="success" className="h-6 px-2">
                Live
              </StatusBadge>
            </div>
          </div>
          <AdminButton onClick={handleLogout} variant="secondary" className="w-full">
            <LogOut className="h-4 w-4" />
            Logout
          </AdminButton>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          Operator session is inactive.
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50 text-slate-950 lg:flex">
      <aside className="hidden shrink-0 border-r border-slate-200 bg-white lg:block lg:w-72">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-teal-300">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-950">Nara</div>
              <div className="text-xs text-slate-500">Operations Console</div>
            </div>
          </div>
          {renderNavigation()}
          {renderOperator()}
        </div>
      </aside>

      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-950">{currentItem?.label ?? 'Nara'}</div>
              <div className="text-xs text-slate-500">Operations Console</div>
            </div>
          </div>
          {operator && <StatusBadge tone="success">Online</StatusBadge>}
        </div>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/35"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-80 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-teal-300">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-950">Nara</div>
                  <div className="text-xs text-slate-500">Operations Console</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderNavigation()}
            {renderOperator()}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
