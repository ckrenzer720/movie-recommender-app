/* eslint-disable no-console */
/**
 * Pre-deploy checklist runner:
 * - Ensures API is reachable (starts it if needed)
 * - Runs the smoke test
 *
 * Usage:
 * - node scripts/predeploy.js
 */

const { spawn } = require('child_process');

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function isHealthy() {
  try {
    const res = await fetch(API_BASE_URL + '/api/health');
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return Boolean(data && data.ok);
  } catch {
    return false;
  }
}

async function waitForHealthy(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isHealthy()) return true;
    await sleep(250);
  }
  return false;
}

async function run() {
  console.log(`[predeploy] API_BASE_URL=${API_BASE_URL}`);

  let child = null;
  if (!(await isHealthy())) {
    console.log('[predeploy] API not reachable; starting server...');
    child = spawn(process.execPath, ['index.js'], {
      stdio: 'inherit',
      env: { ...process.env }
    });
    const ok = await waitForHealthy();
    if (!ok) {
      if (child) child.kill();
      throw new Error('API did not become healthy in time.');
    }
  } else {
    console.log('[predeploy] API already running.');
  }

  // Run smoke test as a child process for proper exit codes and clean output.
  const smoke = spawn(process.execPath, ['scripts/smoke-test.js'], {
    stdio: 'inherit',
    env: { ...process.env, API_BASE_URL }
  });

  const exitCode = await new Promise((resolve) => {
    smoke.on('exit', (code) => resolve(code ?? 1));
  });

  if (child) {
    console.log('[predeploy] stopping server...');
    child.kill();
  }

  if (exitCode !== 0) {
    process.exitCode = exitCode;
    return;
  }
  console.log('[predeploy] ✅ pre-deploy checks passed');
}

run().catch((err) => {
  console.error('[predeploy] ❌ failed');
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});

