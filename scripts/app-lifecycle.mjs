#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import process from 'node:process';

const ROOT = process.cwd();
const RUNTIME_DIR = path.join(ROOT, '.mindpalace-runtime');
const STATE_FILE = path.join(RUNTIME_DIR, 'app-state.json');

const API_PORT = Number(process.env.APP_API_PORT ?? 3000);
const WEB_PORT = Number(process.env.APP_WEB_PORT ?? 5173);
const SHUTDOWN_TIMEOUT_MS = 15_000;

function log(message) {
  // eslint-disable-next-line no-console
  console.log(`[lifecycle] ${message}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureRuntimeDir() {
  await fs.mkdir(RUNTIME_DIR, { recursive: true });
}

async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeState(state) {
  await ensureRuntimeDir();
  await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

async function removeState() {
  try {
    await fs.unlink(STATE_FILE);
  } catch {
    // ignore missing state
  }
}

function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

function runCommandCapture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}: ${stderr || stdout}`));
    });
  });
}

function spawnService(name, command, args) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    log(`${name} process error: ${err.message}`);
  });

  return child;
}

function waitForPort(port, timeoutMs = 60_000) {
  const started = Date.now();
  const hosts = ['127.0.0.1', '::1', 'localhost'];

  return new Promise((resolve, reject) => {
    const attempt = () => {
      let idx = 0;

      const tryNextHost = () => {
        if (idx >= hosts.length) {
          if (Date.now() - started > timeoutMs) {
            reject(new Error(`Timed out waiting for port ${port}`));
            return;
          }
          setTimeout(attempt, 500);
          return;
        }

        const host = hosts[idx++];
        const socket = net.createConnection({ host, port });

        socket.once('connect', () => {
          socket.destroy();
          resolve();
        });

        socket.once('error', () => {
          socket.destroy();
          tryNextHost();
        });
      };

      tryNextHost();
    };

    attempt();
  });
}

function isPortOpen(port) {
  const hosts = ['127.0.0.1', '::1', 'localhost'];

  return new Promise((resolve) => {
    let idx = 0;

    const tryNextHost = () => {
      if (idx >= hosts.length) {
        resolve(false);
        return;
      }

      const socket = net.createConnection({ host: hosts[idx++], port });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
        tryNextHost();
      });
    };

    tryNextHost();
  });
}

async function getListeningPids(port) {
  try {
    if (process.platform === 'win32') {
      const cmd = [
        '-NoProfile',
        '-Command',
        `Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`,
      ];
      const { stdout } = await runCommandCapture('powershell', cmd);
      const pidsFromPs = stdout
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n > 0);

      if (pidsFromPs.length > 0) return pidsFromPs;

      // Fallback for environments where Get-NetTCPConnection is unavailable.
      const { stdout: netstatOut } = await runCommandCapture('cmd', [
        '/c',
        `netstat -ano -p tcp | findstr :${port}`,
      ]);
      const lines = netstatOut.split(/\r?\n/);
      const pids = [];
      for (const line of lines) {
        const normalized = line.trim().replace(/\s+/g, ' ');
        if (!normalized) continue;
        if (!normalized.toLowerCase().includes('listening')) continue;
        if (!normalized.includes(`:${port}`)) continue;

        const parts = normalized.split(' ');
        const maybePid = Number(parts[parts.length - 1]);
        if (Number.isInteger(maybePid) && maybePid > 0) {
          pids.push(maybePid);
        }
      }

      return [...new Set(pids)];
    }

    const { stdout } = await runCommandCapture('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN']);
    return stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    return [];
  }
}

async function releaseListeningPort(port) {
  const pids = await getListeningPids(port);
  if (pids.length === 0) return false;

  log(`Releasing port ${port}. Found PID(s): ${pids.join(', ')}`);
  for (const pid of pids) {
    if (!isPidAlive(pid)) continue;
    await stopProcessByPid(`port-${port}-owner`, pid);
  }
  return true;
}

function waitForHttpOk(url, timeoutMs = 90_000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
          return;
        }

        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for HTTP readiness at ${url}`));
          return;
        }
        setTimeout(attempt, 700);
      });

      req.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for HTTP readiness at ${url}`));
          return;
        }
        setTimeout(attempt, 700);
      });
    };

    attempt();
  });
}

