// main.js

// ----------------------------------------------------------------------
// 1. ESTILOS Y DEPENDENCIAS
// ----------------------------------------------------------------------

// Importa los estilos CSS/Tailwind que deben ser procesados por Vite
// Esta línea es NECESARIA para que Vite sepa qué CSS compilar.
import './style.css'; 

// Importa el SDK de Supabase (Si ya hiciste 'npm install @supabase/supabase-js')
// Descomenta la siguiente línea y la configuración si ya instalaste el SDK.
// import { createClient } from '@supabase/supabase-js'; 

// ----------------------------------------------------------------------
// 2. CONFIGURACIÓN DE SUPABASE (Reemplazar con tus credenciales)
// ----------------------------------------------------------------------

/*
// Descomenta y reemplaza estas líneas:
const SUPABASE_URL = 'https://[TU_ID_PROYECTO].supabase.co';
const SUPABASE_ANON_KEY = 'TU_CLAVE_ANÓNIMA_LARGA_AQUÍ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
*/


// ----------------------------------------------------------------------
// 3. LÓGICA PRINCIPAL (Ejecución Segura y FOUC Fix)
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // **CORRECCIÓN FOUC:** Quita la clase de ocultamiento del body para mostrar el contenido
    // Esto asegura que los estilos CSS se han aplicado antes de que el contenido sea visible.
    document.body.classList.remove('loading-hide'); 

    // --------------------------------------------------------
    // A. LÓGICA DE EVENTOS (Ejemplo)
    // --------------------------------------------------------
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Cerrando sesión (Lógica de Supabase va aquí)...");
            // Aquí iría el código: await supabase.auth.signOut();
        });
    }

    // --------------------------------------------------------
    // B. CARGA DE DATOS DEL DASHBOARD (Llamar a tu API/Supabase)
    // --------------------------------------------------------
    
    // Aquí es donde llamas a las funciones para llenar los gráficos y KPIs
    // loadDashboardData(); 
});