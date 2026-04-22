import { refreshTokens } from './auth';

async function doRequest(url, options = {}, token) {
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

export async function apiRequest(url, options = {}) {
  const accessToken = localStorage.getItem('accessToken');
  let response = await doRequest(url, options, accessToken);

  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      window.location.href = '/login';
      return response;
    }

    try {
      const { accessToken: newAccess, refreshToken: newRefresh } = await refreshTokens(refreshToken);
      localStorage.setItem('accessToken', newAccess);
      localStorage.setItem('refreshToken', newRefresh);
      response = await doRequest(url, options, newAccess);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userName');
      window.location.href = '/login';
    }
  }

  return response;
}
