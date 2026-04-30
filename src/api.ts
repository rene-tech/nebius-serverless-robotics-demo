const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function apiPath(path: string) {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiPath(path), init);
}
