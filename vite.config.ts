import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registro do SW como script externo (registerSW.js) para ser compativel com
      // o CSP 'script-src self' (evita script inline). Nginx ja serve registerSW.js.
      injectRegister: 'script',
      // Don't inject manifest link - we handle it dynamically for catalog pages
      injectManifest: undefined,
      includeAssets: ['mv64x64p.png', 'mv512x512p.png', 'mv512x512pretoFundoBranco.png', 'mv180x180p.png', 'og-image.png'],
      manifest: {
        name: 'Mercado Virtual',
        short_name: 'Mercado Virtual',
        description: 'Seu catalogo online de produtos',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        id: '/',
        icons: [
          {
            src: 'mv192x192p.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'mv512x512p.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'mv512x512pretoFundoBranco.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    }),
    // Injeta Content-Security-Policy como <meta> APENAS no build de producao.
    // Fica fora do dev (apply: 'build') porque o HMR do Vite usa inline/eval/ws,
    // que um CSP estrito bloquearia. Mitiga XSS: script-src 'self' (sem inline).
    // Nota: frame-ancestors/form-action sao ignorados em meta CSP - clickjacking
    // e coberto por X-Frame-Options no Nginx.
    {
      name: 'inject-csp-meta',
      apply: 'build',
      transformIndexHtml(html: string) {
        const csp = [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
          "worker-src 'self' blob:",
          "manifest-src 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
        ].join('; ');
        return html.replace(
          '</title>',
          `</title>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`
        );
      },
    },
  ],
})
