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
// 3. MANEJO DE DATOS (SOLUCIÓN DEFINITIVA CON 'date')
// ----------------------------------------------------------------------

async function loadDashboardData() {
    // 1. Obtener datos de ventas 
    const { data: sales, error: salesError } = await supabase
        .from('ventas') 
        .select('*')
        .order('date', { ascending: false }); // Usando 'date'

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

function renderSales(sales) {
    const listEl = document.getElementById('sales-list');
    listEl.innerHTML = '';
    
    if (sales.length === 0) {
        listEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>`;
        return;
    }

    sales.slice(0, 10).forEach(sale => {
        const date = sale.date ? new Date(sale.date).toLocaleDateString('es-MX', {
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
// 4. MANEJO DE FORMULARIOS (IMPLEMENTACIÓN COMPLETA) 🚀
// ----------------------------------------------------------------------

document.getElementById('add-sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Registrando nueva venta...");
    
    const clientName = document.getElementById('sale-client-name').value.trim();
    const amount = parseFloat(document.getElementById('sale-amount').value);
    const products = document.getElementById('sale-products').value.trim();
    
    if (!clientName || isNaN(amount) || amount <= 0) {
        alert("Por favor, complete el nombre del cliente y el monto de la venta.");
        return;
    }
    
    const { error } = await supabase.from('ventas').insert({
        clientName: clientName, 
        amount: amount, 
        products: products,
        // La columna 'date' se llena automáticamente con el DEFAULT NOW() en tu esquema.
        // Si no se llenara, podrías añadir: date: new Date().toISOString()
    });
    
    if (!error) {
        hideModal('add-sale-modal');
        document.getElementById('add-sale-form').reset();
        // Recargar datos para ver la nueva venta
        loadDashboardData(); 
    } else {
        console.error("Error al registrar venta:", error);
        alert(`Hubo un error al registrar la venta. Código: ${error.code}`);
    }
});

document.getElementById('update-debt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Actualizando deuda...");
    
    const clientName = document.getElementById('debt-client-name').value.trim();
    const debtAmount = parseFloat(document.getElementById('debt-amount').value);
    
    if (!clientName || isNaN(debtAmount) || debtAmount < 0) {
        alert("Por favor, complete el nombre del cliente y un monto de deuda válido (>= 0).");
        return;
    }

    const { error } = await supabase.from('clientes').upsert(
        {
            name: clientName, 
            debt: debtAmount, 
            lastUpdate: new Date().toISOString()
        }, 
        { 
            // Esto le dice a Supabase que si el 'name' ya existe, lo actualice (UPSERT).
            // Si tu tabla 'clientes' usa otro campo como clave principal (ej. 'id'), 
            // necesitarías ajustar esta opción o el diseño de la tabla.
            onConflict: 'name' 
        }
    );
    
    if (!error) {
        hideModal('update-debt-modal');
        document.getElementById('update-debt-form').reset();
        // Recargar datos para ver la deuda actualizada
        loadDashboardData(); 
    } else {
        console.error("Error al actualizar deuda:", error);
        alert(`Hubo un error al actualizar la deuda. Código: ${error.code}`);
    }
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
    
    // Conectar el botón de salir (IMPLEMENTACIÓN COMPLETA)
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error al cerrar sesión:", error);
            alert("No se pudo cerrar la sesión.");
        } else {
            // Redirigir al usuario a la página de inicio de sesión o a index
            window.location.reload(); // O redirige a login.html si lo tienes
        }
    });

    // Iniciar la carga de datos
    loadDashboardData(); 
});