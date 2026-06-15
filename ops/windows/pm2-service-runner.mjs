import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const service = process.argv[2];

const services = {
  'nara-backend': {
    command: 'node',
    args: ['--env-file-if-exists=.env', 'apps/backend/dist/index.js'],
  },
  'openclaw-gateway': {
    command: 'openclaw',
    args: ['gateway', 'run'],
  },
  'openclaw-dashboard': {
    command: 'openclaw',
    args: ['dashboard', '--no-open'],
  },
  '9router': {
    command: '9router',
    args: [],
  },
};

if (!service || !services[service]) {
  console.error(`Unknown Nara PM2 service: ${service ?? '<missing>'}`);
  console.error(`Known services: ${Object.keys(services).join(', ')}`);
  process.exit(1);
}

if (!existsSync(resolve('package.json'))) {
  console.error('Run PM2 services from the Nara repository root.');
  process.exit(1);
}

const spec = services[service];
const child = spawn(spec.command, spec.args, {
  cwd: process.cwd(),
  env: process.env,
  shell: true,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`${service} exited by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(`${service} failed to start:`, error);
  process.exit(1);
});
