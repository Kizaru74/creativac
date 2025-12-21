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
let allClients = [];
let allClientsMap = {};
let allProductsMap = {};
let reportSelectorsInitialized = false;
let ventasChartInstance = null;


// ✅ CORRECCIÓN DE INICIALIZACIÓN
try {
    // Intentamos detectar si la librería está bajo 'supabase' o 'window.supabase'
    const supabaseLib = window.supabase || supabase; 
    
    if (supabaseLib && typeof supabaseLib.createClient === 'function') {
        window.supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // También asignamos a la variable local para que tus funciones la encuentren
        supabase = window.supabase; 
        console.log("✅ Cliente de Supabase creado con éxito.");
    } else {
        throw new Error("La librería Supabase no está cargada correctamente.");
    }
} catch (e) {
    console.error("❌ Error Fatal al inicializar Supabase:", e.message);
    window.supabase = null;
    supabase = null;
}

// ====================================================================
// 2. UTILIDADES Y MANEJO DE MODALES
// ====================================================================

async function initializeApp() {
    console.log("🚀 Iniciando Aplicación...");
    try {
        await Promise.all([
            loadProductsData(),
            loadSalesData(),
            loadClientsTable('gestion')
        ]);
        window.handleFilterSales(); // Renderiza la tabla de reportes
        console.log("✅ Datos cargados correctamente");
    } catch (error) {
        console.error("❌ Error en inicialización:", error);
    }
}

// Llamar al final del archivo
document.addEventListener('DOMContentLoaded', initializeApp);
// Ejecutar al cargar el DOM
document.addEventListener('DOMContentLoaded', initializeApp);
//FUNCIÓN PARA CARGAR MÉTRICAS DEL DASHBOARD
window.loadDashboardMetrics = async function() {
    if (!supabase) {
        console.error("Supabase no está inicializado para cargar métricas.");
        return;
    }

    try {
        // A. CALCULAR DEUDA PENDIENTE TOTAL (SUM(saldo_pendiente) > 0.01)
        const { data: debtData, error: debtError } = await supabase
            .from('ventas')
            .select('saldo_pendiente')
            .gt('saldo_pendiente', 0.01); // Selecciona solo ventas con deuda activa

        if (debtError) throw debtError;

        let totalDebt = 0;
        if (debtData && debtData.length > 0) {
            // Suma todos los saldos pendientes
            totalDebt = debtData.reduce((sum, sale) => sum + parseFloat(sale.saldo_pendiente || 0), 0);
        }

        // B. CALCULAR VENTA HISTÓRICA TOTAL (SUM(total_amount))
        // Usamos una función de agregación directa (sum) para mayor eficiencia
        const { data: salesData, error: salesError } = await supabase
            .from('ventas')
            .select('total_amount')
            .not('total_amount', 'is', null);

        if (salesError) throw salesError;

        let historicalTotalSales = 0;
        if (salesData && salesData.length > 0) {
            historicalTotalSales = salesData.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
        }
        
        // 3. INYECTAR EN EL DOM (usando los IDs que proporcionaste)
        
        // Deuda Pendiente
        const debtElement = document.getElementById('total-debt');
        if (debtElement) {
            debtElement.textContent = formatCurrency(totalDebt);
        }

        // Total Histórico de Ventas
        const salesElement = document.getElementById('historical-total-sales');
        if (salesElement) {
            salesElement.textContent = formatCurrency(historicalTotalSales);
        }

    } catch (e) {
        console.error('Error al cargar métricas del dashboard:', e);
    }
}

// ✅ MONEDA: PESO MEXICANO (MXN)
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
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

window.openModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // El CSS ahora detecta .flex para mostrarlo
        document.body.style.overflow = 'hidden';
    }
};

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = 'auto';
    }
};

// ====================================================================
// A. Dashboard y grafica
// ====================================================================

async function loadDashboardData() {
    await loadDebts();
    await loadRecentSales();
    await loadClientsTable('gestion');
    await loadProductsTable(); 
    await loadClientsForSale();
    await loadClientDebtsTable();
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

//Deudas
async function loadDebts() {
    const tbody = document.getElementById('debts-table-body');
    if (!tbody) return;

    const { data, error } = await supabase
        .from('ventas')
        .select('saldo_pendiente, clientes(name, client_id)')
        .gt('saldo_pendiente', 0.01);

    if (error) return console.error(error);

    // Agrupamos por cliente para la vista de Control de Deudas
    const grouped = data.reduce((acc, current) => {
        const client = current.clientes;
        if (!client) return acc;
        if (!acc[client.client_id]) {
            acc[client.client_id] = { name: client.name, total: 0, id: client.client_id };
        }
        acc[client.client_id].total += Number(current.saldo_pendiente);
        return acc;
    }, {});

    const listaDeudores = Object.values(grouped);
    
    // Actualizar Tarjetas KPIs
    const totalGlobal = listaDeudores.reduce((sum, c) => sum + c.total, 0);
    const maxIndividual = Math.max(...listaDeudores.map(c => c.total), 0);
    
    document.getElementById('total-deuda-global').innerText = formatCurrency(totalGlobal);
    document.getElementById('total-clientes-deuda').innerText = listaDeudores.length;
    document.getElementById('max-deuda-individual').innerText = formatCurrency(maxIndividual);

    // Renderizar filas
    tbody.innerHTML = listaDeudores.map(deudor => `
        <tr class="hover:bg-white/[0.02] border-b border-white/5">
            <td class="px-10 py-6">
                <div class="text-white font-bold text-base">${deudor.name}</div>
                <div class="text-[10px] text-gray-600 uppercase tracking-widest mt-1">ID: ${deudor.id}</div>
            </td>
            <td class="px-10 py-6 text-center text-orange-500 font-black text-xl">
                ${formatCurrency(deudor.total)}
            </td>
            <td class="px-10 py-6">
                <span class="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">Cobro Pendiente</span>
            </td>
            <td class="px-10 py-6 text-right">
                <button onclick="handleViewClientDebt('${deudor.id}')" 
                    class="bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black py-3 px-6 rounded-2xl uppercase transition-all shadow-lg shadow-orange-900/20">
                    Gestionar Pagos
                </button>
            </td>
        </tr>
    `).join('');
}

// Función auxiliar para pintar las tarjetas rápidamente
function renderizarTarjetas(total, cantidad, max) {
    const elTotal = document.getElementById('total-deuda-global');
    const elCant = document.getElementById('total-clientes-deuda');
    const elMax = document.getElementById('max-deuda-individual');

    if (elTotal) elTotal.innerText = formatCurrency(total);
    if (elCant) elCant.innerText = cantidad;
    if (elMax) elMax.innerText = formatCurrency(max);
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
window.loadDebts = async function() {
    console.log("Refrescando datos de deudas...");
    
    // 1. Llamamos a la función que ya tienes para cargar la tabla
    // En tu main.js se llama loadDebtsTable
    if (typeof loadDebtsTable === 'function') {
        await loadDebtsTable();
    }
    
    // 2. Actualizamos las métricas (tarjetas superiores)
    if (typeof actualizarMetricasDeudas === 'function') {
        actualizarMetricasDeudas(window.allClients);
    }
};
//Llena el SELECT de Producto Padre en el modal de edición
window.loadMainProductsForEditSelect = function() {
    const selectElement = document.getElementById('edit-product-parent');
    if (!selectElement) return;

    // Usamos los datos globales ya cargados
    const allProducts = window.allProducts || []; 
    const mainProducts = allProducts.filter(product => 
        // Filtra los productos que pueden ser padres (MAIN o SERVICE)
        product.type === 'MAIN' || product.type === 'SERVICE' 
    ); 

    selectElement.innerHTML = '';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '--- Seleccione el Producto Principal ---';
    selectElement.appendChild(defaultOption);

    mainProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.producto_id; 
        option.textContent = product.name;
        selectElement.appendChild(option);
    });
}

window.loadProductDataToForm = function(productId) {
    
    // Aseguramos que el select padre esté lleno antes de buscar el valor.
    // Esto es necesario para que el select pueda cargarse con el valor del padre.
    window.loadMainProductsForEditSelect(); 
    
    // Buscamos el producto en el mapa global, asegurando la conversión a String para la clave.
    const product = window.allProductsMap ? window.allProductsMap[String(productId)] : null;

    if (!product) {
        // 🛑 CORRECCIÓN CLAVE: Eliminamos el alert() que se disparaba erróneamente.
        // Un console.error es suficiente si la validación del ID ya se hizo en handleEditProductClick.
        console.error(`Error de precarga: Producto no encontrado en el mapa con ID ${productId}.`);
        return; 
    }

    // 1. Determinar el valor de la Categoría para el SELECT del HTML (Mapeo de DB a UI)
    let categoryValue;
    if (product.type === 'MAIN' || product.type === 'PRODUCT') categoryValue = 'Producto'; // Aceptando 'PRODUCT' si lo usas
    else if (product.type === 'SERVICE') categoryValue = 'Servicio';
    else if (product.type === 'PACKAGE') categoryValue = 'Paquete';
    else categoryValue = 'Producto'; // Default

    // 2. Llenar los campos del modal
    document.getElementById('edit-product-id').value = product.producto_id; 
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-price').value = product.price;
    document.getElementById('edit-product-category').value = categoryValue; // Establece el valor mapeado

    // 3. Manejar el Producto Padre y la visibilidad
    const parentContainer = document.getElementById('edit-product-parent-container');
    const parentSelect = document.getElementById('edit-product-parent');
    
    if (product.type === 'PACKAGE') {
        parentContainer.classList.remove('hidden');
        parentSelect.value = product.parent_product || ''; // Selecciona el padre actual (Puede ser null)
    } else {
        parentContainer.classList.add('hidden');
        parentSelect.value = ''; // Limpiar la selección de padre si no es paquete
    }
    
    // 4. Establecer el listener de cambio para la Categoría (para ocultar/mostrar el Padre)
    // Se ejecuta cada vez que se abre el modal, asegurando el listener.
    document.getElementById('edit-product-category').onchange = function() {
        if (this.value === 'Paquete') {
            parentContainer.classList.remove('hidden');
        } else {
            parentContainer.classList.add('hidden');
        }
    };
    
    console.log(`✅ Datos del producto ID ${productId} precargados en el modal.`);
}
window.loadProductsData = async function() {
    console.log("Cargando productos...");
    
    if (!supabase) {
        console.error("Error: Supabase no inicializado en loadProductsData.");
        return;
    }
    
    try {
        const { data: products, error } = await supabase.from('productos').select('*');
        if (error) throw error;
        
        window.allProducts = (products || []).map(p => {
            const parsedProductId = parseInt(String(p.producto_id).trim(), 10);
            const cleanedParentProduct = p.parent_product ? String(p.parent_product).trim() : null;
            let finalParentId = cleanedParentProduct; // Se mantiene como string limpio

            // Limpieza rigurosa del tipo para la asignación booleana
            const cleanType = String(p.type || '').replace(/\s/g, '').toUpperCase();
            
            return {
                ...p,
                producto_id: isNaN(parsedProductId) ? p.producto_id : parsedProductId, 
                type: cleanType, // Mantendremos el campo type limpio si lo necesitas para otras cosas
                parent_product: finalParentId, 
                // ✅ NUEVA COLUMNA BOOLEANA: is_package
                is_package: cleanType === 'PACKAGE' 
            };
        });
        
        // 3. Post-procesamiento: Creación de Mapas
        // Se crean mapas para facilitar la búsqueda por ID y mejorar el rendimiento
        window.allProductsMap = window.allProducts.reduce((map, product) => {
            map[product.producto_id] = product;
            return map;
        }, {});
        
        console.log(`✅ Productos cargados con bandera is_package: ${window.allProducts.length} ítems.`);

    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
    return window.allProducts;
};
window.loadProducts = window.loadProductsData;

window.handleChangeProductForSale = function() {
    const mainSelect = document.getElementById('product-main-select');
    const subSelect = document.getElementById('subproduct-select');
    const priceInput = document.getElementById('product-unit-price');
    
    // ... (Verificaciones iniciales de elementos y data) ...
    if (!mainSelect || !subSelect || !priceInput || typeof window.allProducts === 'undefined') {
        console.error("Error: Elementos de venta o datos (window.allProducts) no encontrados.");
        return;
    }
    
    const productId = mainSelect.value;
    
    console.log(`[DIAG_CRÍTICO] window.allProducts.length: ${window.allProducts.length} | Producto ID: ${productId}`);
    
    if (!productId || productId === 'placeholder-option-value' || productId === '0') { 
        subSelect.innerHTML = '<option value="" selected>Sin Paquete</option>';
        subSelect.disabled = true; 
        priceInput.value = '0.00';
        return; 
    }

    if (window.allProducts.length < 5) {
        console.warn("ADVERTENCIA: Data de productos inestable o incompleta.");
        return; 
    }
    
    window.updatePriceField(productId);

    // =======================================================
    // 3. FILTRADO FINAL Y RÁPIDO (Usando el booleano)
    // =======================================================
    
    const subProducts = window.allProducts.filter(p => { 
        
        // ✅ FILTRO ROBUSTO: Compara el booleano 'is_package' con TRUE
        // Y compara la ID del padre (String) con la ID seleccionada (String)
        return (
            p.is_package === true && 
            String(p.parent_product) === productId
        );
    });

    console.log(`DIAGNÓSTICO DE FILTRO JS: ${subProducts.length} subproductos encontrados para ID: ${productId}`);

    // ... (El resto del código de renderizado es el mismo) ...
    if (subProducts.length > 0) {
        subSelect.disabled = false; 
        subSelect.innerHTML = '<option value="" disabled selected>Seleccione un Paquete</option>';
        
        subProducts.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.producto_id;
            const priceDisplay = (typeof window.formatCurrency === 'function') 
                ? window.formatCurrency(sub.price) 
                : `$${parseFloat(sub.price).toFixed(2)}`;
            option.textContent = `${sub.name} (${priceDisplay})`; 
            subSelect.appendChild(option);
        });
        console.log(`DIAGNÓSTICO DE RENDERIZADO: Se inyectaron ${subProducts.length} opciones.`);
    } else {
        subSelect.disabled = true; 
        subSelect.innerHTML = '<option value="" selected>Sin Paquete</option>';
    }
}

window.loadMainProductsForSaleSelect = function() {
    // 1. Obtener el selector principal
    const select = document.getElementById('product-main-select');
    if (!select || !window.allProducts) {
        console.error("No se encontró el selector principal o los datos de productos.");
        return;
    }

    // 2. Limpiar opciones antiguas e iniciar con placeholder
    select.innerHTML = '<option value="" disabled selected>Seleccione un producto...</option>';
    
    // 3. Filtrar y ordenar los productos principales (MAIN y SERVICE)
    const mainProducts = window.allProducts
        .filter(p => p.type === 'MAIN' || p.type === 'SERVICE')
        .sort((a, b) => a.name.localeCompare(b.name));

    // 4. Llenar el selector
    mainProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.producto_id;
        option.textContent = product.name;
        select.appendChild(option);
    });

    // 5. Conectar el listener de cambio (que dispara el filtro de subproductos)
    // Remover el listener antes de añadirlo previene duplicados.
    select.removeEventListener('change', window.handleChangeProductForSale); 
    select.addEventListener('change', window.handleChangeProductForSale);

    console.log(`✅ ${mainProducts.length} productos listados en el selector de venta.`);
};
window.loadMainProductsForSaleSelect = window.loadMainProductsForSaleSelect;
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

window.updatePriceField = function(productId) { // <-- ¡Añadir window!
    const priceInput = document.getElementById('product-unit-price');
    
    // Búsqueda robusta del producto (sea principal o paquete)
    const productData = allProducts.find(p => String(p.producto_id) === String(productId)); 
    
    if (priceInput) {
        if (productData && productData.price !== undefined) {
            // Usar parseFloat para mayor seguridad antes de toFixed
            priceInput.value = parseFloat(productData.price).toFixed(2); 
        } else {
            priceInput.value = '0.00';
        }
    }
}

// ====================================================================
// 6. LÓGICA DE VENTA MULTI-ITEM, Calular Saldo Pendiente y Proteger el Monto Pagado
// ====================================================================

function updatePaymentDebtStatus(grandTotalFromArgument) {
    
    // 1. DECLARACIÓN DE VARIABLES Y OBTENCIÓN DE ELEMENTOS
    const paidAmountInput = document.getElementById('paid-amount');
    const saldoInput = document.getElementById('display-saldo-pendiente'); 
    const paymentMethodSelect = document.getElementById('payment-method');
    const totalInput = document.getElementById('total-amount'); // Necesario para leer el total del DOM
    
    if (!paidAmountInput || !paymentMethodSelect || !saldoInput || !totalInput) {
        console.warn("Faltan elementos DOM para la actualización de Saldo.");
        return;
    }

    // 2. OBTENER EL TOTAL Y PAGADO DE FORMA ROBUSTA
    
    // Lee el Grand Total del DOM (por si la función se llama sin argumento)
    const cleanedTotalStr = cleanCurrencyString(totalInput.value); 
    const grandTotal = parseFloat(cleanedTotalStr) || 0; 
    
    // Lectura del Monto Pagado (limpiamos y parseamos)
    const paymentMethod = paymentMethodSelect.value;
    let paidAmountStr = cleanCurrencyString(paidAmountInput.value); 
    let currentPaidAmount = parseFloat(paidAmountStr) || 0; 

    // Si el campo está vacío, lo inicializamos para el usuario
    if (paidAmountInput.value.trim() === '') {
        paidAmountInput.value = '0.00';
    }
    
    // 3. LÓGICA DE PAGO Y SALDO PENDIENTE
    
    // Si el método seleccionado es 'Deuda' (indica venta fantasma/deuda total), el pago es 0
    if (paymentMethod === 'Deuda') {
        currentPaidAmount = 0;
    } 
    
    // Cálculo inicial
    let saldoPendiente = grandTotal - currentPaidAmount;
    
    // Ajuste de Límites: Si la venta total es 0 o hay sobrepago, el saldo no puede ser deuda
    if (grandTotal <= 0) {
        saldoPendiente = 0;
    } else if (saldoPendiente < 0) {
        // Si hay sobrepago (saldo negativo), el 'saldo pendiente' real es 0 (pero el valor negativo 
        // muestra el cambio que se debe devolver al cliente).
    }

    // 4. ACTUALIZACIÓN VISUAL DEL SALDO Y CLASES
    
    saldoInput.value = formatCurrency(saldoPendiente); 

    // Manejo visual de clases
    saldoInput.classList.remove('bg-red-100', 'bg-green-100', 'text-red-700', 'text-green-700'); 
    
    if (saldoPendiente > 0.01) {
        // Hay DEUDA pendiente (Color de advertencia/Rojo)
        saldoInput.classList.add('bg-red-100', 'text-red-700');
    } else { 
        // Saldo 0, Pago exacto, o Sobrepago (Color de éxito/verde)
        saldoInput.classList.add('bg-green-100', 'text-green-700');
    }
}

function calculateGrandTotal() {
    const grandTotal = currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0);
    console.log("Grand Total calculado:", grandTotal); // DEBE MOSTRAR EL TOTAL DE LA VENTA
    
    const totalInput = document.getElementById('total-amount');
    if (totalInput) totalInput.value = grandTotal.toFixed(2); 
    
    // ✅ LÍNEA AÑADIDA: Llama a la nueva función
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

