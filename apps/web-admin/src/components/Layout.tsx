import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  Bot,
  Database,
  FileText,
  HardDrive,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Users,
  Wrench,
} from 'lucide-react'
import { getCurrentOperator, logoutOperator } from '../lib/api'

type LayoutProps = {
  children: ReactNode
}

const navItems = [
  { path: '/', label: 'Overview', icon: Activity },
  { path: '/health', label: 'Health', icon: Database },
  { path: '/agent-tools', label: 'Agent Tools', icon: Wrench },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/whatsapp-access', label: 'WhatsApp Access', icon: MessageSquare },
  { path: '/logs', label: 'Logs', icon: FileText },
  { path: '/config', label: 'Config', icon: Settings },
  { path: '/backup', label: 'Backup', icon: HardDrive },
]

export default function Layout({ children }: LayoutProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const hasToken = Boolean(localStorage.getItem('token'))

  const operatorQuery = useQuery({
    queryKey: ['operator'],
    queryFn: getCurrentOperator,
    enabled: hasToken,
    retry: false,
  })

  const operator = operatorQuery.data

  const handleLogout = () => {
    logoutOperator()
    queryClient.removeQueries({ queryKey: ['operator'] })
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-950">Nara</div>
              <div className="text-xs text-slate-500">Admin Dashboard</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-700 hover:bg-slate-50',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-600" />
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Operator Info */}
          <div className="border-t border-slate-100 p-4">
            {operator ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-950">
                      {operator.username}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      {operator.role}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="text-center text-sm text-slate-500">
                Not logged in
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
