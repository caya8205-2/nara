export const agentConfig = {
  name: 'Nara',
  version: '0.1.0',
  channels: {
    whatsapp: { enabled: true, primary: true },
    telegram: { enabled: false },
  },
  memory: {
    provider: 'postgres+pgvector',
    sessionTtlHours: 24,
  },
  tools: {
    endpoint: 'http://localhost:4000/api/agent',
    headers: {
      'x-agent-secret': process.env.AGENT_API_SECRET,
    },
  },
}
