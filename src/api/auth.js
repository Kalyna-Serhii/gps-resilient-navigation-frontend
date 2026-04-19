async function parseError(response, fallback) {
  try {
    const body = await response.json();
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export async function register({ name, email, password }) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Registration failed'));
  }
  return response.json();
}

export async function login({ email, password }) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Login failed'));
  }
  return response.json();
}

export async function logout() {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) throw new Error(await parseError(response, 'Logout failed'));
}

export async function refreshTokens() {
  const response = await fetch('/api/auth/refresh');
  if (!response.ok) throw new Error(await parseError(response, 'Token refresh failed'));
  return response.json();
}
