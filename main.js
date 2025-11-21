// main.js

import './style.css'; 
import { createClient } from '@supabase/supabase-js'; 

// ----------------------------------------------------------------------
// 1. CONFIGURACIÓN DE SUPABASE (¡REEMPLAZAR!)
// ----------------------------------------------------------------------

const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales para la interfaz y datos
const allProducts = [];
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const appContainer = document.getElementById('app-container');

// ----------------------------------------------------------------------
// 2. UTILIDADES DE LA INTERFAZ DE USUARIO Y UX
// ----------------------------------------------------------------------

// Formato de moneda en Pesos Mexicanos (MXN)
const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN', 
});

/** Muestra un modal por su ID. */
const showModal = (id) => {
    document.getElementById(id).classList.remove('hidden');
};

/** Oculta un modal por su ID. */
const hideModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};

/** Muestra/Oculta el estado de carga en los botones */
const toggleLoading = (formId, isLoading) => {
    const button = document.querySelector(`#${formId} button[type="submit"]`);
    if (!button) return;

    if (isLoading) {
        button.disabled = true;
        button.textContent = 'Procesando...'; 
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        button.disabled = false;
        // Restaurar el texto original del botón
        if (formId === 'add-sale-form') button.textContent = 'Registrar';
        if (formId === 'update-debt-form') button.textContent = 'Registrar Abono'; 
        if (formId === 'edit-sale-form') button.textContent = 'Guardar Cambios';
        if (formId === 'add-product-form') {
            const title = document.getElementById('product-form-title').textContent;
            button.textContent = title.includes('Editar') ? 'Guardar Cambios' : 'Guardar Producto';
        }
        if (formId === 'login-form') button.textContent = 'Acceder';
        
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
};

// ----------------------------------------------------------------------
// 3. LÓGICA DE AUTENTICACIÓN
// ----------------------------------------------------------------------

/** Muestra la vista de autenticación y oculta la aplicación. */
function showAuthScreen() {
    if (authModal) authModal.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');
}

/** Oculta la vista de autenticación y muestra la aplicación. */
function showAppScreen() {
    if (authModal) authModal.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
    // Solo cargamos los datos si el usuario está autenticado
    loadDashboardData(); 
}

/** Verifica si hay un usuario logueado al cargar la aplicación. */
async function checkUserSession() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        console.log("Usuario autenticado. Cargando aplicación.");
        showAppScreen();
    } else {
        console.log("No hay usuario. Mostrando pantalla de login.");
        showAuthScreen();
    }
}

// 1. Manejar el inicio de sesión
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('login-form', true);
    
    const loginIdentifier = document.getElementById('login-identifier').value.trim(); // Puede ser username o email
    const password = document.getElementById('login-password').value;

    if (!loginIdentifier || !password) {
        alert("Por favor, introduce tu Nombre de Usuario/Email y Contraseña.");
        toggleLoading('login-form', false);
        return;
    }
    
    let emailToLogin = loginIdentifier;
    
    // Si no parece un correo (no tiene @), asumimos que es un nombre de usuario.
    if (!loginIdentifier.includes('@')) {
        // Buscamos el email asociado al nombre de usuario en la tabla profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', loginIdentifier)
            .single();

        if (profileError || !profile) {
            alert("Error: Nombre de Usuario no encontrado o credenciales inválidas.");
            console.error('Profile search error:', profileError);
            toggleLoading('login-form', false);
            return;
        }

        // --- IMPORTANTE: Para obtener el email desde el frontend, necesitas permisos RLS especiales,
        // --- o usar la ID para buscar la sesión. En este caso, usaremos la ID y esperaremos a 
        // --- que el sign-in con email falle si la contraseña es incorrecta.
        
        // Dado que no podemos usar auth.admin.getUserById con la clave ANON en frontend,
        // necesitamos que el email esté accesible para el usuario. Asumiremos
        // que el 'username' y el 'email' están en una tabla que podemos buscar
        // o que el usuario debe usar el email para el login si no se implementa una RPC.
        
        // Para simplificar y dado que la base es el email, debemos revertir a buscar el email 
        // asociado a la ID del perfil. Esto requiere un nivel de acceso que la clave ANÓNIMA no tiene.
        // **Para que esto funcione en un ambiente puro frontend, Supabase debe permitir la búsqueda
        // segura de la ID de usuario a partir del 'username' en la tabla 'profiles'.**
        
        // Si tienes la tabla 'profiles' con una política RLS que permite a TODOS leer, puedes buscar la ID
        // Luego, en lugar de buscar el email, el usuario DEBE usar el email, o requerirá RPC/Edge.
        
        // Para que esto funcione SIN RPC/Edge, necesitamos que el username sea el EMAIL o forzar el uso del email.
        
        // Como solución de compromiso para mantener el código simple:
        // Si se encuentra el profile, el email se encuentra en 'auth.users' por la ID.
        // Asumiremos que el email es el mismo que el 'username' para evitar la complejidad del ADMIN_KEY.
        
        // Si no tienes acceso a la ID de auth.users, la única forma de conseguir el email es si lo pones en la tabla 'profiles'
        // Por seguridad, usaremos la ID y asumiremos que, si la ID del perfil existe, la cuenta es válida. 
        
        // **SI EL FLUJO ANTERIOR NO FUNCIONA POR PERMISOS, LA SOLUCIÓN MÁS SIMPLE ES FORZAR EL USO DEL EMAIL AQUÍ:**
        alert("Error: Solo se permite iniciar sesión con Correo Electrónico en esta versión por motivos de seguridad RLS en el navegador. Por favor, usa tu email.");
        toggleLoading('login-form', false);
        return;
    }
    
    // Si contiene '@', lo tratamos como un email normal
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password: password,
    });

    if (loginError) {
        alert(`Error al iniciar sesión: Credenciales inválidas. Verifica tu email y contraseña.`);
        console.error('Login error:', loginError);
    } else {
        showAppScreen();
    }
    
    toggleLoading('login-form', false);
});

