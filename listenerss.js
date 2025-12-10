document.addEventListener('DOMContentLoaded', async () => { 

    // ====================================================================
    // 0. FUNCIONES UTILITY PARA MANEJO DE MODALES (¡CRÍTICO: VAN PRIMERO!)
    // ====================================================================

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Elimina la clase 'hidden' para mostrar el modal
            modal.classList.remove('hidden'); 
            // Añade 'flex' para asegurar que el modal se centre (si usas Tailwind)
            modal.classList.add('flex');
        } else {
            console.error(`Error: Modal con ID '${modalId}' no encontrado.`);
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Añade la clase 'hidden' para ocultar el modal
            modal.classList.add('hidden');
            // Quita 'flex'
            modal.classList.remove('flex');
            
            // Opcional: Si el modal tiene un formulario, lo resetea
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }

    // --- Apertura Universal para botones con data-open-modal ---
    document.querySelectorAll('[data-open-modal]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = button.getAttribute('data-open-modal');
            openModal(modalId); 
        });
    });
    
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
    document.querySelectorAll('.content-view').forEach(view => {
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
        loadClientsTable('gestion'); // Asumo que este es el ID del modal de clientes en gestión
    } else if (viewId === 'products-view') {
        loadAndRenderProducts(); // Asumo que esta función carga la tabla de productos
    } else if (viewId === 'report-view') {
        loadMonthlySalesReport(); 
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
        // Asegúrate de que las variables SUPABASE_URL y SUPABASE_ANON_KEY 
        // están definidas en la parte superior del archivo.
        // Si ya están definidas fuera de este bloque, la siguiente línea es correcta:
        // supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Si ya tenías esta lógica fuera de DOMContentLoaded:
        // Quita la siguiente línea si ya la tienes en la parte superior.
        // if (!supabase) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 
        
        // Asumiendo que las variables globales ya están inicializadas:
        // Si tu código original en main.js ya inicializa 'supabase' fuera de este bloque, puedes comentarlo.
        // Si no, debes añadir la inicialización aquí si es el único lugar donde lo haces.
        // if (!supabase) { 
        //    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // }
    } else {
        console.error("Error Fatal: Librería Supabase no encontrada. La aplicación no funcionará.");
        return;
    }


    // Tu código original:
    // 1. 🚨 MUEVE LA INICIALIZACIÓN DE SUPABASE AQUÍ
    if (window.supabase) {
        // Si 'supabase' no está definido globalmente (fuera de DOMContentLoaded)
        if (!supabase) {
             // ASUMO que SUPABASE_URL y SUPABASE_ANON_KEY están accesibles
             // Esto es una redundancia si ya lo hiciste arriba, revisa tu main.js
             // supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } else {
        console.error("Error Fatal: Librería Supabase no encontrada. La aplicación no funcionará.");
        // return; // Si ya se hizo fuera del bloque, esto puede ser omitido.
    }


    // 2. Continúa con tus llamadas iniciales
    await loadProductsData();
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
    // --------------------------------------------------

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

    // Admin clientes
    document.getElementById('admin-clients-btn')?.addEventListener('click', async () => {
        // 1. Abre el modal principal
        openModal('modal-admin-clients'); 
        
        // 2. Llama directamente a la función de tabla en MODO 'gestion'
        await loadClientsTable('gestion'); 
    });


    // Escucha eventos de la tabla de Reporte Mensual (Delegación)
    const monthlySalesModal = document.getElementById('modal-monthly-report'); 
    monthlySalesModal?.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-sale-details-btn')) {
            const ventaId = e.target.getAttribute('data-venta-id');
            const clientId = e.target.getAttribute('data-client-id');
            
            handleViewSaleDetails(ventaId, clientId);
        }
    });

    // -----------------------------------------------
    // Listeners de MODAL CLIENTES (BLOQUE CORREGIDO)
    // -----------------------------------------------
    window.openRegisterClientModal = function() {
        const titleElement = document.getElementById('client-modal-title');
        if (titleElement) {
            titleElement.textContent = 'Registrar Nuevo Cliente';
        }
        
        const form = document.getElementById('new-client-form'); 
        
        form?.reset(); 
        form?.removeEventListener('submit', handleEditClient);
        form?.addEventListener('submit', handleNewClient);
        
        editingClientId = null;
        
        openModal('modal-new-client'); 
    };

    // Listener para el envío del formulario de edición de precio post-venta
    document.getElementById('post-sale-price-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const ventaId = document.getElementById('edit-venta-id').value;
        const detalleVentaId = document.getElementById('edit-detalle-venta-id').value;
        const clientId = document.getElementById('edit-client-id').value;
        const newPrice = parseFloat(document.getElementById('new-unit-price').value);

        await handlePostSalePriceUpdate(ventaId, detalleVentaId, clientId, newPrice);
        
        closeModal('modal-edit-sale-item');
    });

    // ------------------------------------
    // --- LISTENERS DE MODAL PRODUCTOS ---
    // ------------------------------------

    // Listener para el botón principal (Abre la LISTA/ADMINISTRACIÓN)
    document.getElementById('open-admin-products-modal')?.addEventListener('click', async () => {
        try {
            await loadProductsData();
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


    // ====================================================================
    // ✅ DELEGACIÓN DE EVENTOS PRODUCTOS
    // ====================================================================

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