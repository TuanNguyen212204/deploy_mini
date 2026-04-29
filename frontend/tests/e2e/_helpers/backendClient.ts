import type { APIRequestContext } from '@playwright/test';

const DEFAULT_BACKEND_BASE_URL = 'http://localhost:8080';

function resolveBackendBaseUrl(): string {
  return process.env.E2E_BACKEND_BASE_URL || DEFAULT_BACKEND_BASE_URL;
}

export async function fetchAnyProductId(request: APIRequestContext): Promise<string> {
  const base = resolveBackendBaseUrl();

  // Ưu tiên endpoint /api/products/search (theo swagger)
  const candidates: Array<{ url: string }> = [
    { url: `${base}/api/products/search?q=kem` },
    { url: `${base}/api/products/search?q=son` },
    { url: `${base}/api/products/search?q=serum` },
    // Fallback legacy
    { url: `${base}/products/search?q=kem` },
  ];

  for (const c of candidates) {
    const res = await request.get(c.url, { headers: { Accept: 'application/json' } });
    if (!res.ok()) continue;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) continue;

    const first = data[0] as any;
    const id = first?.id ?? first?.productId ?? first?.product_id;
    if (id != null && String(id).trim().length > 0) return String(id);
  }

  throw new Error(
    'Không lấy được productId từ backend. Hãy đảm bảo backend local có data và endpoint /api/products/search hoạt động.',
  );
}

