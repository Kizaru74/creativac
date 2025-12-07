// ====================================================================
// 1. CONFIGURACIÓN INICIAL DE SUPABASE Y VARIABLES GLOBALES
// ====================================================================

const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

let supabase;
let allProducts = []; 
let currentSaleItems = []; 
let editingClientId = null;
let editingProductId = null;
let debtToPayId = null;
let allClients = []; // 👈 ¡AÑADIR ESTA LÍNEA!
let allClientsMap = {};


// ✅ CORRECCIÓN CRÍTICA: Inicializar Supabase directamente, fuera del try/catch.
if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Error Fatal: Librería Supabase no encontrada. La aplicación no funcionará.");
    supabase = null; // Asignar null para que las llamadas subsiguientes puedan manejarlo sin crash
}

// ====================================================================
// 2. UTILIDADES Y MANEJO DE MODALES
// ====================================================================

// ✅ MONEDA: PESO MEXICANO (MXN)
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-MX', options);
}

function getMonthDateRange(monthString) {
    if (!monthString) return { start: null, end: null };
    const [year, month] = monthString.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); 
    const start = startDate.toISOString().substring(0, 10);
    const end = endDate.toISOString().substring(0, 10); 
    return { start, end };
}

window.openModal = function(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('flex'); 
        modal.classList.remove('hidden');
    }
}

window.closeModal = function(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}


// ====================================================================
// 3. AUTENTICACIÓN Y SESIÓN
// ====================================================================

async function checkUserSession() {
    const { data: { user } } = await supabase.auth.getUser();

    const authContainer = document.getElementById('auth-container');
    const mainContent = document.getElementById('dashboard-container'); 
    
    if (!authContainer || !mainContent) {
        console.error("Error: Los contenedores 'auth-container' o 'dashboard-container' no se encontraron en el HTML.");
        return; 
    }

    if (user) {
        authContainer.classList.add('hidden');
        mainContent.classList.remove('hidden');
        await loadDashboardData();
    } else {
        authContainer.classList.remove('hidden');
        mainContent.classList.add('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert(error.message);
    } else {
        checkUserSession();
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    checkUserSession();
}

// ====================================================================
// 4. LÓGICA DEL DASHBOARD: CARGA DE DATOS
// ====================================================================

async function loadTotals() {
    const filterInput = document.getElementById('sales-month-filter');
    const filterStatus = document.getElementById('filter-status');
    const monthFilterValue = filterInput?.value;
    const { start: startDate, end: endDate } = getMonthDateRange(monthFilterValue);

    let salesQuery = supabase
        .from('ventas')
        .select('total_amount');

    let statusText = 'Total histórico';

    if (startDate && endDate) {
        salesQuery = salesQuery
            .gte('created_at', startDate)
            .lt('created_at', endDate);
        
        const reportMonthYear = new Date(startDate).toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long' 
        });
        statusText = `Total del mes de ${reportMonthYear}`; 
    }

    const { data: salesData, error: salesError } = await salesQuery;

    if (salesError) {
        console.error('Error al cargar ventas:', salesError);
        document.getElementById('total-sales').textContent = formatCurrency(0);
        if (filterStatus) filterStatus.textContent = 'Error al cargar';
        return;
    }

    const totalSales = salesData.reduce((sum, sale) => sum + sale.total_amount, 0);
    document.getElementById('total-sales').textContent = formatCurrency(totalSales);
    if (filterStatus) filterStatus.textContent = statusText;

    const { data: debtData, error: debtError } = await supabase
        .from('ventas')
        .select('saldo_pendiente')
        .gt('saldo_pendiente', 0);

    if (debtError) {
        console.error('Error al cargar deudas:', debtError);
        document.getElementById('total-debt').textContent = formatCurrency(0);
        return;
    }

    const totalDebt = debtData.reduce((sum, debt) => sum + debt.saldo_pendiente, 0);
    document.getElementById('total-debt').textContent = formatCurrency(totalDebt);
}

async function loadDebts() {
    try {
        const { data, error } = await supabase
            .from('ventas')
            .select('venta_id, created_at, total_amount, saldo_pendiente, clientes(name, client_id)') // 👈 Añadimos client_id para el modal de deuda
            .gt('saldo_pendiente', 0.01) 
            .order('created_at', { ascending: false })
            .limit(5); 

        if (error) {
            console.error('Error al cargar tabla de deudas:', error);
            return;
        }

        const container = document.getElementById('debt-sales-body'); 
        if (!container) return; 
        
        // 1. Limpiar el contenedor antes de dibujar
        container.innerHTML = '';
        
        const noDebtMessage = document.getElementById('no-debt-message');
        if (noDebtMessage) noDebtMessage.classList.add('hidden');

        if (data.length === 0) {
            if (noDebtMessage) noDebtMessage.classList.remove('hidden');
            return;
        }

        // 2. Renderizar filas (Preparando el botón para el re-enlace)
        data.forEach(debt => {
            const clientName = debt.clientes?.name || 'Cliente Desconocido';
            // Para el modal de deuda, es mejor pasar el client_id
            const clientId = debt.clientes?.client_id; 
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            row.innerHTML = `
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${debt.venta_id}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${clientName}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm font-bold text-red-600">${formatCurrency(debt.saldo_pendiente)}</td>
                <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        type="button" 
                        class="view-debt-btn" 
                        data-client-id="${clientId}" 
                        data-sale-id="${debt.venta_id}" // Si necesitas la venta, mantenla
        class="view-debt-btn bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-1 px-2 rounded"
                    >
                        Detalles/Pagar
                    </button>
                </td>
            `;
            container.appendChild(row);
        });

        // =======================================================
        // 🛑 CRÍTICO: RE-ENLACE DE EVENTOS (Abre el modal de deuda del cliente)
        // =======================================================
        container.querySelectorAll('.view-debt-btn').forEach(button => {
            button.addEventListener('click', () => {
                const clientId = button.dataset.clientId;
                
                // ➡️ Esta función debe ser la que abre el modal-client-debt
                handleViewClientDebt(clientId); 
            });
        });

    } catch (e) {
        console.error('Error inesperado en loadDebts:', e);
    }
}

