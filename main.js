// ====================================================================
// 1. CONFIGURACIÓN INICIAL DE SUPABASE Y VARIABLES GLOBALES
// ====================================================================

const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

let supabase; // Declaramos la variable

// ✅ CORRECCIÓN CRÍTICA: Inicializar Supabase directamente, fuera del try/catch.
if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Error Fatal: Librería Supabase no encontrada. La aplicación no funcionará.");
    supabase = null; // Asignar null para que las llamadas subsiguientes puedan manejarlo sin crash
}

let allProducts = []; 
let currentSaleItems = []; 
let editingClientId = null;
let editingProductId = null;
let debtToPayId = null;
let allClientsMap = {}; // ✅ DEBE ESTAR AQUÍ

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
    const { data, error } = await supabase
        .from('ventas')
        .select('venta_id, created_at, total_amount, saldo_pendiente, clientes(name)')
        .gt('saldo_pendiente', 0.01) 
        .order('created_at', { ascending: false })
        .limit(5); 

    if (error) {
        console.error('Error al cargar tabla de deudas:', error);
        return;
    }

    const container = document.getElementById('debt-sales-body'); 
    if (!container) return; 
    container.innerHTML = '';
    
    const noDebtMessage = document.getElementById('no-debt-message');
    if (noDebtMessage) noDebtMessage.classList.add('hidden');

    if (data.length === 0) {
        if (noDebtMessage) noDebtMessage.classList.remove('hidden');
        return;
    }

    data.forEach(debt => {
        const clientName = debt.clientes?.name || 'Cliente Desconocido';
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${debt.venta_id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${clientName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">${formatCurrency(debt.saldo_pendiente)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                    onclick="openSaleDetailModal(${debt.venta_id})" 
                    class="text-indigo-600 hover:text-indigo-900 font-semibold text-xs py-1 px-2 rounded bg-indigo-100"
                >
                    Detalles/Pagar
                </button>
            </td>
        `;
        container.appendChild(row);
    });
}

async function loadRecentSales() {
    const { data, error } = await supabase
        .from('ventas')
        .select(`venta_id, created_at, total_amount, saldo_pendiente, clientes(name), description`)
        .order('created_at', { ascending: false })
        .limit(10); 

    if (error) {
        console.error('Error al cargar ventas recientes:', error);
        return;
    }

    const container = document.getElementById('recent-sales-body');
    const noSalesMessage = document.getElementById('no-sales-message');
    if (!container) return; 
    container.innerHTML = '';
    if (noSalesMessage) noSalesMessage.classList.add('hidden');

    if (data.length === 0) {
        if (noSalesMessage) noSalesMessage.classList.remove('hidden');
        return;
    }

    data.forEach(sale => {
        const clientName = sale.clientes?.name || 'Cliente Desconocido';
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${sale.venta_id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${clientName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(sale.created_at)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold">${formatCurrency(sale.total_amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${sale.saldo_pendiente > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(sale.saldo_pendiente)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="openSaleDetailModal(${sale.venta_id})" class="text-indigo-600 hover:text-indigo-900 font-semibold text-xs py-1 px-2 rounded bg-indigo-100">
                    Detalles
                </button>
            </td>
        `;
        container.appendChild(row);
    });
}

async function loadDashboardData() {
    await loadTotals();
    await loadDebts();
    await loadRecentSales(); 
    await loadClientsTable(); 
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

/**
 * Función auxiliar para actualizar el campo de precio unitario.
 * @param {string} productId - La ID del producto (base o paquete) para obtener el precio.
 */
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
        // ... (Este bloque queda igual) ...
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
        alert('Venta registrada exitosamente.');
        closeModal('new-sale-modal'); // <-- Verifique que 'new-sale-modal' sea el ID correcto
        await loadDashboardData(); 

    } catch (error) {
        console.error('Error fatal al registrar la venta:', error.message);
        alert('Error fatal al registrar la venta: ' + error.message);
    } finally {
        currentSaleItems = []; 
        updateSaleTableDisplay();
        document.getElementById('new-sale-form').reset();
    }
}

// ====================================================================
// 9. LÓGICA CRUD PARA CLIENTES
// ====================================================================


