// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  // 1. ELIMINAR LA BASE: Deja que Rollup use la ruta relativa pura
  // base: '/creativac/',  // <--- ¡ELIMINAR ESTA LÍNEA!

  build: {
    outDir: 'docs', // Carpeta de salida para GitHub Pages
    emptyOutDir: true, 

    rollupOptions: {
      input: 'index.html', // Punto de entrada para el build
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