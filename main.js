import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ===============================================
// 1. CONFIGURACIÓN Y CLIENTE SUPABASE
// ===============================================
// **IMPORTANTE:** Reemplaza con tus claves reales
const SUPABASE_URL = 'https://wnwftbamyaotqdsivmas.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let CLIENTS_CACHE = []; // Cache para clientes (asumo que tienes esta variable)

// ===============================================
// 2. REFERENCIAS DEL DOM
// ===============================================

// Contenedores Principales
const authModal = document.getElementById('auth-modal');
const appContainer = document.getElementById('app-container');

// Dashboard Info
const totalSalesDisplay = document.getElementById('total-sales');
const totalDebtDisplay = document.getElementById('total-debt');
const debtorCountDisplay = document.getElementById('debtor-count');
const debtListBody = document.getElementById('debt-list');
const salesListBody = document.getElementById('sales-list');

// Botones y Formularios de Auth/Perfil
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logoutBtn');
const openProfileModalBtn = document.getElementById('openProfileModalBtn');
const userProfileModal = document.getElementById('user-profile-modal');
const closeProfileModalBtn = document.getElementById('closeProfileModal');
const profileUpdateForm = document.getElementById('profile-update-form');
const profileEmailDisplay = document.getElementById('profile-email-display');
const profileUsernameInput = document.getElementById('profile-username-input');

// Modales de Acciones
const addSaleBtn = document.getElementById('addSaleBtn');
const updateDebtBtn = document.getElementById('updateDebtBtn');
const addSaleModal = document.getElementById('add-sale-modal');
const updateDebtModal = document.getElementById('update-debt-modal');
const closeAddSaleModalBtn = document.getElementById('close-add-sale-modal');
const closeUpdateDebtModalBtn = document.getElementById('close-update-debt-modal');

// Formularios de Acciones
const addSaleForm = document.getElementById('add-sale-form');
const saleCategorySelector = document.getElementById('sale-category-id'); // Selector de Categorías
const debtClientDisplay = document.getElementById('debt-client-display');
const updateDebtForm = document.getElementById('update-debt-form');

// Admin Productos (NUEVO)
const addProductAdminBtn = document.getElementById('addProductAdminBtn');
const productAdminModal = document.getElementById('product-admin-modal');
const closeProductAdminModalBtn = document.getElementById('close-product-admin-modal');


// ===============================================
// 3. FUNCIONES DE AUTENTICACIÓN
// ===============================================

// (Asumo que tus funciones de signIn, signOut, getProfile y updateProfile están aquí)
// (Mantengo la estructura para que sepas dónde va tu lógica existente)
// ...

function checkAuthStatus() {
    const user = supabase.auth.getSession();
    console.log('Estado de autenticación:', user ? 'SIGNED_IN' : 'INITIAL_SESSION');
    if (user) {
        authModal.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initializeApp();
    } else {
        authModal.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}

// ===============================================
// 4. FUNCIONES CRUD CATEGORÍAS (NUEVO)
// ===============================================

/**
 * Obtiene todas las categorías de la base de datos.
 */
async function fetchCategories() {
    const { data, error } = await supabase
        .from('categorias')
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al obtener categorías:', error);
        return [];
    }
    return data;
}

/**
 * Agrega una nueva categoría.
 */
async function addCategory(name) {
    try {
        const { error } = await supabase
            .from('categorias')
            .insert([{ name: name }]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error al agregar categoría:', error);
        alert(`Error al agregar categoría: ${error.message}`);
        return false;
    }
}

/**
 * Elimina una categoría por su ID.
 */
async function deleteCategory(categoryId) {
    try {
        const { error } = await supabase
            .from('categorias')
            .delete()
            .eq('id', categoryId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        alert(`Error al eliminar categoría. Asegúrate de que no haya ventas asociadas: ${error.message}`);
        return false;
    }
}


// ===============================================
// 5. FUNCIONES DE VISTA Y LÓGICA CATEGORÍAS (NUEVO)
// ===============================================

/**
 * Llena el selector de categorías en el modal de registro de venta.
 */
async function populateCategorySelector() {
    const categories = await fetchCategories();
    
    // Limpiar opciones previas
    saleCategorySelector.innerHTML = '<option value="">-- Seleccionar Categoría --</option>';

    if (categories && categories.length > 0) {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            saleCategorySelector.appendChild(option);
        });
    } else {
        // Muestra un mensaje si no hay categorías (o si hay error)
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No hay categorías (Error de Supabase?)';
        saleCategorySelector.appendChild(option);
    }
}

/**
 * Renderiza el formulario y la lista de categorías en el modal de administración.
 */
