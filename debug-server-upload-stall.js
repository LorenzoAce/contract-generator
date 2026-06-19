const fs = require('fs');
const http = require('http');
const path = require('path');

const sessionId = 'upload-stall';
const outdir = path.join(process.cwd(), '.dbg');
const host = '127.0.0.1';
const startPort = 7777;
const maxPorts = 10;
const idleMs = 1200 * 1000;

fs.mkdirSync(outdir, { recursive: true });

const logFile = path.join(outdir, `trae-debug-log-${sessionId}.ndjson`);
const envFile = path.join(outdir, `${sessionId}.env`);
fs.writeFileSync(logFile, '');

let lastActivity = Date.now();
let server;

function writeEnv(port) {
  fs.writeFileSync(envFile, `DEBUG_SERVER_URL=http://${host}:${port}/event\nDEBUG_SESSION_ID=${sessionId}\n`);
}

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function createServer(port) {
  server = http.createServer((req, res) => {
    withCors(res);
    lastActivity = Date.now();

    if (req.method === 'OPTIONS' && req.url === '/event') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, sessionId, port }));
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/logs')) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.end(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '');
      return;
    }

    if (req.method === 'DELETE' && req.url === '/logs') {
      fs.writeFileSync(logFile, '');
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/event') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          const event = raw ? JSON.parse(raw) : {};
          if (!event.ts) {
            event.ts = Date.now();
          }
          fs.appendFileSync(logFile, `${JSON.stringify(event)}\n`);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message || 'Invalid JSON' }));
        }
      });
      return;
    }

    res.statusCode = 404;
    res.end('Not found');
  });

  server.listen(port, host, () => {
    writeEnv(port);
    process.stdout.write('@@DEBUG_SERVER_INFO\n');
    process.stdout.write(`${JSON.stringify({
      api_url: `http://${host}:${port}/event`,
      session_id: sessionId,
      log_dir: outdir,
      log_file: logFile,
      env_file: envFile,
    }, null, 2)}\n`);
    process.stdout.write('@@END_DEBUG_SERVER_INFO\n');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < startPort + maxPorts - 1) {
      createServer(port + 1);
      return;
    }
    throw error;
  });
}

createServer(startPort);

setInterval(() => {
  if (Date.now() - lastActivity > idleMs) {
    process.exit(0);
  }
}, 5000);
