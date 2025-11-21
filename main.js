// main.js

import './style.css'; 
import { createClient } from '@supabase/supabase-js'; 

// ----------------------------------------------------------------------
// 1. CONFIGURACIÓN DE SUPABASE (¡REEMPLAZAR!)
// ----------------------------------------------------------------------

const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variable global para almacenar los productos, incluyendo el campo parent_product
let allProducts = [];

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
        if (formId === 'update-debt-form') button.textContent = 'Guardar Deuda';
        if (formId === 'edit-sale-form') button.textContent = 'Guardar Cambios';
        if (formId === 'add-product-form') {
            const title = document.getElementById('product-form-title').textContent;
            button.textContent = title.includes('Editar') ? 'Guardar Cambios' : 'Guardar Producto';
        }
        
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
};

// ----------------------------------------------------------------------
// 3. MANEJO DE DATOS Y RENDERIZADO
// ----------------------------------------------------------------------

async function loadDashboardData() {
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
        .select('*')
        .gt('debt', 0); 

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
    
    allProducts = data; // Almacenar todos los productos
    populateProductSelects(data);
    populateParentProductSelect(); // Llenar selectores de Administración
    renderProductAdminTable(data);
}

/** Llena el selector principal de Venta y resetea el de paquetes */
function populateProductSelects(products) {
    const mainSelect = document.getElementById('sale-products-select');
    const packageSelect = document.getElementById('sale-package-type');

    // Resetear ambos
    mainSelect.innerHTML = '<option value="">Seleccione una opción...</option>';
    packageSelect.innerHTML = '<option value="">Ninguno (Opcional)</option>';

    // Filtramos solo los productos principales (MAIN)
    const mainProducts = products.filter(p => p.type === 'MAIN');

    mainProducts.forEach(product => {
        mainSelect.innerHTML += `<option value="${product.name}">${product.name}</option>`;
    });
}

/** Filtra y llena el selector de tipos de paquete basado en la selección principal */
function filterPackagesByMainProduct(mainProductName) {
    const packageSelect = document.getElementById('sale-package-type');
    
    packageSelect.innerHTML = '<option value="">Ninguno (Opcional)</option>';

    if (!mainProductName) {
        return; 
    }

    // Filtra productos que sean 'PACKAGE' Y cuyo 'parent_product' coincida con el nombre seleccionado.
    const relevantPackages = allProducts.filter(p => 
        p.type === 'PACKAGE' && p.parent_product === mainProductName
    );

    relevantPackages.forEach(packageItem => {
        packageSelect.innerHTML += `<option value="${packageItem.name}">${packageItem.name}</option>`;
    });
}

/** Llena el selector de producto padre en el modal de administración */
function populateParentProductSelect() {
    const parentSelect = document.getElementById('product-parent-product');
    // Guardamos el valor actual por si se está editando
    const currentValue = parentSelect.value;
    
    parentSelect.innerHTML = '<option value="">Ninguno</option>';

    // Filtramos solo los productos principales (MAIN) de la lista global
    const mainProducts = allProducts.filter(p => p.type === 'MAIN');

    mainProducts.forEach(product => {
        parentSelect.innerHTML += `<option value="${product.name}">${product.name}</option>`;
    });
    
    // Restaurar el valor si se estaba editando
    parentSelect.value = currentValue;
}


// --- LÓGICA DE RENDERIZADO DEL DASHBOARD ---

function updateSummary(sales, clients) {
    const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const totalDebtAmount = clients.reduce((sum, client) => sum + (client.debt || 0), 0);
    const debtorCount = clients.filter(client => (client.debt || 0) > 0).length;

    document.getElementById('total-sales').textContent = formatter.format(totalSalesAmount);
    document.getElementById('total-debt').textContent = formatter.format(totalDebtAmount);
    document.getElementById('debtor-count').textContent = debtorCount;

    document.body.classList.remove('loading-hide');
}

/** * Renderiza la tabla de administración de productos, agrupándolos 
 * por productos principales (MAIN) y luego sus paquetes (PACKAGE).
 */