async function loadRecentSales() {
    try {
        // 1. Consulta a Supabase
        const { data, error } = await supabase
            .from('ventas')
            // 🛑 CORRECCIÓN: Añadimos client_id para poder llamar a handleViewSaleDetails
            .select(`venta_id, created_at, total_amount, saldo_pendiente, clientes(name, client_id), description`)
            .order('created_at', { ascending: false })
            .limit(7); 

        if (error) {
            console.error('Error al cargar ventas recientes:', error);
            return;
        }

        const container = document.getElementById('recent-sales-body');
        const noSalesMessage = document.getElementById('no-sales-message');
        if (!container) return; 

        // 2. Limpieza de Contenedores y Mensajes
        container.innerHTML = '';
        if (noSalesMessage) noSalesMessage.classList.add('hidden');

        if (data.length === 0) {
            if (noSalesMessage) noSalesMessage.classList.remove('hidden');
            return;
        }

        // 3. Renderizado de Filas
        data.forEach(sale => {
            const clientName = sale.clientes?.name || 'Cliente Desconocido';
            const clientId = sale.clientes?.client_id; // ⬅️ Obtenemos el client_id
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${sale.venta_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${clientName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(sale.created_at)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold">${formatCurrency(sale.total_amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${sale.saldo_pendiente > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(sale.saldo_pendiente)}</td>
                
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"> 
                    <button type="button" 
                            class="view-sale-details-btn text-indigo-600 hover:text-indigo-900 font-semibold text-xs py-1 px-2 rounded bg-indigo-100"
                            data-sale-id="${sale.venta_id}"
                            data-client-id="${clientId}"> 
                        Detalles
                    </button>
                </td>
            `;
            container.appendChild(row);
        });

        // =======================================================
        // 🛑 CRÍTICO: RE-ENLACE DE EVENTOS (Llamando a la función correcta)
        // =======================================================
        container.querySelectorAll('.view-sale-details-btn').forEach(button => {
            button.addEventListener('click', () => {
                const saleId = button.dataset.saleId;
                const clientId = button.dataset.clientId; // ⬅️ Leemos el client_id
                
                // ✅ Llamamos a tu función existente con los dos argumentos
                handleViewSaleDetails(saleId, clientId); 
            });
        });

    } catch (e) {
        console.error('Error inesperado en loadRecentSales:', e);
    }
}

function openSaleDetailModal(saleId) {
    console.log('Abriendo modal de detalles para Venta ID:', saleId);
    // Aquí va el código para obtener detalles de la venta y llamar a openModal('sale-details-modal')
}

async function loadDashboardData() {
    await loadTotals();
    await loadDebts();
    await loadRecentSales();
    await loadClientsTable('gestion');
    await loadProductsData(); 
    await loadProductsTable(); 
    await loadClientsForSale(); 
}

// ====================================================================
// 5. CARGA DE DATOS PARA SELECTORES
// ====================================================================

async function loadClientsForSale() {
    const select = document.getElementById('client-select');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Cargando clientes...</option>';

    const { data, error } = await supabase
        .from('clientes')
        .select('client_id, name') 
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al cargar clientes para venta:', error);
        select.innerHTML = '<option value="" disabled selected>Error al cargar (revisar consola)</option>';
        return;
    }

    if (data.length === 0) {
        select.innerHTML = '<option value="" disabled selected>No hay clientes activos</option>';
        return;
    }
    
    select.innerHTML = '<option value="" disabled selected>Seleccione un Cliente</option>';
    
    data.forEach(client => {
        const option = document.createElement('option');
        option.value = client.client_id;
        option.textContent = client.name;
        select.appendChild(option);
    });
}

async function loadProductsData() {
   if (!supabase) {
        console.warn("Supabase no inicializado. No se pudieron cargar los productos.");
        return; 
    }

    // ✅ CORRECCIÓN: Se consulta 'producto_id' y se elimina 'cost_price'
    const { data, error } = await supabase
        .from('productos')
        .select('producto_id, name, type, price, parent_product'); 

    if (error) {
        console.error('Error al cargar todos los productos:', error);
        allProducts = [];
        return;
    }
    allProducts = data || [];
}

function handleChangeProductForSale() {
    const mainSelect = document.getElementById('product-main-select');
    const subSelect = document.getElementById('subproduct-select');
    const priceInput = document.getElementById('product-unit-price');
    
    // Verificación de existencia de elementos y datos
    if (!mainSelect || !subSelect || !priceInput || typeof allProducts === 'undefined') return;

    const productId = mainSelect.value;
    
    // 1. Limpieza inicial: Deshabilitar subselect y limpiar precio
    subSelect.innerHTML = '<option value="" selected>Sin Paquete</option>';
    subSelect.disabled = true; 
    priceInput.value = '0.00';
    
    if (!productId) {
        return; 
    }

    // 2. Búsqueda robusta del producto seleccionado (Producto Base)
    const selectedProduct = allProducts.find(p => String(p.producto_id) === String(productId));
    
    if (!selectedProduct) {
        console.warn(`Producto principal con ID ${productId} no encontrado.`);
        return;
    }
    
    // 3. Establecer el precio por defecto (el del producto principal)
    updatePriceField(productId);
    
    // 4. Filtrar y buscar los subproductos (paquetes)
    const subProducts = allProducts.filter(p => 
        // a) El tipo debe ser 'PACKAGE'
        p.type && p.type.trim().toUpperCase() === 'PACKAGE' && 
        // b) DEBE tener un parent_product no nulo
        p.parent_product &&
        // c) Comparación estricta de IDs (ambas forzadas a String)
        String(p.parent_product) === String(productId) 
    );
    
    if (subProducts.length > 0) {
        // 5. Si hay subproductos: Habilitar el selector y cargarlo
        subSelect.disabled = false; // ⬅️ HABILITA EL SELECTOR
        
        subSelect.innerHTML = '<option value="" disabled selected>Seleccione un Paquete</option>';
        
        subProducts.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.producto_id;
            // Si formatCurrency existe, úsala; si no, usa el precio directo
            const priceDisplay = (typeof formatCurrency === 'function') ? formatCurrency(sub.price) : `$${sub.price.toFixed(2)}`;
            
            option.textContent = `${sub.name} (${priceDisplay})`; 
            subSelect.appendChild(option);
        });
    }
}

async function loadMainProductsForSaleSelect() {
    const select = document.getElementById('product-main-select');
    const subSelect = document.getElementById('subproduct-select');
    const priceInput = document.getElementById('product-unit-price');

    if (!select || !subSelect || !priceInput) return;

    // ✅ Filtro corregido: Busca 'MAIN'
    const mainProducts = allProducts.filter(p => p.type && p.type.trim().toUpperCase() === 'MAIN');

    subSelect.innerHTML = '<option value="" selected>Sin Paquete</option>';
    priceInput.value = '0.00';
    subSelect.disabled = true;

    if (mainProducts.length === 0) {
        select.innerHTML = '<option value="" disabled selected>❌ No hay Productos Base (Tipo: MAIN)</option>';
        return;
    }
    
    select.innerHTML = '<option value="" disabled selected>Seleccione Producto Base</option>';
    
    mainProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.producto_id;
        option.textContent = `${product.name}`;
        select.appendChild(option);
    });
}

// Asume que 'allProducts' contiene todos los productos cargados
async function loadParentProductsForSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Filtra solo los productos principales (MAIN)
    const mainProducts = allProducts.filter(p => 
        p.type && p.type.trim().toUpperCase() === 'MAIN'
    );

    // 1. Limpiar y añadir la opción por defecto
    select.innerHTML = '<option value="" disabled selected>Seleccione Producto Principal</option>';

    if (mainProducts.length === 0) {
        select.innerHTML = '<option value="" disabled selected>❌ No hay Productos Base (Tipo: MAIN)</option>';
        return;
    }
    
    // 2. Llenar el select con los productos filtrados
    mainProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.producto_id;
        option.textContent = `${product.name} ($${product.price.toFixed(2)})`;
        select.appendChild(option);
    });
}

function loadPackageProductsForSelect(mainProductId) {
    const select = document.getElementById('subproduct-select');
    if (!select) return;

    const packageProducts = allProducts.filter(p => p.type === 'PACKAGE' && p.parent_product == mainProductId);

    select.innerHTML = '<option value="" selected>Sin Paquete</option>';
    
    if (packageProducts.length > 0) {
        select.disabled = false;
        packageProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.producto_id;
            option.textContent = `${product.name} - ${formatCurrency(product.price)}`;
            select.appendChild(option);
        });
    } else {
        select.disabled = true;
    }
}

function updatePriceField(productId) {
    const priceInput = document.getElementById('product-unit-price');
    
    // Búsqueda robusta del producto (sea principal o paquete)
    const productData = allProducts.find(p => String(p.producto_id) === String(productId)); 
    
    if (priceInput) {
        if (productData && productData.price !== undefined) {
            priceInput.value = productData.price.toFixed(2);
        } else {
            priceInput.value = '0.00';
        }
    }
}


// ====================================================================
// 6. LÓGICA DE VENTA MULTI-ITEM
// ====================================================================

function calculateGrandTotal() {
    const grandTotal = currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    const totalInput = document.getElementById('total-amount');
    if (totalInput) totalInput.value = grandTotal.toFixed(2); 
    
    updatePaymentDebtStatus(grandTotal); 
    
    const submitBtn = document.getElementById('submit-sale-btn');

if (currentSaleItems.length > 0) {
    // Si hay productos en el carrito, habilitar el botón
    submitBtn?.removeAttribute('disabled');
} else {
    // Si el carrito está vacío, deshabilitar el botón
    submitBtn?.setAttribute('disabled', 'true');
}
    
    return grandTotal;
}

function updateSaleTableDisplay() {
    const container = document.getElementById('sale-items-container'); 
    if (!container) return;
    
    container.innerHTML = '';

    if (currentSaleItems.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500 italic">Agrega productos a la venta.</td></tr>';
        
        calculateGrandTotal();
        return;
    }
    
    currentSaleItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        row.innerHTML = `
            <td class="px-6 py-3 text-sm font-medium text-gray-900">${item.name}</td>
            <td class="px-6 py-3 text-sm text-gray-500">${formatCurrency(item.price)}</td>
            <td class="px-6 py-3 text-sm text-gray-500 text-center">${item.quantity}</td>
            <td class="px-6 py-3 text-sm font-bold">${formatCurrency(item.subtotal)}</td>
            <td class="px-6 py-3 text-right text-sm font-medium">
                <button type="button" onclick="removeItemFromSale(${index})" 
                        class="text-red-600 hover:text-red-900">
                    <i class="fas fa-times-circle"></i>
                </button>
            </td>
        `;
        container.appendChild(row);
    });
    
    calculateGrandTotal(); 
}

window.removeItemFromSale = function(index) {
    currentSaleItems.splice(index, 1);
    updateSaleTableDisplay();
}

function handleAddProductToSale(e) {
    e.preventDefault();

    const mainSelect = document.getElementById('product-main-select');
    const subSelect = document.getElementById('subproduct-select');
    const quantityInput = document.getElementById('product-quantity'); 
    
    // 1. Obtener IDs y Cantidad (Aquí no hay cambios, solo leer el valor del DOM)
    // Usaremos String() en el punto de uso para la corrección
    const mainProductId = mainSelect?.value;
    const subProductId = subSelect?.value;
    const quantity = parseFloat(quantityInput?.value);

    // Determinar la ID que define el PRECIO y la que se registra en el carrito
    let productIdToCharge = subProductId;
    if (!productIdToCharge) {
        productIdToCharge = mainProductId;
    }
    
    // 🛑 CORRECCIÓN 1: Forzar productIdToCharge a String para la búsqueda.
    const searchId = String(productIdToCharge); 
    
    // Producto que establece el precio (puede ser MAIN o PACKAGE)
    // 🛑 CORRECCIÓN 2: Usar igualdad estricta (===) y String() en ambos lados.
    const productToCharge = allProducts.find(p => String(p.producto_id) === searchId); 

    // --- Validaciones ---
    if (!productToCharge) {
        alert('Por favor, selecciona un Producto o Paquete válido.');
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        alert('La cantidad debe ser mayor a cero.');
        return;
    }

    // 2. CONSTRUCCIÓN DEL NOMBRE DE VISUALIZACIÓN (CRÍTICO)
    let nameDisplay = productToCharge.name; 

    if (subProductId) {
        // Si hay una subcategoría, buscamos el padre para concatenar el nombre
        // 🛑 CORRECCIÓN 3: Usar igualdad estricta (===) y String() en ambos lados.
        const mainProductData = allProducts.find(p => String(p.producto_id) === String(mainProductId));
        
        if (mainProductData) {
            // Formato: "Producto Padre (Subcategoría)"
            nameDisplay = `${mainProductData.name} (${productToCharge.name})`;
        }
    }
    // ------------------------------------------------------------------------

    const price = productToCharge.price;
    const subtotal = quantity * price;

    const newItem = {
        // 🛑 CORRECCIÓN 4: Asegurar que la ID que entra al carrito sea un String limpio.
        product_id: searchId,           // Usamos searchId que ya es String(ID)
        name: nameDisplay,             
        quantity: quantity,
        price: price,
        subtotal: subtotal,
    };

    // 3. Lógica de agregar-actualizar el carrito
    // 🛑 CORRECCIÓN 5: Usar igualdad estricta (===) para encontrar el item existente.
    const existingIndex = currentSaleItems.findIndex(item => item.product_id === searchId);

    if (existingIndex > -1) { 
        currentSaleItems[existingIndex].quantity += quantity;
        currentSaleItems[existingIndex].subtotal += subtotal;
    } else {
        currentSaleItems.push(newItem);
    }
    
    updateSaleTableDisplay(); 

    // Limpieza de inputs
    mainSelect.value = '';
    subSelect.value = '';
    quantityInput.value = '1';
    updatePriceField(null); 
    loadMainProductsForSaleSelect(); // Recargar selectores
}

async function handlePostSalePriceUpdate(ventaId, detalleVentaId, clientId, newUnitPrice) {
    if (!supabase || isNaN(newUnitPrice) || newUnitPrice <= 0) {
        alert("El precio debe ser un monto positivo.");
        return;
    }

    try {
        // --- Paso 1: Obtener la cantidad (quantity) del ítem ---
        const { data: itemData, error: fetchError } = await supabase
            .from('detalle_ventas')
            .select('quantity')
            .eq('id', detalleVentaId) // Asumiendo que 'id' es la PK de detalle_ventas
            .single();

        if (fetchError || !itemData) throw new Error("No se pudo obtener el detalle del ítem.");

        const quantity = itemData.quantity;
        const newSubtotal = quantity * newUnitPrice;

        // --- Paso 2: Actualizar el ítem en 'detalle_ventas' ---
        // Esto cambia el precio y el subtotal de ese producto.
        const { error: detailUpdateError } = await supabase
            .from('detalle_ventas')
            .update({ 
                price: newUnitPrice,
                subtotal: newSubtotal 
            })
            .eq('id', detalleVentaId);

        if (detailUpdateError) throw detailUpdateError;

        // --- Paso 3: Recalcular el nuevo Total de la Venta ---
        // Sumar todos los subtotales para obtener el nuevo total_amount
        const { data: totalsData, error: totalsError } = await supabase
            .from('detalle_ventas')
            .select('subtotal')
            .eq('venta_id', ventaId);

        if (totalsError || !totalsData) throw totalsError;

        const newTotalAmount = totalsData.reduce((sum, item) => sum + item.subtotal, 0);

        // --- Paso 4: Actualizar el registro principal en 'ventas' ---
        // Como la venta inicial fue de $0.00 (pagado $0.00), todo el nuevo total es saldo pendiente.
        const newSaldoPendiente = newTotalAmount; 
        
        const { error: saleUpdateError } = await supabase
            .from('ventas')
            .update({ 
                total_amount: newTotalAmount,
                saldo_pendiente: newSaldoPendiente
            })
            .eq('venta_id', ventaId);

        if (saleUpdateError) throw saleUpdateError;

        alert(`✅ Deuda de ${formatCurrency(newSaldoPendiente)} registrada exitosamente.`);
        
        // Refrescar los datos en la UI:
        await loadClientsTable('gestion'); // Actualiza el resumen en la tabla principal
        await handleViewClientDebt(clientId); // Refresca el modal de transacciones
        // closeModal('modal-edit-sale'); // Cierra tu modal de edición

    } catch (e) {
        console.error('Error al actualizar precio post-venta:', e);
        alert(`Error al actualizar la venta: ${e.message}`);
    }
}

// ====================================================================
// 7. MANEJO DEL PAGO Y LA DEUDA 
// ====================================================================

function updatePaymentDebtStatus(totalAmount = null) {
    const paidAmountInput = document.getElementById('paid-amount');
    const paymentMethodSelect = document.getElementById('payment-method');
    const totalInput = document.getElementById('total-amount');
    
    const currentTotal = totalAmount || parseFloat(totalInput?.value) || 0;
    
    const paymentMethod = paymentMethodSelect?.value;
    let paidAmount = parseFloat(paidAmountInput?.value) || 0;

    if (paymentMethod === 'Deuda') {
        paidAmount = 0;
        if (paidAmountInput) {
            paidAmountInput.value = '0.00';
            paidAmountInput.readOnly = true;
        }
    } else {
        if (paidAmountInput) paidAmountInput.readOnly = false;
        if (paidAmount > currentTotal) {
            paidAmount = currentTotal;
            if (paidAmountInput) paidAmountInput.value = currentTotal.toFixed(2);
        }
    }
    
    const remainingDebt = Math.max(0, currentTotal - paidAmount);
    
    const remainingBalanceInput = document.getElementById('remaining-balance');
    if (remainingBalanceInput) remainingBalanceInput.value = remainingDebt.toFixed(2);

    if (paidAmountInput && paymentMethod !== 'Deuda') {
        paidAmountInput.setAttribute('max', currentTotal.toFixed(2));
    }
}

//Ventas a credito
async function getClientSalesSummary(clientId) {
    if (!supabase) return { totalVentas: 0, deudaNeta: 0 };
    
    // 1. Obtener todas las transacciones del cliente desde la vista consolidada
    try {
        const { data: transactions, error } = await supabase
            .from('transacciones_deuda') 
            .select('type, amount')
            .eq('client_id', clientId);

        if (error) throw error;

        let totalVentas = 0; // Solo cargos de venta
        let deudaNeta = 0;   // Saldo acumulado (cargos - abonos)

        transactions.forEach(t => {
            const isCharge = t.type === 'cargo_venta';
            
            if (isCharge) {
                // Suma el monto total de las ventas (cargos)
                totalVentas += t.amount;
                deudaNeta += t.amount;
            } else {
                // Resta todos los pagos (iniciales y posteriores)
                deudaNeta -= t.amount;
            }
        });

        // Aseguramos que la deuda no sea negativa si el cliente pagó de más.
        deudaNeta = Math.max(0, deudaNeta);
        
        return { totalVentas, deudaNeta };

    } catch (e) {
        console.error(`Error al obtener resumen del cliente ${clientId}:`, e);
        return { totalVentas: 0, deudaNeta: 0 };
    }
}
async function handleRecordAbono(e) {
    // Es crucial prevenir el envío por defecto para manejarlo con JavaScript
    e.preventDefault(); 
    
    if (!supabase) return;

    // 1. OBTENER DATOS DEL FORMULARIO
    // Línea 725 es muy probable que esté aquí:
    const clientIdInput = document.getElementById('abono-client-id-input');
    const amountInput = document.getElementById('abono-amount');
    const methodInput = document.getElementById('abono-method');
    
    // Si alguna de estas variables es null (por eso el TypeError),
    // detén la ejecución y muestra un error.
    if (!clientIdInput || !amountInput || !methodInput) {
        console.error("Error FATAL: No se encontraron los campos del formulario de abono. Revise los IDs en el HTML.");
        alert("Error interno: Faltan campos en el formulario. Contacte soporte.");
        return;
    }
    
    const client_id = clientIdInput.value;
    const amount = parseFloat(amountInput.value);
    const method = methodInput.value;

    if (!client_id || amount <= 0) {
        alert("Por favor, seleccione un cliente y un monto válido.");
        return;
    }

    try {
        // 2. INSERTAR REGISTRO EN LA TABLA 'abonos'
        // Esto crea el registro del abono y nos da el ID (abono_id).
        const { data: abonoData, error: abonoError } = await supabase
            .from('abonos')
            .insert({ 
                client_id: client_id, 
                fecha_abono: new Date().toISOString(),
                // Se asume que no hay columna 'amount' en 'abonos'
            })
            .select('abono_id')
            .single();

        if (abonoError) throw abonoError;

        const abono_id = abonoData.abono_id;

        // 3. INSERTAR REGISTRO EN LA TABLA 'pagos'
        // Esto registra el monto y el método, vinculado al 'abono_id'
        const { error: pagoError } = await supabase
            .from('pagos')
            .insert({
                abono_id: abono_id, // Usamos el ID devuelto
                amount: amount,
                payment_method: method
            });

        if (pagoError) throw pagoError;

        // 4. ÉXITO Y ACTUALIZACIÓN DE LA UI
        alert('✅ Abono registrado exitosamente.');
        closeModal('modal-record-abono'); 
        closeModal('modal-client-debt-report'); // Cierra el modal de reporte también

        // CRÍTICO: Recargar la tabla principal para reflejar el cambio de deuda
        await loadClientsTable('gestion'); 

    } catch (e) {
        console.error('Error al registrar abono:', e.message || e);
        alert('Hubo un error al registrar el abono. Intente nuevamente.');
    }
}

function handleAbonoClick(clientId) {
    // Buscar los datos del cliente en la lista global
    const client = allClients.find(c => c.client_id == clientId);

    if (!client) {
        alert('Cliente no encontrado.');
        return;
    }

    // 1. Llenar los campos del modal
    document.getElementById('abono-client-id').value = clientId;
    document.getElementById('abono-client-name-display').textContent = client.name;
    document.getElementById('abono-amount').value = ''; // Limpiar el monto
    
    // 2. Abrir el modal
    openModal('abono-client-modal');
}

// ====================================================================
// 8. MANEJO DE FORMULARIO DE NUEVA VENTA (TRANSACCIONAL)
// ====================================================================

async function handleNewSale(e) {
    e.preventDefault();

    const client_id = document.getElementById('client-select')?.value ?? null;
    const payment_method = document.getElementById('payment-method')?.value ?? 'Efectivo';
    const sale_description = document.getElementById('sale-description')?.value.trim() ?? null;
    const paid_amount_str = document.getElementById('paid-amount')?.value ?? '0'; 
    let paid_amount = parseFloat(paid_amount_str);
    
    const total_amount = currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0); 
    
    if (payment_method === 'Deuda') {
        paid_amount = 0;
    }
    
    const saldo_pendiente = total_amount - paid_amount; 

    // --- Validaciones ---
    if (!client_id) {
        alert('Por favor, selecciona un cliente.');
        return;
    }
    if (currentSaleItems.length === 0) {
        alert('Debes agregar al menos un producto a la venta.');
        return;
    }
    // ✅ CORRECCIÓN 1: Permite ventas en $0.00, solo bloquea montos negativos.
    if (total_amount < 0) {
        alert('El total de la venta no puede ser negativo.');
        return;
    }
    
    // Si la venta es de $0.00, forzamos el saldo a cero y el pago a cero para evitar problemas de lógica.
    let final_paid_amount = paid_amount;
    let final_saldo_pendiente = saldo_pendiente;

    if (total_amount === 0) {
        final_paid_amount = 0;
        final_saldo_pendiente = 0;
    }

    if (payment_method !== 'Deuda' && (final_paid_amount < 0 || final_paid_amount > total_amount)) {
         alert('El monto pagado es inválido.');
         return;
    }

    if (final_saldo_pendiente > 0.01 && payment_method !== 'Deuda' && !confirm(`¡Atención! Hay un saldo pendiente de ${formatCurrency(final_saldo_pendiente)}. ¿Deseas continuar registrando esta cantidad como deuda?`)) {
        return;
    }


    try {
        // 1. REGISTRAR VENTA (Tabla 'ventas')
        const { data: saleData, error: saleError } = await supabase
            .from('ventas')
            .insert([{
                client_id: client_id,
                total_amount: total_amount, 
                paid_amount: final_paid_amount, // Usa el monto ajustado
                saldo_pendiente: final_saldo_pendiente, // Usa el saldo ajustado
                metodo_pago: payment_method,
                description: sale_description,
                // NO SE INSERTA PROFIT
            }])
            .select('venta_id'); 

        if (saleError || !saleData || saleData.length === 0) {
            console.error('Error al insertar venta:', saleError);
            alert(`Error al registrar la venta: ${saleError?.message || 'Desconocido'}`);
            return;
        }

        const new_venta_id = saleData[0].venta_id;

        // 2. REGISTRAR DETALLE DE VENTA (Tabla 'detalle_ventas')
        const detailsToInsert = currentSaleItems.map(item => ({
            venta_id: new_venta_id, 
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
        }));

        const { error: detailError } = await supabase
            .from('detalle_ventas') 
            .insert(detailsToInsert);

        if (detailError) {
            console.error('Error al insertar detalles de venta:', detailError);
            alert(`Venta registrada (ID: ${new_venta_id}), pero falló el registro de detalles: ${detailError.message}`);
        }

        // 3. REGISTRAR PAGO (Tabla 'pagos') - SOLO SI final_paid_amount > 0
        if (final_paid_amount > 0) { // Usa final_paid_amount
            const { error: paymentError } = await supabase
                .from('pagos')
                .insert([{
                    venta_id: new_venta_id,
                    amount: final_paid_amount,
                    client_id: client_id,
                    metodo_pago: payment_method,
                }]);

            if (paymentError) {
                console.error('Error al registrar pago inicial:', paymentError);
                alert(`Advertencia: El pago inicial falló. ${paymentError.message}`);
            }
        }
        
        // 4. LIMPIAR Y RECARGAR
        // Se elimina el 'alert' de éxito, el modal de vista previa lo reemplaza.
        closeModal('new-sale-modal'); // <-- Cierra el modal de registro de venta

        // Recarga los datos del Dashboard (ventas recientes, deudas, etc.)
        await loadDashboardData(); 

        // ✅ NUEVA LÍNEA CLAVE: Llama a la vista previa del ticket
        showTicketPreviewModal(new_venta_id); 

    } catch (error) {
        console.error('Error fatal al registrar la venta:', error.message);
        alert('Error fatal al registrar la venta: ' + error.message);
    } finally {
        currentSaleItems = []; 
        updateSaleTableDisplay();
        document.getElementById('new-sale-form').reset();
    }
}

function openPostSalePriceModal(ventaId, detalleVentaId, clientId, itemName) {
    // 1. Asignar IDs a los campos ocultos
    document.getElementById('edit-venta-id').value = ventaId;
    document.getElementById('edit-detalle-venta-id').value = detalleVentaId;
    document.getElementById('edit-client-id').value = clientId;

    // 2. Mostrar nombres y limpiar precio
    document.getElementById('edit-item-name-display').textContent = itemName;
    document.getElementById('edit-venta-id-display').textContent = ventaId;
    document.getElementById('new-unit-price').value = '0.00'; 
    
    // 3. Abrir el modal
    openModal('modal-edit-sale-item');
}

/**
 * Se ejecuta al hacer clic en "Añadir Precio" para una venta de $0.00.
 * Obtiene el detalle de la venta y abre el modal de edición.
 */
async function handleOpenEditSaleItem(ventaId, clientId) {
    if (!supabase) return;

    try {
        // 1. Buscar los ítems de esta venta en detalle_ventas
        const { data: details, error } = await supabase
            .from('detalle_ventas')
            .select('id, name, quantity') // Asumiendo que 'id' es la PK de detalle_ventas
            .eq('venta_id', ventaId);

        if (error) throw error;
        
        if (details.length === 0) {
            alert('Error: No se encontraron ítems para esta venta. No se puede editar.');
            return;
        }

        // 2. Tomar el primer ítem para editar (simplificación)
        const itemToEdit = details[0]; 
        
        // 3. Abrir el modal de edición de precio
        openPostSalePriceModal(
            ventaId, 
            itemToEdit.id, // Este es el detalleVentaId que se actualiza
            clientId, 
            `${itemToEdit.name} (${itemToEdit.quantity} und.)` // Nombre para mostrar
        );

    } catch (e) {
        console.error('Error al abrir el formulario de edición:', e);
        alert('No se pudo cargar la información para la edición.');
    }
}

// ====================================================================
// 9. LÓGICA CRUD PARA CLIENTES
// ====================================================================

// Variable global para almacenar el ID del cliente cuya deuda estamos viendo
let viewingClientId = null; 

async function handleViewClientDebt(clientId) {
    if (!supabase) {
        console.error("Supabase no está inicializado.");
        return;
    }
    
    // Guardar la ID del cliente que estamos viendo. Es crucial para recargar el reporte después de una edición.
    viewingClientId = clientId; 
    
    // 1. Obtener los datos del cliente
    // Se asume que allClients y viewingClientId están definidos globalmente.
    const client = allClients.find(c => c.client_id.toString() === clientId.toString());
    if (!client) {
        console.error("Cliente no encontrado en allClients.");
        return;
    }

    // 2. Obtener todas las transacciones (ventas y abonos)
    try {
        const { data: transactions, error } = await supabase
            .from('transacciones_deuda') 
            .select(`
                transaction_id, created_at, type, amount, client_id
            `)
            .eq('client_id', clientId)
            .order('created_at', { ascending: true }); // Orden ascendente para calcular el saldo cronológicamente

        if (error) throw error;
         
        const container = document.getElementById('client-transactions-body');
        const totalDebtElement = document.getElementById('client-report-total-debt');
         
        if (!container || !totalDebtElement) return;
         
        // 3. Renderizar las transacciones
        let currentDebt = 0;
        let htmlContent = '';
         
        transactions.forEach(t => {
            // Cálculo de la deuda
            const isDebt = t.type === 'cargo_venta'; 
             
            if (isDebt) {
                currentDebt += t.amount;
            } else {
                currentDebt -= t.amount; 
            }

            // El saldo actual después de esta transacción
            const displayDebt = currentDebt; 

            // Etiquetado y Descripción
            let typeLabel = '';
            let typeDescription = '';
            switch (t.type) {
                case 'cargo_venta':
                    typeLabel = 'Venta (Cargo)';
                    typeDescription = 'Venta que generó deuda.';
                    break;
                case 'abono_inicial':
                    typeLabel = 'Pago Inicial';
                    typeDescription = 'Pago realizado al momento de la venta.';
                    break;
                case 'abono_posterior':
                    typeLabel = 'Abono';
                    typeDescription = 'Pago posterior a la venta.';
                    break;
                default:
                    typeLabel = 'Movimiento';
                    typeDescription = 'Movimiento de deuda.';
            }

            // 🛑 LÓGICA DEL BOTÓN "AÑADIR PRECIO"
            let actionButton = '';
            // Detección robusta de monto cero
            const amountIsZero = Math.abs(parseFloat(t.amount)) < 0.01; 
             
            // Genera el botón SOLO si es VENTA CERO y el ID del cliente es válido
            if (t.type === 'cargo_venta' && amountIsZero && clientId) {
                 actionButton = `
                    <button onclick="handleViewSaleDetails('${t.transaction_id}', '${clientId}')"
                            class="ml-2 px-2 py-1 text-xs text-white bg-yellow-500 rounded hover:bg-yellow-600 transition duration-150">
                        Añadir Precio
                    </button>
                 `;
            }

            // Renderizado de la Fila (se usa actionButton en la columna de typeLabel)
            htmlContent += `
                <tr>
                    <td class="px-3 py-2 text-sm">${formatDate(t.created_at)}</td>
                    <td class="px-3 py-2 text-sm" title="${typeDescription}">${typeLabel} ${actionButton}</td>
                    <td class="px-3 py-2 text-sm ${isDebt ? 'text-red-600' : 'text-green-600'}">
                        ${formatCurrency(t.amount)}
                    </td>
                    <td class="px-3 py-2 text-sm font-semibold">${formatCurrency(displayDebt)}</td>
                </tr>
            `;
        });

        // 4. Mostrar el reporte y abrir el modal
        document.getElementById('client-report-name').textContent = client.name;
        container.innerHTML = htmlContent;
        
        // Mostrar la deuda final
        const finalDebt = currentDebt;
        totalDebtElement.textContent = formatCurrency(finalDebt);
        totalDebtElement.className = `font-bold ${finalDebt > 0 ? 'text-red-600' : 'text-green-600'}`;
         
        openModal('modal-client-debt-report'); 

    } catch (e) {
        console.error('Error al cargar el reporte de deuda:', e);
        alert('Hubo un error al cargar el reporte de deuda del cliente.');
    }
}

async function handleViewSaleDetails(transactionId, clientId) {
    if (!supabase) {
        console.error("Supabase no está inicializado.");
        return;
    }

    const client = allClients.find(c => c.client_id.toString() === clientId.toString());
    if (!client) {
        console.error("Cliente no encontrado en allClients.");
        alert("Error: Cliente no encontrado para esta venta.");
        return;
    }
    viewingClientId = clientId;

    try {
        // =======================================================
        // 1. CARGA DE LA VENTA PRINCIPAL (Tabla 'ventas')
        // =======================================================
        const { data: sale, error: saleError } = await supabase
            .from('ventas')
            // 🛑 CAMBIO CLAVE 1: Añadimos 'metodo_pago' para la condición
            .select(`venta_id, total_amount, saldo_pendiente, created_at, description, metodo_pago`) 
            .eq('venta_id', transactionId)
            .single();

        if (saleError || !sale) {
            console.error("Error al cargar detalles de la venta (Tabla Ventas):", saleError);
            alert("Error: No se encontró la venta principal (ID: " + transactionId + ") en la tabla 'ventas'.");
            return;
        }

        // 2. CARGA DE ÍTEMS DE VENTA (Tabla 'detalle_ventas')
        const { data: items, error: itemsError } = await supabase
            .from('detalle_ventas')
            .select(`detalle_id, quantity, price, subtotal, productos(name)`) 
            .eq('venta_id', transactionId) 
            .order('detalle_id', { ascending: true }); 

        if (itemsError) throw itemsError;

        // 3. CARGA DEL HISTORIAL DE PAGOS/ABONOS (Tabla 'pagos')
        const { data: payments, error: paymentsError } = await supabase
            .from('pagos')
            .select(`amount, metodo_pago, created_at`) 
            .eq('venta_id', transactionId)
            .order('created_at', { ascending: true });

        if (paymentsError) throw paymentsError;

        // 4. INYECCIÓN DE DATOS EN EL MODAL (Sin cambios)
        document.getElementById('detail-sale-id').textContent = `#${sale.venta_id}`;
        document.getElementById('detail-client-name').textContent = client.name;
        document.getElementById('detail-date').textContent = formatDate(sale.created_at);
        document.getElementById('detail-total-amount').textContent = formatCurrency(sale.total_amount);
        document.getElementById('detail-saldo-pendiente').textContent = formatCurrency(sale.saldo_pendiente);
        document.getElementById('detail-comments').textContent = sale.description || 'Sin comentarios.';
        document.getElementById('payment-sale-id').value = sale.venta_id;

        const itemsBody = document.getElementById('detail-items-body');
        itemsBody.innerHTML = '';
        (items || []).forEach(item => {
            itemsBody.innerHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-3">${item.productos?.name || 'Producto Desconocido'}</td>
                    <td class="px-6 py-3 text-center">${item.quantity}</td>
                    <td class="px-6 py-3 text-right">${formatCurrency(item.price)}</td>
                    <td class="px-6 py-3 text-right">${formatCurrency(item.subtotal)}</td>
                </tr>
            `;
        });

        const paymentsBody = document.getElementById('detail-payments-body');
        paymentsBody.innerHTML = '';
        if (payments.length === 0) {
            paymentsBody.innerHTML = '<tr><td colspan="3" class="px-6 py-3 text-center text-gray-500 italic">No hay pagos registrados para esta venta.</td></tr>';
        } else {
            payments.forEach(payment => {
                paymentsBody.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-3">${formatDate(payment.created_at)}</td>
                        <td class="px-6 py-3 text-right font-semibold text-green-600">${formatCurrency(payment.amount)}</td>
                        <td class="px-6 py-3 text-center">${payment.metodo_pago}</td>  
                    </tr>
                `;
            });
        }

        // =======================================================
        // 5. LÓGICA DE EDICIÓN CONDICIONAL PARA VENTAS CERO
        // =======================================================
        const editSection = document.getElementById('sale-edit-section');
        const amountIsZero = Math.abs(parseFloat(sale.total_amount)) < 0.01;
        
        // 🛑 CAMBIO CLAVE 2: La sección solo se muestra si:
        // 1. El monto total es CERO.
        // 2. El método de pago inicial es 'Deuda'.
        // 3. La venta tiene ítems.
        if (amountIsZero && sale.metodo_pago === 'Deuda' && items.length > 0) {
            editSection.classList.remove('hidden');
            const firstItem = items[0]; 
            
            document.getElementById('sale-edit-transaction-id').value = `${sale.venta_id}|${firstItem.detalle_id}|${clientId}`;
            document.getElementById('sale-edit-price').value = firstItem.price.toFixed(2);
        } else {
            editSection.classList.add('hidden');
        }

        openModal('modal-detail-sale');

    } catch (e) {
        console.error('Error al cargar detalles de venta:', e);
        alert('Hubo un error al cargar los detalles de la venta.');
    }
}

async function loadClientsTable(mode = 'gestion') {
    if (!supabase) {
        console.error("Supabase no está inicializado.");
        return;
    }

    const container = document.getElementById('clients-list-body');
    if (!container) {
        console.error("Contenedor de clientes ('clients-list-body') no encontrado.");
        return;
    }

    // 💡 La clave para el control de botones
    const showActions = mode === 'gestion';

    try {
        // 1. Obtener la lista base de clientes
        const { data: clients, error: clientsError } = await supabase
            .from('clientes')
            .select('client_id, name, telefono')
            .order('name', { ascending: true });

        if (clientsError) throw clientsError;

        // Se asume que allClients es una variable global
        allClients = clients; 
        
        // 2. Ejecutar las consultas de resumen de ventas/deuda en paralelo
        // Asume que getClientSalesSummary y formatCurrency existen
        const summaryPromises = clients.map(client => getClientSalesSummary(client.client_id));
        const summaries = await Promise.all(summaryPromises);

        // 3. Limpiar y Renderizar
        container.innerHTML = '';

        clients.forEach((client, index) => {
            const summary = summaries[index];
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';

            // 🛠️ Celda de Acciones Condicional
            let actionCell = '';

            if (showActions) {
                // Modo 'gestion': Muestra los botones de Editar, Eliminar, Abonar
                actionCell = `
                    <td class="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button type="button" class="edit-client-btn text-indigo-600 hover:text-indigo-900 mr-2" 
                                        data-client-id="${client.client_id}">
                            <i class="fas fa-edit"></i> Editar
                
                <button type="button" class="delete-client-btn text-red-600 hover:text-red-900 mr-2" 
                 data-client-id="${client.client_id}" 
               data-client-name="${client.name}">
                 <i class="fas fa-trash"></i> Eliminar
                </button>

                     <button type="button" class="view-debt-btn text-blue-600 hover:text-blue-900" 
                        data-client-id="${client.client_id}" title="Ver ventas y abonos del cliente">
                        <i class="fas fa-file-invoice-dollar"></i> Ver Deuda
                    </button>
                    </td>
                `;
            } else {
                // Modo 'seleccion' o cualquier otro: Puedes poner un botón de selección o dejar la celda vacía.
                // Aquí se deja una celda vacía para mantener la estructura de la tabla
                actionCell = `<td class="px-3 py-3 whitespace-nowrap text-right text-sm font-medium"></td>`; 
            }
            
            row.innerHTML = `
                <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${client.client_id}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${client.telefono || 'N/A'}</td>
                
                <td class="px-3 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                    $${summary.totalVentas.toFixed(2)}
                </td>
                
                <td class="px-3 py-3 whitespace-nowrap text-sm font-semibold 
                    ${summary.deudaNeta > 0 ? 'text-red-600' : 'text-green-600'}">
                    $${summary.deudaNeta.toFixed(2)}
                </td>
                
                ${actionCell} 
            `;
            container.appendChild(row);
        });

        if (showActions) {
            // Enlazar botón de EDITAR
            container.querySelectorAll('.edit-client-btn').forEach(button => {
                button.addEventListener('click', () => {
                    handleEditClientClick(button.dataset.clientId);
                });
            });

            // Enlazar botón de ELIMINAR
            container.querySelectorAll('.delete-client-btn').forEach(button => {
                button.addEventListener('click', () => {
                    // La propiedad data-client-name ya está siendo agregada en el HTML
                    handleDeleteClientClick(button.dataset.clientId, button.dataset.clientName); 
                });
            });
            
            // Enlazar botón de VER DEUDA/VENTA 
            container.querySelectorAll('.view-debt-btn').forEach(button => {
                button.addEventListener('click', () => {
                    handleViewClientDebt(button.dataset.clientId); 
                });
            });
        }

    } catch (e) {
        console.error('Error inesperado al cargar clientes:', e.message || e);
    }
}

async function handleNewClient(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;

    const { error } = await supabase
        .from('clientes')
        .insert([{ name, telefono: phone, is_active: true }]);

    if (error) {
        alert('Error al registrar cliente: ' + error.message);
    } else {
        alert('Cliente registrado exitosamente.');
        
        await loadAndRenderClients(); // Recargar la lista de clientes

        // 🛑 LÍNEA CORREGIDA: Verifica si el formulario existe antes de resetearlo
        const clientForm = document.getElementById('client-form');
        if (clientForm) {
            clientForm.reset();
        } else {
            console.warn("Advertencia: No se encontró el formulario 'client-form' para resetear.");
        }
        
        closeModal('modal-new-client');
        await loadClientsTable(); 
    }
}

function handleEditClientClick(clientId) {
    if (!supabase) {
        console.error("Supabase no está inicializado.");
        return;
    }

    const client = allClients.find(c => String(c.client_id) === String(clientId));
    if (!client) {
        alert("Error: Cliente no encontrado para editar.");
        return;
    }
    
    // Solo asignamos los campos que existen en el HTML y en la DB
    
    // ID Oculta
    const idInput = document.getElementById('edit-client-id');
    if (idInput) idInput.value = client.client_id;
    
    // Nombre
    const nameInput = document.getElementById('edit-client-name');
    if (nameInput) nameInput.value = client.name;

    // Teléfono
    const phoneInput = document.getElementById('edit-client-phone');
    // Usamos client.telefono porque es el nombre de la columna que manejas
    if (phoneInput) phoneInput.value = client.telefono || ''; 

    // Abrir Modal
    openModal('edit-client-modal'); 
}

async function handleEditClient(e) {
    e.preventDefault();
    
    // 1. Obtener los valores del formulario
    const clientId = document.getElementById('edit-client-id').value; 
    const name = document.getElementById('edit-client-name').value.trim();
    const phone = document.getElementById('edit-client-phone').value.trim();
    
    // Ya no se busca 'edit-client-address'

    if (!clientId) {
        alert("Error de Edición: No se pudo obtener la ID del cliente.");
        return;
    }

    // 2. Ejecutar la actualización en Supabase
    // CRÍTICO: Solo actualizamos 'name' y 'telefono'
    const { error } = await supabase
        .from('clientes')
        .update({ 
            name: name, 
            telefono: phone, // Usando el nombre de columna correcto
        }) 
        .eq('client_id', clientId); 

    if (error) {
        console.error('Error al actualizar cliente:', error);
        alert('Error al actualizar cliente: ' + error.message);
} else {
        alert('Cliente actualizado exitosamente.');
        
        // 🛑 ORDEN CORREGIDO: 
        // 1. Recargar la data (y repintar la tabla) PRIMERO.
        await loadDashboardData(); 
        
        // 2. Limpiar el formulario y CERRAR el modal DESPUÉS de que la tabla se actualizó.
        document.getElementById('edit-client-form').reset();
        closeModal('edit-client-modal'); 
    }
}

async function handleEditProduct(e) {
    e.preventDefault();

    // 'editingProductId' debe haber sido establecido en handleEditProductClick
    if (!supabase || !editingProductId) {
        alert('Error: Supabase no está disponible o el ID del producto a editar es desconocido.');
        return;
    }

    // 1. Obtener valores del formulario de edición
    const nameInput = document.getElementById('edit-product-name');
    const typeInput = document.getElementById('edit-product-type'); 
    const priceInput = document.getElementById('edit-sale-price'); 
    
    // Si usaste la función loadProductDataToForm, esta parte ya está cargada
    const name = nameInput.value.trim();
    const type = typeInput.value; 
    const price = parseFloat(priceInput.value);
    
    // El valor por defecto es NULL para el campo padre
    let parentProductId = null; 

    // 2. Validación de precio
    if (isNaN(price) || price < 0 || priceInput.value.trim() === '') {
        alert('El precio de venta debe ser un número válido (mayor o igual a cero).');
        return;
    }

    // 3. Lógica para Paquetes (necesaria para manejar el campo parent_product)
    if (type === 'PACKAGE') {
        const parentSelect = document.getElementById('edit-parent-product-select');
        // Obtenemos la ID del producto principal seleccionado
        parentProductId = parentSelect?.value || null; 
        
        if (!parentProductId) {
            alert('Los paquetes deben tener un Producto Principal asociado. Seleccione uno de la lista.');
            return;
        }
    }

    // 4. Objeto de datos a actualizar
    const productData = { 
        name: name, 
        type: type, 
        price: price, 
        // CRÍTICO: Usamos el campo correcto 'parent_product'
        parent_product: parentProductId 
    };

    // 5. Actualización en la base de datos
    const { error } = await supabase
        .from('productos')
        .update(productData)
        // CRÍTICO: Usamos el ID global para saber QUÉ producto actualizar
        .eq('producto_id', editingProductId); // Asegúrate de que 'producto_id' es el nombre de la PK

    // 6. Manejo de respuesta
    if (error) {
        console.error('Error de Supabase al actualizar producto:', error.message);
        alert('Error al actualizar producto: ' + error.message);
    } else {
        alert('Producto actualizado exitosamente.');
        
        // Limpieza y recarga
        closeModal('modal-edit-product'); 
        editingProductId = null; // Reseteamos la ID global
        document.getElementById('edit-product-form')?.reset(); 
        
        await loadProductsData();
        await loadAndRenderProducts();
    }
}


// ====================================================================
// 10. LÓGICA CRUD PARA PRODUCTOS
// ====================================================================


// ✅ FUNCIÓN DE VISIBILIDAD FALTANTE PARA EL CAMPO PADRE
function toggleParentProductField() {
    const typeSelect = document.getElementById('new-product-type'); 
    const parentContainer = document.getElementById('parent-product-container');
    const parentSelect = document.getElementById('parent-product-select');

    if (!typeSelect || !parentContainer || !parentSelect) return;

    if (typeSelect.value === 'PACKAGE') {
        // Mostrar el contenedor y hacerlo requerido
        parentContainer.classList.remove('hidden'); 
        parentContainer.classList.add('block');
        parentSelect.setAttribute('required', 'required');
    } else {
        // Ocultar el contenedor y remover el requerimiento
        parentContainer.classList.add('hidden');
        parentContainer.classList.remove('block');
        parentSelect.removeAttribute('required');
        parentSelect.value = ''; // Limpiar el valor seleccionado
    }
}

async function loadProductsTable() {
    // ⚠️ CORRECCIÓN CRÍTICA: Definir la variable 'container'
    const container = document.getElementById('products-table-body');
    
    // Ahora 'container' ya existe
    if (!container) return; // Si no existe (no estamos en la vista de productos), salimos.

    await loadProductsData(); 
    
    container.innerHTML = '';
     
    const products = allProducts; 

    if (products.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500 italic">No hay productos registrados.</td></tr>';
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.producto_id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.type}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold">${formatCurrency(product.price)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-product-id="${product.producto_id}" class="text-indigo-600 hover:text-indigo-900 edit-product-btn mr-2">Editar</button>
                <button data-product-id="${product.producto_id}" class="text-red-600 hover:text-red-900 delete-product-btn">Eliminar</button>
            </td>
        `;
        container.appendChild(row);
    });

    // ✅ CORRECCIÓN: Adjuntar Event Listeners después de dibujar la tabla (Soluciona modales rotos)
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.onclick = () => {
            const productId = button.getAttribute('data-product-id');
            openEditProductModal(productId); 
        };
    });

    document.querySelectorAll('.delete-product-btn').forEach(button => {
        button.onclick = () => {
            const productId = button.getAttribute('data-product-id');
            handleDeleteProduct(productId); 
        };
    });
}

// main.js - Función para manejar el guardado de un nuevo producto
async function handleNewProduct(e) {
    e.preventDefault();

    if (!supabase) {
        alert('Error de conexión: Supabase no está disponible.');
        return;
    }

    // 2. Obtener elementos del formulario y verificar su existencia
    const nameInput = document.getElementById('new-product-name');
    const typeInput = document.getElementById('new-product-type'); 
    
    // ✅ CORRECCIÓN CLAVE: Usar 'new-product-price' que es el ID en tu HTML
    const priceInput = document.getElementById('new-product-price'); 
    
    // 🛑 VERIFICACIÓN: Si falta alguno de estos elementos, el script se detiene aquí.
    if (!nameInput || !typeInput || !priceInput) {
        // Este error ya no debería dispararse si el HTML está cargado y los IDs son correctos
        console.error("Error FATAL: No se encontraron todos los campos del formulario en el DOM. Verifique los IDs.");
        alert("Error al intentar guardar el producto. Verifique los IDs en la consola.");
        return;
    }

    // Ahora que sabemos que existen, leemos sus valores
    const name = nameInput.value.trim();
    const type = typeInput.value; 
    const price = parseFloat(priceInput.value);
    let parentProductId = null;

    // 3. Validación de precio
    if (isNaN(price) || price < 0 || priceInput.value.trim() === '') {
        alert('El precio unitario debe ser un número válido (mayor o igual a cero).');
        return;
    }

    // 4. Lógica y validación para Paquetes (se mantiene igual, asumiendo que tienes el selector padre)
if (type === 'PACKAGE') {
        const parentSelect = document.getElementById('parent-product-select');
        parentProductId = parentSelect?.value || null; // 1. Asignación correcta
        
        if (!parentProductId) {
            alert('Los paquetes deben tener un Producto Principal asociado. Seleccione uno de la lista.');
            return;
        }
    }

    // 5. Inserción en la base de datos (se mantiene igual)
    const { error } = await supabase
        .from('productos')
        .insert([{ 
            name: name, 
            type: type, 
            price: price, 
           parent_product: parentProductId        }]);

    // 6. Manejo de respuesta (se mantiene igual)
    if (error) {
        console.error('Error de Supabase al registrar producto:', error.message);
        alert('Error al registrar producto: ' + error.message);
    } else {
        alert('Producto registrado exitosamente.');
        
        // Cerrar el modal correcto y resetear el formulario
        closeModal('modal-register-product'); 
        document.getElementById('new-product-form')?.reset(); 
        
        await loadProductsData();
        await loadAndRenderProducts();
    }
}

function loadProductDataToForm(productId) {
    // 1. Encontrar el producto en el array global
    // Usamos String() para manejar inconsistencias de tipo entre number/string
    const productToEdit = allProducts.find(p => String(p.producto_id) === String(productId));

    if (!productToEdit) {
        alert('Error: Producto no encontrado para edición.');
        return;
    }
    
    // 2. Rellenar los campos del formulario
    document.getElementById('product-id').value = productToEdit.producto_id;
    document.getElementById('edit-product-name').value = productToEdit.name;
    document.getElementById('edit-product-type').value = productToEdit.type;
    
    // Usamos el ID del HTML 'edit-sale-price' que detecté en tu snippet
    document.getElementById('edit-sale-price').value = productToEdit.price || 0; 
    
    // 3. Lógica para el campo de Padre (si es Paquete)
    const parentContainer = document.getElementById('edit-parent-product-container');
    if (productToEdit.type === 'PACKAGE') {
        parentContainer.classList.remove('hidden');
        // Debes tener una función para cargar la lista de productos padres en ese selector
        loadParentProductsForSelect('edit-parent-product-select'); 
        // Selecciona la ID del padre que ya tiene guardada
        document.getElementById('edit-parent-product-select').value = productToEdit.parent_product; 
    } else {
        parentContainer.classList.add('hidden');
    }

    // 4. Actualizar el título
    document.getElementById('product-modal-title').textContent = 'Editar Producto: ' + productToEdit.name;
}

function handleEditProductClick(productId) {
    editingProductId = productId; // Guarda la ID en la variable global
    loadProductDataToForm(productId); // Carga los datos en el formulario
    openModal('modal-edit-product'); // Abre el modal de edición
}

// Variable global para guardar la ID del producto a eliminar
let deletingProductId = null; 

function handleDeleteProductClick(productId) {
    deletingProductId = productId; // Guarda la ID globalmente
    
    // 1. Mostrar el nombre del producto en el modal (si tienes un elemento para ello)
    const productToDelete = allProducts.find(p => String(p.producto_id) === String(productId));
    if (productToDelete) {
        document.getElementById('delete-product-name-placeholder').textContent = productToDelete.name;
    }

    openModal('modal-delete-confirmation'); // Abre el modal de confirmación
}

async function confirmDeleteProduct() {
    if (!deletingProductId) return;

    const { error } = await supabase
        .from('productos')
        .delete()
        .eq('producto_id', deletingProductId); // Usa la columna ID correcta

    if (error) {
        console.error('Error al eliminar producto:', error.message);
        alert('Error al eliminar producto: ' + error.message);
    } else {
        alert('Producto eliminado exitosamente.');
        closeModal('modal-delete-confirmation'); 
        deletingProductId = null;
        
        // Recargar los datos y la interfaz
        await loadProductsData();
        await loadAndRenderProducts();
    }
}

// Variable Global: Asegúrate de que esta variable esté declarada al inicio de tu main.js
let clientToDeleteId = null; 
// Asumimos que también tienes el array global 'allClients'

function handleDeleteClientClick(clientId, clientName) { 
    clientToDeleteId = clientId; 
    
    // Muestra el nombre del cliente en el modal (si el elemento existe)
    const namePlaceholder = document.getElementById('delete-client-name-placeholder');
    if (namePlaceholder) {
        // Usa el nombre que se pasó como argumento
        namePlaceholder.textContent = clientName; 
    }
    
    // Abre el modal de confirmación
    openModal('client-delete-confirmation'); 
}

async function confirmDeleteClient() {
    const idToDelete = clientToDeleteId; 

    if (!idToDelete) {
        alert("Error de Eliminación: ID del cliente no encontrada.");
        return;
    }

    // 1. Ejecutar la eliminación en Supabase
    const { error } = await supabase
        .from('clientes')
        .delete() // <--- Eliminación física
        .eq('client_id', idToDelete); 

    if (error) {
        console.error('Error al intentar eliminar el cliente:', error);
        
        // 2. Manejo de error específico (Restricción de Clave Foránea)
        if (error.code === '23503') {
            alert('❌ ERROR: No se puede eliminar el cliente. Tiene ventas o abonos pendientes asociados. Asegúrate de eliminar el historial del cliente o configurar la eliminación en cascada en Supabase.');
        } else {
            alert('❌ Error desconocido al eliminar cliente: ' + error.message);
        }
        closeModal('client-delete-confirmation'); 
        return; 
    }

    // 3. Éxito y recarga de datos
    alert('✅ Cliente eliminado definitivamente.');
    closeModal('client-delete-confirmation'); 
    clientToDeleteId = null; 
    
    await loadDashboardData(); 
}

// CRÍTICO: Asegúrate de que el botón de confirmación tenga su listener
document.getElementById('confirm-delete-client-btn')?.addEventListener('click', confirmDeleteClient);

// ====================================================================
// 11. DETALLE Y ABONO DE VENTA 
// ====================================================================

async function handleRegisterPayment(e) {
    e.preventDefault();
    const venta_id = document.getElementById('payment-sale-id').value;
    const amountStr = document.getElementById('abono-amount').value.trim();
    const metodo_pago = document.getElementById('payment-method-abono').value;
    const paymentAmount = parseFloat(amountStr);

    if (amountStr === '' || isNaN(paymentAmount) || paymentAmount <= 0) {
        alert('Por favor, ingresa un monto válido para el abono (mayor a cero).');
        return;
    }

    const { data: ventaActual, error: fetchError } = await supabase
        .from('ventas')
        .select('saldo_pendiente, client_id')
        .eq('venta_id', venta_id)
        .single();
    
    if (fetchError || !ventaActual) {
        alert('Error al obtener la venta para abonar.');
        return;
    }

    if (paymentAmount > ventaActual.saldo_pendiente) {
        alert(`El abono excede el saldo pendiente (${formatCurrency(ventaActual.saldo_pendiente)}). Ajuste el monto.`);
        return;
    }

    const newSaldoPendiente = ventaActual.saldo_pendiente - paymentAmount;

    const { error: paymentError } = await supabase
        .from('pagos')
        .insert([{ 
            venta_id: venta_id, 
            client_id: ventaActual.client_id, 
            amount: paymentAmount, 
            metodo_pago: metodo_pago 
        }]);

    if (paymentError) {
        alert('Error al registrar pago: ' + paymentError.message);
        return;
    }

    const { error: updateError } = await supabase
        .from('ventas')
        .update({ saldo_pendiente: newSaldoPendiente })
        .eq('venta_id', venta_id);

    if (updateError) {
        alert('Abono registrado, pero falló la actualización del saldo. Contacte soporte.');
        console.error('Error al actualizar venta:', updateError);
        return;
    }
    
    alert('Abono registrado y saldo actualizado exitosamente.');
    
    closeModal('modal-detail-sale');
    await loadDashboardData(); 
}

function openAbonoModal(clientId) {
    // 1. Asigna el ID del cliente a una variable global o campo oculto del formulario de abonos.
    // Esto es CRÍTICO para que handleRecordAbono sepa a quién abonar.
    debtToPayId = clientId; // Asumiendo que tienes una variable global 'debtToPayId'

    // También puedes usar un campo oculto si prefieres:
    const clientIdInput = document.getElementById('abono-client-id-input');
    if (clientIdInput) {
        clientIdInput.value = clientId;
    }

    // 2. Limpia cualquier dato anterior
    document.getElementById('abono-client-form')?.reset();
    
    // 3. Abre el modal de abonos
    openModal('modal-record-abono'); // 💡 Reemplaza con el ID real de tu modal de abonos
}

// ====================================================================
// 12. MANEJO DE REPORTES Y VENTAS MENSUALES
// ====================================================================

async function loadMonthlySalesReport() {
    const selector = document.getElementById('report-month-selector');
    const monthlyReportBody = document.getElementById('monthly-sales-report-body');
    const totalSalesSpan = document.getElementById('report-total-sales');
    const noDataMessage = document.getElementById('monthly-report-no-data');

    // Lógica para obtener startDate y endDate...
    const selectedMonthYear = selector ? selector.value : null;
    let startDate, endDate;

    if (selectedMonthYear) {
        const [year, month] = selectedMonthYear.split('-').map(Number);
        startDate = new Date(year, month - 1, 1); 
        endDate = new Date(year, month, 0); 
        endDate.setHours(23, 59, 59, 999);
    } else {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    const isoStartDate = startDate.toISOString();
    const isoEndDate = endDate.toISOString();

    // 2. CONSULTA A SUPABASE 
    const { data: sales, error } = await supabase
        .from('ventas')
        .select(`
            venta_id, 
            created_at, 
            client_id, 
            total_amount, 
            saldo_pendiente, 
            metodo_pago, 
            description
        `)
        .gte('created_at', isoStartDate) 
        .lte('created_at', isoEndDate)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar reporte de ventas:', error.message);
        alert('Error al cargar reporte de ventas. Consulte la consola.');
        monthlyReportBody.innerHTML = '';
        totalSalesSpan.textContent = '$0.00';
        noDataMessage.classList.remove('hidden');
        return;
    }

    // 3. CÁLCULO DE TOTALES Y RENDERIZADO
    let grandTotal = 0;
    monthlyReportBody.innerHTML = ''; 

    if (sales && sales.length > 0) {
        noDataMessage.classList.add('hidden');

        sales.forEach(sale => {
            grandTotal += sale.total_amount;
           
            const saleDate = new Date(sale.created_at).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // CRÍTICO: Buscar el nombre del cliente en el mapa
            const clientName = allClientsMap[sale.client_id] || 'N/A'; 

            const row = monthlyReportBody.insertRow();
            row.className = 'hover:bg-gray-50';

            const descriptionDisplay = sale.description || '-'; 
           
            row.innerHTML = `
                <td class="px-3 py-3 whitespace-nowrap">${sale.venta_id}</td>
                <td class="px-3 py-3 whitespace-nowrap">${saleDate}</td>
                <td class="px-3 py-3 whitespace-nowrap">${clientName}</td>
                <td class="px-3 py-3 whitespace-nowrap font-semibold">${formatCurrency(sale.total_amount)}</td>
                <td class="px-3 py-3 whitespace-nowrap text-red-600">${formatCurrency(sale.saldo_pendiente)}</td>
                <td class="px-3 py-3 whitespace-nowrap">${sale.metodo_pago}</td>
                 
               <td class="px-3 py-3 text-sm truncate-cell">
                <div class="truncate w-40" title="${descriptionDisplay}">
                  ${descriptionDisplay}
                   < /div>
                <td class="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        data-venta-id="${sale.venta_id}" 
                        data-client-id="${sale.client_id}"
                        class="view-sale-details-btn text-indigo-600 hover:text-indigo-900 font-semibold text-xs py-1 px-2 rounded bg-indigo-100"
                    >
                        Detalles
                    </button>
                </td>
            `;
        });
    } else {
        noDataMessage.classList.remove('hidden');
    }

    totalSalesSpan.textContent = formatCurrency(grandTotal);
}

function initializeMonthSelector() {
    const selector = document.getElementById('report-month-selector');
    if (!selector) {
        // No hacer nada si el selector no se encuentra en el HTML
        return; 
    }

    selector.innerHTML = ''; // Limpiar opciones existentes

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 (Enero) a 11 (Diciembre)
    
    // Nombres de los meses en español
    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Generar opciones para los últimos 12 meses (incluyendo el actual)
    for (let i = 0; i < 12; i++) {
        // Calcular el mes pasado (restar i meses al mes actual)
        // Usamos el día 1 para evitar problemas con meses que tienen menos de 31 días
        const date = new Date(currentYear, currentMonth - i, 1);
        const year = date.getFullYear();
        const monthIndex = date.getMonth();
        
        // Formato del 'value' para JavaScript/Supabase: YYYY-MM (ej: 2025-11)
        // Se usa padStart(2, '0') para asegurar que el mes tenga dos dígitos (01, 02, etc.)
        const monthValue = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        const monthLabel = `${monthNames[monthIndex]} ${year}`;

        const option = document.createElement('option');
        option.value = monthValue;
        option.textContent = monthLabel;
        
        // Seleccionar el mes actual por defecto (cuando i es 0)
        if (i === 0) {
            option.selected = true;
        }
        
        selector.appendChild(option);
    }
}

// Variable global para guardar el ID de la venta en vista previa
let CURRENT_SALE_ID = null; 

async function showTicketPreviewModal(ventaId) {
    // 1. Obtener datos de Supabase (reutiliza la consulta de printTicketQZ)
    const { data: sale, error } = await supabase
        .from('ventas')
        .select(`*, clientes(name), detalle_ventas (quantity, price, subtotal, productos(name))`)
        .eq('venta_id', ventaId)
        .single();
    
    if (error || !sale) return;

    // 2. Formatear como HTML
    let htmlContent = `
        <div style="text-align: center; font-family: monospace;">
            <h3>Creativa CNC</h3>
            <p>${sale.clientes.name}</p>
            <hr>
            <table style="width: 100%; border-collapse: collapse;">
                ${sale.detalle_ventas.map(item => `
                    <tr>
                        <td style="text-align: left;">${item.quantity} ${item.productos.name}</td>
                        <td style="text-align: right;">${formatCurrency(item.subtotal)}</td>
                    </tr>
                `).join('')}
            </table>
            <hr>
            <h4 style="text-align: right;">TOTAL: ${formatCurrency(sale.total_amount)}</h4>
            <p>¡Gracias por su compra!</p>
        </div>
    `;

    // 3. Inyectar y mostrar
    document.getElementById('ticket-preview-content').innerHTML = htmlContent;
    CURRENT_SALE_ID = ventaId; // Guardar el ID para el botón de imprimir
    openModal('modal-ticket-preview');
}

// ====================================================================
// FUNCIÓN PARA IMPRIMIR TICKET USANDO QZ TRAY
// ====================================================================

async function printTicketQZ(ventaId) {
    if (!qz.websocket.isActive()) {
        // Intenta conectar si no está activo
        try {
            await qz.websocket.connect();
        } catch (e) {
            console.error('Error al conectar con QZ Tray. Asegúrate de que esté ejecutándose.', e);
            alert('Error: QZ Tray no está conectado. Por favor, inícialo.');
            return;
        }
    }

    try {
        // 1. OBTENER DATOS DE SUPABASE
        const { data: sale, error } = await supabase
            .from('ventas')
            .select(`
                *, 
                clientes(name), 
                detalle_ventas (quantity, price, subtotal, productos(name))
            `)
            .eq('venta_id', ventaId)
            .single();

        if (error || !sale) throw new Error('Venta no encontrada.');

        // 2. GENERAR EL CÓDIGO ESC/POS
        // Generarás un array con comandos que la impresora entiende.
        let rawData = [];

        // Comandos ESC/POS de ejemplo:
        rawData.push('\x1B' + '\x40'); // Comando de inicialización de impresora
        rawData.push('\x1B' + '\x61' + '\x31'); // Comando de alineación central
        rawData.push('Creativa CNC\n');
        rawData.push(sale.clientes.name + '\n');
        rawData.push('\x1B' + '\x61' + '\x30'); // Comando de alineación izquierda
        rawData.push('----------------------------------------\n');
        
        sale.detalle_ventas.forEach(item => {
            const line = `${item.quantity} ${item.productos.name} @ ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}\n`;
            rawData.push(line);
        });

        rawData.push('----------------------------------------\n');
        rawData.push('\x1B' + '\x61' + '\x32'); // Comando de alineación derecha
        rawData.push(`TOTAL: ${formatCurrency(sale.total_amount)}\n`);
        
        rawData.push('\x1B' + '\x61' + '\x31'); // Comando de alineación central
        rawData.push('¡Gracias por su compra!\n\n');
        
        rawData.push('\x1D' + '\x56' + '\x00'); // Comando de corte de papel

        // 3. ENVIAR A QZ TRAY
        const config = qz.configs.create("YOUR_PRINTER_NAME"); // ⬅️ REEMPLAZA CON EL NOMBRE DE TU IMPRESORA
        
        await qz.print(config, rawData);
        alert(`Ticket #${ventaId} enviado a impresión.`);

    } catch (e) {
        console.error('Error durante la impresión del ticket:', e);
        alert('Fallo la impresión. Consulta la consola para más detalles.');
    }
}

// ====================================================================
// UTILIDADES/CARGAS
// ====================================================================

async function loadAllClientsMap() {
        const { data: clients, error } = await supabase
        .from('clientes') // ✅ ESTO DEBE SER 'clientes'
        .select('client_id, name');

    if (error) {
        console.error("Error al cargar datos de clientes para el mapa:", error);
        return;
    }

    allClientsMap = clients.reduce((map, client) => {
        map[client.client_id] = client.name;
        return map;
    }, {});
}

async function loadAndRenderClients() {
    const clientsListBody = document.getElementById('clients-list-body');
    const controlsContainer = document.getElementById('clients-list-controls');
    const toggleButton = document.getElementById('toggle-clients-list');
    const countSummary = document.getElementById('client-count-summary');
    
    // Obtener todos los clientes (se usa la misma tabla 'clientes' corregida)
    const { data: clients, error } = await supabase
        .from('clientes')
        .select('client_id, name, phone')
        .order('client_id', { ascending: false }); // Mostrar los más nuevos primero

    if (error) {
        console.error('Error al cargar clientes:', error.message);
        return;
    }

    clientsListBody.innerHTML = '';
    const MAX_SHOWN = 10;
    const totalClients = clients.length;
    let isExpanded = false;

    // Lógica de Renderizado
    clients.forEach((client, index) => {
        // Solo mostrar si el índice es menor a MAX_SHOWN O si la lista está expandida
        const isHidden = !isExpanded && index >= MAX_SHOWN;
        
        const row = clientsListBody.insertRow();
        row.className = isHidden ? 'hidden' : 'hover:bg-gray-50';
        row.dataset.clientId = client.client_id;

        row.innerHTML = `
            <td class="px-3 py-2 whitespace-nowrap">${client.client_id}</td>
            <td class="px-3 py-2 whitespace-nowrap font-medium">${client.name}</td>
            <td class="px-3 py-2 whitespace-nowrap">${client.phone || '-'}</td>
            <td class="px-3 py-2 whitespace-nowrap">
                <button data-client-id="${client.client_id}" class="edit-client-btn text-blue-600 hover:text-blue-800 text-sm mr-2">Editar</button>
                <button data-client-id="${client.client_id}" class="delete-client-btn text-red-600 hover:text-red-800 text-sm">Eliminar</button>
            </td>
        `;
    });

    // Lógica de Colapsado/Paginación
    if (totalClients > MAX_SHOWN) {
        controlsContainer.classList.remove('hidden');
        countSummary.textContent = `Mostrando ${MAX_SHOWN} de ${totalClients} clientes.`;

        // Colapsar/Expandir
        const toggleList = () => {
            isExpanded = !isExpanded;
            const rows = clientsListBody.querySelectorAll('tr');
            
            rows.forEach((row, index) => {
                if (index >= MAX_SHOWN) {
                    row.classList.toggle('hidden', !isExpanded);
                }
            });

            toggleButton.textContent = isExpanded ? 'Mostrar menos' : `Mostrar los ${totalClients - MAX_SHOWN} restantes`;
            countSummary.textContent = isExpanded 
                ? `Mostrando todos (${totalClients}) clientes.` 
                : `Mostrando ${MAX_SHOWN} de ${totalClients} clientes.`;
        };

        // Asignar el listener al botón de colapsar
        toggleButton.onclick = toggleList;
        toggleList(); // Inicia colapsado a 10
    } else {
        controlsContainer.classList.add('hidden');
    }
}

async function loadAndRenderProducts() {
    const tableBody = document.getElementById('products-table-body');
    
    if (!tableBody) {
        console.error("Error: No se encontró el <tbody> con ID 'products-table-body'.");
        return;
    }

    tableBody.innerHTML = ''; // 1. Limpiar la tabla

    if (allProducts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay productos registrados.</td></tr>';
        return;
    }

    allProducts.forEach(producto => {
        let parentName = '';
        
        // CORRECCIÓN DE DATOS ANTIGUOS: Verifica si es paquete y procede a buscar.
        if (producto.type === 'PACKAGE') { 
            
            // 🛑 CORRECCIÓN CLAVE: La búsqueda usa String() para evitar el error de tipo de ID
            if (producto.parent_product) {
                const parentProduct = allProducts.find(p => 
                    String(p.producto_id) === String(producto.parent_product)
                );
                
                // Si lo encuentra, muestra el nombre. Si no, significa que la ID antigua no existe.
                parentName = parentProduct 
                             ? `<span class="text-xs text-gray-500 ml-1">(Padre: ${parentProduct.name})</span>` 
                             : '<span class="text-xs text-red-500 ml-1">(ID Padre No Válida/Eliminada)</span>'; 
            } else {
                 parentName = '<span class="text-xs text-red-500 ml-1">(Sin Padre Asociado)</span>';
            }
        }

        const productTypeDisplay = producto.type === 'PACKAGE' ? 'Paquete/Servicio' : 'Producto Individual';
        const productPriceDisplay = producto.price ? parseFloat(producto.price).toFixed(2) : '0.00';
        
        const row = tableBody.insertRow();
        row.className = 'hover:bg-gray-50';

        row.innerHTML = `
            <td class="px-3 py-2 whitespace-nowrap">${producto.producto_id}</td>
            <td class="px-3 py-2 whitespace-nowrap font-medium">
                ${producto.name} ${parentName}
            </td>
            <td class="px-3 py-2 whitespace-nowrap">${productTypeDisplay}</td>
            <td class="px-3 py-2 whitespace-nowrap">$${productPriceDisplay}</td>
            <td class="px-3 py-2 whitespace-nowrap">
                <button data-product-id="${producto.producto_id}" class="edit-product-btn text-blue-600 hover:text-blue-800 text-sm mr-2">Editar</button>
                <button data-product-id="${producto.producto_id}" class="delete-product-btn text-red-600 hover:text-red-800 text-sm">Eliminar</button>
            </td>
        `;
    });
}

// ====================================================================
// ✅ NUEVO BLOQUE CRÍTICO DE INICIALIZACIÓN
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => { 

    // 1. 🚨 MUEVE LA INICIALIZACIÓN DE SUPABASE AQUÍ
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("Error Fatal: Librería Supabase no encontrada. La aplicación no funcionará.");
        return; // Detener la ejecución del resto del código si falla
    }

    // 2. Continúa con tus llamadas iniciales
    checkUserSession();
    await loadProductsData();
    await loadAllClientsMap();
    
    // 3. LISTENERS DE EVENTOS Y OTRAS INICIALIZACIONES
    // --------------------------------------------------
    
    // Listener para el botón de abrir el modal de nueva venta
    document.getElementById('open-sale-modal-btn')?.addEventListener('click', async () => { 
    // ... el resto de la función...
    });
    
    // --- Cierre de Modales Universal (Botones 'X') ---
    document.querySelectorAll('[data-close-modal]').forEach(button => {
    // ...
    });

    // Listener para el botón de abrir el modal de nueva venta
    document.getElementById('open-sale-modal-btn')?.addEventListener('click', async () => { 
    try {
        // Asumiendo que el formulario tiene la ID 'new-sale-form'
        document.getElementById('new-sale-form')?.reset(); 
        
        await loadClientsForSale(); 
        await loadProductsData();
        
        // Carga los productos MAIN en el selector de venta
        loadMainProductsForSaleSelect(); 
        
        currentSaleItems = []; 
        updateSaleTableDisplay(); 
        
        document.getElementById('total-amount').value = '0.00';
        document.getElementById('paid-amount').value = '0.00';
        document.getElementById('remaining-balance').value = '0.00';

        openModal('new-sale-modal'); 
    } catch (error) {
        console.error('Error al cargar datos del modal de venta:', error);
        alert('Error al cargar los datos. Revise la consola (F12).');
    }
    });

    // --- Cierre de Modales Universal (Botones 'X') ---
    document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const modalId = button.getAttribute('data-close-modal');
        closeModal(modalId);
    });
    });

        // --- Listeners de PAGO ---
    document.getElementById('new-sale-form')?.addEventListener('submit', handleNewSale); 
    document.getElementById('paid-amount')?.addEventListener('input', () => updatePaymentDebtStatus());
    document.getElementById('payment-method')?.addEventListener('change', () => updatePaymentDebtStatus());

    //Boton añadir producto a la venta
    document.getElementById('add-product-btn')?.addEventListener('click', handleAddProductToSale);

    //Listener reporte mensual
    initializeMonthSelector(); // ✅ LLAMADA A LA FUNCIÓN RECIÉN CREADA
    loadMainProductsForSaleSelect(); // (O la función que cargue los productos de venta)

    // Listeners del reporte
    document.getElementById('report-month-selector')?.addEventListener('change', loadMonthlySalesReport);
    loadMonthlySalesReport(); // Cargar la data inicial del mes actual al inicio

    // --- Autenticación ---
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // --- Listeners de DASHBOARD (Filtro y Reporte) ---
    document.getElementById('sales-month-filter')?.addEventListener('change', () => {
        loadDashboardData(); 
    });

    //Reseteo de filtro de ventas
    document.getElementById('reset-sales-filter')?.addEventListener('click', () => {
        const filterInput = document.getElementById('sales-month-filter');
        if (filterInput) {
            filterInput.value = ''; 
        }
        loadDashboardData(); 
    });
    
    //Listener reportes de mes
    document.getElementById('open-monthly-report-btn')?.addEventListener('click', () => {
        loadMonthlySalesReport(); 
        openModal('modal-monthly-report');
    });