async function loadClientsTable() {
    // 🚨 CORRECCIÓN: Usar la ID real del HTML
    const container = document.getElementById('clients-list-body');
    if (!container) {
        console.error("Contenedor de clientes ('clients-list-body') no encontrado.");
        return; 
    }

    if (!supabase) {
        console.error("Supabase no está inicializado.");
        return;
    }

    try {
        // 1. Obtener datos de Supabase
        const { data, error } = await supabase
            .from('clientes')
            .select('client_id, name, telefono')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error al cargar clientes:', error.message);
            return;
        }
        
        // 2. Almacenar datos globalmente
        allClients = data; 
        
        // 3. Limpiar y Renderizar
        container.innerHTML = '';

        data.forEach(client => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${client.client_id}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${client.telefono || 'N/A'}</td>
                
                <td class="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button type="button" class="edit-client-btn text-indigo-600 hover:text-indigo-900 mr-2" 
                            data-client-id="${client.client_id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button type="button" class="delete-client-btn text-red-600 hover:text-red-900" 
                            data-client-id="${client.client_id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            `;
            container.appendChild(row);
        });

    } catch (e) {
        console.error('Error inesperado en loadClientsTable:', e);
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
        closeModal('modal-new-client');
        document.getElementById('client-form').reset();
        await loadClientsTable(); 
        await loadClientsForSale(); 
    }
}

function handleEditClientClick(clientId) {
    // Asumimos que tienes un array global 'allClients' con los datos.
    const clientToEdit = allClients.find(c => String(c.client_id) === String(clientId));
    
    if (!clientToEdit) {
        alert('Error: Cliente no encontrado en los datos cargados.');
        return;
    }

    // 1. Carga los datos en los campos del modal de edición
    document.getElementById('edit-client-id').value = clientToEdit.client_id;
    document.getElementById('edit-client-name').value = clientToEdit.name || '';
    // Asume que el campo en Supabase se llama 'telefono'
    document.getElementById('edit-client-phone').value = clientToEdit.telefono || ''; 

    // 2. Abre el modal dedicado a la edición
    openModal('edit-client-modal');
}

