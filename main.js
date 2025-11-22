import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ===============================================
// 1. CONFIGURACIÓN Y CLIENTE SUPABASE
// ===============================================
// **IMPORTANTE:** REEMPLAZA CON TUS CLAVES REALES DE SUPABASE
const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

// Inicialización del cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let CURRENT_DEBT_CLIENT_ID = null; 


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
const salesListBody = document.getElementById('sales-list'); 

// Botones de Acción Rápida
const addProductAdminBtn = document.getElementById('addProductAdminBtn');
const addSaleBtn = document.getElementById('addSaleBtn');
// El botón updateDebtBtn ya tiene su listener de alerta en la Sección 11

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
    
    // Loguearse usando email (o username si tienes un trigger en Supabase que lo mapea)
    const { error } = await supabase.auth.signInWithPassword({ email: identifier, password: password });
    
    if (error) {
        alert('Error de login: ' + error.message);
        console.error('Error de Login:', error);
        return;
    }
    
    checkAuthStatus(); // Recarga el estado y la aplicación
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload(); 
}

function checkAuthStatus() {
    // Obtiene el estado actual de la sesión.
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            // Usuario autenticado
            authModal.classList.add('hidden');
            appContainer.classList.remove('hidden');
            initializeApp();
        } else {
            // Usuario no autenticado
            authModal.classList.remove('hidden');
            appContainer.classList.add('hidden');
            // Intentar cargar categorías (requiere RLS SELECT anon)
            populateCategorySelector(); 
        }
    }).catch(error => {
        console.error("Error al obtener la sesión de Supabase:", error);
    });
}

// ===============================================
// 4. FUNCIONES CRUD GENERALES (Clientes, Pagos)
// ===============================================

/**
 * Verifica si un cliente existe por su ID. Si no existe, lo crea.
 * Requiere RLS SELECT e INSERT para authenticated en la tabla 'clientes'.
 * @param {number} client_id El ID del cliente a buscar o crear.
 * @returns {number} El ID del cliente (existente o recién creado).
 */
async function getOrCreateClient(client_id) {
    
    // 1. Intentar obtener el cliente
    let { data: client, error } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', client_id)
        .single();

    if (error && error.code !== 'PGRST116') { 
        console.error('Error al buscar cliente:', error);
    }
    
    // 2. Si no existe, crear el cliente
    if (!client) {
        console.log(`Cliente ID ${client_id} no encontrado, intentando crear uno nuevo...`);
        const { data: newClient, error: insertError } = await supabase
            .from('clientes')
            .insert({ id: client_id, name: `Cliente ${client_id}` }) 
            .select('id')
            .single();

        if (insertError) {
            console.error('Error al crear cliente (Verifica RLS INSERT para authenticated):', insertError);
            throw new Error("No se pudo crear el cliente.");
        }
        return newClient.id;
    }

    return client.id;
}


async function registerPayment(client_id, amount) {
    try {
        // Asumimos que la tabla se llama 'pagos'
        const { error } = await supabase
            .from('pagos') 
            .insert([
                { 
                    client_id: client_id, 
                    amount: amount 
                }
            ]);

        if (error) throw error;

        console.log(`Pago de $${amount.toFixed(2)} registrado REALMENTE para Cliente ID: ${client_id}`);
        return true;
        
    } catch (error) {
        console.error('Error al registrar pago en Supabase:', error);
        alert('Error al registrar pago: ' + error.message);
        return false;
    }
}


// ===============================================
// 5. FUNCIONES CRUD CATEGORÍAS
// ===============================================

async function fetchCategories() {
    // Requiere RLS SELECT para anon/authenticated en la tabla 'categorias'
    const { data, error } = await supabase
        .from('categorias')
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al obtener categorías. ¿Tabla "categorias" existe y tiene RLS SELECT anon/authenticated?', error);
        return [];
    }
    return data;
}

async function addCategory(name) {
    const { error } = await supabase
        .from('categorias')
        .insert({ name: name });

    if (error) {
        alert('Error al crear categoría: ' + error.message);
        return false;
    }
    return true;
}

