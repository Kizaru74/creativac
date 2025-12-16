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

async function initializeApp() {
// 1. Cargar datos esenciales
    await loadProducts(); // <-- Asumo que esta función carga TODOS los productos
    await loadClientsTable('gestion'); 
    
    // 2. Cargar métricas del dashboard
    await loadDashboardMetrics(); 
    
    // 3. CRÍTICO: Cargar los productos principales para el modal de Subproducto.
    // Esto asegura que el selector 'new-product-parent-select' esté lleno 
    // antes de que el usuario lo abra.
    await loadMainProductsAndPopulateSelect(); 

    console.log("✅ Aplicación inicializada y selectores de productos cargados.");
}
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

window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    
    if (modal) {
        // 1. Aseguramos que se muestra como un contenedor flexible
        modal.classList.add('flex'); 
        
        // 2. Quitamos la clase de ocultamiento (ESTO ES CRÍTICO)
        modal.classList.remove('hidden'); 
        
        // 3. Opcional: Aseguramos que el foco esté en el modal para accesibilidad
        modal.querySelector('input, select, textarea')?.focus();
    } else {
        console.error(`Error: No se encontró el modal con ID: ${modalId}`);
    }
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    
    if (modal) {
        // 1. Ocultamos el modal
        modal.classList.add('hidden'); 
        
        // 2. Opcional: Quitamos la clase de visualización (buena práctica)
        modal.classList.remove('flex'); 
    }
};


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
    await loadDebts();
    await loadRecentSales();
    await loadClientsTable('gestion');
    await loadProductsData(); 
    await loadProductsTable(); 
    await loadClientsForSale();
    await loadClientDebtsTable();
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
        // 1. Fetch de la data
        const { data: products, error } = await supabase
            .from('productos')
            .select('*');

        if (error) throw error;
        
        // 2. 🛑 CRÍTICO: Mapeo y FUERZA la conversión de TODOS los IDs a números puros
        window.allProducts = (products || []).map(p => {
            
            // Limpieza y tipificación del ID principal
            const parsedProductId = parseInt(String(p.producto_id).trim(), 10);
            
            // Limpieza y tipificación del Parent ID
            const cleanedParentProduct = p.parent_product 
                ? String(p.parent_product).trim() 
                : null;
            
            let finalParentId = null;
            if (cleanedParentProduct === 'BASE') {
                finalParentId = 'BASE'; // Mantener el string especial 'BASE'
            } else if (cleanedParentProduct) {
                const parsedParentId = parseInt(cleanedParentProduct, 10);
                // Si la conversión es exitosa, guardamos el NÚMERO
                finalParentId = isNaN(parsedParentId) ? null : parsedParentId;
            }

            return {
                ...p,
                // Asegurar que el ID del producto sea un NÚMERO
                producto_id: isNaN(parsedProductId) ? p.producto_id : parsedProductId, 
                // Garantizar que 'type' sea consistente (ej. 'PACKAGE', 'MAIN')
                type: String(p.type || 'MAIN').toUpperCase(), 
                // Asegurar que parent_product sea un NÚMERO, BASE, o null
                parent_product: finalParentId 
            };
        });
        
        // 3. Post-procesamiento: Creación de Mapas
        // Se crean mapas para facilitar la búsqueda por ID y mejorar el rendimiento
        window.allProductsMap = window.allProducts.reduce((map, product) => {
            map[product.producto_id] = product;
            return map;
        }, {});
        
        console.log(`✅ Productos cargados y LIMPIADOS en ámbito global: ${window.allProducts.length} ítems.`);

    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
    return window.allProducts;
};
//window.loadProductsData = window.loadProductsData;

window.handleChangeProductForSale = function() {
    const mainSelect = document.getElementById('product-main-select');
    const subSelect = document.getElementById('subproduct-select');
    const priceInput = document.getElementById('product-unit-price');
    
    if (!mainSelect || !subSelect || !priceInput || typeof allProducts === 'undefined') {
        console.error("Error: Elementos de venta o datos (allProducts) no encontrados.");
        return;
    }

    const productId = mainSelect.value;
    
    // CRÍTICO 1: Si el ID es nulo, vacío o el placeholder, salimos
    if (!productId || productId === 'placeholder-option-value' || productId === '0') { 
        subSelect.innerHTML = '<option value="" selected>Sin Paquete</option>';
        subSelect.disabled = true; 
        priceInput.value = '0.00';
        return; 
    }

    // CRÍTICO 2: Defensa contra Race Condition
    if (!window.allProducts || window.allProducts.length < 5) {
        console.warn("ADVERTENCIA: Data de productos inestable o incompleta. Retrasando filtro de subproductos.");
        return; 
    }
    
    // 2. Establecer el precio por defecto
    window.updatePriceField(productId);
    
    // 3. Filtrar y buscar los subproductos (paquetes)
    // Forzamos ambos lados de la comparación a string LIMPIO
    const selectedIdStr = String(productId).trim(); 

    const subProducts = allProducts.filter(p => {
        
        const productType = String(p.type || '').toUpperCase(); 
        // 🛑 CRÍTICO: Aseguramos que parentId sea un string limpio para la comparación
        const parentIdStr = String(p.parent_product || '').trim(); 

        return (
            productType === 'PACKAGE' && 
            // 🛑 ÚLTIMA DEFENSA: Comparación estricta de strings limpios
            parentIdStr === selectedIdStr
        );
    });

    console.log(`DIAGNÓSTICO DE FILTRO JS: ${subProducts.length} subproductos encontrados para ID: ${productId}`);

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
    }
}
window.handleChangeProductForSale = window.handleChangeProductForSale;

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

