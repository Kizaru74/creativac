// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  // 1. Usa BASE RELATIVA (./) para evitar la duplicación de rutas
  base: './', 
  
  build: {
    // outDir: Mantenemos la raíz para Pages
    outDir: '.', 
    
    // 2. Rollup: Simplificar para evitar el conflicto
    rollupOptions: {
      // ELIMINAR CUALQUIER FUNCIÓN 'external' O 'output' COMPLICADA
      // que mencione "/creativac/"
      output: {
        assetFileNames: 'assets/[name]-[hash].[ext]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [],
});