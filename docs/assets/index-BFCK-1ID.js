import{createClient as p}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const s of r.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function o(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(a){if(a.ep)return;a.ep=!0;const r=o(a);fetch(a.href,r)}})();const f="https://wnwftbamyaotqdsivmas.supabase.co",h="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo",d=p(f,h),u=document.getElementById("auth-modal"),g=document.getElementById("app-container");document.getElementById("total-sales");document.getElementById("total-debt");document.getElementById("debtor-count");document.getElementById("debt-list");document.getElementById("sales-list");document.getElementById("login-form");document.getElementById("logoutBtn");document.getElementById("openProfileModalBtn");document.getElementById("user-profile-modal");document.getElementById("closeProfileModal");document.getElementById("profile-update-form");document.getElementById("profile-email-display");document.getElementById("profile-username-input");document.getElementById("addSaleBtn");document.getElementById("updateDebtBtn");document.getElementById("add-sale-modal");document.getElementById("update-debt-modal");document.getElementById("close-add-sale-modal");document.getElementById("close-update-debt-modal");document.getElementById("add-sale-form");const c=document.getElementById("sale-category-id");document.getElementById("debt-client-display");document.getElementById("update-debt-form");const I=document.getElementById("addProductAdminBtn"),i=document.getElementById("product-admin-modal"),E=document.getElementById("close-product-admin-modal");function b(){const t=d.auth.getSession();console.log("Estado de autenticación:",t?"SIGNED_IN":"INITIAL_SESSION"),t?(u.classList.add("hidden"),g.classList.remove("hidden"),C()):(u.classList.remove("hidden"),g.classList.add("hidden"))}async function y(){const{data:t,error:e}=await d.from("categorias").select("id, name").order("name",{ascending:!0});return e?(console.error("Error al obtener categorías:",e),[]):t}async function B(t){try{const{error:e}=await d.from("categorias").insert([{name:t}]);if(e)throw e;return!0}catch(e){return console.error("Error al agregar categoría:",e),alert(`Error al agregar categoría: ${e.message}`),!1}}async function x(t){try{const{error:e}=await d.from("categorias").delete().eq("id",t);if(e)throw e;return!0}catch(e){return console.error("Error al eliminar categoría:",e),alert(`Error al eliminar categoría. Asegúrate de que no haya ventas asociadas: ${e.message}`),!1}}async function l(){const t=await y();if(c.innerHTML='<option value="">-- Seleccionar Categoría --</option>',t&&t.length>0)t.forEach(e=>{const o=document.createElement("option");o.value=e.id,o.textContent=e.name,c.appendChild(o)});else{const e=document.createElement("option");e.value="",e.textContent="No hay categorías (Error de Supabase?)",c.appendChild(e)}}async function m(){const t=i.querySelector(".p-6:last-child"),e=await y(),o=`
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
    `;let n='<h4 class="text-lg font-semibold mb-3">Lista de Categorías Existentes</h4>';e.length===0?n+='<p class="text-gray-500">No hay categorías registradas.</p>':n+=`
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
                        ${e.map(a=>`
                            <tr>
                                <td class="p-3 whitespace-nowrap text-sm text-gray-900">${a.id}</td>
                                <td class="p-3 text-sm text-gray-700">${a.name}</td>
                                <td class="p-3 whitespace-nowrap text-sm font-medium">
                                    <button data-category-id="${a.id}" 
                                            class="delete-category-btn text-red-600 hover:text-red-900 text-sm">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `,t.innerHTML=o+n,t.querySelectorAll(".delete-category-btn").forEach(a=>{a.addEventListener("click",w)})}async function v(t){const e=t.querySelector("#category-name-input"),o=e.value.trim();if(!o){alert("Por favor, ingresa un nombre para la categoría.");return}await B(o)&&(alert("Categoría creada con éxito."),e.value="",await m(),await l())}async function w(t){const e=t.target.dataset.categoryId;confirm(`¿Estás seguro de que quieres eliminar la categoría con ID ${e}?`)&&await x(e)&&(alert("Categoría eliminada con éxito."),await m(),await l())}async function C(){await l()}I.addEventListener("click",async()=>{i.classList.remove("hidden"),await m()});E.addEventListener("click",()=>{i.classList.add("hidden")});document.addEventListener("submit",async t=>{t.target.id==="add-category-form"&&(t.preventDefault(),await v(t.target))});b();
