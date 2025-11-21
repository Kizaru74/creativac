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
        // Restaurar el texto original del botón de login
        if (formId === 'login-form') button.textContent = 'Acceder';
        // (Añadir lógica para restaurar otros botones si es necesario)
        
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

/** Muestra un formulario simple para que el usuario ingrese la nueva contraseña */
function showPasswordResetForm() {
    // Si tienes un modal dedicado en index.html, úsalo aquí.
    const newPassword = prompt("✅ ¡Enlace de restablecimiento aceptado! Por favor, introduce tu **NUEVA** contraseña:");

    if (newPassword && newPassword.length >= 6) {
        updateUserPassword(newPassword);
    } else if (newPassword) {
         alert("La contraseña debe tener al menos 6 caracteres.");
    } else {
        alert("Contraseña cancelada. La sesión ha sido cerrada por seguridad.");
        // Forzamos el cierre de sesión si el usuario no cambia la clave
        supabase.auth.signOut(); 
    }
}

/** Llama a la API de Supabase para actualizar la contraseña */
async function updateUserPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) {
        alert(`Error al cambiar la contraseña: ${error.message}`);
    } else {
        alert("🥳 ¡Contraseña actualizada con éxito! Sesión iniciada.");
        // Ya que la sesión está activa, simplemente cargamos el dashboard
        loadDashboardData();
    }
}

/** Escucha los cambios de sesión (login, logout, token, recuperación) */
function initializeAuthListener() {
    
    // Escucha cualquier cambio en el estado de autenticación
    supabase.auth.onAuthStateChange((event, session) => {
        
        console.log(`Estado de autenticación: ${event}`);

        // Caso 1: El usuario acaba de hacer clic en el enlace de restablecimiento
        if (event === 'PASSWORD_RECOVERY') {
            // Se debe mostrar el formulario para ingresar la nueva clave
            showPasswordResetForm(); 

        } else if (session) {
            // Caso 2: Usuario con sesión activa (LOGGED_IN, TOKEN_REFRESHED)
            showAppScreen();
            
        } else {
            // Caso 3: Usuario sin sesión (SIGNED_OUT)
            showAuthScreen();
        }
    });
}


// 1. Manejar el inicio de sesión por formulario
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('login-form', true);
    
    const loginIdentifier = document.getElementById('login-identifier').value.trim(); 
    const password = document.getElementById('login-password').value;

    if (!loginIdentifier || !password) {
        alert("Por favor, introduce tu Nombre de Usuario/Email y Contraseña.");
        toggleLoading('login-form', false);
        return;
    }
    
    let emailToLogin = loginIdentifier;
    
    // Si no parece un correo (no tiene @), asumimos que es un nombre de usuario.
    if (!loginIdentifier.includes('@')) {
        // Buscamos el email asociado al nombre de usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email') // Asumimos que también guardaste el email en profiles para facilitar la búsqueda
            .eq('username', loginIdentifier)
            .single();

        if (profileError || !profile || !profile.email) {
            alert("Error: Nombre de Usuario no encontrado o credenciales inválidas.");
            console.error('Profile search error:', profileError);
            toggleLoading('login-form', false);
            return;
        }
        
        emailToLogin = profile.email;
    } 
    
    // Ejecutar el inicio de sesión con el email y contraseña
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password: password,
    });

    if (loginError) {
        alert(`Error al iniciar sesión: Credenciales inválidas. Verifica tu email y contraseña.`);
        console.error('Login error:', loginError);
    } else {
        // El listener initializeAuthListener manejará showAppScreen()
    }
    
    toggleLoading('login-form', false);
});

// 2. Manejar el cierre de sesión 
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signOut();

    if (!error) {
        // Limpiar y volver a la pantalla de login
        document.getElementById('sales-list').innerHTML = ''; 
        document.getElementById('debt-list').innerHTML = ''; 
    }
    // El listener initializeAuthListener manejará showAuthScreen()
});


// ----------------------------------------------------------------------
// 4. MANEJO DE DATOS Y RENDERIZADO (El código de la aplicación)
// ----------------------------------------------------------------------

async function loadDashboardData() {
    // Si no hay sesión activa, el listener ya manejaría la redirección.
    
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
        return;
    }

    // Estas funciones deben existir en tu código (no incluidas aquí por brevedad)
    // updateSummary(sales, clients);
    // renderSales(sales);
    // renderDebts(clients);
}


// --- LÓGICA DE RENDERIZADO DEL DASHBOARD (EJEMPLO CORREGIDO) ---

/** Renderiza la lista de deudas. */
function renderDebts(clients) {
    const listEl = document.getElementById('debt-list');
    if (!listEl) return;

    // ... (Lógica de filtrado) ...

    debtors.forEach(client => {
        // ...
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
    
    // initializeDebtActions(); 
}


// ----------------------------------------------------------------------
// 5. MANEJO DE FORMULARIOS Y ACCIONES (Correcciones de minúsculas)
// ----------------------------------------------------------------------

// ... (Lógica para otros formularios como add-sale-form y update-debt-form) ...

// **NOTA CLAVE:** Las inserciones deben usar los nombres de columna en minúsculas:
// Ejemplo de Inserción Correcta:
/*
const { error: movementError } = await supabase.from('movimientos_deuda').insert({
    clientname: clientName, // USAR MINÚSCULAS
    amount: amount, 
    type: 'CARGO',
    olddebt: currentDebt, 
    newdebt: newDebt, // USAR MINÚSCULAS
    date: new Date().toISOString()
});
*/


// ----------------------------------------------------------------------
// 6. INICIALIZACIÓN Y LISTENERS DE EVENTOS
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // ... (Conectar botones y listeners existentes como addSaleBtn, updateDebtBtn, etc.) ...
    
    // **Llamada de inicio para verificar la sesión**
    initializeAuthListener(); 
});