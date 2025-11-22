import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ===============================================
// 1. CONFIGURACIÓN Y CLIENTE SUPABASE
// ===============================================
// **IMPORTANTE:** Reemplaza con tus claves reales
const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

// Verifica si la URL o la Key son los placeholders antes de crear el cliente
if (SUPABASE_URL === 'TU_SUPABASE_URL' || SUPABASE_ANON_KEY === 'TU_SUPABASE_ANON_KEY') {
    console.error("ADVERTENCIA: Las claves de Supabase no han sido configuradas. El script funcionará con datos simulados.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let CURRENT_DEBT_CLIENT_ID = null; // ID del cliente actualmente seleccionado en el modal de deuda


// ===============================================
// 2. REFERENCIAS DEL DOM
// ===============================================

// Contenedores Principales y Auth
const authModal = document.getElementById('auth-modal');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logoutBtn');

// Dashboard Info
const totalSalesDisplay = document.getElementById('total-sales');
const totalDebtDisplay = document.getElementById('total-debt');
const debtorCountDisplay = document.getElementById('debtor-count');
const debtListBody = document.getElementById('debt-list');
const salesListBody = document.getElementById('sales-list'); // Cuerpo de la tabla de ventas

// Botones de Acción Rápida
const addProductAdminBtn = document.getElementById('addProductAdminBtn');
const addSaleBtn = document.getElementById('addSaleBtn');
const updateDebtBtn = document.getElementById('updateDebtBtn');

// Modal de Registro de Venta
const addSaleModal = document.getElementById('add-sale-modal');
const closeAddSaleModalBtn = document.getElementById('close-add-sale-modal'); 
const addSaleForm = document.getElementById('add-sale-form');
const saleCategorySelector = document.getElementById('sale-category-id'); 

// Modal de Abono/Ajuste de Deuda
const updateDebtModal = document.getElementById('update-debt-modal');
const closeUpdateDebtModalBtn = document.getElementById('close-update-debt-modal');
const updateDebtForm = document.getElementById('update-debt-form');
const debtPaymentAmountInput = document.getElementById('debt-payment-amount');

// Modal de Administración de Productos/Categorías
const productAdminModal = document.getElementById('product-admin-modal');
const closeProductAdminModalBtn = document.getElementById('close-product-admin-modal');
const adminContentArea = document.getElementById('admin-content-area');

// Modal de Perfil
const userProfileModal = document.getElementById('user-profile-modal');
const closeProfileModal = document.getElementById('closeProfileModal');


// ===============================================
// 3. FUNCIONES DE AUTENTICACIÓN
// ===============================================

async function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    
    // Aquí se ejecutaría la lógica de signInWithPassword de Supabase
    
    console.log('Intento de login con:', identifier);
    authModal.classList.add('hidden');
    appContainer.classList.remove('hidden');
    await initializeApp();
}

async function handleLogout() {
    // Aquí se ejecutaría la lógica de signOut de Supabase
    console.log('Cerrando sesión...');
    window.location.reload(); 
}

function checkAuthStatus() {
    // Simulación de usuario logueado para desarrollo
    const user = { id: 1 }; 
    if (user && user.id) {
        authModal.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initializeApp();
    } else {
        authModal.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}


// ===============================================
// 4. FUNCIONES CRUD GENERALES (Ventas, Clientes)
// ===============================================

async function fetchDashboardData() {
    // Esta función debería llamar a tus vistas/RPCs de Supabase
    try {
        // Simulación de datos
        const salesData = 15000.50;
        const debtData = 5200.75;
        const debtorCount = 12;

        totalSalesDisplay.textContent = `$${salesData.toFixed(2)}`;
        totalDebtDisplay.textContent = `$${debtData.toFixed(2)}`;
        debtorCountDisplay.textContent = debtorCount;
        
        // Cargar listas
        await renderDebtList();
        await renderSalesList(); // <-- Llamada a la nueva función
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
}

async function registerPayment(client_id, amount) {
    try {
        // Lógica de inserción en la tabla 'pagos' o ajuste de deuda en 'ventas'
        console.log(`Pago de $${amount.toFixed(2)} registrado para Cliente ID: ${client_id}`);
        return true;
    } catch (error) {
        console.error('Error al registrar pago:', error);
        alert('Error al registrar pago: ' + error.message);
        return false;
    }
}

/**
 * Verifica si un cliente existe por su ID. Si no existe, lo crea (Simulado).
 * @param {number} client_id El ID del cliente a buscar o crear.
 * @returns {number} El ID del cliente (existente o recién creado).
 */
async function getOrCreateClient(client_id) {
    if (SUPABASE_URL === 'TU_SUPABASE_URL') {
        // --- SIMULACIÓN ---
        console.log(`Simulación: Buscando/Creando cliente ID: ${client_id}`);
        // En una implementación real, aquí buscarías el cliente.
        // Si no existe, lo insertarías en la tabla 'clientes'.
        return client_id; 
    }
    
    // --- LÓGICA REAL SUPABASE (Ejemplo) ---
    // 1. Intentar obtener el cliente
    let { data: client, error } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', client_id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
        console.error('Error al buscar cliente:', error);
    }
    
    // 2. Si no existe, crear el cliente
    if (!client) {
        console.log(`Cliente ID ${client_id} no encontrado, creando uno nuevo...`);
        const { data: newClient, error: insertError } = await supabase
            .from('clientes')
            .insert({ id: client_id, name: `Cliente ${client_id}` }) // Asumimos que el nombre puede ser un placeholder
            .select('id')
            .single();

        if (insertError) {
            console.error('Error al crear cliente:', insertError);
            throw new Error("No se pudo crear el cliente.");
        }
        return newClient.id;
    }

    return client.id;
}


// ===============================================
// 5. FUNCIONES CRUD CATEGORÍAS
// ===============================================

async function fetchCategories() {
    // Llama a la tabla 'categorias'. En desarrollo, devolvemos un array simulado.
    if (SUPABASE_URL === 'TU_SUPABASE_URL') {
        return [
            { id: 1, name: "Corte Básico" },
            { id: 2, name: "Paquete Premium" },
            { id: 3, name: "Productos" }
        ];
    }
    
    const { data, error } = await supabase
        .from('categorias')
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al obtener categorías:', error);
        return [];
    }
    return data;
}

async function addCategory(name) {
    // Lógica de inserción real
    console.log(`Simulación: Agregando categoría: ${name}`);
    return true;
}

async function deleteCategory(categoryId) {
    // Lógica de eliminación real
    console.log(`Simulación: Eliminando categoría ID: ${categoryId}`);
    return true;
}


// ===============================================
// 6. LÓGICA DE VISTA DE CATEGORÍAS Y FORMULARIOS
// ===============================================

async function populateCategorySelector() {
    const categories = await fetchCategories();
    
    saleCategorySelector.innerHTML = '<option value="">-- Seleccionar Categoría --</option>';

    if (categories && categories.length > 0) {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            saleCategorySelector.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'ERROR: No se cargaron categorías.';
        saleCategorySelector.appendChild(option);
    }
}

/**
 * Renderiza el formulario y la lista de categorías en el modal de administración.
 */
async function loadCategoryAdminList() {
    const categories = await fetchCategories();
    
    let html = '';

    // 1. Renderizar Formulario de Nueva Categoría
    html += `
        <div class="border p-4 rounded-lg bg-gray-50 mb-6">
            <h4 class="text-lg font-semibold mb-3">Añadir Nueva Categoría</h4>
            <form id="add-category-form" class="flex gap-4">
                <input type="text" id="category-name-input" required 
                       placeholder="Nombre de la Categoría"
                       class="flex-grow p-2 border rounded-md" minlength="3">
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                    Guardar
                </button>
            </form>
        </div>
    `;

    // 2. Renderizar Controles de Vista (Generados dinámicamente)
    html += `
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Productos/Paquetes</button>
        </div>
    `;

    // 3. Renderizar Tabla de Categorías
    html += '<h4 class="text-lg font-semibold mb-3">Lista de Categorías Existentes</h4>';

    if (categories.length === 0) {
        html += '<p class="text-gray-500">No hay categorías registradas.</p>';
    } else {
        html += `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${categories.map(cat => `
                            <tr>
                                <td class="p-3 whitespace-nowrap text-sm text-gray-900">${cat.id}</td>
                                <td class="p-3 text-sm text-gray-700">${cat.name}</td>
                                <td class="p-3 whitespace-nowrap text-sm font-medium">
                                    <button data-category-id="${cat.id}" 
                                            class="delete-category-btn text-red-600 hover:text-red-900 text-sm">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    adminContentArea.innerHTML = html;

    // Volver a agregar listeners
    adminContentArea.querySelectorAll('.delete-category-btn').forEach(button => {
        button.addEventListener('click', handleDeleteCategory);
    });

    document.getElementById('view-categories-btn').addEventListener('click', loadCategoryAdminList);
    document.getElementById('view-products-btn').addEventListener('click', loadProductAdminPlaceholder);
}

function loadProductAdminPlaceholder() {
    adminContentArea.innerHTML = `
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Productos/Paquetes</button>
        </div>
        <p class="text-gray-500 p-4">La gestión de Productos y Paquetes se implementará pronto. Ahora solo puedes administrar Categorías.</p>`;

    document.getElementById('view-categories-btn').addEventListener('click', loadCategoryAdminList);
    document.getElementById('view-products-btn').addEventListener('click', loadProductAdminPlaceholder);
}

async function handleAddCategory(form) {
    const categoryNameInput = form.querySelector('#category-name-input');
    const name = categoryNameInput.value.trim();

    if (!name) {
        alert('Por favor, ingresa un nombre para la categoría.');
        return;
    }

    const success = await addCategory(name);

    if (success) {
        alert('Categoría creada con éxito (Simulado).');
        categoryNameInput.value = ''; 
        await loadCategoryAdminList(); 
        await populateCategorySelector(); 
    }
}

async function handleDeleteCategory(e) {
    const categoryId = e.target.dataset.categoryId;
    
    if (confirm(`¿Estás seguro de que quieres eliminar la categoría con ID ${categoryId}?`)) {
        const success = await deleteCategory(categoryId);
        if (success) {
            alert('Categoría eliminada con éxito (Simulado).');
            await loadCategoryAdminList(); 
            await populateCategorySelector();
        }
    }
}


// ===============================================
// 7. LÓGICA DE TABLAS Y RENDERIZADO
// ===============================================

async function renderDebtList() {
    // Simulación de datos:
    const clients = [
        { id: 101, name: "Juan Pérez", debt: 1500.00, last_update: "2025-11-20" },
        { id: 102, name: "María López", debt: 850.50, last_update: "2025-11-15" },
        { id: 103, name: "Carlos R.", debt: 300.25, last_update: "2025-11-21" },
    ];
    
    debtListBody.innerHTML = clients.map(client => `
        <tr class="hover:bg-gray-50">
            <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900 client-detail-link" 
                data-client-id="${client.id}" style="cursor: pointer;">${client.name}</td>
            <td class="p-4 whitespace-nowrap text-sm text-red-600 font-semibold">$${client.debt.toFixed(2)}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${client.last_update}</td>
            <td class="p-4 whitespace-nowrap text-sm font-medium">
                <button data-client-id="${client.id}" data-client-name="${client.name}" data-debt="${client.debt}" 
                        class="open-debt-modal-btn text-yellow-600 hover:text-yellow-900 text-sm">
                    Abonar
                </button>
            </td>
        </tr>
    `).join('');

    debtListBody.querySelectorAll('.open-debt-modal-btn').forEach(btn => {
        btn.addEventListener('click', handleOpenUpdateDebtModal);
    });
}


/**
 * Renderizado de la lista de últimas ventas.
 */
async function renderSalesList() {
    // **NOTA:** Aquí harías tu llamada a Supabase real:
    // const { data: sales, error } = await supabase.from('ventas_con_detalle').select('...').limit(10).order('created_at', { ascending: false });
    
    // Simulación de datos de Ventas
    const sales = [
        { id: 1, client_name: "Juan Pérez", amount: 250.00, category_name: "Corte Básico", created_at: "2025-11-21 14:30" },
        { id: 2, client_name: "María López", amount: 120.75, category_name: "Productos", created_at: "2025-11-21 11:15" },
        { id: 3, client_name: "Andrés G.", amount: 400.00, category_name: "Paquete Premium", created_at: "2025-11-20 18:00" },
        { id: 4, client_name: "Laura S.", amount: 80.00, category_name: "Corte Básico", created_at: "2025-11-20 10:45" },
    ];
    
    if (!sales || sales.length === 0) {
        salesListBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';
        return;
    }

    salesListBody.innerHTML = sales.map(sale => `
        <tr class="hover:bg-gray-50">
            <td class="p-4 whitespace-nowrap text-sm text-gray-900">${sale.client_name}</td>
            <td class="p-4 whitespace-nowrap text-sm font-semibold text-green-600">$${sale.amount.toFixed(2)}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${sale.category_name}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${sale.created_at}</td>
            <td class="p-4 whitespace-nowrap text-sm font-medium">
                <button data-sale-id="${sale.id}" class="view-sale-detail-btn text-blue-600 hover:text-blue-900 text-sm mr-2">
                    Ver
                </button>
                <button data-sale-id="${sale.id}" class="edit-sale-btn text-indigo-600 hover:text-indigo-900 text-sm">
                    Editar
                </button>
            </td>
        </tr>
    `).join('');

    // Agregar listeners para las acciones
    salesListBody.querySelectorAll('.view-sale-detail-btn').forEach(btn => {
        btn.addEventListener('click', handleViewSaleDetail);
    });
    salesListBody.querySelectorAll('.edit-sale-btn').forEach(btn => {
        btn.addEventListener('click', handleEditSale);
    });
}


function handleOpenUpdateDebtModal(e) {
    const btn = e.target;
    const client_id = btn.dataset.clientId;
    // const client_name = btn.dataset.clientName; // No usado en el HTML actual
    // const debt_amount = parseFloat(btn.dataset.debt); // No usado en el HTML actual

    CURRENT_DEBT_CLIENT_ID = client_id;
    
    document.getElementById('debt-client-display').textContent = client_id;
    debtPaymentAmountInput.value = '0.00';
    updateDebtModal.classList.remove('hidden');
}


// ===============================================
// 8. MANEJO DE FORMULARIOS DE ACCIÓN
// ===============================================

async function handleUpdateDebt(e) {
    e.preventDefault();
    
    const client_id = CURRENT_DEBT_CLIENT_ID; 
    const paymentAmount = parseFloat(debtPaymentAmountInput.value);

    if (!client_id) {
        alert('Error: No se ha seleccionado un cliente.');
        return;
    }

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        alert('Por favor, ingresa un monto de abono válido.');
        return;
    }

    const success = await registerPayment(client_id, paymentAmount);

    if (success) {
        alert('Abono registrado con éxito (Simulado).');
        updateDebtModal.classList.add('hidden');
        await initializeApp(); 
    }
}

async function handleAddSale(e) {
    e.preventDefault();
    
    const client_id_input = document.getElementById('sale-client-id');
    const amount_input = document.getElementById('sale-amount');
    
    const client_id = parseInt(client_id_input.value);
    const amount = parseFloat(amount_input.value);
    const category_id = parseInt(saleCategorySelector.value); 
    const description = document.getElementById('sale-description').value;

    if (isNaN(client_id) || isNaN(amount) || amount <= 0 || isNaN(category_id)) {
        alert('Por favor, revisa el ID del Cliente, el Monto y la Categoría.');
        return;
    }

    try {
        // PASO CLAVE: Asegurar que el cliente existe antes de registrar la venta
        const finalClientId = await getOrCreateClient(client_id); 
        console.log(`Venta se registrará bajo Cliente ID: ${finalClientId}`);

        if (SUPABASE_URL === 'TU_SUPABASE_URL') {
            // --- SIMULACIÓN DE REGISTRO DE VENTA ---
            console.log(`Simulación: Registrando Venta para ${finalClientId}: $${amount.toFixed(2)} (${category_id})`);
            
        } else {
            // --- LÓGICA REAL SUPABASE (Ejemplo) ---
            const { error } = await supabase
                .from('ventas')
                .insert({ 
                    client_id: finalClientId, 
                    amount: amount, 
                    category_id: category_id,
                    description: description
                });

            if (error) throw error;
        }

        alert('Venta/Cargo registrado con éxito.');
        addSaleForm.reset();
        addSaleModal.classList.add('hidden');
        await fetchDashboardData(); // Recargar datos del dashboard
        
    } catch (error) {
        console.error('Error al registrar la venta:', error);
        alert('Error al registrar la venta: ' + error.message);
    }
}

// ===============================================
// 9. FUNCIONES PLACEHOLDER PARA ACCIONES DE VENTA
// ===============================================

function handleViewSaleDetail(e) {
    const saleId = e.target.dataset.saleId;
    alert(`Abriendo detalle para Venta ID: ${saleId}`);
    // Implementar lógica para abrir el modal de detalle (client-sales-detail-modal)
}

function handleEditSale(e) {
    const saleId = e.target.dataset.saleId;
    alert(`Abriendo edición para Venta ID: ${saleId}`);
    // Implementar lógica para abrir el modal de edición (edit-sale-modal)
}


// ===============================================
// 10. FUNCIÓN DE INICIALIZACIÓN PRINCIPAL
// ===============================================

async function initializeApp() {
    // 1. Cargar selectores dinámicos
    await populateCategorySelector(); 
    
    // 2. Cargar datos del dashboard
    await fetchDashboardData(); 
}


// ===============================================
// 11. EVENT LISTENERS
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización del estado de la aplicación
    document.body.classList.remove('loading-hide');
});

