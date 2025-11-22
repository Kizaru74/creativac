// main.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.0/+esm';

// Configuración de Supabase (CLAVES PROPORCIONADAS)
const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// #####################################################################
// I. VARIABLES GLOBALES DE UI
// #####################################################################

// Contenedores principales
const authModal = document.getElementById('auth-modal');
const appContainer = document.getElementById('app-container');

// Formularios
const loginForm = document.getElementById('login-form');
const addSaleForm = document.getElementById('add-sale-form');
const updateDebtForm = document.getElementById('update-debt-form');
const profileUpdateForm = document.getElementById('profile-update-form');

// Botones de acción
const addSaleBtn = document.getElementById('addSaleBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addProductAdminBtn = document.getElementById('addProductAdminBtn'); // Botón para abrir admin

// Modales
const addSaleModal = document.getElementById('add-sale-modal');
const updateDebtModal = document.getElementById('update-debt-modal');
const productAdminModal = document.getElementById('product-admin-modal');
const userProfileModal = document.getElementById('user-profile-modal');
const productPackageModal = document.getElementById('product-package-modal'); // Modal de Subcategorías

// Contenedores de datos
const debtListBody = document.getElementById('debtListBody');
const salesListBody = document.getElementById('salesListBody');
const totalSalesDisplay = document.getElementById('totalSalesDisplay');
const totalDebtDisplay = document.getElementById('totalDebtDisplay');
const debtorCountDisplay = document.getElementById('debtorCountDisplay');

// Selects para el formulario de venta (usando jQuery para Select2)
const baseProductIdSelect = $('#base-product-id');
const subcategoryIdSelect = $('#subcategory-id');

// Administración de Productos
const mainProductsContent = document.getElementById('main-products-content');
const addMainProductForm = document.getElementById('add-main-product-form');
const packageMainProductName = document.getElementById('package-main-product-name');
const addPackageForm = document.getElementById('add-package-form');
const packagesListBody = document.getElementById('packages-list-body');


// #####################################################################
// II. UTILIDADES Y MANEJO DE ESTADO
// #####################################################################

let currentDebtorId = null;

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(amount);
}

function toggleAppVisibility(isAuthenticated) {
    if (isAuthenticated) {
        authModal.classList.add('hidden');
        appContainer.classList.remove('hidden');
        if (debtListBody.innerHTML === '') {
            fetchDashboardData();
        }
    } else {
        authModal.classList.remove('hidden');
        appContainer.classList.add('hidden');
        debtListBody.innerHTML = '';
        salesListBody.innerHTML = '';
        totalSalesDisplay.textContent = '...';
        totalDebtDisplay.textContent = '...';
        debtorCountDisplay.textContent = '...';
    }
}

function handleSupabaseError(context, error) {
    console.error(`Error en ${context}:`, error);
    alert(`Error al ${context}: ${error.message || error}`);
}

// #####################################################################
// III. LÓGICA DE AUTENTICACIÓN Y VENTA
// #####################################################################

// Función para registrar venta (usa RPC)
async function registerSale({ clientName, amount, baseProductId, subcategoryId, description }) {
    const saleAmount = parseFloat(amount);
    
    try {
        const { error: debtUpdateError } = await supabase
            .rpc('update_client_debt', {
                p_client_name: clientName, 
                p_amount: saleAmount,
                p_main_product_id: parseInt(baseProductId),
                p_package_id: parseInt(subcategoryId),
                p_description: description
            });

        if (debtUpdateError) throw new Error(`Error al procesar venta: ${debtUpdateError.message}`);

        alert(`Venta registrada con éxito. Se sumaron ${formatCurrency(saleAmount)} a la deuda de ${clientName}.`);
        
        fetchDashboardData();
        addSaleModal.classList.add('hidden');

    } catch (error) {
        handleSupabaseError('registrar venta', error);
    }
}

function initAuth() {
    supabase.auth.getSession().then(({ data: { session } }) => {
        toggleAppVisibility(!!session);
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: identifier,
                password: password,
            });

            if (error) {
                alert(`Error de autenticación: ${error.message}. Asegúrate de que las credenciales sean correctas.`);
                return;
            }
            toggleAppVisibility(true);

        } catch (error) {
            handleSupabaseError('autenticar', error);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await supabase.auth.signOut();
            toggleAppVisibility(false);
            window.location.reload(); 
        } catch (error) {
            handleSupabaseError('cerrar sesión', error);
        }
    });
}

// #####################################################################
// IV. DASHBOARD - CARGA DE DATOS
// #####################################################################

async function fetchDashboardData() {
    await Promise.all([
        fetchAggregates(),
        fetchTopDebts(),
        fetchLatestSales(), 
        populateProductSelects()
    ]);
}

