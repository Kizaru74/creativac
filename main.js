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
let allCategories = []; // 👈 RESTAURADO
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const appContainer = document.getElementById('app-container');
const profileUpdateForm = document.getElementById('profile-update-form');
const addSaleForm = document.getElementById('add-sale-form'); 
const updateDebtForm = document.getElementById('update-debt-form'); // AGREGADO

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
        // Restaura el texto original según el formulario
        if (formId === 'login-form') button.textContent = 'Acceder';
        if (formId === 'add-sale-form') button.textContent = 'Guardar Venta';
        if (formId === 'profile-update-form') button.textContent = 'Guardar Cambios';
        if (formId === 'update-debt-form') button.textContent = 'Registrar Abono';
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
    
    // Lógica para permitir login por username o email
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
// 4. MANEJO DE DATOS Y RENDERIZADO
// ----------------------------------------------------------------------

/** Maneja el envío del formulario para registrar un abono a la deuda. */
async function handleDebtPayment(e) {
    e.preventDefault();
    
    toggleLoading('update-debt-form', true);

    const clientId = document.getElementById('debt-client-display').textContent;
    const paymentAmount = parseFloat(document.getElementById('debt-payment-amount').value);

    // 1. Validaciones
    if (clientId === 'N/A' || isNaN(paymentAmount) || paymentAmount <= 0) {
        alert('Por favor, selecciona un cliente y agrega un monto de abono válido.');
        toggleLoading('update-debt-form', false);
        return;
    }

    // 2. Obtener la deuda actual del cliente
    const { data: clientData, error: fetchError } = await supabase
        .from('clientes')
        .select('debt')
        .eq('id', clientId)
        .single();
        
    if (fetchError || !clientData) {
        alert(`Error: No se pudo encontrar la deuda actual del cliente ID: ${clientId}.`);
        toggleLoading('update-debt-form', false);
        return;
    }

    const currentDebt = clientData.debt;
    const newDebt = currentDebt - paymentAmount;
    
    // 3. Actualizar la Deuda
    const { error: debtUpdateError } = await supabase
        .from('clientes')
        .update({ debt: newDebt, lastUpdate: new Date().toISOString() })
        .eq('id', clientId);
        
    if (debtUpdateError) {
        alert(`Fallo la actualización de deuda: ${debtUpdateError.message}`);
        toggleLoading('update-debt-form', false);
        return;
    }

    // 4. Finalización y Recarga
    alert('✅ ¡Abono registrado con éxito!');
    hideModal('update-debt-modal');
    document.getElementById('update-debt-form').reset(); 
    loadDashboardData(); 
    toggleLoading('update-debt-form', false);
}


/** Maneja el envío del formulario de nueva venta. */
async function handleNewSale(e) {
    e.preventDefault();
    
    toggleLoading('add-sale-form', true);

    const clientId = document.getElementById('sale-client-id').value;
    const amount = parseFloat(document.getElementById('sale-amount').value);
    const categoryId = document.getElementById('sale-category-id').value; // Asume que agregaste este ID al index.html
    const description = document.getElementById('sale-description').value;

    if (!clientId || isNaN(amount) || amount <= 0) {
        alert('Por favor, ingresa un ID de Cliente y un Monto de Venta válido.');
        toggleLoading('add-sale-form', false);
        return;
    }
    
    // --- LÓGICA DE INSERCIÓN DE VENTA ---
    const { error: saleError } = await supabase
        .from('ventas')
        .insert({
            client_id: clientId, 
            amount: amount,
            category_id: categoryId, // AGREGADO
            description: description,
            date: new Date().toISOString()
        });

    if (saleError) {
        alert(`Error al registrar la venta: ${saleError.message}`);
        toggleLoading('add-sale-form', false);
        return;
    }
    
    // --- LÓGICA DE ACTUALIZACIÓN DE DEUDA ---
    
    const { data: clientData, error: fetchError } = await supabase
        .from('clientes')
        .select('debt')
        .eq('id', clientId)
        .single();
        
    if (fetchError || !clientData) {
        alert(`Venta registrada, pero no se pudo encontrar/actualizar la deuda del cliente ID: ${clientId}.`);
    } else {
        const newDebt = clientData.debt + amount;
        
        const { error: debtUpdateError } = await supabase
            .from('clientes')
            .update({ debt: newDebt, lastUpdate: new Date().toISOString() })
            .eq('id', clientId);
            
        if (debtUpdateError) {
            alert(`Venta registrada, pero falló la actualización de deuda: ${debtUpdateError.message}`);
        }
    }


    // Finalización
    alert('🎉 ¡Venta registrada con éxito y deuda actualizada!');
    hideModal('add-sale-modal');
    document.getElementById('add-sale-form').reset(); 
    loadDashboardData(); 
    
    toggleLoading('add-sale-form', false);
}


