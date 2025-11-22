// main.js

// ----------------------------------------------------
// 1. IMPORTACIONES
// ----------------------------------------------------
import './style.css' 
import { createClient } from '@supabase/supabase-js';

// NOTA IMPORTANTE: Para que Select2 (que usa $) funcione, DEBES cargar 
// jQuery y Select2 en tu index.html ANTES de este script.

// ===============================================
// 2. CONFIGURACIÓN E INICIALIZACIÓN DE SUPABASE
// ===============================================
const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 


// ===============================================
// 3. VARIABLES GLOBALES Y ELEMENTOS DOM
// ===============================================

// Variables de estado
let CURRENT_DEBT_CLIENT_ID = null;

// Contenedores de la aplicación
const authModal = document.getElementById('auth-modal');
const appContainer = document.getElementById('app-container');

// Elementos del Resumen (KPIs)
const totalSalesDisplay = document.getElementById('totalSalesDisplay');
const totalDebtDisplay = document.getElementById('totalDebtDisplay');
const debtorCountDisplay = document.getElementById('debtorCountDisplay');

// Tablas
const debtListBody = document.getElementById('debtListBody'); 
const salesListBody = document.getElementById('salesListBody'); 
const adminContentArea = document.getElementById('admin-content-area');

// Forms y Modales
const loginForm = document.getElementById('login-form');
const addSaleForm = document.getElementById('add-sale-form');
const updateDebtForm = document.getElementById('update-debt-form');
const addSaleModal = document.getElementById('add-sale-modal');
const updateDebtModal = document.getElementById('update-debt-modal');
const productAdminModal = document.getElementById('product-admin-modal');
const userProfileModal = document.getElementById('user-profile-modal');

// Elementos específicos de formularios y displays
const saleClientIdInput = document.getElementById('sale-client-id');
const saleAmountInput = document.getElementById('sale-amount');
const saleDescriptionInput = document.getElementById('sale-description');
const debtClientDisplay = document.getElementById('debt-client-display');
const debtPaymentAmountInput = document.getElementById('debt-payment-amount');

// Selects para la jerarquía de Venta (VERIFICADOS)
const baseProductSelect = document.getElementById('base-product-id'); 
const subcategorySelect = document.getElementById('subcategory-id');


// ===============================================
// 4. FUNCIONES DE AUTENTICACIÓN (Placeholder)
// ===============================================

async function handleLogin(e) {
    e.preventDefault();
    alert('Simulación: Acceso exitoso. En un proyecto real, use supabase.auth.signInWithPassword.');
    
    authModal.classList.add('hidden');
    appContainer.classList.remove('hidden');
    await fetchDashboardData(); 
}

async function handleLogout() {
    alert('Sesión cerrada. En un proyecto real, use supabase.auth.signOut().');
    
    appContainer.classList.add('hidden');
    authModal.classList.remove('hidden');
}


// ===============================================
// 5. FUNCIONES CRUD GENERALES
// ===============================================

/**
 * Registra una nueva venta. Ahora usa una descripción detallada.
 */
