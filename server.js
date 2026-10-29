import { createServer } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
// Only the hash of the admin code is stored; ADMIN_PASSWORD overrides it.
const adminCodeHash = process.env.ADMIN_PASSWORD
  ? createHash('sha256').update(process.env.ADMIN_PASSWORD).digest()
  : Buffer.from('2f4762a7e7844eefac1248f53e5a5f54eee905f8a750457c280d8c78bb7dcf8c', 'hex');
const adminSessions = new Map();
const adminSessionDuration = 12 * 60 * 60 * 1000;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

async function readJsonBody(request, limit = 4096) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > limit) throw new Error('Request body is too large.');
  }
  return JSON.parse(body);
}

function getAdminSessionId(request) {
  const cookie = request.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith('quidtools_admin='));
  const sessionId = cookie?.slice('quidtools_admin='.length);
  const expiresAt = adminSessions.get(sessionId);
  if (!expiresAt) return null;
  if (expiresAt <= Date.now()) {
    adminSessions.delete(sessionId);
    return null;
  }
  return sessionId;
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
  response.end(JSON.stringify(payload));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (url.pathname === '/api/admin/status' && request.method === 'GET') {
    sendJson(response, 200, {
      configured: true,
      authenticated: Boolean(getAdminSessionId(request))
    });
    return;
  }

  if (url.pathname === '/api/admin/login' && request.method === 'POST') {
    let password;
    try {
      ({ password } = await readJsonBody(request));
    } catch {
      sendJson(response, 400, { message: 'Invalid login request.' });
      return;
    }

    if (typeof password !== 'string' || password.length > 256) {
      sendJson(response, 400, { message: 'Invalid password.' });
      return;
    }
    const submittedHash = createHash('sha256').update(password).digest();
    if (!timingSafeEqual(submittedHash, adminCodeHash)) {
      sendJson(response, 401, { message: 'That admin password is incorrect.' });
      return;
    }

    for (const [sessionId, expiresAt] of adminSessions) {
      if (expiresAt <= Date.now()) adminSessions.delete(sessionId);
    }
    const sessionId = randomBytes(32).toString('base64url');
    adminSessions.set(sessionId, Date.now() + adminSessionDuration);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    sendJson(response, 200, { authenticated: true }, {
      'Set-Cookie': `quidtools_admin=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${secure}`
    });
    return;
  }

  if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
    const sessionId = getAdminSessionId(request);
    if (sessionId) adminSessions.delete(sessionId);
    sendJson(response, 200, { authenticated: false }, {
      'Set-Cookie': 'quidtools_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
    });
    return;
  }

  if (request.method !== 'GET' || !['/', '/index.html', '/thanks.html', '/styles.css', '/app.js', '/robots.txt', '/sitemap.xml'].includes(url.pathname)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const filename = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  try {
    const contents = await readFile(join(root, filename));
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filename)] || 'application/octet-stream' });
    response.end(contents);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Could not load the app.');
  }
});

server.listen(port, () => {
  console.log(`Toolbox is running at http://localhost:${port}`);
});