async function detectComposeCommand() {
  try {
    await runCommand('docker', ['compose', 'version'], { stdio: 'ignore' });
    return ['docker', ['compose']];
  } catch {
    await runCommand('docker-compose', ['version'], { stdio: 'ignore' });
    return ['docker-compose', []];
  }
}

async function stopProcessByPid(name, pid) {
  if (!isPidAlive(pid)) return;

  log(`Stopping ${name} (pid ${pid}) with SIGINT...`);
  try {
    process.kill(pid, 'SIGINT');
  } catch {
    // ignore signal failures, fallback below
  }

  const started = Date.now();
  while (Date.now() - started < SHUTDOWN_TIMEOUT_MS) {
    if (!isPidAlive(pid)) return;
    await delay(300);
  }

  log(`${name} did not exit in time, sending SIGTERM...`);
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore
  }

  const secondStart = Date.now();
  while (Date.now() - secondStart < 5_000) {
    if (!isPidAlive(pid)) return;
    await delay(300);
  }

  log(`${name} is still running, forcing kill...`);
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // ignore
  }
}

async function startApp() {
  const existing = await readState();
  if (existing && isPidAlive(existing.managerPid)) {
    throw new Error('MindPalace app is already running. Use "pnpm app:status" or "pnpm app:stop".');
  }

  const [composeCommand, composePrefix] = await detectComposeCommand();

  if (await isPortOpen(API_PORT)) {
    const pids = await getListeningPids(API_PORT);
    throw new Error(
      `Port ${API_PORT} is already in use${pids.length ? ` (PID: ${pids.join(', ')})` : ''}. Stop it first (try: pnpm app:stop).`,
    );
  }

  if (await isPortOpen(WEB_PORT)) {
    const pids = await getListeningPids(WEB_PORT);
    throw new Error(
      `Port ${WEB_PORT} is already in use${pids.length ? ` (PID: ${pids.join(', ')})` : ''}. Stop it first (try: pnpm app:stop).`,
    );
  }

  const composeArgs = [...composePrefix, 'up', '-d', 'postgres', 'redis'];

  log('Starting infrastructure services (postgres, redis)...');
  await runCommand(composeCommand, composeArgs);

  log('Waiting for PostgreSQL (5432)...');
  await waitForPort(5432);

  log('Waiting for Redis (6379)...');
  await waitForPort(6379);

  log('Applying API migrations...');
  await runCommand('pnpm', ['--filter', '@mindpalace/api', 'run', 'db:migrate']);

  let api;
  let worker;
  let web;
  let shuttingDown = false;

  const stopSpawned = async () => {
    await stopProcessByPid('web', web?.pid);
    await stopProcessByPid('worker', worker?.pid);
    await stopProcessByPid('api', api?.pid);
    try {
      await runCommand(composeCommand, [...composePrefix, 'stop', 'postgres', 'redis']);
    } catch {
      // ignore cleanup errors
    }
    await removeState();
  };

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    log(`Received ${signal}. Beginning graceful shutdown...`);
    await stopSpawned();
    log('Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  try {
    log('Starting API...');
    api = spawnService('api', 'pnpm', ['--filter', '@mindpalace/api', 'run', 'dev']);

    log('Waiting for API health endpoint...');
    await waitForHttpOk(`http://127.0.0.1:${API_PORT}/api/v1/health`);

    log('Starting worker...');
    worker = spawnService('worker', 'pnpm', ['--filter', '@mindpalace/api', 'run', 'worker:dev']);

    log('Starting web...');
    web = spawnService('web', 'pnpm', [
      '--filter',
      '@mindpalace/web',
      'run',
      'dev',
      '--',
      '--port',
      String(WEB_PORT),
      '--strictPort',
    ]);

    const provisionalState = {
      managerPid: process.pid,
      startedAt: new Date().toISOString(),
      phase: 'starting',
      compose: { command: composeCommand, prefix: composePrefix },
      processes: {
        api: api.pid,
        worker: worker.pid,
        web: web.pid,
      },
    };
    await writeState(provisionalState);

    log(`Waiting for web app on port ${WEB_PORT}...`);
    await waitForPort(WEB_PORT);

    const state = {
      ...provisionalState,
      phase: 'running',
    };

    await writeState(state);
    log('Startup complete. Press Ctrl+C for graceful shutdown or run "pnpm app:stop" in another terminal.');

    const children = [api, worker, web];
    for (const child of children) {
      child.on('exit', (code, signal) => {
        if (shuttingDown) return;
        log(
          `A managed process exited unexpectedly (pid=${child.pid}, code=${code ?? 'null'}, signal=${signal ?? 'null'}). Initiating shutdown.`,
        );
        void shutdown('CHILD_EXIT');
      });
    }
  } catch (err) {
    log(`Startup failed: ${err.message}`);
    await stopSpawned();
    throw err;
  }
}