function updateSaleTableDisplay() {
    // 🛑 CRÍTICO: Asegurarse de que el ID es el correcto según tu HTML
    const container = document.getElementById('sale-items-table-body'); 
    
    if (!container) {
        // Esto solo es para depuración
        console.error("Error FATAL: Elemento 'sale-items-table-body' no encontrado en el DOM.");
        return;
    }
    
    // Usamos una variable para construir todo el HTML de las filas
    let htmlContent = ''; 

    if (currentSaleItems.length === 0) {
        // Si no hay productos, mostramos el mensaje (colspan 5 = columnas totales)
        htmlContent = '<tr><td colspan="5" class="px-4 py-2 text-center text-gray-500 italic">Agrega productos a la venta.</td></tr>';
    } else {
        currentSaleItems.forEach((item, index) => {
            let nameDisplay = item.name;
            // Lógica de subcategoría/paquete
            if (!item.name.includes('(') && item.type && item.type.trim().toUpperCase() !== 'MAIN') {
                 nameDisplay = `${item.name} (${item.type})`;
            }
            
            // Concatenamos el HTML de la fila actual
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

    // 🛑 CRÍTICO: Insertamos todo el contenido HTML de una vez
    container.innerHTML = htmlContent;
    
    // Calculamos el total al final
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

function handleAddProductToSale(e) {
    e.preventDefault();

    const mainSelect = document.getElementById('product-main-select');
    const subSelect = document.getElementById('subproduct-select');
    const quantityInput = document.getElementById('product-quantity'); 
    const priceInput = document.getElementById('product-unit-price'); 
    
    // 🛑 CRÍTICO: ID REAL del "Servicio Manual" creado en Supabase
    const MANUAL_SERVICE_ID = 32; 

    // 1. Obtener IDs y Cantidad
    const mainProductId = mainSelect?.value;
    const subProductId = subSelect?.value;
    const quantity = parseFloat(quantityInput?.value);

    let productIdToCharge = subProductId;
    if (!productIdToCharge) {
        productIdToCharge = mainProductId;
    }
    
    // Convertimos a String para la búsqueda inicial
    const searchId = String(productIdToCharge); 
    let productToCharge = allProducts.find(p => String(p.producto_id) === searchId); 

    // 2. Lógica de Precio (Acepta $0.00)
    const priceStr = priceInput?.value;
    let price = parseFloat(priceStr?.replace(',', '.')) || 0; 
    
    // Si el precio manual es 0, usar el precio de la base de datos como fallback (que puede ser 0).
    if (price === 0 && productToCharge) { 
        price = productToCharge.price || 0; 
    }
    
    // --- LÓGICA DE ID DE EMERGENCIA ---
    // Si NO encontramos el producto en 'allProducts' Y el precio es 0, asumimos que es el Servicio Manual.
    if (!productToCharge && (parseInt(searchId, 10) === 0 || !searchId) && price === 0) {
        
        // Creamos un objeto temporal con el ID válido (32) para que la inserción no falle
        productToCharge = {
            producto_id: MANUAL_SERVICE_ID,
            name: "Servicio Manual / $0.00",
            price: 0,
            type: "MANUAL"
        };
        // Asignamos el ID válido para el resto del proceso
        productIdToCharge = MANUAL_SERVICE_ID; 
    } 
    // --- FIN DE LÓGICA DE ID DE EMERGENCIA ---

    // --- Validaciones Finales ---
    if (!productToCharge) {
        // Esta validación final solo se ejecuta si el producto no se encontró y no era el caso de emergencia de $0.00
        alert('Por favor, selecciona un Producto o Paquete válido.');
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        alert('La cantidad debe ser mayor a cero.');
        return;
    }
    
    const subtotal = quantity * price;

    // 3. CONSTRUCCIÓN DEL NOMBRE (Producto Padre / Subcategoría)
    let nameDisplay = productToCharge.name; 
    
    if (subProductId) {
        // Aseguramos que mainProductData exista si subProductId está presente
        const mainProductData = allProducts.find(p => String(p.producto_id) === String(mainProductId));
        if (mainProductData) {
            nameDisplay = `${mainProductData.name} (${productToCharge.name})`; 
        }
    } else if (productToCharge.type && productToCharge.type.trim().toUpperCase() !== 'MAIN') {
        nameDisplay = `${productToCharge.name} (${productToCharge.type})`; 
    }
    // ------------------------------------------------------------------------

    const newItem = {
        // 🛑 CRÍTICO: Forzamos la conversión a número entero. Será el ID real o el 32.
        product_id: parseInt(productIdToCharge, 10),           
        name: nameDisplay,             
        quantity: quantity,
        price: price, 
        subtotal: subtotal,
        type: productToCharge.type || null, 
    };

    // 4. Lógica de agregar-actualizar el carrito
    // La búsqueda debe usar el ID numérico para coincidir con newItem
    const searchIdNum = parseInt(productIdToCharge, 10);
    const existingIndex = currentSaleItems.findIndex(item => item.product_id === searchIdNum);

    if (existingIndex > -1) { 
        currentSaleItems[existingIndex].quantity += quantity;
        currentSaleItems[existingIndex].subtotal += subtotal;
    } else {
        currentSaleItems.push(newItem); 
    }
    
    // 5. Renderizado y Limpieza
    updateSaleTableDisplay(); 
    calculateGrandTotal(); 

    // Limpieza de inputs
    mainSelect.value = '';
    subSelect.value = '';
    quantityInput.value = '1';
    updatePriceField(null); 
    loadMainProductsForSaleSelect(); 
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

function cleanCurrencyString(str) {
    if (typeof str !== 'string') return 0;
    // Elimina caracteres no numéricos, excepto el punto decimal y el signo menos.
    const cleaned = str.replace(/[^\d.-]/g, ''); 
    return cleaned;
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
    e.preventDefault();
    if (!supabase) return;

    // 1. Obtener los datos del formulario (Usando las IDs de tu HTML)
    const abonoAmount = parseFloat(document.getElementById('abono-amount').value);
    const paymentMethod = document.getElementById('abono-method')?.value; 
    
    // 2. Validaciones
    if (isNaN(abonoAmount) || abonoAmount <= 0) {
        alert('Por favor, ingresa un monto válido para el abono (mayor a cero).');
        return;
    }
    if (!paymentMethod || paymentMethod === '') {
        alert('Por favor, selecciona un Método de Pago.');
        return;
    }

    // 3. DETERMINAR EL TIPO DE ABONO: Venta específica o Deuda del Cliente
    const idToUpdate = window.debtToPayId; // ID del cliente o de la venta
    
    // Asumimos que si el ID existe en allClientsMap, es un abono general.
    const isClientDebtAbono = window.allClientsMap[idToUpdate] !== undefined; 
    
    let salesToUpdate = []; 
    let finalClientId = null;
    let totalPaidAmount = 0; // Para la alerta final

    if (isClientDebtAbono) {
        // 3a. ABONO A DEUDA GENERAL DEL CLIENTE (FIFO)
        // [Su lógica FIFO es correcta y se mantiene]

        const clientId = idToUpdate;
        finalClientId = clientId;
        
        // Obtenemos todas las ventas pendientes del cliente (FIFO)
        const { data: pendingSales, error: fetchError } = await supabase
            .from('ventas')
            .select('venta_id, saldo_pendiente, paid_amount, client_id, created_at') // 💡 Añadimos paid_amount
            .eq('client_id', clientId)
            .gt('saldo_pendiente', 0.01)
            .order('created_at', { ascending: true }); 

        if (fetchError) {
            console.error("Error al buscar ventas pendientes:", fetchError);
            alert('Error al buscar ventas pendientes para abonar.');
            return;
        }
        if (pendingSales.length === 0) {
            alert('El cliente no tiene ventas pendientes para abonar.');
            return;
        }

        let remainingAbono = abonoAmount;
        totalPaidAmount = abonoAmount; // Es el total abonado

        // Aplicar el abono a las ventas pendientes por orden de antigüedad
        for (const sale of pendingSales) {
            if (remainingAbono <= 0) break;

            const debtToSale = sale.saldo_pendiente;
            const amountApplied = Math.min(remainingAbono, debtToSale);
            
            salesToUpdate.push({
                venta_id: sale.venta_id,
                client_id: sale.client_id,
                amount: amountApplied,
                // Calculamos el nuevo paid_amount y el nuevo saldo
                new_paid_amount: sale.paid_amount + amountApplied, // <-- ¡CORRECCIÓN!
                new_saldo_pendiente: debtToSale - amountApplied 
            });

            remainingAbono -= amountApplied;
        }
        
    } else {
        // 3b. ABONO A VENTA ESPECÍFICA
        // [Su lógica específica es correcta y se mantiene]
        
        const ventaId = idToUpdate; 
        
        const { data: saleData, error: fetchError } = await supabase
            .from('ventas')
            .select('saldo_pendiente, paid_amount, client_id') // 💡 Añadimos paid_amount
            .eq('venta_id', ventaId)
            .single();

        if (fetchError || !saleData) {
            alert('Error al obtener la venta para abonar.');
            return;
        }
        
        if (abonoAmount > saleData.saldo_pendiente) {
            alert(`El abono excede el saldo pendiente (${formatCurrency(saleData.saldo_pendiente)}). Ajuste el monto.`);
            return;
        }
        
        finalClientId = saleData.client_id;
        totalPaidAmount = abonoAmount; // Es el total abonado

        salesToUpdate.push({
            venta_id: ventaId,
            client_id: saleData.client_id,
            amount: abonoAmount,
            // Calculamos el nuevo paid_amount y el nuevo saldo
            new_paid_amount: saleData.paid_amount + abonoAmount, // <-- ¡CORRECCIÓN!
            new_saldo_pendiente: saleData.saldo_pendiente - abonoAmount
        });
    }

    // 4. REGISTRAR TRANSACCIONES Y ACTUALIZAR VENTA(S)
    try {
        for (const update of salesToUpdate) {
            // A. Insertar el abono en la tabla 'pagos'
            const { error: paymentError } = await supabase
                .from('pagos')
                .insert([{ 
                    venta_id: update.venta_id, 
                    client_id: update.client_id,
                    amount: update.amount, 
                    metodo_pago: paymentMethod 
                }]);
            if (paymentError) throw paymentError;

            // B. Actualizar el saldo y el monto pagado de la tabla 'ventas' (¡CRÍTICO!)
            const { error: updateError } = await supabase
                .from('ventas')
                .update({ 
                    saldo_pendiente: update.new_saldo_pendiente,
                    paid_amount: update.new_paid_amount // <-- ¡ESTO ES LO NUEVO!
                })
                .eq('venta_id', update.venta_id);
            if (updateError) throw updateError;
        }

        alert(`¡Abono de ${formatCurrency(totalPaidAmount)} registrado con éxito!`);
        document.getElementById('abono-client-form').reset();
        closeModal('modal-record-abono'); 
        
        // 5. RECARGAR DATOS
        
        // Si el reporte de deuda está abierto, lo recargamos para ver el cambio
        const debtModal = document.getElementById('modal-client-debt-report');
        if (debtModal && !debtModal.classList.contains('hidden') && finalClientId) {
            await handleViewClientDebt(finalClientId); 
        }

        // Si el modal de Detalle de Venta está abierto y acabamos de abonar a una venta específica, ¡recargarlo!
        const detailSaleModal = document.getElementById('modal-detail-sale');
        if (detailSaleModal && !detailSaleModal.classList.contains('hidden') && !isClientDebtAbono) {
            // Recargamos los detalles de la venta que acabamos de abonar
            // Usamos el ID de la venta y el ID del cliente que guardamos.
            await handleViewSaleDetails(idToUpdate, finalClientId); 
        }
        
        await loadDashboardData(); 
        await loadClientsTable('gestion'); 

    } catch (e) {
        console.error('Error al registrar abono:', e.message || e);
        alert('Hubo un error al registrar el abono. Intente nuevamente.');
    }
    
    // 6. LIMPIEZA FINAL
    window.debtToPayId = null; // Usamos window. para la variable global
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
    
    // --- 1. CAPTURAR Y VALIDAR DATOS INICIALES ---
    const client_id = document.getElementById('client-select')?.value ?? null;
    const payment_method = document.getElementById('payment-method')?.value ?? 'Efectivo';
    const sale_description = document.getElementById('sale-details')?.value.trim() ?? null;
    
    // Aseguramos que paid_amount_str sea numérico
    // Nota: Reemplazamos caracteres de moneda o formato antes de parsear
    const paid_amount_str = document.getElementById('paid-amount')?.value.replace(/[^\d.-]/g, '') ?? '0'; 
    let paid_amount = parseFloat(paid_amount_str);
    
    const total_amount = currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0); 
    
    // Si el método seleccionado es 'Deuda', el pago es 0
    if (payment_method === 'Deuda') {
        paid_amount = 0;
    }
    
    let final_paid_amount = paid_amount;
    let final_saldo_pendiente = total_amount - paid_amount; 

    // Validaciones de UI
    if (!client_id) { alert('Por favor, selecciona un cliente.'); return; }
    if (currentSaleItems.length === 0) { alert('Debes agregar al menos un producto a la venta.'); return; }
    if (total_amount < 0) { alert('El total de la venta no puede ser negativo.'); return; }
    
    // Lógica para venta de $0.00
    if (total_amount < 0.01) { // Usar < 0.01 para capturar 0 o casi 0
        final_paid_amount = 0;
        final_saldo_pendiente = 0;
    } else if (final_saldo_pendiente < 0) {
        final_paid_amount = total_amount; // Si pagó de más, el pagado es el total
        final_saldo_pendiente = 0; 
    }
    
    // Otras validaciones (pago y confirmación de deuda)
    if (final_paid_amount < 0 || final_paid_amount > total_amount) {
        alert('El monto pagado es inválido.'); return;
    }

    if (final_saldo_pendiente > 0.01 && !confirm(`¡Atención! Hay un saldo pendiente de ${formatCurrency(final_saldo_pendiente)}. ¿Deseas continuar registrando esta cantidad como deuda?`)) {
        return;
    }

    // 🛑 VALIDACIÓN CRÍTICA DE IDs (Previene el fallo de Clave Foránea)
    const itemWithoutValidId = currentSaleItems.find(item => 
        !item.product_id || 
        isNaN(item.product_id) || 
        parseInt(item.product_id, 10) === 0
    );
    
    if (itemWithoutValidId) {
        alert(`Error de Producto: El ítem "${itemWithoutValidId.name}" tiene un ID inválido (${itemWithoutValidId.product_id}). Por favor, revise la selección.`); 
        return; 
    }
    
    // 🛑 Control de UX del Botón (Asumimos que está en un formulario)
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando Venta...';
    }

    // --- 2. REGISTRO EN LA BASE DE DATOS (Transacción) ---
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
            console.error('Error al insertar venta (Ventas):', saleError);
            throw new Error(`Error al registrar la venta principal: ${saleError?.message || 'Desconocido'}`);
        }

        new_venta_id = saleData[0].venta_id;

        // 2.2. REGISTRAR DETALLE DE VENTA (Tabla 'detalle_ventas')
        const detailsToInsert = currentSaleItems.map(item => ({
            venta_id: new_venta_id, 
            product_id: parseInt(item.product_id, 10),
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
        }));
        
        const { error: detailError } = await supabase
            .from('detalle_ventas') 
            .insert(detailsToInsert);

        if (detailError) {
            console.error('🛑 ERROR BD - DETALLES FALLIDOS:', detailError);
            throw new Error(`BD Falló al insertar detalles (ID Venta: ${new_venta_id}). Mensaje Supabase: ${detailError.message}`);
        }

        // 2.3. REGISTRAR PAGO (Tabla 'pagos') - Solo si se pagó algo
        if (final_paid_amount > 0) { 
            const { error: paymentError } = await supabase
                .from('pagos')
                .insert([{
                    venta_id: new_venta_id,
                    amount: final_paid_amount,
                    client_id: client_id,
                    metodo_pago: payment_method,
                    type: 'INICIAL', // Marcamos como pago inicial
                }]);

            if (paymentError) {
                console.error('Error al registrar pago inicial (Pagos):', paymentError);
                // No es fatal, pero alertamos
                alert(`Advertencia: El pago inicial falló. ${paymentError.message}`);
            }
        }
        
        // 2.4. 🚨 ACTUALIZAR DEUDA DEL CLIENTE (PASO FALTANTE CRÍTICO) 🚨
        if (final_saldo_pendiente > 0) {
            // 2.4.1 Obtener la deuda actual del cliente
            const { data: clientData, error: clientFetchError } = await supabase
                .from('clientes')
                .select('deuda_total')
                .eq('client_id', client_id)
                .single();

            if (!clientFetchError && clientData) {
                const currentClientDebt = clientData.deuda_total || 0;
                const newClientDebt = currentClientDebt + final_saldo_pendiente;

                // 2.4.2 Actualizar la deuda total en la tabla 'clientes'
                const { error: clientUpdateError } = await supabase
                    .from('clientes')
                    .update({ deuda_total: newClientDebt })
                    .eq('client_id', client_id);

                if (clientUpdateError) {
                    console.error('Error al actualizar deuda del cliente (Clientes):', clientUpdateError);
                    alert(`Advertencia: La venta se registró, pero falló la actualización de la deuda total del cliente. ${clientUpdateError.message}`);
                }
            } else {
                 console.warn(`No se pudo obtener la deuda actual del cliente ${client_id}.`);
            }
        }
        
        // --- 3. FINALIZACIÓN Y LIMPIEZA (Si todo fue exitoso) ---
        closeModal('new-sale-modal'); 
        
        // Limpieza de UI
        window.currentSaleItems = []; 
        window.updateSaleTableDisplay(); // Función para redibujar el carrito vacío
        e.target.reset(); // Limpia los campos del formulario
        
        // Recarga de datos para actualizar dashboards y tablas de deuda
        await loadDashboardData(); 
        await loadClientsTable('gestion'); 

        // Muestra el ticket de vista previa (asumiendo que existe)
        if (window.showTicketPreviewModal) {
            showTicketPreviewModal(new_venta_id);
        } else {
             alert(`Venta #${new_venta_id} registrada con éxito. Saldo Pendiente: ${formatCurrency(final_saldo_pendiente)}.`);
        }
        
    } catch (error) {
        // Captura el error fatal y no limpia el carrito
        console.error('Error FATAL al registrar la venta:', error);
        alert('Error fatal al registrar la venta: ' + error.message);
        return; 
    } finally {
        // 4. RESTABLECER EL BOTÓN
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Finalizar Venta';
        }
    }
} 
window.handleNewSale = handleNewSale;

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