async function loadCategoryAdminList() {
    const modalContent = productAdminModal.querySelector('.p-6:last-child');
    const categories = await fetchCategories();

    // 1. Renderizar Formulario de Nueva Categoría
    const formHtml = `
        <div class="border p-4 rounded-lg bg-gray-50 mb-6">
            <h4 class="text-lg font-semibold mb-3">Añadir Nueva Categoría</h4>
            <form id="add-category-form" class="flex gap-4">
                <input type="text" id="category-name-input" required 
                       placeholder="Nombre de la Categoría"
                       class="flex-grow p-2 border rounded-md" minlength="3">
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                    Guardar
                </button>
            </form>
        </div>
    `;

    // 2. Renderizar Tabla de Categorías
    let listHtml = '<h4 class="text-lg font-semibold mb-3">Lista de Categorías Existentes</h4>';

    if (categories.length === 0) {
        listHtml += '<p class="text-gray-500">No hay categorías registradas.</p>';
    } else {
        listHtml += `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                            <th class="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${categories.map(cat => `
                            <tr>
                                <td class="p-3 whitespace-nowrap text-sm text-gray-900">${cat.id}</td>
                                <td class="p-3 text-sm text-gray-700">${cat.name}</td>
                                <td class="p-3 whitespace-nowrap text-sm font-medium">
                                    <button data-category-id="${cat.id}" 
                                            class="delete-category-btn text-red-600 hover:text-red-900 text-sm">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    modalContent.innerHTML = formHtml + listHtml;

    // Agregar listeners a los botones de eliminar (delegación)
    modalContent.querySelectorAll('.delete-category-btn').forEach(button => {
        button.addEventListener('click', handleDeleteCategory);
    });
}

/**
 * Maneja el envío del formulario para agregar una nueva categoría.
 */
async function handleAddCategory(form) {
    const categoryNameInput = form.querySelector('#category-name-input');
    const name = categoryNameInput.value.trim();

    if (!name) {
        alert('Por favor, ingresa un nombre para la categoría.');
        return;
    }

    const success = await addCategory(name);

    if (success) {
        alert('Categoría creada con éxito.');
        categoryNameInput.value = ''; // Limpiar campo
        await loadCategoryAdminList(); // Recargar la lista en el modal
        await populateCategorySelector(); // Recargar el selector de venta
    }
}

/**
 * Maneja el clic en el botón de eliminar categoría.
 */
async function handleDeleteCategory(e) {
    const categoryId = e.target.dataset.categoryId;
    
    if (confirm(`¿Estás seguro de que quieres eliminar la categoría con ID ${categoryId}?`)) {
        const success = await deleteCategory(categoryId);
        if (success) {
            alert('Categoría eliminada con éxito.');
            await loadCategoryAdminList(); // Recargar la lista en el modal
            await populateCategorySelector(); // Recargar el selector de venta
        }
    }
}

// ===============================================
// 6. FUNCIONES DEL DASHBOARD (Resumen y Tablas)
// ===============================================

// (Asumo que tus funciones para fetchDashboardData, renderDebtList, renderSalesList están aquí)
// ...

// ===============================================
// 7. FUNCIÓN DE INICIALIZACIÓN PRINCIPAL
// ===============================================

async function initializeApp() {
    // 1. Cargar datos esenciales
    await populateCategorySelector(); // CORRECCIÓN: Carga las categorías al inicio
    // await fetchDashboardData(); // Asumo que llamas a esta función para cargar el dashboard
    // await renderDebtList();
    // await renderSalesList();
}


// ===============================================
// 8. EVENT LISTENERS
// ===============================================

// Autenticación (Mantener)
// loginForm.addEventListener('submit', handleLogin);
// logoutBtn.addEventListener('click', handleLogout);

// Perfil (Mantener)
// openProfileModalBtn.addEventListener('click', handleOpenProfileModal);
// closeProfileModalBtn.addEventListener('click', () => userProfileModal.classList.add('hidden'));
// profileUpdateForm.addEventListener('submit', handleProfileUpdate);


// Acciones Rápidas (Mantener)
// addSaleBtn.addEventListener('click', () => addSaleModal.classList.remove('hidden'));
// updateDebtBtn.addEventListener('click', () => updateDebtModal.classList.remove('hidden'));
// closeAddSaleModalBtn.addEventListener('click', () => addSaleModal.classList.add('hidden'));
// closeUpdateDebtModalBtn.addEventListener('click', () => updateDebtModal.classList.add('hidden'));
// addSaleForm.addEventListener('submit', handleAddSale);
// updateDebtForm.addEventListener('submit', handleUpdateDebt);


// NUEVOS LISTENERS para Administración de Productos

// Listener para abrir el modal de Administración de Productos
addProductAdminBtn.addEventListener('click', async () => {
    productAdminModal.classList.remove('hidden');
    // Carga la lista y el formulario dinámicamente
    await loadCategoryAdminList(); 
});

// Listener para cerrar el modal de Administración de Productos
closeProductAdminModalBtn.addEventListener('click', () => {
    productAdminModal.classList.add('hidden');
});

// Listener para el formulario de nueva categoría (Usa delegación de eventos)
document.addEventListener('submit', async (e) => {
    // Solo si el formulario enviado es el de agregar categoría
    if (e.target.id === 'add-category-form') { 
        e.preventDefault();
        await handleAddCategory(e.target);
    }
});


// Inicialización
checkAuthStatus();