// Admin clientes
document.getElementById('admin-clients-btn')?.addEventListener('click', async () => {
    // 1. Abre el modal principal
    openModal('modal-admin-clients'); 
    
    // 2. ✅ CORRECCIÓN: Llama directamente a la función de tabla en MODO 'gestion'
    //    Esto asegura que los botones de acción (Editar/Eliminar/Abonar) se muestren.
    await loadClientsTable('gestion'); 
});


// Busca el ID del modal de reporte mensual en tu HTML.
const monthlySalesModal = document.getElementById('modal-monthly-report'); 

monthlySalesModal?.addEventListener('click', (e) => {
    if (e.target.classList.contains('view-sale-details-btn')) {
        const ventaId = e.target.getAttribute('data-venta-id');
        const clientId = e.target.getAttribute('data-client-id'); // ✅ LEE LA ID DEL CLIENTE
        
        handleViewSaleDetails(ventaId, clientId); // ✅ LLAMA CON AMBOS ARGUMENTOS
    }
});

// -----------------------------------------------
//  Listeners de MODAL CLIENTES (BLOQUE CORREGIDO)
// -----------------------------------------------
document.getElementById('open-register-client-modal-btn')?.addEventListener('click', () => {
    document.getElementById('client-modal-title').textContent = 'Registrar Nuevo Cliente';
    
    // ✅ CRÍTICO: Usar la ID correcta 'new-client-form'
    const form = document.getElementById('new-client-form'); 
    
    // Usar optional chaining para evitar el crash si el formulario no se encuentra
    form?.reset(); 
    form?.removeEventListener('submit', handleEditClient);
    form?.addEventListener('submit', handleNewClient);
    
    editingClientId = null;
    openModal('modal-register-client');
});

