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
let allProducts = []; 
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const appContainer = document.getElementById('app-container');
const profileUpdateForm = document.getElementById('profile-update-form');

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
    document.getElementById(id)?.classList.remove('hidden');
};

/** Oculta un modal por su ID. */
const hideModal = (id) => {
    document.getElementById(id)?.classList.add('hidden');
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
        if (formId === 'login-form') button.textContent = 'Acceder';
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
};

/** Muestra la vista de autenticación y oculta la aplicación. */
function showAuthScreen() {
    if (authModal) authModal.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');
}

/** Oculta la vista de autenticación y muestra la aplicación. */
function showAppScreen() {
    if (authModal) authModal.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
    loadDashboardData(); 
}

// ----------------------------------------------------------------------
// 3. LÓGICA DE AUTENTICACIÓN Y PERFIL
// ----------------------------------------------------------------------

function showPasswordResetForm() {
    const newPassword = prompt("✅ ¡Enlace de restablecimiento aceptado! Por favor, introduce tu **NUEVA** contraseña (mínimo 6 caracteres):");

    if (newPassword && newPassword.length >= 6) {
        updateUserPassword(newPassword);
    } else if (newPassword) {
         alert("Contraseña inválida o muy corta (mín. 6).");
    } else {
        alert("Contraseña cancelada. La sesión ha sido cerrada por seguridad.");
        supabase.auth.signOut(); 
    }
}

async function updateUserPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) {
        alert(`Error al cambiar la contraseña: ${error.message}`);
    } else {
        alert("🥳 ¡Contraseña actualizada con éxito! Sesión iniciada.");
        loadDashboardData();
    }
}

function initializeAuthListener() {
    supabase.auth.onAuthStateChange((event, session) => {
        
        console.log(`Estado de autenticación: ${event}`);

        if (event === 'PASSWORD_RECOVERY') {
            showPasswordResetForm(); 

        } else if (session) {
            showAppScreen();
            
        } else {
            showAuthScreen();
        }
    });
}

// Manejar el inicio de sesión por formulario
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('login-form', true);
    
    const loginIdentifier = document.getElementById('login-identifier').value.trim(); 
    const password = document.getElementById('login-password').value;
    let emailToLogin = loginIdentifier;
    
    // Búsqueda por Nombre de Usuario si no contiene '@'
    if (!loginIdentifier.includes('@')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', loginIdentifier)
            .single();

        if (profile && profile.email) {
            emailToLogin = profile.email;
        } else {
            alert("Error: Nombre de Usuario no encontrado o credenciales inválidas.");
            toggleLoading('login-form', false);
            return;
        }
    } 
    
    // Ejecutar el inicio de sesión con el email y contraseña
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password: password,
    });

    if (loginError) {
        alert(`Error al iniciar sesión: Credenciales inválidas. Verifica tu email y contraseña.`);
    } 
    
    toggleLoading('login-form', false);
});

// Manejar el cierre de sesión 
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
});

// Lógica de perfil (Actualización de username y password)
async function loadUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; 

    document.getElementById('profile-email-display').textContent = user.email;

    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
    
    if (profile && profile.username) {
        document.getElementById('profile-username-input').value = profile.username;
    } else {
         document.getElementById('profile-username-input').value = user.email.split('@')[0]; 
    }
    
    document.getElementById('profile-new-password').value = ''; 
    showModal('user-profile-modal');
}

profileUpdateForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newUsername = document.getElementById('profile-username-input').value.trim();
    const newPassword = document.getElementById('profile-new-password').value.trim();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let changesMade = false;

    // A. Actualizar Nombre de Usuario
    if (newUsername.length >= 3) {
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: user.id, username: newUsername, email: user.email }, { onConflict: 'id' });
        
        if (!profileError) changesMade = true;
    }

    // B. Actualizar Contraseña
    if (newPassword.length >= 6) {
        const { error: passwordError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (!passwordError) {
            changesMade = true;
            document.getElementById('profile-new-password').value = '';
        }
    }
    
    if (changesMade) {
        alert("¡Perfil actualizado con éxito!");
        hideModal('user-profile-modal');
    } else {
        alert("No se detectaron cambios válidos o la contraseña es muy corta (mín. 6).");
    }
});


// ----------------------------------------------------------------------
// 4. MANEJO DE DATOS Y RENDERIZADO (¡LÓGICA CORREGIDA PARA MOSTRAR DATOS!)
// ----------------------------------------------------------------------

