(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const n of r)if(n.type==="childList")for(const d of n.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&o(d)}).observe(document,{childList:!0,subtree:!0});function t(r){const n={};return r.integrity&&(n.integrity=r.integrity),r.referrerPolicy&&(n.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?n.credentials="include":r.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function o(r){if(r.ep)return;r.ep=!0;const n=t(r);fetch(r.href,n)}})();const L="https://wnwftbamyaotqdsivmas.supabase.co",B="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo";let s,v=null;const b=document.getElementById("auth-modal"),h=document.getElementById("app-container"),D=document.getElementById("totalSalesDisplay"),N=document.getElementById("totalDebtDisplay"),C=document.getElementById("debtorCountDisplay"),m=document.getElementById("debtListBody"),u=document.getElementById("salesListBody"),S=document.getElementById("login-form"),F=document.getElementById("add-sale-form"),_=document.getElementById("update-debt-form");document.getElementById("newCategoryForm");const f=document.getElementById("add-sale-modal"),g=document.getElementById("update-debt-modal"),w=document.getElementById("product-admin-modal"),x=document.getElementById("user-profile-modal"),M=document.getElementById("sale-client-id"),A=document.getElementById("sale-amount"),I=document.getElementById("sale-category-id"),$=document.getElementById("sale-description"),O=document.getElementById("debt-client-display"),k=document.getElementById("debt-payment-amount"),y=document.getElementById("admin-content-area");async function q(e){e.preventDefault(),alert("Simulación: Acceso exitoso. En un proyecto real, use supabase.auth.signInWithPassword."),b.classList.add("hidden"),h.classList.remove("hidden"),await l()}async function P(){alert("Sesión cerrada. En un proyecto real, use supabase.auth.signOut()."),h.classList.add("hidden"),b.classList.remove("hidden")}async function T(e,a,t,o){const{error:r}=await s.from("ventas").insert([{client_id:e,amount:a,category_id:t,products:o,created_at:new Date().toISOString()}]);if(r)throw new Error("Error al registrar venta: "+r.message);return!0}async function H(e,a){const{error:t}=await s.from("pagos").insert([{client_id:e,amount:a,created_at:new Date().toISOString()}]);if(t)throw new Error("Error al registrar pago: "+t.message);return!0}async function U(e,a){const{error:t}=await s.from("categorias").insert([{name:e,description:a}]);if(t)throw new Error("Error al crear categoría: "+t.message);return!0}async function R(e){const{error:a}=await s.from("categorias").delete().eq("id",e);if(a)throw new Error("Error al borrar categoría: "+a.message);return!0}async function l(){try{const{data:e,error:a}=await s.from("clientes_con_deuda").select("debt");if(a)throw a;let t=0,o=0;e&&e.length>0&&(e.forEach(d=>{t+=parseFloat(d.debt)}),o=e.length);let r=0;const{data:n}=await s.from("total_ventas_dashboard").select("total_sales").single();n&&(r=parseFloat(n.total_sales)),D.textContent=`$${r.toFixed(2)}`,N.textContent=`$${t.toFixed(2)}`,C.textContent=o,await j(),await J()}catch(e){console.error("Error al cargar dashboard:",e)}}async function j(){const{data:e,error:a}=await s.from("clientes_con_deuda").select("id, name, debt, last_update").order("debt",{ascending:!1}).limit(10);if(a){m.innerHTML='<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar deudas.</td></tr>';return}if(!e||e.length===0){m.innerHTML='<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay deudas pendientes registradas.</td></tr>';return}m.innerHTML=e.map(t=>`
        <tr class="hover:bg-gray-50">
            <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${t.name}</td>
            <td class="p-4 whitespace-nowrap text-sm text-red-600 font-semibold">$${parseFloat(t.debt).toFixed(2)}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${t.last_update?new Date(t.last_update).toLocaleDateString():"N/A"}</td>
            <td class="p-4 whitespace-nowrap text-sm font-medium">
                <button data-client-id="${t.id}" 
                        data-client-name="${t.name}"
                        class="open-debt-modal-btn text-yellow-600 hover:text-yellow-900 text-sm py-1 px-2 rounded bg-yellow-100">
                    Abonar
                </button>
            </td>
        </tr>
    `).join(""),m.querySelectorAll(".open-debt-modal-btn").forEach(t=>{t.addEventListener("click",z)})}async function J(){try{const{data:e,error:a}=await s.from("ventas").select(`
                id,
                amount,
                created_at,
                clientes (name),       
                categorias (name)      
            `).order("created_at",{ascending:!1}).limit(10);if(a)throw a;if(!e||e.length===0){u.innerHTML='<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';return}u.innerHTML=e.map(t=>{var d,E;const o=((d=t.clientes)==null?void 0:d.name)??"Desconocido",r=((E=t.categorias)==null?void 0:E.name)??"N/A",n=new Date(t.created_at).toLocaleString();return`
                <tr class="hover:bg-gray-50">
                    <td class="p-4 whitespace-nowrap text-sm text-gray-900">${o}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-semibold text-green-600">$${parseFloat(t.amount).toFixed(2)}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${r}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${n}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-medium">
                        <button data-sale-id="${t.id}" class="edit-sale-btn text-indigo-600 hover:text-indigo-900 text-sm py-1 px-2 rounded bg-indigo-100">
                            Editar
                        </button>
                    </td>
                </tr>
            `}).join(""),u.querySelectorAll(".edit-sale-btn").forEach(t=>{t.addEventListener("click",()=>alert("Funcionalidad de edición aún no implementada."))})}catch(e){console.error("Error al cargar lista de ventas:",e),u.innerHTML='<tr><td colspan="5" class="p-4 text-center text-red-500">Error al cargar ventas.</td></tr>'}}async function p(){try{const{data:e,error:a}=await s.from("categorias").select("id, name, description");if(a)throw a;I.innerHTML=e.map(r=>`<option value="${r.id}">${r.name}</option>`).join("");let t="";!e||e.length===0?t='<tr><td colspan="3" class="p-4 text-center text-gray-500">No hay categorías registradas.</td></tr>':t=e.map(r=>`
                <tr class="hover:bg-gray-50">
                    <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${r.name}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${r.description||"N/A"}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-medium">
                        <button data-category-id="${r.id}" 
                                class="delete-category-btn text-red-600 hover:text-red-900 text-sm mr-4">
                            Eliminar
                        </button>
                    </td>
                </tr>
            `).join(""),y.innerHTML=`
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-4 border rounded-lg bg-gray-50">
                    <h4 class="text-lg font-semibold mb-3">Crear Nueva Categoría</h4>
                    <form id="newCategoryForm" class="space-y-3">
                        <div>
                            <label for="categoryName" class="block text-sm font-medium text-gray-700">Nombre</label>
                            <input type="text" id="categoryName" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                        </div>
                        <div>
                            <label for="categoryDescription" class="block text-sm font-medium text-gray-700">Descripción</label>
                            <textarea id="categoryDescription" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"></textarea>
                        </div>
                        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            Guardar Categoría
                        </button>
                    </form>
                </div>

                <div class="p-4 border rounded-lg bg-white">
                    <h4 class="text-lg font-semibold mb-3">Categorías Existentes</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                </tr>
                            </thead>
                            <tbody id="categoryListBody" class="bg-white divide-y divide-gray-200">
                                ${t}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `,y.querySelectorAll(".delete-category-btn").forEach(r=>{r.addEventListener("click",K)});const o=document.getElementById("newCategoryForm");o&&o.addEventListener("submit",Z)}catch(e){console.error("Error al cargar lista de categorías:",e),y.innerHTML='<p class="text-red-500">Error al cargar categorías. Revise la consola.</p>'}}function c(e){e.classList.remove("hidden")}function i(e){e.classList.add("hidden"),e.querySelector("form")&&e.querySelector("form").reset()}async function Y(e){e.preventDefault();const a=parseInt(M.value),t=parseFloat(A.value),o=parseInt(I.value),r=$.value.trim();if(isNaN(a)||isNaN(t)||t<=0||isNaN(o)){alert("Por favor, rellena todos los campos de venta correctamente.");return}try{await T(a,t,o,r),alert("Venta registrada con éxito."),i(f),await l()}catch(n){console.error("Error al registrar venta:",n),alert("Error al registrar venta. Verifique que el Client ID exista.")}}function z(e){const a=e.target.dataset.clientId,t=e.target.dataset.clientName;v=a,O.textContent=`${t} (ID: ${a})`,c(g)}async function V(e){e.preventDefault();const a=parseInt(v),t=parseFloat(k.value);if(isNaN(a)||!a){alert("Error: No se ha seleccionado un cliente válido.");return}if(isNaN(t)||t<=0){alert("Por favor, ingresa un monto de abono válido.");return}try{await H(a,t),alert("Abono registrado con éxito."),i(g),await l()}catch(o){console.error("Error al registrar abono:",o),alert("Error al registrar abono. Revise la consola.")}}async function Z(e){e.preventDefault();const a=e.target.querySelector("#categoryName"),t=e.target.querySelector("#categoryDescription"),o=a.value.trim(),r=t.value.trim();if(!o){alert("El nombre de la categoría es obligatorio.");return}try{await U(o,r),alert("Categoría creada con éxito."),await p()}catch(n){console.error("Error al crear categoría:",n),alert("Error al crear categoría.")}}async function K(e){const a=e.target.dataset.categoryId;if(confirm("¿Estás seguro de que deseas eliminar esta categoría? Se eliminarán también las ventas asociadas."))try{await R(a),alert("Categoría eliminada con éxito."),await p(),await l()}catch(t){console.error("Error al borrar categoría:",t),alert("Error al borrar la categoría. Revise la consola.")}}function Q(){S.addEventListener("submit",q),document.getElementById("logoutBtn").addEventListener("click",P),document.getElementById("addSaleBtn").addEventListener("click",()=>c(f)),document.getElementById("updateDebtBtn").addEventListener("click",()=>c(g)),document.getElementById("addProductAdminBtn").addEventListener("click",async()=>{await p(),c(w)}),document.getElementById("openProfileModalBtn").addEventListener("click",()=>c(x)),document.getElementById("close-add-sale-modal").addEventListener("click",()=>i(f)),document.getElementById("close-update-debt-modal").addEventListener("click",()=>i(g)),document.getElementById("close-product-admin-modal").addEventListener("click",()=>i(w)),document.getElementById("closeProfileModal").addEventListener("click",()=>i(x)),F.addEventListener("submit",Y),_.addEventListener("submit",V)}document.addEventListener("DOMContentLoaded",async()=>{s=s.createClient(L,B),Q(),b.classList.add("hidden"),h.classList.remove("hidden"),await l(),await p()});
