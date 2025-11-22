import{createClient as A}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&r(d)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();const P="https://wnwftbamyaotqdsivmas.supabase.co",M="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo",s=A(P,M);let x=null;const E=document.getElementById("auth-modal"),v=document.getElementById("app-container"),_=document.getElementById("login-form"),R=document.getElementById("logoutBtn"),$=document.getElementById("total-sales"),F=document.getElementById("total-debt"),T=document.getElementById("debtor-count"),l=document.getElementById("debt-list"),u=document.getElementById("sales-list"),O=document.getElementById("addProductAdminBtn"),q=document.getElementById("addSaleBtn"),y=document.getElementById("add-sale-modal"),k=document.getElementById("close-add-sale-modal"),w=document.getElementById("add-sale-form"),m=document.getElementById("sale-category-id"),f=document.getElementById("update-debt-modal"),H=document.getElementById("close-update-debt-modal"),U=document.getElementById("update-debt-form"),I=document.getElementById("debt-payment-amount"),L=document.getElementById("product-admin-modal"),j=document.getElementById("close-product-admin-modal"),p=document.getElementById("admin-content-area"),B=document.getElementById("user-profile-modal"),J=document.getElementById("closeProfileModal");async function V(e){e.preventDefault();const t=document.getElementById("login-identifier").value,a=document.getElementById("login-password").value,{error:r}=await s.auth.signInWithPassword({email:t,password:a});if(r){alert("Error de login: "+r.message),console.error("Error de Login:",r);return}C()}async function Y(){await s.auth.signOut(),window.location.reload()}function C(){s.auth.getSession().then(({data:{session:e}})=>{e?(E.classList.add("hidden"),v.classList.remove("hidden"),re()):(E.classList.remove("hidden"),v.classList.add("hidden"),g())}).catch(e=>{console.error("Error al obtener la sesión de Supabase:",e)})}async function S(e){let{data:t,error:a}=await s.from("clientes").select("id").eq("id",e).single();if(a&&a.code!=="PGRST116"&&console.error("Error al buscar cliente:",a),!t){console.log(`Cliente ID ${e} no encontrado, intentando crear uno nuevo...`);const{data:r,error:n}=await s.from("clientes").insert({id:e,name:`Cliente ${e}`}).select("id").single();if(n)throw console.error("Error al crear cliente (Verifica RLS INSERT para authenticated):",n),new Error("No se pudo crear el cliente.");return r.id}return t.id}async function z(e,t){try{const{error:a}=await s.from("pagos").insert([{client_id:e,amount:t}]);if(a)throw a;return console.log(`Pago de $${t.toFixed(2)} registrado REALMENTE para Cliente ID: ${e}`),!0}catch(a){return console.error("Error al registrar pago en Supabase:",a),alert("Error al registrar pago: "+a.message),!1}}async function N(){const{data:e,error:t}=await s.from("categorias").select("id, name").order("name",{ascending:!0});return t?(console.error('Error al obtener categorías. ¿Tabla "categorias" existe y tiene RLS SELECT anon/authenticated?',t),[]):e}async function G(e){const{error:t}=await s.from("categorias").insert({name:e});return t?(alert("Error al crear categoría: "+t.message),!1):!0}async function Q(e){if(!confirm("¿Estás seguro de que quieres eliminar esta categoría?"))return!1;const{error:t}=await s.from("categorias").delete().eq("id",e);return t?(alert("Error al eliminar categoría: "+t.message),!1):!0}async function g(){const e=await N();if(m.innerHTML='<option value="">-- Seleccionar Categoría --</option>',e&&e.length>0)e.forEach(t=>{const a=document.createElement("option");a.value=t.id,a.textContent=t.name,m.appendChild(a)});else{const t=document.createElement("option");t.value="",t.textContent="ERROR: No se cargaron categorías. Revise RLS.",m.appendChild(t)}}async function c(){const e=await N();let t="";t+=`
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
    `,t+=`
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Productos/Paquetes</button>
        </div>
    `,t+='<h4 class="text-lg font-semibold mb-3">Lista de Categorías Existentes</h4>',e.length===0?t+='<p class="text-gray-500">No hay categorías registradas.</p>':t+=`
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
                        ${e.map(r=>`
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
        `,p.innerHTML=t,p.querySelectorAll(".delete-category-btn").forEach(r=>{r.addEventListener("click",Z)}),document.getElementById("view-categories-btn").addEventListener("click",c),document.getElementById("view-products-btn").addEventListener("click",D);const a=document.getElementById("add-category-form");a&&a.addEventListener("submit",async r=>{r.preventDefault(),await W(r.target)})}function D(){p.innerHTML=`
        <div class="flex space-x-2 mb-4">
            <button id="view-categories-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-300 text-gray-800">Categorías</button>
            <button id="view-products-btn" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">Productos/Paquetes</button>
        </div>
        <p class="text-gray-500 p-4">La gestión de Productos y Paquetes se implementará pronto. Ahora solo puedes administrar Categorías.</p>`,document.getElementById("view-categories-btn").addEventListener("click",c),document.getElementById("view-products-btn").addEventListener("click",D)}async function W(e){const t=e.querySelector("#category-name-input"),a=t.value.trim();if(!a){alert("Por favor, ingresa un nombre para la categoría.");return}await G(a)&&(alert("Categoría creada con éxito."),t.value="",await c(),await g())}async function Z(e){const t=e.target.dataset.categoryId;await Q(t)&&(alert("Categoría eliminada con éxito."),await c(),await g())}async function b(){try{const{data:e,error:t}=await s.from("clientes_con_deuda").select("debt");if(t)throw t;let a=0,r=0;e&&e.length>0&&(e.forEach(i=>{a+=parseFloat(i.debt)}),r=e.length);let n=0;const{data:o,error:d}=await s.from("total_ventas_dashboard").select("total_sales").single();d&&d.code!=="PGRST116"?console.warn("Advertencia: No se encontró el total de ventas (BD vacía).",d):o&&(n=parseFloat(o.total_sales)),$.textContent=`$${n.toFixed(2)}`,F.textContent=`$${a.toFixed(2)}`,T.textContent=r,await K(),await X()}catch(e){console.error("Error al cargar dashboard:",e),alert("Error al cargar datos del dashboard. Revise RLS y las vistas.")}}async function K(){const{data:e,error:t}=await s.from("clientes_con_deuda").select("id, name, debt, last_update").order("debt",{ascending:!1});if(t){console.error("Error al cargar lista de deudas (RLS o VIEW faltante):",t),l.innerHTML='<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar deudas. Revise RLS y la Vista SQL.</td></tr>';return}if(!e||e.length===0){l.innerHTML='<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay deudas pendientes registradas.</td></tr>';return}l.innerHTML=e.map(a=>`
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
    `).join(""),l.querySelectorAll(".open-debt-modal-btn").forEach(a=>{a.addEventListener("click",ae)})}async function X(){try{const{data:e,error:t}=await s.from("ventas").select(`
                id,
                amount,
                created_at,
                clientes (name),       
                categorias (name)      
            `).order("created_at",{ascending:!1}).limit(10);if(t)throw t;if(!e||e.length===0){u.innerHTML='<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>';return}u.innerHTML=e.map(a=>{var d,i;const r=((d=a.clientes)==null?void 0:d.name)??"Cliente Desconocido",n=((i=a.categorias)==null?void 0:i.name)??"Sin Categoría",o=new Date(a.created_at).toLocaleString();return`
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
            `}).join(""),u.querySelectorAll(".edit-sale-btn").forEach(a=>{a.addEventListener("click",ne)})}catch(e){console.error("Error al cargar lista de ventas:",e),u.innerHTML='<tr><td colspan="5" class="p-4 text-center text-red-500">Error al cargar ventas. Revise RLS.</td></tr>'}}async function ee(e){e.preventDefault();const t=document.getElementById("sale-client-id"),a=document.getElementById("sale-amount"),r=parseInt(t.value),n=parseFloat(a.value),o=parseInt(m.value),d=document.getElementById("sale-description").value;if(isNaN(r)||isNaN(n)||n<=0||isNaN(o)){alert("Por favor, revisa el ID del Cliente, el Monto y la Categoría.");return}try{const i=await S(r),{error:h}=await s.from("ventas").insert({client_id:i,amount:n,category_id:o,description:d});if(h)throw h;alert("Venta/Cargo registrado con éxito."),w.reset(),y.classList.add("hidden"),await b()}catch(i){console.error("Error al registrar la venta:",i),alert("Error al registrar la venta: "+i.message)}}async function te(e){e.preventDefault();const t=x,a=parseFloat(I.value);if(!t){alert("Error: No se ha seleccionado un cliente.");return}if(isNaN(a)||a<=0){alert("Por favor, ingresa un monto de abono válido.");return}const r=parseInt(t);try{const n=await S(r);await z(n,a)&&(alert("Abono registrado con éxito."),f.classList.add("hidden"),await b())}catch(n){console.error("Error al registrar abono o crear cliente:",n),alert('No se pudo verificar o crear el cliente antes de registrar el abono. Revise el RLS de INSERT en la tabla "clientes".')}}function ae(e){const a=e.target.dataset.clientId;x=a,document.getElementById("debt-client-display").textContent=a,I.value="",f.classList.remove("hidden")}function ne(e){const t=e.target.dataset.saleId;alert(`Abriendo edición para Venta ID: ${t}`)}async function re(){await g(),await b()}document.addEventListener("DOMContentLoaded",()=>{C()});_.addEventListener("submit",V);R.addEventListener("click",Y);q.addEventListener("click",()=>y.classList.remove("hidden"));k.addEventListener("click",()=>y.classList.add("hidden"));w.addEventListener("submit",ee);document.getElementById("updateDebtBtn").addEventListener("click",()=>{alert('Por favor, selecciona un cliente de la lista "Deudas Pendientes" para registrar un abono.')});H.addEventListener("click",()=>f.classList.add("hidden"));U.addEventListener("submit",te);document.getElementById("openProfileModalBtn").addEventListener("click",()=>B.classList.remove("hidden"));J.addEventListener("click",()=>B.classList.add("hidden"));O.addEventListener("click",async()=>{L.classList.remove("hidden"),await c()});j.addEventListener("click",()=>{L.classList.add("hidden")});
