import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['centsy-icon.svg', 'centsy-logo.svg', 'robots.txt', 'sitemap.xml'],
      manifest: {
        name: 'Centsy',
        short_name: 'Centsy',
        description:
          'Centsy is an AI finance app for planning bills, tracking spending, and staying ahead of cash flow.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/centsy-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