// ✅ CRÍTICO: El listener de envío debe apuntar a la ID correcta.
document.getElementById('new-client-form')?.addEventListener('submit', handleNewClient);

// Listener para el envío del formulario de edición de precio post-venta
document.getElementById('post-sale-price-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Obtener los valores del formulario
    const ventaId = document.getElementById('edit-venta-id').value;
    const detalleVentaId = document.getElementById('edit-detalle-venta-id').value;
    const clientId = document.getElementById('edit-client-id').value;
    const newPrice = parseFloat(document.getElementById('new-unit-price').value);

    // Llamar a la función que actualiza la BD
    await handlePostSalePriceUpdate(ventaId, detalleVentaId, clientId, newPrice);
    
    // Cerrar el modal después de la operación (la función ya lo hace, pero es buena práctica)
    closeModal('modal-edit-sale-item');
});

// ------------------------------------
// --- LISTENERS DE MODAL PRODUCTOS ---
// ------------------------------------

// Listener para el botón principal (Abre la LISTA/ADMINISTRACIÓN)
document.getElementById('open-admin-products-modal')?.addEventListener('click', async () => {
    try {
        // 1. Cargar los datos globales antes de mostrar la tabla (CRÍTICO)
        await loadProductsData();
        
        // 2. Renderizar la tabla (Asumiendo que esta función existe)
        await loadAndRenderProducts(); 
        
        // 3. Abrir el modal de ADMINISTRACIÓN (La Lista, ID correcta)
        openModal('admin-products-modal'); 

    } catch (error) {
        console.error('Error al cargar la administración de productos:', error);
        alert('Error al cargar la lista de productos.');
    }
});

