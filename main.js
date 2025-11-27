// ====================================================================
// 1. CONFIGURACIÓN INICIAL DE SUPABASE
// ====================================================================

const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

let supabase;
// Variable global para almacenar productos y permitir el filtrado dinámico
let allProducts = []; 

try {
    // Inicialización de Supabase (Versión Defensiva)
    if (!window.supabase) {
        throw new Error("Librería Supabase no encontrada.");
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 
} catch (e) {
    console.error("Error Fatal: Supabase no inicializó.", e);
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('main-app-content').style.display = 'none';
}

// ====================================================================
// 2. LÓGICA DE UTILIDAD GENERAL
// ====================================================================

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const form = modal.querySelector('form');
        if (form) form.reset();
        
        // Resetear visuales y selects del modal de venta
        if (id === 'new-sale-modal') {
             const totalDisplay = document.getElementById('sale-total-amount');
             const debtDisplay = document.getElementById('sale-debt-display');
             if (totalDisplay) totalDisplay.textContent = formatCurrency(0);
             if (debtDisplay) debtDisplay.textContent = formatCurrency(0);
             
             // Reestablecer select de subproductos
             const subproductSelect = document.getElementById('subproduct-select');
             if (subproductSelect) {
                 subproductSelect.innerHTML = '<option value="" data-price="0" disabled selected>Seleccione Principal primero</option>';
                 subproductSelect.disabled = true;
             }
             // Asegurarse de quitar el listener 'change' del select principal antes de la próxima apertura
             const mainSelect = document.getElementById('main-product-select');
             if (mainSelect) {
                 mainSelect.removeEventListener('change', filterSubproducts);
             }
        }
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

// ====================================================================
// 3. LÓGICA DE AUTENTICACIÓN
// ====================================================================

async function checkUserSession() {
    const mainAppContent = document.getElementById('main-app-content');
    const authContainer = document.getElementById('auth-container'); 

    if (!supabase || !mainAppContent || !authContainer) {
        if (authContainer) authContainer.style.display = 'flex';
        return;
    }

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        authContainer.style.display = 'flex';
        mainAppContent.style.display = 'none';
    } else {
        authContainer.style.display = 'none';
        mainAppContent.style.display = 'block'; 
        loadDashboardData(); 
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
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error al cerrar sesión:', error);
    }
    checkUserSession();
}

// ====================================================================
// 4. LÓGICA DE CARGA DE DATOS DEL DASHBOARD
// ====================================================================

async function loadDashboardData() {
    await loadTotals();
    await loadDebtsTable();
    // Agregamos la carga de clientes para la tabla del dashboard
    await loadClientsForDashboard(); 
}

async function loadTotals() {
    const totalClientsElement = document.getElementById('total-clients');
    const totalSalesElement = document.getElementById('total-sales');
    const totalDebtElement = document.getElementById('total-debt');

    if (!totalClientsElement || !totalSalesElement || !totalDebtElement) return;

    // --- 1. Conteo de clientes (ya funcionando) ---
    const { count: clientCount, error: clientError } = await supabase
        .from('clientes')
        .select('client_id', { count: 'exact', head: true });

    if (!clientError) {
        totalClientsElement.textContent = clientCount;
    } else {
         totalClientsElement.textContent = 'Error';
    }
    
    // --- 2. Carga de Ventas Totales desde la vista 'ventas_totales' ---
    // Usamos .limit(1) y array access para ser más robustos que .single()
    const { data: salesData, error: salesError } = await supabase
        .from('ventas_totales')
        .select('total_ventas')
        .limit(1); 

    let totalSales = 0;
    
    if (salesError) {
        // El error 406 cae aquí
        console.error('Error al cargar ventas totales. (406/RLS):', salesError.message);
    } else if (salesData && salesData.length > 0 && salesData[0].total_ventas) {
        // Aseguramos que data[0] existe antes de intentar leerlo
        totalSales = parseFloat(salesData[0].total_ventas) || 0;
    }
    totalSalesElement.textContent = formatCurrency(totalSales);
    
    // --- 3. Cálculo de Deuda Total Pendiente ---
    // Sumamos la columna 'debt' de todos los clientes
    const { data: clientDebtData, error: debtError } = await supabase
        .from('clientes')
        .select('debt'); 

    let totalDebt = 0;
    if (!debtError && clientDebtData) {
        totalDebt = clientDebtData.reduce((sum, client) => sum + (parseFloat(client.debt) || 0), 0);
    }
    
    const finalDebtDisplay = Math.max(0, totalDebt);
    totalDebtElement.textContent = formatCurrency(totalDebt);

    // Mantenemos la advertencia genérica si hay un error no fatal (como el 406, si continúa)
    if (salesError || debtError) {
        console.warn('Advertencia: Error al cargar totales. Revise RLS/vistas.');
    }
}

