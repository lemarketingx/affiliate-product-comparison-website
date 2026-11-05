import { spawn } from 'node:child_process';
const server = spawn(process.execPath, ['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'dist/server/wrangler.json', '--local', '--persist-to', '.wrangler/state', '--ip', '127.0.0.1', '--port', '4175', '--inspector-port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', c => { output += c; });
server.stderr.on('data', c => { output += c; });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch('http://127.0.0.1:4175/api/portal'); if (r.status === 401) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  if (!ready) throw new Error('Test Worker unavailable: ' + output.slice(-2500));
  const test = spawn(process.execPath, ['tests/integration.mjs'], { stdio: 'inherit', env: { ...process.env, TEST_BASE_URL: 'http://127.0.0.1:4175' } });
  const code = await new Promise(r => test.on('exit', r));
  if (code) { console.error(output.slice(-4000)); process.exitCode = code; }
} catch (err) { console.error(err); process.exitCode = 1; }
finally { server.kill('SIGTERM'); }