async function handleEditClient(e) {
    e.preventDefault();
    
    // 1. Obtener los valores del formulario de edición
    const clientId = document.getElementById('edit-client-id').value;
    const name = document.getElementById('edit-client-name').value.trim();
    const phone = document.getElementById('edit-client-phone').value.trim();

    if (!clientId) {
        alert("Error de Edición: No se pudo obtener la ID del cliente.");
        return;
    }

    // 2. Ejecutar la actualización en Supabase
    const { error } = await supabase
        .from('clientes')
        .update({ name: name, telefono: phone }) // El objeto con los datos a actualizar
        .eq('client_id', clientId); // 🛑 CRÍTICO: La condición WHERE para actualizar solo este cliente

    if (error) {
        alert('Error al actualizar cliente: ' + error.message);
    } else {
        alert('Cliente actualizado exitosamente.');
        
        // 3. Limpieza y recarga
        document.getElementById('edit-client-form').reset();
        closeModal('edit-client-modal');
        
        // Asumiendo que estas funciones existen para recargar la UI
        await loadClientsTable(); 
        await loadClientsForSale(); 
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
    await loadProductsData(); 
    
    // ✅ ID de la tabla de productos usado en el HTML
    const container = document.getElementById('products-table-body'); 
    if (!container) return;
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

function handleDeleteClientClick(clientId) {
    clientToDeleteId = clientId; // Guarda la ID globalmente
    
    // 1. Busca el cliente en el array global
    const clientToDelete = allClients.find(c => String(c.client_id) === String(clientId));
    
    // 2. Muestra el nombre del cliente en el modal (si el elemento existe)
    if (clientToDelete) {
        // 🚨 CRÍTICO: Asegúrate de que el modal de confirmación contenga un <span> con este ID
        const namePlaceholder = document.getElementById('delete-client-name-placeholder');
        if (namePlaceholder) {
            namePlaceholder.textContent = clientToDelete.name;
        }
    }

    // 3. Abre el modal de confirmación
    // CRÍTICO: Reemplaza 'modal-delete-confirmation' con la ID real de tu modal
    openModal('client-delete-confirmation'); 
}

async function confirmDeleteClient() {
    const clientId = clientToDeleteId;

    if (!clientId) return;

    // Ejecuta la eliminación en Supabase
    const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('client_id', clientId); // CRÍTICO: Elimina por client_id

    if (error) {
        alert('Error al eliminar cliente: ' + error.message);
    } else {
        alert('Cliente eliminado exitosamente.');
        closeModal('client-delete-confirmation');
        clientToDeleteId = null; // Limpiar la ID
        await loadClientsTable(); // Recargar la tabla
        await loadClientsForSale();
    }
}
// CRÍTICO: Asegúrate de que el botón de confirmación tenga su listener
document.getElementById('confirm-delete-client-btn')?.addEventListener('click', confirmDeleteClient);

// ====================================================================
// 11. DETALLE Y ABONO DE VENTA 
// ====================================================================

window.openSaleDetailModal = async function(ventaId) {
    const { data: venta, error } = await supabase
        .from('ventas')
        .select(`
            *, 
            clientes(name, telefono), 
            detalle_ventas(*), 
            pagos(*)
        `)
        .eq('venta_id', ventaId)
        .single();

    if (error || !venta) {
        console.error('Error al cargar detalles de la venta:', error);
        alert('Error al cargar detalles de la venta.');
        return;
    }

    document.getElementById('detail-sale-id').textContent = `#${venta.venta_id}`;
    document.getElementById('detail-client-name').textContent = venta.clientes?.name || 'N/A';
    document.getElementById('detail-date').textContent = formatDate(venta.created_at);
    document.getElementById('detail-total-amount').textContent = formatCurrency(venta.total_amount);
    document.getElementById('detail-saldo-pendiente').textContent = formatCurrency(venta.saldo_pendiente);
    document.getElementById('detail-comments').textContent = venta.description || 'Sin comentarios';

    const productsBody = document.getElementById('detail-items-body');
    productsBody.innerHTML = '';
    venta.detalle_ventas.forEach(item => {
        productsBody.innerHTML += `
            <tr>
                <td class="px-6 py-2 whitespace-nowrap">${item.name}</td>
                <td class="px-6 py-2 whitespace-nowrap text-center">${item.quantity}</td>
                <td class="px-6 py-2 whitespace-nowrap text-right">${formatCurrency(item.price)}</td>
                <td class="px-6 py-2 whitespace-nowrap text-right font-semibold">${formatCurrency(item.subtotal)}</td>
            </tr>
        `;
    });

    const paymentsBody = document.getElementById('detail-payments-body');
    paymentsBody.innerHTML = '';
    
    venta.pagos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (venta.pagos.length === 0) {
        paymentsBody.innerHTML = '<tr><td colspan="3" class="px-6 py-2 text-center text-gray-500">No hay abonos registrados.</td></tr>';
    } else {
        venta.pagos.forEach(pago => {
            const date = new Date(pago.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            paymentsBody.innerHTML += `
                <tr>
                    <td class="px-6 py-2 whitespace-nowrap">${date}</td>
                    <td class="px-6 py-2 whitespace-nowrap text-right font-semibold text-green-700">${formatCurrency(pago.amount)}</td>
                    <td class="px-6 py-2 whitespace-nowrap text-center">${pago.metodo_pago}</td>
                </tr>
            `;
        });
    }

    document.getElementById('payment-sale-id').value = venta.venta_id;
    document.getElementById('abono-amount').value = '';
    
    const abonoInput = document.getElementById('abono-amount');
    if (abonoInput) {
        abonoInput.setAttribute('max', venta.saldo_pendiente.toFixed(2));
        abonoInput.setAttribute('placeholder', `Máx ${formatCurrency(venta.saldo_pendiente)}`);
    }

    const submitBtn = document.getElementById('submit-abono-btn');
    if (submitBtn) {
        submitBtn.disabled = venta.saldo_pendiente <= 0.01;
        submitBtn.textContent = venta.saldo_pendiente <= 0.01 ? 'Pagado' : 'Abonar';
    }

    openModal('modal-detail-sale');
}

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

    // 2. CONSULTA A SUPABASE (SINTAXIS CORREGIDA)
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
        `) // ✅ Comentario removido del string de consulta
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

            row.innerHTML = `
                <td class="px-3 py-3 whitespace-nowrap">${sale.venta_id}</td>
                <td class="px-3 py-3 whitespace-nowrap">${saleDate}</td>
                <td class="px-3 py-3 whitespace-nowrap">${clientName}</td>
                <td class="px-3 py-3 whitespace-nowrap font-semibold">${formatCurrency(sale.total_amount)}</td>
                <td class="px-3 py-3 whitespace-nowrap text-red-600">${formatCurrency(sale.saldo_pendiente)}</td>
                <td class="px-3 py-3 whitespace-nowrap">${sale.metodo_pago}</td>
                <td class="px-3 py-3 whitespace-nowrap">${sale.description || '-'}</td>
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

/**
 * Dibuja la tabla de productos de administración basándose en el array global 'allProducts'.
 * CORRECCIÓN: Usa 'products-table-body' como ID del contenedor.
 */
async function loadAndRenderProducts() {
    // ✅ CRÍTICO: Usamos la ID correcta confirmada por ti
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
// 13. LISTENERS DE EVENTOS (SETUP INICIAL - COMPLETO)
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => { // ✅ CORRECCIÓN: Se añade 'async'
    checkUserSession();
    await loadProductsData();
    await loadAllClientsMap(); //carga la lista en reporte mensual

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

    //Admin clientes
 document.getElementById('admin-clients-btn')?.addEventListener('click', () => {
    openModal('modal-admin-clients'); // Abre el modal principal
    loadAndRenderClients(); // Carga la lista de clientes
});

// --- Listeners de MODAL CLIENTES (BLOQUE CORREGIDO) ---
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
// ✅ NUEVO: DELEGACIÓN DE EVENTOS PARA BOTONES DE LA TABLA
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
// DELEGACIÓN DE EVENTOS PARA CLIENTES (EDITAR/ELIMINAR)
// ====================================================================

// 🚨 CORRECCIÓN: Cambiar el ID para que coincida con el HTML
document.getElementById('clients-list-body')?.addEventListener('click', (e) => { 
    
    const button = e.target.closest('[data-client-id]');
    if (!button) return;
    
    const clientId = button.getAttribute('data-client-id');

    // Edición
    if (button.classList.contains('edit-client-btn')) {
        e.preventDefault();
        handleEditClientClick(clientId); 
    }
    
    // Eliminación
    if (button.classList.contains('delete-client-btn')) {
        e.preventDefault();
        handleDeleteClientClick(clientId); 
    }
});

// Y el listener de envío del formulario de edición también debe estar presente:
document.getElementById('edit-client-form')?.addEventListener('submit', handleEditClient);

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

// Adjuntamos el listener al <tbody>, que es estático
document.getElementById('products-table-body')?.addEventListener('click', (e) => {
    
    // Solo procesar clics en botones
    if (!e.target.hasAttribute('data-product-id')) return;
    
    const productId = e.target.getAttribute('data-product-id');

    // 1. Botón de Edición
    if (e.target.classList.contains('edit-product-btn')) {
        e.preventDefault();
        handleEditProductClick(productId); // Llama a la nueva función
    }
    
    // 2. Botón de Eliminación
    if (e.target.classList.contains('delete-product-btn')) {
        e.preventDefault();
        handleDeleteProductClick(productId); // Llama a la nueva función
    }
});

// Listener para el botón de confirmación de eliminación (del modal)
document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDeleteProduct);

document.getElementById('edit-product-form')?.addEventListener('submit', handleEditProduct);

// Listener para el cambio del Producto Base (El que falla)
document.getElementById('product-main-select')?.addEventListener('change', handleChangeProductForSale);

// Listener para el cambio del Paquete (Asegura que el precio se actualice al seleccionar un paquete)
document.getElementById('subproduct-select')?.addEventListener('change', (e) => {
    updatePriceField(e.target.value); 
});

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