async function deleteCategory(categoryId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) return false;

    const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', categoryId);

    if (error) {
        alert('Error al eliminar categoría: ' + error.message);
        return false;
    }
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
        option.textContent = 'ERROR: No se cargaron categorías. Revise RLS.';
        saleCategorySelector.appendChild(option);
    }
}

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

    // 2. Renderizar Controles de Vista
    html += `
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Productos/Paquetes</button>
        </div>
    `;

    // 3. Renderizar Tabla de Categorías
    // ... (El resto del HTML para la tabla de categorías, usando categories.map)
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

    // Agregar listener para el formulario de agregar categoría
    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleAddCategory(e.target);
        });
    }
}

function loadProductAdminPlaceholder() {
    // ... (código para el placeholder de productos)
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
        alert('Categoría creada con éxito.');
        categoryNameInput.value = ''; 
        await loadCategoryAdminList(); 
        await populateCategorySelector(); 
    }
}

async function handleDeleteCategory(e) {
    const categoryId = e.target.dataset.categoryId;
    
    if (await deleteCategory(categoryId)) {
        alert('Categoría eliminada con éxito.');
        await loadCategoryAdminList(); 
        await populateCategorySelector();
    }
}


// ===============================================
// 7. LÓGICA DE TABLAS Y RENDERIZADO
// ===============================================

async function fetchDashboardData() {
    try {
        // ** NOTA: Reemplazar estas llamadas por tus RPCs o Vistas de Supabase **
        const salesData = 15000.50; // Total de ventas (simulado por ahora)
        const debtData = 5200.75;  // Deuda total (simulado por ahora)
        const debtorCount = 12;    // Clientes con deuda (simulado por ahora)

        totalSalesDisplay.textContent = `$${salesData.toFixed(2)}`;
        totalDebtDisplay.textContent = `$${debtData.toFixed(2)}`;
        debtorCountDisplay.textContent = debtorCount;
        
        // Cargar listas
        await renderDebtList();
        await renderSalesList(); 
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
}

async function renderDebtList() {
    
    // **NOTA:** En la vida real, necesitarás una RPC o VIEW en Supabase 
    // que calcule el total de deuda (ventas - pagos) por cliente.
    
    // === LÓGICA REAL SUPABASE ===
    const { data: clients, error } = await supabase
        .from('clientes_con_deuda') // <--- REEMPLAZA CON EL NOMBRE DE TU VISTA/RPC
        .select('id, name, debt, last_update')
        .order('debt', { ascending: false });

    if (error) {
        console.error('Error al cargar lista de deudas (RLS o VIEW faltante):', error);
        debtListBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar deudas. Revise RLS y la Vista SQL.</td></tr>';
        return;
    }

    if (!clients || clients.length === 0) {
        debtListBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay deudas pendientes registradas.</td></tr>';
        return;
    }

    // === RENDERIZADO CON DATOS REALES ===
    debtListBody.innerHTML = clients.map(client => `
        <tr class="hover:bg-gray-50">
            <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
            <td class="p-4 whitespace-nowrap text-sm text-red-600 font-semibold">$${parseFloat(client.debt).toFixed(2)}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${client.last_update}</td>
            <td class="p-4 whitespace-nowrap text-sm font-medium">
                <button data-client-id="${client.id}" 
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

async function renderSalesList() {
    // Simulación de datos de Ventas para que la interfaz se vea llena.
    const sales = [
        { id: 1, client_name: "Juan Pérez", amount: 250.00, category_name: "Corte Básico", created_at: "2025-11-21 14:30" },
        { id: 2, client_name: "María López", amount: 120.75, category_name: "Productos", created_at: "2025-11-21 11:15" },
        // ...
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
                <button data-sale-id="${sale.id}" class="edit-sale-btn text-indigo-600 hover:text-indigo-900 text-sm">
                    Editar
                </button>
            </td>
        </tr>
    `).join('');

    salesListBody.querySelectorAll('.edit-sale-btn').forEach(btn => {
        btn.addEventListener('click', handleEditSale);
    });
}


// ===============================================
// 8. MANEJO DE FORMULARIOS DE ACCIÓN
// ===============================================

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
        // PASO CLAVE: Asegurar que el cliente existe o crearlo.
        const finalClientId = await getOrCreateClient(client_id); 
        
        // Registrar la venta
        const { error } = await supabase
            .from('ventas')
            .insert({ 
                client_id: finalClientId, 
                amount: amount, 
                category_id: category_id,
                description: description
            });

        if (error) throw error;

        alert('Venta/Cargo registrado con éxito.');
        addSaleForm.reset();
        addSaleModal.classList.add('hidden');
        await fetchDashboardData(); 
        
    } catch (error) {
        console.error('Error al registrar la venta:', error);
        alert('Error al registrar la venta: ' + error.message);
    }
}

