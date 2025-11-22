import{createClient as B}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&s(l)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();const C="https://wnwftbamyaotqdsivmas.supabase.co",A="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo",P=B(C,A);let h=null;const u=document.getElementById("auth-modal"),m=document.getElementById("app-container"),D=document.getElementById("login-form"),S=document.getElementById("logoutBtn"),$=document.getElementById("total-sales"),_=document.getElementById("total-debt"),M=document.getElementById("debtor-count"),f=document.getElementById("debt-list"),r=document.getElementById("sales-list"),N=document.getElementById("addProductAdminBtn"),F=document.getElementById("addSaleBtn"),O=document.getElementById("updateDebtBtn"),p=document.getElementById("add-sale-modal"),k=document.getElementById("close-add-sale-modal"),x=document.getElementById("add-sale-form"),i=document.getElementById("sale-category-id"),y=document.getElementById("update-debt-modal"),q=document.getElementById("close-update-debt-modal"),T=document.getElementById("update-debt-form"),v=document.getElementById("debt-payment-amount"),E=document.getElementById("product-admin-modal"),U=document.getElementById("close-product-admin-modal"),g=document.getElementById("admin-content-area"),I=document.getElementById("user-profile-modal"),z=document.getElementById("closeProfileModal");async function H(t){t.preventDefault();const e=document.getElementById("login-identifier").value;document.getElementById("login-password").value,console.log("Intento de login con:",e),u.classList.add("hidden"),m.classList.remove("hidden"),await c()}async function J(){console.log("Cerrando sesión..."),window.location.reload()}function R(){const t={id:1};t&&t.id?(u.classList.add("hidden"),m.classList.remove("hidden"),c()):(u.classList.remove("hidden"),m.classList.add("hidden"))}async function V(){try{$.textContent=`$${15000.5.toFixed(2)}`,_.textContent=`$${5200.75.toFixed(2)}`,M.textContent=12,await Q(),await X()}catch(t){console.error("Error al cargar dashboard:",t)}}async function j(t,e){try{return console.log(`Pago de $${e.toFixed(2)} registrado para Cliente ID: ${t}`),!0}catch(a){return console.error("Error al registrar pago:",a),alert("Error al registrar pago: "+a.message),!1}}async function w(){const{data:t,error:e}=await P.from("categorias").select("id, name").order("name",{ascending:!0});return e?(console.error("Error al obtener categorías:",e),[]):t}async function Y(t){return console.log(`Simulación: Agregando categoría: ${t}`),!0}async function Z(t){return console.log(`Simulación: Eliminando categoría ID: ${t}`),!0}async function b(){const t=await w();if(i.innerHTML='<option value="">-- Seleccionar Categoría --</option>',t&&t.length>0)t.forEach(e=>{const a=document.createElement("option");a.value=e.id,a.textContent=e.name,i.appendChild(a)});else{const e=document.createElement("option");e.value="",e.textContent="ERROR: No se cargaron categorías.",i.appendChild(e)}}async function d(){const t=await w();let e="";e+=`
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
    `,e+=`
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Productos/Paquetes</button>
        </div>
    `,e+='<h4 class="text-lg font-semibold mb-3">Lista de Categorías Existentes</h4>',t.length===0?e+='<p class="text-gray-500">No hay categorías registradas.</p>':e+=`
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
                        ${t.map(a=>`
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
        `,g.innerHTML=e,g.querySelectorAll(".delete-category-btn").forEach(a=>{a.addEventListener("click",K)}),document.getElementById("view-categories-btn").addEventListener("click",d),document.getElementById("view-products-btn").addEventListener("click",L)}function L(){g.innerHTML=`
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Productos/Paquetes</button>
        </div>
        <p class="text-gray-500 p-4">La gestión de Productos y Paquetes se implementará pronto. Ahora solo puedes administrar Categorías.</p>`,document.getElementById("view-categories-btn").addEventListener("click",d),document.getElementById("view-products-btn").addEventListener("click",L)}async function G(t){const e=t.querySelector("#category-name-input"),a=e.value.trim();if(!a){alert("Por favor, ingresa un nombre para la categoría.");return}await Y(a)&&(alert("Categoría creada con éxito (Simulado)."),e.value="",await d(),await b())}async function K(t){const e=t.target.dataset.categoryId;confirm(`¿Estás seguro de que quieres eliminar la categoría con ID ${e}?`)&&await Z(e)&&(alert("Categoría eliminada con éxito (Simulado)."),await d(),await b())}async function Q(){const t=[{id:101,name:"Juan Pérez",debt:1500,last_update:"2025-11-20"},{id:102,name:"María López",debt:850.5,last_update:"2025-11-15"},{id:103,name:"Carlos R.",debt:300.25,last_update:"2025-11-21"}];f.innerHTML=t.map(e=>`
        <tr class="hover:bg-gray-50">
            <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900 client-detail-link" 
                data-client-id="${e.id}" style="cursor: pointer;">${e.name}</td>
            <td class="p-4 whitespace-nowrap text-sm text-red-600 font-semibold">$${e.debt.toFixed(2)}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${e.last_update}</td>
            <td class="p-4 whitespace-nowrap text-sm font-medium">
                <button data-client-id="${e.id}" data-client-name="${e.name}" data-debt="${e.debt}" 
                        class="open-debt-modal-btn text-yellow-600 hover:text-yellow-900 text-sm">
                    Abonar
                </button>
            </td>
        </tr>
    `).join(""),f.querySelectorAll(".open-debt-modal-btn").forEach(e=>{e.addEventListener("click",W)})}async function X(){const t=[{id:1,client_name:"Juan Pérez",amount:250,category_name:"Corte Básico",created_at:"2025-11-21 14:30"},{id:2,client_name:"María López",amount:120.75,category_name:"Productos",created_at:"2025-11-21 11:15"},{id:3,client_name:"Andrés G.",amount:400,category_name:"Paquete Premium",created_at:"2025-11-20 18:00"},{id:4,client_name:"Laura S.",amount:80,category_name:"Corte Básico",created_at:"2025-11-20 10:45"}];if(!t||t.length===0){r.innerHTML='<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';return}r.innerHTML=t.map(e=>`
        <tr class="hover:bg-gray-50">
            <td class="p-4 whitespace-nowrap text-sm text-gray-900">${e.client_name}</td>
            <td class="p-4 whitespace-nowrap text-sm font-semibold text-green-600">$${e.amount.toFixed(2)}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${e.category_name}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${e.created_at}</td>
            <td class="p-4 whitespace-nowrap text-sm font-medium">
                <button data-sale-id="${e.id}" class="view-sale-detail-btn text-blue-600 hover:text-blue-900 text-sm mr-2">
                    Ver
                </button>
                <button data-sale-id="${e.id}" class="edit-sale-btn text-indigo-600 hover:text-indigo-900 text-sm">
                    Editar
                </button>
            </td>
        </tr>
    `).join(""),r.querySelectorAll(".view-sale-detail-btn").forEach(e=>{e.addEventListener("click",ae)}),r.querySelectorAll(".edit-sale-btn").forEach(e=>{e.addEventListener("click",ne)})}function W(t){const a=t.target.dataset.clientId;h=a,document.getElementById("debt-client-display").textContent=a,v.value="0.00",y.classList.remove("hidden")}async function ee(t){t.preventDefault();const e=parseFloat(document.getElementById("sale-amount").value),a=parseInt(i.value);if(isNaN(e)||e<=0||isNaN(a)){alert("Por favor, revisa el Monto y la Categoría.");return}console.log("Venta a registrar (Simulada)."),alert("Venta/Cargo registrado con éxito (Simulado)."),x.reset(),p.classList.add("hidden"),await c()}async function te(t){t.preventDefault();const e=h,a=parseFloat(v.value);if(!e){alert("Error: No se ha seleccionado un cliente.");return}if(isNaN(a)||a<=0){alert("Por favor, ingresa un monto de abono válido.");return}await j(e,a)&&(alert("Abono registrado con éxito (Simulado)."),y.classList.add("hidden"),await c())}function ae(t){const e=t.target.dataset.saleId;alert(`Abriendo detalle para Venta ID: ${e}`)}function ne(t){const e=t.target.dataset.saleId;alert(`Abriendo edición para Venta ID: ${e}`)}async function c(){await b(),await V()}document.addEventListener("DOMContentLoaded",()=>{document.body.classList.remove("loading-hide")});D.addEventListener("submit",H);S.addEventListener("click",J);F.addEventListener("click",()=>p.classList.remove("hidden"));k.addEventListener("click",()=>p.classList.add("hidden"));x.addEventListener("submit",ee);O.addEventListener("click",()=>{alert('Por favor, selecciona un cliente de la lista "Deudas Pendientes" para registrar un abono.')});q.addEventListener("click",()=>y.classList.add("hidden"));T.addEventListener("submit",te);document.getElementById("openProfileModalBtn").addEventListener("click",()=>I.classList.remove("hidden"));z.addEventListener("click",()=>I.classList.add("hidden"));N.addEventListener("click",async()=>{E.classList.remove("hidden"),await d()});U.addEventListener("click",()=>{E.classList.add("hidden")});document.addEventListener("submit",async t=>{t.target.id==="add-category-form"&&(t.preventDefault(),await G(t.target))});R();
