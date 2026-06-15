module.exports = {
  apps: [
    {
      name: 'nara-backend',
      script: 'ops/windows/pm2-service-runner.mjs',
      args: 'nara-backend',
      interpreter: 'node',
      cwd: process.cwd(),
    },
    {
      name: 'openclaw-gateway',
      script: 'ops/windows/pm2-service-runner.mjs',
      args: 'openclaw-gateway',
      interpreter: 'node',
      cwd: process.cwd(),
    },
    {
      name: 'openclaw-dashboard',
      script: 'ops/windows/pm2-service-runner.mjs',
      args: 'openclaw-dashboard',
      interpreter: 'node',
      cwd: process.cwd(),
    },
    {
      name: '9router',
      script: 'ops/windows/pm2-service-runner.mjs',
      args: '9router',
      interpreter: 'node',
      cwd: process.cwd(),
    },
  ],
};