window.updateSaleTableDisplay = function() {
    // 🛑 CRÍTICO: Asegurarse de que el ID es el correcto según tu HTML
    const container = document.getElementById('sale-items-table-body'); 
    
    if (!container) {
        console.error("Error FATAL: Elemento 'sale-items-table-body' no encontrado en el DOM.");
        return;
    }
    
    let htmlContent = ''; 

    if (currentSaleItems.length === 0) {
        htmlContent = '<tr><td colspan="5" class="px-4 py-2 text-center text-gray-500 italic">Agrega productos a la venta.</td></tr>';
    } else {
        currentSaleItems.forEach((item, index) => {
            let nameDisplay = item.name;
            if (!item.name.includes('(') && item.type && item.type.trim().toUpperCase() !== 'MAIN') {
                 nameDisplay = `${item.name} (${item.type})`;
            }
            
            htmlContent += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2 text-sm font-medium text-gray-900">${nameDisplay}</td>
                    <td class="px-4 py-2 text-sm text-gray-500 text-center">${item.quantity}</td> 
                    <td class="px-4 py-2 text-sm text-gray-500 cursor-pointer hover:bg-yellow-100 transition-colors"
                        id="price-${index}"
                        onclick="promptEditItemPrice(${index}, ${item.price})">
                        ${formatCurrency(item.price)}
                    </td>
                    <td class="px-4 py-2 text-sm font-bold">${formatCurrency(item.subtotal)}</td>
                    <td class="px-4 py-2 text-right text-sm font-medium">
                        <button type="button" onclick="removeItemFromSale(${index})" 
                                class="text-red-600 hover:text-red-900">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    container.innerHTML = htmlContent;
    calculateGrandTotal(); 
}

function promptEditItemPrice(index, currentPrice) {
    if (index < 0 || index >= currentSaleItems.length) {
        console.error("Índice de ítem de venta inválido.");
        return;
    }

    const item = currentSaleItems[index];
    
    // Usamos prompt para una interacción rápida.
    const newPriceStr = prompt(`Ingresa el nuevo precio para "${item.name}" (Actual: ${formatCurrency(currentPrice)}):`);

    if (newPriceStr === null || newPriceStr.trim() === "") {
        // Cancelar o entrada vacía
        return;
    }

    // Limpiamos la entrada y la convertimos a número
    const newPrice = parseFloat(newPriceStr.replace(',', '.'));

    if (isNaN(newPrice) || newPrice < 0) {
        alert("El precio ingresado no es válido o es negativo. No se realizaron cambios.");
        return;
    }

    // 🛑 ACEPTAMOS EL NUEVO PRECIO, INCLUYENDO CERO
    // Actualizamos el ítem en el array global
    item.price = newPrice;
    item.subtotal = newPrice * item.quantity;

    // Recalculamos y volvemos a renderizar la tabla para mostrar los cambios
    updateSaleTableDisplay();
    calculateGrandTotal();

    alert(`Precio de "${item.name}" actualizado a ${formatCurrency(newPrice)}.`);
}

window.removeItemFromSale = function(index) {
    if (index < 0 || index >= currentSaleItems.length) {
        console.error("Índice de ítem de venta inválido para eliminar.");
        return;
    }
    // ✅ MEJORA 1: Agregamos la confirmación para evitar errores
    const confirmation = confirm(`¿Estás seguro de que quieres eliminar "${currentSaleItems[index].name}" de la venta?`);
    if (confirmation) {
        currentSaleItems.splice(index, 1); // Elimina 1 elemento
        // Actualizamos la interfaz
        updateSaleTableDisplay();          // Recarga la tabla
        // ✅ MEJORA 2: CRÍTICO - Llamamos al cálculo total
        calculateGrandTotal();             
    }
}

// --- FUNCIÓN A: AGREGAR AL CARRITO (Botón +) ---
window.handleAddProductToSale = function(e) {
    if (e) e.preventDefault();

    const mainSelect = document.getElementById('product-main-select');
    const subSelect = document.getElementById('subproduct-select');
    const quantityInput = document.getElementById('product-quantity'); 
    const priceInput = document.getElementById('product-unit-price'); 

    const mainProductId = mainSelect?.value;
    const subProductId = subSelect?.value;
    const quantity = parseFloat(quantityInput?.value);

    // Prioridad al paquete, si no al principal
    let productIdToCharge = (subProductId && subProductId !== "") ? subProductId : mainProductId;
    
    const searchIdStr = String(productIdToCharge || '').trim();
    let productToCharge = window.allProducts.find(p => String(p.producto_id) === searchIdStr); 

    if (!productToCharge) {
        alert('Por favor, selecciona un Producto o Paquete válido.');
        return;
    }

    if (isNaN(quantity) || quantity <= 0) {
        alert('La cantidad debe ser mayor a cero.');
        return;
    }

    const priceStr = priceInput?.value;
    let price = parseFloat(priceStr?.replace(',', '.')) || 0; 
    
    if (price === 0 && productToCharge) { 
        price = parseFloat(productToCharge.price) || 0; 
    }
    
    const subtotal = quantity * price;

    // Nombre para el detalle: "Principal (Paquete)"
    let nameDisplay = productToCharge.name; 
    if (subProductId && subProductId !== "") {
        const mainProductData = window.allProducts.find(p => String(p.producto_id) === String(mainProductId));
        if (mainProductData) {
            nameDisplay = `${mainProductData.name} (${productToCharge.name})`; 
        }
    }

    const newItem = {
        product_id: parseInt(productIdToCharge, 10), 
        name: nameDisplay, 
        quantity: quantity,
        price: price, 
        subtotal: subtotal,
        type: productToCharge.type || null, 
    };

    const searchIdNum = parseInt(productIdToCharge, 10);
    const existingIndex = currentSaleItems.findIndex(item => item.product_id === searchIdNum);

    if (existingIndex > -1) { 
        currentSaleItems[existingIndex].quantity += quantity;
        currentSaleItems[existingIndex].subtotal += subtotal;
    } else {
        currentSaleItems.push(newItem); 
    }
    
    window.updateSaleTableDisplay(); 
    calculateGrandTotal(); 

    // Limpieza
    mainSelect.value = '';
    subSelect.innerHTML = '<option value="" selected>Sin Paquete</option>';
    subSelect.disabled = true;
    quantityInput.value = '1';
    priceInput.value = '0.00';
};

// --- FUNCIÓN B: REGISTRAR VENTA (Botón Verde) ---
window.handleNewSale = async function(e) {
    if (e) e.preventDefault();
    
    // 1. Obtención de datos del formulario
    const client_id = document.getElementById('client-select')?.value;
    const payment_method = document.getElementById('payment-method')?.value ?? 'Efectivo';
    const sale_description = document.getElementById('sale-details')?.value.trim() ?? null;
    const paid_amount_str = document.getElementById('paid-amount')?.value.replace(/[^\d.-]/g, '') ?? '0'; 
    
    let paid_amount = parseFloat(paid_amount_str);
    const total_amount = currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0); 
    
    if (payment_method === 'Deuda') paid_amount = 0;
    
    let final_paid_amount = (paid_amount > total_amount) ? total_amount : paid_amount;
    let final_saldo_pendiente = total_amount - final_paid_amount; 

    // Validaciones
    if (!client_id) { alert('Selecciona un cliente.'); return; }
    if (currentSaleItems.length === 0) { alert('El carrito está vacío.'); return; }

    // Referencia al botón de registro (usando la clase del nuevo diseño)
    const submitBtn = e.target.querySelector('button[onclick*="handleNewSale"]') || document.querySelector('#new-sale-modal button.bg-emerald-600');
    
    if (submitBtn) { 
        submitBtn.disabled = true; 
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...'; 
    }

    try {
        // --- PROCESO EN SUPABASE (Mantenemos tu lógica intacta) ---
        const { data: saleData, error: saleError } = await supabase
            .from('ventas')
            .insert([{
                client_id: client_id,
                total_amount: total_amount, 
                paid_amount: final_paid_amount, 
                saldo_pendiente: final_saldo_pendiente, 
                metodo_pago: payment_method,
                description: sale_description,
            }])
            .select('venta_id'); 

        if (saleError) throw saleError;
        const new_venta_id = saleData[0].venta_id;

        const detailsToInsert = currentSaleItems.map(item => ({
            venta_id: new_venta_id, 
            product_id: item.product_id,
            name: item.name || 'Producto', 
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
        }));
        
        const { error: dError } = await supabase.from('detalle_ventas').insert(detailsToInsert);
        if (dError) throw dError;

        if (final_paid_amount > 0) {
            await supabase.from('pagos').insert([{
                venta_id: new_venta_id,
                amount: final_paid_amount,
                client_id: client_id,
                metodo_pago: payment_method,
                type: 'INICIAL'
            }]);
        }

        if (final_saldo_pendiente > 0) {
            const { data: c } = await supabase
                .from('clientes')
                .select('deuda_total')
                .eq('client_id', client_id)
                .single();
            
            await supabase
                .from('clientes')
                .update({ deuda_total: (c?.deuda_total || 0) + final_saldo_pendiente })
                .eq('client_id', client_id);
        }

        // --- ÉXITO Y REINICIO DE INTERFAZ "CLEAN" ---
        alert('Venta registrada con éxito');
        closeModal('new-sale-modal');

        // 1. Limpieza de variables globales
        currentSaleItems = [];

        // 2. Reset del formulario y campos de texto grandes (Total/Monto/Saldo)
        document.getElementById('new-sale-form')?.reset();
        
        // Forzamos el valor visual a 0.00 para evitar que queden residuos del diseño anterior
        const displays = ['total-amount', 'paid-amount', 'display-saldo-pendiente'];
        displays.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "0.00";
        });

        // 3. Actualizar tablas
        if (typeof window.updateSaleTableDisplay === 'function') window.updateSaleTableDisplay();

        // 4. Sincronización de datos
        if (typeof window.loadSalesData === 'function') {
            await window.loadSalesData();
            if (typeof window.handleFilterSales === 'function') window.handleFilterSales();
        }
        if (typeof window.loadDashboardData === 'function') await window.loadDashboardData();
        if (typeof window.loadClientsTable === 'function') await window.loadClientsTable('gestion');

    } catch (err) {
        console.error('Error al procesar venta:', err);
        alert('Error: ' + err.message);
    } finally {
        if (submitBtn) { 
            submitBtn.disabled = false; 
            submitBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Registrar Venta'; 
        }
    }
};

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

//Funcion para el producto padre
window.refreshAllProductSelects = function() {
    // 1. Selector en el modal de NUEVA VENTA
    const saleProductSelect = document.getElementById('sale-product-select'); 
    // 2. Selectores en el modal de PRODUCTOS (Padres)
    const newProductParentSelect = document.getElementById('new-product-parent-select');
    const editProductParentSelect = document.getElementById('edit-product-parent');

    const products = window.allProducts || [];

    // Función auxiliar para llenar un select
    const fillSelect = (select, items, filterPackage = false) => {
        if (!select) return;
        const currentVal = select.value; // Guardar valor seleccionado actual
        select.innerHTML = '<option value="">-- Seleccionar --</option>';
        
        items.forEach(p => {
            // Si filterPackage es true, solo mostramos productos individuales (para ser padres)
            if (filterPackage && p.type === 'PACKAGE') return;
            
            const opt = document.createElement('option');
            opt.value = p.producto_id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
        select.value = currentVal; // Intentar restaurar el valor
    };

    // Llenar cada uno
    fillSelect(saleProductSelect, products);
    fillSelect(newProductParentSelect, products, true);
    fillSelect(editProductParentSelect, products, true);
};

// ====================================================================
// 7. MANEJO DEL PAGO Y LA DEUDA 
// ====================================================================
async function registrarAbonoCascada(clientId, montoAbonar, metodoPago) {
    try {
        // 1. Obtener todas las ventas con deuda de ese cliente (ordenadas por la más antigua)
        const { data: ventasPendientes, error } = await supabase
            .from('ventas')
            .select('venta_id, saldo_pendiente')
            .eq('client_id', clientId)
            .gt('saldo_pendiente', 0)
            .order('created_at', { ascending: true });

        if (error) throw error;

        let saldoRestante = montoAbonar;

        for (let venta of ventasPendientes) {
            if (saldoRestante <= 0) break;

            let pagoParaEstaVenta = Math.min(saldoRestante, venta.saldo_pendiente);
            let nuevoSaldoVenta = venta.saldo_pendiente - pagoParaEstaVenta;

            // 2. Actualizar la venta individual
            await supabase
                .from('ventas')
                .update({ 
                    saldo_pendiente: nuevoSaldoVenta,
                    paid_amount: (venta.paid_amount || 0) + pagoParaEstaVenta 
                })
                .eq('venta_id', venta.venta_id);

            // 3. Registrar el abono en la tabla de abonos/pagos
            await supabase
                .from('abonos') // O tu tabla de transacciones
                .insert({
                    client_id: clientId,
                    venta_id: venta.venta_id,
                    monto_abono: pagoParaEstaVenta,
                    metodo_pago: metodoPago,
                    fecha_abono: new Date().toISOString()
                });

            saldoRestante -= pagoParaEstaVenta;
        }

        alert('Abono procesado en cascada correctamente.');
        loadDebts(); // Recargar la tabla principal
    } catch (err) {
        console.error("Error en abono FIFO:", err);
    }
}

async function actualizarTarjetasDeuda() {
    try {
        // Consultamos la tabla 'ventas'
        const { data: deudas, error } = await supabase
            .from('ventas')
            .select('saldo_pendiente')
            .gt('saldo_pendiente', 0); // Filtramos solo las que tienen saldo mayor a 0

        if (error) throw error;

        let sumaTotal = 0;
        let maxSaldo = 0;
        let cantidadVentasConDeuda = deudas ? deudas.length : 0;

        if (deudas) {
            deudas.forEach(v => {
                const monto = Number(v.saldo_pendiente) || 0;
                sumaTotal += monto;
                if (monto > maxSaldo) maxSaldo = monto;
            });
        }

        const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

        // Actualizamos los IDs de las tarjetas que pusimos en el HTML
        if (document.getElementById('total-deuda-global')) 
            document.getElementById('total-deuda-global').innerText = fmt.format(sumaTotal);
        
        if (document.getElementById('total-clientes-deuda')) 
            document.getElementById('total-clientes-deuda').innerText = cantidadVentasConDeuda;
        
        if (document.getElementById('max-deuda-individual')) 
            document.getElementById('max-deuda-individual').innerText = fmt.format(maxSaldo);

    } catch (err) {
        console.error("Error al actualizar tarjetas de deuda:", err.message);
    }
}

function cleanCurrencyString(str) {
    if (typeof str !== 'string') return 0;
    // Elimina caracteres no numéricos, excepto el punto decimal y el signo menos.
    const cleaned = str.replace(/[^\d.-]/g, ''); 
    return cleaned;
}
//Ventas a credito
window.getClientSalesSummary = async function(clientId) {
    if (!supabase) return { totalVentas: 0, deudaNeta: 0 };
    
    try {
        // 1. Obtener transacciones desde tu vista consolidada
        const { data: transactions, error } = await supabase
            .from('transacciones_deuda') 
            .select('type, amount')
            .eq('client_id', clientId);

        if (error) throw error;

        let totalVentas = 0; 
        let deudaNeta = 0;   

        (transactions || []).forEach(t => {
            // Convertimos a número por si la base de datos devuelve texto
            const monto = parseFloat(t.amount || 0);
            const isCharge = String(t.type).toLowerCase().includes('cargo');
            
            if (isCharge) {
                totalVentas += monto;
                deudaNeta += monto;
            } else {
                // Se resta abono_posterior, pago_inicial, etc.
                deudaNeta -= monto;
            }
        });

        // Limpieza de decimales (evita el error de 0.000000001 en JS)
        return { 
            totalVentas: Math.max(0, totalVentas), 
            deudaNeta: Math.max(0, deudaNeta) 
        };

    } catch (e) {
        console.error(`❌ Error en resumen del cliente ${clientId}:`, e);
        return { totalVentas: 0, deudaNeta: 0 };
    }
};

//Abono boton
window.handleAbonoSubmit = async function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const form = document.getElementById('abono-client-form');
    const submitBtn = form?.querySelector('button[type="submit"]');

    const clientId = document.getElementById('abono-client-id')?.value;
    const amount = parseFloat(document.getElementById('abono-amount')?.value);
    const methodSelect = document.getElementById('payment-method-abono');
    const method = methodSelect ? methodSelect.value : "";

    // Validaciones
    if (!clientId) return alert("⚠️ Error: Cliente no identificado.");
    if (isNaN(amount) || amount <= 0) return alert("⚠️ Ingrese un monto mayor a 0.");
    if (!method || method === "" || method === "seleccionar") return alert("⚠️ Selecciona un Método de Pago.");

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando Cascada...';
    }

    try {
        // 1. Ejecutamos el proceso en el servidor (RPC)
        const { error } = await supabase.rpc('registrar_abono_cascada', {
            p_client_id: parseInt(clientId),
            p_amount: amount,
            p_metodo_pago: method
        });

        if (error) throw error;

        // 2. MOSTRAR DISTRIBUCIÓN: Consultamos los últimos pagos registrados para este cliente
        // Esto llenará la tablita que añadimos al HTML
        const { data: pagosRecientes, error: errorPagos } = await supabase
            .from('pagos')
            .select('venta_id, amount')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
            .limit(5); // Traemos los últimos 5 para mostrar el desglose

        const logContainer = document.getElementById('log-container-fifo');
        const logBody = document.getElementById('recent-payments-log');
        
        if (logBody && pagosRecientes) {
            if (logContainer) logContainer.classList.remove('hidden');
            logBody.innerHTML = pagosRecientes.map(p => `
                <tr class="border-b border-white/5">
                    <td class="py-2 text-gray-500 font-mono text-[10px]">Venta #${p.venta_id}</td>
                    <td class="py-2 text-right text-green-500 font-bold">-$${p.amount.toFixed(2)}</td>
                </tr>
            `).join('');
        }

        // 3. ÉXITO
        alert(`✅ Abono de ${formatCurrency(amount)} aplicado correctamente.`);
        
        // Esperamos 2 segundos para que el usuario vea la distribución en el log
        setTimeout(async () => {
            window.closeModal('abono-client-modal');
            form.reset();
            if (logContainer) logContainer.classList.add('hidden');

            // 4. ACTUALIZACIÓN SILENCIOSA DE VISTAS
            if (typeof window.loadDebts === 'function') await window.loadDebts();
            if (typeof window.loadClientsTable === 'function') await window.loadClientsTable('gestion');
            if (typeof window.loadDashboardData === 'function') await window.loadDashboardData();
            
            // Si el detalle de venta estaba abierto, refrescarlo
            const detailModal = document.getElementById('modal-detail-sale');
            if (detailModal && !detailModal.classList.contains('hidden')) {
                const currentVentaId = document.getElementById('detail-sale-id')?.textContent;
                if (currentVentaId) await window.handleViewSaleDetails(currentVentaId);
            }
        }, 2000);

    } catch (err) {
        console.error("❌ Error:", err);
        alert("Error técnico: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirmar Abono';
        }
    }
};

// ====================================================================
// 8. MANEJO DE FORMULARIO DE NUEVA VENTA (TRANSACCIONAL)
// ====================================================================

window.handleNewSale = async function(e) {
    e.preventDefault();
    
    // --- 1. CAPTURAR Y VALIDAR DATOS INICIALES ---
    const client_id = document.getElementById('client-select')?.value ?? null;
    const payment_method = document.getElementById('payment-method')?.value ?? 'Efectivo';
    const sale_description = document.getElementById('sale-details')?.value.trim() ?? null;
    
    const paid_amount_str = document.getElementById('paid-amount')?.value.replace(/[^\d.-]/g, '') ?? '0'; 
    let paid_amount = parseFloat(paid_amount_str);
    
    const total_amount = currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0); 
    
    if (payment_method === 'Deuda') {
        paid_amount = 0;
    }
    
    let final_paid_amount = paid_amount;
    let final_saldo_pendiente = total_amount - paid_amount; 

    // Validaciones de UI
    if (!client_id) { alert('Por favor, selecciona un cliente.'); return; }
    if (currentSaleItems.length === 0) { alert('Debes agregar al menos un producto a la venta.'); return; }
    if (total_amount < 0) { alert('El total de la venta no puede ser negativo.'); return; }
    
    if (total_amount < 0.01) {
        final_paid_amount = 0;
        final_saldo_pendiente = 0;
    } else if (final_saldo_pendiente < 0) {
        final_paid_amount = total_amount; 
        final_saldo_pendiente = 0; 
    }
    
    if (final_paid_amount < 0 || final_paid_amount > total_amount) {
        alert('El monto pagado es inválido.'); return;
    }

    if (final_saldo_pendiente > 0.01 && !confirm(`¡Atención! Hay un saldo pendiente de ${formatCurrency(final_saldo_pendiente)}. ¿Deseas continuar?`)) {
        return;
    }

    // Validación de IDs en el carrito
    const itemWithoutValidId = currentSaleItems.find(item => 
        !item.product_id || isNaN(item.product_id) || parseInt(item.product_id, 10) === 0
    );
    
    if (itemWithoutValidId) {
        alert(`Error: El ítem "${itemWithoutValidId.name}" tiene un ID inválido.`); 
        return; 
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando Venta...';
    }

    let new_venta_id = null;
    try {
        // 2.1. REGISTRAR VENTA (Tabla 'ventas')
        const { data: saleData, error: saleError } = await supabase
            .from('ventas')
            .insert([{
                client_id: client_id,
                total_amount: total_amount, 
                paid_amount: final_paid_amount, 
                saldo_pendiente: final_saldo_pendiente, 
                metodo_pago: payment_method,
                description: sale_description,
            }])
            .select('venta_id'); 

        if (saleError || !saleData || saleData.length === 0) {
            throw new Error(`Error al registrar venta principal: ${saleError?.message}`);
        }

        new_venta_id = saleData[0].venta_id;

        // 2.2. REGISTRAR DETALLE DE VENTA (Tabla 'detalle_ventas')
        // ✅ CORRECCIÓN: Se agrega 'name' para evitar el error de restricción NOT NULL
        const detailsToInsert = currentSaleItems.map(item => ({
            venta_id: new_venta_id, 
            product_id: parseInt(item.product_id, 10),
            name: item.name || 'Producto', // Nombre del producto/paquete
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
        }));
        
        const { error: detailError } = await supabase
            .from('detalle_ventas') 
            .insert(detailsToInsert);

        if (detailError) {
            console.error('🛑 ERROR BD - DETALLES FALLIDOS:', detailError);
            throw new Error(`BD Falló al insertar detalles. Mensaje: ${detailError.message}`);
        }

        // 2.3. REGISTRAR PAGO (Tabla 'pagos')
        if (final_paid_amount > 0) { 
            const { error: paymentError } = await supabase
                .from('pagos')
                .insert([{
                    venta_id: new_venta_id,
                    amount: final_paid_amount,
                    client_id: client_id,
                    metodo_pago: payment_method,
                    type: 'INICIAL',
                }]);

            if (paymentError) alert(`Advertencia: El pago falló. ${paymentError.message}`);
        }
        
        // 2.4. ACTUALIZAR DEUDA DEL CLIENTE
        if (final_saldo_pendiente > 0) {
            const { data: clientData, error: clientFetchError } = await supabase
                .from('clientes')
                .select('deuda_total')
                .eq('client_id', client_id)
                .single();

            if (!clientFetchError && clientData) {
                const newClientDebt = (clientData.deuda_total || 0) + final_saldo_pendiente;
                await supabase
                    .from('clientes')
                    .update({ deuda_total: newClientDebt })
                    .eq('client_id', client_id);
            }
        }
        
        // --- 3. FINALIZACIÓN Y LIMPIEZA ---
        closeModal('new-sale-modal'); 
        window.currentSaleItems = []; 
        window.updateSaleTableDisplay(); 
        document.getElementById('new-sale-form')?.reset(); // ✅ Esto siempre funcionará
        
        await loadDashboardData(); 
        await loadClientsTable('gestion'); 

        if (window.showTicketPreviewModal) {
            showTicketPreviewModal(new_venta_id);
        } else {
             alert(`Venta #${new_venta_id} registrada con éxito.`);
        }
        
    } catch (error) {
        console.error('Error FATAL:', error);
        alert('Error: ' + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Finalizar Venta';
        }
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

// ====================================================================
// FUNCIÓN PARA CARGAR MÉTRICAS DEL DASHBOARD
// ====================================================================
window.loadDashboardMetrics = async function() {
    if (!supabase) {
        console.error("Supabase no está inicializado para cargar métricas.");
        return;
    }

    try {
        // A. CALCULAR DEUDA PENDIENTE TOTAL (SUM(saldo_pendiente) > 0.01)
        const { data: debtData, error: debtError } = await supabase
            .from('ventas')
            .select('saldo_pendiente')
            .gt('saldo_pendiente', 0.01); // Selecciona solo ventas con deuda activa

        if (debtError) throw debtError;

        let totalDebt = 0;
        if (debtData && debtData.length > 0) {
            // Suma todos los saldos pendientes
            totalDebt = debtData.reduce((sum, sale) => sum + parseFloat(sale.saldo_pendiente || 0), 0);
        }

        // B. CALCULAR VENTA HISTÓRICA TOTAL (SUM(total_amount))
        // Usamos una función de agregación directa (sum) para mayor eficiencia
        const { data: salesData, error: salesError } = await supabase
            .from('ventas')
            .select('total_amount')
            .not('total_amount', 'is', null);

        if (salesError) throw salesError;

        let historicalTotalSales = 0;
        if (salesData && salesData.length > 0) {
            historicalTotalSales = salesData.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
        }
        
        // 3. INYECTAR EN EL DOM (usando los IDs que proporcionaste)
        
        // Deuda Pendiente
        const debtElement = document.getElementById('total-debt');
        if (debtElement) {
            debtElement.textContent = formatCurrency(totalDebt);
        }

        // Total Histórico de Ventas
        const salesElement = document.getElementById('historical-total-sales');
        if (salesElement) {
            salesElement.textContent = formatCurrency(historicalTotalSales);
        }

    } catch (e) {
        console.error('Error al cargar métricas del dashboard:', e);
    }
}

/**
 * ESTADO DE CUENTA: CARGA DE DATOS, RENDERIZADO Y PREPARACIÓN DE IMPRESIÓN
 * Esta función unifica tu lógica original con el sistema de reporte.
 */
window.handleViewClientDebt = async function(clientId) {
    if (!supabase) {
        console.error("Supabase no está inicializado.");
        alert("Error de conexión a la base de datos.");
        return;
    }
    
    window.viewingClientId = clientId;
    
    try {
        // 1. BÚSQUEDA DEL CLIENTE (Tu lógica robusta original)
        let client = (window.allClients || []).find(c => String(c.client_id) === String(clientId));
        
        if (!client) {
            const { data: retryClient } = await supabase.from('clientes').select('name').eq('client_id', clientId).single();
            if (!retryClient) {
                alert("Error: No se encontró la información del cliente.");
                return;
            }
            client = retryClient;
        }

        // 2. OBTENER VENTAS Y PAGOS
        const { data: salesData, error: salesError } = await supabase
            .from('ventas')
            .select(`venta_id, total_amount, paid_amount, created_at, description, detalle_ventas ( name )`)
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });

        if (salesError) throw salesError;
        const sales = salesData || []; 

        const { data: paymentsData, error: paymentsError } = await supabase
            .from('pagos')
            .select(`venta_id, amount, metodo_pago, created_at`)
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });

        if (paymentsError) throw paymentsError;
        const payments = paymentsData || []; 

        // 3. UNIFICAR Y NORMALIZAR TRANSACCIONES
        let transactions = [];

        sales.forEach(sale => {
            const productNames = sale.detalle_ventas?.map(d => d.name).join(', ') || 'Venta General';
            let transactionDescription = `Venta: ${productNames}`;
            if (sale.description) transactionDescription += ` — ${sale.description.trim()}`; 

            transactions.push({
                date: new Date(sale.created_at),
                type: 'cargo_venta',
                description: transactionDescription,
                amount: sale.total_amount,
                venta_id: sale.venta_id,
                order: 1 
            });
        });

        payments.forEach(payment => {
            let description = `Abono a Deuda (${payment.metodo_pago})`;
            if (payment.venta_id) {
                const sale = sales.find(s => s.venta_id === payment.venta_id);
                if (sale) {
                    const productNames = sale.detalle_ventas?.map(d => d.name).join(', ') || 'Venta General';
                    const timeDiff = Math.abs(new Date(sale.created_at) - new Date(payment.created_at)); 
                    description = timeDiff < 60000 
                        ? `Pago Inicial (${payment.metodo_pago}) - Venta: "${productNames}"`
                        : `Abono (${payment.metodo_pago}) - Venta: "${productNames}"`;
                }
            }

            transactions.push({
                date: new Date(payment.created_at),
                type: 'abono',
                description: description,
                amount: payment.amount, 
                venta_id: payment.venta_id,
                order: 2
            });
        });

        // 4. ORDENAR Y CALCULAR SALDO DINÁMICO
        transactions.sort((a, b) => a.date - b.date || a.order - b.order);

        document.getElementById('client-report-name').textContent = client.name;
        const historyBody = document.getElementById('client-transactions-body'); 
        let historyHTML = ""; 
        let currentRunningBalance = 0; 

        transactions.forEach(t => {
            if (t.type === 'cargo_venta') currentRunningBalance += t.amount;
            else currentRunningBalance -= t.amount;

            const balanceClass = currentRunningBalance > 0.01 ? 'text-red-600' : 'text-green-600';
            const amountClass = t.type === 'cargo_venta' ? 'text-red-600' : 'text-green-600';

            historyHTML += `
                <tr class="hover:bg-gray-50 text-sm border-b">
                    <td class="px-3 py-3 text-gray-500">${new Date(t.date).toLocaleDateString()}</td>
                    <td class="px-3 py-3 text-gray-800">${t.description}</td>
                    <td class="px-3 py-3 text-right font-bold ${amountClass}">${formatCurrency(t.amount)}</td>
                    <td class="px-3 py-3 text-right font-bold ${balanceClass}">${formatCurrency(Math.abs(currentRunningBalance))}</td>
                </tr>`;
        });
        
        historyBody.innerHTML = historyHTML;
        
        // 5. ACTUALIZAR TOTALES Y "MOCHILA" DE IMPRESIÓN
        const totalDebtValue = Math.abs(currentRunningBalance);
        const totalDebtElement = document.getElementById('client-report-total-debt');
        totalDebtElement.textContent = formatCurrency(totalDebtValue);
        totalDebtElement.className = currentRunningBalance > 0.01 ? 'text-red-600 font-bold text-xl' : 'text-green-600 font-bold text-xl';

        // Guardar para la función de impresión
        window.currentClientDataForPrint = {
            nombre: client.name,
            totalDeuda: totalDebtValue,
            transaccionesHTML: historyHTML
        };

        openModal('modal-client-debt-report'); 
        
    } catch (e) {
        console.error('Error al cargar la deuda:', e);
        alert('Error al cargar el historial.');
    }
}

