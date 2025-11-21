// main.js

import './style.css'; 
import { createClient } from '@supabase/supabase-js'; 

// ----------------------------------------------------------------------
// 1. CONFIGURACIÓN DE SUPABASE (¡REEMPLAZAR!)
// ----------------------------------------------------------------------

const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

/** Muestra/Oculta el estado de carga en los botones (Retroalimentación Visual) */
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
        
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
};

// ----------------------------------------------------------------------
// 3. MANEJO DE DATOS Y RENDERIZADO
// ----------------------------------------------------------------------

async function loadDashboardData() {
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

function updateSummary(sales, clients) {
    const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const totalDebtAmount = clients.reduce((sum, client) => sum + (client.debt || 0), 0);
    const debtorCount = clients.filter(client => (client.debt || 0) > 0).length;

    document.getElementById('total-sales').textContent = formatter.format(totalSalesAmount);
    document.getElementById('total-debt').textContent = formatter.format(totalDebtAmount);
    document.getElementById('debtor-count').textContent = debtorCount;

    document.body.classList.remove('loading-hide');
}

/** Renderiza la lista de ventas. */
function renderSales(sales) {
    const listEl = document.getElementById('sales-list');
    listEl.innerHTML = `
        <tr class="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-100">
            <th class="p-4 text-left">Cliente</th>
            <th class="p-4 text-left">Monto</th>
            <th class="p-4 text-left">Fecha</th>
            <th class="p-4 text-left">Productos</th>
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

        const row = `
            <tr class="hover:bg-gray-50">
                <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${sale.clientName || 'N/A'}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${formatter.format(sale.amount || 0)}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${sale.products || 'N/A'}</td>
                
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

/** Renderiza la lista de deudas. Incluye botón de Edición Rápida. */
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

// 4.1. Registrar Nueva Venta (INSERT y Trigger Automático de Deuda)
document.getElementById('add-sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('add-sale-form', true); // <-- INICIO DE CARGA
    
    const clientName = document.getElementById('sale-client-name').value.trim();
    const amount = parseFloat(document.getElementById('sale-amount').value);
    const products = document.getElementById('sale-products').value.trim();
    
    if (!clientName || isNaN(amount) || amount <= 0) {
        alert("Por favor, complete el nombre del cliente y el monto de la venta.");
        toggleLoading('add-sale-form', false);
        return;
    }
    
    // CORRECCIÓN: Se añade 'date' para que el TRIGGER pueda usar NEW.date
    const { error } = await supabase.from('ventas').insert({
        clientName: clientName, 
        amount: amount, 
        products: products,
        date: new Date().toISOString(), 
    });
    
    if (!error) {
        hideModal('add-sale-modal');
        document.getElementById('add-sale-form').reset();
        loadDashboardData(); 
    } else {
        console.error("Error al registrar venta:", error);
        alert(`Hubo un error al registrar la venta. Código: ${error.code}`);
    }
    
    toggleLoading('add-sale-form', false); // <-- FIN DE CARGA
});

// 4.2. Actualizar/Insertar Deuda (UPSERT para liquidación o ajuste manual)
document.getElementById('update-debt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('update-debt-form', true); // <-- INICIO DE CARGA
    
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

        // Retroalimentación UX Avanzada
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
    
    toggleLoading('update-debt-form', false); // <-- FIN DE CARGA
});

// 4.3. Lógica para botones de Editar y Eliminar Ventas
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
            
            if (confirm("¿Estás seguro de que quieres eliminar esta venta permanentemente? Esta acción NO revierte la deuda asociada.")) {
                
                // Nota: La eliminación de la venta debe ser manejada manualmente en la deuda,
                // o se debe crear otro Trigger para restar el monto.
                
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

// 4.4. Lógica para botones de Edición Rápida de Deudas
function initializeDebtActions() {
    document.querySelectorAll('.quick-edit-debt-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const clientName = e.currentTarget.dataset.clientName;
            
            document.getElementById('debt-client-name').value = clientName;
            document.getElementById('debt-amount').value = ''; 

            showModal('update-debt-modal');
            document.getElementById('debt-amount').focus(); // UX: Enfocar el monto
        });
    });
}


// 4.5. Manejar el envío del formulario de Edición de Venta (UPDATE)
document.getElementById('edit-sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading('edit-sale-form', true); // <-- INICIO DE CARGA
    
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
        // Nota: Si el monto se cambia, la deuda no se actualiza automáticamente. 
        // Para esto se necesitaría un TRIGGER más complejo (UPDATE)
        loadDashboardData(); 
    } else {
        console.error("Error al guardar cambios:", error);
        alert(`Hubo un error al actualizar la venta. Código: ${error.code}`);
    }
    
    toggleLoading('edit-sale-form', false); // <-- FIN DE CARGA
});


// ----------------------------------------------------------------------
// 5. INICIALIZACIÓN Y LISTENERS DE EVENTOS
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // Conectar botones principales
    document.getElementById('addSaleBtn').addEventListener('click', () => showModal('add-sale-modal'));
    
    // UX: Limpiar formulario y enfocar el nombre al abrir el modal principal
    document.getElementById('updateDebtBtn').addEventListener('click', () => {
        showModal('update-debt-modal');
        document.getElementById('update-debt-form').reset(); 
        document.getElementById('debt-client-name').focus(); // UX: Enfocar el nombre
    });
    
    // Conectar botones de Cancelar
    document.getElementById('cancelAddSale').addEventListener('click', () => hideModal('add-sale-modal'));
    document.getElementById('cancelUpdateDebt').addEventListener('click', () => hideModal('update-debt-modal'));
    document.getElementById('cancelEditSale').addEventListener('click', () => hideModal('edit-sale-modal'));
    
    // Conectar el botón de salir
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error al cerrar sesión:", error);
            alert("No se pudo cerrar la sesión.");
        } else {
            window.location.reload(); 
        }
    });

    loadDashboardData(); 
});