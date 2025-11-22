import{createClient as S}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))d(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&d(r)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function d(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();const x="https://wnwftbamyaotqdsivmas.supabase.co",_="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo",u=S(x,_);let w=null;const m=document.getElementById("auth-modal"),g=document.getElementById("app-container"),$=document.getElementById("login-form"),M=document.getElementById("logoutBtn"),N=document.getElementById("total-sales"),F=document.getElementById("total-debt"),O=document.getElementById("debtor-count"),E=document.getElementById("debt-list"),c=document.getElementById("sales-list"),q=document.getElementById("addProductAdminBtn"),k=document.getElementById("addSaleBtn"),T=document.getElementById("updateDebtBtn"),y=document.getElementById("add-sale-modal"),U=document.getElementById("close-add-sale-modal"),I=document.getElementById("add-sale-form"),l=document.getElementById("sale-category-id"),b=document.getElementById("update-debt-modal"),R=document.getElementById("close-update-debt-modal"),z=document.getElementById("update-debt-form"),L=document.getElementById("debt-payment-amount"),B=document.getElementById("product-admin-modal"),H=document.getElementById("close-product-admin-modal"),p=document.getElementById("admin-content-area"),C=document.getElementById("user-profile-modal"),J=document.getElementById("closeProfileModal");async function j(t){t.preventDefault();const e=document.getElementById("login-identifier").value;document.getElementById("login-password").value,console.log("Intento de login con:",e),m.classList.add("hidden"),g.classList.remove("hidden"),await h()}async function V(){console.log("Cerrando sesión..."),window.location.reload()}function Y(){const t={id:1};t&&t.id?(m.classList.add("hidden"),g.classList.remove("hidden"),h()):(m.classList.remove("hidden"),g.classList.add("hidden"))}async function A(){try{N.textContent=`$${15000.5.toFixed(2)}`,F.textContent=`$${5200.75.toFixed(2)}`,O.textContent=12,await ee(),await te()}catch(t){console.error("Error al cargar dashboard:",t)}}async function G(t,e){try{return console.log(`Pago de $${e.toFixed(2)} registrado para Cliente ID: ${t}`),!0}catch(a){return console.error("Error al registrar pago:",a),alert("Error al registrar pago: "+a.message),!1}}async function Z(t){let{data:e,error:a}=await u.from("clientes").select("id").eq("id",t).single();if(a&&a.code!=="PGRST116"&&console.error("Error al buscar cliente:",a),!e){console.log(`Cliente ID ${t} no encontrado, creando uno nuevo...`);const{data:d,error:n}=await u.from("clientes").insert({id:t,name:`Cliente ${t}`}).select("id").single();if(n)throw console.error("Error al crear cliente:",n),new Error("No se pudo crear el cliente.");return d.id}return e.id}async function D(){const{data:t,error:e}=await u.from("categorias").select("id, name").order("name",{ascending:!0});return e?(console.error("Error al obtener categorías:",e),[]):t}async function K(t){return console.log(`Simulación: Agregando categoría: ${t}`),!0}async function Q(t){return console.log(`Simulación: Eliminando categoría ID: ${t}`),!0}async function f(){const t=await D();if(l.innerHTML='<option value="">-- Seleccionar Categoría --</option>',t&&t.length>0)t.forEach(e=>{const a=document.createElement("option");a.value=e.id,a.textContent=e.name,l.appendChild(a)});else{const e=document.createElement("option");e.value="",e.textContent="ERROR: No se cargaron categorías.",l.appendChild(e)}}async function i(){const t=await D();let e="";e+=`
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
        `,p.innerHTML=e,p.querySelectorAll(".delete-category-btn").forEach(a=>{a.addEventListener("click",W)}),document.getElementById("view-categories-btn").addEventListener("click",i),document.getElementById("view-products-btn").addEventListener("click",P)}function P(){p.innerHTML=`
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Productos/Paquetes</button>
        </div>
        <p class="text-gray-500 p-4">La gestión de Productos y Paquetes se implementará pronto. Ahora solo puedes administrar Categorías.</p>`,document.getElementById("view-categories-btn").addEventListener("click",i),document.getElementById("view-products-btn").addEventListener("click",P)}async function X(t){const e=t.querySelector("#category-name-input"),a=e.value.trim();if(!a){alert("Por favor, ingresa un nombre para la categoría.");return}await K(a)&&(alert("Categoría creada con éxito (Simulado)."),e.value="",await i(),await f())}async function W(t){const e=t.target.dataset.categoryId;confirm(`¿Estás seguro de que quieres eliminar la categoría con ID ${e}?`)&&await Q(e)&&(alert("Categoría eliminada con éxito (Simulado)."),await i(),await f())}async function ee(){const t=[{id:101,name:"Juan Pérez",debt:1500,last_update:"2025-11-20"},{id:102,name:"María López",debt:850.5,last_update:"2025-11-15"},{id:103,name:"Carlos R.",debt:300.25,last_update:"2025-11-21"}];E.innerHTML=t.map(e=>`
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
    `).join(""),E.querySelectorAll(".open-debt-modal-btn").forEach(e=>{e.addEventListener("click",ae)})}async function te(){const t=[{id:1,client_name:"Juan Pérez",amount:250,category_name:"Corte Básico",created_at:"2025-11-21 14:30"},{id:2,client_name:"María López",amount:120.75,category_name:"Productos",created_at:"2025-11-21 11:15"},{id:3,client_name:"Andrés G.",amount:400,category_name:"Paquete Premium",created_at:"2025-11-20 18:00"},{id:4,client_name:"Laura S.",amount:80,category_name:"Corte Básico",created_at:"2025-11-20 10:45"}];if(!t||t.length===0){c.innerHTML='<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';return}c.innerHTML=t.map(e=>`
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
    `).join(""),c.querySelectorAll(".view-sale-detail-btn").forEach(e=>{e.addEventListener("click",de)}),c.querySelectorAll(".edit-sale-btn").forEach(e=>{e.addEventListener("click",re)})}function ae(t){const a=t.target.dataset.clientId;w=a,document.getElementById("debt-client-display").textContent=a,L.value="0.00",b.classList.remove("hidden")}async function ne(t){t.preventDefault();const e=w,a=parseFloat(L.value);if(!e){alert("Error: No se ha seleccionado un cliente.");return}if(isNaN(a)||a<=0){alert("Por favor, ingresa un monto de abono válido.");return}await G(e,a)&&(alert("Abono registrado con éxito (Simulado)."),b.classList.add("hidden"),await h())}async function oe(t){t.preventDefault();const e=document.getElementById("sale-client-id"),a=document.getElementById("sale-amount"),d=parseInt(e.value),n=parseFloat(a.value),o=parseInt(l.value),r=document.getElementById("sale-description").value;if(isNaN(d)||isNaN(n)||n<=0||isNaN(o)){alert("Por favor, revisa el ID del Cliente, el Monto y la Categoría.");return}try{const s=await Z(d);if(console.log(`Venta se registrará bajo Cliente ID: ${s}`),x!=="TU_SUPABASE_URL"){const{error:v}=await u.from("ventas").insert({client_id:s,amount:n,category_id:o,description:r});if(v)throw v}alert("Venta/Cargo registrado con éxito."),I.reset(),y.classList.add("hidden"),await A()}catch(s){console.error("Error al registrar la venta:",s),alert("Error al registrar la venta: "+s.message)}}function de(t){const e=t.target.dataset.saleId;alert(`Abriendo detalle para Venta ID: ${e}`)}function re(t){const e=t.target.dataset.saleId;alert(`Abriendo edición para Venta ID: ${e}`)}async function h(){await f(),await A()}document.addEventListener("DOMContentLoaded",()=>{document.body.classList.remove("loading-hide")});$.addEventListener("submit",j);M.addEventListener("click",V);k.addEventListener("click",()=>y.classList.remove("hidden"));U.addEventListener("click",()=>y.classList.add("hidden"));I.addEventListener("submit",oe);T.addEventListener("click",()=>{alert('Por favor, selecciona un cliente de la lista "Deudas Pendientes" para registrar un abono.')});R.addEventListener("click",()=>b.classList.add("hidden"));z.addEventListener("submit",ne);document.getElementById("openProfileModalBtn").addEventListener("click",()=>C.classList.remove("hidden"));J.addEventListener("click",()=>C.classList.add("hidden"));q.addEventListener("click",async()=>{B.classList.remove("hidden"),await i()});H.addEventListener("click",()=>{B.classList.add("hidden")});document.addEventListener("submit",async t=>{t.target.id==="add-category-form"&&(t.preventDefault(),await X(t.target))});Y();