/** Calcula y actualiza los totales del dashboard. */
function updateSummary(sales, clients) {
    const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const totalDebtAmount = clients.reduce((sum, client) => sum + (client.debt || 0), 0);
    const debtorCount = clients.filter(client => client.debt > 0).length;

    document.getElementById('total-sales').textContent = formatter.format(totalSalesAmount);
    document.getElementById('total-debt').textContent = formatter.format(totalDebtAmount);
    document.getElementById('debtor-count').textContent = debtorCount;
}


/** Renderiza la lista de deudas en la tabla (solo las pendientes: debt > 0). */
function renderDebts(clients) {
    const debtListBody = document.getElementById('debt-list'); 
    if (!debtListBody) return; 

    debtListBody.innerHTML = ''; 
    let debtorsCount = 0; 

    clients.forEach(client => {
        // 🛑 FILTRO PARA DEUDAS PENDIENTES
        if (client.debt <= 0) return; 
        
        debtorsCount++; 

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
    
    // Mostrar mensaje si no hay deudas
    if (debtorsCount === 0) {
        debtListBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-green-500 font-semibold">¡Felicidades! No hay deudas pendientes. 🎉</td></tr>';
    }
}

/** Renderiza la lista de ventas en la tabla, usando clientMap para buscar el nombre. */
function renderSales(sales, clientMap, categories) {
    const salesListBody = document.getElementById('sales-list'); 
    if (!salesListBody) return;

    salesListBody.innerHTML = ''; 
    
    if (!sales || sales.length === 0) {
        salesListBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';
        return;
    }
    
    // Crear un mapa {id: name} para categorías para búsqueda rápida
    const categoryMap = categories.reduce((map, category) => {
        map[category.id] = category.name;
        return map;
    }, {});


    // Encabezado de la tabla (Asegura que el thead exista y tenga la columna 'Categoría')
    const tableHeader = document.querySelector('#sales-list').parentElement.querySelector('thead');
    if (tableHeader) {
         tableHeader.innerHTML = `
            <tr class="bg-gray-50">
                <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cliente</th>
                <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Monto</th>
                <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Categoría</th>
                <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha</th>
                <th class="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Acción</th>
            </tr>
        `;
    }

    sales.forEach(sale => {
        const formattedAmount = formatter.format(sale.amount);
        const saleDate = new Date(sale.date).toLocaleString();
        
        const clientName = clientMap[sale.client_id] || 'N/A';
        const categoryName = categoryMap[sale.category_id] || 'N/A'; // Muestra la categoría

        const row = `
            <tr class="hover:bg-gray-50">
                <td class="p-4">${clientName}</td>
                <td class="p-4 font-medium">${formattedAmount}</td>
                <td class="p-4 text-sm text-gray-500">${categoryName}</td>
                <td class="p-4 text-sm">${saleDate}</td>
                <td class="p-4"><button data-id="${sale.id}" class="text-indigo-600 hover:text-indigo-900">Editar</button></td>
            </tr>
        `;
        salesListBody.innerHTML += row;
    });
}

/** Renderiza la lista de categorías en la sección de administración. */
function renderAdminData(categories) {
    const adminListBody = document.getElementById('admin-categories-list');
    if (!adminListBody) return;

    adminListBody.innerHTML = '';
    
    if (categories.length === 0) {
        adminListBody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-gray-500">No hay categorías registradas.</td></tr>';
        return;
    }

    categories.forEach(category => {
        const row = `
            <tr class="hover:bg-gray-50">
                <td class="p-4">${category.name}</td>
                <td class="p-4"><button data-id="${category.id}" class="text-red-600 hover:text-red-800">Eliminar</button></td>
            </tr>
        `;
        adminListBody.innerHTML += row;
    });
}


async function loadDashboardData() {
    // 1. Obtener datos de clientes
    const { data: clients, error: clientsError } = await supabase
        .from('clientes') 
        .select('*'); 
    
    const clientMap = clients.reduce((map, client) => {
        map[client.id] = client.name;
        return map;
    }, {});

    // 2. Obtener datos de categorías
    const { data: categories, error: categoriesError } = await supabase
        .from('categorias') 
        .select('*');

    if (categoriesError) {
        console.error("Error al obtener categorías: ", categoriesError);
        allCategories = []; 
    } else {
        allCategories = categories; 
        renderAdminData(categories); // Muestra la tabla de administración
    }
    
    // 3. Obtener datos de ventas
    const { data: sales, error: salesError } = await supabase
        .from('ventas') 
        .select('*')
        .order('date', { ascending: false })
        .limit(10); 

    if (salesError || clientsError || categoriesError) {
        console.error("Error al obtener datos: ", salesError || clientsError);
        renderSales([], {}, allCategories); 
        renderDebts([]); 
        return;
    }

    // LLAMADAS CRÍTICAS PARA MOSTRAR LA INFORMACIÓN:
    renderSales(sales, clientMap, allCategories); 
    renderDebts(clients); 
    updateSummary(sales, clients);
}


// ----------------------------------------------------------------------
// 5. INICIALIZACIÓN Y LISTENERS DE EVENTOS
// ----------------------------------------------------------------------

// 🥳 FUNCIÓN CRÍTICA: DELEGADO DE EVENTOS (Para botones generados dinámicamente)
document.addEventListener('click', (e) => {
    // Manejo del botón de DETALLE DE DEUDAS (quick-edit-debt-btn)
    if (e.target.classList.contains('quick-edit-debt-btn')) {
        e.preventDefault();
        
        const clientId = e.target.dataset.clientId;

        // Mostrar el ID del cliente en el modal
        document.getElementById('debt-client-display').textContent = clientId;
        
        // Abrir el modal de abonos/detalles
        showModal('update-debt-modal'); 
    }
});


document.addEventListener('DOMContentLoaded', () => {
    // Conectar botones de Modales (Perfil, Cerrar)
    const openProfileModalBtn = document.getElementById('openProfileModalBtn');
    const closeProfileModal = document.getElementById('closeProfileModal');
    
    // Conectar botones de Acciones Rápidas (Botones Fijos)
    const addSaleBtn = document.getElementById('addSaleBtn');
    const updateDebtBtn = document.getElementById('updateDebtBtn');

    // Conexiones para cerrar modales 
    document.getElementById('close-add-sale-modal')?.addEventListener('click', () => {
        hideModal('add-sale-modal');
    });
    document.getElementById('close-update-debt-modal')?.addEventListener('click', () => {
        hideModal('update-debt-modal');
    });

    // Listeners de Modales de Perfil
    openProfileModalBtn?.addEventListener('click', loadUserProfile);
    closeProfileModal?.addEventListener('click', () => hideModal('user-profile-modal'));

    // Listeners de Acciones Rápidas (Abre Modales)
    addSaleBtn?.addEventListener('click', () => showModal('add-sale-modal'));
    updateDebtBtn?.addEventListener('click', () => showModal('update-debt-modal'));

    // Listeners de Formularios
    profileUpdateForm?.addEventListener('submit', profileUpdateForm);
    addSaleForm?.addEventListener('submit', handleNewSale); 
    updateDebtForm?.addEventListener('submit', handleDebtPayment); // CONEXIÓN CRÍTICA DEL ABONO

    // **Llamada de inicio para verificar la sesión**
    initializeAuthListener(); 
});