async function fetchAggregates() {
    try {
        // Asumiendo que estas 3 funciones RPC ya están corregidas en el SQL
        const { data: sales, error: salesError } = await supabase.rpc('get_total_sales'); 
        const { data: debt, error: debtError } = await supabase.rpc('get_total_debt'); 
        const { data: debtorCount, error: countError } = await supabase.rpc('get_debtor_count'); 

        if (salesError || debtError || countError) {
            throw new Error(salesError?.message || debtError?.message || countError?.message);
        }

        totalSalesDisplay.textContent = formatCurrency(sales[0]?.total_sales || 0);
        totalDebtDisplay.textContent = formatCurrency(debt[0]?.total_debt || 0);
        debtorCountDisplay.textContent = (debtorCount[0]?.debtor_count || 0).toString();

    } catch (error) {
        handleSupabaseError('cargar resumen', error);
    }
}

// Consulta la tabla 'clientes' (USANDO name y debt)
async function fetchTopDebts() {
    try {
        const { data, error } = await supabase
            .from('clientes') 
            .select('id, name, debt, last_update') // <-- USAMOS 'name' y 'debt'
            .gt('debt', 0) 
            .order('debt', { ascending: false }) 
            .limit(5);

        if (error) throw error;

        debtListBody.innerHTML = data.map(debtor => `
            <tr class="hover:bg-gray-50">
                <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${debtor.name}</td> 
                <td class="p-4 whitespace-nowrap text-sm font-bold text-red-600">${formatCurrency(debtor.debt)}</td> 
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${new Date(debtor.last_update).toLocaleDateString()}</td>
                <td class="p-4 whitespace-nowrap text-sm">
                    <button data-client-id="${debtor.id}" class="open-update-debt-modal text-indigo-600 hover:text-indigo-900">
                        Registrar Abono
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        handleSupabaseError('cargar deudas', error);
        debtListBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar deudas.</td></tr>';
    }
}

// Consulta la vista 'transacciones_detalle_view'
async function fetchLatestSales() {
    try {
        const { data, error } = await supabase
            .from('transacciones_detalle_view') 
            .select(`
                client_name, 
                amount, 
                created_at,
                main_product_name,
                package_name
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        salesListBody.innerHTML = data.map(sale => `
            <tr class="hover:bg-gray-50">
                <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${sale.client_name}</td>
                <td class="p-4 whitespace-nowrap text-sm text-green-600">${formatCurrency(sale.amount)}</td>
                <td class="p-4 text-sm text-gray-500 product-cell" title="${sale.main_product_name} / ${sale.package_name || ''}">
                    ${sale.main_product_name || 'N/A'} / ${sale.package_name || 'N/A'}
                </td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${new Date(sale.created_at).toLocaleDateString()}</td>
                <td class="p-4 whitespace-nowrap text-sm">
                    <span class="text-gray-400">Detalle</span>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        handleSupabaseError('cargar ventas recientes', error);
        salesListBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Error al cargar ventas recientes. Asegúrate de que la tabla/vista "transacciones_detalle_view" exista.</td></tr>';
    }
}

// #####################################################################
// V. PRODUCTOS - POBLAR SELECTS EN MODAL DE VENTA
// #####################################################################

async function populateProductSelects() {
    try {
        // 1. Cargar Productos Principales (type = MAIN)
        const { data: mainProducts, error: mainError } = await supabase
            .from('productos')
            .select('id, name')
            .eq('type', 'MAIN')
            .order('name');

        if (mainError) throw mainError;

        baseProductIdSelect.empty().append('<option value="">-- Seleccionar Producto Base --</option>');
        mainProducts.forEach(p => {
            baseProductIdSelect.append(new Option(p.name, p.id));
        });

        // 2. Manejar el cambio en el Producto Principal
        baseProductIdSelect.on('change', async function() {
            const mainId = $(this).val();
            subcategoryIdSelect.empty().prop('disabled', true).select2('destroy').val('').select2();
            
            if (mainId) {
                // Cargar Subcategorías (type = PACKAGE y parent_product = ID del MAIN)
                const { data: packages, error: packageError } = await supabase
                    .from('productos') 
                    .select('id, name')
                    .eq('type', 'PACKAGE')
                    .eq('parent_product', mainId)
                    .order('name');
                
                if (packageError) throw packageError;

                subcategoryIdSelect.append('<option value="">-- Seleccionar Subcategoría --</option>');
                packages.forEach(p => {
                    subcategoryIdSelect.append(new Option(p.name, p.id));
                });
                subcategoryIdSelect.prop('disabled', false).select2('destroy').select2({
                    width: '100%',
                    dropdownParent: addSaleModal 
                });
            }
        }).select2({
            width: '100%',
            dropdownParent: addSaleModal
        });
        
        subcategoryIdSelect.select2({
            width: '100%',
            dropdownParent: addSaleModal
        }).prop('disabled', true);

    } catch (error) {
        handleSupabaseError('poblar selectores de productos', error);
    }
}


// #####################################################################
// VI. ADMINISTRACIÓN DE PRODUCTOS PRINCIPALES (productos)
// #####################################################################

async function fetchMainProducts() {
    try {
        // CORREGIDO: Usamos 'productos' y filtramos por MAIN
        const { data, error } = await supabase
            .from('productos')
            .select('id, name, description') 
            .eq('type', 'MAIN')
            .order('name');

        if (error) throw error;
        
        mainProductsContent.innerHTML = renderItemList(data, 'MAIN');
        attachAdminEventListeners(); 

    } catch (error) {
        handleSupabaseError('cargar productos principales', error);
        mainProductsContent.innerHTML = '<p class="text-red-500">Error al cargar productos principales.</p>';
    }
}

function renderItemList(items, type) {
    if (!items || items.length === 0) {
        return '<p class="text-gray-500 p-4">No hay productos registrados.</p>';
    }
    
    if (type !== 'MAIN') return; 

    let html = `
    <div class="border border-gray-200 rounded-lg max-h-96 overflow-y-auto"> 
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0 z-10"> 
                <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    html += items.map(item => `
        <tr class="hover:bg-gray-50">
            <td class="p-3 whitespace-nowrap text-sm font-medium text-gray-900">${item.name}</td>
            <td class="p-3 text-sm text-gray-500 truncate max-w-xs">${item.description || 'N/A'}</td>
            <td class="p-3 whitespace-nowrap text-sm font-medium space-x-2">
                <button data-main-id="${item.id}" data-main-name="${item.name}" 
                        class="view-packages-btn text-blue-600 hover:text-blue-900 text-sm">
                    Ver Subcategorías
                </button>
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

function initProductAdminModal() {
    addProductAdminBtn.addEventListener('click', () => {
        productAdminModal.classList.remove('hidden');
        // AÑADIDO/CONFIRMADO: Llamamos a la función para cargar los productos MAIN al abrir el modal.
        fetchMainProducts(); 
    });

    document.getElementById('close-product-admin-modal').addEventListener('click', () => {
        productAdminModal.classList.add('hidden');
    });

    // Crear Producto Principal
    addMainProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-main-name').value.trim();
        const description = document.getElementById('new-main-description').value;

        try {
            const { error } = await supabase
                .from('productos')
                .insert([{ 
                    name, 
                    description, 
                    type: 'MAIN',
                    parent_product: null 
                }]);

            if (error) throw error;
            
            alert(`Producto Principal "${name}" creado con éxito.`);
            addMainProductForm.reset();
            fetchMainProducts(); // Recargar la lista
            populateProductSelects(); // Recargar selects de venta

        } catch (error) {
            handleSupabaseError('crear producto principal', error);
        }
    });
}

function attachAdminEventListeners() {
    // 1. Eliminar Producto Principal
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.categoryId;
            if (!confirm('¿Está seguro de eliminar este Producto Principal? Esto eliminará también sus subcategorías.')) return;

            try {
                const { error } = await supabase
                    .from('productos')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                
                alert('Producto Principal eliminado con éxito.');
                fetchMainProducts();
                populateProductSelects(); // Recargar selects de venta

            } catch (error) {
                handleSupabaseError('eliminar producto principal', error);
            }
        });
    });

    // 2. Abrir Modal de Subcategorías
    document.querySelectorAll('.view-packages-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mainId = e.target.dataset.mainId;
            const mainName = e.target.dataset.mainName;
            openPackageAdminModal(mainId, mainName);
        });
    });
}


// #####################################################################
// VII. ADMINISTRACIÓN DE SUBCATEGORÍAS (PACKAGE)
// #####################################################################

function openPackageAdminModal(mainId, mainName) {
    packageMainProductName.textContent = mainName;
    addPackageForm.dataset.mainId = mainId;
    
    productAdminModal.classList.add('hidden');
    productPackageModal.classList.remove('hidden');

    fetchAndRenderPackages(mainId);
}

function closePackageAdminModal() {
    productPackageModal.classList.add('hidden');
    productAdminModal.classList.remove('hidden');
    addPackageForm.reset();
}

document.getElementById('close-product-package-modal').addEventListener('click', closePackageAdminModal);


async function fetchAndRenderPackages(mainId) {
    try {
        const { data, error } = await supabase
            .from('productos')
            .select('id, name, description')
            .eq('type', 'PACKAGE')
            .eq('parent_product', mainId)
            .order('name');

        if (error) throw error;
        
        renderPackageList(data);
        attachPackageEventListeners();

    } catch (error) {
        handleSupabaseError('cargar subcategorías', error);
        packagesListBody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-red-500">Error al cargar subcategorías.</td></tr>';
    }
}

function renderPackageList(packages) {
    if (!packages || packages.length === 0) {
        packagesListBody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">No hay subcategorías registradas para este producto.</td></tr>';
        return;
    }

    packagesListBody.innerHTML = packages.map(pkg => `
        <tr class="hover:bg-gray-50">
            <td class="p-3 whitespace-nowrap text-sm font-medium text-gray-900">${pkg.name}</td>
            <td class="p-3 text-sm text-gray-500 truncate max-w-xs">${pkg.description || 'N/A'}</td>
            <td class="p-3 whitespace-nowrap text-sm font-medium">
                <button data-package-id="${pkg.id}" 
                        class="delete-package-btn text-red-600 hover:text-red-900 text-sm">
                    Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

function attachPackageEventListeners() {
    document.querySelectorAll('.delete-package-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const packageId = e.target.dataset.packageId;
            const mainId = addPackageForm.dataset.mainId;
            if (!confirm('¿Está seguro de eliminar esta Subcategoría?')) return;

            try {
                const { error } = await supabase
                    .from('productos') 
                    .delete()
                    .eq('id', packageId);

                if (error) throw error;
                
                alert('Subcategoría eliminada con éxito.');
                fetchAndRenderPackages(mainId); 
                populateProductSelects(); // Recargar selects de venta

            } catch (error) {
                handleSupabaseError('eliminar subcategoría', error);
            }
        });
    });
}

// Crear Subcategoría
addPackageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mainId = e.target.dataset.mainId;
    const name = document.getElementById('new-package-name').value.trim();
    const description = document.getElementById('new-package-description').value;

    if (!mainId) {
        alert('Error: No se pudo obtener el ID del producto principal.');
        return;
    }

    try {
        const { error } = await supabase
            .from('productos') 
            .insert([{ 
                name, 
                description,
                type: 'PACKAGE',
                parent_product: parseInt(mainId) 
            }]);

        if (error) throw error;
        
        alert(`Subcategoría "${name}" creada con éxito.`);
        addPackageForm.reset();
        fetchAndRenderPackages(mainId); 
        populateProductSelects(); // Recargar selects de venta

    } catch (error) {
        handleSupabaseError('crear subcategoría', error);
    }
});


