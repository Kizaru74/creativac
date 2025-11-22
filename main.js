// main.js

// ----------------------------------------------------
// IMPORTACIÓN DE ESTILOS (¡Necesario para Vite!)
import './style.css' 
// ----------------------------------------------------


// ===============================================
// 1. CONFIGURACIÓN DE SUPABASE
// ===============================================

// Reemplaza con tus claves reales de Supabase
const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

// Declaramos la variable con 'let' para inicializarla dentro del DOMContentLoaded
// Esto resuelve el error "can't access lexical declaration 'supabase' before initialization"
let supabase; 


// ===============================================
// 2. VARIABLES GLOBALES Y ELEMENTOS DOM
// ===============================================

// Variables de estado
let CURRENT_DEBT_CLIENT_ID = null;

// Contenedores de la aplicación (para control de login)
const authModal = document.getElementById('auth-modal');
const appContainer = document.getElementById('app-container');

// Elementos del Resumen (KPIs)
const totalSalesDisplay = document.getElementById('totalSalesDisplay');
const totalDebtDisplay = document.getElementById('totalDebtDisplay');
const debtorCountDisplay = document.getElementById('debtorCountDisplay');

// Tablas
const debtListBody = document.getElementById('debtListBody'); // Usando ID corregido del HTML
const salesListBody = document.getElementById('salesListBody'); // Usando ID corregido del HTML

// Forms
const loginForm = document.getElementById('login-form');
const addSaleForm = document.getElementById('add-sale-form');
const updateDebtForm = document.getElementById('update-debt-form');
const newCategoryForm = document.getElementById('newCategoryForm'); // Para el modal de Admin

// Modales y Botones de Control
const addSaleModal = document.getElementById('add-sale-modal');
const updateDebtModal = document.getElementById('update-debt-modal');
const productAdminModal = document.getElementById('product-admin-modal');
const userProfileModal = document.getElementById('user-profile-modal');

// Elementos específicos de formularios y displays
const saleClientIdInput = document.getElementById('sale-client-id');
const saleAmountInput = document.getElementById('sale-amount');
const saleCategorySelect = document.getElementById('sale-category-id');
const saleDescriptionInput = document.getElementById('sale-description');
const debtClientDisplay = document.getElementById('debt-client-display');
const debtPaymentAmountInput = document.getElementById('debt-payment-amount');

// Admin de Categorías (Placeholder)
const adminContentArea = document.getElementById('admin-content-area');


// ===============================================
// 3. FUNCIONES DE AUTENTICACIÓN (Placeholder)
// ===============================================

async function handleLogin(e) {
    e.preventDefault();
    // Aquí iría la lógica de signInWithPassword o signInWithOtp
    // POR AHORA, simulación de éxito:
    alert('Simulación: Acceso exitoso. En un proyecto real, use supabase.auth.signInWithPassword.');
    
    // Muestra la app y oculta el login
    authModal.classList.add('hidden');
    appContainer.classList.remove('hidden');
    await fetchDashboardData(); // Cargar datos al iniciar sesión
}

async function handleLogout() {
    // Aquí iría supabase.auth.signOut()
    alert('Sesión cerrada. En un proyecto real, use supabase.auth.signOut().');
    
    // Muestra el login y oculta la app
    appContainer.classList.add('hidden');
    authModal.classList.remove('hidden');
}


// ===============================================
// 4. FUNCIONES CRUD GENERALES
// ===============================================

/**
 * Verifica si un cliente existe por ID (solo para IDs, simplificado)
 * Para nombres, la lógica de búsqueda es más compleja y depende del gusto.
 */
async function getClientNameById(clientId) {
    const { data } = await supabase
        .from('clientes')
        .select('name')
        .eq('id', clientId)
        .single();
    return data ? data.name : 'Cliente Desconocido';
}

/**
 * Registra una nueva venta en la tabla 'ventas'.
 */
async function registerSale(clientId, amount, categoryId, products) {
    const { error } = await supabase
        .from('ventas')
        .insert([
            {
                client_id: clientId,
                amount: amount,
                category_id: categoryId,
                products: products,
                created_at: new Date().toISOString()
            }
        ]);

    if (error) throw new Error('Error al registrar venta: ' + error.message);
    return true;
}

/**
 * Registra un pago/abono en la tabla 'pagos'.
 */
