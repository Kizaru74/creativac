// main.js

// ----------------------------------------------------------------------
// 1. IMPORTACIONES
// ----------------------------------------------------------------------

// Importa los estilos CSS/Tailwind que deben ser procesados por Vite
// NOTA: Esta línea ya no causará el error MIME porque el 'build' ahora funciona.
import './style.css'; 

// Importa el SDK de Supabase (Asumiendo que ya está instalado: npm install @supabase/supabase-js)
// import { createClient } from '@supabase/supabase-js'; 

// ----------------------------------------------------------------------
// 2. CONFIGURACIÓN DE SUPABASE (Reemplazar con tus credenciales reales)
// ----------------------------------------------------------------------

/*
const SUPABASE_URL = 'TU_URL_DE_PROYECTO_AQUÍ';
const SUPABASE_ANON_KEY = 'TU_CLAVE_ANÓNIMA_DE_PROYECTO_AQUÍ';

// Inicializa el cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
*/

// ----------------------------------------------------------------------
// 3. LÓGICA PRINCIPAL (Ejecución Segura al Cargar el DOM)
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // Muestra el contenido del BODY, resolviendo el problema FOUC (Parpadeo)
    document.body.classList.remove('loading-hide'); 

    // --------------------------------------------------------
    // A. LÓGICA DE CIERRE DE SESIÓN (Ejemplo)
    // --------------------------------------------------------
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Intentando cerrar sesión...");
            
            // Lógica de Supabase:
            /*
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Error al cerrar sesión:", error.message);
            } else {
                // Redirigir al usuario a la página de inicio de sesión
                window.location.href = '/login'; 
            }
            */
           
        });
    }

    // --------------------------------------------------------
    // B. CARGA DE DATOS DEL DASHBOARD (Función principal)
    // --------------------------------------------------------
    
    // Aquí es donde llamarías a la función para obtener datos de Supabase
    // loadDashboardData(); 

    /*
    async function loadDashboardData() {
        // Ejemplo de fetch de datos desde Supabase
        const { data: salesData, error } = await supabase
            .from('sales')
            .select('*');

        if (error) {
            console.error("Error al obtener datos:", error.message);
            return;
        }

        console.log("Datos de ventas recibidos:", salesData);
        // Función para actualizar los KPIs y Gráficos
        // updateKPIs(salesData);
        // renderCharts(salesData);
    }
    */
});