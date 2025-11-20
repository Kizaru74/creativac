```javascript
// main.js

// 1. IMPORTACIONES CRÍTICAS
// Importamos el CSS para que Vite lo compile
import './style.css'; 
// Importamos el cliente Supabase usando la sintaxis moderna de módulos
import { createClient } from '@supabase/supabase-js';

// 2. CONFIGURACIÓN DE VARIABLES DE ENTORNO (Vite compatible)
// Estas claves deben ser definidas en el panel de Netlify (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY; 

// 3. VARIABLES GLOBALES
let supabase;
let isSupabaseReady = false;

const COLLECTION_VENTAS = 'ventas';
const COLLECTION_CLIENTES = 'clientes';

let sales = [];
let clients = [];

const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
});

// 4. FUNCIONES DE RENDERING Y LECTURA
const renderSummary = () => {
    const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const totalDebtAmount = clients.reduce((sum, client) => sum + (client.debt || 0), 0);
    const debtorCount = clients.filter(client => (client.debt || 0) > 0).length;

    document.getElementById('total-sales').textContent = formatter.format(totalSalesAmount);
    document.getElementById('total-debt').textContent = formatter.format(totalDebtAmount);
    document.getElementById('debtor-count').textContent = debtorCount;
};

const renderSales = () => {
    const listEl = document.getElementById('sales-list');
    listEl.innerHTML = ''; 

    if (sales.length === 0) {
        listEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>`;
        return;
    }

    const sortedSales = sales.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    sortedSales.forEach(sale => {
        const date = sale.date ? new Date(sale.date).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
        }) : 'N/A';
        
        const row = `
            <tr class="hover:bg-gray-50">
                <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${sale.clientName}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${formatter.format(sale.amount)}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${sale.products || 'N/A'}</td>
            </tr>
        `;
        listEl.innerHTML += row;
    });
};

const renderDebts = () => {
    const listEl = document.getElementById('debt-list');
    listEl.innerHTML = ''; 

    const debtors = clients.filter(client => (client.debt || 0) > 0);

    if (debtors.length === 0) {
        listEl.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500">¡Felicidades! No hay deudas pendientes.</td></tr>`;
        return;
    }

    const sortedDebtors = debtors.sort((a, b) => (b.debt || 0) - (a.debt || 0));

    sortedDebtors.forEach(client => {
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
};

// FUNCIÓN CORREGIDA PARA EL ERROR "on is not a function"
const setupDataListeners = () => {
    const authStatusEl = document.getElementById('auth-status');

    // Suscripción a VENTAS (SINTAXIS MODERNA)
    supabase.from(COLLECTION_VENTAS)
        .on('postgres_changes', { event: '*', schema: 'public', table: COLLECTION_VENTAS }, async (payload) => { 
            console.log('Cambio en Ventas:', payload);
            await loadAllSales(); 
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                loadAllSales(); 
                authStatusEl.innerHTML = `✅ Conectado a Supabase. Estado: **Suscrito** a Ventas y Clientes.`;
            }
            if (err) { console.error("Error en la suscripción de ventas:", err); }
        });

    // Suscripción a CLIENTES (SINTAXIS MODERNA)
    supabase.from(COLLECTION_CLIENTES)
        .on('postgres_changes', { event: '*', schema: 'public', table: COLLECTION_CLIENTES }, async (payload) => { 
            console.log('Cambio en Clientes:', payload);
            await loadAllClients(); 
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') { loadAllClients(); }
            if (err) console.error("Error en la suscripción de clientes:", err);
        });
};

const loadAllSales = async () => {
    const { data, error } = await supabase.from(COLLECTION_VENTAS).select('*').order('date', { ascending: false }); 
    if (error) {
        console.error("Error al cargar ventas:", error);
        document.getElementById('sales-list').innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar datos: ${error.message}</td></tr>`;
    } else {
        sales = data || [];
        renderSales();
        renderSummary();
    }
};

const loadAllClients = async () => {
    const { data, error } = await supabase.from(COLLECTION_CLIENTES).select('*');
    if (error) {
        console.error("Error al cargar clientes:", error);
        document.getElementById('debt-list').innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">Error al cargar datos: ${error.message}</td></tr>`;
    } else {
        clients = data || [];
        renderDebts();
        renderSummary();
    }
};

// 5. MANEJADORES DE ESCRITURA (Expuestas al window para ser llamadas desde el HTML)

window.handleNewSale = async (event) => {
    event.preventDefault();
    if (!isSupabaseReady) return;

    const clientName = document.getElementById('sale-client-name').value.trim();
    const amount = parseFloat(document.getElementById('sale-amount').value);
    const products = document.getElementById('sale-products').value.trim();

    if (!clientName || isNaN(amount) || amount <= 0) {
        console.error('Datos de venta inválidos.');
        return;
    }

    try {
        const { error } = await supabase.from(COLLECTION_VENTAS).insert({
                "clientName": clientName,
                amount: amount,
                products: products.split(',').map(p => p.trim()).filter(p => p.length > 0).join(', '),
                date: new Date().toISOString(), 
            });

        if (error) throw error;

        document.getElementById('add-sale-form').reset();
        window.hideModal('add-sale-modal'); 
        console.log('Venta registrada con éxito.');
    } catch (e) {
        console.error("Error al agregar venta: ", e);
        alert(`Error al registrar venta: ${e.message}. Revisa la consola.`);
    }
};

window.handleUpdateDebt = async (event) => {
    event.preventDefault();
    if (!isSupabaseReady) return;

    const clientName = document.getElementById('debt-client-name').value.trim();
    const debtAmount = parseFloat(document.getElementById('debt-amount').value);
    
    if (!clientName || isNaN(debtAmount) || debtAmount < 0) {
        console.error('Datos de deuda inválidos.');
        return;
    }

    try {
        // Generamos el ID reemplazando caracteres no alfanuméricos con guiones bajos.
        // Se usa una cadena para la expresión regular para evitar el error de terminación.
        const nameCleaned = clientName.toLowerCase();
        const regex = /[^a-z0-9]/g; 
        const docId = nameCleaned.replace(regex, '_'); 

        const { error } = await supabase.from(COLLECTION_CLIENTES).upsert({
                id: docId, 
                name: clientName, 
                debt: debtAmount,
                "lastUpdate": new Date().toISOString(),
            });

        if (error) throw error;

        document.getElementById('update-debt-form').reset();
        window.hideModal('update-debt-modal'); 
        console.log(`Deuda para ${clientName} actualizada.`);
    } catch (e) {
        console.error("Error al actualizar deuda: ", e);
        alert(`Error al actualizar deuda: ${e.message}. Revisa la consola.`);
    }
};

// 6. INICIALIZACIÓN DE LA APLICACIÓN
const initApp = () => {
    const authStatusEl = document.getElementById('auth-status');

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            // Inicialización con las claves inyectadas por Netlify/Vite
            supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            isSupabaseReady = true;
            setupDataListeners();
        } catch (e) {
            authStatusEl.innerHTML = `❌ Error al inicializar Supabase. Revise las claves en Netlify.`;
            console.error("Error al inicializar cliente Supabase:", e);
        }
    } else {
        authStatusEl.innerHTML = `❌ Error: **Faltan las variables de entorno** (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY). Configúrelas en Netlify.`;
        console.error("No se pudo iniciar la conexión a Supabase: Faltan variables de entorno.");
    }
};

window.onload = initApp; 
```