// Autenticación
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

// Modal de Venta
addSaleBtn.addEventListener('click', () => addSaleModal.classList.remove('hidden'));
closeAddSaleModalBtn.addEventListener('click', () => addSaleModal.classList.add('hidden'));
addSaleForm.addEventListener('submit', handleAddSale);

// Modal de Abono
updateDebtBtn.addEventListener('click', () => {
    alert('Por favor, selecciona un cliente de la lista "Deudas Pendientes" para registrar un abono.');
});
closeUpdateDebtModalBtn.addEventListener('click', () => updateDebtModal.classList.add('hidden')); 
updateDebtForm.addEventListener('submit', handleUpdateDebt);

// Modal de Perfil de Usuario
document.getElementById('openProfileModalBtn').addEventListener('click', () => userProfileModal.classList.remove('hidden'));
closeProfileModal.addEventListener('click', () => userProfileModal.classList.add('hidden'));


// Modal de Administración de Productos/Categorías
addProductAdminBtn.addEventListener('click', async () => {
    productAdminModal.classList.remove('hidden');
    await loadCategoryAdminList(); 
});
closeProductAdminModalBtn.addEventListener('click', () => {
    productAdminModal.classList.add('hidden');
});

// Delegación de eventos para el formulario de nueva categoría (generado dinámicamente)
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'add-category-form') { 
        e.preventDefault();
        await handleAddCategory(e.target);
    }
});


// Inicialización al cargar la página
checkAuthStatus();