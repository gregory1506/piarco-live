import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// In dev, /api/* is served by the deployed Cloudflare Pages Functions so the
// board shows real schedule data without a local AeroAPI key. METAR is proxied
// straight to aviationweather.gov, mirroring functions/api/metar.ts.
const apiOrigin = process.env.PIARCO_API_ORIGIN ?? 'https://piarco-live.pages.dev';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/metar': {
        target: 'https://aviationweather.gov',
        changeOrigin: true,
        rewrite: () => '/api/data/metar?ids=TTPP,TTCP&format=json',
      },
      '/api': { target: apiOrigin, changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