/**
 * FUNCIÓN PARA LANZAR EL MODAL DE ABONO DESDE EL REPORTE
 */
window.prepararAbonoDesdeReporte = function() {
    // Usamos la variable global que definimos en handleViewClientDebt
    const clientId = window.viewingClientId; 
    
    if (!clientId) {
        alert("No se pudo identificar al cliente para el abono.");
        return;
    }

    // Llamamos a la función que ya tienes para preparar el modal de abono
    // Esta función se encarga de llenar el nombre, deuda y ID en el modal pequeño
    if (typeof window.handleAbonoClick === 'function') {
        window.handleAbonoClick(clientId);
    } else {
        console.error("La función handleAbonoClick no está definida.");
    }
};

window.handleAbonoClick = function(clientId) {
    // Buscamos al cliente en el array global que ya tienes
    const client = (window.allClients || []).find(c => String(c.client_id) === String(clientId));

    if (!client) {
        alert('Cliente no encontrado.');
        return;
    }

    // Llenamos el modal (IDs del HTML que me pasaste)
    const idInput = document.getElementById('abono-client-id');
    const nameDisplay = document.getElementById('abono-client-name-display');
    const debtDisplay = document.getElementById('abono-current-debt');
    const logContainer = document.getElementById('log-container-fifo');

    if (idInput) idInput.value = clientId;
    if (nameDisplay) nameDisplay.textContent = client.name;
    if (debtDisplay) {
        // En tu DB parece ser deuda_total según tus snippets
        const deuda = client.deuda_total || 0;
        debtDisplay.textContent = `$${parseFloat(deuda).toFixed(2)}`;
    }

    // Limpiar el log de pagos anteriores y abrir
    if (logContainer) logContainer.classList.add('hidden');
    openModal('abono-client-modal');
};

window.actualizarMetricasDeudas = function(clientes) {
    // Si 'clientes' no llega, usamos un array vacío para que .reduce no falle
    const data = clientes || [];
    
    console.log("Calculando métricas con:", data.length, "clientes");

    // Calculamos el total sumando el campo deuda_total (o total_debt según tu DB)
    const totalDeudaGlobal = data.reduce((acc, c) => {
        const monto = parseFloat(c.deuda_total || c.total_debt || 0);
        return acc + monto;
    }, 0);

    const clientesConDeuda = data.filter(c => {
        const monto = parseFloat(c.deuda_total || c.total_debt || 0);
        return monto > 0;
    }).length;

    // Actualizamos el DOM
    const metricTotal = document.getElementById('total-deuda-global');
    const metricCount = document.getElementById('total-clientes-deuda');

    if (metricTotal) metricTotal.textContent = `$${totalDeudaGlobal.toFixed(2)}`;
    if (metricCount) metricCount.textContent = clientesConDeuda;
};

/**
 * GENERACIÓN DE PDF: ESTADO DE CUENTA PROFESIONAL
 */
