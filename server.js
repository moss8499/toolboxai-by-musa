import { createServer } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
const paypalClientId = process.env.PAYPAL_CLIENT_ID || 'BAAowBITZDtoAnQghlEOFvmc3cuqVv_W5aDbHeeiUgFW1-z4WogX9eOhnHoGUf6TJ9TFyTULcwK7Q_655k';
const paypalBase = process.env.PAYPAL_ENV === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';
const adminPassword = process.env.ADMIN_PASSWORD || '';
const adminSessions = new Map();
const adminSessionDuration = 12 * 60 * 60 * 1000;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
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

async function verifySubscription(subscriptionId) {
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const planId = process.env.PAYPAL_PLAN_ID;

  if (!paypalClientId || !clientSecret || !planId) {
    return { ok: false, status: 503, message: 'PayPal is not configured yet.' };
  }

  const credentials = Buffer.from(`${paypalClientId}:${clientSecret}`).toString('base64');
  const tokenResponse = await fetch(`${paypalBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!tokenResponse.ok) {
    return { ok: false, status: 502, message: 'Could not verify your PayPal subscription.' };
  }

  const { access_token: accessToken } = await tokenResponse.json();
  const subscriptionResponse = await fetch(
    `${paypalBase}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!subscriptionResponse.ok) {
    return { ok: false, status: 401, message: 'This subscription could not be verified.' };
  }

  const subscription = await subscriptionResponse.json();
  const active = subscription.status === 'ACTIVE' && subscription.plan_id === planId;
  return active
    ? { ok: true }
    : { ok: false, status: 401, message: 'This subscription is not active.' };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (url.pathname === '/api/admin/status' && request.method === 'GET') {
    sendJson(response, 200, {
      configured: Boolean(adminPassword),
      authenticated: Boolean(getAdminSessionId(request))
    });
    return;
  }

  if (url.pathname === '/api/admin/login' && request.method === 'POST') {
    if (!adminPassword) {
      sendJson(response, 503, { message: 'Admin access is not configured. Set ADMIN_PASSWORD and restart the server.' });
      return;
    }

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
    const expectedHash = createHash('sha256').update(adminPassword).digest();
    if (!timingSafeEqual(submittedHash, expectedHash)) {
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

  if (url.pathname === '/api/config' && request.method === 'GET') {
    sendJson(response, 200, {
      paypalClientId: paypalClientId || null,
      paypalPlanId: process.env.PAYPAL_PLAN_ID || null,
      paypalConfigured: Boolean(paypalClientId && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_PLAN_ID),
      paypalEnvironment: process.env.PAYPAL_ENV === 'sandbox' ? 'sandbox' : 'live'
    });
    return;
  }

  if (url.pathname === '/api/verify-subscription' && request.method === 'POST') {
    let subscriptionId;
    try {
      ({ subscriptionId } = await readJsonBody(request));
    } catch {
      sendJson(response, 400, { message: 'Invalid request.' });
      return;
    }

    if (typeof subscriptionId !== 'string' || subscriptionId.length > 128) {
      sendJson(response, 400, { message: 'Invalid subscription ID.' });
      return;
    }

    try {
      const result = await verifySubscription(subscriptionId);
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { active: true } : { message: result.message });
    } catch {
      sendJson(response, 502, { message: 'PayPal verification is temporarily unavailable.' });
    }
    return;
  }

  if (request.method !== 'GET' || !['/', '/index.html', '/thanks.html', '/styles.css', '/app.js'].includes(url.pathname)) {
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