async function registerPayment(clientId, amount) {
    const { error } = await supabase
        .from('pagos')
        .insert([
            {
                client_id: clientId,
                amount: amount,
                created_at: new Date().toISOString()
            }
        ]);

    if (error) throw new Error('Error al registrar pago: ' + error.message);
    return true;
}

async function registerCategory(name, description) {
    const { error } = await supabase
        .from('categorias')
        .insert([{ name: name, description: description }]);

    if (error) throw new Error('Error al crear categoría: ' + error.message);
    return true;
}

async function deleteCategory(categoryId) {
    const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', categoryId);

    if (error) throw new Error('Error al borrar categoría: ' + error.message);
    return true;
}


// ===============================================
// 5. FUNCIONES DE RENDERIZADO Y DASHBOARD
// ===============================================

/**
 * Carga los KPIs principales y llama a las funciones de renderizado de listas.
 */
async function fetchDashboardData() {
    try {
        // 1. Cargar datos de Deuda Total y Conteo de Deudores (Vista 'clientes_con_deuda')
        const { data: debtData, error: debtError } = await supabase
            .from('clientes_con_deuda')
            .select('debt');

        if (debtError) throw debtError;

        let totalDebt = 0;
        let debtorCount = 0;

        if (debtData && debtData.length > 0) {
            debtData.forEach(client => {
                totalDebt += parseFloat(client.debt);
            });
            debtorCount = debtData.length;
        }

        // 2. Cargar el Total de Ventas (Vista 'total_ventas_dashboard')
        let salesData = 0;
        const { data: salesResult } = await supabase
            .from('total_ventas_dashboard')
            .select('total_sales')
            .single();

        if (salesResult) {
            salesData = parseFloat(salesResult.total_sales);
        }
        
        // 3. Renderizar los Resultados
        totalSalesDisplay.textContent = `$${salesData.toFixed(2)}`;
        totalDebtDisplay.textContent = `$${totalDebt.toFixed(2)}`;
        debtorCountDisplay.textContent = debtorCount;
        
        // 4. Cargar Listas 
        await renderDebtList();
        await renderSalesList(); 

    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        // Si el usuario no está logueado, forzamos la vista de login (en un proyecto real)
        // authModal.classList.remove('hidden');
    }
}

async function renderDebtList() {
    
    // Consulta real a la vista que calcula el saldo: clientes_con_deuda
    const { data: clients, error } = await supabase
        .from('clientes_con_deuda') 
        .select('id, name, debt, last_update')
        .order('debt', { ascending: false })
        .limit(10);

    if (error) {
        debtListBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar deudas.</td></tr>';
        return;
    }

    if (!clients || clients.length === 0) {
        debtListBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay deudas pendientes registradas.</td></tr>';
        return;
    }

    debtListBody.innerHTML = clients.map(client => `
        <tr class="hover:bg-gray-50">
            <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
            <td class="p-4 whitespace-nowrap text-sm text-red-600 font-semibold">$${parseFloat(client.debt).toFixed(2)}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${client.last_update ? new Date(client.last_update).toLocaleDateString() : 'N/A'}</td>
            <td class="p-4 whitespace-nowrap text-sm font-medium">
                <button data-client-id="${client.id}" 
                        data-client-name="${client.name}"
                        class="open-debt-modal-btn text-yellow-600 hover:text-yellow-900 text-sm py-1 px-2 rounded bg-yellow-100">
                    Abonar
                </button>
            </td>
        </tr>
    `).join('');

    // Asignar listeners a los botones de Abonar
    debtListBody.querySelectorAll('.open-debt-modal-btn').forEach(btn => {
        btn.addEventListener('click', handleOpenUpdateDebtModal);
    });
}

