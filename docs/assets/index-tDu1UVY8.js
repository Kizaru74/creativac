import{createClient as A}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const d of r.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&o(d)}).observe(document,{childList:!0,subtree:!0});function a(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(n){if(n.ep)return;n.ep=!0;const r=a(n);fetch(n.href,r)}})();const D="https://wnwftbamyaotqdsivmas.supabase.co",M="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo",s=A(D,M);let x=null;const E=document.getElementById("auth-modal"),v=document.getElementById("app-container"),_=document.getElementById("login-form"),$=document.getElementById("logoutBtn"),F=document.getElementById("total-sales"),R=document.getElementById("total-debt"),T=document.getElementById("debtor-count"),l=document.getElementById("debt-list"),g=document.getElementById("sales-list"),O=document.getElementById("addProductAdminBtn"),q=document.getElementById("addSaleBtn"),y=document.getElementById("add-sale-modal"),k=document.getElementById("close-add-sale-modal"),w=document.getElementById("add-sale-form"),u=document.getElementById("sale-category-id"),f=document.getElementById("update-debt-modal"),H=document.getElementById("close-update-debt-modal"),U=document.getElementById("update-debt-form"),I=document.getElementById("debt-payment-amount"),L=document.getElementById("product-admin-modal"),J=document.getElementById("close-product-admin-modal"),p=document.getElementById("admin-content-area"),B=document.getElementById("user-profile-modal"),j=document.getElementById("closeProfileModal");async function z(t){t.preventDefault();const e=document.getElementById("login-identifier").value,a=document.getElementById("login-password").value,{error:o}=await s.auth.signInWithPassword({email:e,password:a});if(o){alert("Error de login: "+o.message),console.error("Error de Login:",o);return}C()}async function V(){await s.auth.signOut(),window.location.reload()}function C(){s.auth.getSession().then(({data:{session:t}})=>{t?(E.classList.add("hidden"),v.classList.remove("hidden"),oe()):(E.classList.remove("hidden"),v.classList.add("hidden"),m())}).catch(t=>{console.error("Error al obtener la sesión de Supabase:",t)})}async function S(t){let{data:e,error:a}=await s.from("clientes").select("id").eq("id",t).single();if(a&&a.code!=="PGRST116"&&console.error("Error al buscar cliente:",a),!e){console.log(`Cliente ID ${t} no encontrado, intentando crear uno nuevo...`);const{data:o,error:n}=await s.from("clientes").insert({id:t,name:`Cliente ${t}`}).select("id").single();if(n)throw console.error("Error al crear cliente (Verifica RLS INSERT para authenticated):",n),new Error("No se pudo crear el cliente.");return o.id}return e.id}async function Y(t,e){try{const{error:a}=await s.from("pagos").insert([{client_id:t,amount:e}]);if(a)throw a;return console.log(`Pago de $${e.toFixed(2)} registrado REALMENTE para Cliente ID: ${t}`),!0}catch(a){return console.error("Error al registrar pago en Supabase:",a),alert("Error al registrar pago: "+a.message),!1}}async function P(){const{data:t,error:e}=await s.from("categorias").select("id, name").order("name",{ascending:!0});return e?(console.error('Error al obtener categorías. ¿Tabla "categorias" existe y tiene RLS SELECT anon/authenticated?',e),[]):t}async function Q(t){const{error:e}=await s.from("categorias").insert({name:t});return e?(alert("Error al crear categoría: "+e.message),!1):!0}async function W(t){if(!confirm("¿Estás seguro de que quieres eliminar esta categoría?"))return!1;const{error:e}=await s.from("categorias").delete().eq("id",t);return e?(alert("Error al eliminar categoría: "+e.message),!1):!0}async function m(){const t=await P();if(u.innerHTML='<option value="">-- Seleccionar Categoría --</option>',t&&t.length>0)t.forEach(e=>{const a=document.createElement("option");a.value=e.id,a.textContent=e.name,u.appendChild(a)});else{const e=document.createElement("option");e.value="",e.textContent="ERROR: No se cargaron categorías. Revise RLS.",u.appendChild(e)}}async function i(){const t=await P();let e="";e+=`
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
                        ${t.map(o=>`
                            <tr>
                                <td class="p-3 whitespace-nowrap text-sm text-gray-900">${o.id}</td>
                                <td class="p-3 text-sm text-gray-700">${o.name}</td>
                                <td class="p-3 whitespace-nowrap text-sm font-medium">
                                    <button data-category-id="${o.id}" 
                                            class="delete-category-btn text-red-600 hover:text-red-900 text-sm">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `,p.innerHTML=e,p.querySelectorAll(".delete-category-btn").forEach(o=>{o.addEventListener("click",G)}),document.getElementById("view-categories-btn").addEventListener("click",i),document.getElementById("view-products-btn").addEventListener("click",N);const a=document.getElementById("add-category-form");a&&a.addEventListener("submit",async o=>{o.preventDefault(),await Z(o.target)})}function N(){p.innerHTML=`
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Productos/Paquetes</button>
        </div>
        <p class="text-gray-500 p-4">La gestión de Productos y Paquetes se implementará pronto. Ahora solo puedes administrar Categorías.</p>`,document.getElementById("view-categories-btn").addEventListener("click",i),document.getElementById("view-products-btn").addEventListener("click",N)}async function Z(t){const e=t.querySelector("#category-name-input"),a=e.value.trim();if(!a){alert("Por favor, ingresa un nombre para la categoría.");return}await Q(a)&&(alert("Categoría creada con éxito."),e.value="",await i(),await m())}async function G(t){const e=t.target.dataset.categoryId;await W(e)&&(alert("Categoría eliminada con éxito."),await i(),await m())}async function b(){try{F.textContent=`$${15000.5.toFixed(2)}`,R.textContent=`$${5200.75.toFixed(2)}`,T.textContent=12,await K(),await X()}catch(t){console.error("Error al cargar dashboard:",t)}}async function K(){const{data:t,error:e}=await s.from("clientes_con_deuda").select("id, name, debt, last_update").order("debt",{ascending:!1});if(e){console.error("Error al cargar lista de deudas (RLS o VIEW faltante):",e),l.innerHTML='<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar deudas. Revise RLS y la Vista SQL.</td></tr>';return}if(!t||t.length===0){l.innerHTML='<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay deudas pendientes registradas.</td></tr>';return}l.innerHTML=t.map(a=>`
        <tr class="hover:bg-gray-50">
            <td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900">${a.name}</td>
            <td class="p-4 whitespace-nowrap text-sm text-red-600 font-semibold">$${parseFloat(a.debt).toFixed(2)}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${a.last_update}</td>
            <td class="p-4 whitespace-nowrap text-sm font-medium">
                <button data-client-id="${a.id}" 
                        class="open-debt-modal-btn text-yellow-600 hover:text-yellow-900 text-sm">
                    Abonar
                </button>
            </td>
        </tr>
    `).join(""),l.querySelectorAll(".open-debt-modal-btn").forEach(a=>{a.addEventListener("click",ae)})}async function X(){const t=[{id:1,client_name:"Juan Pérez",amount:250,category_name:"Corte Básico",created_at:"2025-11-21 14:30"},{id:2,client_name:"María López",amount:120.75,category_name:"Productos",created_at:"2025-11-21 11:15"}];if(!t||t.length===0){g.innerHTML='<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';return}g.innerHTML=t.map(e=>`
        <tr class="hover:bg-gray-50">
            <td class="p-4 whitespace-nowrap text-sm text-gray-900">${e.client_name}</td>
            <td class="p-4 whitespace-nowrap text-sm font-semibold text-green-600">$${e.amount.toFixed(2)}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${e.category_name}</td>
            <td class="p-4 whitespace-nowrap text-sm text-gray-500">${e.created_at}</td>
            <td class="p-4 whitespace-nowrap text-sm font-medium">
                <button data-sale-id="${e.id}" class="edit-sale-btn text-indigo-600 hover:text-indigo-900 text-sm">
                    Editar
                </button>
            </td>
        </tr>
    `).join(""),g.querySelectorAll(".edit-sale-btn").forEach(e=>{e.addEventListener("click",ne)})}async function ee(t){t.preventDefault();const e=document.getElementById("sale-client-id"),a=document.getElementById("sale-amount"),o=parseInt(e.value),n=parseFloat(a.value),r=parseInt(u.value),d=document.getElementById("sale-description").value;if(isNaN(o)||isNaN(n)||n<=0||isNaN(r)){alert("Por favor, revisa el ID del Cliente, el Monto y la Categoría.");return}try{const c=await S(o),{error:h}=await s.from("ventas").insert({client_id:c,amount:n,category_id:r,description:d});if(h)throw h;alert("Venta/Cargo registrado con éxito."),w.reset(),y.classList.add("hidden"),await b()}catch(c){console.error("Error al registrar la venta:",c),alert("Error al registrar la venta: "+c.message)}}async function te(t){t.preventDefault();const e=x,a=parseFloat(I.value);if(!e){alert("Error: No se ha seleccionado un cliente.");return}if(isNaN(a)||a<=0){alert("Por favor, ingresa un monto de abono válido.");return}const o=parseInt(e);try{const n=await S(o);await Y(n,a)&&(alert("Abono registrado con éxito."),f.classList.add("hidden"),await b())}catch(n){console.error("Error al registrar abono o crear cliente:",n),alert('No se pudo verificar o crear el cliente antes de registrar el abono. Revise el RLS de INSERT en la tabla "clientes".')}}function ae(t){const a=t.target.dataset.clientId;x=a,document.getElementById("debt-client-display").textContent=a,I.value="",f.classList.remove("hidden")}function ne(t){const e=t.target.dataset.saleId;alert(`Abriendo edición para Venta ID: ${e}`)}async function oe(){await m(),await b()}document.addEventListener("DOMContentLoaded",()=>{C()});_.addEventListener("submit",z);$.addEventListener("click",V);q.addEventListener("click",()=>y.classList.remove("hidden"));k.addEventListener("click",()=>y.classList.add("hidden"));w.addEventListener("submit",ee);document.getElementById("updateDebtBtn").addEventListener("click",()=>{alert('Por favor, selecciona un cliente de la lista "Deudas Pendientes" para registrar un abono.')});H.addEventListener("click",()=>f.classList.add("hidden"));U.addEventListener("submit",te);document.getElementById("openProfileModalBtn").addEventListener("click",()=>B.classList.remove("hidden"));j.addEventListener("click",()=>B.classList.add("hidden"));O.addEventListener("click",async()=>{L.classList.remove("hidden"),await i()});J.addEventListener("click",()=>{L.classList.add("hidden")});
