/* eslint-disable no-console */
/**
 * Minimal API smoke test (no external test runner).
 *
 * Usage:
 * - node scripts/smoke-test.js
 *
 * Env:
 * - API_BASE_URL (default: http://localhost:3001)
 *
 * Notes:
 * - Designed to work in dev-echo mode where register/reset may return tokens.
 * - If tokens are not returned (real SMTP), the script will still test register + request reset
 *   but will skip verification/reset steps it can't complete.
 */

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

function randHex(len = 8) {
  const chars = 'abcdef0123456789';
  let s = '';
  for (let i = 0; i < len; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function jsonFetch(path, options = {}) {
  const url = API_BASE_URL + path;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const errMsg = data?.error || `${res.status} ${res.statusText}`;
    const err = new Error(`${options.method || 'GET'} ${path} failed: ${errMsg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function main() {
  console.log(`[smoke] API_BASE_URL=${API_BASE_URL}`);

  // 1) Health
  const health = await jsonFetch('/api/health');
  if (!health?.ok) throw new Error('Health check failed');
  console.log('[smoke] health ok');

  const userSuffix = randHex(10);
  const username = `smoke_${userSuffix}`;
  const email = `smoke_${userSuffix}@example.com`;
  const password1 = `Password_${userSuffix}!`;
  const password2 = `Password2_${userSuffix}!`;

  // 2) Register
  const register = await jsonFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password: password1 }),
  });
  console.log('[smoke] register ok');

  // 3) Verify email (only if dev-echo token returned)
  const verificationToken = register?.verificationToken;
  if (verificationToken) {
    await jsonFetch('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: verificationToken }),
    });
    console.log('[smoke] verify-email ok');
  } else {
    console.log('[smoke] verify-email skipped (no dev echo token)');
  }

  // 4) Login (only works after verification)
  let token = null;
  try {
    const login = await jsonFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: password1 }),
    });
    token = login?.token;
    if (!token) throw new Error('Missing token from login');
    console.log('[smoke] login ok');
  } catch (err) {
    if (err.status === 403 && !verificationToken) {
      console.log('[smoke] login skipped (email not verified; no dev echo token)');
    } else {
      throw err;
    }
  }

  // 5) Favorites GET/PUT (only if logged in)
  if (token) {
    const favList = await jsonFetch('/api/favorites', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!Array.isArray(favList)) throw new Error('Favorites GET did not return array');

    await jsonFetch('/api/favorites', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ favorites: favList }),
    });
    console.log('[smoke] favorites GET/PUT ok');
  } else {
    console.log('[smoke] favorites skipped (no auth token)');
  }

  // 6) Password reset request
  const resetReq = await jsonFetch('/api/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  console.log('[smoke] request-password-reset ok');

  // 7) Reset password (only if dev-echo token returned)
  const resetToken = resetReq?.resetToken;
  if (resetToken) {
    await jsonFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, newPassword: password2 }),
    });
    console.log('[smoke] reset-password ok');

    // 8) Login with new password (only if verified)
    if (verificationToken) {
      const login2 = await jsonFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password: password2 }),
      });
      if (!login2?.token) throw new Error('Missing token from login after reset');
      console.log('[smoke] login after reset ok');
    } else {
      console.log('[smoke] login after reset skipped (email not verified; no dev echo token)');
    }
  } else {
    console.log('[smoke] reset-password skipped (no dev echo token)');
  }

  console.log('[smoke] ✅ all done');
}

main().catch((err) => {
  console.error('[smoke] ❌ failed');
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});

