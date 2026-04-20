import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage } from 'node:http';

// ==========================================================================
// Vite config — hardened sau khi merge
// --------------------------------------------------------------------------
// Mục tiêu:
//   1. Proxy `/api` → Spring Boot :8080 (endpoint mới, ví dụ
//      `/api/trending-deals`, `/api/products/search`, `/api/compare/:id`, …).
//   2. Proxy `/products` → Spring Boot :8080 để giữ tương thích với FE legacy
//      (một số service/page cũ vẫn gọi thẳng `/products/search`).
//   3. `watch.usePolling` = true → fix bug đặc thù Windows / OneDrive / WSL /
//      network drive không bắn được fs event, khiến HMR "đứng im".
//   4. Log mỗi request proxy (`[vite-proxy][...]`) để dễ debug 500 / CORS.
// ==========================================================================

function attachProxyLogger(prefix: string) {
  // Trả về callback `configure` của http-proxy để in log mỗi lần proxy.
  return (proxy: {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
  }) => {
    proxy.on('error', (err: unknown) => {
      console.error(`[vite-proxy][${prefix}] error:`, (err as Error)?.message ?? err);
    });
    proxy.on('proxyReq', (_proxyReq: unknown, req: unknown) => {
      const r = req as IncomingMessage;
      console.log(`[vite-proxy][${prefix}] →`, r.method, r.url);
    });
    proxy.on('proxyRes', (proxyRes: unknown, req: unknown) => {
      const r = req as IncomingMessage;
      const status = (proxyRes as { statusCode?: number }).statusCode ?? '-';
      console.log(`[vite-proxy][${prefix}] ←`, status, r.method, r.url);
    });
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    strictPort: false,
    host: true, // cho phép truy cập từ máy khác trong LAN / Docker
    watch: {
      // Fix HMR không hoạt động trên Windows / OneDrive / WSL.
      usePolling: true,
      interval: 300,
    },
    proxy: {
      // --- Endpoint mới `/api/**` -------------------------------------------
      // Ví dụ: /api/trending-deals, /api/products/search, /api/compare/:id,
      //        /api/v1/price-history/:id, /api/wishlist, …
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: attachProxyLogger('/api'),
        // Chỉ phòng hờ response 500 từ backend vẫn trả body rõ ràng,
        // không cần rewrite path (backend đã có `/api/**`).
      },

      // --- Endpoint legacy `/products/**` -----------------------------------
      // `ProductController` hiện đã mount cả `/products` + `/api/products`,
      // nhưng FE cũ vẫn có chỗ gọi `fetch('http://localhost:8080/products/…')`.
      // Giữ proxy này để migration dần không vỡ.
      '/products': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: attachProxyLogger('/products'),
      },
    },
  },

  build: {
    sourcemap: true,
  },
});
