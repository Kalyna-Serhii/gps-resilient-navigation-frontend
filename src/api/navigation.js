export async function getNavigationData() {
  const response = await fetch('/api/navigation');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
