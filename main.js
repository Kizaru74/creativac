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
let allProducts = []; // Inicializamos como let para poder llenarlo
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
        if (formId === 'login-form') button.textContent = 'Acceder';
        // (Añadir lógica para restaurar otros botones si es necesario)
        
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

/** Muestra un formulario para que el usuario ingrese la nueva contraseña (PASSWORD_RECOVERY) */
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

/** Llama a la API de Supabase para actualizar la contraseña (usado en recuperación o perfil) */
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


/** Escucha los cambios de sesión (login, logout, token, recuperación) */
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
    
    // Búsqueda por Nombre de Usuario si no contiene '@'
    if (!loginIdentifier.includes('@')) {
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
    } 
    // Si no hay error, el listener se encargará de mostrar la aplicación.
    
    toggleLoading('login-form', false);
});

// 2. Manejar el cierre de sesión 
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signOut();

    if (!error) {
        // Limpiar la interfaz al cerrar sesión
        document.getElementById('sales-list').innerHTML = ''; 
        document.getElementById('debt-list').innerHTML = ''; 
    }
    // El listener se encargará de mostrar la pantalla de login.
});


/** Carga los datos del perfil actual del usuario para el modal. */
async function loadUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Sesión no encontrada. Por favor, vuelve a iniciar sesión.");
        return;
    }

    // 1. Mostrar Email
    document.getElementById('profile-email-display').textContent = user.email;

    // 2. Cargar Nombre de Usuario (asumiendo RLS permite SELECT en profiles)
    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
    
    if (profile && profile.username) {
        document.getElementById('profile-username-input').value = profile.username;
    } else {
         // Valor por defecto si no existe username
         document.getElementById('profile-username-input').value = user.email.split('@')[0]; 
    }
    
    // Limpiar el campo de contraseña antes de mostrar
    document.getElementById('profile-new-password').value = ''; 
    showModal('user-profile-modal');
}

/** Maneja el envío del formulario de actualización de perfil */
profileUpdateForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newUsername = document.getElementById('profile-username-input').value.trim();
    const newPassword = document.getElementById('profile-new-password').value.trim();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Sesión expirada. Por favor, inicia sesión de nuevo.");
        return;
    }

    let changesMade = false;

    // A. Actualizar Nombre de Usuario (UPSERT: inserta si no existe, actualiza si existe por 'id')
    if (newUsername.length >= 3) {
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: user.id, username: newUsername }, { onConflict: 'id' });
        
        if (profileError) {
            alert(`Error al actualizar el nombre de usuario: ${profileError.message}`);
        } else {
            changesMade = true;
        }
    }

    // B. Actualizar Contraseña
    if (newPassword.length >= 6) {
        const { error: passwordError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (passwordError) {
            alert(`Error al actualizar la contraseña: ${passwordError.message}`);
        } else {
            changesMade = true;
            document.getElementById('profile-new-password').value = ''; // Limpiar el campo
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
// 4. MANEJO DE DATOS DEL DASHBOARD (Implementación simplificada)
// ----------------------------------------------------------------------

async function loadDashboardData() {
    // Si la sesión no está activa, el listenerAuthListener ya se encargó.

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
        return;
    }

    // Funciones placeholders que debes tener implementadas:
    // updateSummary(sales, clients);
    // renderSales(sales);
    // renderDebts(clients);
}


// ----------------------------------------------------------------------
// 5. INICIALIZACIÓN Y LISTENERS DE EVENTOS
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // Conectar botones de Modales (Perfi, Admin, etc.)
    const openProfileModalBtn = document.getElementById('openProfileModalBtn');
    const closeProfileModal = document.getElementById('closeProfileModal');
    
    const addProductAdminBtn = document.getElementById('addProductAdminBtn');
    const closeProductAdminModal = document.getElementById('closeProductAdminModal');

    // Listener para el nuevo modal de perfil
    openProfileModalBtn?.addEventListener('click', loadUserProfile);
    closeProfileModal?.addEventListener('click', () => hideModal('user-profile-modal'));

    // Listener para el modal de admin de productos (ejemplo)
    addProductAdminBtn?.addEventListener('click', () => showModal('product-admin-modal'));
    closeProductAdminModal?.addEventListener('click', () => hideModal('product-admin-modal'));

    // **Llamada de inicio para verificar la sesión**
    initializeAuthListener(); 
});