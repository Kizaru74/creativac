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
        // **CRÍTICO:** Forzar el archivo CSS a un nombre fijo y a la raíz de 'docs'
        assetFileNames: (assetInfo) => {
          // Si es CSS, nombrar siempre "style.css" y ponerlo en la raíz de "docs/"
          if (assetInfo.name === 'style.css' || assetInfo.name.endsWith('.css')) {
            return 'style.css'; // Esto lo deja en la raíz de 'docs/'
          }
          // Para todo lo demás (JS, etc.), usar la ruta normal en assets/
          return 'assets/[name]-[hash].[ext]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [],
});