// vite.config.js

// 1. SOLO UNA VEZ: IMPORTAR defineConfig
import { defineConfig } from 'vite';

// Usamos el nombre del repositorio para la base URL
const REPO_NAME = 'creativac'; 

export default defineConfig({
  // 1. Base URL: Necesaria para que GitHub Pages (subdirectorio) encuentre los assets
  base: `/${REPO_NAME}/`, 
  
  build: {
    // 2. outDir: CRÍTICO para que el sitio se despliegue en la raíz de la rama de GH Pages
    outDir: '.', 
    
    // 3. Rollup Options: Corrige el error de "failed to resolve import"
    rollupOptions: {
      external: (id) => {
        // Ignora cualquier importación que parezca una ruta absoluta de asset
        return id.startsWith(`/${REPO_NAME}/assets/`);
      },
      // Configuración de salida (esto se mantiene simple)
      output: {
        assetFileNames: 'assets/[name]-[hash].[ext]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [],
});