const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const ROOT = __dirname;
const PNPM = path.join(process.env.APPDATA || '', 'npm', 'pnpm.cmd');
const PYTHON = path.join(ROOT, 'apps', 'scraper', '.venv', 'Scripts', 'python.exe');
const LOCAL_DB = path.join('C:', 'Users', 'C-131', 'Desktop', 'TWR', 'scripts', 'local-db.js');

function isPortListening(port) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(1000);
    client.once('connect', () => {
      client.destroy();
      resolve(true);
    });
    client.once('timeout', () => {
      client.destroy();
      resolve(false);
    });
    client.once('error', () => {
      resolve(false);
    });
    client.connect(port, '127.0.0.1');
  });
}

async function waitForPort(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortListening(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const fs = require('fs');

async function start() {
  console.log('[start-dev] Checking PostgreSQL on port 5432...');
  let pgUp = await isPortListening(5432);
  if (!pgUp && fs.existsSync(LOCAL_DB)) {
    console.log('[start-dev] Starting PostgreSQL in background...');
    const pgProc = spawn('node', [LOCAL_DB, 'up'], {
      stdio: 'inherit',
      detached: false,
    });
    pgProc.on('error', (err) => console.error('[Postgres Error]', err));
    pgUp = await waitForPort(5432, 5000);
  }

  console.log('[start-dev] Checking Scraper on port 8000...');
  const scraperUp = await isPortListening(8000);
  if (!scraperUp) {
    console.log('[start-dev] Spawning Scraper API (0.0.0.0:8000)...');
    const scraper = spawn(PYTHON, ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'apps/scraper', '--host', '0.0.0.0', '--port', '8000', '--reload'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    scraper.on('error', (err) => console.error('[Scraper Error]', err));
    await waitForPort(8000, 15000);
    console.log('[start-dev] Scraper is ready on port 8000.');
  } else {
    console.log('[start-dev] Scraper already running on port 8000.');
  }

  console.log('[start-dev] Starting CMS & Web with pnpm...');
  const pnpmProcess = spawn(PNPM, ['--parallel', '--filter', 'web', '--filter', 'cms', 'dev'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  pnpmProcess.on('error', (err) => console.error('[pnpm Error]', err));
}

start().catch(console.error);
