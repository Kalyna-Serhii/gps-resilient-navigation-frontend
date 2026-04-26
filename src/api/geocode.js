import { apiRequest } from './client';

export async function searchPlaces(query, limit = 5) {
  const params = new URLSearchParams({ q: query, limit });
  const response = await apiRequest(`/api/geocode/search?${params}`);
  if (!response.ok) throw new Error('Search failed');
  const data = await response.json();
  return data.results;
}

