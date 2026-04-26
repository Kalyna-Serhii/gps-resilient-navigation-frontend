import { apiRequest } from './client';

export async function getRoutePois(routeId, routeIndex = 0) {
  const response = await apiRequest(`/api/routes/${routeId}/pois?routeIndex=${routeIndex}`);
  if (!response.ok) throw new Error('Failed to load POIs');
  return response.json();
}
