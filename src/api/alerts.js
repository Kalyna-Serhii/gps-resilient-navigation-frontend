import { apiRequest } from './client';

export async function getAlerts() {
  const response = await apiRequest('/api/alerts');
  if (!response.ok) throw new Error('Failed to load alerts');
  return response.json();
}

export async function getAlertByLocation(lat, lng) {
  const response = await apiRequest(`/api/alerts/by-location?lat=${lat}&lng=${lng}`);
  if (!response.ok) throw new Error('Failed to load alert by location');
  return response.json();
}