/** Renderiza la lista de deudas en la tabla. */
function renderDebts(clients) {
    const debtListBody = document.getElementById('debt-list'); // tbody id="debt-list"
    if (!debtListBody) return; 

    // Limpiar contenido anterior
    debtListBody.innerHTML = ''; 

    // Si no hay datos, mostrar un mensaje
    if (!clients || clients.length === 0) {
        debtListBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay deudas pendientes registradas.</td></tr>';
        return;
    }

    clients.forEach(client => {
        // Aseguramos el uso de las propiedades exactas del JSON
        const formattedDebt = formatter.format(client.debt);
        const debtDate = new Date(client.lastUpdate).toLocaleDateString();

        const row = `
            <tr class="hover:bg-red-50">
                <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
                <td class="p-4 whitespace-nowrap text-sm font-bold text-red-600">${formattedDebt}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${debtDate}</td>
                
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">
                    <button 
                        data-client-id="${client.id}" 
                        data-debt-amount="${client.debt}"
                        class="quick-edit-debt-btn text-blue-600 hover:text-blue-800"
                        title="Ver Detalle de Ventas">
                        🔎 Detalle
                    </button>
                </td>
            </tr>
        `;
        debtListBody.innerHTML += row;
    });
}

/** Renderiza la lista de ventas en la tabla. */
function renderSales(sales) {
    const salesListBody = document.getElementById('sales-list'); // tbody id="sales-list"
    if (!salesListBody) return;

    salesListBody.innerHTML = ''; // Limpiar contenido
    
    // Si no hay datos, mostrar un mensaje
    if (!sales || sales.length === 0) {
        salesListBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';
        return;
    }

    // Encabezado de la tabla (solo si hay datos)
    const tableHeader = document.querySelector('#sales-list').parentElement.querySelector('thead');
    tableHeader.innerHTML = `
        <tr class="bg-gray-50">
            <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cliente</th>
            <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Monto</th>
            <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Descripción</th>
            <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha</th>
            <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Acción</th>
        </tr>
    `;


    sales.forEach(sale => {
        const formattedAmount = formatter.format(sale.amount);
        const saleDate = new Date(sale.date).toLocaleString();

        const row = `
            <tr class="hover:bg-gray-50">
                <td class="p-4">${sale.clientname || 'N/A'}</td>
                <td class="p-4 font-medium">${formattedAmount}</td>
                <td class="p-4 text-sm text-gray-500">${sale.description || 'Sin descripción'}</td>
                <td class="p-4 text-sm">${saleDate}</td>
                <td class="p-4"><button data-id="${sale.id}" class="text-indigo-600 hover:text-indigo-900">Editar</button></td>
            </tr>
        `;
        salesListBody.innerHTML += row;
    });
}


async function loadDashboardData() {
    // 1. Obtener datos de ventas
    const { data: sales, error: salesError } = await supabase
        .from('ventas') 
        .select('*')
        .order('date', { ascending: false })
        .limit(10); 

    // 2. Obtener datos de clientes/deudas
    const { data: clients, error: clientsError } = await supabase
        .from('clientes') 
        .select('*'); 

    if (salesError || clientsError) {
        console.error("Error al obtener datos: ", salesError || clientsError);
        // Si hay error, limpiar las tablas con mensaje de error
        renderSales([]); 
        renderDebts([]); 
        return;
    }

    // LLAMADAS CRÍTICAS PARA MOSTRAR LA INFORMACIÓN:
    renderSales(sales); 
    renderDebts(clients); 

    // updateSummary(sales, clients); // (Esta función aún no está implementada)
}


// ----------------------------------------------------------------------
// 5. INICIALIZACIÓN Y LISTENERS DE EVENTOS
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // Conectar botones de Modales (Perfil y Admin)
    const openProfileModalBtn = document.getElementById('openProfileModalBtn');
    const closeProfileModal = document.getElementById('closeProfileModal');
    
    // Conectar botones de Modales
    openProfileModalBtn?.addEventListener('click', loadUserProfile);
    closeProfileModal?.addEventListener('click', () => hideModal('user-profile-modal'));

    // ... (Conectar otros botones como addProductAdminBtn, closeProductAdminModal, etc.)

    // **Llamada de inicio para verificar la sesión**
    initializeAuthListener(); 
});