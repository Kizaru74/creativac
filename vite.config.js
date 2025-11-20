// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  // Base URL para GitHub Pages
  base: '/creativac/', 
  
  build: {
    // Definir la carpeta de salida (usaremos 'docs' como en el último paso)
    outDir: 'docs', 
    emptyOutDir: true, 
    
    // Simplificamos las rollupOptions, eliminando 'input' y 'root'
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash].[ext]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [],
});