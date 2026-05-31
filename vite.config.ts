import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Evita que o Vite oscureça mensagens de erro do Rust
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Ignora mudanças no código Rust (o Tauri CLI cuida disso)
      ignored: ['**/src-tauri/**'],
    },
  },
}))
