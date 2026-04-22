import axios, { AxiosError, type AxiosInstance } from 'axios';

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const trimmed = raw != null ? String(raw).trim().replace(/\/$/, '') : '';
  if (trimmed.length === 0) return '/api';

  try {
    const u = new URL(trimmed);
    const p = u.pathname.replace(/\/$/, '');
    if (p === '' || p === '/') {
      u.pathname = '/api';
      return u.toString().replace(/\/$/, '');
    }
    if (!p.endsWith('/api') && !p.includes('/api/')) {
      u.pathname = `${p}/api`;
      return u.toString().replace(/\/$/, '');
    }
  } catch {
    // Not an absolute URL (could be '/api' or relative) -> leave as is
  }
  return trimmed;
}

export const API_BASE_URL = resolveBaseUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  console.log(
    '[api][req]',
    config.method?.toUpperCase(),
    `${config.baseURL ?? ''}${config.url ?? ''}`,
    config.params ?? '',
  );
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    console.log('[api][res]', res.status, res.config.url);
    return res;
  },
  (err: AxiosError) => {
    console.error(
      '[api][err]',
      err.config?.method?.toUpperCase(),
      err.config?.url,
      '→',
      err.response?.status ?? 'NETWORK',
      err.message,
    );
    return Promise.reject(err);
  },
);

export default apiClient;
