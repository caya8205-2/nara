import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Health from './pages/Health'
import AgentTools from './pages/AgentTools'
import Config from './pages/Config'
import Users from './pages/Users'
import WhatsAppAccess from './pages/WhatsAppAccess'
import Logs from './pages/Logs'
import Backup from './pages/Backup'
import Tasks from './pages/Tasks'
import Schedules from './pages/Schedules'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/health" element={<Layout><Health /></Layout>} />
          <Route path="/agent-tools" element={<Layout><AgentTools /></Layout>} />
          <Route path="/users" element={<Layout><Users /></Layout>} />
          <Route path="/whatsapp-access" element={<Layout><WhatsAppAccess /></Layout>} />
          <Route path="/logs" element={<Layout><Logs /></Layout>} />
          <Route path="/config" element={<Layout><Config /></Layout>} />
          <Route path="/backup" element={<Layout><Backup /></Layout>} />
          <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
          <Route path="/schedules" element={<Layout><Schedules /></Layout>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