async function renderSalesList() {
    try {
        const { data: sales, error } = await supabase
            .from('ventas')
            .select(`
                id,
                amount,
                created_at,
                clientes (name),       
                categorias (name)      
            `)
            .order('created_at', { ascending: false })
            .limit(10); 

        if (error) throw error;

        if (!sales || sales.length === 0) {
            salesListBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';
            return;
        }

        salesListBody.innerHTML = sales.map(sale => {
            
            const clientName = sale.clientes?.name ?? 'Desconocido';
            const categoryName = sale.categorias?.name ?? 'N/A';
            const dateDisplay = new Date(sale.created_at).toLocaleString();

            return `
                <tr class="hover:bg-gray-50">
                    <td class="p-4 whitespace-nowrap text-sm text-gray-900">${clientName}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-semibold text-green-600">$${parseFloat(sale.amount).toFixed(2)}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${categoryName}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${dateDisplay}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-medium">
                        <button data-sale-id="${sale.id}" class="edit-sale-btn text-indigo-600 hover:text-indigo-900 text-sm py-1 px-2 rounded bg-indigo-100">
                            Editar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        salesListBody.querySelectorAll('.edit-sale-btn').forEach(btn => {
            btn.addEventListener('click', () => alert('Funcionalidad de edición aún no implementada.'));
        });

    } catch (error) {
        console.error('Error al cargar lista de ventas:', error);
        salesListBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Error al cargar ventas.</td></tr>';
    }
}


async function renderCategoryAdmin() {
    try {
        const { data: categories, error } = await supabase
            .from('categorias')
            .select('id, name, description');

        if (error) throw error;
        
        // Llenar el SELECT en el modal de nueva venta
        saleCategorySelect.innerHTML = categories.map(cat => 
            `<option value="${cat.id}">${cat.name}</option>`
        ).join('');
        
        // Renderizar el contenido completo de administración
        let categoryListHtml = '';
        if (!categories || categories.length === 0) {
            categoryListHtml = '<tr><td colspan="3" class="p-4 text-center text-gray-500">No hay categorías registradas.</td></tr>';
        } else {
            categoryListHtml = categories.map(cat => `
                <tr class="hover:bg-gray-50">
                    <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${cat.name}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${cat.description || 'N/A'}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-medium">
                        <button data-category-id="${cat.id}" 
                                class="delete-category-btn text-red-600 hover:text-red-900 text-sm mr-4">
                            Eliminar
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Construir la estructura de la sección de Admin de categorías
        adminContentArea.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-4 border rounded-lg bg-gray-50">
                    <h4 class="text-lg font-semibold mb-3">Crear Nueva Categoría</h4>
                    <form id="newCategoryForm" class="space-y-3">
                        <div>
                            <label for="categoryName" class="block text-sm font-medium text-gray-700">Nombre</label>
                            <input type="text" id="categoryName" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                        </div>
                        <div>
                            <label for="categoryDescription" class="block text-sm font-medium text-gray-700">Descripción</label>
                            <textarea id="categoryDescription" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"></textarea>
                        </div>
                        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            Guardar Categoría
                        </button>
                    </form>
                </div>

                <div class="p-4 border rounded-lg bg-white">
                    <h4 class="text-lg font-semibold mb-3">Categorías Existentes</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                </tr>
                            </thead>
                            <tbody id="categoryListBody" class="bg-white divide-y divide-gray-200">
                                ${categoryListHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Re-asignar listeners a los nuevos botones de eliminar
        adminContentArea.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteCategory);
        });

        // Re-asignar listener al formulario de nueva categoría (ya que fue reconstruido)
        const newCatForm = document.getElementById('newCategoryForm');
        if (newCatForm) {
            newCatForm.addEventListener('submit', handleNewCategory);
        }

    } catch (error) {
        console.error('Error al cargar lista de categorías:', error);
        adminContentArea.innerHTML = '<p class="text-red-500">Error al cargar categorías. Revise la consola.</p>';
    }
}


// ===============================================
// 6. MANEJO DE FORMULARIOS Y MODALES
// ===============================================

function openModal(modal) {
    modal.classList.remove('hidden');
}

function closeModal(modal) {
    modal.classList.add('hidden');
    if (modal.querySelector('form')) {
        modal.querySelector('form').reset();
    }
}

// --- VENTA ---
async function handleNewSale(e) {
    e.preventDefault();

    const clientId = parseInt(saleClientIdInput.value);
    const amount = parseFloat(saleAmountInput.value);
    const categoryId = parseInt(saleCategorySelect.value);
    const description = saleDescriptionInput.value.trim();

    if (isNaN(clientId) || isNaN(amount) || amount <= 0 || isNaN(categoryId)) {
        alert('Por favor, rellena todos los campos de venta correctamente.');
        return;
    }

    try {
        await registerSale(clientId, amount, categoryId, description);
        alert('Venta registrada con éxito.');
        closeModal(addSaleModal);
        await fetchDashboardData(); 
        
    } catch (error) {
        console.error('Error al registrar venta:', error);
        alert('Error al registrar venta. Verifique que el Client ID exista.');
    }
}