// Listener para abrir el FORMULARIO DE REGISTRO desde el modal de administración
document.getElementById('open-product-modal-btn')?.addEventListener('click', () => {
    // 1. Cierra el modal de la lista
    closeModal('admin-products-modal'); // <-- ¡AÑADIR ESTA LÍNEA!
    
    // 2. Resetea el formulario y la visibilidad al abrir
    document.getElementById('new-product-form')?.reset();
    toggleParentProductField(); 
    
    // 3. Abre el modal de REGISTRO
    openModal('modal-register-product'); 
});
// Listener para TIPO DE PRODUCTO: Muestra/Oculta el campo padre y carga datos
document.getElementById('new-product-type')?.addEventListener('change', (e) => {
    toggleParentProductField();
    if (e.target.value === 'PACKAGE') {
        loadParentProductsForSelect('parent-product-select'); 
    }
});

// Listener para el envío del formulario (Guardar Producto)
document.getElementById('new-product-form')?.addEventListener('submit', handleNewProduct);

// ====================================================================
// ✅ EVENTOS PRODUCTOS
// ====================================================================

// Adjuntamos el listener al <tbody>, que es estático
document.getElementById('products-table-body')?.addEventListener('click', (e) => {
    
    // Solo procesar clics en botones
    if (!e.target.hasAttribute('data-product-id')) return;
    
    const productId = e.target.getAttribute('data-product-id');

    // 1. Botón de Edición
    if (e.target.classList.contains('edit-product-btn')) {
        e.preventDefault();
        // Asumiendo que esta es la función que tienes o necesitas crear
        handleEditProductClick(productId); 
    }
    
    // 2. Botón de Eliminación
    if (e.target.classList.contains('delete-product-btn')) {
        e.preventDefault();
        // Asumiendo que esta es la función que tienes o necesitas crear
        handleDeleteProductClick(productId); 
    }
});