window.imprimirEstadoCuenta = function() {
    const data = window.currentClientDataForPrint;
    if (!data) return alert("Cargue primero el reporte del cliente.");

    const colorOxido = "#8B4513";
    const htmlContent = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: letter; margin: 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; }
                .header { border-bottom: 4px solid ${colorOxido}; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                .resumen { background: #fdf8f5; border: 1px solid ${colorOxido}44; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th { background: #f4f4f4; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold; text-transform: uppercase; }
                td { padding: 8px 10px; border-bottom: 1px solid #eee; }
                .text-right { text-align: right; }
                /* Colores dinámicos para el PDF */
                .text-red { color: #dc2626; font-weight: bold; }
                .text-green { color: #16a34a; font-weight: bold; }
                .text-bold { font-weight: bold; color: #000; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 style="margin:0; color:${colorOxido}; font-size: 24px;">CREATIVA CORTES CNC</h1>
                    <p style="margin:0; font-size: 12px; font-weight: bold;">ESTADO DE CUENTA PROFESIONAL</p>
                </div>
                <div style="text-align:right;">
                    <p style="margin:0; font-size: 11px;">Fecha de emisión:</p>
                    <p style="margin:0; font-size: 14px; font-weight: bold;">${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div class="resumen">
                <table style="width: 100%; background: none; border: none;">
                    <tr>
                        <td style="border:none; padding:0;">
                            <p style="margin:0; color:#666; font-size: 10px;">CLIENTE</p>
                            <p style="margin:0; font-size: 18px; font-weight: bold;">${data.nombre.toUpperCase()}</p>
                        </td>
                        <td style="border:none; padding:0; text-align: right;">
                            <p style="margin:0; color:#666; font-size: 10px;">SALDO TOTAL PENDIENTE</p>
                            <p style="margin:0; font-size: 26px; font-weight: 900; color:${colorOxido};">${formatCurrency(data.totalDeuda)}</p>
                        </td>
                    </tr>
                </table>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width:12%">FECHA</th>
                        <th style="width:58%">DESCRIPCIÓN / CONCEPTO</th>
                        <th style="width:15%" class="text-right">MOVIMIENTO</th>
                        <th style="width:15%" class="text-right">SALDO ACUM.</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.transaccionesHTML.replace(/text-red-600/g, 'text-red').replace(/text-green-600/g, 'text-green')}
                </tbody>
            </table>

            <div style="margin-top:40px; text-align:center; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:10px;">
                Taller Creativa Cortes CNC | Valladolid, Yucatán <br>
                Este documento es un comprobante informativo de saldos y movimientos.
            </div>

            <script>
                window.onload = () => { 
                    window.print(); 
                    setTimeout(() => window.close(), 500); 
                }
            </script>
        </body>
        </html>`;

    const pWin = window.open('', '_blank');
    pWin.document.write(htmlContent);
    pWin.document.close();
};

window.generarComprobanteAbono = function(datos) {
    const colorOxido = '#b45309'; // El color ámbar/óxido de tu marca
    const fecha = new Date().toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const numRecibo = Math.floor(Math.random() * 900000 + 100000);

    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        alert("⚠️ El navegador bloqueó la ventana emergente. Por favor, permítelas para ver el comprobante.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Recibo de Abono - ${datos.cliente}</title>
            <style>
                @page { size: letter; margin: 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; font-size: 12px; background-color: #f4f4f4; padding: 20px; }
                
                .actions-bar { 
                    max-width: 210mm; margin: 0 auto 10px auto; 
                    display: flex; justify-content: flex-end; 
                }
                .btn-print { 
                    background: ${colorOxido}; color: white; border: none; padding: 10px 20px; 
                    border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;
                }

                .sheet { 
                    background: white; width: 210mm; min-height: 140mm; 
                    margin: 0 auto; padding: 15mm; box-shadow: 0 0 10px rgba(0,0,0,0.2);
                    border-radius: 5px; position: relative; box-sizing: border-box;
                }

                .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${colorOxido}; padding-bottom: 10px; margin-bottom: 15px; }
                
                .logo-c { 
                    width:45px; height:45px; background:${colorOxido}; color:white; 
                    display:flex; align-items:center; justify-content:center; 
                    font-weight:bold; font-size:24px; border-radius:4px; margin-right:12px; 
                }

                .data-grid { display: grid; grid-template-columns: 1fr 1fr; background: #fdf8f5; padding: 12px; margin-bottom: 15px; border: 1px solid #eee; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: ${colorOxido}; color: white; padding: 10px; font-size: 11px; text-transform: uppercase; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }

                .totals-box { width: 280px; margin-left: auto; margin-top: 20px; background: #fdf8f5; padding: 15px; border: 1px solid #eee; border-radius: 4px; }
                
                .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }

                @media print {
                    body { background: white; padding: 0; }
                    .sheet { box-shadow: none; width: 100%; margin: 0; padding: 10mm; }
                    .actions-bar { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="actions-bar">
                <button class="btn-print" onclick="window.print()">🖨️ Imprimir o Guardar PDF</button>
            </div>

            <div class="sheet">
                <div class="header">
                    <div style="display:flex; align-items:center;">
                        <div class="logo-c">C</div>
                        <div>
                            <h2 style="margin:0; color:${colorOxido}; font-size:18px;">CREATIVA CORTES CNC</h2>
                            <p style="margin:0; font-size:9px; letter-spacing: 1px;">DISEÑO • CORTE •</p>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <h1 style="margin:0; color:${colorOxido}; font-size:18px;">RECIBO DE ABONO #${numRecibo}</h1>
                        <p style="margin:0; font-size:11px;">${fecha}</p>
                    </div>
                </div>

                <div class="data-grid">
                    <div>
                        <strong>CLIENTE:</strong> ${datos.cliente}<br>
                        <strong>MÉTODO DE PAGO:</strong> ${datos.metodo}
                    </div>
                    <div style="text-align:right;">
                        <strong>NOTA</strong> DE ABONO
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 70%;">Descripción</th>
                            <th style="width: 30%; text-align: right;">Monto Abonado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.distribucion.map(item => `
                            <tr>
                                <td>Abono aplicado a la Venta Folio #${item.id}</td>
                                <td style="text-align: right; font-weight: bold;">$${item.monto.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals-box">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px;">
                        <span>Monto Recibido:</span> 
                        <span style="font-weight:bold; color:green;">$${datos.montoTotal.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:${colorOxido}; border-top:2px solid ${colorOxido}; margin-top:10px; font-size:16px; padding-top:10px;">
                        <span>SALDO PENDIENTE:</span> 
                        <span>$${datos.deudaRestante.toFixed(2)}</span>
                    </div>
                </div>

                <div class="footer">
                    📱 WhatsApp: 985 100 1141 | 📍 Calle 33 x 48 y 46 Candelaria, Valladolid, Yucatán | Creativa Cortes CNC<br>
                    <small style="display:block; margin-top:5px;">Este recibo es un comprobante de abono a cuenta. Conserve para cualquier aclaración.</small>
                </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
};

//Detalles de la venta
window.handleViewSaleDetails = async function(venta_id) {
    try {
        // 1. Obtener datos de Supabase
        const { data: venta, error: vError } = await supabase
            .from('ventas')
            .select('*')
            .eq('venta_id', parseInt(venta_id))
            .maybeSingle();

        if (vError) throw vError;

        const [prodRes, pagosRes] = await Promise.all([
            supabase.from('detalle_ventas').select('*').eq('venta_id', venta_id),
            supabase.from('pagos').select('*').eq('venta_id', venta_id) 
        ]);

        const productos = prodRes.data || [];
        const pagos = pagosRes.data || [];
        window.currentSaleForPrint = { ...venta, productos, pagos };

        // 2. Llenar datos de Cabecera (IDs de tu HTML)
        const elId = document.getElementById('detail-sale-id');
        if (elId) elId.textContent = venta.venta_id;

        const elCliente = document.getElementById('detail-client-name');
        if (elCliente) {
            const c = window.allClients?.find(cl => String(cl.client_id) === String(venta.client_id));
            elCliente.textContent = c ? c.name : 'Cliente General';
        }

        const elFecha = document.getElementById('detail-sale-date');
        if (elFecha) {
            elFecha.innerHTML = `
                ${new Date(venta.created_at).toLocaleDateString()}
                <button onclick="window.editSaleDate(${venta.venta_id}, '${venta.created_at}')" class="ml-1 text-blue-500 hover:text-blue-700">
                    <i class="fas fa-edit" style="font-size: 10px;"></i>
                </button>
            `;
        }

        const elMetodo = document.getElementById('detail-payment-method');
        if (elMetodo) {
            const txt = venta.metodo_pago || 'No especificado';
            elMetodo.innerHTML = `
                ${txt}
                <button onclick="window.editSalePaymentMethod(${venta.venta_id}, '${txt}')" class="ml-1 text-blue-500 hover:text-blue-700">
                    <i class="fas fa-edit" style="font-size: 10px;"></i>
                </button>
            `;
        }

        const elDesc = document.getElementById('detail-sale-description');
        if (elDesc) elDesc.textContent = venta.description || 'Sin notas adicionales';

        // 3. Tabla de Productos (Con Editar y Borrar)
        const productsBody = document.getElementById('detail-products-body');
        if (productsBody) {
            productsBody.innerHTML = productos.map(item => `
                <tr class="border-b">
                    <td class="px-4 py-2">${item.name}</td>
                    <td class="px-4 py-2 text-right">${item.quantity}</td>
                    <td class="px-4 py-2 text-right">${formatCurrency(item.price)}</td>
                    <td class="px-4 py-2 text-right font-bold">${formatCurrency(item.subtotal)}</td>
                    <td class="px-4 py-2 text-center">
                        <div class="flex justify-center gap-2">
                            <button onclick="window.editItemPrice(${item.detalle_id || item.id}, ${item.price}, ${item.quantity}, ${venta_id})" class="text-blue-500"><i class="fas fa-edit"></i></button>
                            <button onclick="window.deleteItemFromSale(${item.detalle_id || item.id}, ${venta_id})" class="text-red-400"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // 4. Resumen Financiero (IDs de tu HTML corregidos)
        const elTotal = document.getElementById('detail-grand-total');
        if (elTotal) elTotal.textContent = formatCurrency(venta.total_amount);

        const elPagado = document.getElementById('detail-paid-amount');
        if (elPagado) elPagado.textContent = formatCurrency(venta.total_amount - (venta.saldo_pendiente || 0));

        const elDeuda = document.getElementById('detail-remaining-debt');
        if (elDeuda) elDeuda.textContent = formatCurrency(venta.saldo_pendiente || 0);

        // 5. Historial de Abonos
        const abonosBody = document.getElementById('detail-abonos-body');
        if (abonosBody) {
            abonosBody.innerHTML = pagos.length > 0 ? pagos.map(p => `
                <tr class="text-xs border-b">
                    <td class="py-2 px-4">${new Date(p.created_at).toLocaleDateString()}</td>
                    <td class="py-2 px-4 font-bold text-green-700">${formatCurrency(p.amount || p.monto)}</td>
                    <td class="py-2 px-4 uppercase text-gray-600">${p.metodo_pago || 'EFECTIVO'}</td>
                </tr>
            `).join('') : '<tr><td colspan="3" class="text-center py-4 text-gray-400">Sin abonos</td></tr>';
        }

        // 6. Abrir el modal
        window.openModal('modal-detail-sale');

    } catch (err) {
        console.error("Error crítico en handleViewSaleDetails:", err);
    }
};
// --- FUNCIÓN PARA CAMBIAR LA FECHA ---
window.editSaleDate = async function(ventaId, fechaActual) {
    // Formatear fecha para el prompt (YYYY-MM-DD)
    const fechaBase = new Date(fechaActual).toISOString().split('T')[0];
    const nuevaFecha = prompt("Ingrese la nueva fecha (AAAA-MM-DD):", fechaBase);

    if (!nuevaFecha || nuevaFecha === fechaBase) return;

    try {
        const { error } = await supabase
            .from('ventas')
            .update({ created_at: nuevaFecha })
            .eq('venta_id', ventaId);

        if (error) throw error;
        alert("✅ Fecha actualizada.");
        window.handleViewSaleDetails(ventaId);
    } catch (err) {
        alert("Error al cambiar fecha. Use formato AAAA-MM-DD");
    }
};
// --- FUNCIÓN PARA ELIMINAR UN PRODUCTO DE LA VENTA ---
window.deleteItemFromSale = async function(detalleId, ventaId) {
    if (!confirm("¿Estás seguro de eliminar este producto? El total de la venta y el saldo se recalcularán.")) return;

    try {
        // 1. Eliminar el renglón
        const { error: delError } = await supabase
            .from('detalle_ventas')
            .delete()
            .eq('detalle_id', detalleId);

        if (delError) throw delError;

        // 2. Recalcular todo (Usamos la lógica de actualización que ya tenemos)
        const { data: detalles } = await supabase.from('detalle_ventas').select('subtotal').eq('venta_id', ventaId);
        const nuevoTotalVenta = detalles.reduce((acc, curr) => acc + curr.subtotal, 0);

        const { data: pagos } = await supabase.from('pagos').select('amount').eq('venta_id', ventaId);
        const totalAbonado = pagos ? pagos.reduce((acc, curr) => acc + (curr.amount || 0), 0) : 0;
        
        const nuevoSaldo = nuevoTotalVenta - totalAbonado;

        // 3. Actualizar la venta principal
        await supabase.from('ventas')
            .update({ total_amount: nuevoTotalVenta, saldo_pendiente: nuevoSaldo })
            .eq('venta_id', ventaId);

        alert("✅ Producto eliminado y totales actualizados.");
        window.handleViewSaleDetails(ventaId);
    } catch (err) {
        console.error(err);
        alert("Error al eliminar el producto.");
    }
};
//imprimir pdf de detalles de la venta
// Generar PDF y Vista Previa de la venta
window.generarPDFVenta = function() {
    const venta = window.currentSaleForPrint;
    if (!venta) return alert("No hay datos para generar el PDF");

    const colorOxido = "#8B4513"; 
    
    // Generar las filas de productos
    const filasProductos = venta.productos.map(p => `
        <tr>
            <td style="width: 60%; text-align: left; padding: 5px; border-bottom: 1px solid #eee;">${p.name}</td>
            <td style="width: 15%; text-align: right; padding: 5px; border-bottom: 1px solid #eee;">${p.quantity}</td>
            <td style="width: 25%; text-align: right; padding: 5px; border-bottom: 1px solid #eee; font-weight: bold;">${formatCurrency(p.subtotal)}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Vista Previa - Nota ${venta.venta_id}</title>
            <style>
                @page { size: letter; margin: 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; font-size: 12px; background-color: #f4f4f4; padding: 20px; }
                .sheet { 
                    background: white; 
                    width: 210mm; 
                    min-height: 140mm; 
                    margin: 0 auto; 
                    padding: 15mm; 
                    box-shadow: 0 0 10px rgba(0,0,0,0.2);
                    border-radius: 5px;
                    position: relative;
                }
                .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${colorOxido}; padding-bottom: 10px; margin-bottom: 15px; }
                .data-grid { display: grid; grid-template-columns: 1fr 1fr; background: #fdf8f5; padding: 10px; margin-bottom: 15px; border: 1px solid #eee; }
                table { width: 100%; border-collapse: collapse; }
                th { background: ${colorOxido}; color: white; padding: 8px; font-size: 11px; text-transform: uppercase; }
                .totals-box { width: 250px; margin-left: auto; margin-top: 20px; background: #fdf8f5; padding: 12px; border: 1px solid #eee; border-radius: 4px; }
                .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
                
                /* Estilos para el botón de acción en pantalla */
                .actions-bar { 
                    max-width: 210mm; 
                    margin: 0 auto 10px auto; 
                    display: flex; 
                    justify-content: flex-end; 
                }
                .btn-print { 
                    background: ${colorOxido}; color: white; border: none; padding: 10px 20px; 
                    border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;
                }
                .btn-print:hover { opacity: 0.9; }

                @media print {
                    body { background: white; padding: 0; }
                    .sheet { box-shadow: none; width: 100%; margin: 0; padding: 0; }
                    .actions-bar { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="actions-bar">
                <button class="btn-print" onclick="window.print()">🖨️ Imprimir o Guardar PDF</button>
            </div>

            <div class="sheet">
                <div class="header">
                    <div style="display:flex; align-items:center;">
                        <div style="width:45px; height:45px; background:${colorOxido}; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:24px; border-radius:4px; margin-right:12px;">C</div>
                        <div>
                            <h2 style="margin:0; color:${colorOxido}; font-size:18px;">CREATIVA CORTES CNC</h2>
                            <p style="margin:0; font-size:9px; letter-spacing: 1px;">DISEÑO • CORTE • PRECISIÓN</p>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <h1 style="margin:0; color:${colorOxido}; font-size:18px;">NOTA DE VENTA #${venta.venta_id}</h1>
                        <p style="margin:0; font-size:11px;">${new Date(venta.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                <div class="data-grid">
                    <div><strong>CLIENTE:</strong> ${document.getElementById('detail-client-name').textContent}</div>
                    <div style="text-align:right;"><strong>ESTADO:</strong> ${venta.saldo_pendiente > 0 ? 'PENDIENTE' : 'LIQUIDADO'}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 60%; text-align: left;">Descripción del Producto</th>
                            <th style="width: 15%; text-align: right;">Cant.</th>
                            <th style="width: 25%; text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasProductos}
                    </tbody>
                </table>

                <div class="totals-box">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Subtotal:</span> <span>${formatCurrency(venta.total_amount)}</span></div>
                    <div style="display:flex; justify-content:space-between; color:green; margin-bottom:4px;"><span>Abonado:</span> <span>${formatCurrency(venta.total_amount - venta.saldo_pendiente)}</span></div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:${colorOxido}; border-top:2px solid ${colorOxido}; margin-top:8px; font-size:15px; padding-top:8px;">
                        <span>SALDO:</span> <span>${formatCurrency(venta.saldo_pendiente)}</span>
                    </div>
                </div>

                <div class="footer">
                    📱 WhatsApp: 985 111 2233 | 📍 Valladolid, Yucatán | Creativa Cortes CNC
                </div>
            </div>
        </body>
        </html>
    `;

    const pWin = window.open('', '_blank');
    pWin.document.write(htmlContent);
    pWin.document.close();
};
window.verEstadoCuentaCliente = async function(client_id, nombreCliente) {
    try {
        document.getElementById('nombre-cliente-deuda').textContent = "Estado de Cuenta: " + nombreCliente;
        window.currentClientIdForAbono = client_id; // Guardamos para el abono general

        // 1. Consultar Ventas Pendientes y Historial de Abonos en paralelo
        const [ventasRes, abonosRes] = await Promise.all([
            supabase.from('ventas').select('*').eq('client_id', client_id).gt('saldo_pendiente', 0).order('created_at', { ascending: true }),
            supabase.from('abonos').select('*').eq('client_id', client_id).order('created_at', { ascending: false }).limit(10)
        ]);

        const ventas = ventasRes.data || [];
        const abonos = abonosRes.data || [];

        // 2. Calcular Deuda Total
        const deudaTotal = ventas.reduce((acc, v) => acc + (v.saldo_pendiente || 0), 0);
        document.getElementById('total-deuda-general').textContent = formatCurrency(deudaTotal);
        
        // 3. Fecha del último abono
        document.getElementById('fecha-ultimo-abono').textContent = abonos.length > 0 
            ? new Date(abonos[0].created_at).toLocaleDateString() 
            : 'Sin pagos';

        // 4. Renderizar Notas Pendientes
        const listaVentas = document.getElementById('lista-notas-pendientes');
        listaVentas.innerHTML = ventas.length > 0 ? ventas.map(v => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-2 font-bold">#${v.venta_id}</td>
                <td class="px-4 py-2 text-gray-500">${new Date(v.created_at).toLocaleDateString()}</td>
                <td class="px-4 py-2 text-right text-red-600 font-bold">${formatCurrency(v.saldo_pendiente)}</td>
            </tr>
        `).join('') : '<tr><td colspan="3" class="p-4 text-center text-gray-400">Sin deudas pendientes</td></tr>';

        // 5. Renderizar Historial de Abonos
        const listaAbonos = document.getElementById('historial-abonos-cliente');
        listaAbonos.innerHTML = abonos.length > 0 ? abonos.map(a => `
            <tr class="border-b bg-green-50/30">
                <td class="px-4 py-2 text-xs">${new Date(a.created_at).toLocaleDateString()}</td>
                <td class="px-4 py-2 text-xs text-gray-600">${a.metodo_pago || 'Efectivo'}</td>
                <td class="px-4 py-2 text-right font-bold text-green-700">${formatCurrency(a.monto)}</td>
            </tr>
        `).join('') : '<tr><td colspan="3" class="p-4 text-center text-gray-400">No hay pagos registrados</td></tr>';

        window.openModal('modal-deudas-cliente');

    } catch (error) {
        console.error("Error al cargar estado de cuenta:", error);
        alert("No se pudo cargar la información del cliente.");
    }
};
window.registrarAbonoGeneral = async function() {
    const montoAbono = parseFloat(prompt("Ingrese el monto total del abono:"));
    if (!montoAbono || montoAbono <= 0) return;

    const metodo = prompt("Método de pago (Efectivo, Transferencia, Tarjeta):", "Efectivo");
    const clientId = window.currentClientIdForAbono;
    let dineroRestante = montoAbono;

    try {
        // 1. Obtener todas las ventas con deuda de este cliente (de la más vieja a la más nueva)
        const { data: ventasPendientes, error } = await supabase
            .from('ventas')
            .select('*')
            .eq('client_id', clientId)
            .gt('saldo_pendiente', 0)
            .order('created_at', { ascending: true });

        if (error) throw error;
        if (ventasPendientes.length === 0) return alert("Este cliente no tiene deudas pendientes.");

        // 2. Proceso de Cascada
        for (let venta of ventasPendientes) {
            if (dineroRestante <= 0) break;

            let deudaActual = venta.saldo_pendiente;
            let abonoParaEstaVenta = 0;

            if (dineroRestante >= deudaActual) {
                // El dinero alcanza para liquidar esta nota completa
                abonoParaEstaVenta = deudaActual;
                dineroRestante -= deudaActual;
            } else {
                // El dinero solo alcanza para una parte de esta nota
                abonoParaEstaVenta = dineroRestante;
                dineroRestante = 0;
            }

            // 3. Registrar el abono en la tabla 'abonos'
            await supabase.from('abonos').insert({
                venta_id: venta.venta_id,
                client_id: clientId,
                monto: abonoParaEstaVenta,
                metodo_pago: metodo,
                notas: "Abono General en cascada"
            });

            // 4. Actualizar el saldo en la tabla 'ventas'
            await supabase.from('ventas')
                .update({ saldo_pendiente: deudaActual - abonoParaEstaVenta })
                .eq('venta_id', venta.venta_id);
        }

        alert("✅ Abono procesado con éxito.");
        // Refrescar el modal de estado de cuenta
        const nombreC = document.getElementById('nombre-cliente-deuda').textContent.split(": ")[1];
        verEstadoCuentaCliente(clientId, nombreC);

    } catch (err) {
        console.error("Error en cascada:", err);
        alert("Hubo un error al procesar el abono.");
    }
};
window.generarPDFEstadoCuenta = function() {
    const data = window.currentClientDataForPrint;
    
    if (!data || !data.transaccionesHTML) {
        return alert("No hay datos cargados. Por favor, abre el reporte del cliente primero.");
    }

    const colorOxido = "#8B4513";
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Estado de Cuenta - ${data.nombre}</title>
            <style>
                @page { size: letter; margin: 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.4; margin: 0; background-color: #f0f0f0; padding: 20px; }
                .sheet { background: white; max-width: 210mm; margin: 0 auto; padding: 20px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px; }
                .header { border-bottom: 3px solid ${colorOxido}; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                .resumen { background: #fdf8f5; border: 1px solid ${colorOxido}44; padding: 20px; border-radius: 8px; margin-bottom: 25px; display: flex; justify-content: space-between; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #f4f4f4; color: #444; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; text-transform: uppercase; font-size: 11px; }
                td { padding: 10px; border-bottom: 1px solid #eee; }
                .text-right { text-align: right; }
                .text-red { color: #dc2626 !important; font-weight: bold; }
                .text-green { color: #16a34a !important; font-weight: bold; }
                .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
                .actions-bar { max-width: 210mm; margin: 0 auto 10px; display: flex; justify-content: flex-end; }
                .btn-pdf { background: ${colorOxido}; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                @media print {
                    body { background: white; padding: 0; }
                    .sheet { box-shadow: none; max-width: 100%; margin: 0; padding: 0; }
                    .actions-bar { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="actions-bar">
                <button class="btn-pdf" onclick="window.print()">📥 Guardar como PDF / Imprimir</button>
            </div>
            <div class="sheet">
                <div class="header">
                    <div>
                        <h1 style="margin:0; color:${colorOxido}; font-size: 26px;">CREATIVA CORTES CNC</h1>
                        <p style="margin:0; font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #666;">ESTADO DE CUENTA DETALLADO</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin:0; font-size: 11px; color: #888;">FECHA DE EMISIÓN</p>
                        <p style="margin:0; font-weight: bold; font-size: 14px;">${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="resumen">
                    <div>
                        <p style="margin:0; font-size: 11px; color: #888;">DATOS DEL CLIENTE</p>
                        <p style="margin:0; font-size: 20px; font-weight: bold; color: #222;">${data.nombre.toUpperCase()}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin:0; font-size: 11px; color: #888;">SALDO TOTAL A LA FECHA</p>
                        <p style="margin:0; font-size: 28px; font-weight: 900; color: ${colorOxido};">${formatCurrency(data.totalDeuda)}</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">FECHA</th>
                            <th style="width: 50%;">DESCRIPCIÓN DE MOVIMIENTO</th>
                            <th style="width: 17%; text-align: right;">CARGO/ABONO</th>
                            <th style="width: 18%; text-align: right;">SALDO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.transaccionesHTML.replace(/text-red-600/g, 'text-red').replace(/text-green-600/g, 'text-green')}
                    </tbody>
                </table>
                <div class="footer">
                    <strong>Creativa Cortes CNC</strong> | Valladolid, Yucatán<br>
                    <span style="font-size: 9px; margin-top: 10px; display: block;">Documento informativo de saldos y movimientos.</span>
                </div>
            </div>
        </body>
        </html>
    `;

    const pWin = window.open('', '_blank');
    if (pWin) {
        pWin.document.write(htmlContent);
        pWin.document.close();
    }
};


// Función auxiliar para actualizar los textos de los totales
function updateTotalUI(total, deuda) {
    document.getElementById('detail-grand-total').textContent = formatCurrency(total);
    document.getElementById('detail-paid-amount').textContent = formatCurrency(total - deuda);
    document.getElementById('detail-remaining-debt').textContent = formatCurrency(deuda);
}
window.editSalePaymentMethod = async function(ventaId, metodoActual) {
    const nuevoMetodo = prompt("Ingrese el nuevo método de pago (Efectivo, Transferencia, Tarjeta, etc.):", metodoActual);
    
    if (nuevoMetodo === null || nuevoMetodo.trim() === "") return;

    try {
        const { error } = await supabase
            .from('ventas')
            .update({ metodo_pago: nuevoMetodo.toUpperCase() })
            .eq('venta_id', ventaId);

        if (error) throw error;
        
        alert("✅ Método de pago actualizado.");
        window.handleViewSaleDetails(ventaId); // Refrescar modal
    } catch (err) {
        alert("Error al actualizar el método de pago.");
    }
};
window.editItemPrice = async function(detalle_id, precioActual, cantidad, ventaId) {
    const nuevoPrecio = prompt("Ingrese el nuevo precio unitario:", precioActual);
    
    // Validar que sea un número válido y no se haya cancelado
    if (nuevoPrecio === null || nuevoPrecio === "" || isNaN(nuevoPrecio)) return;

    const p = parseFloat(nuevoPrecio);
    const nuevoSubtotal = p * cantidad;

    try {
        // 1. Actualizar el detalle en detalle_ventas
        const { error: pError } = await supabase
            .from('detalle_ventas')
            .update({ price: p, subtotal: nuevoSubtotal })
            .eq('detalle_id', detalle_id); // Asegúrate si tu columna es 'id' o 'detalle_id'

        if (pError) throw pError;

        // 2. Obtener todos los detalles de esta venta para el nuevo Total
        const { data: detalles } = await supabase
            .from('detalle_ventas')
            .select('subtotal')
            .eq('venta_id', ventaId);
        
        const nuevoTotalVenta = detalles.reduce((acc, curr) => acc + curr.subtotal, 0);

        // 3. Obtener cuánto ha pagado el cliente en total para esta venta
        const { data: pagos } = await supabase
            .from('pagos')
            .select('amount')
            .eq('venta_id', ventaId);
        
        const totalAbonado = pagos ? pagos.reduce((acc, curr) => acc + (curr.amount || 0), 0) : 0;

        // 4. Calcular el nuevo saldo pendiente REAL
        const nuevoSaldo = nuevoTotalVenta - totalAbonado;

        // 5. Actualizar la tabla de VENTAS
        const { error: vError } = await supabase
            .from('ventas')
            .update({ 
                total_amount: nuevoTotalVenta,
                saldo_pendiente: nuevoSaldo 
            })
            .eq('venta_id', ventaId);

        if (vError) throw vError;

        alert("✅ Precio y saldo actualizados.");
        
        // 6. Refrescar el modal de detalles para ver los cambios
        if (typeof window.handleViewSaleDetails === 'function') {
            window.handleViewSaleDetails(ventaId);
        }
        
        // Opcional: Refrescar dashboard si tienes la función
        if (window.loadDashboardData) window.loadDashboardData();

    } catch (err) {
        console.error("Error al actualizar:", err);
        alert("No se pudo actualizar el precio.");
    }
};

window.handleAbonoClientSubmit = async function(e) {
    e.preventDefault();

    if (!supabase) {
        console.error("Supabase no está inicializado.");
        alert("Error de configuración.");
        return;
    }

    const form = e.target;
    // Asumiendo que 'debt-to-pay-id' contiene el ID de la venta (venta_id)
    const clientId = document.getElementById('abono-client-id')?.value;
    const abonoAmount = parseFloat(form.elements['abono-amount'].value);
    
    // 💡 CORRECCIÓN: Capturar y limpiar el método de pago
    const paymentMethod = form.elements['payment-method-abono'].value.trim();

    if (isNaN(abonoAmount) || abonoAmount <= 0) {
        alert("Ingrese un monto de abono válido y mayor a cero.");
        return;
    }

    // 🛑 VALIDACIÓN AGREGADA
    if (!paymentMethod || paymentMethod === '') {
        alert("¡Debe seleccionar un método de pago!");
        // Opcional: enfocar el campo para mejor UX
        document.getElementById('payment-method-abono')?.focus();
        return;
    }

    try {
        // 1. Obtener la venta actual para verificar el saldo
        const { data: sale, error: saleFetchError } = await supabase
            .from('ventas')
            .select(`total_amount, paid_amount, saldo_pendiente, client_id`) 
            .eq('venta_id', ventaId)
            .single();

        if (saleFetchError || !sale) throw new Error("Venta no encontrada.");

        const currentDebt = sale.saldo_pendiente;

        if (abonoAmount > currentDebt) {
            alert(`El abono (${formatCurrency(abonoAmount)}) es mayor que la deuda pendiente (${formatCurrency(currentDebt)}). Ajuste el monto.`);
            return;
        }

        // 2. Calcular nuevos saldos
        const newPaidAmount = sale.paid_amount + abonoAmount;
        const newDebt = currentDebt - abonoAmount;
        const clientId = sale.client_id;

        // 3. Registrar el pago/abono en la tabla 'pagos'
        // NOTA: 'type' debe existir en Supabase (ya lo confirmamos)
        const { error: paymentError } = await supabase
            .from('pagos')
            .insert([{
                venta_id: ventaId,
                client_id: clientId, 
                amount: abonoAmount,
                metodo_pago: paymentMethod, // Usa el valor validado
                type: 'abono' 
            }]);

        if (paymentError) throw new Error("Error al registrar el pago: " + paymentError.message);

        // 4. Actualizar la tabla 'ventas' (saldo_pendiente y paid_amount)
        const { error: updateSaleError } = await supabase
            .from('ventas')
            .update({
                paid_amount: newPaidAmount,
                saldo_pendiente: newDebt,
            })
            .eq('venta_id', ventaId);

        if (updateSaleError) throw new Error("Error al actualizar la venta: " + updateSaleError.message);

        // Éxito
        alert(`Abono de ${formatCurrency(abonoAmount)} registrado con éxito. Deuda restante: ${formatCurrency(newDebt)}.`);
        
        // Limpiar y cerrar modales
        form.reset();
        closeModal('abono-client-modal');
        
        // Recargar datos y volver a abrir el modal de detalles de venta con la información actualizada
        await loadDashboardData();
        
        // Reabrir el modal de detalles con los nuevos saldos
        handleViewSaleDetails(ventaId, clientId); 

    } catch (error) {
        console.error('Error al registrar abono:', error);
        alert('Fallo al registrar el abono: ' + error.message);
    }
}

async function procesarAbonoCascada(clientId, montoAbono, metodo) {
    // 1. Obtener todas las ventas con saldo pendiente, de la más vieja a la más nueva
    const { data: ventas, error } = await supabase
        .from('ventas')
        .select('venta_id, saldo_pendiente')
        .eq('client_id', clientId)
        .gt('saldo_pendiente', 0)
        .order('created_at', { ascending: true });

    if (error) throw error;

    let saldoRestante = montoAbono;

    for (const venta of ventas) {
        if (saldoRestante <= 0) break;

        // Determinar cuánto podemos aplicar a esta venta
        const pagoParaEstaVenta = Math.min(venta.saldo_pendiente, saldoRestante);
        const nuevoSaldoVenta = venta.saldo_pendiente - pagoParaEstaVenta;

        // 2. Registrar el pago vinculado a esta venta específica
        await supabase.from('pagos').insert([{
            venta_id: venta.venta_id,
            client_id: clientId,
            amount: pagoParaEstaVenta,
            metodo_pago: metodo,
            type: 'ABONO_AUTOMATICO'
        }]);

        // 3. Actualizar el saldo de la venta
        await supabase.from('ventas')
            .update({ saldo_pendiente: nuevoSaldoVenta })
            .eq('venta_id', venta.venta_id);

        saldoRestante -= pagoParaEstaVenta;
    }

    // 4. Si sobra dinero tras pagar todas las ventas, queda como "Saldo a Favor"
    if (saldoRestante > 0) {
        console.log("El cliente tiene saldo a favor de:", saldoRestante);
        // Aquí podrías insertarlo en una tabla de anticipos si la tienes
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-sale-price-form');
    // Verificación y Listener para el formulario de Edición de Precio
    if (editForm) {
        editForm.addEventListener('submit', handlePriceEditSubmit);
    }
});

/**
 * Filtra las ventas basándose en un rango de fechas y una cadena de búsqueda, y luego las renderiza.
 */
window.handleFilterSales = function() {
    const startDate = document.getElementById('filter-start-date')?.value;
    const endDate = document.getElementById('filter-end-date')?.value;
    const searchTerm = document.getElementById('filter-search-term')?.value.toLowerCase().trim() || '';

    const allSales = window.allSales || []; 

    let filteredSales = allSales.filter(sale => {
        // A. FILTRO POR FECHA
        let dateMatch = true;
        const saleDate = sale.sale_date; 
        
        if (startDate && saleDate < startDate) {
            dateMatch = false;
        }
        if (endDate && saleDate > endDate) {
            dateMatch = false;
        }
        
        // B. FILTRO POR BÚSQUEDA DE TEXTO (Cliente o ID de Venta)
        let textMatch = true;
        if (searchTerm.length > 0) {
            const clientName = (sale.client_name || '').toLowerCase();
            const saleId = String(sale.venta_id);
            
            if (!clientName.includes(searchTerm) && !saleId.includes(searchTerm)) {
                textMatch = false;
            }
        }
        
        return dateMatch && textMatch;
    });

    // Llama a la función de renderizado
    window.renderSalesTable(filteredSales);
    console.log(`Filtro aplicado. Mostrando ${filteredSales.length} ventas.`);
}
window.handleFilterSales = window.handleFilterSales; // Exposición global

window.renderSalesTable = function(sales) {
    const tableBody = document.getElementById('sales-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (sales.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No se encontraron ventas para estos criterios.</td></tr>';
        return;
    }

    sales.forEach(sale => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        // Determinar el estado visual de la deuda
        const isPaid = sale.saldo_pendiente <= 0;
        const debtClass = isPaid ? 'text-green-600 font-medium' : 'text-red-600 font-bold';
        const statusText = isPaid ? 'Liquidada' : 'Pendiente';

        row.innerHTML = `
            <td class="px-3 py-2 text-sm text-gray-900">${sale.venta_id}</td>
            <td class="px-3 py-2 text-sm text-gray-500">${sale.sale_date || 'N/A'}</td> 
            <td class="px-3 py-2 text-sm font-medium">${sale.client_name || 'Consumidor Final'}</td>
            <td class="px-3 py-2 text-sm text-right">${window.formatCurrency(sale.total_amount)}</td>
            <td class="px-3 py-2 text-sm text-right ${debtClass}">${window.formatCurrency(sale.saldo_pendiente)}</td>
            <td class="px-3 py-2 text-sm ${debtClass}">${statusText}</td>
            <td class="px-3 py-2 text-right">
                <button onclick="window.openSaleDetailModal(${sale.venta_id})" class="text-indigo-600 hover:text-indigo-900">Detalles</button>
                ${!isPaid ? `<button onclick="window.openPaymentModal(${sale.venta_id}, ${sale.saldo_pendiente}, ${sale.client_id})" class="text-green-600 hover:text-green-800 ml-2">Abonar</button>` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });
};
window.renderSalesTable = renderSalesTable; // Exposición global

// ====================================================================
// 10. LÓGICA CRUD PARA PRODUCTOS
// ====================================================================
/**
 * Carga todas las ventas y las almacena globalmente para su posterior filtrado.
 */
window.loadSalesData = async function() {
    console.log("Cargando datos de ventas...");
    
    if (!supabase) {
        console.error("Supabase no inicializado en loadSalesData.");
        window.allSales = [];
        return;
    }
    
    try {
        const { data: sales, error } = await supabase
            .from('ventas')
            .select(`
                venta_id, 
                created_at,        
                total_amount,      
                saldo_pendiente,   
                client_id,         
                clientes ( name )  
            `);

        if (error) throw error;
        
        // Procesamos los datos para aplanar y estandarizar los nombres de las propiedades en JS
        window.allSales = (sales || []).map(sale => ({
            ...sale,
            // Mapeamos 'created_at' de la DB al nombre estándar en JS ('sale_date')
            sale_date: sale.created_at ? sale.created_at.substring(0, 10) : 'N/A', 
            client_name: sale.clientes ? sale.clientes.name : 'Consumidor Final'
        }));
        
        console.log(`✅ ${window.allSales.length} ventas cargadas en ámbito global.`);
        
    } catch (error) {
        console.error('Error al cargar datos de ventas:', error);
        window.allSales = [];
        alert('Fallo al cargar la lista de ventas.');
    }
    return window.allSales; 
};
window.loadSalesData = loadSalesData;

async function openNewProductModal() {
    console.log("DEBUG: Paso 1: Intentando cargar productos principales antes de abrir el modal.");
    
    // 🚨 Esta es la llamada que debe funcionar ahora que la expusiste a window
    if (window.loadMainProductsAndPopulateSelect) {
        await window.loadMainProductsAndPopulateSelect(); 
        console.log("DEBUG: Paso 2: Función de carga ejecutada (debe haber llenado el select).");
    } else {
        console.error("DEBUG: Paso 2: Error. La función loadMainProductsAndPopulateSelect no está en el ámbito global.");
    }

    // 3. Abrir el modal (asumo que 'openModal' existe)
    openModal('new-product-modal'); 
    console.log("DEBUG: Paso 3: Modal abierto.");
    
    // 4. Resetear el campo type para el listener
    const typeSelect = document.getElementById('new-product-type');
    if (typeSelect) {
        typeSelect.value = 'PRODUCT'; 
        window.handleProductTypeChange();
    }
}

window.handlePriceEditSubmit = async function(e) {
    e.preventDefault(); 

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const ventaId = document.getElementById('edit-sale-transaction-id').value;
    const detalleId = document.getElementById('edit-sale-detail-id').value;
    const newPrice = parseFloat(document.getElementById('edit-new-price').value);
    
    if (!ventaId || !detalleId || isNaN(newPrice)) {
        alert("⚠️ Datos incompletos.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando...';
    
    try {
        // 1. Obtener la cantidad de productos de ese detalle
        // Cambia 'detalles_ventas' si tu tabla se llama distinto
        const { data: detalle, error: dError } = await supabase
            .from('detalles_ventas') // <--- NOMBRE DE TABLA
            .select('quantity')
            .eq('id', detalleId) // <--- O 'detalle_id'
            .single();

        if (dError) throw new Error("No se pudo obtener la cantidad del producto.");

        // 2. Obtener todos los abonos ya realizados a esta venta
        const { data: pagos, error: pError } = await supabase
            .from('pagos')
            .select('amount')
            .eq('venta_id', ventaId);

        const totalPagado = pagos ? pagos.reduce((acc, p) => acc + p.amount, 0) : 0;

        // 3. Cálculos
        const nuevoSubtotal = newPrice * detalle.quantity;
        const nuevoTotalVenta = nuevoSubtotal; // Asumiendo venta de producto único o ajuste total
        const nuevoSaldo = Math.max(0, nuevoTotalVenta - totalPagado);

        // 4. ACTUALIZACIÓN DOBLE (Atomicidad manual)
        // Actualizar detalle
        const { error: err1 } = await supabase
            .from('detalles_ventas') // <--- NOMBRE DE TABLA
            .update({ 
                unit_price: newPrice, 
                subtotal: nuevoSubtotal 
            })
            .eq('id', detalleId);

        if (err1) throw err1;

        // Actualizar venta
        const { error: err2 } = await supabase
            .from('ventas')
            .update({ 
                total_amount: nuevoTotalVenta, 
                saldo_pendiente: nuevoSaldo 
            })
            .eq('venta_id', ventaId);

        if (err2) throw err2;

        alert(`✅ Éxito. Nuevo Total: ${formatCurrency(nuevoTotalVenta)}. Saldo actual: ${formatCurrency(nuevoSaldo)}`);

        // 5. Refrescar UI sin recargar página
        document.getElementById('price-edit-section').classList.add('hidden');
        
        // Esta función recargará los números en el modal de detalles automáticamente
        await window.handleViewSaleDetails(ventaId);
        
        // Actualizar la tabla de clientes/ventas al fondo
        if (window.loadClientsTable) window.loadClientsTable('gestion');

    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Actualizar Precio y Saldo';
    }
};

window.loadProductsTable = function() {
    const container = document.getElementById('products-table-body');
    if (!container) return; 
   
    container.innerHTML = '';
    const products = window.allProducts || []; 

    if (products.length === 0) {
        const noDataMsg = document.getElementById('no-products-message');
        if (noDataMsg) noDataMsg.classList.remove('hidden');
        return;
    }
    document.getElementById('no-products-message')?.classList.add('hidden');

    products.forEach(product => {
        const row = document.createElement('tr');
        // Transición de opacidad y color definida en tu CSS
        row.className = 'border-b border-white/5 group hover:bg-white/[0.02] transition-all duration-300';
        
        const formattedPrice = formatCurrency(product.price);
        
        let badgeClass = '';
        let typeText = '';
        let icon = '';

        switch(product.type) {
            case 'MAIN':
                badgeClass = 'glass-badge-success';
                typeText = 'Principal';
                icon = 'fa-star';
                break;
            case 'PACKAGE':
                badgeClass = 'glass-badge-danger'; 
                typeText = 'Paquete';
                icon = 'fa-box-open';
                break;
            case 'SERVICE':
                badgeClass = 'glass-badge-success'; 
                typeText = 'Servicio';
                icon = 'fa-tools';
                break;
            default:
                badgeClass = 'glass-badge-success';
                typeText = product.type || 'General';
                icon = 'fa-tag';
        }

        row.innerHTML = `
            <td class="px-8 py-5 whitespace-nowrap">
                <span class="font-sans font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded text-[10px]">
                    #${product.producto_id}
                </span>
            </td>
            
            <td class="px-8 py-5 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 rounded-xl bg-orange-500 border border-orange-600 shadow-lg shadow-orange-500/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform duration-300">
                        <i class="fas ${icon} text-white text-xs"></i>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-white uppercase tracking-wide">${product.name}</div>
                        <div class="text-[9px] text-white/30 uppercase font-sans font-bold tracking-widest mt-1">Inventario Activo</div>
                    </div>
                </div>
            </td>
            
            <td class="px-8 py-5 whitespace-nowrap">
                <div class="text-[9px] text-white/20 uppercase font-bold mb-1 font-sans tracking-widest">Precio Unitario</div>
                <div class="text-sm font-bold text-white font-mono">
                    ${formattedPrice}
                </div>
            </td>
            
            <td class="px-8 py-5 whitespace-nowrap">
                <div class="text-[9px] text-white/20 uppercase font-bold mb-1 font-sans tracking-widest">Categoría</div>
                <div class="glass-badge ${badgeClass}">
                    <span class="flex items-center font-bold font-sans text-[11px] tracking-tight">
                        <i class="fas ${icon} mr-2 text-[9px] opacity-70"></i>
                        <span class="uppercase">${typeText}</span>
                    </span>
                </div>
            </td>
            
            <td class="px-8 py-5 whitespace-nowrap text-right">
                <div class="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <button 
                        onclick="window.handleEditProductClick(${product.producto_id})" 
                        class="edit-client-btn text-white/50 hover:text-orange-500" title="Editar Producto">
                        <i class="fas fa-pen text-[11px]"></i>
                    </button>
                    
                    <button 
                        onclick="window.handleDeleteProductClick(${product.producto_id})" 
                        class="delete-client-btn text-white/50 hover:text-red-500" title="Eliminar Producto">
                        <i class="fas fa-trash-alt text-[11px]"></i>
                    </button>
                </div>
            </td>
        `;
        container.appendChild(row);
    });
};

function loadProductDataToForm(product) {
    if (!product) return;

    // Llenar campos básicos
    document.getElementById('edit-product-id').value = product.producto_id;
    document.getElementById('edit-product-name').value = product.name || '';
    document.getElementById('edit-product-price').value = product.price || 0;
    
    const categorySelect = document.getElementById('edit-product-category');
    
    // Normalizar el tipo para el select del HTML
    if (product.type === 'PACKAGE' || product.type === 'Paquete') {
        categorySelect.value = "Paquete";
    } else if (product.type === 'SERVICE' || product.type === 'Servicio') {
        categorySelect.value = "Servicio";
    } else {
        categorySelect.value = "Producto";
    }

    const parentContainer = document.getElementById('edit-product-parent-container');
    const parentSelect = document.getElementById('edit-product-parent');

    // Lógica para el Padre
    if (categorySelect.value === 'Paquete') {
        parentContainer.classList.remove('hidden');
        
        // --- CRÍTICO: Poblar el select ANTES de asignar el valor ---
        window.populateParentSelect('edit-product-parent', product.producto_id);
        
        // Ahora sí, asignar el padre que ya tenía
        parentSelect.value = product.parent_product || '';
    } else {
        parentContainer.classList.add('hidden');
    }
}
window.loadMainProductsAndPopulateSelect = async function() {
    
    // 1. Obtener el elemento SELECT
    const selectElement = document.getElementById('new-product-parent-select');
    if (!selectElement) return;

    // 🚨 CAMBIO CLAVE: Usamos los datos globales ya cargados. 
    const allProducts = window.allProducts || []; 

    // 2. Filtra la lista para obtener solo los productos que pueden ser padres (MAIN)
    const mainProducts = allProducts.filter(product => product.type === 'MAIN'); 
    
    // 3. DEBUG: Muestra cuántos productos encontró
    console.warn(`DEBUG: La función LOCAL devolvió ${mainProducts.length} productos MAIN.`); 
    
    // 4. Poblar el SELECT
    selectElement.innerHTML = '';
    
    // Placeholder que indica el estado
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = (mainProducts.length > 0) 
        ? '--- Seleccione el Producto Principal ---'
        : '--- (NO HAY PRODUCTOS MAIN REGISTRADOS) ---'; 
    defaultOption.setAttribute('disabled', 'disabled');
    defaultOption.setAttribute('selected', 'selected');
    selectElement.appendChild(defaultOption);

    // Agregar las opciones cargadas
    mainProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.producto_id; 
        option.textContent = product.name;
        selectElement.appendChild(option);
    });
}
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

window.populateParentSelect = function(selectId, currentProductId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // 1. Limpiar opciones actuales
    select.innerHTML = '<option value="">-- Seleccione Producto Principal --</option>';

    // 2. Filtrar productos que pueden ser "Padres" (usualmente los que NO son paquetes)
    // Y excluimos el producto que estamos editando para evitar circularidad
    const potentialParents = window.allProducts.filter(p => 
        String(p.producto_id) !== String(currentProductId) && 
        p.type !== 'PACKAGE'
    );

    // 3. Agregar opciones al select
    potentialParents.forEach(p => {
        const option = document.createElement('option');
        option.value = p.producto_id;
        option.textContent = `${p.name} (ID: ${p.producto_id})`;
        select.appendChild(option);
    });
};
// La función DEBE estar expuesta globalmente si el formulario no tiene un listener en JS.
window.handleUpdateProduct = async function(e) {
    e.preventDefault();

    const productId = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value;
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const category = document.getElementById('edit-product-category').value;
    
    // Convertir de nuevo al formato de base de datos si es necesario
    let dbType = 'PRODUCT';
    if (category === 'Servicio') dbType = 'SERVICE';
    if (category === 'Paquete') dbType = 'PACKAGE';

    let parentId = null;
    if (dbType === 'PACKAGE') {
        parentId = document.getElementById('edit-product-parent').value || null;
    }

    try {
        const { error } = await supabase
            .from('productos')
            .update({
                name: name,
                price: price,
                type: dbType,
                parent_product: parentId
            })
            .eq('producto_id', productId);

        if (error) throw error;

        alert('✅ Producto actualizado correctamente');
        closeModal('edit-product-modal');
        
        // Recargar la tabla
        if (typeof loadAndRenderProducts === 'function') {
            await loadAndRenderProducts();
        }
    } catch (err) {
        console.error('Error:', err);
        alert('No se pudo actualizar: ' + err.message);
    }
};
// ⚠️ NECESITAS ESTA FUNCIÓN DE MAPEO:
function mapCategoryToSupabaseType(category) {
    if (category === 'Producto') return 'MAIN';
    if (category === 'Paquete') return 'PACKAGE';
    return 'MAIN'; 
}
// main.js - Función para manejar el guardado de un nuevo producto
async function handleNewProduct(e) {
    e.preventDefault();

    if (!supabase) {
        console.error('Supabase no inicializado');
        return;
    }

    // 1. Referencia al botón y elementos de carga
    const btn = document.getElementById('btn-register-product');
    const iconDefault = btn.querySelector('.icon-default');
    const iconLoading = btn.querySelector('.icon-loading');
    const btnText = btn.querySelector('.btn-text');

    // 2. Obtener elementos del formulario
    const nameInput = document.getElementById('new-product-name');
    const typeInput = document.getElementById('new-product-type'); 
    const priceInput = document.getElementById('new-product-price'); 
    const parentSelect = document.getElementById('new-product-parent-select');

    // 3. Validaciones básicas
    const name = nameInput.value.trim();
    const type = typeInput.value; 
    const price = parseFloat(priceInput.value);
    let parentProductId = null;

    if (isNaN(price) || price < 0) {
        alert('Por favor, ingresa un precio válido.');
        return;
    }

    if (type === 'PACKAGE') {
        parentProductId = parentSelect?.value || null; 
        if (!parentProductId) { 
            alert('Los subproductos requieren un Producto Principal.');
            return;
        }
    }

    // --- ACTIVAR ESTADO DE CARGA ---
    btn.disabled = true;
    btn.classList.add('opacity-80', 'cursor-not-allowed');
    iconDefault.classList.add('hidden');
    iconLoading.classList.remove('hidden');
    btnText.textContent = 'Registrando...';

    try {
        // 4. Inserción en Supabase
        const { error } = await supabase
            .from('productos')
            .insert([{ 
                name: name, 
                type: type, 
                price: price, 
                parent_product: parentProductId 
            }]);

        if (error) throw error;

        // 5. Éxito
        console.log('Producto registrado con éxito');
        
        const form = document.getElementById('new-product-form');
        form.reset();
        window.handleProductTypeChange('new'); 
        closeModal('new-product-modal'); 

        if (window.loadAndRenderProducts) {
            await window.loadAndRenderProducts();
        }

    } catch (err) {
        console.error('Error al registrar:', err.message);
        alert('No se pudo registrar el producto: ' + err.message);
    } finally {
        // --- RESTAURAR ESTADO DEL BOTÓN ---
        btn.disabled = false;
        btn.classList.remove('opacity-80', 'cursor-not-allowed');
        iconDefault.classList.remove('hidden');
        iconLoading.classList.add('hidden');
        btnText.textContent = 'Finalizar Registro';
    }
}

window.handleProductTypeChange = function(mode = 'new') {
    // Definimos los prefijos dinámicamente según el modo (new- o edit-)
    const typeSelect = document.getElementById(`${mode}-product-type`) || document.getElementById(`${mode}-product-category`);
    const parentContainer = document.getElementById(`${mode}-product-parent-container`);
    const parentSelect = document.getElementById(`${mode}-product-parent-select`) || document.getElementById(`${mode}-product-parent`);
    const placeholder = document.getElementById(`${mode}-product-placeholder`);

    if (!typeSelect || !parentContainer || !parentSelect) return;

    // Detectamos si el valor es PACKAGE (para nuevo) o Paquete (para editar)
    const isPackage = typeSelect.value === 'PACKAGE' || typeSelect.value === 'Paquete';

    if (isPackage) {
        // 1. Mostrar contenedor y activar obligatoriedad
        parentContainer.classList.remove('hidden');
        parentSelect.setAttribute('required', 'required');
        if (placeholder) placeholder.classList.add('hidden');

        // 2. Animación de entrada "Slide Down"
        parentContainer.animate([
            { opacity: 0, transform: 'translateY(-10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            duration: 250,
            easing: 'ease-out'
        });

    } else {
        // 3. Animación de salida "Fade Out"
        const fadeOut = parentContainer.animate([
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-5px)' }
        ], {
            duration: 150,
            easing: 'ease-in'
        });

        // 4. Al terminar la animación, ocultamos y limpiamos
        fadeOut.onfinish = () => {
            parentContainer.classList.add('hidden');
            parentSelect.removeAttribute('required');
            parentSelect.value = ''; // Limpiamos la selección
            if (placeholder) placeholder.classList.remove('hidden');
        };
    }
};
let deletingProductId = null; 
window.handleEditProductClick = function(productId) {
    console.log("ID recibida del botón:", typeof productId, productId);
    
    // 1. Obtener el objeto completo del mapa usando el ID
    const productToEdit = window.allProductsMap[String(productId)];
    
    console.log("Producto encontrado en el mapa:", productToEdit);

    if (productToEdit) {
        window.editingProductId = productId; 
        // 2. PASAMOS EL OBJETO COMPLETO, no solo el ID
        loadProductDataToForm(productToEdit); 
        openModal('edit-product-modal'); 
    } else {
        console.error("No se encontró el producto en el mapa global.");
        alert("Error al cargar los datos del producto.");
    }
}
// Variable global para guardar la ID del producto a eliminar
window.handleDeleteProductClick = function(productId) {
    // 1. Guardar el ID para la confirmación
    window.productIdToDelete = productId; 
    
    // 2. Obtener datos del mapa global
    const product = window.allProductsMap[String(productId)];
    if (!product) return;

    // 3. Verificación de Seguridad: ¿Tiene subproductos vinculados?
    const children = (window.allProducts || []).filter(p => String(p.parent_product) === String(productId));
    
    const placeholder = document.getElementById('delete-product-name-placeholder');
    const warningContainer = document.getElementById('delete-product-warning');
    
    if (placeholder) {
        placeholder.textContent = product.name;
    }

    // 4. Mostrar advertencia si es un "Padre" con hijos
    if (warningContainer) {
        if (children.length > 0) {
            warningContainer.innerHTML = `
                <div class="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
                    <i class="fas fa-exclamation-triangle text-orange-500 mt-1"></i>
                    <p class="text-[11px] text-orange-200 leading-tight">
                        <strong class="block mb-1">¡Atención!</strong>
                        Este producto es "Padre" de <b>${children.length} subproductos</b>. 
                        Si lo eliminas, los subproductos quedarán huérfanos.
                    </p>
                </div>`;
            warningContainer.classList.remove('hidden');
        } else {
            warningContainer.classList.add('hidden');
        }
    }

    // 5. Abrir el modal con desenfoque de fondo
    openModal('delete-product-modal');
};
async function handleUpdateProduct(e) {
    e.preventDefault();

    const id = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value.trim();
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const category = document.getElementById('edit-product-category').value;
    const parentSelect = document.getElementById('edit-product-parent');

    let parentProductId = (category === 'Paquete') ? parentSelect.value : null;

    try {
        const { error } = await supabase
            .from('productos')
            .update({ 
                name: name, 
                price: price, 
                type: (category === 'Paquete') ? 'PACKAGE' : (category === 'Servicio' ? 'SERVICE' : 'MAIN'),
                parent_product: parentProductId 
            })
            .eq('producto_id', id);

        if (error) throw error;

        closeModal('edit-product-modal');
        if (window.loadAndRenderProducts) await window.loadAndRenderProducts();
        
    } catch (err) {
        console.error('Error al actualizar:', err.message);
        alert('Error al actualizar: ' + err.message);
    }
}

// ====================================================================
// 11. LÓGICA CRUD PARA CLIENTES
// ====================================================================
async function loadClientDebtsTable() {
    if (!supabase) {
        console.error("Supabase no está inicializado.");
        return;
    }

    const tbody = document.getElementById('debts-table-body');
    const noDebtsMessage = document.getElementById('no-debts-message');
    
    if (!tbody || !noDebtsMessage) return; 

    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Cargando deudas...</td></tr>';
    noDebtsMessage.classList.add('hidden');

    try {
        // 1. Consultar ventas con saldo pendiente > 0.01
        const { data: sales, error } = await supabase
            .from('ventas')
            .select(`
                venta_id, 
                client_id, 
                created_at, 
                saldo_pendiente,
                clientes(name) 
            `)
            .gt('saldo_pendiente', 0.01) 
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // 2. Agrupar las deudas por Cliente y calcular el total
        const clientDebts = {};
        
        (sales || []).forEach(sale => {
            const clientId = sale.client_id;
            
            if (!clientDebts[clientId]) {
                clientDebts[clientId] = {
                    clientId: clientId,
                    name: sale.clientes?.name || 'Cliente Desconocido',
                    totalDebt: 0,
                    lastSaleDate: sale.created_at, 
                    lastSaleId: sale.venta_id 
                };
            }
            
            clientDebts[clientId].totalDebt += sale.saldo_pendiente;
        });

        const debtList = Object.values(clientDebts);

        // 3. Renderizar la tabla
        tbody.innerHTML = ''; 

        if (debtList.length === 0) {
            noDebtsMessage.classList.remove('hidden');
            return;
        }

        let debtsHTML = []; 

        debtList.forEach(debt => {
            const formattedDate = formatDate(debt.lastSaleDate); 

            debtsHTML.push(`
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${debt.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-lg font-extrabold text-red-600">${formatCurrency(debt.totalDebt)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                            onclick="window.handleViewClientDebt(${debt.clientId})" 
                            class="text-indigo-600 hover:text-indigo-900 font-medium text-xs py-1 px-2 rounded bg-indigo-100"
                            title="Ver historial completo de cargos y abonos"
                        >
                            Ver Historial (${formatCurrency(debt.totalDebt)})
                        </button>
                    </td>
                </tr>
            `);
        });
        
        tbody.innerHTML = debtsHTML.join(''); // Inyección única

    } catch (e) {
        console.error('Error al cargar la tabla de deudas:', e);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-600">Error al cargar datos de deudas.</td></tr>';
    }
}

window.loadClientsTable = async function(mode = 'gestion') {
    if (!supabase) return;

    const container = document.getElementById('clients-list-body');
    if (!container) return;
    const showActions = mode === 'gestion';

    try {
        const { data: clients, error: clientsError } = await supabase
            .from('clientes')
            .select('client_id, name, telefono') 
            .order('name', { ascending: true });

        if (clientsError) throw clientsError;

        // ACTUALIZACIÓN DE MAPAS (Vital para evitar el error de "no encontrado")
        window.allClients = clients; 
        window.allClientsMap = {}; 
        clients.forEach(c => { window.allClientsMap[c.client_id] = c; });

        const summaryPromises = clients.map(client => getClientSalesSummary(client.client_id));
        const summaries = await Promise.all(summaryPromises);

        container.innerHTML = '';

        if (clients.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="px-4 py-12 text-center text-white/20 font-sans uppercase text-[10px] tracking-widest">No hay registros</td></tr>`;
            return;
        }

        clients.forEach((client, index) => {
            const summary = summaries[index];
            const row = document.createElement('tr');
            row.className = 'group border-b border-white/5 hover:bg-white/[0.02] transition-all duration-300';

            const deudaVisual = summary.deudaNeta;
            const tieneDeuda = deudaVisual > 0.01;

            let actionCell = '';
            if (showActions) {
                actionCell = `
                    <td class="px-6 py-5 whitespace-nowrap text-right">
                        <div class="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <button type="button" class="edit-client-btn text-white/50 hover:text-orange-500" data-id="${client.client_id}" title="Editar Cliente">
                                <i class="fas fa-user-edit text-[13px]"></i>
                            </button>
                            <button type="button" class="abono-btn text-white/50 hover:text-emerald-500" onclick="window.handleAbonoClick(${client.client_id})" title="Agregar Abono">
                                <i class="fas fa-file-invoice-dollar text-[13px]"></i>
                            </button>
                            <button type="button" class="view-debt-btn text-white/50 hover:text-blue-500" data-id="${client.client_id}" title="Ver Historial">
                                <i class="fas fa-history text-[13px]"></i>
                            </button>
                            <button type="button" class="delete-client-btn text-white/50 hover:text-red-500" data-id="${client.client_id}" data-name="${client.name}" title="Eliminar Cliente">
                                <i class="fas fa-trash-alt text-[13px]"></i>
                            </button>
                        </div>
                    </td>
                `;
            }
            
            row.innerHTML = `
                <td class="px-6 py-5 whitespace-nowrap">
                    <span class="font-sans font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded text-[10px]">
                        ID #${client.client_id}
                    </span>
                </td>
                <td class="px-6 py-5 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-xl bg-orange-500 border border-orange-600 shadow-lg shadow-orange-500/20 flex items-center justify-center text-white mr-4 group-hover:scale-105 transition-transform duration-300">
                            <i class="fas fa-user text-sm"></i>
                        </div>
                        <div>
                            <div class="text-sm font-bold text-white uppercase tracking-wide font-sans">${client.name}</div>
                            <div class="text-[12px] text-white/40 font-sans mt-0.5 flex items-center">
                                <i class="fas fa-phone-alt mr-1.5 opacity-50 text-[8px]"></i>
                                ${client.telefono || 'Sin contacto'}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-5 whitespace-nowrap">
                    <div class="text-[12px] text-white/50 uppercase font-bold mb-1 font-sans tracking-widest">Total Consumo</div>
                    <div class="text-sm font-bold text-white font-mono">${formatCurrency(summary.totalVentas)}</div>
                </td>
                <td class="px-6 py-5 whitespace-nowrap">
                    <div class="text-[12px] text-white/50 uppercase font-bold mb-1 font-sans tracking-widest">Estado Actual</div>
                    <div class="glass-badge ${tieneDeuda ? 'glass-badge-danger' : 'glass-badge-success'}">
                        <span class="flex items-center font-bold font-sans text-[12px]">
                            <span class="h-1.5 w-1.5 rounded-full ${tieneDeuda ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'} mr-2"></span>
                            ${formatCurrency(deudaVisual)}
                        </span>
                    </div>
                </td>
                ${actionCell} 
            `;
            container.appendChild(row);
        });

        // RE-VINCULACIÓN DE EVENTOS (Aquí se asegura que el ID no sea null)
        if (showActions) {
    container.querySelectorAll('.edit-client-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation(); // 🛑 Evita que se disparen otros listeners
            const id = btn.getAttribute('data-id');
            if (id) window.handleEditClientClick(id);
        };
    });

    container.querySelectorAll('.view-debt-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation(); // 🛑 Evita que se disparen otros listeners
            const id = btn.getAttribute('data-id');
            if (id) window.handleViewClientDebt(id);
        };
    });

    container.querySelectorAll('.delete-client-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name');
            if (id) window.handleDeleteClientClick(id, name);
        };
    });
}
    } catch (e) { console.error('Error:', e); }
};
// Variable Global: Asegúrate de que esta variable esté declarada al inicio de tu main.js
let clientToDeleteId = null; 
// Asumimos que también tienes el array global 'allClients'

window.handleNewClient = async function(e) {
    // 🛑 CRÍTICO: Detiene el envío nativo del formulario.
    // Esta línea funcionará correctamente porque ahora la función será llamada
    // por un listener de JS nativo (form.addEventListener('submit', ...))
    e.preventDefault(); 
    
    // 🛑 LOG 1: VERIFICAR SI LA FUNCIÓN FUE LLAMADA
    console.log('1. FUNCIÓN DE REGISTRO INICIADA.'); 
    
    const name = document.getElementById('new-client-name')?.value.trim();
    const phone = document.getElementById('new-client-phone')?.value.trim() || null;
    
    // 🛑 LOG 2: VERIFICAR LA CAPTURA DE DATOS Y LA DISPONIBILIDAD DE SUPABASE
    console.log(`2. Datos capturados: Nombre='${name}', Teléfono='${phone}'.`);
    
    if (typeof supabase === 'undefined' || !supabase) { 
        console.error('ERROR CRÍTICO: La variable "supabase" no está definida o accesible globalmente.');
        alert('Error: La conexión a la base de datos no está disponible.');
        return;
    }
    
    if (!name || name.length < 3) {
        console.warn('Registro cancelado: Nombre inválido.');
        alert('Por favor, ingresa un nombre válido para el cliente.');
        
        // Opcional: enfocar el campo para mejor UX
        document.getElementById('new-client-name')?.focus(); 
        
        return;
    }

    // 🛑 LOG 3: INTENTO DE INSERCIÓN
   // console.log('3. Intentando insertar en Supabase...');
    // Usamos un bloque try/catch para manejar errores de red o Supabase
    try {
        const { error } = await supabase
            .from('clientes')
            .insert([{ 
                name: name, 
                telefono: phone, 
                is_active: true 
            }]);

        // 🛑 LOG 4: RESULTADO DE SUPABASE
        if (error) {
            console.error('4. ERROR DE SUPABASE al registrar cliente:', error);
            alert('Error al registrar cliente: ' + error.message);
        } else {
        //    console.log('4. REGISTRO EXITOSO. Procediendo a actualizar UI.');
            alert('Cliente registrado exitosamente.');

// Actualizar mapa global para que el nuevo cliente sea "editable" de inmediato
if (window.loadAllClientsMap) await window.loadAllClientsMap();

if (typeof window.loadClientsTable === 'function') {
    await window.loadClientsTable('gestion');
}
            
            // --- Cierre y Limpieza ---
            
            // 1. Recargar la tabla de clientes
            if (typeof window.loadClientsTable === 'function') { // Verificar en window
             await window.loadClientsTable('gestion');        // Llamar desde window
         //    console.log("5. Tabla de clientes recargada exitosamente.");
            }    else {
            console.error("ERROR: window.loadClientsTable no está definida para la recarga.");
}

            // 2. Limpiar el formulario
            const clientForm = document.getElementById('new-client-form');
            clientForm?.reset(); 
            
            // 3. Cerrar el modal
            if (typeof closeModal === 'function') {
                closeModal('new-client-modal');
            } else {
                console.error("closeModal no está definida globalmente.");
            }
            
           // console.log('5. Tarea completada y modal cerrado.');
        }
    } catch (e) {
        console.error('5. ERROR DE RED o EXCEPCIÓN AL REGISTRAR:', e);
        alert('Error desconocido al registrar cliente. Verifique la conexión a Supabase.');
    }
}

window.handleDeleteClientClick = function(clientId) {
    // Forzamos que sea un string para evitar fallos de tipos
    const idStr = String(clientId);
    window.clientToDeleteId = idStr; // <--- Cambiado para coincidir con confirmDeleteClient
    
    const cliente = window.allClientsMap ? window.allClientsMap[idStr] : null;
    const placeholder = document.getElementById('delete-client-name-placeholder');
    
    if (placeholder) {
        if (cliente) {
            placeholder.textContent = cliente.name;
        } else {
            // Intento de rescate si el mapa falló
            const cArray = window.allClients.find(c => String(c.client_id) === idStr);
            placeholder.textContent = cArray ? cArray.name : "Cliente #" + idStr;
        }
    }
    openModal('delete-client-modal');
};

async function confirmDeleteClient() {
    // Ahora sí coinciden las variables
    const idToDelete = window.clientToDeleteId; 

    if (!idToDelete || idToDelete === "null") {
        alert("Error: No se seleccionó un cliente válido.");
        return;
    }

    const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('client_id', idToDelete); 

    if (error) {
        if (error.code === '23503') {
            alert('❌ No se puede eliminar: El cliente tiene historial de ventas activo.');
        } else {
            alert('❌ Error: ' + error.message);
        }
    } else {
        alert('✅ Cliente eliminado definitivamente.');
        // Importante: Recargar el mapa global después de borrar
        if (window.loadAllClientsMap) await window.loadAllClientsMap();
        await loadDashboardData(); 
    }
    
    closeModal('delete-client-modal'); 
    window.clientToDeleteId = null; 
}

window.handleEditClientClick = function(clientId) {
    // 🛑 FILTRO DE SEGURIDAD: Si entra un null o un objeto de evento, abortamos.
    if (!clientId || typeof clientId === 'object') return;

    console.log("Editando cliente ID:", clientId);
    
    const idStr = String(clientId);
    let cliente = window.allClientsMap ? window.allClientsMap[idStr] : null;

    if (!cliente && window.allClients) {
        cliente = window.allClients.find(c => String(c.client_id) === idStr);
    }

    if (!cliente) {
        console.warn("Cliente no encontrado en memoria para ID:", idStr);
        return;
    }

    // Llenado de campos...
    const idInput = document.getElementById('edit-client-id');
    const nameInput = document.getElementById('edit-client-name');
    const phoneInput = document.getElementById('edit-client-phone');

    if (idInput) idInput.value = cliente.client_id;
    if (nameInput) nameInput.value = cliente.name || '';
    if (phoneInput) phoneInput.value = cliente.telefono || '';

    openModal('edit-client-modal');
};
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
// 11. DETALLE Y ABONO DE VENTA 
window.handleRegisterPayment = async function(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation(); // 🛑 Evita que se disparen otros eventos
    }
    
    const clientId = document.getElementById('abono-client-id')?.value;
    const amountStr = document.getElementById('abono-amount')?.value;
    const metodo_pago = document.getElementById('payment-method-abono')?.value;
    const paymentAmount = parseFloat(amountStr);
    const nombreCliente = document.getElementById('abono-client-name-display')?.textContent || "Cliente";

    if (!clientId || isNaN(paymentAmount) || paymentAmount <= 0 || !metodo_pago) {
        alert("⚠️ Por favor completa todos los campos correctamente.");
        return;
    }

    const btn = document.getElementById('btn-confirm-abono');
    try {
        if (btn) { btn.disabled = true; btn.innerText = "PROCESANDO..."; }

        const { data: ventas, error: fErr } = await supabase
            .from('ventas')
            .select('venta_id, saldo_pendiente, paid_amount')
            .eq('client_id', clientId).gt('saldo_pendiente', 0).order('created_at', { ascending: true });

        if (fErr) throw fErr;

        let restante = paymentAmount;
        let historial = [];

        for (let v of ventas) {
            if (restante <= 0) break;
            let pago = Math.min(restante, v.saldo_pendiente);
            
            await supabase.from('pagos').insert([{ 
                venta_id: v.venta_id, client_id: clientId, amount: pago, metodo_pago 
            }]);

            await supabase.from('ventas').update({ 
                saldo_pendiente: v.saldo_pendiente - pago,
                paid_amount: (v.paid_amount || 0) + pago 
            }).eq('venta_id', v.venta_id);

            historial.push({ id: v.id || v.venta_id, monto: pago });
            restante -= pago;
        }

        // Actualizar deuda total cliente
        const { data: vts } = await supabase.from('ventas').select('saldo_pendiente').eq('client_id', clientId);
        const nuevaDeudaTotal = vts.reduce((acc, v) => acc + (v.saldo_pendiente || 0), 0);
        await supabase.from('clientes').update({ deuda_total: nuevaDeudaTotal }).eq('client_id', clientId);

        // Feedback y PDF
        if (confirm(`✅ Pago de $${paymentAmount} registrado. ¿Generar comprobante PDF?`)) {
            window.generarComprobanteAbono({
                cliente: nombreCliente,
                montoTotal: paymentAmount,
                metodo: metodo_pago,
                distribucion: historial,
                deudaRestante: nuevaDeudaTotal
            });
        }

        // Refresco de interfaz
        closeModal('abono-client-modal');
        if (typeof window.loadDebts === 'function') await window.loadDebts();
        if (typeof window.loadDashboardData === 'function') await window.loadDashboardData();

    } catch (err) {
        console.error(err);
        alert("Error al procesar abono");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Confirmar Pago en Cascada"; }
    }
};

window.openAbonoModal = function(id, name, remainingDebt = null) {
    
    // 1. Asignar el ID a la variable global (Usado por handleRecordAbono)
    window.debtToPayId = id; 

    // 2. Determinar el contexto
    // Usamos allClientsMap para saber si el ID es un cliente.
    const isClientId = window.allClientsMap[id] !== undefined;

    // 3. Obtener referencias del modal
    const clientIdInput = document.getElementById('abono-client-id-input');
    const clientNameDisplay = document.getElementById('abono-client-name-display');
    // Asegúrese de que este ID exista en su HTML (contenedor de saldo pendiente)
    const debtDisplayContainer = document.getElementById('abono-debt-info-container'); 
    const currentDebtSpan = document.getElementById('abono-current-debt');
    const modalTitle = document.querySelector('#modal-record-abono h3');

    // 4. Inyectar datos en el formulario y ajustar la interfaz
    
    // El ID principal (client_id o venta_id) va al input oculto
    if (clientIdInput) {
        clientIdInput.value = id; 
    }

    if (clientNameDisplay) {
        let nameText = isClientId ? `Deuda General de: ${name}` : `Venta #${id} de ${name}`;
        clientNameDisplay.textContent = nameText;
    }
    
    if (modalTitle) {
         // Ajustamos el título del modal según el tipo de abono
        modalTitle.textContent = isClientId ? 'Registrar Abono General' : 'Registrar Pago a Venta Específica';
    }

    // 5. Mostrar/Ocultar el saldo pendiente
    if (remainingDebt !== null && remainingDebt > 0) {
        if (debtDisplayContainer) debtDisplayContainer.classList.remove('hidden');
        if (currentDebtSpan) currentDebtSpan.textContent = formatCurrency(remainingDebt);
    } else {
        // Ocultar si no hay deuda o si es abono general (la deuda se ve en el reporte)
        if (debtDisplayContainer) debtDisplayContainer.classList.add('hidden');
    }

    // 6. Limpia el formulario (excepto el input oculto) y abre el modal
    document.getElementById('abono-client-form')?.reset();
    openModal('modal-record-abono');
};

// ====================================================================
// ✅ FUNCIÓN CRÍTICA: REGISTRO DE ABONO A UNA VENTA ESPECÍFICA
// ====================================================================
// ====================================================================
// FUNCIÓN: REGISTRO DE ABONO A UNA VENTA ESPECÍFICA (Tabla 'pagos')
// Debe ser llamada por el listener del formulario 'register-payment-form'
// ====================================================================
async function handleSaleAbono(e) {
    e.preventDefault(); 
    if (!supabase) {
        console.error("Supabase no está inicializado.");
        return;
    }

    // 1. OBTENER DATOS CON LOS NUEVOS IDs
    // Asumimos que los IDs del HTML fueron renombrados para evitar el conflicto.
    const abonoAmountInput = document.getElementById('abono-amount-sale');
    const paymentMethod = document.getElementById('payment-method-sale').value; 
    const ventaId = document.getElementById('payment-sale-id').value; 
    // viewingClientId es una variable global establecida en handleViewSaleDetails
    const clientId = viewingClientId; 

    // 2. PROCESAR MONTO (Robusto contra formato o valor vacío)
    let amount = abonoAmountInput ? abonoAmountInput.valueAsNumber : 0;
    
    // Fallback para manejar comas (,) como separador decimal si el navegador no lo soporta
    if (isNaN(amount)) {
        const cleanedStr = abonoAmountInput.value.replace(',', '.');
        amount = parseFloat(cleanedStr) || 0; // Asegura que si es inválido, sea 0
    }
    
    // 3. VALIDACIÓN 
    if (amount <= 0 || !ventaId || !clientId) {
        alert('Por favor, ingresa un monto de abono válido y asegúrate de que la venta y el cliente estén cargados.'); 
        return;
    }
    
    try {
        // 4. PRE-CÁLCULO: Calcular el nuevo saldo pendiente
        const currentSaldoPendienteElement = document.getElementById('detail-saldo-pendiente');
        // Limpiamos el texto de moneda (asumiendo que formatCurrency lo formatea)
        const currentSaldoStr = currentSaldoPendienteElement.textContent.replace(/[^\d.,-]/g, '').replace(',', '.'); 
        const currentSaldo = parseFloat(currentSaldoStr);

        if (isNaN(currentSaldo)) {
             throw new Error("Error de cálculo: Saldo pendiente actual no es un número válido.");
        }
        
        const newSaldoPendiente = currentSaldo - amount;

        // 5. INSERTAR REGISTRO EN LA TABLA 'pagos'
        const { error: paymentError } = await supabase
            .from('pagos')
            .insert([{
                venta_id: ventaId,
                client_id: clientId,
                amount: amount,
                metodo_pago: paymentMethod,
            }]);

        if (paymentError) throw paymentError;

        // 6. ACTUALIZAR EL SALDO PENDIENTE EN LA TABLA 'ventas'
        const { error: updateError } = await supabase
            .from('ventas')
            .update({ saldo_pendiente: newSaldoPendiente })
            .eq('venta_id', ventaId);
            
        if (updateError) throw updateError;
        
        // 7. ÉXITO Y ACTUALIZACIÓN DE UI
        alert('✅ Abono registrado con éxito. Saldo pendiente actualizado.');
        
        // Limpiar el campo de monto
        abonoAmountInput.value = ''; 

        // Recargar el contenido del modal de venta actual (para ver el nuevo saldo y el pago)
        window.handleViewSaleDetails(ventaId, clientId); 

        // Recargar los datos generales (dashboard y tabla) para reflejar el cambio en la deuda general
        // Asegúrese de que loadDashboardData y loadClientsTable existan.
        await loadDashboardData();
        await loadClientsTable('gestion'); 

    } catch (error) {
        console.error('Error al registrar abono en venta:', error);
        alert(`Hubo un error al registrar el abono: ${error.message}`);
    }
}

// ====================================================================
// 12. MANEJO DE REPORTES Y VENTAS MENSUALES
// ====================================================================
window.handleViewAction = async function(btn, ventaId, clientId) {
    btn.classList.add('btn-loading'); // Activa el spinner
    try {
        await handleViewSaleDetails(ventaId, clientId);
    // 3. Abrir modal
        openModal('modal-detalle-venta'); 
    } finally {
        btn.classList.remove('loading');
    }
    
};

window.handleDeleteAction = async function(btn, ventaId, month, year) {
    // Aquí no activamos el spinner de inmediato porque suele haber un modal de confirmación primero.
    // Solo pasamos el ID al proceso de eliminación que ya tienes.
    handleDeleteSale(ventaId, month, year);
};

window.loadMonthlySalesReport = function(selectedMonthFromEvent, selectedYearFromEvent) {
    (async () => {
        if (!supabase) return;

        const reportBody = document.getElementById('monthly-sales-report-body');
        const totalSalesEl = document.getElementById('report-total-sales');
        const totalDebtEl = document.getElementById('report-total-debt-generated');
        const noDataMessage = document.getElementById('monthly-report-no-data');

        if (!reportBody || !totalSalesEl || !totalDebtEl || !noDataMessage) return;

        // 1. Estado de carga: ICONO NARANJA SÓLIDO Y FUENTE SANS
        reportBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-24 text-center">
                    <div class="flex flex-col justify-center items-center">
                        <div class="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 animate-pulse mb-4">
                            <i class="fas fa-chart-line text-xl"></i>
                        </div>
                        <span class="text-[11px] font-bold uppercase tracking-[0.3em] text-white/30 font-sans">Sincronizando Reporte</span>
                    </div>
                </td>
            </tr>`;
        
        try {
            const currentMonthNum = new Date().getMonth() + 1;
            const currentYearNum = new Date().getFullYear();
            let selectedMonth = (selectedMonthFromEvent >= 1 && selectedMonthFromEvent <= 12) ? selectedMonthFromEvent : currentMonthNum;
            let selectedYear = (selectedYearFromEvent >= 2020) ? selectedYearFromEvent : currentYearNum;

            let startDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
            let nextDate = new Date(Date.UTC(selectedYear, selectedMonth, 1));
            
            const { data: sales, error } = await supabase
                .from('ventas')
                .select(`venta_id, client_id, created_at, total_amount, saldo_pendiente, metodo_pago, clientes(name)`)
                .gte('created_at', startDate.toISOString())
                .lt('created_at', nextDate.toISOString()) 
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            let totalSales = 0;
            let totalDebtGenerated = 0;
            reportBody.innerHTML = ''; 

            if (sales && sales.length > 0) {
                sales.forEach(sale => {
                    totalSales += sale.total_amount;
                    totalDebtGenerated += sale.saldo_pendiente;
                    
                    const clientName = sale.clientes?.name || 'Cliente Final';
                    const dateObj = new Date(sale.created_at);
                    const day = dateObj.toLocaleDateString('es-MX', { day: '2-digit' });
                    const month = dateObj.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase().replace('.', '');
                    
                    const tienePendiente = sale.saldo_pendiente > 0.01;
                    
                    const rowHTML = `
                        <tr class="group border-b border-white/5 hover:bg-white/[0.02] transition-all duration-300">
                            <td class="px-8 py-5 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-lg h-10 w-10 mr-4 group-hover:border-orange-500/30 transition-colors">
                                        <span class="text-[12px] font-bold text-white leading-none font-sans">${day}</span>
                                        <span class="text-[9px] font-bold text-orange-500 leading-none mt-1 font-sans">${month}</span>
                                    </div>
                                    <div>
                                        <span class="font-sans font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded text-[9px] block w-fit">
                                            ID #${sale.venta_id}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td class="px-8 py-5 whitespace-nowrap">
                                <div class="text-sm font-bold text-white uppercase tracking-wide font-sans">${clientName}</div>
                                <div class="text-[12px] text-white/30 font-sans mt-0.5 tracking-[0.1em] uppercase font-bold">${sale.metodo_pago || 'CONTADO'}</div>
                            </td>
                            <td class="px-8 py-5 whitespace-nowrap text-right">
                                <div class="text-[12px] text-white/50 uppercase font-bold mb-1 font-sans tracking-widest text-right">Total Venta</div>
                                <div class="text-sm font-bold text-white font-mono">${formatCurrency(sale.total_amount)}</div>
                            </td>
                            <td class="px-8 py-5 whitespace-nowrap text-right">
                                <div class="text-[12px] text-white/50 uppercase font-bold mb-1 font-sans tracking-widest text-right">Pendiente</div>
                                <div class="glass-badge ${tienePendiente ? 'glass-badge-danger' : 'glass-badge-success'} inline-flex ml-auto">
                                    <span class="flex items-center font-bold font-sans text-[16px]">
                                        <span class="h-1.5 w-1.5 rounded-full ${tienePendiente ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'} mr-2"></span>
                                        ${formatCurrency(sale.saldo_pendiente)}
                                    </span>
                                </div>
                            </td>
                            <td class="px-8 py-5 whitespace-nowrap text-right">
                                <div class="flex justify-end items-center space-x-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                    <button onclick="handleViewAction(this, '${sale.venta_id}', '${sale.client_id}')" 
                                            class="text-white/40 hover:text-blue-500 transition-colors" title="Ver Venta">
                                    <i class="fas fa-eye text-[15px]"></i>
                                    </button>
                                    <button onclick="handleDeleteAction(this, '${sale.venta_id}', ${selectedMonth}, ${selectedYear})" 
                                            class="text-white/40 hover:text-red-500 transition-colors" title="Anular Venta">
                                     <i class="fas fa-trash-alt text-[15px]"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>`;
                    reportBody.insertAdjacentHTML('beforeend', rowHTML); 
                });
                noDataMessage.classList.add('hidden'); 
            } else {
                noDataMessage.classList.remove('hidden'); 
                reportBody.innerHTML = `<tr><td colspan="5" class="px-6 py-20 text-center text-white/10 uppercase text-[10px] tracking-[0.4em] font-sans font-bold">Sin actividad comercial</td></tr>`;
            }
            
            // TOTALES EN FOOTER
            totalSalesEl.innerHTML = `<span class="text-white font-black font-sans italic">${formatCurrency(totalSales)}</span>`;
totalDebtEl.innerHTML = `<span class="${totalDebtGenerated > 0 ? 'text-red-500' : 'text-white/20'} font-black font-sans italic">${formatCurrency(totalDebtGenerated)}</span>`;

        } catch (e) {
            console.error('Error:', e);
            reportBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-red-500 font-sans uppercase text-[10px] tracking-widest font-bold">Fallo en la comunicación con servidor</td></tr>';
        }
    })();
}

//Borrar venta
window.handleDeleteSale = async function(ventaId, currentMonth, currentYear) {
    if (!supabase) {
        alert("Error de conexión a la base de datos.");
        return;
    }

    const confirmDeletion = confirm(
        `ADVERTENCIA: ¿Está seguro de que desea eliminar la Venta #${ventaId}? 
        
        Esta acción es irreversible, eliminará todos los detalles y pagos asociados, y afectará la deuda del cliente.
        
        Presione OK para continuar.`
    );

    if (!confirmDeletion) {
        return;
    }

    try {
        // 1. Eliminación en Supabase
        // (Asumimos que las cascadas están configuradas para detalle_ventas y pagos)
        const { error } = await supabase
            .from('ventas')
            .delete()
            .eq('venta_id', ventaId);

        if (error) {
             // Detalle de error para el desarrollador
            console.error("Error de eliminación en Supabase:", error);
            if (error.code === '23503') { // Código de error común para violación de FK (si las cascadas no están)
                throw new Error("Violación de restricción: La venta tiene registros asociados que no se pudieron eliminar. Revise las reglas de 'ON DELETE CASCADE' en su base de datos.");
            }
            throw error;
        }

        // 2. Éxito: Notificar y Recargar el Reporte
        alert(`Venta #${ventaId} eliminada exitosamente.`);
        
        // Recargar el reporte mensual con los mismos filtros
        if (typeof loadMonthlySalesReport === 'function') {
            await loadMonthlySalesReport(currentMonth, currentYear); 
        } else {
            // Último recurso si la recarga falla (NO RECOMENDADO)
            location.reload(); 
        }
        
    } catch (e) {
        console.error('Error al eliminar la venta:', e);
        alert(`Error al eliminar la venta. Detalles: ${e.message}`);
    } 
}

function initializeMonthSelector() {
    // CRÍTICO: Debe buscar el ID 'report-month-select'
    const selector = document.getElementById('report-month-select'); 
    if (!selector) return;

    selector.innerHTML = ''; 
    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const currentMonth = new Date().getMonth() + 1; // 1 (Enero) a 12 (Diciembre)

    monthNames.forEach((name, index) => {
        const value = index + 1;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        
        if (value === currentMonth) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
}

// ====================================================================
// FUNCIÓN AUXILIAR: LLENA EL SELECTOR DE AÑOS (SOLUCIÓN AL PUNTO 1)
// ====================================================================
function initializeYearSelector() {
    // CRÍTICO: Debe buscar el ID 'report-year-select'
    const selector = document.getElementById('report-year-select'); 
    if (!selector) return;

    selector.innerHTML = '';
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2; 

    // Generar años desde el actual (+1) hasta 2 años atrás
    for (let year = currentYear + 1; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        
        if (year === currentYear) {
            option.selected = true;
        }
        selector.appendChild(option);
    }
}

// ====================================================================
// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN Y LISTENERS (SOLUCIÓN AL PUNTO 2)
// ====================================================================

function initReportSelectors() {
    const monthSelect = document.getElementById('report-month-select');
    const yearSelect = document.getElementById('report-year-select');

    if (!monthSelect || !yearSelect) {
        console.error("ERROR CRÍTICO: No se encontraron los selectores de Mes/Año del reporte.");
        return;
    }

    // 1. Datos para Llenar Selectores
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const startYear = 2024;
    const months = [
        { value: 1, name: 'Enero' }, { value: 2, name: 'Febrero' }, { value: 3, name: 'Marzo' },
        { value: 4, name: 'Abril' }, { value: 5, name: 'Mayo' }, { value: 6, name: 'Junio' },
        { value: 7, name: 'Julio' }, { value: 8, name: 'Agosto' }, { value: 9, name: 'Septiembre' },
        { value: 10, name: 'Octubre' }, { value: 11, name: 'Noviembre' }, { value: 12, name: 'Diciembre' }
    ];

    // 2. Llenar Meses
    monthSelect.innerHTML = '';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.name;
        monthSelect.appendChild(option);
    });

    // 3. Llenar Años
    yearSelect.innerHTML = '';
    for (let year = currentYear + 1; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // 4. Seleccionar el Mes y Año Actual por defecto
    monthSelect.value = currentMonth;
    yearSelect.value = currentYear;

   // console.log(`Inicializando selectores de reporte (Mes/Año) por primera vez...`);

    const handleChange = () => {
        const selectedMonth = parseInt(monthSelect.value) || currentMonth;
        const selectedYear = parseInt(yearSelect.value) || currentYear;

        //console.log(`[INIT SELECTORS] Llamada directa (SÍNCRONA) para Mes: ${selectedMonth}, Año: ${selectedYear}`);

        // 🛑 SOLUCIÓN SÍNCRONA: Eliminamos el setTimeout
        if (typeof loadMonthlySalesReport === 'function') {
            loadMonthlySalesReport(selectedMonth, selectedYear); 
        } else {
            console.error("ERROR: loadMonthlySalesReport no es una función accesible.");
        }
    };
    
    // 6. Adjuntar Listeners directamente
    monthSelect.addEventListener('change', handleChange);
    yearSelect.addEventListener('change', handleChange);
    
    // 7. Carga inicial
    setTimeout(() => {
        const finalMonth = parseInt(monthSelect.value) || currentMonth;
        const finalYear = parseInt(yearSelect.value) || currentYear;

        // 🛑 CORRECCIÓN DE ÁMBITO: Llamada directa, sin 'window.'
        if (typeof loadMonthlySalesReport === 'function') {
          //  console.log(`[CARGA INICIAL ÉXITO] Reporte programado para Mes: ${finalMonth}, Año: ${finalYear}`);
            // 🚀 ESTO ES LO QUE ARREGLA LA CARGA INICIAL
            loadMonthlySalesReport(finalMonth, finalYear); 
        }
    }, 10);
}

function generateTextTicket(sale) {
    const TICKET_WIDTH = 32;

    // Helper 1: Alinea la etiqueta a la izquierda y el valor a la derecha (para totales)
    const alignValueRight = (label, value) => {
        const valueStr = formatCurrency(value);
        // Calcula el relleno necesario para empujar el valor al final
        const padding = TICKET_WIDTH - label.length - valueStr.length;
        return label + " ".repeat(padding) + valueStr;
    };
    
    // Helper 2: Centra el texto completo
    const alignCenter = (text) => {
        const padding = TICKET_WIDTH - text.length;
        // Divide el espacio restante y redondea hacia abajo para el relleno izquierdo
        const paddingLeft = Math.floor(padding / 2); 
        return " ".repeat(paddingLeft) + text;
    };
    
    // --- 1. ENCABEZADO DE LA EMPRESA ---
    let ticket = alignCenter("Creativa Cortes CNC") + "\n"; // Usamos alignCenter para centrar
    ticket += "--------------------------------\n";
    ticket += "\n";
    
    // 💡 Usamos alignCenter para los datos de contacto
    ticket += alignCenter("Tel: 9851001141") + "\n";
    ticket += alignCenter("Dirección: Calle 33 x 48 y 46") + "\n";
    ticket += alignCenter("Col. Candelaria") + "\n";
    // Eliminamos la línea duplicada de Teléfono
    
    ticket += "Fecha: " + new Date(sale.created_at).toLocaleDateString('es-MX') + "\n";
    ticket += "Venta: " + sale.venta_id + "\n";
    ticket += "--------------------------------\n";
    
    // --- 2. CLIENTE ---
    const clientName = sale.clientes?.name || 'Consumidor Final';
    ticket += "Cliente: " + clientName + "\n";
    ticket += "================================\n";
    ticket += "\n";

    // --- 3. DETALLE DE PRODUCTOS ---
    // 💡 Usamos espaciado fijo aquí, no espacios literales que pueden fallar
    ticket += "Producto             Cant.  Total\n";
    ticket += "--------------------------------\n";
    
    sale.detalle_ventas.forEach(item => {
        const productName = item.productos.name;
        // Nombre truncado a 18 caracteres y rellenado
        const prodName = productName.substring(0, 18).padEnd(18, ' ');
        const quantity = item.quantity.toString().padStart(5, ' ');
        const subtotal = formatCurrency(item.subtotal).padStart(6, ' ');
        
        ticket += `${prodName} ${quantity} ${subtotal}\n`;
    });
    
    ticket += "--------------------------------\n";
    ticket += "\n";
    
    // --- 4. TOTALES ---
    const totalAmount = sale.total_amount || 0;
    const saldoPendiente = sale.saldo_pendiente || 0;
    const anticipo = totalAmount - saldoPendiente;

    // ✅ Usamos la función renombrada alignValueRight
    ticket += alignValueRight("SALDO PENDIENTE:", saldoPendiente) + "\n"; 
    ticket += alignValueRight("ANTICIPO:", anticipo) + "\n";
    ticket += "================================\n";
    ticket += alignValueRight("TOTAL:", totalAmount) + "\n";
    ticket += "================================\n";


    // --- 5. PIE DE PÁGINA ---
    ticket += "\n";
    // ⬇️ USAMOS alignCenter
    ticket += alignCenter("¡Gracias por su compra!") + "\n";
    ticket += "\n";
    ticket += "--------------------------------\n";

    return ticket;
}

// Variable global para guardar el ID de la venta en vista previa
let CURRENT_SALE_ID = null; 

async function showTicketPreviewModal(ventaId) {
    // 1. Obtener datos de Supabase
    const { data: sale, error } = await supabase
        .from('ventas')
        .select(`*, clientes(name), detalle_ventas (quantity, price, subtotal, productos(name))`)
        .eq('venta_id', ventaId)
        .single();
    
    if (error || !sale) return;

    // 2. Generar el ticket como texto plano formateado
    const ticketContent = generateTextTicket(sale); 
    
    // 3. CRÍTICO: Envolver el contenido en <pre> para asegurar que:
    //    a) Se respeten los saltos de línea (\n).
    //    b) Se respete el espaciado fijo de los métodos padStart/padEnd.
    //    c) Se use la fuente 'monospace' para que todos los caracteres tengan el mismo ancho.
    const htmlContent = `<pre style="font-family: monospace; font-size: 14px; margin: 0 auto; text-align: left;">${ticketContent}</pre>`;

    // 4. Inyectar y mostrar
    const ticketPreviewContent = document.getElementById('ticket-preview-content');
    
    if (ticketPreviewContent) { 
        ticketPreviewContent.innerHTML = htmlContent;
    }

    CURRENT_SALE_ID = ventaId; 
    openModal('modal-ticket-preview');
}
window.showTicketPreviewModal = showTicketPreviewModal;

// La función que se llama al hacer clic en el botón Imprimir
async function printTicketQZ(ventaId) {
    // 1. Obtener los datos de la venta (La misma consulta que usas en el modal)
    const { data: sale, error } = await supabase
        .from('ventas')
        .select(`*, clientes(name), detalle_ventas (quantity, price, subtotal, productos(name))`)
        .eq('venta_id', ventaId)
        .single();
    
    if (error || !sale) {
        console.error('Error al obtener datos para impresión:', error?.message);
        return;
    }

    // 2. Generar el ticket en texto plano
    // Utilizamos la función que acabamos de crear:
    const ticketText = generateTextTicket(sale); 

    // 3. Imprimir usando QZ Tray
    if (!qz.websocket.isActive()) {
        alert("QZ Tray no está conectado. Por favor, asegúrate de que esté corriendo y recarga la página.");
        return;
    }

    try {
        // Enviar el contenido del ticket
        const data = [
            // El formato 'raw' envía el texto directamente a la impresora
            { type: 'raw', data: ticketText },
            // Comando para cortar el papel (necesario en la mayoría de las impresoras térmicas)
            { type: 'raw', data: '\x1D\x56\x41\x00' } // ESC/POS Comando: GS V 0 (Full Cut)
        ];

        // 💡 CRÍTICO: Modifica 'Mi Impresora de Tickets' con el nombre de tu impresora 
        const config = qz.configs.create('XP-58 (copy 1)', { 
             encoding: '858', // Codificación de caracteres para manejar tildes (Latin-1)
             // Puedes ajustar más settings aquí, como el margen o la densidad
        });

        await qz.print(config, data);
        console.log('Ticket enviado a la impresora correctamente.');

    } catch (e) {
        alert('Error de impresión con QZ Tray. Revisa la consola para más detalles.');
        console.error(e);
    }
}

// ====================================================================
// UTILIDADES/CARGAS
// ====================================================================

async function loadAllClientsMap() {
    // 1. Traemos todos los campos importantes
    const { data: clients, error } = await supabase
        .from('clientes') 
        .select('*'); 

    if (error) {
        console.error("Error al cargar datos de clientes para el mapa:", error);
        return;
    }

    // 2. Construimos el mapa guardando el OBJETO, no solo el nombre
    allClientsMap = clients.reduce((map, client) => {
        // Guardamos todo el registro indexado por su ID
        map[client.client_id] = client; 
        return map;
    }, {});

    // 3. Lo hacemos disponible globalmente para todas las funciones
    window.allClientsMap = allClientsMap;
    console.log("✅ Mapa de clientes sincronizado:", Object.keys(allClientsMap).length, "registros.");
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

window.loadAndRenderProducts = async function() {
    console.log("🔄 Sincronizando inventario con Supabase...");
    
    try {
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .order('name', { ascending: true }); // Ordenar por nombre suele ser más útil para el usuario

        if (error) throw error;

        // 1. ACTUALIZAR VARIABLES GLOBALES
        window.allProducts = data || [];
        window.allProductsMap = Object.fromEntries(
            window.allProducts.map(p => [String(p.producto_id), p])
        );

        const tableBody = document.getElementById('products-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = ''; 

        if (window.allProducts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                        <i class="fas fa-box-open text-4xl mb-3 block opacity-20"></i>
                        No hay productos registrados en el inventario.
                    </td>
                </tr>`;
            return;
        }

        // 2. DIBUJAR LA TABLA CON ESTILO PREMIUM
        window.allProducts.forEach(producto => {
            // Lógica para detectar si es subproducto y quién es el padre
            let parentBadge = '';
            if (producto.type === 'PACKAGE' && producto.parent_product) {
                const parent = window.allProductsMap[String(producto.parent_product)];
                parentBadge = parent 
                    ? `<div class="flex items-center text-[10px] text-indigo-500 mt-1 font-medium bg-indigo-50 w-fit px-1.5 py-0.5 rounded">
                         <i class="fas fa-link mr-1 text-[8px]"></i> Vinculado a: ${parent.name}
                       </div>` 
                    : '';
            }

            // Estilos de Badge por tipo
            const isPackage = producto.type === 'PACKAGE';
            const badgeClass = isPackage 
                ? 'bg-purple-50 text-purple-700 ring-purple-700/10' 
                : 'bg-blue-50 text-blue-700 ring-blue-700/10';
            const icon = isPackage ? 'fa-boxes' : 'fa-box';

            const row = document.createElement('tr');
            row.className = 'group hover:bg-slate-50/50 border-b border-slate-100 transition-colors';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">ID #${producto.producto_id}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mr-3 border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <i class="fas ${icon} text-xs"></i>
                        </div>
                        <div>
                            <div class="text-sm font-bold text-slate-800">${producto.name}</div>
                            ${parentBadge}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ring-1 ring-inset ${badgeClass}">
                        ${isPackage ? 'SUBPRODUCTO' : 'INDIVIDUAL'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Precio Unitario</div>
                    <div class="text-sm font-black text-emerald-600">${formatCurrency(producto.price || 0)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button onclick="handleEditProductClick(${producto.producto_id})" 
                                class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Editar">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button onclick="handleDeleteProductClick(${producto.producto_id})" 
                                class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // 3. ACTUALIZAR SELECTORES DE "PADRE" (Llamada a la función que creamos antes)
        if (typeof window.populateParentSelectors === 'function') {
            window.populateParentSelectors();
        }

        console.log("✅ Interfaz de productos actualizada.");

    } catch (err) {
        console.error("❌ Error fatal en carga de productos:", err.message);
    }
};

async function loadAllProductsMap() {
    console.log("Cargando mapa de productos...");
    
    // ASUMO QUE 'supabase' ESTÁ CORRECTAMENTE INICIALIZADO AQUÍ
    const { data: products, error } = await supabase
        .from('productos')
        .select('*'); 

    if (error) {
        console.error("Error al cargar datos de productos para el mapa:", error);
        window.allProducts = []; 
        window.allProductsMap = {};
        return;
    }
    
    // 🛑 CRÍTICO: Procesar y limpiar los datos antes de guardarlos
    const processedProducts = products.map(p => ({
        ...p,
        // Limpieza forzada de la propiedad 'type' (solución al problema persistente)
        type: String(p.type || '').trim().toUpperCase()
    }));

    // 1. Asignar al array global para el renderizado
    window.allProducts = processedProducts || []; 
    
    // 2. Llenar el mapa: { 'ID_DEL_PRODUCTO': OBJETO_COMPLETO }
    window.allProductsMap = processedProducts.reduce((map, product) => {
        map[String(product.producto_id)] = product; 
        return map;
    }, {});
    
    console.log(`✅ Mapa y Array de ${window.allProducts.length} productos cargados y limpiados.`);
}
function formatDate(isoDateString) {
    if (!isoDateString) {
        return 'N/A';
    }

    try {
        // 1. Crear un objeto Date a partir de la cadena ISO (maneja la conversión UTC)
        const date = new Date(isoDateString);

        // 2. Opciones de formato: queremos solo la fecha en formato corto.
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            // Opcional: Si quieres forzar la hora local y evitar problemas de desfase horario:
            // timeZone: 'America/Mexico_City', 
        };

        // 3. Devolver la fecha formateada para el local en español (ej: 28/11/2025)
        // Usamos 'es-MX' o 'es-ES' para asegurar el formato DD/MM/YYYY
        return date.toLocaleDateString('es-MX', options);

    } catch (e) {
        console.error("Error al formatear la fecha:", e, isoDateString);
        return 'Fecha inválida';
    }
}

document.addEventListener('DOMContentLoaded', async () => { 

    // ====================================================================
    // 0. FUNCIONES UTILITY PARA MANEJO DE MODALES (¡CRÍTICO: VAN PRIMERO!)
    // ====================================================================
// CRÍTICO: La función base DEBE ser asíncrona.
async function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Error: Modal con ID '${modalId}' no encontrado.`);
        return; 
    }

    // 1. --- Gestión Específica por Modal (Carga de Datos) ---
    // Si el modal es el de Producto, ejecutamos la función de precarga.
    if (modalId === 'new-product-modal') {
        // Asume que esta función (Paso 3) solo carga y prepara los selects, sin abrir el modal.
        if (typeof window.openNewProductModal === 'function') {
            await window.openNewProductModal(); 
        }
    }
    // Si tienes más lógica de precarga, iría aquí (e.g., new-sale-modal)
    
    // 2. --- Lógica Universal para Mostrar el Modal ---
    modal.classList.remove('hidden'); 
    modal.classList.add('flex');
}

// --- Apertura Universal para botones con data-open-modal ---
document.querySelectorAll('[data-open-modal]').forEach(button => {
    // CRÍTICO: Hacemos el listener asíncrono.
    button.addEventListener('click', async (e) => { 
        e.preventDefault();
        const modalId = button.getAttribute('data-open-modal');
        // Llamamos a la función ASÍNCRONA y esperamos a que cargue los datos
        await openModal(modalId); 
    });
});

// Esta función ahora solo prepara los datos y los selects del modal de producto
window.openNewProductModal = async function() {
    
      
    // 2. LLENAR EL SELECT padre (CRÍTICO: Esto usa los datos recién cargados)
    await window.loadMainProductsAndPopulateSelect(); 
    
    // 3. Configuración inicial de UI (si es necesario)
    const typeSelect = document.getElementById('new-product-type');
    if (typeSelect && window.handleProductTypeChange) {
        // Ponemos el valor por defecto y disparamos la función de ocultar/mostrar el select padre
        typeSelect.value = 'PRODUCT'; 
        window.handleProductTypeChange();
    }
};

    // --- Cierre de Modales Universal (Botones 'X' y al hacer clic fuera) ---
    document.querySelectorAll('[data-close-modal]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = button.getAttribute('data-close-modal');
            closeModal(modalId);
        });
    });

    // Cierre universal al hacer clic fuera
    document.addEventListener('click', (event) => {
        const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
        openModals.forEach(modal => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
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
    
// ====================================================================
// FUNCIONES Y LISTENERS PARA CAMBIO DE VISTA
// ====================================================================

// Agregamos window. al inicio para que el HTML (onclick) siempre la encuentre
window.switchView = async function(viewId) {
    console.log(`Cambiando a vista: ${viewId}`);

    // 1. Gestión Visual (Menú y Vistas)
    document.querySelectorAll('.menu-item').forEach(link => {
        link.classList.remove('active-menu-item');
    });
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.remove('hidden');
    
    const activeLink = document.querySelector(`[data-view="${viewId}"]`);
    if (activeLink) activeLink.classList.add('active-menu-item');

    // 2. Carga de Datos Dinámica
    try {
        if (viewId === 'home-view') {
            if (typeof loadDashboardData === 'function') await loadDashboardData();
        } 
        
        else if (viewId === 'deudas-view') {
            // Recargamos la tabla de deudas
            if (typeof loadDebtsTable === 'function') {
                await loadDebtsTable();
            } else if (typeof loadDebts === 'function') {
                await loadDebts();
            }
            // Actualizamos las tarjetas superiores de deuda con datos frescos
            if (typeof actualizarMetricasDeudas === 'function') {
                await actualizarMetricasDeudas(window.allClients);
            }
        }

        else if (viewId === 'report-view') {
            console.log("📊 Refrescando reportes...");
            // 1. Forzamos la recarga de ventas para incluir la última venta realizada
            if (typeof window.loadSalesData === 'function') {
                await window.loadSalesData();
            }
            
            // 2. Llamamos a la función que procesa los datos y dibuja los Charts
            // En tu main.js se llama initReportView
            if (typeof window.initReportView === 'function') {
                window.initReportView();
            }
        }

        else if (viewId === 'sales-view') {
            // Opcional: Recargar tabla de ventas al entrar
            if (typeof window.loadSalesData === 'function') {
                await window.loadSalesData();
                if (typeof window.handleFilterSales === 'function') window.handleFilterSales();
            }
        }

    } catch (error) {
        console.error(`Error al cargar datos de la vista ${viewId}:`, error);
    }
}

// LISTENER para la navegación principal (data-view)
document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault(); // 🛑 ESTO DETIENE EL '#'
        
        const viewId = link.getAttribute('data-view');
        // El ID de tu vista es el valor de data-view, pero quitando el '-view'
        // 'home-view' -> 'home'
        // 'clients-view' -> 'clients'
        // Vamos a asumir que el ID de tu DIV contenedor es el valor de data-view (ej: 'home-view')
        switchView(viewId); 
    });
});

    // ====================================================================
    // 1. INICIALIZACIÓN DE SUPABASE Y CARGA DE DATOS
    // ====================================================================
    
    // 🚨 MUEVE LA INICIALIZACIÓN DE SUPABASE AQUÍ
    if (window.supabase) {
    } else {
        console.error("Error Fatal: Librería Supabase no encontrada. La aplicación no funcionará.");
        return;
    }
    if (window.supabase) {
        // Si 'supabase' no está definido globalmente (fuera de DOMContentLoaded)
        if (!supabase) {
        }
    } else {
        console.error("Error Fatal: Librería Supabase no encontrada. La aplicación no funcionará.");
        // return; // Si ya se hizo fuera del bloque, esto puede ser omitido.
    }
    // 2. Continúa con tus llamadas iniciales
    await loadAllClientsMap();
    if (window.loadClientsTable) {
        window.loadClientsTable(); // Luego renderiza la tabla
    }
    checkUserSession();

    // 3. Inicializar el selector con los meses (esto selecciona el mes actual)
    initializeMonthSelector(); 

    // 4. (Tu código) Establecer el Listener en el selector
    const selector = document.getElementById('report-month-selector');
    if (selector) {
        // Al cambiar el mes, se ejecuta loadMonthlySalesReport
        selector.addEventListener('change', loadMonthlySalesReport);
    } 
    loadMonthlySalesReport();

    // --------------------------------------------------
    // 2. LISTENERS ESPECÍFICOS DE EVENTOS
   
    //Guardar cliente
    const newClientForm = document.getElementById('new-client-form');
    
if (newClientForm) {
    //console.log('--- LISTENER DE NUEVO CLIENTE ASOCIADO ---');
    // CÁMBIELO AQUÍ:
    newClientForm.addEventListener('submit', window.handleNewClient); // <-- AÑADA 'window.'
}

    // Listener para el botón de abrir el modal de nueva venta
    document.getElementById('open-sale-modal-btn')?.addEventListener('click', async () => { 
        try {
            // Asumiendo que el formulario tiene la ID 'new-sale-form'
            document.getElementById('new-sale-form')?.reset(); 
            
            await loadClientsForSale(); 
            
            // Carga los productos MAIN en el selector de venta
            loadMainProductsForSaleSelect(); 
            
            currentSaleItems = []; 
            updateSaleTableDisplay(); 
            
            document.getElementById('total-amount').value = '0.00';
            document.getElementById('paid-amount').value = '0.00';
            document.getElementById('display-saldo-pendiente').value = '0.00';

            openModal('new-sale-modal'); 
        } catch (error) {
            console.error('Error al cargar datos del modal de venta:', error);
            alert('Error al cargar los datos. Revise la consola (F12).');
        }
    });

    // --- Listeners de PAGO/VENTA ---
    document.getElementById('new-sale-form')?.addEventListener('submit', handleNewSale); 
    document.getElementById('paid-amount')?.addEventListener('input', () => updatePaymentDebtStatus());
    document.getElementById('payment-method')?.addEventListener('change', () => updatePaymentDebtStatus());
    document.getElementById('paid-amount')?.addEventListener('input', () => {
        calculateGrandTotal();
    });
    document.getElementById('payment-method')?.addEventListener('change', () => {
        calculateGrandTotal();
    });

    // Boton añadir producto a la venta
    document.getElementById('add-product-btn')?.addEventListener('click', handleAddProductToSale);

    // Listener para el envío del formulario de registro de abonos (GENERAL)
document.getElementById('abono-client-form')?.addEventListener('submit', handleRegisterPayment);

    // 🛑 Listener para el envío del formulario de PAGO en el Modal de DETALLES DE VENTA
    document.getElementById('register-payment-form')?.addEventListener('submit', handleSaleAbono);

    const paidAmountInput = document.getElementById('paid-amount');
    if (paidAmountInput) {
        // Al usar 'input', la función se dispara con cada pulsación de tecla
        paidAmountInput.addEventListener('input', updatePaymentDebtStatus);
    }

    // 2. Escuchador para el Método de Pago (cuando el usuario selecciona 'Deuda', etc.)
    const paymentMethodSelect = document.getElementById('payment-method');
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', updatePaymentDebtStatus);
    }
    // --- Autenticación ---
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // --- Listeners de DASHBOARD (Filtro y Reporte) ---
    document.getElementById('sales-month-filter')?.addEventListener('change', () => {
        loadDashboardData(); 
    });

    // Reseteo de filtro de ventas
    document.getElementById('reset-sales-filter')?.addEventListener('click', () => {
        const filterInput = document.getElementById('sales-month-filter');
        if (filterInput) {
            filterInput.value = ''; 
        }
        loadDashboardData(); 
    });

    // Ejemplo en el código del botón de imprimir ticket:
    document.getElementById('print-ticket-btn')?.addEventListener('click', () => {
        // Asumiendo que CURRENT_SALE_ID se establece en showTicketPreviewModal
        printTicketQZ(CURRENT_SALE_ID);
    });
    
    // Listener reportes de mes
    document.getElementById('open-monthly-report-btn')?.addEventListener('click', () => {
        loadMonthlySalesReport(); 
        openModal('modal-monthly-report');
    });
  // Agrega este Listener ÚNICO que escucha en toda la página
document.addEventListener('click', function(e) {
    // Usamos .closest() para capturar el botón, incluso si el clic cae en un ícono dentro de él
    const target = e.target.closest('.view-sale-details-btn'); 

    if (target) {
        // Asumimos que tu tabla usa: data-venta-id y data-client-id
        const ventaId = target.getAttribute('data-venta-id');
        const clientId = target.getAttribute('data-client-id');
        
        if (ventaId && clientId) {
            console.log(`DEBUG: Clic en Detalle Detectado. Venta ID: ${ventaId}, Cliente ID: ${clientId}`);
            
            // Llama a la función de carga que ya corregimos:
            handleViewSaleDetails(ventaId, clientId);
        } else {
            console.error("ERROR: El botón de detalle le faltan atributos (data-venta-id o data-client-id).");
        }
    }
});
    // -----------------------------------------------
    // Listeners de MODAL CLIENTES (BLOQUE CORREGIDO)
    // -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const newClientForm = document.getElementById('new-client-form');
    if (newClientForm) {
        newClientForm.addEventListener('submit', handleNewClient); // ✅ SOLO AQUÍ
    }
});
    // ------------------------------------
    // --- LISTENERS DE MODAL PRODUCTOS ---
    // ------------------------------------

    // Listener para el botón principal (Abre la LISTA/ADMINISTRACIÓN)
    document.getElementById('open-admin-products-modal')?.addEventListener('click', async () => {
        try {
            await loadAndRenderProducts(); 
            openModal('admin-products-modal'); 
        } catch (error) {
            console.error('Error al cargar la administración de productos:', error);
            alert('Error al cargar la lista de productos.');
        }
    });

    // Listener para abrir el FORMULARIO DE REGISTRO desde el modal de administración
    document.getElementById('open-product-modal-btn')?.addEventListener('click', () => {
        closeModal('admin-products-modal');
        document.getElementById('new-product-form')?.reset();
        toggleParentProductField(); 
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

    // Listener para el cambio del Producto Base
    document.getElementById('product-main-select')?.addEventListener('change', handleChangeProductForSale);

    // Listener para el cambio del Paquete
    document.getElementById('subproduct-select')?.addEventListener('change', (e) => {
        updatePriceField(e.target.value); 
    });

document.addEventListener('DOMContentLoaded', () => {
 // zeditar producto
// 1. Vincular el submit del formulario
const editForm = document.getElementById('edit-product-form');
if (editForm) {
    editForm.addEventListener('submit', window.handleUpdateProduct);
}

// 2. Lógica para mostrar/ocultar el "Padre" mientras se edita (Change del select)
document.getElementById('edit-product-category')?.addEventListener('change', function(e) {
    const container = document.getElementById('edit-product-parent-container');
    const currentId = document.getElementById('edit-product-id').value;
    
    if (e.target.value === 'Paquete') {
        container.classList.remove('hidden');
        window.populateParentSelect('edit-product-parent', currentId);
    } else {
        container.classList.add('hidden');
    }
});
});

// Listener para confirmar la eliminación
   document.addEventListener('click', async function(e) {
    // Detectamos si el clic fue en el botón de confirmar eliminación
    if (e.target && e.target.id === 'confirm-delete-client-btn') {
        const btn = e.target;
        
        if (!window.clientIdToDelete) {
            console.error("No hay un ID de cliente seleccionado para eliminar.");
            return;
        }

        console.log("Intentando eliminar cliente ID:", window.clientIdToDelete);

        // Estado visual de carga
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Eliminando...';

        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('client_id', window.clientIdToDelete);

            if (error) {
                // Manejo de error de integridad (si tiene ventas)
                if (error.code === '23503') {
                    alert('No se puede eliminar: El cliente tiene ventas o deudas registradas.');
                } else {
                    throw error;
                }
            } else {
                console.log("✅ Cliente eliminado de la base de datos.");
                alert('Cliente eliminado correctamente.');
                closeModal('delete-client-modal');
                
                // Refrescar la tabla automáticamente
                if (typeof window.loadClientsTable === 'function') {
                    await window.loadClientsTable();
                }
            }
        } catch (err) {
            console.error('Error crítico al borrar:', err);
            alert('Error al intentar eliminar: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
            window.clientIdToDelete = null; // Limpiamos la variable
        }
    }
});

    // ====================================================================
    // DELEGACIÓN DE EVENTOS PARA BOTONES DE LA TABLA DE CLIENTES
    // ====================================================================
    document.getElementById('clients-list-body')?.addEventListener('click', async (e) => {
        const button = e.target.closest('button');

        if (button) {
            e.preventDefault(); 
            
            const clientId = button.getAttribute('data-client-id');

            if (button.classList.contains('edit-client-btn')) {
                await handleEditClientClick(clientId);
            }

            if (button.classList.contains('delete-client-btn')) {
                handleDeleteClientClick(clientId);
            }

            // El botón de abono llama al reporte de deuda (que es async)
            if (button.classList.contains('view-debt-btn')) { 
                await handleViewClientDebt(clientId);
            }
        }
    });

    // Y el listener de envío del formulario de edición también debe estar presente:
    document.getElementById('edit-client-form')?.addEventListener('submit', handleEditClient);
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando aplicación...");

    // =======================================================
    // 1. Enlace de Formularios
    // =======================================================
    
    // FORMULARIO: Editar Precio
    const editForm = document.getElementById('edit-sale-price-form');
    if (editForm) {
        editForm.addEventListener('submit', window.handlePriceEditSubmit);
    }

    // FORMULARIO: Registrar Abono (El nuevo que creamos hoy)
    const abonoForm = document.getElementById('abono-client-form');
    if (abonoForm) {
        abonoForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log("🚀 Procesando abono en cascada...");
            
            // Aquí llamamos a la lógica que usa la función RPC registrar_abono_cascada
            // Si ya definiste handleAbonoSubmit, puedes usarla aquí:
            if (typeof window.handleAbonoSubmit === 'function') {
                await window.handleAbonoSubmit(e);
            }
        });
    }

    // =======================================================
    // 2. Inicialización de Vistas
    // =======================================================
    if (window.loadDashboardData) {
        window.loadDashboardData();
        console.log("Datos del Dashboard cargados.");
    }
    
    // =======================================================
    // 3. Listeners Globales (Delegación de Eventos)
    // =======================================================
    document.body.addEventListener('click', (e) => {
        // Maneja botones de cierre (X)
        const closeBtn = e.target.closest('[data-close-modal]');
        if (closeBtn) {
            const modalId = closeBtn.dataset.closeModal;
            window.closeModal(modalId);
            return;
        }

        // Maneja botones de apertura
        const openBtn = e.target.closest('[data-open-modal]');
        if (openBtn) {
            const modalId = openBtn.dataset.openModal;
            
            // CASO ESPECIAL: Si es el botón de abono dentro del detalle de venta
            if (modalId === 'abono-client-modal' && window.viewingClientId) {
                window.handleAbonoClick(window.viewingClientId);
                return;
            }

            // Lógica estándar de apertura
            const specializedFn = `open${modalId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
            if (typeof window[specializedFn] === 'function') {
                window[specializedFn]();
            } else {
                window.openModal(modalId);
            }
        }
        
        // Cierre por clic en el fondo (overlay)
        if (e.target.classList.contains('modal-overlay')) {
            window.closeModal(e.target.id);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Listener único para el botón de confirmar eliminación
const btnEliminarConfirmar = document.getElementById('confirm-delete-btn');
if (btnEliminarConfirmar) {
    btnEliminarConfirmar.addEventListener('click', async () => {
        if (!window.productIdToDelete) return;

        btnEliminarConfirmar.disabled = true;
        btnEliminarConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

        const { error } = await supabase
            .from('productos')
            .delete()
            .eq('producto_id', window.productIdToDelete);

        if (error) {
            if (error.code === '23503') {
                alert("No se puede eliminar porque este producto está en una venta.");
            } else {
                alert("Error al eliminar: " + error.message);
            }
        } else {
            alert("Producto eliminado.");
            closeModal('delete-product-modal');
            await window.loadAndRenderProducts(); // Esto ahora sí refrescará la tabla
        }

        btnEliminarConfirmar.disabled = false;
        btnEliminarConfirmar.textContent = 'Sí, Eliminar';
    });
}
});

// ✅ DEJA ESTO (Pero ajustado):
document.getElementById('open-abono-from-report-btn')?.addEventListener('click', (e) => {
    e.preventDefault(); // Siempre prevenir el comportamiento por defecto al hacer clic

    if (!window.viewingClientId) return;

    const totalDebtText = document.getElementById('client-report-total-debt')?.textContent || '$0.00';
    const totalDebtValue = parseFloat(totalDebtText.replace(/[^0-9.-]+/g,"")); 

    if (totalDebtValue > 0.01) {
        // 1. LLAMA A TU FUNCIÓN MAESTRA (La que ya tienes y funciona bien)
        // Esto llenará el ID, el nombre y la deuda automáticamente en el modal
        window.handleAbonoClick(window.viewingClientId);

        // 2. Cerrar el reporte anterior
        closeModal('modal-client-debt-report');
    } else {
        alert("El cliente no tiene deuda pendiente.");
    }
});

// ESCUCHADOR GLOBAL DE ENVÍO DE FORMULARIO - ABONO
document.addEventListener('submit', async function(e) {
    // Verificamos que sea el formulario de abonos
    if (e.target && e.target.id === 'abono-client-form') {
        e.preventDefault(); // 🛑 BLOQUEA EL REFRESCO DE LA PÁGINA
        e.stopPropagation();

        console.log("🚀 Procesando abono sin recargar página...");

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // 1. Obtener datos del formulario que llenó handleAbonoClick
        const clientId = document.getElementById('abono-client-id')?.value;
        const amount = parseFloat(document.getElementById('abono-amount')?.value);
        const method = document.getElementById('payment-method-abono')?.value;

        // 2. Validación rápida
        if (!clientId || isNaN(amount) || amount <= 0 || !method) {
            alert("⚠️ Por favor complete todos los campos correctamente.");
            return;
        }

        // 3. Bloquear botón
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';
        }

        try {
            // 4. INSERTAR EN SUPABASE (Solo tabla pagos, la deuda se calcula sola)
            const { error } = await supabase.from('pagos').insert([{
                client_id: clientId, // El ID que puso handleAbonoClick
                amount: amount,
                metodo_pago: method,
                type: 'ABONO_GENERAL',
                created_at: new Date().toISOString()
            }]);

            if (error) throw error;

            // --- ÉXITO ---
            alert(`✅ Abono de ${amount} registrado correctamente.`);
            
            // 5. Limpieza y Cierre
            if (typeof closeModal === 'function') closeModal('abono-client-modal');
            form.reset();

            // 6. Actualizar tablas de la web (sin recargar)
            if (typeof window.loadClientsTable === 'function') await window.loadClientsTable('gestion');
            if (typeof window.loadDashboardMetrics === 'function') await window.loadDashboardMetrics();

        } catch (err) {
            console.error("❌ Error en Supabase:", err);
            alert("Error al registrar el abono: " + err.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirmar Abono';
            }
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================
    // 🛑 CONEXIONES DE LISTENERS (TPV)
    // ==========================================================
    const mainSelect = document.getElementById('product-main-select');
    if (mainSelect) {
        mainSelect.addEventListener('change', window.handleChangeProductForSale);
        console.log('✅ Listener de Producto Principal (product-main-select) conectado.');
    }
    // ... (Mantén tus otros listeners de TPV y Clientes aquí) ...
    
    // ==========================================================
    // 🛑 CONEXIONES PARA EL FILTRADO DE VENTAS
    // ==========================================================
    const startDateFilter = document.getElementById('filter-start-date');
    const endDateFilter = document.getElementById('filter-end-date');
    const searchFilter = document.getElementById('filter-search-term');
    
    if (startDateFilter) {
        startDateFilter.addEventListener('change', window.handleFilterSales);
    }
    if (endDateFilter) {
        endDateFilter.addEventListener('change', window.handleFilterSales);
    }
    if (searchFilter) {
        searchFilter.addEventListener('input', window.handleFilterSales);
    }

    // ==========================================================
    // 🛑 LLAMADA DE CARGA ÚNICA DE DATOS CRÍTICOS
    // ==========================================================

    // 1. Cargar datos de Productos (necesarios para el TPV)
    if (window.loadProductsData) {
    loadProductsData().then(() => {
        // Una vez que los productos están listos, cargamos el selector de venta
        window.loadMainProductsForSaleSelect(); // ✅ DESCOMENTAR
    });
}

    // 2. Cargar datos de Ventas (necesarios para la tabla)
    if (window.loadSalesData) {
        window.loadSalesData().then(() => {
            // Una vez que las ventas están listas, renderizamos la tabla por primera vez
            window.handleFilterSales(); 
        });
    }

    // 3. Cargar otros datos (Clientes)
    if (window.loadClientsData) {
        window.loadClientsData();
    }
});