// --- ABONO ---
function handleOpenUpdateDebtModal(e) {
    const clientId = e.target.dataset.clientId;
    const clientName = e.target.dataset.clientName;
    
    CURRENT_DEBT_CLIENT_ID = clientId;
    debtClientDisplay.textContent = `${clientName} (ID: ${clientId})`;
    openModal(updateDebtModal);
}

async function handleUpdateDebt(e) {
    e.preventDefault();
    
    const client_id = parseInt(CURRENT_DEBT_CLIENT_ID); 
    const paymentAmount = parseFloat(debtPaymentAmountInput.value);

    if (isNaN(client_id) || !client_id) {
        alert('Error: No se ha seleccionado un cliente válido.');
        return;
    }

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        alert('Por favor, ingresa un monto de abono válido.');
        return;
    }

    try {
        await registerPayment(client_id, paymentAmount);
        alert('Abono registrado con éxito.');
        closeModal(updateDebtModal);
        await fetchDashboardData(); 
        
    } catch (error) {
        console.error('Error al registrar abono:', error);
        alert('Error al registrar abono. Revise la consola.');
    }
}

// --- CATEGORÍA ---
async function handleNewCategory(e) {
    e.preventDefault();

    const nameInput = e.target.querySelector('#categoryName');
    const descInput = e.target.querySelector('#categoryDescription');

    const name = nameInput.value.trim();
    const description = descInput.value.trim();

    if (!name) {
        alert('El nombre de la categoría es obligatorio.');
        return;
    }

    try {
        await registerCategory(name, description);
        alert('Categoría creada con éxito.');
        await renderCategoryAdmin(); // Recargar la lista y el select
    } catch (error) {
        console.error('Error al crear categoría:', error);
        alert('Error al crear categoría.');
    }
}

async function handleDeleteCategory(e) {
    const categoryId = e.target.dataset.categoryId; 
    
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría? Se eliminarán también las ventas asociadas.')) {
        return;
    }

    try {
        await deleteCategory(categoryId); 
        alert('Categoría eliminada con éxito.');
        await renderCategoryAdmin(); 
        await fetchDashboardData(); // Refrescar ventas si es necesario
        
    } catch (error) {
        console.error('Error al borrar categoría:', error);
        alert('Error al borrar la categoría. Revise la consola.');
    }
}


// ===============================================
// 7. EVENT LISTENERS
// ===============================================

function setupEventListeners() {
    // Autenticación
    loginForm.addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Abrir Modales
    document.getElementById('addSaleBtn').addEventListener('click', () => openModal(addSaleModal));
    document.getElementById('updateDebtBtn').addEventListener('click', () => openModal(updateDebtModal)); // Botón opcional desde el dashboard
    document.getElementById('addProductAdminBtn').addEventListener('click', async () => {
        await renderCategoryAdmin();
        openModal(productAdminModal);
    });
    document.getElementById('openProfileModalBtn').addEventListener('click', () => openModal(userProfileModal));
    
    // Cierre de Modales
    document.getElementById('close-add-sale-modal').addEventListener('click', () => closeModal(addSaleModal));
    document.getElementById('close-update-debt-modal').addEventListener('click', () => closeModal(updateDebtModal));
    document.getElementById('close-product-admin-modal').addEventListener('click', () => closeModal(productAdminModal));
    document.getElementById('closeProfileModal').addEventListener('click', () => closeModal(userProfileModal));

    // Asignación de Forms (Venta y Abono)
    addSaleForm.addEventListener('submit', handleNewSale);
    updateDebtForm.addEventListener('submit', handleUpdateDebt);
    
    // NOTA: El listener del formulario de Categoría (handleNewCategory) se reasigna
    // dentro de renderCategoryAdmin porque el HTML del formulario se regenera.
}


// ===============================================
// 8. INICIALIZACIÓN DE LA APLICACIÓN (Reforzado)
// ===============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Inicialización de Supabase, garantizando que el SDK ya está cargado.
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    setupEventListeners();

    // Simulación de estado de usuario: si no hay sesión, muestra el login
    // En un proyecto real, se usaría supabase.auth.getSession()
    
    // Simulamos un login exitoso por ahora para cargar el dashboard
    authModal.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // Carga inicial de datos
    await fetchDashboardData(); 
    await renderCategoryAdmin(); // Pre-carga categorías para el select de venta
});