// ====================================================================
// DELEGACIÓN DE EVENTOS PARA BOTONES DE LA TABLA DE CLIENTES
// ====================================================================
document.getElementById('clients-list-body')?.addEventListener('click', async (e) => { // ✅ CORRECCIÓN: Agregar 'async'
    
    // Encuentra el botón más cercano que fue clickeado
    const button = e.target.closest('button');

    if (button) {
        e.preventDefault(); 
        
        const clientId = button.getAttribute('data-client-id');

        // Manejar cada tipo de botón
        if (button.classList.contains('edit-client-btn')) {
            await handleEditClientClick(clientId); // Si esta es async
        }

        if (button.classList.contains('delete-client-btn')) {
            handleDeleteClientClick(clientId);
        }

        // El botón de abono ahora llama al reporte de deuda (que es async)
        if (button.classList.contains('view-debt-btn')) { 
            await handleViewClientDebt(clientId); // ✅ Ahora funciona correctamente
        }
    }
});

// Y el listener de envío del formulario de edición también debe estar presente:
document.getElementById('edit-client-form')?.addEventListener('submit', handleEditClient);



// Listener para abrir el formulario de abono desde el reporte de deuda
document.getElementById('open-abono-from-report-btn')?.addEventListener('click', () => {
    // 1. Cierra el modal de reporte
    closeModal('modal-client-debt-report'); 
    
    // 2. Abre el modal de abono y pre-carga el ID del cliente
    // Se asume que 'openAbonoModal' existe y toma el viewingClientId (definido en main.js)
    openAbonoModal(viewingClientId); 
});

