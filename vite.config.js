// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  // Mantenemos la ruta relativa como la más segura
  base: './', 
  
  build: {
    outDir: 'docs', // Carpeta de salida
    emptyOutDir: true, 

    rollupOptions: {
      input: 'index.html', 
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css' || assetInfo.name.endsWith('.css')) {
            return 'style.css'; 
          }
          return 'assets/[name]-[hash].[ext]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [],
});