export const agentConfig = {
  name: 'Nara Bot',
  version: '0.1.0',
  runtimeContract: {
    systemPromptPath: 'agent/prompts/system.md',
    toolsManifestPath: 'agent/config/tools.json',
    sourceOfTruth: 'nara-backend',
    disallowedOpenClawBehaviors: [
      'internal-task-storage',
      'sub-agent-spawn-for-user-requests',
      'openclaw-project-automation-for-user-requests',
    ],
    requiredFirstTool: 'get_user_context',
    whatsappSubject: {
      channelType: 'whatsapp',
      contactValue: 'incoming sender phone number',
    },
  },
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
