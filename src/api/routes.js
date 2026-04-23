import { apiRequest } from './client';

export async function getSavedRoutes() {
  const response = await apiRequest('/api/routes');
  if (!response.ok) throw new Error('Failed to load routes');
  const data = await response.json();
  return data ?? [];
}

export async function getRouteById(id) {
  const response = await apiRequest(`/api/routes/${id}`);
  if (!response.ok) throw new Error('Failed to load route');
  return response.json();
}

export async function createRoute({ name, origin, destination, alternatives = true }) {
  const response = await apiRequest('/api/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, origin, destination, alternatives }),
  });
  if (!response.ok) throw new Error('Failed to build route');
  return response.json();
}

export async function deleteRoute(id) {
  const response = await apiRequest(`/api/routes/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete route');
  return response.json();
}
