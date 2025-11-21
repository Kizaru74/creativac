// main.js

import './style.css'; 
import { createClient } from '@supabase/supabase-js'; 

// ----------------------------------------------------------------------
// 1. CONFIGURACIÓN DE SUPABASE (REEMPLAZAR)
// ----------------------------------------------------------------------

const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----------------------------------------------------------------------
// 2. UTILIDADES DE LA INTERFAZ DE USUARIO (RESTAURADAS)
// ----------------------------------------------------------------------

const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
});

/** Muestra un modal por su ID. */
export const showModal = (id) => {
    document.getElementById(id).classList.remove('hidden');
    // Si necesitas más efectos (opacidad, etc.), agrégalos aquí.
};

/** Oculta un modal por su ID. */
export const hideModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};

// ----------------------------------------------------------------------
// 3. FUNCIONES DE BASE DE DATOS (ADAPTADAS A SUPABASE)
// ----------------------------------------------------------------------

async function loadDashboardData() {
    // 1. Obtener datos de ventas
    const { data: sales, error: salesError } = await supabase
        .from('ventas') // Reemplaza 'ventas' por el nombre de tu tabla
        .select('*')
        .order('fecha', { ascending: false }) // Suponiendo que tienes una columna 'fecha'

    // 2. Obtener datos de clientes/deudas
    const { data: clients, error: clientsError } = await supabase
        .from('clientes') // Reemplaza 'clientes' por el nombre de tu tabla
        .select('*')
        .gt('debt', 0); // Solo clientes con deuda > 0

    if (salesError || clientsError) {
        console.error("Error al obtener datos:", salesError || clientsError);
        // Podrías actualizar el UI con un mensaje de error aquí
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

    // Quita la clase loading-hide una vez que los datos iniciales han cargado
    document.body.classList.remove('loading-hide');
}

function renderSales(sales) {
    const listEl = document.getElementById('sales-list');
    listEl.innerHTML = '';
    
    if (sales.length === 0) {
        listEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>`;
        return;
    }

    sales.slice(0, 10).forEach(sale => { // Mostrar solo 10 ventas recientes
        const date = sale.fecha ? new Date(sale.fecha).toLocaleDateString('es-MX', {
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

// Implementar las funciones de registro de datos aquí (handleNewSale, handleUpdateDebt)
// ... (omito el código de manejo de formularios por brevedad, asumiendo que lo adaptarás)

// ----------------------------------------------------------------------
// 4. LÓGICA DE INICIO Y LISTENERS DE EVENTOS
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Inicializando la aplicación...");

    // Conectar botones a las funciones de Modales (RESTAURADO)
    document.getElementById('addSaleBtn').addEventListener('click', () => showModal('add-sale-modal'));
    document.getElementById('updateDebtBtn').addEventListener('click', () => showModal('update-debt-modal'));
    
    // Conectar el botón de salir
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Cerrar sesión (Lógica Supabase pendiente)");
        // Aquí iría la lógica: await supabase.auth.signOut();
    });

    // Cargar datos (Descomentar cuando las credenciales estén puestas)
    loadDashboardData(); 
});