async function stopApp() {
  const state = await readState();
  if (!state) {
    const releasedApi = await releaseListeningPort(API_PORT);
    const releasedWeb = await releaseListeningPort(WEB_PORT);
    if (releasedApi || releasedWeb) {
      log('Recovered and stopped unmanaged process(es) bound to app ports.');
      return;
    }

    log('No lifecycle state file found. Nothing to stop.');
    return;
  }

  const managerPid = state.managerPid;
  if (isPidAlive(managerPid)) {
    log(`Signaling lifecycle manager (pid ${managerPid})...`);
    try {
      process.kill(managerPid, 'SIGINT');
    } catch {
      // ignore
    }

    const started = Date.now();
    while (Date.now() - started < SHUTDOWN_TIMEOUT_MS + 10_000) {
      const current = await readState();
      if (!current) {
        log('Application stopped successfully.');
        return;
      }
      await delay(400);
    }

    log('Manager did not finish in time. Proceeding with direct process stop.');
  }

  const processes = state.processes ?? {};
  await stopProcessByPid('web', processes.web);
  await stopProcessByPid('worker', processes.worker);
  await stopProcessByPid('api', processes.api);

  const composeCommand = state.compose?.command;
  const composePrefix = Array.isArray(state.compose?.prefix) ? state.compose.prefix : [];
  if (composeCommand) {
    try {
      await runCommand(composeCommand, [...composePrefix, 'stop', 'postgres', 'redis']);
    } catch (err) {
      log(`Infrastructure stop warning: ${err.message}`);
    }
  }

  await removeState();
  log('Application stopped successfully.');
}

async function showStatus() {
  const state = await readState();
  if (!state) {
    log('Status: stopped');
    return;
  }

  const managerAlive = isPidAlive(state.managerPid);
  const apiAlive = isPidAlive(state.processes?.api);
  const workerAlive = isPidAlive(state.processes?.worker);
  const webAlive = isPidAlive(state.processes?.web);

  log(`Status: ${managerAlive ? 'running' : 'stale state'}`);
  log(`Manager PID: ${state.managerPid} (${managerAlive ? 'alive' : 'dead'})`);
  log(`API PID: ${state.processes?.api ?? 'n/a'} (${apiAlive ? 'alive' : 'dead'})`);
  log(`Worker PID: ${state.processes?.worker ?? 'n/a'} (${workerAlive ? 'alive' : 'dead'})`);
  log(`Web PID: ${state.processes?.web ?? 'n/a'} (${webAlive ? 'alive' : 'dead'})`);
  log(`Started: ${state.startedAt ?? 'unknown'}`);
}

async function restartApp() {
  await stopApp();
  await startApp();
}

async function main() {
  const command = process.argv[2] ?? 'start';

  try {
    if (command === 'start') {
      await startApp();
      return;
    }
    if (command === 'stop') {
      await stopApp();
      return;
    }
    if (command === 'status') {
      await showStatus();
      return;
    }
    if (command === 'restart') {
      await restartApp();
      return;
    }

    throw new Error(`Unknown command: ${command}. Use start|stop|status|restart.`);
  } catch (err) {
    log(`Error: ${err.message}`);
    process.exit(1);
  }
}

void main();