function renderProductAdminTable(products) {
    const listEl = document.getElementById('products-admin-list');
    listEl.innerHTML = ''; 

    if (products.length === 0) {
        listEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay productos/opciones registradas.</td></tr>`;
        return;
    }

    // 1. Agrupar productos por categoría principal
    const groupedProducts = {};
    const mainProducts = products.filter(p => p.type === 'MAIN');
    const packageProducts = products.filter(p => p.type === 'PACKAGE');
    
    // Inicializar grupos con los productos MAIN
    mainProducts.forEach(main => {
        groupedProducts[main.name] = {
            main: main,
            packages: []
        };
    });

    // Asignar paquetes a su producto principal
    packageProducts.forEach(pkg => {
        if (groupedProducts[pkg.parent_product]) {
            groupedProducts[pkg.parent_product].packages.push(pkg);
        } else {
            // Manejar paquetes huérfanos si es necesario (aquí se ignoran si no tienen MAIN padre)
        }
    });

    // 2. Renderizar la tabla usando la estructura agrupada
    let htmlContent = '';

    Object.values(groupedProducts).forEach(group => {
        const main = group.main;
        
        // --- FILA DEL PRODUCTO PRINCIPAL (MAIN) ---
        htmlContent += `
            <tr class="bg-gray-100 border-b border-gray-300 hover:bg-gray-200">
                <td class="p-4 text-sm font-bold text-gray-900">${main.name} <span class="text-xs text-blue-600">(PRINCIPAL)</span></td>
                <td class="p-4 text-sm font-bold text-gray-500">MAIN</td>
                <td class="p-4 text-sm text-gray-500">${main.description || '-'}</td>
                <td class="p-4 text-sm text-gray-500 flex gap-2">
                    <button 
                        data-id="${main.id}" 
                        data-name="${main.name}" 
                        data-type="${main.type}" 
                        data-description="${main.description || ''}" 
                        data-parent="${main.parent_product || ''}" 
                        class="edit-product-btn text-blue-600 hover:text-blue-800"
                        title="Editar Producto">
                        ✏️ Editar
                    </button>
                    <button 
                        data-id="${main.id}" 
                        data-name="${main.name}" 
                        class="delete-product-btn text-red-600 hover:text-red-800"
                        title="Eliminar Producto">
                        🗑️
                    </button>
                </td>
            </tr>
        `;

        // --- FILAS DE LOS PAQUETES (PACKAGE) ASOCIADOS ---
        group.packages.forEach(pkg => {
            htmlContent += `
                <tr class="hover:bg-gray-50">
                    <td class="p-4 text-sm text-gray-900 pl-8">↳ ${pkg.name}</td>
                    <td class="p-4 text-sm text-gray-500">PACKAGE</td>
                    <td class="p-4 text-sm text-gray-500">${pkg.description || '-'}</td>
                    <td class="p-4 text-sm text-gray-500 flex gap-2">
                        <button 
                            data-id="${pkg.id}" 
                            data-name="${pkg.name}" 
                            data-type="${pkg.type}" 
                            data-description="${pkg.description || ''}" 
                            data-parent="${pkg.parent_product || ''}" 
                            class="edit-product-btn text-blue-600 hover:text-blue-800"
                            title="Editar Producto">
                            ✏️ Editar
                        </button>
                        <button 
                            data-id="${pkg.id}" 
                            data-name="${pkg.name}" 
                            class="delete-product-btn text-red-600 hover:text-red-800"
                            title="Eliminar Producto">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    listEl.innerHTML = htmlContent;
    
    // 3. Inicializar las acciones de editar/eliminar para todas las filas nuevas
    initializeProductAdminActions();
}

/** Renderiza la lista de ventas. */
function renderSales(sales) {
    const listEl = document.getElementById('sales-list');
    listEl.innerHTML = `
        <tr class="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-100">
            <th class="p-4 text-left">Cliente</th>
            <th class="p-4 text-left">Monto</th>
            <th class="p-4 text-left">Fecha</th>
            <th class="p-4 text-left product-header">Productos</th>
            <th class="p-4 text-left">Acciones</th>
        </tr>
    `;
    
    if (sales.length === 0) {
        listEl.innerHTML += `<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>`;
        return;
    }

    sales.slice(0, 10).forEach(sale => {
        const date = sale.date ? new Date(sale.date).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
        }) : 'N/A';
        
        const saleId = sale.id; 
        const productsText = sale.products || 'N/A'; 

        const row = `
            <tr class="hover:bg-gray-50">
                <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${sale.clientName || 'N/A'}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${formatter.format(sale.amount || 0)}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                
                <td class="p-4 text-sm text-gray-500 product-cell" title="${productsText}">
                    ${productsText}
                </td>
                
                <td class="p-4 whitespace-nowrap text-sm text-gray-500 flex gap-2">
                    <button 
                        data-sale-id="${saleId}" 
                        data-client="${sale.clientName}" 
                        data-amount="${sale.amount}" 
                        data-products="${sale.products}" 
                        class="edit-sale-btn text-blue-600 hover:text-blue-800"
                        title="Editar Venta">
                        ✏️
                    </button>
                    <button 
                        data-sale-id="${saleId}" 
                        class="delete-sale-btn text-red-600 hover:text-red-800"
                        title="Eliminar Venta">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
        listEl.innerHTML += row;
    });
    
    initializeSaleActions();
}

/** Renderiza la lista de deudas. */
function renderDebts(clients) {
    const listEl = document.getElementById('debt-list');
    
    const debtors = clients.filter(client => (client.debt || 0) > 0);
    
    const tbody = listEl.querySelector('tbody') || listEl; 
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
                        class="quick-edit-debt-btn text-blue-600 hover:text-blue-800"
                        title="Editar o Liquidar Deuda">
                        ✏️ Editar
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    
    initializeDebtActions();
}

// ----------------------------------------------------------------------
// 4. MANEJO DE FORMULARIOS Y ACCIONES
// ----------------------------------------------------------------------

// 4.1. Registrar Nueva Venta (¡LÓGICA DE DEUDA ACTUALIZADA!)
document.getElementById('add-sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('add-sale-form', true); 
    
    const clientName = document.getElementById('sale-client-name').value.trim();
    const amount = parseFloat(document.getElementById('sale-amount').value);
    
    const selectedProduct = document.getElementById('sale-products-select').value;
    const packageType = document.getElementById('sale-package-type').value; 
    const description = document.getElementById('sale-description').value.trim();
    const category = document.getElementById('sale-category').value; 
    
    if (!clientName || isNaN(amount) || amount <= 0 || !selectedProduct) {
        alert("Por favor, complete el nombre del cliente, el monto de la venta y seleccione un producto principal.");
        toggleLoading('add-sale-form', false);
        return;
    }
    
    // 1. REGISTRAR VENTA
    // Formato: [Categoría] Producto Principal (Paquete) | Detalle: Descripción
    let productsCombined = `[${category}] ${selectedProduct}`;

    if (packageType) {
        productsCombined += ` (${packageType})`;
    }

    if (description) {
        productsCombined += ` | Detalle: ${description}`;
    }

    if (!productsCombined) {
        productsCombined = 'N/A';
    }
    
    const { error: saleError } = await supabase.from('ventas').insert({
        clientName: clientName, 
        amount: amount, 
        products: productsCombined, 
        date: new Date().toISOString(), 
    });
    
    if (saleError) {
        console.error("Error al registrar venta:", saleError);
        alert(`Hubo un error al registrar la venta. Código: ${saleError.code}`);
        toggleLoading('add-sale-form', false);
        return;
    }

    // 2. ACTUALIZAR/INSERTAR DEUDA DEL CLIENTE
    
    // A. Intentar obtener el cliente actual (para saber si existe y cuál es su deuda actual)
    const { data: existingClient } = await supabase
        .from('clientes')
        .select('debt')
        .eq('name', clientName)
        .single();
    
    let newDebt = amount; 

    if (existingClient) {
        // Si el cliente existe, sumar el monto de la nueva venta a la deuda existente.
        const currentDebt = existingClient.debt || 0;
        newDebt = currentDebt + amount;
    }
    
    // B. Insertar o Actualizar (UPSERT) la deuda con el nuevo monto
    const { error: debtError } = await supabase.from('clientes').upsert(
        {
            name: clientName, 
            debt: newDebt, 
            lastUpdate: new Date().toISOString()
        }, 
        { onConflict: 'name' } 
    );
    
    if (debtError) {
        console.error("Error al actualizar deuda tras venta:", debtError);
        // La venta se registró, pero la deuda falló. 
    }

    // 3. FINALIZACIÓN
    hideModal('add-sale-modal');
    document.getElementById('add-sale-form').reset();
    loadDashboardData(); 
    
    toggleLoading('add-sale-form', false); 
});

// 4.2. Actualizar/Insertar Deuda 
document.getElementById('update-debt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('update-debt-form', true); 
    
    const clientName = document.getElementById('debt-client-name').value.trim();
    const debtAmount = parseFloat(document.getElementById('debt-amount').value);
    
    if (!clientName || isNaN(debtAmount) || debtAmount < 0) {
        alert("Por favor, complete el nombre del cliente y un monto de deuda válido (>= 0).");
        toggleLoading('update-debt-form', false);
        return;
    }

    const { error } = await supabase.from('clientes').upsert(
        {
            name: clientName, 
            debt: debtAmount, 
            lastUpdate: new Date().toISOString()
        }, 
        { onConflict: 'name' } 
    );
    
    if (!error) {
        hideModal('update-debt-modal');
        document.getElementById('update-debt-form').reset();

        if (debtAmount === 0) {
            alert(`✅ La deuda de ${clientName} ha sido liquidada con éxito.`);
        } else {
            alert(`✅ La deuda de ${clientName} ha sido actualizada a ${formatter.format(debtAmount)}.`);
        }

        loadDashboardData(); 
    } else {
        console.error("Error al actualizar deuda:", error);
        alert(`Hubo un error al actualizar la deuda. Código: ${error.code}`);
    }
    
    toggleLoading('update-debt-form', false); 
});

// 4.3. CRUD DE ADMINISTRACIÓN DE PRODUCTOS
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('add-product-form', true); 

    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value.trim();
    const type = document.getElementById('product-type').value; 
    const description = document.getElementById('product-description').value.trim();
    
    // Capturar el campo de relación
    let parentProduct = null;
    if (type === 'PACKAGE') {
        parentProduct = document.getElementById('product-parent-product').value || null;
    }

    const productData = { 
        name, 
        type, 
        description: description || null,
        parent_product: parentProduct
    }; 
    let error;
    
    if (type === 'PACKAGE' && !parentProduct) {
        alert("Un Tipo de Paquete debe estar asociado a un Producto Principal.");
        toggleLoading('add-product-form', false);
        return;
    }

    if (id) {
        // Modo Edición (UPDATE)
        const { error: updateError } = await supabase.from('productos')
            .update(productData)
            .eq('id', id);
        error = updateError;
    } else {
        // Modo Creación (INSERT)
        const { error: insertError } = await supabase.from('productos')
            .insert(productData);
        error = insertError;
    }

    if (!error) {
        document.getElementById('add-product-form').reset();
        document.getElementById('product-id').value = '';
        document.getElementById('add-product-form').classList.add('hidden');
        document.getElementById('parent-product-field').classList.add('hidden'); // Ocultar
        
        // Recargar datos para actualizar selectores y tablas
        await loadProductsAndPopulate(); 
        
    } else {
        console.error("Error al guardar producto:", error);
        alert(`Error al guardar producto: ${error.message || error.code}`);
    }

    toggleLoading('add-product-form', false); 
});


/** Inicializa las acciones de Editar/Eliminar en la tabla de productos */
function initializeProductAdminActions() {
    // Editar
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const name = e.currentTarget.dataset.name;
            const type = e.currentTarget.dataset.type; 
            const description = e.currentTarget.dataset.description;
            const parent = e.currentTarget.dataset.parent;

            // Llenar el formulario
            document.getElementById('product-id').value = id;
            document.getElementById('product-name').value = name;
            document.getElementById('product-type').value = type; 
            document.getElementById('product-description').value = description;
            
            // Lógica para mostrar/ocultar y llenar el campo padre
            const isPackage = type === 'PACKAGE';
            document.getElementById('parent-product-field').classList.toggle('hidden', !isPackage);
            document.getElementById('product-parent-product').value = parent;

            // Mostrar formulario y cambiar título
            document.getElementById('product-form-title').textContent = `Editar Producto: ${name}`;
            document.getElementById('add-product-form').classList.remove('hidden');
        });
    });

    // Eliminar
    document.querySelectorAll('.delete-product-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const name = e.currentTarget.dataset.name;
            
            if (confirm(`¿Estás seguro de que quieres eliminar la opción "${name}"? Esto no afectará las ventas existentes, pero ya no estará disponible para nuevas ventas.`)) {
                
                const { error } = await supabase
                    .from('productos')
                    .delete()
                    .eq('id', id); 

                if (error) {
                    console.error("Error al eliminar producto:", error);
                    alert("Error al eliminar el producto.");
                } else {
                    await loadProductsAndPopulate();
                }
            }
        });
    });
}

// 4.4. Lógica para botones de Editar y Eliminar Ventas
function initializeSaleActions() {
    document.querySelectorAll('.edit-sale-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.saleId;
            const client = e.currentTarget.dataset.client;
            const amount = e.currentTarget.dataset.amount;
            const products = e.currentTarget.dataset.products;

            document.getElementById('edit-sale-id').value = id;
            document.getElementById('edit-sale-client-name').value = client;
            document.getElementById('edit-sale-amount').value = amount;
            document.getElementById('edit-sale-products').value = products;

            showModal('edit-sale-modal');
        });
    });

    document.querySelectorAll('.delete-sale-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.saleId;
            
            if (confirm("¿Estás seguro de que quieres eliminar esta venta permanentemente? Esta acción es irreversible.")) {
                
                const { error } = await supabase
                    .from('ventas')
                    .delete()
                    .eq('id', id); 

                if (error) {
                    console.error("Error al eliminar venta:", error);
                    alert("Error al eliminar la venta.");
                } else {
                    loadDashboardData(); 
                }
            }
        });
    });
}

// 4.5. Lógica para los botones de edición rápida de deuda
function initializeDebtActions() {
    document.querySelectorAll('.quick-edit-debt-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const clientName = e.currentTarget.dataset.clientName;
            
            // Intentar encontrar la deuda actual para precargar
            const clientRow = e.currentTarget.closest('tr');
            const debtAmountText = clientRow.cells[1].textContent.replace('$', '').replace(/,/g, '');
            const currentDebt = parseFloat(debtAmountText) || 0;
            
            document.getElementById('debt-client-name').value = clientName;
            document.getElementById('debt-amount').value = currentDebt; 
            
            showModal('update-debt-modal');
            document.getElementById('debt-amount').focus(); 
        });
    });
}

// 4.6. Manejar el envío del formulario de Edición de Venta (UPDATE)
document.getElementById('edit-sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('edit-sale-form', true); 
    
    const id = document.getElementById('edit-sale-id').value;
    const clientName = document.getElementById('edit-sale-client-name').value.trim();
    const amount = parseFloat(document.getElementById('edit-sale-amount').value);
    const products = document.getElementById('edit-sale-products').value.trim();
    
    if (!id || !clientName || isNaN(amount) || amount <= 0) {
        alert("Datos inválidos.");
        toggleLoading('edit-sale-form', false);
        return;
    }
    
    const { error } = await supabase
        .from('ventas')
        .update({
            clientName: clientName, 
            amount: amount, 
            products: products 
        })
        .eq('id', id); 

    if (!error) {
        hideModal('edit-sale-modal');
        document.getElementById('edit-sale-form').reset();
        loadDashboardData(); 
    } else {
        console.error("Error al guardar cambios:", error);
        alert(`Hubo un error al actualizar la venta. Código: ${error.code}`);
    }
    
    toggleLoading('edit-sale-form', false); 
});


// ----------------------------------------------------------------------
// 5. INICIALIZACIÓN Y LISTENERS DE EVENTOS
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // Conectar botones principales
    document.getElementById('addSaleBtn').addEventListener('click', () => {
        showModal('add-sale-modal');
        document.getElementById('add-sale-form').reset(); 
        // Asegurar que el selector de paquetes esté vacío al inicio
        document.getElementById('sale-package-type').innerHTML = '<option value="">Ninguno (Opcional)</option>'; 
    });
    
    document.getElementById('updateDebtBtn').addEventListener('click', () => {
        showModal('update-debt-modal');
        document.getElementById('update-debt-form').reset(); 
        document.getElementById('debt-client-name').focus(); 
    });
    
    // Botón para abrir la administración de productos
    document.getElementById('addProductAdminBtn').addEventListener('click', () => {
        loadProductsAndPopulate(); 
        showModal('product-admin-modal');
        document.getElementById('add-product-form').classList.add('hidden');
        document.getElementById('parent-product-field').classList.add('hidden');
    });

    // 💡 LISTENER CLAVE: Lógica de selectores encadenados (Venta)
    document.getElementById('sale-products-select').addEventListener('change', (e) => {
        const selectedMainProduct = e.target.value;
        filterPackagesByMainProduct(selectedMainProduct);
    });

    // 💡 LISTENER CLAVE: Lógica para mostrar/ocultar el selector Padre en Administración
    document.getElementById('product-type').addEventListener('change', (e) => {
        const isPackage = e.target.value === 'PACKAGE';
        document.getElementById('parent-product-field').classList.toggle('hidden', !isPackage);
        // Reseteamos el valor del padre si cambiamos a MAIN
        if (!isPackage) {
             document.getElementById('product-parent-product').value = '';
        }
    });


    // Botón para mostrar el formulario de agregar producto (CORRECCIÓN APLICADA AQUÍ)
    document.getElementById('showAddProductFormBtn').addEventListener('click', () => {
        document.getElementById('add-product-form').classList.remove('hidden');
        document.getElementById('product-form-title').textContent = 'Agregar Nuevo Producto';
        document.getElementById('add-product-form').reset();
        document.getElementById('product-id').value = '';
        
        // CORRECCIÓN: Asegurar que el selector de tipo tenga un valor por defecto y la dependencia se oculte.
        document.getElementById('parent-product-field').classList.add('hidden'); 
        document.getElementById('product-type').value = 'MAIN'; 
        
        // Aseguramos que el select de padre esté lleno
        populateParentProductSelect(); 
    });
    
    // Botón para cancelar agregar/editar producto
    document.getElementById('cancelAddProduct').addEventListener('click', () => {
        document.getElementById('add-product-form').classList.add('hidden');
        document.getElementById('add-product-form').reset();
    });

    // Botón para cerrar el modal de administración
    document.getElementById('closeProductAdminModal').addEventListener('click', () => hideModal('product-admin-modal'));

    // Conectar botones de Cancelar de los modales existentes
    document.getElementById('cancelAddSale').addEventListener('click', () => hideModal('add-sale-modal'));
    document.getElementById('cancelUpdateDebt').addEventListener('click', () => hideModal('update-debt-modal'));
    document.getElementById('cancelEditSale').addEventListener('click', () => hideModal('edit-sale-modal'));
    
    // Conectar el botón de salir (simulado con recarga)
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        window.location.reload(); 
    });

    loadDashboardData(); 
});