async function loadDebtsTable() {
    const tableBody = document.getElementById('debts-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="4" class="p-3 text-center text-gray-500">Cargando deudas...</td></tr>';
    
    // Usamos la sintaxis explícita: target_table!constraint_name(column)
    const { data: allSales, error } = await supabase
        .from('ventas')
        .select(`
            venta_id, 
            total_amount, 
            paid_amount,
            created_at,
            clientes!ventas_client_id_fkey (name) // <-- CORRECCIÓN CLAVE
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar ventas:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-red-500">Error: ${error.message}.</td></tr>`;
        return;
    }

    // Filtramos las deudas en JavaScript (donde el manejo de tipos es más flexible)
    const debts = allSales.filter(sale => {
        const total = parseFloat(sale.total_amount) || 0;
        const paid = parseFloat(sale.paid_amount) || 0;
        return total > paid;
    });

    if (debts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="p-3 text-center text-gray-500">No hay deudas pendientes.</td></tr>';
        return;
    }

    tableBody.innerHTML = debts.map(debt => {
        const total = parseFloat(debt.total_amount) || 0;
        const paid = parseFloat(debt.paid_amount) || 0; 
        const debtAmount = total - paid; 
        
        // Accedemos usando el alias que definimos: 'clientes'
        const clientName = debt.clientes ? debt.clientes.name : 'Cliente Desconocido'; // <-- ACCESO CORREGIDO
        const date = new Date(debt.created_at).toLocaleDateString();

        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${clientName} (Venta #${debt.venta_id})</td>
                <td class="px-6 py-4 whitespace-nowrap text-red-600 font-bold">${formatCurrency(debtAmount)}</td>
                <td class="px-6 py-4 whitespace-nowrap">${date}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm pay-debt-btn" data-sale-id="${debt.venta_id}">
                        Pagar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}


// Función para cargar clientes en la tabla del dashboard (para no dejarla vacía)
async function loadClientsForDashboard() {
    const tableBody = document.getElementById('clients-table-body'); 
    if (!tableBody) return;
    
    const { data: clients, error } = await supabase
        .from('clientes')
        .select('client_id, name, contact') // Usamos 'contact' que parece ser tu columna de teléfono
        .order('name', { ascending: true });

    if (error) {
        tableBody.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-red-500">Error al cargar clientes: ${error.message}</td></tr>`;
        return;
    }

    if (clients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="p-3 text-center text-gray-500">No hay clientes registrados.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = clients.map(client => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap font-medium">${client.name}</td>
            <td class="px-6 py-4 whitespace-nowrap">${client.contact || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <button class="text-indigo-600 hover:text-indigo-800 text-sm view-client-btn" data-client-id="${client.client_id}">
                    Ver Deuda
                </button>
            </td>
        </tr>
    `).join('');
}


// ====================================================================
// 5. LÓGICA DE CARGA PARA SELECTS (Nueva Venta)
// ====================================================================

async function loadClientsForSelect() {
    const select = document.getElementById('sale-client-select');
    if (!select) return; 

    select.innerHTML = '<option value="" disabled selected>Cargando clientes...</option>';

    const { data: clients, error } = await supabase
        .from('clientes')
        .select('client_id, name') 
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al cargar clientes:', error);
        select.innerHTML = '<option value="" disabled selected>Error al cargar clientes</option>';
        throw new Error(`Fallo la carga de clientes: ${error.message}`);
    }

    select.innerHTML = '<option value="" disabled selected>Seleccione un cliente</option>';
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.client_id;
        option.textContent = client.name;
        select.appendChild(option);
    });
}

// Carga la data y la almacena en 'allProducts' para uso dinámico
async function loadProductsData() {
    // Solo cargamos la data una vez
    if (allProducts.length > 0) return; 

    const { data: items, error } = await supabase
        .from('productos')
        .select('producto_id, name, price, type, parent_product') 
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al cargar productos para select:', error);
        throw new Error("Fallo la carga de productos/paquetes");
    }
    
    allProducts = items; // Almacenamos todos los productos globalmente
}


// ====================================================================
// 6. LÓGICA DE ADMINISTRACIÓN DE PRODUCTOS (Sin cambios)
// ====================================================================

async function loadAdminProductsList() {
    const tableBody = document.getElementById('admin-products-table-body'); 
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="4" class="p-3 text-center text-gray-500">Cargando productos...</td></tr>';
    
    const { data: products, error } = await supabase
        .from('productos')
        .select('*') 
        .order('type', { ascending: false })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al cargar productos para la tabla:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-red-500">Error al cargar productos: ${error.message}</td></tr>`;
        return;
    }
    
    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="p-3 text-center text-gray-500">No hay productos o paquetes registrados.</td></tr>';
        return;
    }

    tableBody.innerHTML = products.map(product => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap font-medium">${product.name}</td>
            <td class="px-6 py-4 whitespace-nowrap">${product.type === 'MAIN' ? 'Principal' : 'Paquete'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatCurrency(product.price)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <button class="text-indigo-600 hover:text-indigo-800 text-sm edit-product-btn" data-product-id="${product.producto_id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.currentTarget.dataset.productId;
            console.log("Abrir edición para producto:", productId);
        });
    });
}

// ===================================================================
// 7. LÓGICA DE FORMULARIOS (Cliente, Producto y Venta)
// ===================================================================

async function handleNewClient(e) {
    e.preventDefault();
    
    const name = document.getElementById('new-client-name').value.trim();
    const phone = document.getElementById('new-client-phone').value.trim();

    if (!name) {
        alert('El nombre del cliente es obligatorio.');
        return;
    }

    try {
        const { error } = await supabase
            .from('clientes')
            .insert([{ 
                name: name, 
                contact: phone || null, // Usando la columna 'contact' de tu tabla
            }]); 

        if (error) throw error;

        alert('Cliente registrado exitosamente!');
        closeModal('new-client-modal');
        loadDashboardData(); 

    } catch (error) {
        console.error('Error al registrar cliente:', error);
        alert(`Fallo el registro del cliente. Error: ${error.message}`);
    }
}

async function handleNewProduct(e) {
    e.preventDefault();
    
    const name = document.getElementById('new-product-name').value.trim();
    const price = parseFloat(document.getElementById('new-product-price').value);
    const type = document.getElementById('new-product-type').value; 
    const description = document.getElementById('new-product-description').value.trim();

    if (!name || isNaN(price) || price < 0) {
        alert('Por favor, ingrese un nombre válido y un precio mayor o igual a cero.');
        return;
    }

    // Si es un paquete, puedes pedir un producto principal aquí, si no, se inserta con parent_product null
    let parent_product_name = null; 
    if (type === 'PACKAGE') {
        // Para simplificar, asumimos que el parent_product se ingresa manualmente o se deja en NULL
    }


    try {
        const { error } = await supabase
            .from('productos')
            .insert([{ 
                name: name, 
                price: price,
                type: type, 
                description: description || null,
                parent_product: parent_product_name // Se inserta null si es MAIN o si no se especificó.
            }]);

        if (error) throw error;

        alert(`¡${name} registrado exitosamente!`);
        closeModal('new-product-modal');
        loadAdminProductsList();
        allProducts = []; // Forzar recarga de productos en la próxima venta
    } catch (error) {
        console.error('Error al registrar producto:', error);
        alert(`Fallo el registro del producto. Error: ${error.message}`);
    }
}

// FUNCIÓN CORREGIDA PARA VENTA ÚNICA CON DOBLE SELECT
async function handleNewSale(e) {
    e.preventDefault();

    const form = e.target;
    const client_id = form.querySelector('#sale-client-select').value;
    
    // Captura el monto pagado (input) y método
    const payment_amount = parseFloat(form.querySelector('#sale-payment-amount').value) || 0;
    const payment_method = form.querySelector('#sale-payment-method').value; 

    // ----------------------------------------------------------------
    // 1. RECOLECCIÓN Y CÁLCULO DE ITEMS (ADAPTADO A DOBLE SELECT)
    // ----------------------------------------------------------------
    
    if (!client_id) {
        alert('Por favor, selecciona un cliente.');
        return;
    }

    const items = [];
    let calculated_total = 0;
    
    // Usamos el select de subproductos (subproduct-select) para obtener el ID de la venta final
    const subproductSelect = form.querySelector('#subproduct-select'); 
    const quantityInput = form.querySelector('#sale-quantity');
    const priceInput = form.querySelector('#sale-price');
        
    const producto_id = subproductSelect?.value; 
    const quantity = parseFloat(quantityInput?.value) || 0;
    const price = parseFloat(priceInput?.value) || 0;

    // Validación de producto seleccionado desde el subselect
    if (producto_id && quantity > 0 && price >= 0) {
        items.push({
            producto_id: producto_id,
            quantity: quantity,
            price_at_sale: price
        });
        calculated_total = quantity * price; 
    }

    if (items.length === 0) {
        alert('Por favor, selecciona un Paquete/Subcategoría válido, cantidad y precio.');
        return;
    }

    // Validación: El monto pagado no puede superar el total
    if (payment_amount > calculated_total) {
        alert('El monto pagado no puede ser mayor que el total de la venta.');
        return;
    }

    const total_amount_value = calculated_total; 
    const paid_amount = payment_amount;

    try {
        // ----------------------------------------------------------------
        // 2. REGISTRO DE VENTA (Cabecera)
        // ----------------------------------------------------------------
        const { data: saleData, error: saleError } = await supabase
            .from('ventas')
            .insert([{ 
                client_id: client_id, 
                total_amount: total_amount_value, 
                paid_amount: paid_amount, 
            }])
            .select('venta_id') 
            .single();

        if (saleError || !saleData) {
            console.error('Error al insertar venta:', saleError);
            alert(`Error al registrar la venta: ${saleError?.message || 'Desconocido'}`);
            return;
        }

        const new_venta_id = saleData.venta_id;

        // ----------------------------------------------------------------
        // 3. REGISTRO DE DETALLE (ventas_productos)
        // ----------------------------------------------------------------
        
        const saleDetails = items.map(item => ({
            venta_id: new_venta_id,
            producto_id: item.producto_id,
            quantity: item.quantity,
            price_at_sale: item.price_at_sale
        }));

        const { error: detailError } = await supabase
            .from('ventas_productos')
            .insert(saleDetails);

        if (detailError) {
            console.error('Error al insertar detalles de venta:', detailError);
            alert(`Error al registrar el detalle de la venta: ${detailError.message}`);
            return;
        }

        // ----------------------------------------------------------------
        // 4. REGISTRO DE PAGO (si hay pago inicial)
        // ----------------------------------------------------------------
        
        if (paid_amount > 0) {
            const { error: paymentError } = await supabase
                .from('pagos')
                .insert([{
                    venta_id: new_venta_id,
                    amount: paid_amount,
                    metodo_pago: payment_method,
                    client_id: client_id
                }]);
            
            if (paymentError) {
                console.error('Error al registrar pago inicial:', paymentError);
                alert(`Error al registrar el pago inicial: ${paymentError.message}`);
            }
        }
        
        // ----------------------------------------------------------------
        // 5. FINALIZACIÓN
        // ----------------------------------------------------------------
        
        alert('Venta registrada exitosamente. Deuda calculada.');
        closeModal('new-sale-modal');
        // Recargar datos del dashboard
        await loadDashboardData();

    } catch (error) {
        console.error('Error general en la venta:', error);
        alert('Ocurrió un error inesperado al registrar la venta.');
    }
}


// ===================================================================
// 8. LÓGICA DE CÁLCULO DE VENTA Y FILTRADO DINÁMICO
// ===================================================================

// Función para filtrar productos/paquetes basados en la selección principal
function filterSubproducts() {
    const mainProductSelect = document.getElementById('main-product-select');
    const subproductSelect = document.getElementById('subproduct-select');
    const priceInput = document.getElementById('sale-price');
    
    if (!mainProductSelect || !subproductSelect || !priceInput) return;

    // Obtener el NOMBRE del producto principal seleccionado
    const selectedMainProductName = mainProductSelect.options[mainProductSelect.selectedIndex].textContent;
    
    // Limpiar y deshabilitar el select de subproductos
    subproductSelect.innerHTML = '<option value="" data-price="0" disabled selected>Cargando opciones...</option>';
    subproductSelect.disabled = true;
    priceInput.value = '0.00'; // Resetear precio
    
    let subproducts = [];
    let mainProductAsPriceBase = null;

    // 1. Filtrar subproductos/paquetes ligados al producto principal
    subproducts = allProducts.filter(item => 
        item.type === 'PACKAGE' && item.parent_product === selectedMainProductName
    );
    
    // 2. Buscar el Producto Principal (precio base) para usarlo como fallback
    mainProductAsPriceBase = allProducts.find(item => 
        item.name === selectedMainProductName && item.type === 'MAIN'
    );
    
    // 3. Si se encuentran subproductos, se listan primero.
    if (subproducts.length > 0) {
        subproductSelect.innerHTML = '<option value="" data-price="0" disabled selected>Seleccione un Paquete</option>';
        subproducts.forEach(item => {
            const option = document.createElement('option');
            option.value = item.producto_id; 
            option.textContent = `${item.name} (Paquete) - ${formatCurrency(item.price)}`;
            option.dataset.price = item.price; 
            subproductSelect.appendChild(option);
        });
        
    }
    
    // 4. Agregar la opción de Precio Base si existe el producto principal
    if (mainProductAsPriceBase) {
        const option = document.createElement('option');
        option.value = mainProductAsPriceBase.producto_id;
        option.textContent = `[Precio Base] - ${formatCurrency(mainProductAsPriceBase.price)}`;
        option.dataset.price = mainProductAsPriceBase.price; 
        subproductSelect.appendChild(option);
        
        // Si no hay subproductos o si es la única opción, seleccionarla y aplicar precio
        if (subproducts.length === 0) {
            subproductSelect.value = mainProductAsPriceBase.producto_id;
        }
    }
    
    // 5. Habilitar y Recalcular
    subproductSelect.disabled = false; 
    calculateSaleTotal(); // Calcula el total con el precio base o el primer paquete
}


// Función para calcular el total de la venta (adaptada a doble select)
function calculateSaleTotal() {
    const subproductSelect = document.getElementById('subproduct-select'); 
    const quantityInput = document.getElementById('sale-quantity');
    const priceInput = document.getElementById('sale-price');
    const totalDisplay = document.getElementById('sale-total-amount');
    const debtDisplay = document.getElementById('sale-debt-display'); 
    const paymentInput = document.getElementById('sale-payment-amount');

    let total = 0;
    const quantity = parseFloat(quantityInput?.value) || 0;
    let price = parseFloat(priceInput?.value) || 0;
    const paid = parseFloat(paymentInput?.value) || 0;
    
    // Solo calcular si hay un producto seleccionado en el segundo select
    if (subproductSelect?.value && quantity > 0) {
        // Si el campo de precio está vacío o es cero, usa el precio del select (precio base/paquete).
        if (price === 0 || priceInput.value.trim() === '') {
             const selectedOption = subproductSelect.selectedOptions[0];
             price = parseFloat(selectedOption?.dataset.price) || 0;
             if (price >= 0) {
                 // Solo auto-rellenamos si el precio del producto/paquete es > 0
                 priceInput.value = price.toFixed(2); 
             }
        }
        total = quantity * price;
    }
    
    const debt = Math.max(0, total - paid); 
    
    if (totalDisplay) totalDisplay.textContent = formatCurrency(total);
    if (debtDisplay) debtDisplay.textContent = formatCurrency(debt);
}


// ===================================================================
// 9. EVENT LISTENERS
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Listeners
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('logout-button')?.addEventListener('click', handleLogout); 

    // Formulario de Nueva Venta 
    document.getElementById('new-sale-form')?.addEventListener('submit', handleNewSale);
    
    // Formulario de Nuevo Cliente 
    document.getElementById('new-client-form')?.addEventListener('submit', handleNewClient);

    // Formulario de Nuevo Producto
    document.getElementById('new-product-form')?.addEventListener('submit', handleNewProduct); 

    // 1. Listener para abrir Nueva Venta
    document.getElementById('open-new-sale-modal')?.addEventListener('click', async () => { 
        try {
            await loadClientsForSelect(); 
            await loadProductsData(); // Carga todos los productos en 'allProducts'

            // --- 1. CONFIGURAR EL SELECT PRINCIPAL ---
            const mainSelect = document.getElementById('main-product-select');
            mainSelect.innerHTML = '<option value="" disabled selected>Seleccione Producto Principal</option>';
            // Filtrar y rellenar solo productos de tipo MAIN
            allProducts.filter(p => p.type === 'MAIN').forEach(p => {
                 const option = document.createElement('option');
                 option.textContent = p.name;
                 mainSelect.appendChild(option); 
            });

            // --- 2. ASIGNAR LISTENERS ---
            // Listener CLAVE para el filtrado dinámico
            mainSelect.addEventListener('change', filterSubproducts); 
            
            // Listeners para los cálculos (usando subproduct-select para el precio base)
            document.getElementById('subproduct-select')?.addEventListener('change', calculateSaleTotal);
            document.getElementById('sale-quantity')?.addEventListener('input', calculateSaleTotal);
            document.getElementById('sale-price')?.addEventListener('input', calculateSaleTotal);
            document.getElementById('sale-payment-amount')?.addEventListener('input', calculateSaleTotal);
            
            calculateSaleTotal(); 
            openModal('new-sale-modal'); 
        } catch (error) {
            console.error('Error al cargar datos de selects:', error);
            alert('Error al cargar los datos de clientes/productos. Revise la consola (F12).');
        }
    });

    // 2. Listener para abrir Admin. Productos
    document.getElementById('open-admin-products-modal')?.addEventListener('click', async (e) => {
        e.preventDefault(); 
        try {
            await loadAdminProductsList(); 
            openModal('admin-products-modal'); 
        } catch (error) {
            console.error('Error al cargar la lista de productos:', error);
            alert('Error al cargar los productos. Revise la consola para detalles.');
        }
    });
    
    // 3. Listener para abrir Agregar Cliente
    document.getElementById('open-new-client-modal')?.addEventListener('click', () => {
        openModal('new-client-modal');
    });
    
    // 4. Listener para abrir el modal de registro de producto
    document.getElementById('open-new-product-modal')?.addEventListener('click', () => {
        openModal('new-product-modal');
    });

    // ----------------------------------------------------------------
    // LÓGICA DE CIERRE DE MODALES
    // ----------------------------------------------------------------
    
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

    // --- Carga de datos inicial del dashboard ---
    checkUserSession(); 
});