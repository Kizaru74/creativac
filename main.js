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

try {
    if (!window.supabase) {
        throw new Error("Librería Supabase no encontrada.");
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 
} catch (e) {
    console.error("Error Fatal: Supabase no inicializó.", e);
    document.getElementById('auth-container').style.display = 'flex';
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

// ✅ CORREGIDO: Se adjunta a window para que sea global
window.openModal = function(modalId) { 
    document.getElementById(modalId).classList.remove('hidden');
}

// ✅ CORREGIDO: Se adjunta a window para que sea global y se añade el cierre de llaves faltante
window.closeModal = function(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        // El código interno que estaba cortado sigue funcionando aquí
    }
}


// ====================================================================
// 3. AUTENTICACIÓN Y SESIÓN
// ====================================================================

async function checkUserSession() {
    const { data: { user } } = await supabase.auth.getUser();

    const authContainer = document.getElementById('auth-container');
    const mainContent = document.getElementById('main-app-content');
    
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
    const { data: salesData, error: salesError } = await supabase
        .from('ventas')
        .select('total_amount');

    if (salesError) {
        console.error('Error al cargar ventas:', salesError);
        document.getElementById('total-sales').textContent = formatCurrency(0);
        return;
    }

    const totalSales = salesData.reduce((sum, sale) => sum + sale.total_amount, 0);
    document.getElementById('total-sales').textContent = formatCurrency(totalSales);

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
        .gt('saldo_pendiente', 0)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar tabla de deudas:', error);
        return;
    }

    const container = document.getElementById('debt-table-body');
    if (!container) return; 
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500 italic">No hay deudas pendientes.</td></tr>';
        return;
    }

    data.forEach(debt => {
        const clientName = debt.clientes?.name || 'Cliente Desconocido';
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-black font-bold">${clientName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatDate(debt.created_at)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(debt.total_amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">${formatCurrency(debt.saldo_pendiente)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-debt-id="${debt.venta_id}" data-client-name="${clientName}" data-debt-amount="${debt.saldo_pendiente}" class="text-indigo-600 hover:text-indigo-900 pay-debt-btn">Pagar</button>
            </td>
        `;
        container.appendChild(row);
    });

    document.querySelectorAll('.pay-debt-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const debtId = e.target.dataset.debtId;
            const clientName = e.target.dataset.clientName;
            const debtAmount = parseFloat(e.target.dataset.debtAmount);
            openPaymentModal(debtId, clientName, debtAmount);
        });
    });
}

async function loadDashboardData() {
    await loadTotals();
    await loadDebts();
    // Pre-carga de datos para admin modales y selects
    await loadClientsTable(); // Ahora carga el dashboard y el modal
    await loadProductsData(); // Carga la lista global de productos
    await loadProductsTable(); // Muestra la tabla de admin
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
        .eq('is_active', true) 
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

async function loadParentProductsForSelect(selectId) {
    const mainProducts = allProducts.filter(p => p.type === 'MAIN');

    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Seleccione Producto Principal</option>';
    
    mainProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.name; 
        option.textContent = product.name;
        select.appendChild(option);
    });
}

// ====================================================================
// 6. LÓGICA DE PRODUCTOS DINÁMICOS EN VENTA
// ====================================================================

function updateSubproductSelect(selectedMainProductName) {
    const subproductSelect = document.getElementById('subproduct-select'); 
    const priceInput = document.getElementById('product-unit-price'); 
    
    if (!subproductSelect || !priceInput) return;

    subproductSelect.innerHTML = '';
    subproductSelect.disabled = true; 
    
    const subproducts = allProducts.filter(
        p => p.type === 'PACKAGE' && p.parent_product === selectedMainProductName
    );
    
    let mainProductAsPriceBase = allProducts.find(item => 
        item.name === selectedMainProductName && item.type === 'MAIN'
    );
    
    subproductSelect.innerHTML = '<option value="" data-price="0" disabled selected>Seleccione un Paquete/Base</option>';

    if (subproducts.length > 0) {
        subproducts.forEach(item => {
            const option = document.createElement('option');
            option.value = item.producto_id; 
            option.textContent = `${item.name} (Paquete) - ${formatCurrency(item.price)}`;
            option.dataset.price = item.price; 
            subproductSelect.appendChild(option);
        });
    }
    
    if (mainProductAsPriceBase) {
        const option = document.createElement('option');
        option.value = mainProductAsPriceBase.producto_id;
        option.textContent = `[Precio Base] - ${formatCurrency(mainProductAsPriceBase.price)}`;
        option.dataset.price = mainProductAsPriceBase.price; 
        subproductSelect.appendChild(option);
        
        if (subproducts.length === 0) {
            subproductSelect.value = mainProductAsPriceBase.producto_id;
            priceInput.value = mainProductAsPriceBase.price.toFixed(2);
        } else {
             priceInput.value = '0.00';
        }
    } else {
        priceInput.value = '0.00';
    }

    subproductSelect.disabled = false;
}


// ====================================================================
// 7. LÓGICA DE VENTA MULTI-ITEM
// ====================================================================

function calculateGrandTotal() {
    const totalAmountInput = document.getElementById('total-amount');
    const paidAmountInput = document.getElementById('paid-amount');
    const balanceInput = document.getElementById('remaining-balance');

    const grandTotal = currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    if (totalAmountInput) {
        totalAmountInput.value = grandTotal.toFixed(2);
    }
    
    const paidAmount = parseFloat(paidAmountInput?.value) || 0;
    const remainingBalance = Math.max(0, grandTotal - paidAmount);
    
    if (balanceInput) {
        balanceInput.value = remainingBalance.toFixed(2);
    }
}

function updateSaleTableDisplay() {
    const container = document.getElementById('sale-items-container');
    if (!container) return;
    
    container.innerHTML = '';

    if (currentSaleItems.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500 italic">Agrega productos a la venta.</td></tr>';
        return;
    }
    
    currentSaleItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.dataset.index = index; 
        
        row.innerHTML = `
            <td class="px-6 py-3 text-sm font-medium text-gray-900">${item.name}</td>
            <td class="px-6 py-3 text-sm text-gray-500">${formatCurrency(item.price)}</td>
            <td class="px-6 py-3 text-sm text-gray-500">${item.quantity}</td>
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
}

function addItemToSaleTable(item) {
    const container = document.getElementById('sale-items-container');
    if (!container) return;

    if (currentSaleItems.length === 1) { 
        container.innerHTML = '';
    }

    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    row.dataset.index = currentSaleItems.length - 1; 

    row.innerHTML = `
        <td class="px-6 py-3 text-sm font-medium text-gray-900">${item.name}</td>
        <td class="px-6 py-3 text-sm text-gray-500">${formatCurrency(item.price)}</td>
        <td class="px-6 py-3 text-sm text-gray-500">${item.quantity}</td>
        <td class="px-6 py-3 text-sm font-bold">${formatCurrency(item.subtotal)}</td>
        <td class="px-6 py-3 text-right text-sm font-medium">
            <button type="button" onclick="removeItemFromSale(${row.dataset.index})" 
                    class="text-red-600 hover:text-red-900">
                <i class="fas fa-times-circle"></i>
            </button>
        </td>
    `;
    container.appendChild(row);

    calculateGrandTotal();
}

window.removeItemFromSale = function(index) {
    currentSaleItems.splice(index, 1);
    updateSaleTableDisplay();
    calculateGrandTotal();
}

function handleAddProductToSale(e) {
    e.preventDefault();

    const subSelect = document.getElementById('subproduct-select');   
    const quantityInput = document.getElementById('product-quantity'); 
    const priceInput = document.getElementById('product-unit-price'); 

    const productId = subSelect?.value;
    const name = subSelect?.selectedOptions[0]?.textContent;
    const quantity = parseFloat(quantityInput?.value);
    // IMPORTANTE: Aquí lee el valor ACTUAL del input, que puede ser el default o el que ajustó el usuario.
    const price = parseFloat(priceInput?.value); 

    if (!productId || productId === '') {
        alert('Por favor, selecciona un Paquete/Subcategoría o Precio Base.');
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        alert('La cantidad debe ser mayor a cero.');
        return;
    }
    if (isNaN(price) || price < 0) {
        alert('El precio debe ser un valor válido.');
        return;
    }

    const subtotal = quantity * price;

    const newItem = {
        product_id: productId,
        name: name.split('(')[0].trim().replace('[Precio Base]', '').trim(), 
        quantity: quantity,
        price: price,
        subtotal: subtotal
    };

    currentSaleItems.push(newItem);
    addItemToSaleTable(newItem);

    document.getElementById('product-main-select').value = '';
    subSelect.innerHTML = '<option value="" disabled selected>Seleccione Principal primero</option>';
    subSelect.disabled = true;
    quantityInput.value = '1';
    priceInput.value = '0.00';
}


// ====================================================================
// 8. MANEJO DE FORMULARIO DE NUEVA VENTA (TRANSACCIONAL)
// ====================================================================

async function handleNewSale(e) {
   e.preventDefault();

    const client_id = document.getElementById('client-select')?.value ?? null;
    const total_amount_str = document.getElementById('total-amount')?.value ?? '0';
    const paid_amount_str = document.getElementById('paid-amount')?.value ?? '0'; 
    const payment_method = document.getElementById('payment-method')?.value ?? 'Efectivo';
    
    // ✅ REVERSIÓN: Captura de la descripción (ya que la columna ahora existe en Supabase)
    const sale_description = document.getElementById('sale-description')?.value.trim() ?? null;
    
    const total_amount = parseFloat(total_amount_str);
    const paid_amount = parseFloat(paid_amount_str);
    const saldo_pendiente = total_amount - paid_amount; 

    const sale_details_array = currentSaleItems; 

    if (!client_id) {
        alert('Por favor, selecciona un cliente.');
        return;
    }
    if (sale_details_array.length === 0) {
        alert('Debes agregar al menos un producto a la venta.');
        return;
    }
    if (paid_amount > total_amount) {
        alert('El monto pagado no puede ser mayor que el total de la venta.');
        return;
    }

    try {
        const { data: saleData, error: saleError } = await supabase
            .from('ventas')
            .insert([{
                client_id: client_id,
                total_amount: total_amount,
                paid_amount: paid_amount,
                saldo_pendiente: saldo_pendiente,
                metodo_pago: payment_method, 
                description: sale_description, 
            }])
            .select('venta_id'); 

        if (saleError || !saleData || saleData.length === 0) {
            console.error('Error al insertar venta:', saleError);
            alert(`Error al registrar la venta: ${saleError?.message || 'Desconocido'}`);
            return;
        }

        const new_venta_id = saleData[0].venta_id;

        const detailsToInsert = sale_details_array.map(item => ({
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

        if (paid_amount > 0) {
            const { error: paymentError } = await supabase
                .from('pagos')
                .insert([{
                    venta_id: new_venta_id,
                    amount: paid_amount,
                    client_id: client_id,
                    metodo_pago: payment_method,
                }]);

            if (paymentError) {
                console.error('Error al registrar pago inicial:', paymentError);
                alert(`Advertencia: El pago inicial falló. ${paymentError.message}`);
            }
        }

        alert('Venta, detalles y pago (si aplica) registrados exitosamente.');
        closeModal('new-sale-modal');
        await loadDashboardData(); 

    } catch (error) {
        console.error('Error fatal al registrar la venta:', error.message);
        alert('Error fatal al registrar la venta: ' + error.message);
    } finally {
        currentSaleItems = []; 
        updateSaleTableDisplay();
    }
}


// ====================================================================
// 9. LÓGICA CRUD PARA CLIENTES
// ====================================================================

async function loadClientsTable() {
    const { data, error } = await supabase
        .from('clientes')
        .select('client_id, name, telefono')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al cargar clientes:', error);
        return;
    }

    // 🔥 CORRECCIÓN: Ahora actualiza la tabla del Dashboard y la del Modal de Administración
    const dashboardContainer = document.getElementById('clients-table-body');
    const adminContainer = document.getElementById('admin-clients-table-body');

    const containers = [dashboardContainer, adminContainer].filter(c => c);

    if (containers.length === 0) return;

    // Limpiar ambos contenedores
    containers.forEach(c => c.innerHTML = '');

    if (data.length === 0) {
        const noDataRow = '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500 italic">No hay clientes registrados.</td></tr>';
        containers.forEach(c => c.innerHTML = noDataRow);
        return;
    }

    data.forEach(client => {
        const rowHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${client.telefono || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-client-id="${client.client_id}" class="text-indigo-600 hover:text-indigo-900 edit-client-btn mr-2">Editar</button>
                <button data-client-id="${client.client_id}" class="text-red-600 hover:text-red-900 delete-client-btn">Eliminar</button>
            </td>
        `;
        
        containers.forEach(container => {
             const row = document.createElement('tr');
             row.className = 'hover:bg-gray-50';
             row.innerHTML = rowHTML;
             container.appendChild(row);
        });
    });
}

async function handleNewClient(e) {
    e.preventDefault();
    const nombre = document.getElementById('new-client-name').value;
    const telefono = document.getElementById('new-client-phone').value;

    const { error } = await supabase
        .from('clientes')
        .insert([{ name: nombre, telefono, is_active: true }]);

    if (error) {
        alert('Error al registrar cliente: ' + error.message);
    } else {
        alert('Cliente registrado exitosamente.');
        closeModal('new-client-modal');
        await loadClientsTable(); 
        await loadClientsForSale();
    }
}

async function openEditClientModal(clientId) {
    const { data, error } = await supabase
        .from('clientes')
        .select('name, telefono')
        .eq('client_id', clientId)
        .single();

    if (error || !data) {
        alert('Error al cargar datos del cliente para editar: ' + (error?.message || 'No encontrado'));
        return;
    }
    
    editingClientId = clientId;
    document.getElementById('edit-client-name').value = data.name;
    document.getElementById('edit-client-phone').value = data.telefono || '';
    
    openModal('edit-client-modal');
}

async function handleEditClient(e) {
    e.preventDefault();
    if (!editingClientId) return;

    const nombre = document.getElementById('edit-client-name').value;
    const telefono = document.getElementById('edit-client-phone').value;

    const { error } = await supabase
        .from('clientes')
        .update({ name: nombre, telefono })
        .eq('client_id', editingClientId);

    if (error) {
        alert('Error al actualizar cliente: ' + error.message);
    } else {
        alert('Cliente actualizado exitosamente.');
        closeModal('edit-client-modal');
        await loadClientsTable();
        await loadClientsForSale();
    }
}

async function handlePermanentDeleteClient(clientId) {
    if (!confirm('ADVERTENCIA: ¿Estás seguro de ELIMINAR PERMANENTEMENTE este cliente? Se borrarán todas sus ventas, pagos y deudas relacionadas.')) {
        return;
    }
    
    // Asumiendo que existe un RPC 'delete_client_cascade' en Supabase
    const { error } = await supabase.rpc('delete_client_cascade', { client_to_delete_id: clientId });

    if (error) {
        alert('Error al eliminar cliente: ' + error.message + ' Asegúrate de tener configurado el RPC `delete_client_cascade`.');
    } else {
        alert('Cliente y todos sus registros relacionados eliminados exitosamente.');
        await loadClientsTable();
        await loadClientsForSale();
        await loadDashboardData();
    }
}

// main.js: Función window.loadSalesList - CORREGIDA
window.loadSalesList = async function() {
    const salesListBody = document.getElementById('sales-list-body');
    salesListBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center">Cargando ventas...</td></tr>';

    // Obtener todas las ventas y la información del cliente asociado
    const { data: ventas, error } = await supabase
        .from('ventas')
        .select(`
            venta_id, 
            created_at, 
            total_amount, 
            saldo_pendiente, 
            clientes ( name ) // Usando 'clientes'
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar la lista de ventas:', error);
        salesListBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Error al cargar las ventas.</td></tr>';
        return;
    }

    salesListBody.innerHTML = '';
    
    // Si no hay ventas, mostramos un mensaje
    if (ventas.length === 0) {
        salesListBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';
        return; 
    }

    ventas.forEach(venta => {
        // ⚠️ IMPORTANTE: 'row' DEBE DEFINIRSE AQUÍ
        const row = salesListBody.insertRow(); 
        
        // Formatear fecha y moneda
        const date = new Date(venta.created_at).toLocaleDateString();
        const total = venta.total_amount.toFixed(2);
        const saldo = venta.saldo_pendiente.toFixed(2);
        const clientName = venta.clientes.name;

        row.className = `cursor-pointer hover:bg-gray-100 ${venta.saldo_pendiente > 0 ? 'bg-yellow-50' : ''}`;
        row.setAttribute('data-venta-id', venta.venta_id);
        
        row.innerHTML = `
            <td class="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${venta.venta_id}</td>
            <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-900">${clientName}</td>
            <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-500">${date}</td>
            <td class="px-6 py-3 whitespace-nowrap text-sm font-bold text-right">$${total}</td>
            <td class="px-6 py-3 whitespace-nowrap text-sm font-bold text-right text-red-600">$${saldo}</td>
            <td class="px-6 py-3 whitespace-nowrap text-sm text-center">
                <button onclick="openSaleDetailModal(${venta.venta_id})" class="text-indigo-600 hover:text-indigo-900 font-semibold text-xs">Ver Detalle</button>
            </td>
        `;
    }); // <-- Aquí termina el alcance de 'row'

    // Agregar el listener para búsqueda
    document.getElementById('sales-search').onkeyup = function() {
        filterSalesList(this.value);
    };
}

//Función window.openSaleDetailModal - CORREGIDA Y LIMPIA

window.openSaleDetailModal = async function(ventaId) {
    // 1. Consulta la Venta y sus relaciones (Detalles, Pagos y Cliente)
    const { data: venta, error } = await supabase
        .from('ventas')
        .select(`
            *, 
            clientes ( name ),
            detalle_ventas ( name, quantity, price, subtotal ),
            pagos ( created_at, amount, metodo_pago )
        `) // <-- ¡La consulta SELECT debe ir sin comentarios internos!
        .eq('venta_id', ventaId)
        .single();

    if (error || !venta) {
        console.error('Error al cargar detalle de venta:', error);
        alert('No se pudo cargar el detalle de la venta.');
        return;
    }

    // Usamos formatCurrency (o una función similar) para el formato de moneda
    const format = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

    // 2. Rellenar los encabezados (Cliente, Descripción, Totales)
    document.getElementById('detail-sale-id').textContent = `#${venta.venta_id}`;
    document.getElementById('detail-client-name').textContent = venta.clientes.name;
    document.getElementById('detail-description').textContent = venta.description || 'Sin descripción';
    
    document.getElementById('detail-total-amount').textContent = format(venta.total_amount);
    document.getElementById('detail-paid-amount').textContent = format(venta.paid_amount);
    document.getElementById('detail-saldo-pendiente').textContent = format(venta.saldo_pendiente);
    
    // 3. Rellenar Productos
    const productsBody = document.getElementById('detail-products-body');
    productsBody.innerHTML = '';
    venta.detalle_ventas.forEach(item => {
        productsBody.innerHTML += `
            <tr>
                <td class="px-6 py-2 whitespace-nowrap">${item.name}</td>
                <td class="px-6 py-2 whitespace-nowrap text-center">${item.quantity}</td>
                <td class="px-6 py-2 whitespace-nowrap text-right">${format(item.price)}</td>
                <td class="px-6 py-2 whitespace-nowrap text-right font-semibold">${format(item.subtotal)}</td>
            </tr>
        `;
    });
    
    // 4. Rellenar Pagos
    const paymentsBody = document.getElementById('detail-payments-body');
    paymentsBody.innerHTML = '';
    if (venta.pagos.length === 0) {
        paymentsBody.innerHTML = '<tr><td colspan="3" class="px-6 py-2 text-center text-gray-500">No hay abonos registrados.</td></tr>';
    } else {
        // Ordenar pagos por fecha (el más reciente primero)
        venta.pagos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        venta.pagos.forEach(pago => {
            const date = new Date(pago.created_at).toLocaleDateString('es-MX', { 
                year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
            paymentsBody.innerHTML += `
                <tr>
                    <td class="px-6 py-2 whitespace-nowrap">${date}</td>
                    <td class="px-6 py-2 whitespace-nowrap text-right font-semibold text-green-700">${format(pago.amount)}</td>
                    <td class="px-6 py-2 whitespace-nowrap text-center">${pago.metodo_pago}</td>
                </tr>
            `;
        });
    }

    // 5. Configurar formulario de Abono
    document.getElementById('payment-sale-id').value = venta.venta_id;
    document.getElementById('abono-amount').value = '';
    
    // Limitar el monto máximo a abonar al saldo pendiente
    document.getElementById('abono-amount').setAttribute('max', venta.saldo_pendiente);

    // Deshabilitar botón si ya está pagado
    document.getElementById('submit-abono-btn').disabled = venta.saldo_pendiente <= 0.01;
    document.getElementById('submit-abono-btn').textContent = venta.saldo_pendiente <= 0.01 ? 'Saldada' : 'Abonar';


    openModal('sale-detail-modal');
}

async function openSaleDetailModal(ventaId) {
    const { data: venta, error } = await supabase
        .from('ventas')
        .select(`
            *, 
            clients ( name ), 
            detalle_ventas ( name, quantity, price, subtotal ),
            pagos ( created_at, amount, metodo_pago )
        `)
        .eq('venta_id', ventaId)
        .single();

    if (error || !venta) {
        console.error('Error al cargar detalle de venta:', error);
        alert('No se pudo cargar el detalle de la venta.');
        return;
    }

    // 1. Rellenar los encabezados
    document.getElementById('detail-sale-id').textContent = `#${venta.venta_id}`;
    document.getElementById('detail-client-name').textContent = venta.clients.name;
    document.getElementById('detail-description').textContent = venta.description || 'Sin descripción';
    
    document.getElementById('detail-total-amount').textContent = `$${venta.total_amount.toFixed(2)}`;
    document.getElementById('detail-paid-amount').textContent = `$${venta.paid_amount.toFixed(2)}`;
    document.getElementById('detail-saldo-pendiente').textContent = `$${venta.saldo_pendiente.toFixed(2)}`;
    
    // 2. Rellenar Productos
    const productsBody = document.getElementById('detail-products-body');
    productsBody.innerHTML = '';
    venta.detalle_ventas.forEach(item => {
        productsBody.innerHTML += `
            <tr>
                <td class="px-6 py-2 whitespace-nowrap">${item.name}</td>
                <td class="px-6 py-2 whitespace-nowrap text-center">${item.quantity}</td>
                <td class="px-6 py-2 whitespace-nowrap text-right">$${item.price.toFixed(2)}</td>
                <td class="px-6 py-2 whitespace-nowrap text-right font-semibold">$${item.subtotal.toFixed(2)}</td>
            </tr>
        `;
    });
    
    // 3. Rellenar Pagos
    const paymentsBody = document.getElementById('detail-payments-body');
    paymentsBody.innerHTML = '';
    if (venta.pagos.length === 0) {
        paymentsBody.innerHTML = '<tr><td colspan="3" class="px-6 py-2 text-center text-gray-500">No hay abonos registrados.</td></tr>';
    } else {
        venta.pagos.forEach(pago => {
            const date = new Date(pago.created_at).toLocaleDateString('es-MX', { 
                year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
            paymentsBody.innerHTML += `
                <tr>
                    <td class="px-6 py-2 whitespace-nowrap">${date}</td>
                    <td class="px-6 py-2 whitespace-nowrap text-right font-semibold text-green-700">$${pago.amount.toFixed(2)}</td>
                    <td class="px-6 py-2 whitespace-nowrap text-center">${pago.metodo_pago}</td>
                </tr>
            `;
        });
    }

    // 4. Configurar formulario de Abono
    document.getElementById('payment-sale-id').value = venta.venta_id;
    document.getElementById('payment-amount').value = '';
    document.getElementById('submit-abono-btn').disabled = venta.saldo_pendiente <= 0;
    document.getElementById('submit-abono-btn').textContent = venta.saldo_pendiente <= 0 ? 'Pagado' : 'Abonar';


    openModal('sale-detail-modal');
}

function filterSalesList(searchTerm) {
    const rows = document.getElementById('sales-list-body').querySelectorAll('tr');
    const term = searchTerm.toLowerCase();

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(term)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Listener para el formulario de abono
document.getElementById('register-payment-form')?.addEventListener('submit', handleRegisterPayment);

async function handleRegisterPayment(e) {
    e.preventDefault();

    const venta_id = document.getElementById('payment-sale-id').value;
    // ✅ CAMBIO DE ID: Usamos 'abono-amount'
    const amountStr = document.getElementById('abono-amount').value.trim(); 
    const metodo_pago = document.getElementById('payment-method-abono').value;

    const amount = parseFloat(amountStr);
    
    const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);


    // 1. VALIDACIÓN DEL MONTO
    if (amountStr === '' || isNaN(amount) || amount <= 0) { 
        alert('Por favor, ingresa un monto válido para el abono (mayor a cero).');
        return;
    }

    // 2. Obtener los datos actuales de la venta
    const { data: ventaActual, error: fetchError } = await supabase
        .from('ventas')
        .select('total_amount, paid_amount, saldo_pendiente, client_id')
        .eq('venta_id', venta_id)
        .single();

    if (fetchError || !ventaActual) {
        alert('Error al obtener datos de la venta para el abono.');
        return;
    }

    if (ventaActual.saldo_pendiente <= 0.01) {
        alert('Esta venta ya está saldada.');
        return;
    }
    
    // 3. Validar y limitar el monto al saldo pendiente
    const saldoPendiente = ventaActual.saldo_pendiente;
    
    if (amount > saldoPendiente) {
        alert(`Advertencia: El abono excede el saldo pendiente. Solo se aplicará el monto restante: ${formatCurrency(saldoPendiente)}.`);
    }
    
    const amountToPay = Math.min(amount, saldoPendiente);

    // 4. Calcular nuevos saldos
    const newPaidAmount = ventaActual.paid_amount + amountToPay;
    const newSaldoPendiente = ventaActual.total_amount - newPaidAmount;

    // 5. Registrar el pago (abono)
    const { error: paymentError } = await supabase
        .from('pagos')
        .insert([{
            venta_id: venta_id,
            amount: amountToPay,
            client_id: ventaActual.client_id,
            metodo_pago: metodo_pago,
        }]);

    if (paymentError) {
        alert('Error al registrar el abono: ' + paymentError.message);
        return;
    }

    // 6. Actualizar la tabla 'ventas'
    const { error: updateError } = await supabase
        .from('ventas')
        .update({
            paid_amount: newPaidAmount,
            saldo_pendiente: newSaldoPendiente,
        })
        .eq('venta_id', venta_id);

    if (updateError) {
        alert('Advertencia: El abono se registró, pero falló la actualización del saldo en la venta. Contacte soporte.');
    } else {
        alert(`Abono de ${formatCurrency(amountToPay)} registrado exitosamente.`);
    }

    // 7. Recargar y cerrar modales
    closeModal('sale-detail-modal');
    await loadSalesList(); 
    openModal('admin-sales-modal');
    await loadDashboardData();
}

// ====================================================================
// 10. LÓGICA CRUD PARA PRODUCTOS
// ====================================================================

function toggleParentProductField() {
    const type = document.getElementById('new-product-type')?.value;
    const parentContainer = document.getElementById('parent-product-container');
    
    if (!parentContainer) return;

    if (type === 'PACKAGE') {
        parentContainer.classList.remove('hidden');
        loadParentProductsForSelect('parent-product-select'); 
    } else {
        parentContainer.classList.add('hidden');
    }
}

async function loadProductsTable() {
    await loadProductsData(); // Asegurar que 'allProducts' se cargue antes de dibujar.

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
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.type}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.parent_product || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold">${formatCurrency(product.price)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-product-id="${product.producto_id}" class="text-indigo-600 hover:text-indigo-900 edit-product-btn mr-2">Editar</button>
                <button data-product-id="${product.producto_id}" class="text-red-600 hover:text-red-900 delete-product-btn">Eliminar</button>
            </td>
        `;
        container.appendChild(row);
    });
}

async function handleNewProduct(e) {
    e.preventDefault();
    const name = document.getElementById('new-product-name').value;
    const price = parseFloat(document.getElementById('new-product-price').value);
    const type = document.getElementById('new-product-type').value;
    const parentProduct = document.getElementById('parent-product-select').value || null;

    if (type === 'PACKAGE' && !parentProduct) {
        alert('Los paquetes deben tener un Producto Principal asociado.');
        return;
    }
    
if (isNaN(price) || price < 0) { 
        alert('El precio debe ser un número válido (mayor o igual a cero).');
        return;
    }

    const { error } = await supabase
        .from('productos')
        .insert([{ name, price, type, parent_product: parentProduct }]);

    if (error) {
        alert('Error al registrar producto: ' + error.message);
    } else {
        alert('Producto registrado exitosamente.');
        closeModal('new-product-modal');
        await loadProductsData(); 
        await loadProductsTable();
    }
}

async function openEditProductModal(productId) {
    if (!productId) return;

    // 1. Cargar datos del producto
    const { data: product, error } = await supabase
        .from('productos')
        .select('*')
        .eq('producto_id', productId)
        .single();

    if (error) {
        console.error('Error al cargar producto para edición:', error);
        alert(`Error al cargar producto: ${error.message}`);
        return;
    }

    // 2. Llenar el formulario de Edición (Reusando el modal 'new-product-modal')
    const form = document.getElementById('new-product-form');
    
    // Asume que el modal tiene un H2/H1 con el ID 'modal-title-product' para el título
    document.getElementById('modal-title-product').textContent = `Editar Producto: ${product.name}`;
    
    document.getElementById('new-product-name').value = product.name;
    document.getElementById('new-product-price').value = product.price;
    document.getElementById('new-product-type').value = product.type;
    document.getElementById('new-product-description').value = product.description || '';

    // 3. Reconfigurar el formulario para la edición
    if (form) {
        form.dataset.editingId = productId;
        // Quitar listener de creación y poner listener de edición
        form.removeEventListener('submit', handleNewProduct);
        form.addEventListener('submit', handleEditProduct); 
    }
}


async function handleEditProduct(e) {
    e.preventDefault();
    if (!editingProductId) return;

    const name = document.getElementById('edit-product-name').value;
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const type = document.getElementById('edit-product-type').value;
    
    let parentProduct = null;
    if (type === 'PACKAGE') {
        parentProduct = document.getElementById('edit-parent-product-select').value;
        if (!parentProduct) {
            alert('Los paquetes deben tener un Producto Principal asociado.');
            return;
        }
    }

    // ✅ CORRECCIÓN: Permite precios mayores o iguales a cero en la edición.
    if (isNaN(price) || price < 0) { 
        alert('El precio debe ser un número válido (mayor o igual a cero).');
        return;
    }

    const { error } = await supabase
        .from('productos')
        .update({ name, price, type, parent_product: parentProduct })
        .eq('producto_id', editingProductId);

    if (error) {
        alert('Error al actualizar producto: ' + error.message);
    } else {
        alert('Producto actualizado exitosamente.');
        closeModal('edit-product-modal');
        await loadProductsData();
        await loadProductsTable();
    }
}

async function handleDeleteProduct(productId) {
    if (!confirm('¿Estás seguro de eliminar este producto? Esto podría causar errores si está vinculado a ventas existentes.')) {
        return;
    }
    
    const { error } = await supabase
        .from('productos')
        .delete()
        .eq('producto_id', productId);

    if (error) {
        alert('Error al eliminar producto: ' + error.message);
    } else {
        alert('Producto eliminado exitosamente.');
        await loadProductsData();
        await loadProductsTable();
    }
}


// ====================================================================
// 11. MANEJO DE PAGOS DE DEUDAS
// ====================================================================

function openPaymentModal(debtId, clientName, debtAmount) {
    debtToPayId = debtId;
    
    document.getElementById('payment-client-name').textContent = clientName;
    document.getElementById('payment-debt-amount').textContent = formatCurrency(debtAmount);
    document.getElementById('payment-amount').value = debtAmount.toFixed(2);
    document.getElementById('payment-amount').max = debtAmount.toFixed(2);
    
   window.openModal = function(modalId) { 
    document.getElementById(modalId).classList.remove('hidden');
}
}

async function handlePayment(e) {
    e.preventDefault();
    if (!debtToPayId) return;

    const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
    const metodoPago = document.getElementById('payment-method-debt').value;
    const debtAmountText = document.getElementById('payment-debt-amount').textContent;
    // Función de utilidad para limpiar el formato de moneda y obtener el número
    const maxDebt = parseFloat(debtAmountText.replace(/[^0-9.]/g, '')); 

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        alert('El monto del pago debe ser mayor a cero.');
        return;
    }
    if (paymentAmount > maxDebt) {
        alert('El monto del pago no puede ser mayor que el saldo pendiente.');
        return;
    }

    // 1. Obtener la venta para el client_id
    const { data: saleData, error: saleError } = await supabase
        .from('ventas')
        .select('client_id, saldo_pendiente, paid_amount')
        .eq('venta_id', debtToPayId)
        .single();

    if (saleError || !saleData) {
        alert('Error al obtener datos de la deuda: ' + (saleError?.message || 'Desconocido'));
        return;
    }

    const newSaldoPendiente = saleData.saldo_pendiente - paymentAmount;
    const newPaidAmount = saleData.paid_amount + paymentAmount;

    // 2. Insertar el pago
    const { error: paymentError } = await supabase
        .from('pagos')
        .insert([{
            venta_id: debtToPayId,
            client_id: saleData.client_id,
            amount: paymentAmount,
            metodo_pago: metodoPago,
        }]);

    if (paymentError) {
        alert('Error al registrar pago: ' + paymentError.message);
        return;
    }

    // 3. Actualizar la venta (saldo y monto pagado)
    const { error: updateError } = await supabase
        .from('ventas')
        .update({ 
            saldo_pendiente: newSaldoPendiente, 
            paid_amount: newPaidAmount 
        })
        .eq('venta_id', debtToPayId);

    if (updateError) {
        alert('Pago registrado, pero falló la actualización del saldo. Contacte soporte.');
        console.error('Error al actualizar venta:', updateError);
        return;
    }

    alert('Pago registrado y saldo actualizado exitosamente.');
}


// ====================================================================
// 12. LISTENERS DE EVENTOS (SETUP INICIAL - COMPLETO)
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    checkUserSession(); 
    
    // --- Autenticación ---
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('logout-button')?.addEventListener('click', handleLogout); // Corregido ID

    // --- Listeners de MODAL DE VENTA ---
    document.getElementById('open-new-sale-modal')?.addEventListener('click', async () => { 
        try {
            await loadClientsForSale(); 
            await loadProductsData();
            await loadParentProductsForSelect('product-main-select'); 
            
            currentSaleItems = []; 
            updateSaleTableDisplay(); 
            
            document.getElementById('total-amount').value = '0.00';
            document.getElementById('paid-amount').value = '0.00';
            document.getElementById('remaining-balance').value = '0.00';

            openModal('new-sale-modal'); 
        } catch (error) {
            console.error('Error al cargar datos de selects:', error);
            alert('Error al cargar los datos. Revise la consola (F12).');
        }
    });

    document.getElementById('new-sale-form')?.addEventListener('submit', handleNewSale);
    document.getElementById('add-product-btn')?.addEventListener('click', handleAddProductToSale);
    document.getElementById('paid-amount')?.addEventListener('input', calculateGrandTotal);
    
    document.getElementById('product-main-select')?.addEventListener('change', (e) => {
        const selectedMainProductName = e.target.value;
        updateSubproductSelect(selectedMainProductName);
    });
    
    document.getElementById('subproduct-select')?.addEventListener('change', () => {
        const subSelect = document.getElementById('subproduct-select');
        const priceInput = document.getElementById('product-unit-price');
        const selectedPrice = parseFloat(subSelect?.selectedOptions[0]?.dataset.price) || 0;
        
        if (priceInput) {
            priceInput.value = selectedPrice.toFixed(2);
        }
    });


    // --- Listeners de MODAL DE CLIENTES ---
    document.getElementById('open-admin-clients-modal')?.addEventListener('click', () => {
        loadClientsTable();
        openModal('admin-clients-modal');
    });
    
    document.getElementById('open-new-client-modal')?.addEventListener('click', () => {
        openModal('new-client-modal');
    });
    
    document.getElementById('new-client-form')?.addEventListener('submit', handleNewClient);
    document.getElementById('edit-client-form')?.addEventListener('submit', handleEditClient);
    
    // 🔥 CORRECCIÓN: Event Listener para la tabla del Dashboard (ya estaba)
    document.getElementById('clients-table-body')?.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-client-btn')) {
            openEditClientModal(target.dataset.clientId);
        } else if (target.classList.contains('delete-client-btn')) {
            handlePermanentDeleteClient(target.dataset.clientId);
        }
    });
    
    // 🔥 ADICIÓN: Event Listener para la tabla del Modal de Administración
    document.getElementById('admin-clients-table-body')?.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-client-btn')) {
            openEditClientModal(target.dataset.clientId);
        } else if (target.classList.contains('delete-client-btn')) {
            handlePermanentDeleteClient(target.dataset.clientId);
        }
    });


    // --- Listeners de MODAL DE PRODUCTOS ---
    document.getElementById('open-admin-products-modal')?.addEventListener('click', async () => {
        await loadProductsData(); 
        await loadProductsTable();
        openModal('admin-products-modal');
    });
    
    document.getElementById('open-new-product-modal')?.addEventListener('click', async () => {
        await loadProductsData(); 
        await loadParentProductsForSelect('parent-product-select');
        toggleParentProductField();
        openModal('new-product-modal');
    });

    document.getElementById('new-product-form')?.addEventListener('submit', handleNewProduct);
    document.getElementById('edit-product-form')?.addEventListener('submit', handleEditProduct);
    document.getElementById('new-product-type')?.addEventListener('change', toggleParentProductField);

    document.getElementById('products-table-body')?.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-product-btn')) {
            openEditProductModal(target.dataset.productId);
        } else if (target.classList.contains('delete-product-btn')) {
            handleDeleteProduct(target.dataset.productId);
        }
    });
    
    document.getElementById('edit-product-type')?.addEventListener('change', async (e) => {
        const type = e.target.value;
        const editParentContainer = document.getElementById('edit-parent-product-container');
        if (type === 'PACKAGE') {
            editParentContainer?.classList.remove('hidden');
            await loadParentProductsForSelect('edit-parent-product-select');
        } else {
            editParentContainer?.classList.add('hidden');
        }
    });


    // --- Listener de MODAL DE PAGO ---
    document.getElementById('payment-form')?.addEventListener('submit', handlePayment);


    // --- Cierre de Modales Universal ---
    document.querySelectorAll('[data-close-modal]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = button.getAttribute('data-close-modal');
            closeModal(modalId);
        });
    });

    document.addEventListener('click', (event) => {
        const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
        openModals.forEach(modal => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });

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