// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  // Mantenemos la ruta base relativa para GitHub Pages
  base: './', 
  
  build: {
    outDir: 'docs', // Carpeta de salida para el despliegue
    emptyOutDir: true, 

    rollupOptions: {
      input: 'index.html', 
      output: {
        // CRÍTICO: Sobreescribe la convención de nombres para forzar 'style.css' en la raíz de 'docs/'
        assetFileNames: (assetInfo) => {
          // Si es CSS, nombrar siempre "style.css"
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'style.css'; 
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