async function handleUpdateDebt(e) {
    e.preventDefault();
    
    // Obtener el ID del cliente seleccionado (viene de la tabla simulada)
    const client_id_str = CURRENT_DEBT_CLIENT_ID; 
    const paymentAmount = parseFloat(debtPaymentAmountInput.value);

    if (!client_id_str) {
        alert('Error: No se ha seleccionado un cliente.');
        return;
    }

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        alert('Por favor, ingresa un monto de abono válido.');
        return;
    }
    
    // Convertir el ID de string a entero para la función de verificación
    const client_id = parseInt(client_id_str);

    try {
        // PASO CLAVE: 
        // 1. Verificar si el cliente existe en la tabla 'clientes'. 
        // 2. Si no existe, lo crea (requiere RLS INSERT en la tabla 'clientes').
        const finalClientId = await getOrCreateClient(client_id); 
        
        // 3. Registrar el pago usando el ID verificado/creado
        const success = await registerPayment(finalClientId, paymentAmount);

        if (success) {
            alert('Abono registrado con éxito.');
            updateDebtModal.classList.add('hidden');
            // Nota: El dashboard se recargará, pero el resumen de deuda 
            // no se actualizará realmente hasta que implementes el RPC en Supabase.
            await fetchDashboardData(); 
        }
    } catch (error) {
        console.error('Error al registrar abono o crear cliente:', error);
        alert('No se pudo verificar o crear el cliente antes de registrar el abono. Revise el RLS de INSERT en la tabla "clientes".');
    }
}

function handleOpenUpdateDebtModal(e) {
    const btn = e.target;
    const client_id = btn.dataset.clientId;

    CURRENT_DEBT_CLIENT_ID = client_id;
    
    document.getElementById('debt-client-display').textContent = client_id;
    debtPaymentAmountInput.value = '';
    updateDebtModal.classList.remove('hidden');
}


// ===============================================
// 9. FUNCIONES PLACEHOLDER PARA ACCIONES DE VENTA
// ===============================================

function handleEditSale(e) {
    const saleId = e.target.dataset.saleId;
    alert(`Abriendo edición para Venta ID: ${saleId}`);
    // Aquí iría la lógica para abrir el modal de edición
}


// ===============================================
// 10. FUNCIÓN DE INICIALIZACIÓN PRINCIPAL
// ===============================================

async function initializeApp() {
    // 1. Cargar selectores dinámicos (Categorías)
    await populateCategorySelector(); 
    
    // 2. Cargar datos del dashboard
    await fetchDashboardData(); 
}


// ===============================================
// 11. EVENT LISTENERS
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus(); // Verificar si hay sesión activa al cargar
});

// Autenticación
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

// Modal de Venta
addSaleBtn.addEventListener('click', () => addSaleModal.classList.remove('hidden'));
closeAddSaleModalBtn.addEventListener('click', () => addSaleModal.classList.add('hidden'));
addSaleForm.addEventListener('submit', handleAddSale);

// Modal de Abono
// Alerta para el botón principal (acción rápida)
document.getElementById('updateDebtBtn').addEventListener('click', () => {
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