async function registerSale(clientId, amount, categoryId, detailedDescription) {
    const { error } = await supabase
        .from('ventas')
        .insert([
            {
                client_id: clientId,
                amount: amount,
                category_id: categoryId, 
                products: detailedDescription, 
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

/**
 * Registra un nuevo item (Producto MAIN o Subcategoría PACKAGE).
 */
async function registerItem(name, type, parentProductId, price) {
    
    const parentId = type === 'MAIN' ? null : parseInt(parentProductId) || null;

    const { error } = await supabase
        .from('categorias') 
        .insert([{ 
            name: name, 
            type: type, 
            parent_product: parentId,
            price: price 
        }]); 

    if (error) throw new Error('Error al crear item: ' + error.message);
    return true;
}

async function deleteCategory(itemId) {
    const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', itemId);

    if (error) throw new Error('Error al borrar item: ' + error.message);
    return true;
}


// ===============================================
// 6. FUNCIONES DE RENDERIZADO Y DASHBOARD
// ===============================================

async function fetchDashboardData() {
    try {
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

        let salesData = 0;
        const { data: salesResult } = await supabase
            .from('total_ventas_dashboard')
            .select('total_sales')
            .single();

        if (salesResult) {
            salesData = parseFloat(salesResult.total_sales);
        }
        
        totalSalesDisplay.textContent = `$${salesData.toFixed(2)}`;
        totalDebtDisplay.textContent = `$${totalDebt.toFixed(2)}`;
        debtorCountDisplay.textContent = debtorCount;
        
        await renderDebtList();
        await renderSalesList(); 

    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
}

async function renderDebtList() {
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
                products,
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
            const itemDescription = sale.products || (sale.categorias?.name ?? 'N/A'); 
            const dateDisplay = new Date(sale.created_at).toLocaleString();

            return `
                <tr class="hover:bg-gray-50">
                    <td class="p-4 whitespace-nowrap text-sm text-gray-900">${clientName}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-semibold text-green-600">$${parseFloat(sale.amount).toFixed(2)}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${itemDescription}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${dateDisplay}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-medium">
                        <button data-sale-id="${sale.id}" class="edit-sale-btn text-indigo-600 hover:text-indigo-900 text-sm py-1 px-2 rounded bg-indigo-100">
                            Editar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        

    } catch (error) {
        console.error('Error al cargar lista de ventas:', error);
        salesListBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Error al cargar ventas.</td></tr>';
    }
}


// ===============================================
// 7. FUNCIONES DE CARGA JERÁRQUICA DE VENTA
// ===============================================

/**
 * Carga los productos base (los de type = 'MAIN').
 */
async function fetchBaseProducts() {
    const { data, error } = await supabase
        .from('categorias') 
        .select('id, name')
        .eq('type', 'MAIN') 
        .order('name');
        
    if (error) throw error;
    return data;
}

/**
 * Carga las subcategorías (los de type = 'PACKAGE') que dependen del padre.
 */
async function fetchSubcategories(baseProductId) {
    if (!baseProductId) return [];
    
    const { data, error } = await supabase
        .from('categorias')
        .select('id, name, price') 
        .eq('type', 'PACKAGE') 
        .eq('parent_product', parseInt(baseProductId)) 
        .order('name');
        
    if (error) throw error;
    return data;
}

async function renderSaleSelects() {
    try {
        if (!baseProductSelect || !subcategorySelect) {
            console.warn("Elementos de selección de venta no encontrados. Verifique su HTML.");
            return;
        }

        const baseProducts = await fetchBaseProducts(); 
        
        // 1. Llenar el select de Productos Principales (MAIN)
        baseProductSelect.innerHTML = '<option value="">-- Seleccionar Producto Base --</option>';
        baseProducts.forEach(p => {
            baseProductSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
        
        // 2. Limpiar e inicializar el select de Subcategorías (PACKAGE)
        subcategorySelect.innerHTML = '<option value="">-- Seleccionar Subcategoría --</option>'; 
        addSaleForm.reset(); 

    } catch (error) {
        console.error("Error al cargar selects de venta:", error);
    }
}

async function handleBaseProductChange() {
    const baseProductId = baseProductSelect.value;
    
    // Destruir Select2 para actualizar el HTML interno y volver a inicializar
    if (typeof $ !== 'undefined' && $('#subcategory-id').data('select2')) {
        $('#subcategory-id').select2('destroy');
    }
    
    subcategorySelect.innerHTML = '<option value="">-- Seleccionar Subcategoría --</option>';
    
    if (baseProductId) {
        try {
            const subcategories = await fetchSubcategories(baseProductId); 
            subcategories.forEach(s => {
                const price = s.price ? parseFloat(s.price).toFixed(2) : '0.00';
                subcategorySelect.innerHTML += `<option value="${s.id}" data-price="${price}">${s.name} (+ $${price})</option>`;
            });
        } catch (error) {
            console.error("Error al cargar subcategorías:", error);
        }
    }
    
    // Volver a inicializar Select2 después de actualizar el HTML
    if (typeof $ !== 'undefined') {
        $('#subcategory-id').select2({
            dropdownParent: $('#add-sale-modal'),
            placeholder: "-- Seleccionar Subcategoría --",
            allowClear: true
        });
    }
}


// ===============================================
// 8. MANEJO DE FORMULARIOS Y MODALES
// ===============================================

function openModal(modal) {
    modal.classList.remove('hidden');
}

function closeModal(modal) {
    // 🛑 Destruir Select2 al cerrar el modal de venta
    if (modal.id === 'add-sale-modal' && typeof $ !== 'undefined' && $('#subcategory-id').data('select2')) {
        $('#subcategory-id').select2('destroy');
    }
    
    modal.classList.add('hidden');
    if (modal.querySelector('form')) {
        modal.querySelector('form').reset();
    }
}

// --- VENTA (Ajustado a jerarquía) ---
async function handleNewSale(e) {
    e.preventDefault();

    const clientId = parseInt(saleClientIdInput.value);
    const amount = parseFloat(saleAmountInput.value);
    
    // Select2 usa el valor del select.
    const subcategoryId = subcategorySelect.value;
    
    if (!baseProductSelect.value || !subcategoryId) {
        alert('Por favor, selecciona un Producto Base y una Subcategoría.');
        return;
    }
    
    const baseProductText = baseProductSelect.options[baseProductSelect.selectedIndex].text;
    const subcategoryText = subcategorySelect.options[subcategorySelect.selectedIndex].text;
    
    const detailedDescription = `${baseProductText} > ${subcategoryText} | Notas: ${saleDescriptionInput.value.trim()}`;
    

    if (isNaN(clientId) || isNaN(amount) || amount <= 0) {
        alert('Por favor, rellena el ID del cliente y el monto de la venta correctamente.');
        return;
    }

    try {
        await registerSale(clientId, amount, subcategoryId, detailedDescription);
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

// --- ADMINISTRACIÓN DE ITEMS (Productos y Servicios) ---

function setupAdminListeners() {
    const newCatForm = document.getElementById('newCategoryForm');
    if (newCatForm) {
        newCatForm.removeEventListener('submit', handleNewItem); 
        newCatForm.addEventListener('submit', handleNewItem);
    }
    
    adminContentArea.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteItem);
        btn.addEventListener('click', handleDeleteItem);
    });

    adminContentArea.querySelectorAll('.select-main-btn').forEach(row => {
        row.removeEventListener('click', handleMainProductClick); 
        row.addEventListener('click', handleMainProductClick);
    });
}

// Función de renderizado del HTML de la lista de Items (Productos/Subcategorías)
function renderItemList(items, type) {
    if (!items || items.length === 0) {
        return '<p class="text-gray-500 p-4">No hay items de este tipo registrados.</p>';
    }
    
    let html = `
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    html += items.map(item => `
        <tr class="hover:bg-gray-50 ${type === 'MAIN' ? 'cursor-pointer select-main-btn' : ''} ${type === 'MAIN' && item.selected ? 'bg-yellow-100' : ''}" 
            ${type === 'MAIN' ? `data-main-id="${item.id}" data-main-name="${item.name}"` : ''}>
            
            <td class="p-3 whitespace-nowrap text-sm font-medium text-gray-900">${item.name}</td>
            <td class="p-3 whitespace-nowrap text-sm text-green-600">$${parseFloat(item.price || 0).toFixed(2)}</td>
            <td class="p-3 whitespace-nowrap text-sm font-medium">
                <button data-category-id="${item.id}" 
                        class="delete-category-btn text-red-600 hover:text-red-900 text-sm">
                    Eliminar
                </button>
            </td>
        </tr>
    `).join('');

    html += `</tbody></table></div>`;
    return html;
}

/**
 * Renderiza la lista de Subcategorías, opcionalmente filtrada por un Producto Padre.
 */
async function renderPackagesList(mainId = null, mainName = 'Todos') {
    const packagesContent = document.getElementById('packages-content');
    const filterStatus = document.getElementById('subcategory-filter-status');
    
    if (!packagesContent || !filterStatus) return; 
    
    // 🛑 CORRECCIÓN: Si no hay ID de producto principal, muestra la instrucción y sale.
    if (!mainId) {
        packagesContent.innerHTML = '<p class="text-gray-500 p-4">Seleccione un Producto Principal de la columna izquierda para ver sus Subcategorías asociadas.</p>';
        filterStatus.textContent = ' (Seleccione Producto Base)';
        // Necesitamos resetear la clase de selección en MAINs si se deselecciona.
        document.querySelectorAll('.select-main-btn').forEach(row => {
            row.classList.remove('bg-yellow-100');
        });
        return; 
    }

    try {
        let query = supabase
            .from('categorias')
            .select('id, name, type, price, parent_product')
            .eq('type', 'PACKAGE')
            .eq('parent_product', parseInt(mainId)) // Filtrar por el MAIN ID
            .order('name');

        filterStatus.textContent = ` (Filtrando por: ${mainName})`;

        const { data: packages, error } = await query;
        if (error) throw error;
        
        // Maneja el caso en que el MAIN no tiene Packages asociados
        if (packages.length === 0) {
            packagesContent.innerHTML = '<p class="text-gray-500 p-4">Este Producto Principal no tiene Subcategorías (PACKAGE) asignadas.</p>';
        } else {
            packagesContent.innerHTML = renderItemList(packages, 'PACKAGE');
        }
        
        setupAdminListeners(); 
        
    } catch (error) {
        console.error('Error al cargar lista de subcategorías filtradas:', error);
        packagesContent.innerHTML = '<p class="text-red-500 p-4">Error al cargar subcategorías.</p>';
    }
}

/**
 * Maneja el clic en un Producto Principal para filtrar Subcategorías.
 */
function handleMainProductClick(e) {
    const mainId = e.currentTarget.dataset.mainId;
    const mainName = e.currentTarget.dataset.mainName;
    
    const allMainRows = document.querySelectorAll('.select-main-btn');
    const isCurrentlySelected = e.currentTarget.classList.contains('bg-yellow-100');

    // Quitar la selección a todas las filas
    allMainRows.forEach(row => {
        row.classList.remove('bg-yellow-100');
    });
    
    if (isCurrentlySelected) {
        // Si estaba seleccionado, lo deseleccionamos y mostramos lista vacía
        renderPackagesList(null); 
    } else {
        // Seleccionamos la nueva fila y cargamos sus packages
        e.currentTarget.classList.add('bg-yellow-100');
        renderPackagesList(mainId, mainName);
    }
}

// Función de carga y renderizado de la interfaz de administración
async function renderCategoryAdmin() {
    try {
        const { data: items, error } = await supabase
            .from('categorias')
            .select('id, name, type, price, parent_product'); 

        if (error) throw error;
        
        const mainProducts = items.filter(item => item.type === 'MAIN');
        
        const parentSelectOptions = mainProducts.map(p => 
            `<option value="${p.id}">${p.name}</option>`
        ).join('');

        
        adminContentArea.innerHTML = `
            <h4 class="text-xl font-bold mb-4">Gestión de Items (MAIN / PACKAGE)</h4>
            
            <div class="p-4 border rounded-lg bg-gray-50 mb-6">
                <h4 class="text-lg font-semibold mb-3">Crear Nuevo Item</h4>
                <form id="newCategoryForm" class="space-y-3 md:flex md:space-y-0 md:space-x-3 items-end">
                    
                    <div class="w-full md:w-1/5">
                        <label for="itemType" class="block text-sm font-medium text-gray-700">Tipo</label>
                        <select id="itemType" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                            <option value="">-- Seleccionar Tipo --</option>
                            <option value="MAIN">Producto Principal</option>
                            <option value="PACKAGE">PACKAGE</option>
                        </select>
                    </div>

                    <div class="w-full md:w-1/5" id="parentProductContainer">
                        <label for="parentProductId" class="block text-sm font-medium text-gray-700">Padre (Solo PACKAGE)</label>
                        <select id="parentProductId" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" disabled>
                            <option value="">N/A</option>
                            ${parentSelectOptions}
                        </select>
                    </div>

                    <div class="w-full md:w-1/5">
                        <label for="itemName" class="block text-sm font-medium text-gray-700">Nombre</label>
                        <input type="text" id="itemName" required placeholder="Nombre" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                    </div>
                    
                    <div class="w-full md:w-1/5">
                        <label for="itemPrice" class="block text-sm font-medium text-gray-700">Precio</label>
                        <input type="number" step="0.01" id="itemPrice" placeholder="(Opcional) 0.00" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                    </div>

                    <button type="submit" class="w-full md:w-1/5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded h-10">
                        Guardar
                    </button>
                </form>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div class="p-4 border rounded-lg bg-white shadow-md">
                    <h5 class="text-lg font-semibold mb-3">📦 Productos Principales (Haga clic para filtrar)</h5>
                    
                    <div class="max-h-96 overflow-y-auto"> 
                        ${renderItemList(mainProducts, 'MAIN')}
                    </div>
                </div>

                <div class="p-4 border rounded-lg bg-white shadow-md">
                    <h5 class="text-lg font-semibold mb-3">🛠️ Subcategorías <span id="subcategory-filter-status" class="text-sm font-normal text-indigo-500"> (Seleccione Producto Base)</span></h5>
                    
                    <div id="packages-content" class="max-h-96 overflow-y-auto"> 
                        <p class="text-gray-500 p-4">Seleccione un Producto Principal de la columna izquierda para ver sus Subcategorías asociadas.</p>
                        </div>
                </div>
            </div>
        `;
        
        setupAdminListeners();

        document.getElementById('itemType').addEventListener('change', (e) => {
            const parentSelect = document.getElementById('parentProductId');
            parentSelect.disabled = (e.target.value !== 'PACKAGE');
            if (e.target.value === 'MAIN') {
                parentSelect.value = ""; 
            }
        });


    } catch (error) {
        console.error('Error al cargar lista de ítems:', error);
        adminContentArea.innerHTML = '<p class="text-red-500">Error al cargar ítems. Revise la consola.</p>';
    }
}

async function handleNewItem(e) {
    e.preventDefault();

    const nameInput = e.target.querySelector('#itemName');
    const priceInput = e.target.querySelector('#itemPrice');
    const typeSelect = e.target.querySelector('#itemType');
    const parentSelect = e.target.querySelector('#parentProductId');

    const name = nameInput.value.trim();
    const type = typeSelect.value;
    const parentProductId = parentSelect.value;
    
    const price = priceInput.value === '' ? null : parseFloat(priceInput.value); 

    if (!name || !type) {
        alert('El nombre y el tipo de item son obligatorios.');
        return;
    }
    
    if (priceInput.value !== '' && isNaN(price)) {
        alert('El valor del precio debe ser un número válido.');
        return;
    }

    if (type === 'PACKAGE' && !parentProductId) {
        alert('Las subcategorías (PACKAGE) deben tener un Producto Padre (MAIN) asignado.');
        return;
    }

    try {
        await registerItem(name, type, parentProductId, price); 
        
        alert(`Item de tipo "${type}" creado con éxito.`);
        await renderCategoryAdmin(); 
        
    } catch (error) {
        console.error('Error al crear item:', error);
        alert('Error al crear item. Revise la consola.');
    }
}

async function handleDeleteItem(e) {
    const itemId = e.target.dataset.categoryId; 
    
    if (!confirm('¿Estás seguro de que deseas eliminar este item? Esto puede romper la jerarquía o borrar ventas asociadas.')) {
        return;
    }

    try {
        await deleteCategory(itemId); 
        alert('Item eliminado con éxito.');
        await renderCategoryAdmin(); 
        await fetchDashboardData(); 
        
    } catch (error) {
        console.error('Error al borrar item:', error);
        alert('Error al borrar el item. Revise la consola.');
    }
}

// ===============================================
// 9. EVENT LISTENERS Y INICIALIZACIÓN
// ===============================================

function setupEventListeners() {
    // ------------------------------------
    // Autenticación y Perfil
    // ------------------------------------
    loginForm.addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('openProfileModalBtn').addEventListener('click', () => openModal(userProfileModal));

    // ------------------------------------
    // Abrir Modales
    // ------------------------------------
    document.getElementById('addSaleBtn').addEventListener('click', async () => {
        await renderSaleSelects(); 
        openModal(addSaleModal);
        
        // ✨ Inicializar Select2 al abrir
        if (typeof $ !== 'undefined') {
            $('#subcategory-id').select2({
                dropdownParent: $('#add-sale-modal'), 
                placeholder: "-- Seleccionar Subcategoría --",
                allowClear: true
            });
        }
    });
    document.getElementById('addProductAdminBtn').addEventListener('click', async () => {
        await renderCategoryAdmin();
        openModal(productAdminModal);
    });
    
    // ------------------------------------
    // Cierre de Modales
    // ------------------------------------
    document.getElementById('close-add-sale-modal').addEventListener('click', () => closeModal(addSaleModal));
    document.getElementById('close-update-debt-modal').addEventListener('click', () => closeModal(updateDebtModal));
    document.getElementById('close-product-admin-modal').addEventListener('click', () => closeModal(productAdminModal));
    document.getElementById('closeProfileModal').addEventListener('click', () => closeModal(userProfileModal));

    // ------------------------------------
    // Asignación de Forms (Venta y Abono)
    // ------------------------------------
    addSaleForm.addEventListener('submit', handleNewSale);
    updateDebtForm.addEventListener('submit', handleUpdateDebt);
    
    // ------------------------------------
    // Selects Encadenados (Venta)
    // ------------------------------------
    if (baseProductSelect) { 
        baseProductSelect.addEventListener('change', handleBaseProductChange);
    } else {
        console.warn("Elemento 'base-product-id' no encontrado en el DOM. Verifique su HTML de venta.");
    }
}


// BLOQUE DE INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();

    // Simulación de estado de usuario:
    authModal.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    await fetchDashboardData(); 
});