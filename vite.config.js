// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  // 1. CRÍTICO: Definir la base URL para el subdirectorio de GitHub Pages
  base: '/creativac/', 
  
  build: {
    outDir: 'docs', // Carpeta de salida para GitHub Pages
    emptyOutDir: true, 

    rollupOptions: {
      input: 'index.html', 
      output: {
        // Asegura que los assets se llamen con el hash y el nombre correcto
        assetFileNames: 'assets/[name]-[hash].[ext]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [],
});