window.handleViewClientDebt = async function(clientId) {
    if (!supabase) {
        console.error("Supabase no está inicializado.");
        alert("Error de conexión a la base de datos.");
        return;
    }
    
    window.viewingClientId = clientId;
    
    try {
        // 0. Obtener cliente
        const client = allClients.find(c => c.client_id?.toString() === clientId?.toString());
        if (!client) {
            console.error("Cliente no encontrado para ID:", clientId);
            alert("Error: Cliente no encontrado.");
            return;
        }

        // 1. OBTENER VENTAS Y PAGOS/ABONOS DIRECTAMENTE
        
        // A. Obtener todas las ventas del cliente (cargos)
        const { data: salesData, error: salesError } = await supabase
            .from('ventas')
            .select(`
                venta_id, 
                total_amount, 
                paid_amount, 
                created_at,
                description, 
                detalle_ventas (productos (name))
            `)
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });

        if (salesError) throw salesError;
        
        const sales = salesData || []; 

        // B. Obtener todos los pagos/abonos del cliente
        const { data: paymentsData, error: paymentsError } = await supabase
            .from('pagos')
            .select(`venta_id, amount, metodo_pago, created_at`)
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });

        if (paymentsError) throw paymentsError;

        const payments = paymentsData || []; 


        // 2. UNIFICAR Y NORMALIZAR TRANSACCIONES
        let transactions = [];

        // 2a. Normalizar Ventas (Cargos)
        sales.forEach(sale => {
            const productNames = sale.detalle_ventas.map(d => d.productos.name).join(', ') || 'Venta General';
            
            // Construir la descripción: Productos + Comentario/Detalle de la venta (si existe)
            let transactionDescription = `Venta: ${productNames}`;
            if (sale.description && sale.description.trim() !== '') {
                // Separador claro para el detalle de la venta
                transactionDescription += ` — ${sale.description.trim()}`; 
            }

            // Registramos la VENTA COMPLETA como el cargo a la deuda
            transactions.push({
                date: new Date(sale.created_at),
                type: 'cargo_venta',
                description: transactionDescription,
                amount: sale.total_amount,
                venta_id: sale.venta_id,
                order: 1 
            });
        });

        // 2b. Normalizar Pagos (Abonos)
        payments.forEach(payment => {
            let description = `Abono a Deuda (${payment.metodo_pago})`;
            
            if (payment.venta_id) {
                const sale = sales.find(s => s.venta_id === payment.venta_id);
                if (sale) {
                    const productNames = sale.detalle_ventas.map(d => d.productos.name).join(', ') || 'Venta General';
                    const saleDate = new Date(sale.created_at);
                    const paymentDate = new Date(payment.created_at);
                    const timeDiff = Math.abs(saleDate - paymentDate); 
                    
                    if (timeDiff < 60000) { 
                        description = `Pago Inicial (${payment.metodo_pago}) - Venta: "${productNames}"`;
                    } else {
                        description = `Abono (${payment.metodo_pago}) - Venta: "${productNames}"`;
                    }
                    
                    if (sale.description && sale.description.trim() !== '') {
                         description += ` (${sale.description.trim()})`; 
                    }
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


        // 3. ORDENAR TODAS LAS TRANSACCIONES
        transactions.sort((a, b) => {
            if (a.date.getTime() !== b.date.getTime()) {
                return a.date.getTime() - b.date.getTime();
            }
            return a.order - b.order;
        });

        
        // 4. GENERAR EL HTML Y CALCULAR EL SALDO ACUMULADO
        document.getElementById('client-report-name').textContent = client.name;
        const historyBody = document.getElementById('client-transactions-body'); 
        let historyHTML = []; 
        let currentRunningBalance = 0; 

        transactions.forEach(t => {
            const amountValue = t.amount;
            let transactionDescription = t.description;
            let amountDisplay = formatCurrency(amountValue);
            let amountClass = '';
            
            if (t.type === 'cargo_venta') {
                currentRunningBalance += amountValue;
                amountClass = 'text-red-600 font-bold'; 
            } else if (t.type === 'abono') { 
                currentRunningBalance -= amountValue;
                amountClass = 'text-green-600 font-bold';
            } else {
                console.warn(`Tipo de transacción no reconocido: ${t.type}.`);
                return; 
            }

            // --- CÁLCULO DEL SALDO ACUMULADO VISUAL ---
            const absBalance = Math.abs(currentRunningBalance);
            const runningBalanceDisplay = formatCurrency(absBalance);
            let balanceClass = '';
            
            if (currentRunningBalance > 0.01) {
                balanceClass = 'text-red-600 font-bold text-right';
            } else if (currentRunningBalance < -0.01) {
                balanceClass = 'text-green-600 font-bold text-right';
            } else {
                balanceClass = 'text-gray-700 font-bold text-right';
            }
            
            // 5. GENERACIÓN DEL HTML DE LA FILA
            historyHTML.push(`
                <tr class="hover:bg-gray-50 text-sm">
                    <td class="px-3 py-3 whitespace-nowrap text-gray-500">${formatDate(t.date)}</td>
                    <td class="px-3 py-3 text-gray-800">${transactionDescription}</td>
                    <td class="px-3 py-3 whitespace-nowrap text-right ${amountClass}">${amountDisplay}</td>
                    <td class="px-3 py-3 whitespace-nowrap text-right ${balanceClass}">${runningBalanceDisplay}</td>
                </tr>
            `);
        });
        
        // 6. INYECCIÓN FINAL Y ACTUALIZACIÓN DE TOTALES
        historyBody.innerHTML = historyHTML.join('');
        
        const totalDebtElement = document.getElementById('client-report-total-debt');

        if (currentRunningBalance > 0.01) {
            totalDebtElement.textContent = formatCurrency(Math.abs(currentRunningBalance));
            totalDebtElement.className = 'text-red-600 font-bold text-xl';
        } else if (currentRunningBalance < -0.01) {
            totalDebtElement.textContent = `Crédito ${formatCurrency(Math.abs(currentRunningBalance))}`; 
            totalDebtElement.className = 'text-green-600 font-bold text-xl';
        } else {
            totalDebtElement.textContent = formatCurrency(0);
            totalDebtElement.className = 'text-gray-600 font-bold text-xl';
        }

        // Mostrar el modal al final
        openModal('modal-client-debt-report'); 
        
    } catch (e) {
        console.error('Error al cargar la deuda del cliente:', e);
        alert('Hubo un error al cargar el historial de deuda. Verifique la consola para más detalles.');
    }
}

//Imprmir PDF
window.printClientDebtReport = function() {
    const clientName = document.getElementById('client-report-name').textContent;
    const totalDebt = document.getElementById('client-report-total-debt').textContent;
    const reportContent = document.getElementById('client-transactions-body').innerHTML;
    const currentDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // 1. Construir el HTML de la hoja de impresión con estilos mejorados
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Deuda - ${clientName}</title>
            <style>
                /* --- RESET Y BASE --- */
                body { 
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                    margin: 0; 
                    padding: 40px; 
                    color: #333;
                    font-size: 10pt;
                }
                
                /* --- ENCABEZADO Y TÍTULOS --- */
                .header { border-bottom: 3px solid #0056b3; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 18pt; color: #0056b3; }
                .client-info { font-size: 11pt; margin-top: 10px; }
                .client-info strong { font-weight: bold; }

                /* --- RESUMEN DEUDA TOTAL --- */
                .summary-box { 
                    background-color: #f7f7f7; 
                    border: 1px solid #ddd; 
                    padding: 15px; 
                    margin-bottom: 25px; 
                    display: inline-block; 
                    width: auto;
                }
                .summary-box strong { font-size: 11pt; }
                .total-debt-amount { 
                    font-size: 18pt; 
                    font-weight: bold; 
                    color: #dc2626; /* Rojo de deuda */
                    display: block; 
                    margin-top: 5px;
                }

                /* --- TABLA DE TRANSACCIONES --- */
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 15px; 
                }
                th, td { 
                    border: none; 
                    padding: 10px 8px; 
                    text-align: left; 
                }
                
                tbody tr {
                    border-bottom: 1px solid #eeeeee;
                }
                
                th { 
                    background-color: #e6f0ff; 
                    color: #0056b3; 
                    font-weight: bold; 
                    text-transform: uppercase;
                    font-size: 9pt;
                    border-bottom: 2px solid #0056b3; 
                }
                
                /* 🎯 NUEVAS ALINEACIONES Y ANCHOS */
                .date-col { width: 10%; } /* Fecha */
                .concept-col { width: 65%; } /* Concepto/Detalle (AMPLIADO) */
                .amount-col { width: 12.5%; text-align: right; } /* Monto */
                .balance-col { width: 12.5%; text-align: right; } /* Saldo Acumulado */


                /* Clases de estado (deben coincidir con las clases generadas en handleViewClientDebt) */
                .text-red-600 { color: #dc2626; font-weight: normal; } /* Cargo */
                .text-green-600 { color: #16a34a; font-weight: normal; } /* Abono */
                .text-gray-700 { color: #4b5563; font-weight: normal; } /* Saldado */

                .page-footer {
                    position: fixed;
                    bottom: 0;
                    width: 100%;
                    text-align: right;
                    font-size: 8pt;
                    color: #777;
                    padding-top: 10px;
                    border-top: 1px dashed #ccc;
                }

            </style>
        </head>
        <body>
            <div class="header">
                <h1>REPORTE DE ESTADO DE CUENTA</h1>
                <div class="client-info">
                    <strong>Cliente:</strong> ${clientName}<br>
                    <strong>Fecha de Emisión:</strong> ${currentDate}
                </div>
            </div>

            <div class="summary-box">
                <strong>SALDO PENDIENTE ACTUAL</strong>
                <span class="total-debt-amount">${totalDebt}</span>
            </div>

            <h2>Historial</h2>
            <table>
                <thead>
                    <tr>
                        <th class="date-col">Fecha</th>
                        <th class="concept-col">Detalle de la Transacción</th> 
                        <th class="amount-col">Monto</th>
                        <th class="balance-col">Saldo Acumulado</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportContent} 
                </tbody>
            </table>

            <div class="page-footer">
                Documento generado por [Creativa Cortes CNC]. Para fines informativos.
            </div>
        </body>
        </html>
    `;

    // 2. Abrir en una nueva ventana y llamar a la función de impresión
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 300);
    } else {
        alert("Por favor, permita ventanas emergentes para imprimir el reporte.");
    }
}

window.handleViewSaleDetails = async function(transactionId, clientId) {
    if (!supabase) {
        console.error("Supabase no está inicializado.");
        alert("Error de configuración: Supabase no está disponible.");
        return;
    }

    const saleIdNum = parseInt(transactionId, 10);
    if (isNaN(saleIdNum)) {
        console.error("ID de transacción inválido.");
        alert("Error: El ID de la venta es inválido.");
        return;
    }

    // 1. OBTENER DATOS DEL CLIENTE DESDE EL CACHÉ (allClients)
    const client = allClients.find(c => c.client_id?.toString() === clientId?.toString()); 
    if (!client) {
        console.error("Cliente no encontrado en allClients.");
        alert("Error: Cliente no encontrado para esta venta. Intente recargar la página.");
        return;
    }
    window.viewingClientId = clientId; // Guardamos el ID del cliente que estamos viendo para el checkout

    try {
        // 2. CARGA DE LA VENTA PRINCIPAL (Tabla 'ventas')
        const { data: sale, error: saleError } = await supabase
            .from('ventas')
            .select(`venta_id, total_amount, paid_amount, saldo_pendiente, created_at, description, metodo_pago`) 
            .eq('venta_id', saleIdNum)
            .single();

        if (saleError || !sale) {
            console.error("Error al cargar detalles de la venta (Tabla Ventas):", saleError);
            throw new Error("No se encontró la venta principal (ID: " + saleIdNum + ").");
        }

        // 3. CARGA DE ÍTEMS DE VENTA (Tabla 'detalle_ventas')
        const { data: items, error: itemsError } = await supabase
            .from('detalle_ventas')
            .select(`detalle_id, quantity, price, subtotal, product_id, productos(name, parent_product)`) 
            .eq('venta_id', saleIdNum) 
            .order('detalle_id', { ascending: true }); 

        if (itemsError) throw itemsError;

        // 4. CARGA DEL HISTORIAL DE PAGOS/ABONOS (Tabla 'pagos')
        const { data: payments, error: paymentsError } = await supabase
            .from('pagos')
            .select(`amount, metodo_pago, created_at`) 
            .eq('venta_id', saleIdNum)
            .order('created_at', { ascending: true });

        if (paymentsError) throw paymentsError;

        // 5. INYECCIÓN DE DATOS GENERALES
        document.getElementById('detail-sale-id').textContent = sale.venta_id; 
        document.getElementById('detail-client-name').textContent = client.name;
        document.getElementById('detail-sale-date').textContent = formatDate(sale.created_at);
        document.getElementById('detail-payment-method').textContent = sale.metodo_pago;

        const descriptionEl = document.getElementById('detail-sale-description');
        if (descriptionEl && descriptionEl.parentElement) {
            const descriptionText = sale.description || 'No se registraron comentarios adicionales para esta venta.';
            descriptionEl.textContent = descriptionText;
            // Solo mostrar la sección si hay una descripción o al menos la etiqueta está presente
            // descriptionEl.parentElement.classList.remove('hidden'); 
        }

        document.getElementById('detail-grand-total').textContent = formatCurrency(sale.total_amount); 
        document.getElementById('detail-paid-amount').textContent = formatCurrency(sale.paid_amount); 
        document.getElementById('detail-remaining-debt').textContent = formatCurrency(sale.saldo_pendiente);
        
        
        // 6. RENDERIZADO DE ÍTEMS DE VENTA (Tabla detail-products-body)
        const productsBody = document.getElementById('detail-products-body');
        productsBody.innerHTML = '';
        
        (items || []).forEach(item => {
            const productData = item.productos;
            let finalName = productData?.name || 'Ítem Desconocido'; // Nombre base

            // 🛑 APLICANDO MEJORA: Mostrar el producto padre de forma limpia
            if (productData && productData.parent_product && window.allProductsMap) {
                const parentProduct = window.allProductsMap[productData.parent_product]; 
                // Aseguramos que el producto padre exista y que no sea el mismo que el hijo
                if (parentProduct && productData.name !== parentProduct.name) {
                    // Formato: Nombre del Ítem (P: Nombre del Padre)
                    finalName = `${productData.name} <span class="text-xs text-gray-500 ml-1">(P: ${parentProduct.name})</span>`;
                }
            }
            
            productsBody.innerHTML += `
                <tr>
                    <td class="px-4 py-2">${finalName}</td> 
                    <td class="px-4 py-2 text-center">${item.quantity}</td>
                    <td class="px-4 py-2 text-right">${formatCurrency(item.price)}</td>
                    <td class="px-4 py-2 font-medium text-right">${formatCurrency(item.subtotal)}</td>
                    <td class="px-4 py-2"></td>
                </tr>
            `;
        });
        
        // 7. RENDERIZADO DE ABONOS (Tabla detail-abonos-body)
        const abonosBody = document.getElementById('detail-abonos-body');
        const noAbonosMessage = document.getElementById('no-abonos-message');
        abonosBody.innerHTML = '';

        if (payments.length === 0) {
            noAbonosMessage.classList.remove('hidden');
        } else {
            noAbonosMessage.classList.add('hidden');
            payments.forEach(payment => {
                const metodoPagoDisplay = payment.metodo_pago || 'Pago Inicial'; 
                
                abonosBody.innerHTML += `
                    <tr>
                        <td class="px-4 py-2">${formatDate(payment.created_at)}</td>
                        <td class="px-4 py-2 font-medium text-right text-green-700">${formatCurrency(payment.amount)}</td>
                        <td class="px-4 py-2">${metodoPagoDisplay}</td>
                    </tr>
                `;
            });
        }
        
        // =======================================================
        // 8. LÓGICA CONDICIONAL: Edición de Precio ($0.00) vs Abono (Deuda Activa)
        // =======================================================
        
        const priceEditSection = document.getElementById('price-edit-section');
        const abonoButtonInSummary = document.querySelector('[data-open-modal="abono-client-modal"]'); 

        // Criterio para Venta Fantasma ($0.00)
        const isZeroSalePending = (parseFloat(sale.total_amount) < 0.01) && (parseFloat(sale.paid_amount) < 0.01) && (parseFloat(sale.saldo_pendiente) < 0.01);
        
        // Criterio para Deuda Activa
        const hasActiveDebt = parseFloat(sale.saldo_pendiente) > 0.01;
        const remainingDebt = sale.saldo_pendiente; 

        if (isZeroSalePending) {
            // VENTA FANTASMA: Habilitar Edición de Precio
            priceEditSection?.classList.remove('hidden');
            abonoButtonInSummary?.classList.add('hidden'); 
            
            const itemToEdit = (items || [])[0];
            document.getElementById('edit-sale-id-display').textContent = sale.venta_id;
            document.getElementById('edit-sale-transaction-id').value = sale.venta_id; 

            if (itemToEdit && itemToEdit.detalle_id) { 
                document.getElementById('edit-sale-detail-id').value = itemToEdit.detalle_id; 
                document.getElementById('edit-new-price').value = itemToEdit.price || ''; 
                
                // Relleno de Nombre de Producto para Edición
                const productData = itemToEdit.productos;
                let fullName = productData?.name || 'Ítem Principal';

                if (productData && productData.parent_product && window.allProductsMap) {
                    const parentProduct = window.allProductsMap[productData.parent_product]; 
                    if (parentProduct) {
                        fullName = `${parentProduct.name} (${productData.name})`;
                    }
                }
                document.getElementById('edit-product-name').textContent = fullName;
                
            } else {
                // Si la venta está a 0 pero no tiene detalle (caso raro), ocultamos edición
                priceEditSection?.classList.add('hidden');
            }
            
        } else if (hasActiveDebt) {
            // DEUDA ACTIVA: Habilitar Abono
            priceEditSection?.classList.add('hidden');
            abonoButtonInSummary?.classList.remove('hidden');
            
            // Rellenar Modal de Abono (Datos de Venta Específica)
            window.debtToPayId = sale.venta_id; // <-- CRÍTICO: Aquí indicamos que el abono es para esta Venta ID
            
            const debtIdInput = document.getElementById('debt-to-pay-id');
            const currentDebtSpan = document.getElementById('abono-current-debt');

            if (debtIdInput) {
                debtIdInput.value = sale.venta_id; 
            }
            if (currentDebtSpan) {
                currentDebtSpan.textContent = formatCurrency(remainingDebt);
            }
            
            // Adjuntar evento para abrir el modal de abono y pasar el ID de la VENTA
            if (abonoButtonInSummary) {
                abonoButtonInSummary.onclick = () => {
                    // Usamos la función de abono para pasar el ID de la VENTA (no el cliente)
                    window.openAbonoModal(sale.venta_id, client.name, remainingDebt); 
                };
            }
            
        } else {
            // VENTA PAGADA COMPLETAMENTE: Ocultar ambos
            priceEditSection?.classList.add('hidden');
            abonoButtonInSummary?.classList.add('hidden');
        }

        // 9. ABRIR EL MODAL
        openModal('modal-detail-sale');

    } catch (e) {
        console.error('Error al cargar detalles de venta:', e);
        alert('Hubo un error al cargar los detalles de la venta. ' + (e.message || ''));
    }
}

window.handleAbonoClientSubmit = async function(e) {
    e.preventDefault();

    if (!supabase) {
        console.error("Supabase no está inicializado.");
        alert("Error de configuración.");
        return;
    }

    const form = e.target;
    // Asumiendo que 'debt-to-pay-id' contiene el ID de la venta (venta_id)
    const ventaId = form.elements['debt-to-pay-id'].value; 
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
    // 🛑 CRÍTICO: Evita la recarga de la página
    e.preventDefault(); 

    if (!supabase) {
        alert("Error: Supabase no está inicializado.");
        return;
    }

    const form = e.target;
    // 🛑 Obtener el botón de submit para control de UX
    const submitBtn = form.querySelector('button[type="submit"]');

    // 1. Lectura y Validación de Datos
    const ventaId = form.elements['edit-sale-transaction-id'].value;
    const detalleId = form.elements['edit-sale-detail-id'].value;
    const newPriceValue = form.elements['edit-new-price'].value;
    const newPrice = parseFloat(newPriceValue);
    
    const clientId = window.viewingClientId; // ID del cliente para la recarga

    if (!ventaId || !detalleId || isNaN(newPrice) || newPrice <= 0 || !clientId) {
        alert("Faltan datos (Venta/Detalle/Cliente) o el precio es inválido (debe ser > 0).");
        return;
    }

    if (!confirm(`¿Está seguro de establecer el precio unitario de la Venta #${ventaId} a ${formatCurrency(newPrice)}? Esto definirá el total y el saldo pendiente.`)) {
        return;
    }

    // 2. Control de UX (Deshabilitar botón)
    submitBtn.disabled = true;
    submitBtn.textContent = 'Actualizando y Recalculando...';
    
    try {
        // 3. Obtener la CANTIDAD del detalle_venta 
        const { data: detail, error: detailFetchError } = await supabase
            .from('detalle_ventas')
            .select('quantity')
            .eq('detalle_id', detalleId)
            .single();

        if (detailFetchError || !detail) throw new Error("Detalle de venta no encontrado.");
        
        const newSubtotal = newPrice * detail.quantity; // Calcula el nuevo subtotal real
        
        // 4. Actualizar el detalle_venta (price y subtotal)
        const { error: updateDetailError } = await supabase
            .from('detalle_ventas')
            .update({ price: newPrice, subtotal: newSubtotal })
            .eq('detalle_id', detalleId);

        if (updateDetailError) throw new Error("Error al actualizar detalle: " + updateDetailError.message);

        // 5. Actualizar la tabla 'ventas' (total_amount y saldo_pendiente)
        const { error: updateSaleError } = await supabase
            .from('ventas')
            .update({ 
                total_amount: newSubtotal, 
                saldo_pendiente: newSubtotal, // Nuevo total = Saldo pendiente (se asume sin pagos previos)
                paid_amount: 0 // Se restablece el pago a cero 
            })
            .eq('venta_id', ventaId);

        if (updateSaleError) throw new Error("Error al actualizar venta: " + updateSaleError.message);

        alert(`Venta #${ventaId} actualizada con éxito. El saldo pendiente ahora es de ${formatCurrency(newSubtotal)}.`);

        // 6. RECARGA DE DATOS Y REFRESH DE UI
        closeModal('modal-detail-sale');
        
        // Recargar datos principales
        if (window.loadDashboardData) await loadDashboardData();
        if (window.loadMonthlySalesReport) await loadMonthlySalesReport(); 
        if (window.loadClientsTable) await loadClientsTable('gestion'); 
        
        // Reabrir el modal con los datos frescos para que el usuario vea la confirmación del cambio
        await handleViewSaleDetails(ventaId, clientId);

    } catch (error) {
        console.error('Error al editar precio de venta:', error);
        alert('Fallo al actualizar el precio: ' + (error.message || 'Error desconocido.'));
    } finally {
        // 7. RESTABLECER EL BOTÓN
        submitBtn.disabled = false;
        submitBtn.textContent = 'Actualizar Precio y Saldo';
    }
}
function loadProductsTable() {
    const container = document.getElementById('products-table-body');
    if (!container) return; 
   
    container.innerHTML = '';
      
    // Usar la variable global corregida
    const products = window.allProducts || []; 

    if (products.length === 0) {
        // Mostrar mensaje si no hay productos
        document.getElementById('no-products-message')?.classList.remove('hidden');
        return;
    }
    document.getElementById('no-products-message')?.classList.add('hidden');

    products.forEach(product => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-100 transition-colors';
        
        // Formato para el precio
        const formattedPrice = formatCurrency(product.price);
        
        // Indicador de Categoría
        let categoryDisplay = product.type;
        if (product.type === 'MAIN') categoryDisplay = 'Principal';
        if (product.type === 'PACKAGE') categoryDisplay = 'Subproducto';
        if (product.type === 'SERVICE') categoryDisplay = 'Servicio'; // Asumiendo SERVICE existe

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.producto_id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold">${formattedPrice}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${categoryDisplay}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                
                <button 
                    onclick="handleEditProductClick(${product.producto_id})" 
                    class="text-indigo-600 hover:text-indigo-900 edit-product-btn mr-2">
                    Editar
                </button>
                
                <button 
                    onclick="handleDeleteProductClick(${product.producto_id})" 
                    class="text-red-600 hover:text-red-900 delete-product-btn">
                    Eliminar
                </button>
            </td>
        `;
        container.appendChild(row);
    });
    
    // NOTA: Elimina el bloque de código document.querySelectorAll('.edit-product-btn').forEach(...)
    // y document.querySelectorAll('.delete-product-btn').forEach(...) que tenías antes,
    // ya que ahora usamos el onclick directo.
} window.loadProductsTable = loadProductsTable; // Asegurar exposición
/**
 * Maneja el envío del formulario de edición de precio en el modal de detalle de venta.
 * Actualiza 'detalle_ventas' y recalcula 'ventas' (total, pagado, saldo pendiente).
 */

function loadProductDataToForm(productId) {
    // 1. Encontrar el producto en el array global
    // Usamos String() para manejar inconsistencias de tipo entre number/string
    const productToEdit = allProducts.find(p => String(p.producto_id) === String(productId));

    //if (!productToEdit) {
       // alert('Error: Producto no encontrado para edición.');
       // return;
   // }
    
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
// La función DEBE estar expuesta globalmente si el formulario no tiene un listener en JS.
window.handleEditProduct = async function(e) { 
    e.preventDefault();

    if (!supabase || !window.editingProductId) { // Usar window.editingProductId si es global
        alert('Error: Supabase no está disponible o el ID del producto a editar es desconocido.');
        return;
    }
    
    // 1. Obtener valores del formulario de edición (USANDO IDs del HTML del modal)
    const nameInput = document.getElementById('edit-product-name');
    const categoryInput = document.getElementById('edit-product-category'); // ⬅️ CORREGIDO
    const priceInput = document.getElementById('edit-product-price');       // ⬅️ CORREGIDO

    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    
    // El valor del SELECT del HTML es "Producto", "Servicio" o "Paquete".
    const categoryValue = categoryInput.value; 
    const supabaseType = mapCategoryToSupabaseType(categoryValue); // Mapeamos a 'MAIN', 'SERVICE', 'PACKAGE'

    let parentProductId = null; 

    // 2. Validación de precio
    if (isNaN(price) || price < 0 || priceInput.value.trim() === '') {
        alert('El precio de venta debe ser un número válido (mayor o igual a cero).');
        return;
    }

    // 3. Lógica para Paquetes (Usamos el tipo mapeado)
    if (supabaseType === 'PACKAGE') {
        const parentSelect = document.getElementById('edit-product-parent'); // ⬅️ CORREGIDO
        parentProductId = parentSelect?.value || null; 
        
        // Verifica si la ID del padre es válida y diferente de la propia ID
        if (!parentProductId || parentProductId === 'placeholder-option-value' || String(parentProductId) === String(window.editingProductId)) { 
            alert('Los paquetes deben tener un Producto Principal asociado válido y no pueden ser su propio padre.');
            return;
        }
    }

    // 4. Objeto de datos a actualizar
    const productData = { 
        name: name, 
        type: supabaseType, // Usamos el tipo de Supabase
        price: price, 
        parent_product: parentProductId 
    };
    
    // ... (Resto del código de UX) ...

    // 6. Actualización en la base de datos
    const { error } = await supabase
        .from('productos')
        .update(productData)
        .eq('producto_id', window.editingProductId); // Usar la ID global

    // 7. Manejo de respuesta
    if (error) {
        // ... (Manejo de error) ...
    } else {
        alert('Producto actualizado exitosamente.');
        
        // Limpieza y recarga
        closeModal('edit-product-modal'); // ⬅️ CORREGIDO: Usar el ID real del modal
        document.getElementById('edit-product-form')?.reset(); 
                await loadAndRenderProducts();
    }
    
    // ... (Restablecer el botón) ...
    
    window.editingProductId = null; // Reseteamos la ID global SÓLO al final
}
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
        alert('Error de conexión: Supabase no está disponible.');
        return;
    }

    // 1. Obtener elementos del formulario
    const nameInput = document.getElementById('new-product-name');
    const typeInput = document.getElementById('new-product-type'); 
    const priceInput = document.getElementById('new-product-price'); 
    
    // 🛑 VERIFICACIÓN:
    if (!nameInput || !typeInput || !priceInput) {
        console.error("Error FATAL: No se encontraron todos los campos del formulario en el DOM.");
        alert("Error al intentar guardar el producto. Verifique los IDs en la consola.");
        return;
    }

    // 2. Leer valores
    const name = nameInput.value.trim();
    const type = typeInput.value; 
    const price = parseFloat(priceInput.value);
    let parentProductId = null;

    // 3. Validación de precio
    if (isNaN(price) || price < 0 || priceInput.value.trim() === '') {
        alert('El precio unitario debe ser un número válido (mayor o igual a cero).');
        return;
    }

    // 4. Lógica y validación para Paquetes (Subproductos)
    if (type === 'PACKAGE') {
        // ✅ CRÍTICO: Usamos el ID corregido del SELECT PADRE
        const parentSelect = document.getElementById('new-product-parent-select');
        parentProductId = parentSelect?.value || null; 
        
        if (!parentProductId || parentProductId === 'placeholder-option-value') { 
            alert('Los subproductos deben tener un Producto Principal asociado. Seleccione uno de la lista.');
            return;
        }
    }

    // 5. Inserción en la base de datos
    const { error } = await supabase
        .from('productos')
        .insert([{ 
            name: name, 
            type: type, 
            price: price, 
            parent_product: parentProductId // Será null si no es 'PACKAGE'
        }]);

    // 6. Manejo de respuesta
    if (error) {
        console.error('Error de Supabase al registrar producto:', error.message);
        alert('Error al registrar producto: ' + error.message);
    } else {
        alert('Producto registrado exitosamente.');
        
        // Cerrar el modal y resetear el formulario
        closeModal('new-product-modal'); 
        document.getElementById('new-product-form')?.reset(); 
        
        // Recargar datos (asumiendo que estas funciones existen)
              await loadAndRenderProducts();
    }
}
window.handleProductTypeChange = function() {
    const typeSelect = document.getElementById('new-product-type'); 
    const parentContainer = document.getElementById('new-product-parent-container');
    const parentSelect = document.getElementById('new-product-parent-select');

    if (!typeSelect || !parentContainer || !parentSelect) return;

    if (typeSelect.value === 'PACKAGE') {
        parentContainer.classList.remove('hidden'); 
        parentSelect.setAttribute('required', 'required');
    } else {
        parentContainer.classList.add('hidden');
        parentSelect.removeAttribute('required');
        parentSelect.value = ''; 
    }
}
window.handleEditProductClick = function(productId) {
    console.log("ID recibida del botón:", typeof productId, productId);
    console.log("Producto encontrado en el mapa:", window.allProductsMap[String(productId)]);

    window.editingProductId = productId; 
    loadProductDataToForm(productId); 
    openModal('edit-product-modal'); 
}
// Variable global para guardar la ID del producto a eliminar
let deletingProductId = null; 

window.handleDeleteProductClick = function(productId) {
    // 1. Asignar la ID a la variable global (asumimos que usas 'editingProductId' para ambas acciones)
    window.editingProductId = productId; 
    
    // 2. Obtener el producto para mostrar un mensaje claro
    // Asumimos que allProductsMap existe y está en window.allProductsMap
    const productToDelete = window.allProductsMap[String(productId)];

    // 3. Mostrar el nombre del producto en el placeholder
    const placeholder = document.getElementById('delete-product-name-placeholder');
    if (placeholder && productToDelete) {
        placeholder.textContent = productToDelete.name;
    }

    // 4. Abrir el modal (USANDO EL ID CORRECTO DEL BLOQUE HTML)
    openModal('delete-product-modal'); 
}
window.confirmDeleteProduct = async function() {
    if (!window.editingProductId) return;

    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Eliminando...'; 

    // 🛑 VOLVEMOS A: Usar .delete()
    const { error } = await supabase
        .from('productos')
        .delete() // ⬅️ Borrado físico
        .eq('producto_id', window.editingProductId); 

    if (error) {
        // 🚨 CRÍTICO: Manejar el error de clave foránea aquí
        if (error.code === '23503') { // Código estándar para violación de FK
            alert('¡ERROR! Este producto no se puede eliminar porque ya ha sido utilizado en una o más ventas (Historial de ventas). Considere la función "Archivar" (Borrado Lógico) en la BD.');
        } else {
            console.error('Error al eliminar producto:', error.message);
            alert('Error al eliminar producto: ' + error.message);
        }
    } else {
        alert('Producto eliminado exitosamente.');
             await loadAndRenderProducts();
    }

    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Sí, Eliminar';
    closeModal('delete-product-modal'); 
    window.editingProductId = null; 
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

// CRÍTICO: Asegúrate de que el botón de confirmación tenga su listener
document.getElementById('confirm-delete-client-btn')?.addEventListener('click', confirmDeleteClient);

// 11. DETALLE Y ABONO DE VENTA 
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

    // 1. Obtener datos de la venta
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

    try {
        // 2. Insertar el Pago en la tabla 'pagos'
        const { error: paymentError } = await supabase
            .from('pagos')
            .insert([{ 
                venta_id: venta_id, 
                client_id: ventaActual.client_id, 
                amount: paymentAmount, 
                metodo_pago: metodo_pago 
            }]);

        if (paymentError) throw new Error('Error al registrar pago: ' + paymentError.message);

        // 3. Actualizar el saldo pendiente en la tabla 'ventas'
        const { error: updateError } = await supabase
            .from('ventas')
            .update({ saldo_pendiente: newSaldoPendiente })
            .eq('venta_id', venta_id);

        if (updateError) throw new Error('Abono registrado, pero falló la actualización del saldo de la venta.');

        // 4. Recalcular y actualizar la deuda TOTAL del cliente
        // Buscar todos los saldos pendientes del cliente
        const { data: clientDebts, error: debtFetchError } = await supabase
            .from('ventas')
            .select('saldo_pendiente')
            .eq('client_id', ventaActual.client_id)
            .neq('saldo_pendiente', 0); 
            
        if (debtFetchError) throw new Error('Error al recalcular la deuda total del cliente.');

        // Sumar todos los saldos pendientes
        const newClientTotalDebt = clientDebts.reduce((sum, sale) => sum + sale.saldo_pendiente, 0);

        // Actualizar la Deuda Total en la tabla 'clientes'
        const { error: clientUpdateError } = await supabase
            .from('clientes')
            .update({ total_debt: newClientTotalDebt })
            .eq('client_id', ventaActual.client_id);
            
        if (clientUpdateError) throw new Error('Fallo la actualización del saldo TOTAL del cliente.');

        // 5. Finalización exitosa
        alert('Abono registrado y saldos actualizados exitosamente.');
        
        closeModal('modal-detail-sale');
        await loadDashboardData(); // Recarga general de datos

    } catch (error) {
        alert(`Ocurrió un error: ${error.message}`);
        console.error('Error en el flujo de abono:', error);
    }
}

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

function loadMonthlySalesReport(selectedMonthFromEvent, selectedYearFromEvent) {
    (async () => {
        if (!supabase) {
            console.error("Supabase no está inicializado. No se pueden cargar los reportes.");
            return;
        }

        const reportBody = document.getElementById('monthly-sales-report-body');
        const totalSalesEl = document.getElementById('report-total-sales');
        const totalDebtEl = document.getElementById('report-total-debt-generated');
        const noDataMessage = document.getElementById('monthly-report-no-data');

        if (!reportBody || !totalSalesEl || !totalDebtEl || !noDataMessage) {
            console.error("⛔️ FALLO DE DOM: Un elemento HTML del reporte no fue encontrado.");
            return; 
        }

        // Mostrar mensaje de carga
        reportBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Cargando reporte...</td></tr>';
        
        try {
            // 1. Lógica para obtener el mes/año
            const currentMonthNum = new Date().getMonth() + 1;
            const currentYearNum = new Date().getFullYear();
            
            let selectedMonth = (selectedMonthFromEvent && selectedMonthFromEvent >= 1 && selectedMonthFromEvent <= 12) 
                                     ? selectedMonthFromEvent 
                                     : currentMonthNum;

            let selectedYear = (selectedYearFromEvent && selectedYearFromEvent >= 2000) 
                                     ? selectedYearFromEvent 
                                     : currentYearNum;

            // 2. Lógica para calcular rangos de fecha UTC
            let startDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
            let nextMonth = selectedMonth; 
            let nextYear = selectedYear;

            if (nextMonth === 12) {
                nextMonth = 1;
                nextYear += 1;
            } else {
                nextMonth += 1;
            }

            let endDate = new Date(Date.UTC(nextYear, nextMonth - 1, 1)); 
            const isoStartDate = startDate.toISOString();
            const isoEndDate = endDate.toISOString();

            // 3. Consulta a Supabase
            const { data: sales, error } = await supabase
                .from('ventas')
                .select(`
                    venta_id, 
                    client_id, 
                    created_at, 
                    total_amount, 
                    saldo_pendiente,
                    clientes(name) 
                `)
                .gte('created_at', isoStartDate)
                .lt('created_at', isoEndDate) 
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // 4. Renderizado y Actualización de Totales
            let totalSales = 0;
            let totalDebtGenerated = 0;
            reportBody.innerHTML = ''; 

            if (sales && sales.length > 0) {
                
                sales.forEach(sale => {
                    totalSales += sale.total_amount;
                    totalDebtGenerated += sale.saldo_pendiente;
        
                    const clientName = sale.clientes?.name || 'Cliente Desconocido';
                    const formattedDate = formatDate(sale.created_at);
                    
                    const rowHTML = `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-500">${formattedDate} (Venta #${sale.venta_id})</td>
                            <td class="px-6 py-3 whitespace-nowrap font-medium text-gray-900">${clientName}</td>
                            <td class="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-700">${formatCurrency(sale.total_amount)}</td>
                            <td class="px-6 py-3 whitespace-nowrap text-sm text-right ${sale.saldo_pendiente > 0.01 ? 'text-red-600 font-bold' : 'text-green-600'}">
                                ${formatCurrency(sale.saldo_pendiente)}
                            </td>
                            <td class="px-6 py-3 whitespace-nowrap text-sm flex space-x-2">
                                <button 
                                    onclick="handleViewSaleDetails('${sale.venta_id}', '${sale.client_id}')" 
                                    class="text-indigo-600 hover:text-indigo-900 font-medium text-xs py-1 px-2 rounded bg-indigo-100 transition-colors"
                                    title="Ver Detalle de la Venta"
                                >
                                    <i class="fas fa-eye"></i>
                                </button>
                                
                                <button 
                                    onclick="handleDeleteSale('${sale.venta_id}', ${selectedMonth}, ${selectedYear})" // <-- Incluimos los filtros para la recarga
                                    class="text-red-600 hover:text-red-800 font-medium text-xs py-1 px-2 rounded bg-red-100 transition-colors"
                                    title="Eliminar Venta"
                                >
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    reportBody.insertAdjacentHTML('beforeend', rowHTML); 
                });
                
                noDataMessage.classList.add('hidden'); 

            } else {
                noDataMessage.classList.remove('hidden'); 
            }
            
            totalSalesEl.textContent = formatCurrency(totalSales);
            totalDebtEl.textContent = formatCurrency(totalDebtGenerated);

        } catch (e) {
            console.error('Error al cargar el reporte mensual:', e);
            reportBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-600">Fallo al cargar datos. Consulte la consola.</td></tr>';
            totalSalesEl.textContent = formatCurrency(0);
            totalDebtEl.textContent = formatCurrency(0);
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

window.loadAndRenderProducts = async function() {
     const allProducts = window.allProducts || []; 
    const tableBody = document.getElementById('products-table-body');
    
    if (!tableBody) {
        console.error("Error: No se encontró el <tbody> con ID 'products-table-body'.");
        return;
    }

    tableBody.innerHTML = ''; // Limpiar la tabla

    if (allProducts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay productos registrados.</td></tr>';
        return;
    }

    allProducts.forEach(producto => {
        let parentName = '';
        
        // CORRECCIÓN DE DATOS ANTIGUOS: Verifica si es paquete y procede a buscar.
        if (producto.type === 'PACKAGE') { 
            if (producto.parent_product) {
                // La búsqueda es correcta, usa el array local 'allProducts' que acabamos de definir.
                const parentProduct = allProducts.find(p => 
                    String(p.producto_id) === String(producto.parent_product)
                );
                
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
                <button onclick="handleEditProductClick(${producto.producto_id})" class="edit-product-btn text-blue-600 hover:text-blue-800 text-sm mr-2">Editar</button>
                <button onclick="handleDeleteProductClick(${producto.producto_id})" class="delete-product-btn text-red-600 hover:text-red-800 text-sm">Eliminar</button>
            </td>
        `;
    });
}

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
// Asegúrate de definir las variables globalmente (en main.js, fuera de funciones):
// window.allProducts = [];
// window.allProductsMap = {};

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

function switchView(viewId) {
    // 1. Desactivar el estilo de menú activo y ocultar todas las vistas
    document.querySelectorAll('.menu-item').forEach(link => {
        link.classList.remove('active-menu-item');
    });
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // 2. Mostrar la vista solicitada
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
    
    // 3. Activar el estilo del menú
    const activeLink = document.querySelector(`[data-view="${viewId}"]`);
    if (activeLink) {
        activeLink.classList.add('active-menu-item');
    }

    // 4. CRÍTICO: Cargar los datos específicos de la vista al cambiar

    if (viewId === 'home-view') {
        loadDashboardData();
    } else if (viewId === 'clients-view') {
        loadClientsTable('gestion');
    } else if (viewId === 'products-view') {
        loadAndRenderProducts();
    } else if (viewId === 'report-view') {
    // 🛑 LÓGICA DE INICIALIZACIÓN DIFERIDA (Corregida: Eliminar 'window.')
    
    // Asumiendo que 'reportSelectorsInitialized' es una variable global en main.js
    if (!reportSelectorsInitialized && typeof initReportSelectors === 'function') {
        console.log("--- INTENTANDO LLAMAR A LA INICIALIZACIÓN DE SELECTORES DIRECTAMENTE ---");
        
        // 🚀 CORRECCIÓN: Llamada Directa
        initReportSelectors(); 
        
        // La función initReportSelectors internamente llama a loadMonthlySalesReport() 
        // y establece reportSelectorsInitialized = true!
    } else if (typeof loadMonthlySalesReport === 'function') {
         // 🚀 CORRECCIÓN: Llamada Directa
         // Si ya se inicializó, solo recargamos el reporte
         loadMonthlySalesReport();
    }
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
    document.getElementById('abono-client-form')?.addEventListener('submit', handleRecordAbono);

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
    
    // ✅ DELEGACIÓN DE EVENTOS PRODUCTOS
    // Adjuntamos el listener al <tbody>, que es estático
    document.getElementById('products-table-body')?.addEventListener('click', (e) => {
        if (!e.target.hasAttribute('data-product-id')) return;
        
        const productId = e.target.getAttribute('data-product-id');

        // 1. Botón de Edición
        if (e.target.classList.contains('edit-product-btn')) {
            e.preventDefault();
            handleEditProductClick(productId); 
        }
        
        // 2. Botón de Eliminación
        if (e.target.classList.contains('delete-product-btn')) {
            e.preventDefault();
            handleDeleteProductClick(productId); 
        }
    });
    
    // Listener para el botón de confirmación de eliminación (del modal)
    document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDeleteProduct);
    document.getElementById('edit-product-form')?.addEventListener('submit', handleEditProduct);
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
    // ====================================================================
    // Listener para abrir el modal de abono desde el Reporte de Deuda
    // ====================================================================

    // 🛑 Listener para el formulario de Abono 🛑
    const abonoForm = document.getElementById('abono-client-form');
    abonoForm?.addEventListener('submit', handleAbonoClientSubmit);
    document.getElementById('open-abono-from-report-btn')?.addEventListener('click', (e) => {
        if (!window.viewingClientId) { 
            e.preventDefault();
            return;
        }

        const totalDebtText = document.getElementById('client-report-total-debt')?.textContent || '$0.00';
        const totalDebtValue = parseFloat(totalDebtText.replace(/[^0-9.-]+/g,"").replace(',', '.')); 

        if (totalDebtValue > 0.01) {
            
            debtToPayId = window.viewingClientId;

            const abonoCurrentDebt = document.getElementById('abono-current-debt');
            if (abonoCurrentDebt) {
                abonoCurrentDebt.textContent = totalDebtText;
            }

            openModal('modal-record-abono'); 
            closeModal('modal-client-debt-report');
        } else {
            e.preventDefault();
            alert("El cliente no tiene deuda pendiente para registrar un abono.");
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando aplicación...");

    // =======================================================
    // 1. Enlace de Formularios
    // =======================================================
    
    const editForm = document.getElementById('edit-sale-price-form');
    if (editForm) {
        editForm.addEventListener('submit', handlePriceEditSubmit);
       // console.log("Listener de edición de precio enlazado.");
    }

    // =======================================================
    // 2. Inicialización de Vistas y Selectores
    // =======================================================
   
    // Carga los datos iniciales del dashboard (widgets, estadísticas, etc.)
    if (window.loadDashboardData) {
        window.loadDashboardData();
        console.log("Datos del Dashboard cargados.");
    }
    
    // =======================================================
    // 3. Listeners Globales (Delegación de Eventos)
    // =======================================================
 document.body.addEventListener('click', (e) => {
    // Maneja botones de cierre (como la 'X')
    const closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) {
        const modalId = closeBtn.dataset.closeModal;
        window.closeModal(modalId);
        return; // Detiene la propagación
    }

    // Maneja botones de apertura (como el de 'Nuevo Cliente')
    const openBtn = e.target.closest('[data-open-modal]');
    if (openBtn) {
        const modalId = openBtn.dataset.openModal;
        // Solo llamar si la función de apertura especializada existe (como openRegisterClientModal)
        if (typeof window[`open${modalId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`] === 'function') {
             // Intenta llamar a una función específica (ej: window.openNewClientModal)
             window[`open${modalId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`]();
        } else {
            // Sino, usa la función genérica
            window.openModal(modalId);
        }
    }
    
    // Maneja el cierre del overlay (clic fuera)
    if (e.target.classList.contains('modal-overlay')) {
        const modalId = e.target.id;
        window.closeModal(modalId);
    }
});
});

document.addEventListener('DOMContentLoaded', () => {
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn && typeof window.confirmDeleteProduct === 'function') {
        // Llama a la función asíncrona que ejecuta la eliminación en Supabase
        confirmDeleteBtn.addEventListener('click', window.confirmDeleteProduct);
        console.log("✅ Listener de confirmación de eliminación conectado.");
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
            window.loadMainProductsForSaleSelect(); 
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