// --------------------------------------
// --- Apertura/Cierre de Modales Universal ---
// --------------------------------------

// Cierre universal al hacer clic fuera
document.addEventListener('click', (event) => {
    const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
    openModals.forEach(modal => {
        if (event.target === modal) {
            closeModal(modal.id);
        }
    });
});

// Apertura universal para botones con data-open-modal
document.querySelectorAll('[data-open-modal]').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const modalId = button.getAttribute('data-open-modal');
        openModal(modalId); 
    });
});


// ====================================================================
// ✅ Productos (EDITAR/ELIMINAR)
// ====================================================================

// Listener para el botón de confirmación de eliminación (del modal)
document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDeleteProduct);

document.getElementById('edit-product-form')?.addEventListener('submit', handleEditProduct);

// Listener para el cambio del Producto Base (El que falla)
document.getElementById('product-main-select')?.addEventListener('change', handleChangeProductForSale);

// Listener para el cambio del Paquete (Asegura que el precio se actualice al seleccionar un paquete)
document.getElementById('subproduct-select')?.addEventListener('change', (e) => {
    updatePriceField(e.target.value); 
});


// Listener para el envío del formulario de registro de abonos
document.getElementById('abono-client-form')?.addEventListener('submit', handleRecordAbono);

// Cierre con la tecla Escape
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
        const topModal = openModals[openModals.length - 1]; 
        
        if (topModal) {
            closeModal(topModal.id);
        }
    }
});
});