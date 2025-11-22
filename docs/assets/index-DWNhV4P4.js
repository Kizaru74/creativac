import{createClient as A}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&r(d)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();const P="https://wnwftbamyaotqdsivmas.supabase.co",M="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo",s=A(P,M);let x=null;const E=document.getElementById("auth-modal"),v=document.getElementById("app-container"),$=document.getElementById("login-form"),R=document.getElementById("logoutBtn"),F=document.getElementById("total-sales"),_=document.getElementById("total-debt"),T=document.getElementById("debtor-count"),l=document.getElementById("debt-list"),u=document.getElementById("sales-list"),O=document.getElementById("addProductAdminBtn"),q=document.getElementById("addSaleBtn"),y=document.getElementById("add-sale-modal"),k=document.getElementById("close-add-sale-modal"),w=document.getElementById("add-sale-form"),m=document.getElementById("sale-category-id"),f=document.getElementById("update-debt-modal"),H=document.getElementById("close-update-debt-modal"),U=document.getElementById("update-debt-form"),I=document.getElementById("debt-payment-amount"),L=document.getElementById("product-admin-modal"),j=document.getElementById("close-product-admin-modal"),p=document.getElementById("admin-content-area"),B=document.getElementById("user-profile-modal"),J=document.getElementById("closeProfileModal");async function V(t){t.preventDefault();const e=document.getElementById("login-identifier").value,a=document.getElementById("login-password").value,{error:r}=await s.auth.signInWithPassword({email:e,password:a});if(r){alert("Error de login: "+r.message),console.error("Error de Login:",r);return}C()}async function Y(){await s.auth.signOut(),window.location.reload()}function C(){s.auth.getSession().then(({data:{session:t}})=>{t?(E.classList.add("hidden"),v.classList.remove("hidden"),re()):(E.classList.remove("hidden"),v.classList.add("hidden"),g())}).catch(t=>{console.error("Error al obtener la sesión de Supabase:",t)})}async function S(t){let{data:e,error:a}=await s.from("clientes").select("id").eq("id",t).single();if(a&&a.code!=="PGRST116"&&console.error("Error al buscar cliente:",a),!e){console.log(`Cliente ID ${t} no encontrado, intentando crear uno nuevo...`);const{data:r,error:n}=await s.from("clientes").insert({id:t,name:`Cliente ${t}`}).select("id").single();if(n)throw console.error("Error al crear cliente (Verifica RLS INSERT para authenticated):",n),new Error("No se pudo crear el cliente.");return r.id}return e.id}async function z(t,e){try{const{error:a}=await s.from("pagos").insert([{client_id:t,amount:e}]);if(a)throw a;return console.log(`Pago de $${e.toFixed(2)} registrado REALMENTE para Cliente ID: ${t}`),!0}catch(a){return console.error("Error al registrar pago en Supabase:",a),alert("Error al registrar pago: "+a.message),!1}}async function N(){const{data:t,error:e}=await s.from("categorias").select("id, name").order("name",{ascending:!0});return e?(console.error('Error al obtener categorías. ¿Tabla "categorias" existe y tiene RLS SELECT anon/authenticated?',e),[]):t}async function Q(t){const{error:e}=await s.from("categorias").insert({name:t});return e?(alert("Error al crear categoría: "+e.message),!1):!0}async function W(t){if(!confirm("¿Estás seguro de que quieres eliminar esta categoría?"))return!1;const{error:e}=await s.from("categorias").delete().eq("id",t);return e?(alert("Error al eliminar categoría: "+e.message),!1):!0}async function g(){const t=await N();if(m.innerHTML='<option value="">-- Seleccionar Categoría --</option>',t&&t.length>0)t.forEach(e=>{const a=document.createElement("option");a.value=e.id,a.textContent=e.name,m.appendChild(a)});else{const e=document.createElement("option");e.value="",e.textContent="ERROR: No se cargaron categorías. Revise RLS.",m.appendChild(e)}}async function c(){const t=await N();let e="";e+=`
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
                        ${t.map(r=>`
                            <tr>
                                <td class="p-3 whitespace-nowrap text-sm text-gray-900">${r.id}</td>
                                <td class="p-3 text-sm text-gray-700">${r.name}</td>
                                <td class="p-3 whitespace-nowrap text-sm font-medium">
                                    <button data-category-id="${r.id}" 
                                            class="delete-category-btn text-red-600 hover:text-red-900 text-sm">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `,p.innerHTML=e,p.querySelectorAll(".delete-category-btn").forEach(r=>{r.addEventListener("click",G)}),document.getElementById("view-categories-btn").addEventListener("click",c),document.getElementById("view-products-btn").addEventListener("click",D);const a=document.getElementById("add-category-form");a&&a.addEventListener("submit",async r=>{r.preventDefault(),await Z(r.target)})}function D(){p.innerHTML=`
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Productos/Paquetes</button>
        </div>
        <p class="text-gray-500 p-4">La gestión de Productos y Paquetes se implementará pronto. Ahora solo puedes administrar Categorías.</p>`,document.getElementById("view-categories-btn").addEventListener("click",c),document.getElementById("view-products-btn").addEventListener("click",D)}async function Z(t){const e=t.querySelector("#category-name-input"),a=e.value.trim();if(!a){alert("Por favor, ingresa un nombre para la categoría.");return}await Q(a)&&(alert("Categoría creada con éxito."),e.value="",await c(),await g())}async function G(t){const e=t.target.dataset.categoryId;await W(e)&&(alert("Categoría eliminada con éxito."),await c(),await g())}async function b(){try{F.textContent=`$${15000.5.toFixed(2)}`,_.textContent=`$${5200.75.toFixed(2)}`,T.textContent=12,await K(),await X()}catch(t){console.error("Error al cargar dashboard:",t)}}async function K(){const{data:t,error:e}=await s.from("clientes_con_deuda").select("id, name, debt, last_update").order("debt",{ascending:!1});if(e){console.error("Error al cargar lista de deudas (RLS o VIEW faltante):",e),l.innerHTML='<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar deudas. Revise RLS y la Vista SQL.</td></tr>';return}if(!t||t.length===0){l.innerHTML='<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay deudas pendientes registradas.</td></tr>';return}l.innerHTML=t.map(a=>`
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
    `).join(""),l.querySelectorAll(".open-debt-modal-btn").forEach(a=>{a.addEventListener("click",ae)})}async function X(){try{const{data:t,error:e}=await s.from("ventas").select(`
                id,
                amount,
                created_at,
                clientes (name),       
                categorias (name)      
            `).order("created_at",{ascending:!1}).limit(10);if(e)throw e;if(!t||t.length===0){u.innerHTML='<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';return}u.innerHTML=t.map(a=>{var d,i;const r=((d=a.clientes)==null?void 0:d.name)??"Cliente Desconocido",n=((i=a.categorias)==null?void 0:i.name)??"Sin Categoría",o=new Date(a.created_at).toLocaleString();return`
                <tr class="hover:bg-gray-50">
                    <td class="p-4 whitespace-nowrap text-sm text-gray-900">${r}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-semibold text-green-600">$${parseFloat(a.amount).toFixed(2)}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${n}</td>
                    <td class="p-4 whitespace-nowrap text-sm text-gray-500">${o}</td>
                    <td class="p-4 whitespace-nowrap text-sm font-medium">
                        <button data-sale-id="${a.id}" class="edit-sale-btn text-indigo-600 hover:text-indigo-900 text-sm">
                            Editar
                        </button>
                    </td>
                </tr>
            `}).join(""),u.querySelectorAll(".edit-sale-btn").forEach(a=>{a.addEventListener("click",ne)})}catch(t){console.error("Error al cargar lista de ventas:",t),u.innerHTML='<tr><td colspan="5" class="p-4 text-center text-red-500">Error al cargar ventas. Revise RLS.</td></tr>'}}async function ee(t){t.preventDefault();const e=document.getElementById("sale-client-id"),a=document.getElementById("sale-amount"),r=parseInt(e.value),n=parseFloat(a.value),o=parseInt(m.value),d=document.getElementById("sale-description").value;if(isNaN(r)||isNaN(n)||n<=0||isNaN(o)){alert("Por favor, revisa el ID del Cliente, el Monto y la Categoría.");return}try{const i=await S(r),{error:h}=await s.from("ventas").insert({client_id:i,amount:n,category_id:o,description:d});if(h)throw h;alert("Venta/Cargo registrado con éxito."),w.reset(),y.classList.add("hidden"),await b()}catch(i){console.error("Error al registrar la venta:",i),alert("Error al registrar la venta: "+i.message)}}async function te(t){t.preventDefault();const e=x,a=parseFloat(I.value);if(!e){alert("Error: No se ha seleccionado un cliente.");return}if(isNaN(a)||a<=0){alert("Por favor, ingresa un monto de abono válido.");return}const r=parseInt(e);try{const n=await S(r);await z(n,a)&&(alert("Abono registrado con éxito."),f.classList.add("hidden"),await b())}catch(n){console.error("Error al registrar abono o crear cliente:",n),alert('No se pudo verificar o crear el cliente antes de registrar el abono. Revise el RLS de INSERT en la tabla "clientes".')}}function ae(t){const a=t.target.dataset.clientId;x=a,document.getElementById("debt-client-display").textContent=a,I.value="",f.classList.remove("hidden")}function ne(t){const e=t.target.dataset.saleId;alert(`Abriendo edición para Venta ID: ${e}`)}async function re(){await g(),await b()}document.addEventListener("DOMContentLoaded",()=>{C()});$.addEventListener("submit",V);R.addEventListener("click",Y);q.addEventListener("click",()=>y.classList.remove("hidden"));k.addEventListener("click",()=>y.classList.add("hidden"));w.addEventListener("submit",ee);document.getElementById("updateDebtBtn").addEventListener("click",()=>{alert('Por favor, selecciona un cliente de la lista "Deudas Pendientes" para registrar un abono.')});H.addEventListener("click",()=>f.classList.add("hidden"));U.addEventListener("submit",te);document.getElementById("openProfileModalBtn").addEventListener("click",()=>B.classList.remove("hidden"));J.addEventListener("click",()=>B.classList.add("hidden"));O.addEventListener("click",async()=>{L.classList.remove("hidden"),await c()});j.addEventListener("click",()=>{L.classList.add("hidden")});