// #####################################################################
// VIII. OTROS LISTENERS DE EVENTOS (Venta y Abono)
// #####################################################################

// Listener para abrir modal de Venta
addSaleBtn.addEventListener('click', () => {
    addSaleModal.classList.remove('hidden');
    populateProductSelects(); 
});

// Listener para cerrar modal de Venta
document.getElementById('close-add-sale-modal').addEventListener('click', () => {
    addSaleModal.classList.add('hidden');
    addSaleForm.reset();
    baseProductIdSelect.select2('destroy').val('').select2();
    subcategoryIdSelect.select2('destroy').val('').select2();
});

// Listener para Abrir Modal de Abono (delegación de eventos)
debtListBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('open-update-debt-modal')) {
        currentDebtorId = e.target.dataset.clientId;
        // Obtenemos el nombre del cliente de la primera celda <td>
        document.getElementById('debt-client-display').textContent = e.target.closest('tr').querySelector('td').textContent;
        updateDebtModal.classList.remove('hidden');
    }
});

// Listener para cerrar modal de Abono
document.getElementById('close-update-debt-modal').addEventListener('click', () => {
    updateDebtModal.classList.add('hidden');
    updateDebtForm.reset();
    currentDebtorId = null;
});


// Enviar Formulario de Venta
addSaleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientName = document.getElementById('sale-client-name').value;
    const amount = document.getElementById('sale-amount').value;
    const baseProductId = baseProductIdSelect.val();
    const subcategoryId = subcategoryIdSelect.val();
    const description = document.getElementById('sale-description').value;

    if (!baseProductId || !subcategoryId) {
        alert('Por favor, selecciona tanto el Producto Principal como la Subcategoría.');
        return;
    }

    await registerSale({ clientName, amount, baseProductId, subcategoryId, description });
});

// Enviar Formulario de Abono
updateDebtForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('debt-payment-amount').value;

    if (!currentDebtorId || !amount) {
        alert('Faltan datos de cliente o monto de abono.');
        return;
    }

    try {
        // Usa el ID del cliente de la tabla clientes
        const { error } = await supabase
            .rpc('register_payment', {
                p_client_id: parseInt(currentDebtorId), 
                p_amount: parseFloat(amount)
            });

        if (error) throw error;
        
        alert(`Abono de ${formatCurrency(amount)} registrado con éxito.`);
        fetchDashboardData();
        updateDebtModal.classList.add('hidden');

    } catch (error) {
        handleSupabaseError('registrar abono', error);
    }
});

// #####################################################################
// IX. INICIALIZACIÓN
// #####################################################################

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initProductAdminModal();
});