// 2. Manejar el cierre de sesión 
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Logout error:', error);
    } else {
        // Limpiar y volver a la pantalla de login
        document.getElementById('sales-list').innerHTML = ''; 
        document.getElementById('debt-list').innerHTML = ''; 
        showAuthScreen();
    }
});


// ----------------------------------------------------------------------
// 4. MANEJO DE DATOS Y RENDERIZADO (El código de la aplicación)
// ----------------------------------------------------------------------

async function loadDashboardData() {
    // Si no hay sesión activa, evitamos la carga de datos
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        document.body.classList.remove('loading-hide');
        return;
    }

    // Carga de productos garantizada al inicio
    await loadProductsAndPopulate();
    
    // 1. Obtener datos de ventas
    const { data: sales, error: salesError } = await supabase
        .from('ventas') 
        .select('*')
        .order('date', { ascending: false }); 

    // 2. Obtener datos de clientes/deudas
    const { data: clients, error: clientsError } = await supabase
        .from('clientes') 
        .select('*'); 

    if (salesError || clientsError) {
        console.error("Error al obtener datos: ", salesError || clientsError);
        document.body.classList.remove('loading-hide');
        return;
    }

    updateSummary(sales, clients);
    renderSales(sales);
    renderDebts(clients);
}


// --- LÓGICA DE PRODUCTOS Y SELECTORES ENCADENADOS ---

/** Carga productos y llena los selectores de Venta y Administración */
async function loadProductsAndPopulate() {
    const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('type', { ascending: true }) 
        .order('name', { ascending: true });

    if (error) {
        console.error("Error al cargar productos:", error);
        return;
    }
    
    // allProducts = data; // Si estuviera definida globalmente con let
    // ... resto de la lógica de loadProductsAndPopulate ...
    // (Por brevedad, se omite el resto de la función si no hay cambios)
}


// --- LÓGICA DE RENDERIZADO DEL DASHBOARD ---

// ... (updateSummary, renderSales, renderDebts, etc. van aquí, incluyendo las correcciones de minúsculas) ...

