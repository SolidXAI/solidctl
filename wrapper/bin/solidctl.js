#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Resolve the real solidctl binary from the wrapped dependency
const realSolidCtl = require.resolve('@solidxai/solidctl/dist/main.js');

// Forward all arguments transparently
const args = process.argv.slice(2);

const child = spawn(process.execPath, [realSolidCtl, ...args], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
