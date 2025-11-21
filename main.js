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
// 2. UTILIDADES DE LA INTERFAZ DE USUARIO
// ----------------------------------------------------------------------

const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
});

/** Muestra un modal por su ID. */
const showModal = (id) => {
    document.getElementById(id).classList.remove('hidden');
};

/** Oculta un modal por su ID. */
const hideModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};

// ----------------------------------------------------------------------
// 3. MANEJO DE DATOS (CONEXIÓN SUPABASE CORREGIDA CON 'created_at')
// ----------------------------------------------------------------------

async function loadDashboardData() {
    // 1. Obtener datos de ventas 
    // CORRECCIÓN FINAL: Usando 'created_at' para ordenar, el nombre por defecto de Supabase
    const { data: sales, error: salesError } = await supabase
        .from('ventas') 
        .select('*')
        .order('created_at', { ascending: false }); 

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

    // 3. Renderizar datos
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

function renderSales(sales) {
    const listEl = document.getElementById('sales-list');
    listEl.innerHTML = '';
    
    if (sales.length === 0) {
        listEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>`;
        return;
    }

    sales.slice(0, 10).forEach(sale => {
        // CORRECCIÓN FINAL: Usando 'created_at' para extraer la fecha
        const date = sale.created_at ? new Date(sale.created_at).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
        }) : 'N/A';
        
        const row = `
            <tr class="hover:bg-gray-50">
                <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${sale.clientName || 'N/A'}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${formatter.format(sale.amount || 0)}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${sale.products || 'N/A'}</td>
            </tr>
        `;
        listEl.innerHTML += row;
    });
}

function renderDebts(clients) {
    const listEl = document.getElementById('debt-list');
    listEl.innerHTML = ''; 
    
    const debtors = clients.filter(client => (client.debt || 0) > 0);
    
    if (debtors.length === 0) {
        listEl.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500">¡Felicidades! No hay deudas pendientes.</td></tr>`;
        return;
    }

    debtors.sort((a, b) => (b.debt || 0) - (a.debt || 0)).forEach(client => {
        // Asumiendo que la columna de fecha en la tabla 'clientes' se llama 'lastUpdate'
        const date = client.lastUpdate ? new Date(client.lastUpdate).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
        }) : 'N/A';
        
        const row = `
            <tr class="hover:bg-red-50">
                <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
                <td class="p-4 whitespace-nowrap text-sm font-bold text-red-600">${formatter.format(client.debt)}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
            </tr>
        `;
        listEl.innerHTML += row;
    });
}

// ----------------------------------------------------------------------
// 4. MANEJO DE FORMULARIOS 
// ----------------------------------------------------------------------

document.getElementById('add-sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Registrando nueva venta...");
    
    const clientName = document.getElementById('sale-client-name').value;
    const amount = parseFloat(document.getElementById('sale-amount').value);
    const products = document.getElementById('sale-products').value;
    
    // PENDIENTE DE IMPLEMENTAR:
    /*
    const { error } = await supabase.from('ventas').insert({
        clientName: clientName, 
        amount: amount, 
        products: products
        // created_at se llena automáticamente por Supabase
    });
    
    if (!error) {
        hideModal('add-sale-modal');
        document.getElementById('add-sale-form').reset();
        loadDashboardData(); 
    } else {
        console.error("Error al registrar venta:", error);
        alert("Hubo un error al registrar la venta.");
    }
    */
    
    // Ocultar modal solo para fines de prueba si la inserción está comentada
    hideModal('add-sale-modal'); 
    document.getElementById('add-sale-form').reset();
});

document.getElementById('update-debt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Actualizando deuda...");
    
    const clientName = document.getElementById('debt-client-name').value;
    const debtAmount = parseFloat(document.getElementById('debt-amount').value);
    
    // PENDIENTE DE IMPLEMENTAR:
    /*
    const { error } = await supabase.from('clientes').upsert({
        name: clientName, 
        debt: debtAmount, 
        lastUpdate: new Date().toISOString()
    }, { onConflict: 'name' }); 
    
    if (!error) {
        hideModal('update-debt-modal');
        document.getElementById('update-debt-form').reset();
        loadDashboardData(); 
    } else {
        console.error("Error al actualizar deuda:", error);
        alert("Hubo un error al actualizar la deuda.");
    }
    */

    // Ocultar modal solo para fines de prueba si la inserción está comentada
    hideModal('update-debt-modal'); 
    document.getElementById('update-debt-form').reset();
});


// ----------------------------------------------------------------------
// 5. INICIALIZACIÓN Y LISTENERS DE EVENTOS
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // Conectar botones principales
    document.getElementById('addSaleBtn').addEventListener('click', () => showModal('add-sale-modal'));
    document.getElementById('updateDebtBtn').addEventListener('click', () => showModal('update-debt-modal'));
    
    // Conectar botones de Cancelar en los modales
    document.getElementById('cancelAddSale').addEventListener('click', () => hideModal('add-sale-modal'));
    document.getElementById('cancelUpdateDebt').addEventListener('click', () => hideModal('update-debt-modal'));
    
    // Conectar el botón de salir
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Cerrar sesión (Lógica Supabase auth pendiente)");
    });

    // Iniciar la carga de datos
    loadDashboardData(); 
});