/** Renderiza la lista de deudas. */
function renderDebts(clients) {
    const listEl = document.getElementById('debt-list');
    if (!listEl) return;

    const debtors = clients.filter(client => (client.debt || 0) > 0);
    
    const tbody = listEl.tagName === 'TBODY' ? listEl : (listEl.querySelector('tbody') || listEl); 
    tbody.innerHTML = ''; 

    if (debtors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">¡Felicidades! No hay deudas pendientes.</td></tr>`;
        return;
    }

    debtors.sort((a, b) => (b.debt || 0) - (a.debt || 0)).forEach(client => {
        const date = client.lastUpdate ? new Date(client.lastUpdate).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
        }) : 'N/A';
        
        const row = `
            <tr class="hover:bg-red-50">
                <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
                <td class="p-4 whitespace-nowrap text-sm font-bold text-red-600">${formatter.format(client.debt)}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">
                    <button 
                        data-client-name="${client.name}" 
                        data-debt-amount="${client.debt}"
                        class="quick-edit-debt-btn text-blue-600 hover:text-blue-800"
                        title="Ver Detalle de Ventas">
                        🔎 Detalle
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    
    initializeDebtActions(); 
}


// ----------------------------------------------------------------------
// 5. MANEJO DE FORMULARIOS Y ACCIONES (Incluye correcciones de minúsculas)
// ----------------------------------------------------------------------

// 5.1. Registrar Nueva Venta 
document.getElementById('add-sale-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('add-sale-form', true); 
    
    // ... (Validaciones) ...
    
    // 1. REGISTRAR VENTA
    // ...
    
    // 2. ACTUALIZAR/INSERTAR DEUDA DEL CLIENTE
    
    // ...
    
    // 3. REGISTRAR MOVIMIENTO DE CARGO (Venta)
    if (!debtError) {
        const { error: movementError } = await supabase.from('movimientos_deuda').insert({
            clientname: clientName, // **CORREGIDO**
            amount: amount, 
            type: 'CARGO',
            olddebt: currentDebt, // **CORREGIDO**
            newdebt: newDebt, // **CORREGIDO**
            date: new Date().toISOString()
        });
        
        if (movementError) {
            console.error("Error al registrar el movimiento de cargo (venta):", movementError);
        }
    }

    // ... (Finalización) ...
    toggleLoading('add-sale-form', false); 
});

// 5.2. Actualizar/Insertar Deuda o Registrar Abono (MODIFICADO y CORREGIDO)
document.getElementById('update-debt-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('update-debt-form', true); 
    
    // ... (Lógica de cálculo) ...

    // 1. ACTUALIZAR DEUDA EN LA TABLA 'clientes'
    // ...

    // 2. REGISTRAR MOVIMIENTO EN LA NUEVA TABLA 'movimientos_deuda'
    if (!debtUpdateError && movementAmount !== 0) {
         const { error: movementError } = await supabase.from('movimientos_deuda').insert({
            clientname: clientName, // **CORREGIDO**
            amount: movementAmount,
            type: movementType,
            olddebt: currentDebt, // **CORREGIDO**
            newdebt: finalDebtAmount, // **CORREGIDO**
            date: new Date().toISOString()
         });
         
         if (movementError) {
             console.error("Error al registrar el movimiento de deuda:", movementError);
         }
    }

    // ... (Finalización) ...
    toggleLoading('update-debt-form', false); 
});

// 5.3. Lógica para cargar ventas y movimientos (CORREGIDO)
/**
 * Carga las ventas y el historial de movimientos de deuda de un cliente.
 */
async function loadClientSales(clientName, debtAmount) {
    // ... (Inicialización y carga de ventas) ...

    // --- 2. Obtener Movimientos de Deuda (ABONOS/AJUSTES) ---
    const { data: movements, error: movementsError } = await supabase
        .from('movimientos_deuda')
        .select('*')
        .eq('clientname', clientName) // **CORREGIDO**: Usar 'clientname'
        .order('date', { ascending: false });


    if (salesError || movementsError) {
        // ... (Manejo de errores) ...
        return;
    }
    
    // ... (Renderizar ventas) ...

    // --- RENDERIZAR MOVIMIENTOS DE DEUDA ---
    // ... (Lógica de renderizado) ...
    if (movementsListEl) {
        const movementsHtml = movements.map(move => {
            // ... (Lógica de formato) ...
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="p-3 whitespace-nowrap text-xs text-gray-500">${date}</td>
                    <td class="p-3 whitespace-nowrap text-sm ${styleClass}">${amountDisplay}</td>
                    <td class="p-3 text-sm text-gray-800">${typeDisplay}</td>
                    <td class="p-3 whitespace-nowrap text-sm text-red-700 font-semibold">${formatter.format(move.newdebt || 0)}</td> </tr>
            `;
        }).join('');

        if (movements.length === 0) {
             // ... (Mensaje de sin movimientos) ...
        } else {
            movementsListEl.innerHTML = movementsHtml;
        }
    }
}


// ... (El resto de funciones como initializeDebtActions, etc. se mantienen igual si no hay más correcciones de minúsculas) ...


// ----------------------------------------------------------------------
// 6. INICIALIZACIÓN Y LISTENERS DE EVENTOS
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // ... (Conectar botones y listeners existentes) ...

    // Conectar el botón de salir (simulado con recarga)
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        // La lógica de logout ya está en la sección 3 (Autenticación)
        // ...
    });

    // **Llamada de inicio para verificar la sesión**
    checkUserSession(); 
});