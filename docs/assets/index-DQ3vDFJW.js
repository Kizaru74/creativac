(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))a(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const d of r.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&a(d)}).observe(document,{childList:!0,subtree:!0});function n(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(o){if(o.ep)return;o.ep=!0;const r=n(o);fetch(o.href,r)}})();const X="https://wnwftbamyaotqdsivmas.supabase.co",J="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indud2Z0YmFteWFvdHFkc2l2bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTY0OTcsImV4cCI6MjA3OTE3MjQ5N30.r8Fh7FUYOnUQHboqfKI1eb_37NLuAn3gRLbH8qUPpMo";let c,H=[],_=[];try{const e=window.supabase||c;if(e&&typeof e.createClient=="function")window.supabase=e.createClient(X,J),c=window.supabase,console.log("✅ Cliente de Supabase creado con éxito.");else throw new Error("La librería Supabase no está cargada correctamente.")}catch(e){console.error("❌ Error Fatal al inicializar Supabase:",e.message),window.supabase=null,c=null}async function Z(){console.log("🚀 Iniciando carga de la aplicación...");try{await loadProducts(),await loadClientsTable("gestion"),typeof loadDashboardMetrics=="function"&&await loadDashboardMetrics(),typeof populateProductSelects=="function"&&populateProductSelects(),typeof loadMainProductsAndPopulateSelect=="function"&&await loadMainProductsAndPopulateSelect(),console.log("✅ Aplicación inicializada correctamente.")}catch(e){console.error("❌ Error crítico durante la inicialización:",e)}}document.addEventListener("DOMContentLoaded",Z);window.loadDashboardMetrics=async function(){if(!c){console.error("Supabase no está inicializado para cargar métricas.");return}try{const{data:e,error:t}=await c.from("ventas").select("saldo_pendiente").gt("saldo_pendiente",.01);if(t)throw t;let n=0;e&&e.length>0&&(n=e.reduce((s,l)=>s+parseFloat(l.saldo_pendiente||0),0));const{data:a,error:o}=await c.from("ventas").select("total_amount").not("total_amount","is",null);if(o)throw o;let r=0;a&&a.length>0&&(r=a.reduce((s,l)=>s+parseFloat(l.total_amount||0),0));const d=document.getElementById("total-debt");d&&(d.textContent=y(n));const i=document.getElementById("historical-total-sales");i&&(i.textContent=y(r))}catch(e){console.error("Error al cargar métricas del dashboard:",e)}};function y(e){return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(e)}window.openModal=function(e){const t=document.getElementById(e);t?(t.classList.remove("hidden"),t.classList.add("flex")):console.error(`No se pudo encontrar el modal con ID: ${e}`)};window.closeModal=function(e){const t=document.getElementById(e);t&&(t.classList.add("hidden"),t.classList.remove("flex"))};async function L(){await M(),await te(),await loadClientsTable("gestion"),await loadProductsTable(),await j(),await re()}async function N(){const{data:{user:e}}=await c.auth.getUser(),t=document.getElementById("auth-container"),n=document.getElementById("dashboard-container");if(!t||!n){console.error("Error: Los contenedores 'auth-container' o 'dashboard-container' no se encontraron en el HTML.");return}e?(t.classList.add("hidden"),n.classList.remove("hidden"),await L()):(t.classList.remove("hidden"),n.classList.add("hidden"))}async function Q(e){e.preventDefault();const t=document.getElementById("email").value,n=document.getElementById("password").value,{error:a}=await c.auth.signInWithPassword({email:t,password:n});a?alert(a.message):N()}async function ee(){await c.auth.signOut(),N()}async function M(){const e=document.getElementById("debts-table-body");if(!e)return;const{data:t,error:n}=await c.from("ventas").select("saldo_pendiente, clientes(name, client_id)").gt("saldo_pendiente",.01);if(n)return console.error(n);const a=t.reduce((i,s)=>{const l=s.clientes;return l&&(i[l.client_id]||(i[l.client_id]={name:l.name,total:0,id:l.client_id}),i[l.client_id].total+=Number(s.saldo_pendiente)),i},{}),o=Object.values(a),r=o.reduce((i,s)=>i+s.total,0),d=Math.max(...o.map(i=>i.total),0);document.getElementById("total-deuda-global").innerText=y(r),document.getElementById("total-clientes-deuda").innerText=o.length,document.getElementById("max-deuda-individual").innerText=y(d),e.innerHTML=o.map(i=>`
        <tr class="hover:bg-white/[0.02] border-b border-white/5">
            <td class="px-10 py-6">
                <div class="text-white font-bold text-base">${i.name}</div>
                <div class="text-[10px] text-gray-600 uppercase tracking-widest mt-1">ID: ${i.id}</div>
            </td>
            <td class="px-10 py-6 text-center text-orange-500 font-black text-xl">
                ${y(i.total)}
            </td>
            <td class="px-10 py-6">
                <span class="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">Cobro Pendiente</span>
            </td>
            <td class="px-10 py-6 text-right">
                <button onclick="handleViewClientDebt('${i.id}')" 
                    class="bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black py-3 px-6 rounded-2xl uppercase transition-all shadow-lg shadow-orange-900/20">
                    Gestionar Pagos
                </button>
            </td>
        </tr>
    `).join("")}async function te(){try{const{data:e,error:t}=await c.from("ventas").select("venta_id, created_at, total_amount, saldo_pendiente, clientes(name, client_id), description").order("created_at",{ascending:!1}).limit(7);if(t){console.error("Error al cargar ventas recientes:",t);return}const n=document.getElementById("recent-sales-body"),a=document.getElementById("no-sales-message");if(!n)return;if(n.innerHTML="",a&&a.classList.add("hidden"),e.length===0){a&&a.classList.remove("hidden");return}e.forEach(o=>{var s,l;const r=((s=o.clientes)==null?void 0:s.name)||"Cliente Desconocido",d=(l=o.clientes)==null?void 0:l.client_id,i=document.createElement("tr");i.className="hover:bg-gray-50",i.innerHTML=`
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${o.venta_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${r}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Y(o.created_at)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold">${y(o.total_amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${o.saldo_pendiente>0?"text-red-600":"text-green-600"}">${y(o.saldo_pendiente)}</td>
                
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"> 
                    <button type="button" 
                            class="view-sale-details-btn text-indigo-600 hover:text-indigo-900 font-semibold text-xs py-1 px-2 rounded bg-indigo-100"
                            data-sale-id="${o.venta_id}"
                            data-client-id="${d}"> 
                        Detalles
                    </button>
                </td>
            `,n.appendChild(i)}),n.querySelectorAll(".view-sale-details-btn").forEach(o=>{o.addEventListener("click",()=>{const r=o.dataset.saleId,d=o.dataset.clientId;handleViewSaleDetails(r,d)})})}catch(e){console.error("Error inesperado en loadRecentSales:",e)}}async function j(){const e=document.getElementById("client-select");if(!e)return;e.innerHTML='<option value="" disabled selected>Cargando clientes...</option>';const{data:t,error:n}=await c.from("clientes").select("client_id, name").order("name",{ascending:!0});if(n){console.error("Error al cargar clientes para venta:",n),e.innerHTML='<option value="" disabled selected>Error al cargar (revisar consola)</option>';return}if(t.length===0){e.innerHTML='<option value="" disabled selected>No hay clientes activos</option>';return}e.innerHTML='<option value="" disabled selected>Seleccione un Cliente</option>',t.forEach(a=>{const o=document.createElement("option");o.value=a.client_id,o.textContent=a.name,e.appendChild(o)})}window.loadDebts=async function(){console.log("Refrescando datos de deudas..."),typeof loadDebtsTable=="function"&&await loadDebtsTable(),typeof actualizarMetricasDeudas=="function"&&actualizarMetricasDeudas(window.allClients)};window.loadMainProductsForEditSelect=function(){const e=document.getElementById("edit-product-parent");if(!e)return;const n=(window.allProducts||[]).filter(o=>o.type==="MAIN"||o.type==="SERVICE");e.innerHTML="";const a=document.createElement("option");a.value="",a.textContent="--- Seleccione el Producto Principal ---",e.appendChild(a),n.forEach(o=>{const r=document.createElement("option");r.value=o.producto_id,r.textContent=o.name,e.appendChild(r)})};window.loadProductDataToForm=function(e){window.loadMainProductsForEditSelect();const t=window.allProductsMap?window.allProductsMap[String(e)]:null;if(!t){console.error(`Error de precarga: Producto no encontrado en el mapa con ID ${e}.`);return}let n;t.type==="MAIN"||t.type==="PRODUCT"?n="Producto":t.type==="SERVICE"?n="Servicio":t.type==="PACKAGE"?n="Paquete":n="Producto",document.getElementById("edit-product-id").value=t.producto_id,document.getElementById("edit-product-name").value=t.name,document.getElementById("edit-product-price").value=t.price,document.getElementById("edit-product-category").value=n;const a=document.getElementById("edit-product-parent-container"),o=document.getElementById("edit-product-parent");t.type==="PACKAGE"?(a.classList.remove("hidden"),o.value=t.parent_product||""):(a.classList.add("hidden"),o.value=""),document.getElementById("edit-product-category").onchange=function(){this.value==="Paquete"?a.classList.remove("hidden"):a.classList.add("hidden")},console.log(`✅ Datos del producto ID ${e} precargados en el modal.`)};window.loadProductsData=async function(){if(console.log("Cargando productos..."),!c){console.error("Error: Supabase no inicializado en loadProductsData.");return}try{const{data:e,error:t}=await c.from("productos").select("*");if(t)throw t;window.allProducts=(e||[]).map(n=>{const a=parseInt(String(n.producto_id).trim(),10);let r=n.parent_product?String(n.parent_product).trim():null;const d=String(n.type||"").replace(/\s/g,"").toUpperCase();return{...n,producto_id:isNaN(a)?n.producto_id:a,type:d,parent_product:r,is_package:d==="PACKAGE"}}),window.allProductsMap=window.allProducts.reduce((n,a)=>(n[a.producto_id]=a,n),{}),console.log(`✅ Productos cargados con bandera is_package: ${window.allProducts.length} ítems.`)}catch(e){console.error("Error al cargar productos:",e)}return window.allProducts};window.loadProducts=window.loadProductsData;window.handleChangeProductForSale=function(){const e=document.getElementById("product-main-select"),t=document.getElementById("subproduct-select"),n=document.getElementById("product-unit-price");if(!e||!t||!n||typeof window.allProducts>"u"){console.error("Error: Elementos de venta o datos (window.allProducts) no encontrados.");return}const a=e.value;if(console.log(`[DIAG_CRÍTICO] window.allProducts.length: ${window.allProducts.length} | Producto ID: ${a}`),!a||a==="placeholder-option-value"||a==="0"){t.innerHTML='<option value="" selected>Sin Paquete</option>',t.disabled=!0,n.value="0.00";return}if(window.allProducts.length<5){console.warn("ADVERTENCIA: Data de productos inestable o incompleta.");return}window.updatePriceField(a);const o=window.allProducts.filter(r=>r.is_package===!0&&String(r.parent_product)===a);console.log(`DIAGNÓSTICO DE FILTRO JS: ${o.length} subproductos encontrados para ID: ${a}`),o.length>0?(t.disabled=!1,t.innerHTML='<option value="" disabled selected>Seleccione un Paquete</option>',o.forEach(r=>{const d=document.createElement("option");d.value=r.producto_id;const i=typeof window.formatCurrency=="function"?window.formatCurrency(r.price):`$${parseFloat(r.price).toFixed(2)}`;d.textContent=`${r.name} (${i})`,t.appendChild(d)}),console.log(`DIAGNÓSTICO DE RENDERIZADO: Se inyectaron ${o.length} opciones.`)):(t.disabled=!0,t.innerHTML='<option value="" selected>Sin Paquete</option>')};window.loadMainProductsForSaleSelect=function(){const e=document.getElementById("product-main-select");if(!e||!window.allProducts){console.error("No se encontró el selector principal o los datos de productos.");return}e.innerHTML='<option value="" disabled selected>Seleccione un producto...</option>';const t=window.allProducts.filter(n=>n.type==="MAIN"||n.type==="SERVICE").sort((n,a)=>n.name.localeCompare(a.name));t.forEach(n=>{const a=document.createElement("option");a.value=n.producto_id,a.textContent=n.name,e.appendChild(a)}),e.removeEventListener("change",window.handleChangeProductForSale),e.addEventListener("change",window.handleChangeProductForSale),console.log(`✅ ${t.length} productos listados en el selector de venta.`)};window.loadMainProductsForSaleSelect=window.loadMainProductsForSaleSelect;async function ne(e){const t=document.getElementById(e);if(!t)return;const n=H.filter(a=>a.type&&a.type.trim().toUpperCase()==="MAIN");if(t.innerHTML='<option value="" disabled selected>Seleccione Producto Principal</option>',n.length===0){t.innerHTML='<option value="" disabled selected>❌ No hay Productos Base (Tipo: MAIN)</option>';return}n.forEach(a=>{const o=document.createElement("option");o.value=a.producto_id,o.textContent=`${a.name} ($${a.price.toFixed(2)})`,t.appendChild(o)})}window.updatePriceField=function(e){const t=document.getElementById("product-unit-price"),n=H.find(a=>String(a.producto_id)===String(e));t&&(n&&n.price!==void 0?t.value=parseFloat(n.price).toFixed(2):t.value="0.00")};function A(e){const t=document.getElementById("paid-amount"),n=document.getElementById("display-saldo-pendiente"),a=document.getElementById("payment-method"),o=document.getElementById("total-amount");if(!t||!a||!n||!o){console.warn("Faltan elementos DOM para la actualización de Saldo.");return}const r=R(o.value),d=parseFloat(r)||0,i=a.value;let s=R(t.value),l=parseFloat(s)||0;t.value.trim()===""&&(t.value="0.00"),i==="Deuda"&&(l=0);let u=d-l;d<=0&&(u=0),n.value=y(u),n.classList.remove("bg-red-100","bg-green-100","text-red-700","text-green-700"),u>.01?n.classList.add("bg-red-100","text-red-700"):n.classList.add("bg-green-100","text-green-700")}function B(){const e=_.reduce((a,o)=>a+o.subtotal,0);console.log("Grand Total calculado:",e);const t=document.getElementById("total-amount");t&&(t.value=e.toFixed(2)),A();const n=document.getElementById("submit-sale-btn");return _.length>0?n==null||n.removeAttribute("disabled"):n==null||n.setAttribute("disabled","true"),e}window.updateSaleTableDisplay=function(){const e=document.getElementById("sale-items-table-body");if(!e){console.error("Error FATAL: Elemento 'sale-items-table-body' no encontrado en el DOM.");return}let t="";_.length===0?t='<tr><td colspan="5" class="px-4 py-2 text-center text-gray-500 italic">Agrega productos a la venta.</td></tr>':_.forEach((n,a)=>{let o=n.name;!n.name.includes("(")&&n.type&&n.type.trim().toUpperCase()!=="MAIN"&&(o=`${n.name} (${n.type})`),t+=`
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2 text-sm font-medium text-gray-900">${o}</td>
                    <td class="px-4 py-2 text-sm text-gray-500 text-center">${n.quantity}</td> 
                    <td class="px-4 py-2 text-sm text-gray-500 cursor-pointer hover:bg-yellow-100 transition-colors"
                        id="price-${a}"
                        onclick="promptEditItemPrice(${a}, ${n.price})">
                        ${y(n.price)}
                    </td>
                    <td class="px-4 py-2 text-sm font-bold">${y(n.subtotal)}</td>
                    <td class="px-4 py-2 text-right text-sm font-medium">
                        <button type="button" onclick="removeItemFromSale(${a})" 
                                class="text-red-600 hover:text-red-900">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    </td>
                </tr>
            `}),e.innerHTML=t,B()};window.removeItemFromSale=function(e){if(e<0||e>=_.length){console.error("Índice de ítem de venta inválido para eliminar.");return}confirm(`¿Estás seguro de que quieres eliminar "${_[e].name}" de la venta?`)&&(_.splice(e,1),updateSaleTableDisplay(),B())};window.handleAddProductToSale=function(e){e&&e.preventDefault();const t=document.getElementById("product-main-select"),n=document.getElementById("subproduct-select"),a=document.getElementById("product-quantity"),o=document.getElementById("product-unit-price"),r=t==null?void 0:t.value,d=n==null?void 0:n.value,i=parseFloat(a==null?void 0:a.value);let s=d&&d!==""?d:r;const l=String(s||"").trim();let u=window.allProducts.find(m=>String(m.producto_id)===l);if(!u){alert("Por favor, selecciona un Producto o Paquete válido.");return}if(isNaN(i)||i<=0){alert("La cantidad debe ser mayor a cero.");return}const w=o==null?void 0:o.value;let f=parseFloat(w==null?void 0:w.replace(",","."))||0;f===0&&u&&(f=parseFloat(u.price)||0);const b=i*f;let p=u.name;if(d&&d!==""){const m=window.allProducts.find(P=>String(P.producto_id)===String(r));m&&(p=`${m.name} (${u.name})`)}const v={product_id:parseInt(s,10),name:p,quantity:i,price:f,subtotal:b,type:u.type||null},x=parseInt(s,10),h=_.findIndex(m=>m.product_id===x);h>-1?(_[h].quantity+=i,_[h].subtotal+=b):_.push(v),window.updateSaleTableDisplay(),B(),t.value="",n.innerHTML='<option value="" selected>Sin Paquete</option>',n.disabled=!0,a.value="1",o.value="0.00"};window.handleNewSale=async function(e){var u,w,f,b,p;e&&e.preventDefault();const t=(u=document.getElementById("client-select"))==null?void 0:u.value,n=((w=document.getElementById("payment-method"))==null?void 0:w.value)??"Efectivo",a=((f=document.getElementById("sale-details"))==null?void 0:f.value.trim())??null,o=((b=document.getElementById("paid-amount"))==null?void 0:b.value.replace(/[^\d.-]/g,""))??"0";let r=parseFloat(o);const d=_.reduce((v,x)=>v+x.subtotal,0);n==="Deuda"&&(r=0);let i=r>d?d:r,s=d-i;if(!t){alert("Selecciona un cliente.");return}if(_.length===0){alert("El carrito está vacío.");return}const l=document.querySelector('#new-sale-form button[type="submit"]');l&&(l.disabled=!0,l.textContent="Procesando...");try{const{data:v,error:x}=await c.from("ventas").insert([{client_id:t,total_amount:d,paid_amount:i,saldo_pendiente:s,metodo_pago:n,description:a}]).select("venta_id");if(x)throw x;const h=v[0].venta_id,m=_.map(C=>({venta_id:h,product_id:C.product_id,name:C.name||"Producto",quantity:C.quantity,price:C.price,subtotal:C.subtotal})),{error:P}=await c.from("detalle_ventas").insert(m);if(P)throw P;if(i>0&&await c.from("pagos").insert([{venta_id:h,amount:i,client_id:t,metodo_pago:n,type:"INICIAL"}]),s>0){const{data:C}=await c.from("clientes").select("deuda_total").eq("client_id",t).single();await c.from("clientes").update({deuda_total:((C==null?void 0:C.deuda_total)||0)+s}).eq("client_id",t)}alert("Venta registrada con éxito"),closeModal("new-sale-modal"),_=[],typeof window.updateSaleTableDisplay=="function"&&window.updateSaleTableDisplay(),(p=document.getElementById("new-sale-form"))==null||p.reset(),console.log("🔄 Sincronizando datos tras venta..."),typeof window.loadSalesData=="function"&&(await window.loadSalesData(),typeof window.handleFilterSales=="function"&&window.handleFilterSales()),typeof window.loadDashboardData=="function"&&await window.loadDashboardData(),s>0&&typeof window.loadClientsTable=="function"&&await window.loadClientsTable("gestion")}catch(v){console.error("Error al procesar venta:",v),alert("Error: "+v.message)}finally{l&&(l.disabled=!1,l.textContent="Registrar Venta")}};window.refreshAllProductSelects=function(){const e=document.getElementById("sale-product-select"),t=document.getElementById("new-product-parent-select"),n=document.getElementById("edit-product-parent"),a=window.allProducts||[],o=(r,d,i=!1)=>{if(!r)return;const s=r.value;r.innerHTML='<option value="">-- Seleccionar --</option>',d.forEach(l=>{if(i&&l.type==="PACKAGE")return;const u=document.createElement("option");u.value=l.producto_id,u.textContent=l.name,r.appendChild(u)}),r.value=s};o(e,a),o(t,a,!0),o(n,a,!0)};function R(e){return typeof e!="string"?0:e.replace(/[^\d.-]/g,"")}window.getClientSalesSummary=async function(e){if(!c)return{totalVentas:0,deudaNeta:0};try{const{data:t,error:n}=await c.from("transacciones_deuda").select("type, amount").eq("client_id",e);if(n)throw n;let a=0,o=0;return(t||[]).forEach(r=>{const d=parseFloat(r.amount||0);String(r.type).toLowerCase().includes("cargo")?(a+=d,o+=d):o-=d}),{totalVentas:Math.max(0,a),deudaNeta:Math.max(0,o)}}catch(t){return console.error(`❌ Error en resumen del cliente ${e}:`,t),{totalVentas:0,deudaNeta:0}}};window.handleAbonoSubmit=async function(e){var i,s;e&&e.preventDefault&&e.preventDefault();const t=document.getElementById("abono-client-form"),n=t==null?void 0:t.querySelector('button[type="submit"]'),a=(i=document.getElementById("abono-client-id"))==null?void 0:i.value,o=parseFloat((s=document.getElementById("abono-amount"))==null?void 0:s.value),r=document.getElementById("payment-method-abono"),d=r?r.value:"";if(!a)return alert("⚠️ Error: Cliente no identificado.");if(isNaN(o)||o<=0)return alert("⚠️ Ingrese un monto mayor a 0.");if(!d||d===""||d==="seleccionar")return alert("⚠️ Selecciona un Método de Pago.");n&&(n.disabled=!0,n.textContent="Procesando Cascada...");try{const{error:l}=await c.rpc("registrar_abono_cascada",{p_client_id:parseInt(a),p_amount:o,p_metodo_pago:d});if(l)throw l;const{data:u,error:w}=await c.from("pagos").select("venta_id, amount").eq("client_id",a).order("created_at",{ascending:!1}).limit(5),f=document.getElementById("log-container-fifo"),b=document.getElementById("recent-payments-log");b&&u&&(f&&f.classList.remove("hidden"),b.innerHTML=u.map(p=>`
                <tr class="border-b border-white/5">
                    <td class="py-2 text-gray-500 font-mono text-[10px]">Venta #${p.venta_id}</td>
                    <td class="py-2 text-right text-green-500 font-bold">-$${p.amount.toFixed(2)}</td>
                </tr>
            `).join("")),alert(`✅ Abono de ${y(o)} aplicado correctamente.`),setTimeout(async()=>{var v;window.closeModal("abono-client-modal"),t.reset(),f&&f.classList.add("hidden"),typeof window.loadDebts=="function"&&await window.loadDebts(),typeof window.loadClientsTable=="function"&&await window.loadClientsTable("gestion"),typeof window.loadDashboardData=="function"&&await window.loadDashboardData();const p=document.getElementById("modal-detail-sale");if(p&&!p.classList.contains("hidden")){const x=(v=document.getElementById("detail-sale-id"))==null?void 0:v.textContent;x&&await window.handleViewSaleDetails(x)}},2e3)}catch(l){console.error("❌ Error:",l),alert("Error técnico: "+l.message)}finally{n&&(n.disabled=!1,n.textContent="Confirmar Abono")}};window.handleNewSale=async function(e){var f,b,p,v,x;e.preventDefault();const t=((f=document.getElementById("client-select"))==null?void 0:f.value)??null,n=((b=document.getElementById("payment-method"))==null?void 0:b.value)??"Efectivo",a=((p=document.getElementById("sale-details"))==null?void 0:p.value.trim())??null,o=((v=document.getElementById("paid-amount"))==null?void 0:v.value.replace(/[^\d.-]/g,""))??"0";let r=parseFloat(o);const d=_.reduce((h,m)=>h+m.subtotal,0);n==="Deuda"&&(r=0);let i=r,s=d-r;if(!t){alert("Por favor, selecciona un cliente.");return}if(_.length===0){alert("Debes agregar al menos un producto a la venta.");return}if(d<0){alert("El total de la venta no puede ser negativo.");return}if(d<.01?(i=0,s=0):s<0&&(i=d,s=0),i<0||i>d){alert("El monto pagado es inválido.");return}if(s>.01&&!confirm(`¡Atención! Hay un saldo pendiente de ${y(s)}. ¿Deseas continuar?`))return;const l=_.find(h=>!h.product_id||isNaN(h.product_id)||parseInt(h.product_id,10)===0);if(l){alert(`Error: El ítem "${l.name}" tiene un ID inválido.`);return}const u=e.target.querySelector('button[type="submit"]');u&&(u.disabled=!0,u.textContent="Procesando Venta...");let w=null;try{const{data:h,error:m}=await c.from("ventas").insert([{client_id:t,total_amount:d,paid_amount:i,saldo_pendiente:s,metodo_pago:n,description:a}]).select("venta_id");if(m||!h||h.length===0)throw new Error(`Error al registrar venta principal: ${m==null?void 0:m.message}`);w=h[0].venta_id;const P=_.map(S=>({venta_id:w,product_id:parseInt(S.product_id,10),name:S.name||"Producto",quantity:S.quantity,price:S.price,subtotal:S.subtotal})),{error:C}=await c.from("detalle_ventas").insert(P);if(C)throw console.error("🛑 ERROR BD - DETALLES FALLIDOS:",C),new Error(`BD Falló al insertar detalles. Mensaje: ${C.message}`);if(i>0){const{error:S}=await c.from("pagos").insert([{venta_id:w,amount:i,client_id:t,metodo_pago:n,type:"INICIAL"}]);S&&alert(`Advertencia: El pago falló. ${S.message}`)}if(s>0){const{data:S,error:T}=await c.from("clientes").select("deuda_total").eq("client_id",t).single();if(!T&&S){const $=(S.deuda_total||0)+s;await c.from("clientes").update({deuda_total:$}).eq("client_id",t)}}closeModal("new-sale-modal"),window.currentSaleItems=[],window.updateSaleTableDisplay(),(x=document.getElementById("new-sale-form"))==null||x.reset(),await L(),await loadClientsTable("gestion"),window.showTicketPreviewModal?K(w):alert(`Venta #${w} registrada con éxito.`)}catch(h){console.error("Error FATAL:",h),alert("Error: "+h.message)}finally{u&&(u.disabled=!1,u.textContent="Finalizar Venta")}};window.loadDashboardMetrics=async function(){if(!c){console.error("Supabase no está inicializado para cargar métricas.");return}try{const{data:e,error:t}=await c.from("ventas").select("saldo_pendiente").gt("saldo_pendiente",.01);if(t)throw t;let n=0;e&&e.length>0&&(n=e.reduce((s,l)=>s+parseFloat(l.saldo_pendiente||0),0));const{data:a,error:o}=await c.from("ventas").select("total_amount").not("total_amount","is",null);if(o)throw o;let r=0;a&&a.length>0&&(r=a.reduce((s,l)=>s+parseFloat(l.total_amount||0),0));const d=document.getElementById("total-debt");d&&(d.textContent=y(n));const i=document.getElementById("historical-total-sales");i&&(i.textContent=y(r))}catch(e){console.error("Error al cargar métricas del dashboard:",e)}};window.handleViewClientDebt=async function(e){if(!c){console.error("Supabase no está inicializado."),alert("Error de conexión a la base de datos.");return}window.viewingClientId=e;try{let t=(window.allClients||[]).find(p=>String(p.client_id)===String(e));if(!t){const{data:p}=await c.from("clientes").select("name").eq("client_id",e).single();if(!p){alert("Error: No se encontró la información del cliente.");return}t=p}const{data:n,error:a}=await c.from("ventas").select("venta_id, total_amount, paid_amount, created_at, description, detalle_ventas ( name )").eq("client_id",e).order("created_at",{ascending:!0});if(a)throw a;const o=n||[],{data:r,error:d}=await c.from("pagos").select("venta_id, amount, metodo_pago, created_at").eq("client_id",e).order("created_at",{ascending:!0});if(d)throw d;const i=r||[];let s=[];o.forEach(p=>{var h;let x=`Venta: ${((h=p.detalle_ventas)==null?void 0:h.map(m=>m.name).join(", "))||"Venta General"}`;p.description&&(x+=` — ${p.description.trim()}`),s.push({date:new Date(p.created_at),type:"cargo_venta",description:x,amount:p.total_amount,venta_id:p.venta_id,order:1})}),i.forEach(p=>{var x;let v=`Abono a Deuda (${p.metodo_pago})`;if(p.venta_id){const h=o.find(m=>m.venta_id===p.venta_id);if(h){const m=((x=h.detalle_ventas)==null?void 0:x.map(C=>C.name).join(", "))||"Venta General";v=Math.abs(new Date(h.created_at)-new Date(p.created_at))<6e4?`Pago Inicial (${p.metodo_pago}) - Venta: "${m}"`:`Abono (${p.metodo_pago}) - Venta: "${m}"`}}s.push({date:new Date(p.created_at),type:"abono",description:v,amount:p.amount,venta_id:p.venta_id,order:2})}),s.sort((p,v)=>p.date-v.date||p.order-v.order),document.getElementById("client-report-name").textContent=t.name;const l=document.getElementById("client-transactions-body");let u="",w=0;s.forEach(p=>{p.type==="cargo_venta"?w+=p.amount:w-=p.amount;const v=w>.01?"text-red-600":"text-green-600",x=p.type==="cargo_venta"?"text-red-600":"text-green-600";u+=`
                <tr class="hover:bg-gray-50 text-sm border-b">
                    <td class="px-3 py-3 text-gray-500">${new Date(p.date).toLocaleDateString()}</td>
                    <td class="px-3 py-3 text-gray-800">${p.description}</td>
                    <td class="px-3 py-3 text-right font-bold ${x}">${y(p.amount)}</td>
                    <td class="px-3 py-3 text-right font-bold ${v}">${y(Math.abs(w))}</td>
                </tr>`}),l.innerHTML=u;const f=Math.abs(w),b=document.getElementById("client-report-total-debt");b.textContent=y(f),b.className=w>.01?"text-red-600 font-bold text-xl":"text-green-600 font-bold text-xl",window.currentClientDataForPrint={nombre:t.name,totalDeuda:f,transaccionesHTML:u},openModal("modal-client-debt-report")}catch(t){console.error("Error al cargar la deuda:",t),alert("Error al cargar el historial.")}};window.prepararAbonoDesdeReporte=function(){const e=window.viewingClientId;if(!e){alert("No se pudo identificar al cliente para el abono.");return}typeof window.handleAbonoClick=="function"?window.handleAbonoClick(e):console.error("La función handleAbonoClick no está definida.")};window.handleAbonoClick=function(e){const t=(window.allClients||[]).find(d=>String(d.client_id)===String(e));if(!t){alert("Cliente no encontrado.");return}const n=document.getElementById("abono-client-id"),a=document.getElementById("abono-client-name-display"),o=document.getElementById("abono-current-debt"),r=document.getElementById("log-container-fifo");if(n&&(n.value=e),a&&(a.textContent=t.name),o){const d=t.deuda_total||0;o.textContent=`$${parseFloat(d).toFixed(2)}`}r&&r.classList.add("hidden"),openModal("abono-client-modal")};window.actualizarMetricasDeudas=function(e){const t=e||[];console.log("Calculando métricas con:",t.length,"clientes");const n=t.reduce((d,i)=>{const s=parseFloat(i.deuda_total||i.total_debt||0);return d+s},0),a=t.filter(d=>parseFloat(d.deuda_total||d.total_debt||0)>0).length,o=document.getElementById("total-deuda-global"),r=document.getElementById("total-clientes-deuda");o&&(o.textContent=`$${n.toFixed(2)}`),r&&(r.textContent=a)};window.imprimirEstadoCuenta=function(){const e=window.currentClientDataForPrint;if(!e)return alert("Cargue primero el reporte del cliente.");const t="#8B4513",n=`
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: letter; margin: 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; }
                .header { border-bottom: 4px solid ${t}; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                .resumen { background: #fdf8f5; border: 1px solid ${t}44; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th { background: #f4f4f4; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold; text-transform: uppercase; }
                td { padding: 8px 10px; border-bottom: 1px solid #eee; }
                .text-right { text-align: right; }
                /* Colores dinámicos para el PDF */
                .text-red { color: #dc2626; font-weight: bold; }
                .text-green { color: #16a34a; font-weight: bold; }
                .text-bold { font-weight: bold; color: #000; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 style="margin:0; color:${t}; font-size: 24px;">CREATIVA CORTES CNC</h1>
                    <p style="margin:0; font-size: 12px; font-weight: bold;">ESTADO DE CUENTA PROFESIONAL</p>
                </div>
                <div style="text-align:right;">
                    <p style="margin:0; font-size: 11px;">Fecha de emisión:</p>
                    <p style="margin:0; font-size: 14px; font-weight: bold;">${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div class="resumen">
                <table style="width: 100%; background: none; border: none;">
                    <tr>
                        <td style="border:none; padding:0;">
                            <p style="margin:0; color:#666; font-size: 10px;">CLIENTE</p>
                            <p style="margin:0; font-size: 18px; font-weight: bold;">${e.nombre.toUpperCase()}</p>
                        </td>
                        <td style="border:none; padding:0; text-align: right;">
                            <p style="margin:0; color:#666; font-size: 10px;">SALDO TOTAL PENDIENTE</p>
                            <p style="margin:0; font-size: 26px; font-weight: 900; color:${t};">${y(e.totalDeuda)}</p>
                        </td>
                    </tr>
                </table>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width:12%">FECHA</th>
                        <th style="width:58%">DESCRIPCIÓN / CONCEPTO</th>
                        <th style="width:15%" class="text-right">MOVIMIENTO</th>
                        <th style="width:15%" class="text-right">SALDO ACUM.</th>
                    </tr>
                </thead>
                <tbody>
                    ${e.transaccionesHTML.replace(/text-red-600/g,"text-red").replace(/text-green-600/g,"text-green")}
                </tbody>
            </table>

            <div style="margin-top:40px; text-align:center; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:10px;">
                Taller Creativa Cortes CNC | Valladolid, Yucatán <br>
                Este documento es un comprobante informativo de saldos y movimientos.
            </div>

            <script>
                window.onload = () => { 
                    window.print(); 
                    setTimeout(() => window.close(), 500); 
                }
            <\/script>
        </body>
        </html>`,a=window.open("","_blank");a.document.write(n),a.document.close()};window.generarComprobanteAbono=function(e){const t="#b45309",n=new Date().toLocaleDateString("es-MX",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),a=Math.floor(Math.random()*9e5+1e5),o=window.open("","_blank");if(!o){alert("⚠️ El navegador bloqueó la ventana emergente. Por favor, permítelas para ver el comprobante.");return}o.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Recibo de Abono - ${e.cliente}</title>
            <style>
                @page { size: letter; margin: 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; font-size: 12px; background-color: #f4f4f4; padding: 20px; }
                
                .actions-bar { 
                    max-width: 210mm; margin: 0 auto 10px auto; 
                    display: flex; justify-content: flex-end; 
                }
                .btn-print { 
                    background: ${t}; color: white; border: none; padding: 10px 20px; 
                    border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;
                }

                .sheet { 
                    background: white; width: 210mm; min-height: 140mm; 
                    margin: 0 auto; padding: 15mm; box-shadow: 0 0 10px rgba(0,0,0,0.2);
                    border-radius: 5px; position: relative; box-sizing: border-box;
                }

                .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${t}; padding-bottom: 10px; margin-bottom: 15px; }
                
                .logo-c { 
                    width:45px; height:45px; background:${t}; color:white; 
                    display:flex; align-items:center; justify-content:center; 
                    font-weight:bold; font-size:24px; border-radius:4px; margin-right:12px; 
                }

                .data-grid { display: grid; grid-template-columns: 1fr 1fr; background: #fdf8f5; padding: 12px; margin-bottom: 15px; border: 1px solid #eee; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: ${t}; color: white; padding: 10px; font-size: 11px; text-transform: uppercase; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }

                .totals-box { width: 280px; margin-left: auto; margin-top: 20px; background: #fdf8f5; padding: 15px; border: 1px solid #eee; border-radius: 4px; }
                
                .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }

                @media print {
                    body { background: white; padding: 0; }
                    .sheet { box-shadow: none; width: 100%; margin: 0; padding: 10mm; }
                    .actions-bar { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="actions-bar">
                <button class="btn-print" onclick="window.print()">🖨️ Imprimir o Guardar PDF</button>
            </div>

            <div class="sheet">
                <div class="header">
                    <div style="display:flex; align-items:center;">
                        <div class="logo-c">C</div>
                        <div>
                            <h2 style="margin:0; color:${t}; font-size:18px;">CREATIVA CORTES CNC</h2>
                            <p style="margin:0; font-size:9px; letter-spacing: 1px;">DISEÑO • CORTE •</p>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <h1 style="margin:0; color:${t}; font-size:18px;">RECIBO DE ABONO #${a}</h1>
                        <p style="margin:0; font-size:11px;">${n}</p>
                    </div>
                </div>

                <div class="data-grid">
                    <div>
                        <strong>CLIENTE:</strong> ${e.cliente}<br>
                        <strong>MÉTODO DE PAGO:</strong> ${e.metodo}
                    </div>
                    <div style="text-align:right;">
                        <strong>NOTA</strong> DE ABONO
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 70%;">Descripción</th>
                            <th style="width: 30%; text-align: right;">Monto Abonado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${e.distribucion.map(r=>`
                            <tr>
                                <td>Abono aplicado a la Venta Folio #${r.id}</td>
                                <td style="text-align: right; font-weight: bold;">$${r.monto.toFixed(2)}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>

                <div class="totals-box">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px;">
                        <span>Monto Recibido:</span> 
                        <span style="font-weight:bold; color:green;">$${e.montoTotal.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:${t}; border-top:2px solid ${t}; margin-top:10px; font-size:16px; padding-top:10px;">
                        <span>SALDO PENDIENTE:</span> 
                        <span>$${e.deudaRestante.toFixed(2)}</span>
                    </div>
                </div>

                <div class="footer">
                    📱 WhatsApp: 985 100 1141 | 📍 Calle 33 x 48 y 46 Candelaria, Valladolid, Yucatán | Creativa Cortes CNC<br>
                    <small style="display:block; margin-top:5px;">Este recibo es un comprobante de abono a cuenta. Conserve para cualquier aclaración.</small>
                </div>
            </div>
        </body>
        </html>
    `),o.document.close()};window.handleViewSaleDetails=async function(e){var t;try{const{data:n,error:a}=await c.from("ventas").select("*").eq("venta_id",parseInt(e)).maybeSingle();if(a)throw a;const[o,r]=await Promise.all([c.from("detalle_ventas").select("*").eq("venta_id",e),c.from("pagos").select("*").eq("venta_id",e)]),d=o.data||[],i=r.data||[];window.currentSaleForPrint={...n,productos:d,pagos:i};const s=document.getElementById("detail-sale-id");s&&(s.textContent=n.venta_id);const l=document.getElementById("detail-client-name");if(l){const m=(t=window.allClients)==null?void 0:t.find(P=>String(P.client_id)===String(n.client_id));l.textContent=m?m.name:"Cliente General"}const u=document.getElementById("detail-sale-date");u&&(u.innerHTML=`
                ${new Date(n.created_at).toLocaleDateString()}
                <button onclick="window.editSaleDate(${n.venta_id}, '${n.created_at}')" class="ml-1 text-blue-500 hover:text-blue-700">
                    <i class="fas fa-edit" style="font-size: 10px;"></i>
                </button>
            `);const w=document.getElementById("detail-payment-method");if(w){const m=n.metodo_pago||"No especificado";w.innerHTML=`
                ${m}
                <button onclick="window.editSalePaymentMethod(${n.venta_id}, '${m}')" class="ml-1 text-blue-500 hover:text-blue-700">
                    <i class="fas fa-edit" style="font-size: 10px;"></i>
                </button>
            `}const f=document.getElementById("detail-sale-description");f&&(f.textContent=n.description||"Sin notas adicionales");const b=document.getElementById("detail-products-body");b&&(b.innerHTML=d.map(m=>`
                <tr class="border-b">
                    <td class="px-4 py-2">${m.name}</td>
                    <td class="px-4 py-2 text-right">${m.quantity}</td>
                    <td class="px-4 py-2 text-right">${y(m.price)}</td>
                    <td class="px-4 py-2 text-right font-bold">${y(m.subtotal)}</td>
                    <td class="px-4 py-2 text-center">
                        <div class="flex justify-center gap-2">
                            <button onclick="window.editItemPrice(${m.detalle_id||m.id}, ${m.price}, ${m.quantity}, ${e})" class="text-blue-500"><i class="fas fa-edit"></i></button>
                            <button onclick="window.deleteItemFromSale(${m.detalle_id||m.id}, ${e})" class="text-red-400"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                </tr>
            `).join(""));const p=document.getElementById("detail-grand-total");p&&(p.textContent=y(n.total_amount));const v=document.getElementById("detail-paid-amount");v&&(v.textContent=y(n.total_amount-(n.saldo_pendiente||0)));const x=document.getElementById("detail-remaining-debt");x&&(x.textContent=y(n.saldo_pendiente||0));const h=document.getElementById("detail-abonos-body");h&&(h.innerHTML=i.length>0?i.map(m=>`
                <tr class="text-xs border-b">
                    <td class="py-2 px-4">${new Date(m.created_at).toLocaleDateString()}</td>
                    <td class="py-2 px-4 font-bold text-green-700">${y(m.amount||m.monto)}</td>
                    <td class="py-2 px-4 uppercase text-gray-600">${m.metodo_pago||"EFECTIVO"}</td>
                </tr>
            `).join(""):'<tr><td colspan="3" class="text-center py-4 text-gray-400">Sin abonos</td></tr>'),window.openModal("modal-detail-sale")}catch(n){console.error("Error crítico en handleViewSaleDetails:",n)}};window.editSaleDate=async function(e,t){const n=new Date(t).toISOString().split("T")[0],a=prompt("Ingrese la nueva fecha (AAAA-MM-DD):",n);if(!(!a||a===n))try{const{error:o}=await c.from("ventas").update({created_at:a}).eq("venta_id",e);if(o)throw o;alert("✅ Fecha actualizada."),window.handleViewSaleDetails(e)}catch{alert("Error al cambiar fecha. Use formato AAAA-MM-DD")}};window.deleteItemFromSale=async function(e,t){if(confirm("¿Estás seguro de eliminar este producto? El total de la venta y el saldo se recalcularán."))try{const{error:n}=await c.from("detalle_ventas").delete().eq("detalle_id",e);if(n)throw n;const{data:a}=await c.from("detalle_ventas").select("subtotal").eq("venta_id",t),o=a.reduce((s,l)=>s+l.subtotal,0),{data:r}=await c.from("pagos").select("amount").eq("venta_id",t),d=r?r.reduce((s,l)=>s+(l.amount||0),0):0,i=o-d;await c.from("ventas").update({total_amount:o,saldo_pendiente:i}).eq("venta_id",t),alert("✅ Producto eliminado y totales actualizados."),window.handleViewSaleDetails(t)}catch(n){console.error(n),alert("Error al eliminar el producto.")}};window.generarPDFVenta=function(){const e=window.currentSaleForPrint;if(!e)return alert("No hay datos para generar el PDF");const t="#8B4513",n=e.productos.map(r=>`
        <tr>
            <td style="width: 60%; text-align: left; padding: 5px; border-bottom: 1px solid #eee;">${r.name}</td>
            <td style="width: 15%; text-align: right; padding: 5px; border-bottom: 1px solid #eee;">${r.quantity}</td>
            <td style="width: 25%; text-align: right; padding: 5px; border-bottom: 1px solid #eee; font-weight: bold;">${y(r.subtotal)}</td>
        </tr>
    `).join(""),a=`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Vista Previa - Nota ${e.venta_id}</title>
            <style>
                @page { size: letter; margin: 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; font-size: 12px; background-color: #f4f4f4; padding: 20px; }
                .sheet { 
                    background: white; 
                    width: 210mm; 
                    min-height: 140mm; 
                    margin: 0 auto; 
                    padding: 15mm; 
                    box-shadow: 0 0 10px rgba(0,0,0,0.2);
                    border-radius: 5px;
                    position: relative;
                }
                .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${t}; padding-bottom: 10px; margin-bottom: 15px; }
                .data-grid { display: grid; grid-template-columns: 1fr 1fr; background: #fdf8f5; padding: 10px; margin-bottom: 15px; border: 1px solid #eee; }
                table { width: 100%; border-collapse: collapse; }
                th { background: ${t}; color: white; padding: 8px; font-size: 11px; text-transform: uppercase; }
                .totals-box { width: 250px; margin-left: auto; margin-top: 20px; background: #fdf8f5; padding: 12px; border: 1px solid #eee; border-radius: 4px; }
                .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
                
                /* Estilos para el botón de acción en pantalla */
                .actions-bar { 
                    max-width: 210mm; 
                    margin: 0 auto 10px auto; 
                    display: flex; 
                    justify-content: flex-end; 
                }
                .btn-print { 
                    background: ${t}; color: white; border: none; padding: 10px 20px; 
                    border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;
                }
                .btn-print:hover { opacity: 0.9; }

                @media print {
                    body { background: white; padding: 0; }
                    .sheet { box-shadow: none; width: 100%; margin: 0; padding: 0; }
                    .actions-bar { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="actions-bar">
                <button class="btn-print" onclick="window.print()">🖨️ Imprimir o Guardar PDF</button>
            </div>

            <div class="sheet">
                <div class="header">
                    <div style="display:flex; align-items:center;">
                        <div style="width:45px; height:45px; background:${t}; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:24px; border-radius:4px; margin-right:12px;">C</div>
                        <div>
                            <h2 style="margin:0; color:${t}; font-size:18px;">CREATIVA CORTES CNC</h2>
                            <p style="margin:0; font-size:9px; letter-spacing: 1px;">DISEÑO • CORTE • PRECISIÓN</p>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <h1 style="margin:0; color:${t}; font-size:18px;">NOTA DE VENTA #${e.venta_id}</h1>
                        <p style="margin:0; font-size:11px;">${new Date(e.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                <div class="data-grid">
                    <div><strong>CLIENTE:</strong> ${document.getElementById("detail-client-name").textContent}</div>
                    <div style="text-align:right;"><strong>ESTADO:</strong> ${e.saldo_pendiente>0?"PENDIENTE":"LIQUIDADO"}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 60%; text-align: left;">Descripción del Producto</th>
                            <th style="width: 15%; text-align: right;">Cant.</th>
                            <th style="width: 25%; text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${n}
                    </tbody>
                </table>

                <div class="totals-box">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Subtotal:</span> <span>${y(e.total_amount)}</span></div>
                    <div style="display:flex; justify-content:space-between; color:green; margin-bottom:4px;"><span>Abonado:</span> <span>${y(e.total_amount-e.saldo_pendiente)}</span></div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:${t}; border-top:2px solid ${t}; margin-top:8px; font-size:15px; padding-top:8px;">
                        <span>SALDO:</span> <span>${y(e.saldo_pendiente)}</span>
                    </div>
                </div>

                <div class="footer">
                    📱 WhatsApp: 985 111 2233 | 📍 Valladolid, Yucatán | Creativa Cortes CNC
                </div>
            </div>
        </body>
        </html>
    `,o=window.open("","_blank");o.document.write(a),o.document.close()};window.verEstadoCuentaCliente=async function(e,t){try{document.getElementById("nombre-cliente-deuda").textContent="Estado de Cuenta: "+t,window.currentClientIdForAbono=e;const[n,a]=await Promise.all([c.from("ventas").select("*").eq("client_id",e).gt("saldo_pendiente",0).order("created_at",{ascending:!0}),c.from("abonos").select("*").eq("client_id",e).order("created_at",{ascending:!1}).limit(10)]),o=n.data||[],r=a.data||[],d=o.reduce((l,u)=>l+(u.saldo_pendiente||0),0);document.getElementById("total-deuda-general").textContent=y(d),document.getElementById("fecha-ultimo-abono").textContent=r.length>0?new Date(r[0].created_at).toLocaleDateString():"Sin pagos";const i=document.getElementById("lista-notas-pendientes");i.innerHTML=o.length>0?o.map(l=>`
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-2 font-bold">#${l.venta_id}</td>
                <td class="px-4 py-2 text-gray-500">${new Date(l.created_at).toLocaleDateString()}</td>
                <td class="px-4 py-2 text-right text-red-600 font-bold">${y(l.saldo_pendiente)}</td>
            </tr>
        `).join(""):'<tr><td colspan="3" class="p-4 text-center text-gray-400">Sin deudas pendientes</td></tr>';const s=document.getElementById("historial-abonos-cliente");s.innerHTML=r.length>0?r.map(l=>`
            <tr class="border-b bg-green-50/30">
                <td class="px-4 py-2 text-xs">${new Date(l.created_at).toLocaleDateString()}</td>
                <td class="px-4 py-2 text-xs text-gray-600">${l.metodo_pago||"Efectivo"}</td>
                <td class="px-4 py-2 text-right font-bold text-green-700">${y(l.monto)}</td>
            </tr>
        `).join(""):'<tr><td colspan="3" class="p-4 text-center text-gray-400">No hay pagos registrados</td></tr>',window.openModal("modal-deudas-cliente")}catch(n){console.error("Error al cargar estado de cuenta:",n),alert("No se pudo cargar la información del cliente.")}};window.registrarAbonoGeneral=async function(){const e=parseFloat(prompt("Ingrese el monto total del abono:"));if(!e||e<=0)return;const t=prompt("Método de pago (Efectivo, Transferencia, Tarjeta):","Efectivo"),n=window.currentClientIdForAbono;let a=e;try{const{data:o,error:r}=await c.from("ventas").select("*").eq("client_id",n).gt("saldo_pendiente",0).order("created_at",{ascending:!0});if(r)throw r;if(o.length===0)return alert("Este cliente no tiene deudas pendientes.");for(let i of o){if(a<=0)break;let s=i.saldo_pendiente,l=0;a>=s?(l=s,a-=s):(l=a,a=0),await c.from("abonos").insert({venta_id:i.venta_id,client_id:n,monto:l,metodo_pago:t,notas:"Abono General en cascada"}),await c.from("ventas").update({saldo_pendiente:s-l}).eq("venta_id",i.venta_id)}alert("✅ Abono procesado con éxito.");const d=document.getElementById("nombre-cliente-deuda").textContent.split(": ")[1];verEstadoCuentaCliente(n,d)}catch(o){console.error("Error en cascada:",o),alert("Hubo un error al procesar el abono.")}};window.generarPDFEstadoCuenta=function(){const e=window.currentClientDataForPrint;if(!e||!e.transaccionesHTML)return alert("No hay datos cargados. Por favor, abre el reporte del cliente primero.");const t="#8B4513",n=`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Estado de Cuenta - ${e.nombre}</title>
            <style>
                @page { size: letter; margin: 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.4; margin: 0; background-color: #f0f0f0; padding: 20px; }
                .sheet { background: white; max-width: 210mm; margin: 0 auto; padding: 20px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px; }
                .header { border-bottom: 3px solid ${t}; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                .resumen { background: #fdf8f5; border: 1px solid ${t}44; padding: 20px; border-radius: 8px; margin-bottom: 25px; display: flex; justify-content: space-between; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #f4f4f4; color: #444; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; text-transform: uppercase; font-size: 11px; }
                td { padding: 10px; border-bottom: 1px solid #eee; }
                .text-right { text-align: right; }
                .text-red { color: #dc2626 !important; font-weight: bold; }
                .text-green { color: #16a34a !important; font-weight: bold; }
                .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
                .actions-bar { max-width: 210mm; margin: 0 auto 10px; display: flex; justify-content: flex-end; }
                .btn-pdf { background: ${t}; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                @media print {
                    body { background: white; padding: 0; }
                    .sheet { box-shadow: none; max-width: 100%; margin: 0; padding: 0; }
                    .actions-bar { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="actions-bar">
                <button class="btn-pdf" onclick="window.print()">📥 Guardar como PDF / Imprimir</button>
            </div>
            <div class="sheet">
                <div class="header">
                    <div>
                        <h1 style="margin:0; color:${t}; font-size: 26px;">CREATIVA CORTES CNC</h1>
                        <p style="margin:0; font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #666;">ESTADO DE CUENTA DETALLADO</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin:0; font-size: 11px; color: #888;">FECHA DE EMISIÓN</p>
                        <p style="margin:0; font-weight: bold; font-size: 14px;">${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="resumen">
                    <div>
                        <p style="margin:0; font-size: 11px; color: #888;">DATOS DEL CLIENTE</p>
                        <p style="margin:0; font-size: 20px; font-weight: bold; color: #222;">${e.nombre.toUpperCase()}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin:0; font-size: 11px; color: #888;">SALDO TOTAL A LA FECHA</p>
                        <p style="margin:0; font-size: 28px; font-weight: 900; color: ${t};">${y(e.totalDeuda)}</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">FECHA</th>
                            <th style="width: 50%;">DESCRIPCIÓN DE MOVIMIENTO</th>
                            <th style="width: 17%; text-align: right;">CARGO/ABONO</th>
                            <th style="width: 18%; text-align: right;">SALDO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${e.transaccionesHTML.replace(/text-red-600/g,"text-red").replace(/text-green-600/g,"text-green")}
                    </tbody>
                </table>
                <div class="footer">
                    <strong>Creativa Cortes CNC</strong> | Valladolid, Yucatán<br>
                    <span style="font-size: 9px; margin-top: 10px; display: block;">Documento informativo de saldos y movimientos.</span>
                </div>
            </div>
        </body>
        </html>
    `,a=window.open("","_blank");a&&(a.document.write(n),a.document.close())};window.editSalePaymentMethod=async function(e,t){const n=prompt("Ingrese el nuevo método de pago (Efectivo, Transferencia, Tarjeta, etc.):",t);if(!(n===null||n.trim()===""))try{const{error:a}=await c.from("ventas").update({metodo_pago:n.toUpperCase()}).eq("venta_id",e);if(a)throw a;alert("✅ Método de pago actualizado."),window.handleViewSaleDetails(e)}catch{alert("Error al actualizar el método de pago.")}};window.editItemPrice=async function(e,t,n,a){const o=prompt("Ingrese el nuevo precio unitario:",t);if(o===null||o===""||isNaN(o))return;const r=parseFloat(o),d=r*n;try{const{error:i}=await c.from("detalle_ventas").update({price:r,subtotal:d}).eq("detalle_id",e);if(i)throw i;const{data:s}=await c.from("detalle_ventas").select("subtotal").eq("venta_id",a),l=s.reduce((p,v)=>p+v.subtotal,0),{data:u}=await c.from("pagos").select("amount").eq("venta_id",a),w=u?u.reduce((p,v)=>p+(v.amount||0),0):0,f=l-w,{error:b}=await c.from("ventas").update({total_amount:l,saldo_pendiente:f}).eq("venta_id",a);if(b)throw b;alert("✅ Precio y saldo actualizados."),typeof window.handleViewSaleDetails=="function"&&window.handleViewSaleDetails(a),window.loadDashboardData&&window.loadDashboardData()}catch(i){console.error("Error al actualizar:",i),alert("No se pudo actualizar el precio.")}};window.handleAbonoClientSubmit=async function(e){var o,r;if(e.preventDefault(),!c){console.error("Supabase no está inicializado."),alert("Error de configuración.");return}const t=e.target;(o=document.getElementById("abono-client-id"))==null||o.value;const n=parseFloat(t.elements["abono-amount"].value),a=t.elements["payment-method-abono"].value.trim();if(isNaN(n)||n<=0){alert("Ingrese un monto de abono válido y mayor a cero.");return}if(!a||a===""){alert("¡Debe seleccionar un método de pago!"),(r=document.getElementById("payment-method-abono"))==null||r.focus();return}try{const{data:d,error:i}=await c.from("ventas").select("total_amount, paid_amount, saldo_pendiente, client_id").eq("venta_id",ventaId).single();if(i||!d)throw new Error("Venta no encontrada.");const s=d.saldo_pendiente;if(n>s){alert(`El abono (${y(n)}) es mayor que la deuda pendiente (${y(s)}). Ajuste el monto.`);return}const l=d.paid_amount+n,u=s-n,w=d.client_id,{error:f}=await c.from("pagos").insert([{venta_id:ventaId,client_id:w,amount:n,metodo_pago:a,type:"abono"}]);if(f)throw new Error("Error al registrar el pago: "+f.message);const{error:b}=await c.from("ventas").update({paid_amount:l,saldo_pendiente:u}).eq("venta_id",ventaId);if(b)throw new Error("Error al actualizar la venta: "+b.message);alert(`Abono de ${y(n)} registrado con éxito. Deuda restante: ${y(u)}.`),t.reset(),closeModal("abono-client-modal"),await L(),handleViewSaleDetails(ventaId,w)}catch(d){console.error("Error al registrar abono:",d),alert("Fallo al registrar el abono: "+d.message)}};document.addEventListener("DOMContentLoaded",()=>{const e=document.getElementById("edit-sale-price-form");e&&e.addEventListener("submit",handlePriceEditSubmit)});window.handleFilterSales=function(){var r,d,i;const e=(r=document.getElementById("filter-start-date"))==null?void 0:r.value,t=(d=document.getElementById("filter-end-date"))==null?void 0:d.value,n=((i=document.getElementById("filter-search-term"))==null?void 0:i.value.toLowerCase().trim())||"";let o=(window.allSales||[]).filter(s=>{let l=!0;const u=s.sale_date;e&&u<e&&(l=!1),t&&u>t&&(l=!1);let w=!0;if(n.length>0){const f=(s.client_name||"").toLowerCase(),b=String(s.venta_id);!f.includes(n)&&!b.includes(n)&&(w=!1)}return l&&w});window.renderSalesTable(o),console.log(`Filtro aplicado. Mostrando ${o.length} ventas.`)};window.handleFilterSales=window.handleFilterSales;window.renderSalesTable=function(e){const t=document.getElementById("sales-table-body");if(t){if(t.innerHTML="",e.length===0){t.innerHTML='<tr><td colspan="8" class="text-center py-4 text-gray-500">No se encontraron ventas para estos criterios.</td></tr>';return}e.forEach(n=>{const a=document.createElement("tr");a.className="hover:bg-gray-50";const o=n.saldo_pendiente<=0,r=o?"text-green-600 font-medium":"text-red-600 font-bold",d=o?"Liquidada":"Pendiente";a.innerHTML=`
            <td class="px-3 py-2 text-sm text-gray-900">${n.venta_id}</td>
            <td class="px-3 py-2 text-sm text-gray-500">${n.sale_date||"N/A"}</td> 
            <td class="px-3 py-2 text-sm font-medium">${n.client_name||"Consumidor Final"}</td>
            <td class="px-3 py-2 text-sm text-right">${window.formatCurrency(n.total_amount)}</td>
            <td class="px-3 py-2 text-sm text-right ${r}">${window.formatCurrency(n.saldo_pendiente)}</td>
            <td class="px-3 py-2 text-sm ${r}">${d}</td>
            <td class="px-3 py-2 text-right">
                <button onclick="window.openSaleDetailModal(${n.venta_id})" class="text-indigo-600 hover:text-indigo-900">Detalles</button>
                ${o?"":`<button onclick="window.openPaymentModal(${n.venta_id}, ${n.saldo_pendiente}, ${n.client_id})" class="text-green-600 hover:text-green-800 ml-2">Abonar</button>`}
            </td>
        `,t.appendChild(a)})}};window.renderSalesTable=renderSalesTable;window.loadSalesData=async function(){if(console.log("Cargando datos de ventas..."),!c){console.error("Supabase no inicializado en loadSalesData."),window.allSales=[];return}try{const{data:e,error:t}=await c.from("ventas").select(`
                venta_id, 
                created_at,        
                total_amount,      
                saldo_pendiente,   
                client_id,         
                clientes ( name )  
            `);if(t)throw t;window.allSales=(e||[]).map(n=>({...n,sale_date:n.created_at?n.created_at.substring(0,10):"N/A",client_name:n.clientes?n.clientes.name:"Consumidor Final"})),console.log(`✅ ${window.allSales.length} ventas cargadas en ámbito global.`)}catch(e){console.error("Error al cargar datos de ventas:",e),window.allSales=[],alert("Fallo al cargar la lista de ventas.")}return window.allSales};window.loadSalesData=loadSalesData;window.handlePriceEditSubmit=async function(e){e.preventDefault();const n=e.target.querySelector('button[type="submit"]'),a=document.getElementById("edit-sale-transaction-id").value,o=document.getElementById("edit-sale-detail-id").value,r=parseFloat(document.getElementById("edit-new-price").value);if(!a||!o||isNaN(r)){alert("⚠️ Datos incompletos.");return}n.disabled=!0,n.textContent="Procesando...";try{const{data:d,error:i}=await c.from("detalles_ventas").select("quantity").eq("id",o).single();if(i)throw new Error("No se pudo obtener la cantidad del producto.");const{data:s,error:l}=await c.from("pagos").select("amount").eq("venta_id",a),u=s?s.reduce((x,h)=>x+h.amount,0):0,w=r*d.quantity,f=w,b=Math.max(0,f-u),{error:p}=await c.from("detalles_ventas").update({unit_price:r,subtotal:w}).eq("id",o);if(p)throw p;const{error:v}=await c.from("ventas").update({total_amount:f,saldo_pendiente:b}).eq("venta_id",a);if(v)throw v;alert(`✅ Éxito. Nuevo Total: ${y(f)}. Saldo actual: ${y(b)}`),document.getElementById("price-edit-section").classList.add("hidden"),await window.handleViewSaleDetails(a),window.loadClientsTable&&window.loadClientsTable("gestion")}catch(d){console.error("Error:",d),alert("Error al actualizar: "+d.message)}finally{n.disabled=!1,n.textContent="Actualizar Precio y Saldo"}};window.loadProductsTable=function(){var n,a;const e=document.getElementById("products-table-body");if(!e)return;e.innerHTML="";const t=window.allProducts||[];if(t.length===0){(n=document.getElementById("no-products-message"))==null||n.classList.remove("hidden");return}(a=document.getElementById("no-products-message"))==null||a.classList.add("hidden"),t.forEach(o=>{const r=document.createElement("tr");r.className="group hover:bg-white/[0.03] transition-all duration-300 border-b border-white/5";const d=y(o.price);let i="",s="",l="";switch(o.type){case"MAIN":i="glass-badge-success",s="Principal",l="fa-star";break;case"PACKAGE":i="glass-badge-warning",s="Subproducto",l="fa-box-open";break;case"SERVICE":i="glass-badge-info",s="Servicio",l="fa-tools";break;default:i="glass-badge-secondary",s=o.type||"General",l="fa-tag"}r.innerHTML=`
            <td class="px-8 py-5 whitespace-nowrap">
                <div class="font-mono bg-white/5 text-white/40 px-2 py-1 rounded border border-white/10 text-[10px] inline-block">
                    #${o.producto_id}
                </div>
            </td>
            
            <td class="px-8 py-5 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-500/20 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <i class="fas ${l} text-orange-500 text-sm"></i>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-white tracking-wide">${o.name}</div>
                        <div class="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Producto Registrado</div>
                    </div>
                </div>
            </td>
            
            <td class="px-8 py-5 whitespace-nowrap">
                <div class="text-lg font-black text-emerald-500 tracking-tighter">
                    ${d}
                </div>
            </td>
            
            <td class="px-8 py-5 whitespace-nowrap">
                <div class="glass-badge ${i}">
                    <span class="text-[10px] font-black uppercase tracking-widest">
                        <i class="fas ${l} mr-1.5 opacity-70"></i>${s}
                    </span>
                </div>
            </td>
            
            <td class="px-8 py-5 whitespace-nowrap text-right">
                <div class="flex justify-end items-center space-x-2 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button 
                        onclick="window.handleEditProductClick(${o.producto_id})" 
                        class="p-2.5 text-white/60 hover:text-orange-500 hover:bg-orange-500/10 rounded-xl transition-all border border-transparent hover:border-orange-500/20"
                        title="Editar Producto">
                        <i class="fas fa-pen text-xs"></i>
                    </button>
                    
                    <button 
                        onclick="window.handleDeleteProductClick(${o.producto_id})" 
                        class="p-2.5 text-white/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                        title="Eliminar Producto">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            </td>
        `,e.appendChild(r)})};window.loadProductsTable=loadProductsTable;function oe(e){if(!e)return;document.getElementById("edit-product-id").value=e.producto_id,document.getElementById("edit-product-name").value=e.name||"",document.getElementById("edit-product-price").value=e.price||0;const t=document.getElementById("edit-product-category");e.type==="PACKAGE"||e.type==="Paquete"?t.value="Paquete":e.type==="SERVICE"||e.type==="Servicio"?t.value="Servicio":t.value="Producto";const n=document.getElementById("edit-product-parent-container"),a=document.getElementById("edit-product-parent");t.value==="Paquete"?(n.classList.remove("hidden"),window.populateParentSelect("edit-product-parent",e.producto_id),a.value=e.parent_product||""):n.classList.add("hidden")}window.loadMainProductsAndPopulateSelect=async function(){const e=document.getElementById("new-product-parent-select");if(!e)return;const n=(window.allProducts||[]).filter(o=>o.type==="MAIN");console.warn(`DEBUG: La función LOCAL devolvió ${n.length} productos MAIN.`),e.innerHTML="";const a=document.createElement("option");a.value="",a.textContent=n.length>0?"--- Seleccione el Producto Principal ---":"--- (NO HAY PRODUCTOS MAIN REGISTRADOS) ---",a.setAttribute("disabled","disabled"),a.setAttribute("selected","selected"),e.appendChild(a),n.forEach(o=>{const r=document.createElement("option");r.value=o.producto_id,r.textContent=o.name,e.appendChild(r)})};function z(){const e=document.getElementById("new-product-type"),t=document.getElementById("parent-product-container"),n=document.getElementById("parent-product-select");!e||!t||!n||(e.value==="PACKAGE"?(t.classList.remove("hidden"),t.classList.add("block"),n.setAttribute("required","required")):(t.classList.add("hidden"),t.classList.remove("block"),n.removeAttribute("required"),n.value=""))}window.populateParentSelect=function(e,t=null){const n=document.getElementById(e);if(!n)return;n.innerHTML='<option value="">-- Seleccione Producto Principal --</option>',window.allProducts.filter(o=>String(o.producto_id)!==String(t)&&o.type!=="PACKAGE").forEach(o=>{const r=document.createElement("option");r.value=o.producto_id,r.textContent=`${o.name} (ID: ${o.producto_id})`,n.appendChild(r)})};window.handleUpdateProduct=async function(e){e.preventDefault();const t=document.getElementById("edit-product-id").value,n=document.getElementById("edit-product-name").value,a=parseFloat(document.getElementById("edit-product-price").value),o=document.getElementById("edit-product-category").value;let r="PRODUCT";o==="Servicio"&&(r="SERVICE"),o==="Paquete"&&(r="PACKAGE");let d=null;r==="PACKAGE"&&(d=document.getElementById("edit-product-parent").value||null);try{const{error:i}=await c.from("productos").update({name:n,price:a,type:r,parent_product:d}).eq("producto_id",t);if(i)throw i;alert("✅ Producto actualizado correctamente"),closeModal("edit-product-modal"),typeof loadAndRenderProducts=="function"&&await loadAndRenderProducts()}catch(i){console.error("Error:",i),alert("No se pudo actualizar: "+i.message)}};async function ae(e){if(e.preventDefault(),!c){console.error("Supabase no inicializado");return}const t=document.getElementById("btn-register-product"),n=t.querySelector(".icon-default"),a=t.querySelector(".icon-loading"),o=t.querySelector(".btn-text"),r=document.getElementById("new-product-name"),d=document.getElementById("new-product-type"),i=document.getElementById("new-product-price"),s=document.getElementById("new-product-parent-select"),l=r.value.trim(),u=d.value,w=parseFloat(i.value);let f=null;if(isNaN(w)||w<0){alert("Por favor, ingresa un precio válido.");return}if(u==="PACKAGE"&&(f=(s==null?void 0:s.value)||null,!f)){alert("Los subproductos requieren un Producto Principal.");return}t.disabled=!0,t.classList.add("opacity-80","cursor-not-allowed"),n.classList.add("hidden"),a.classList.remove("hidden"),o.textContent="Registrando...";try{const{error:b}=await c.from("productos").insert([{name:l,type:u,price:w,parent_product:f}]);if(b)throw b;console.log("Producto registrado con éxito"),document.getElementById("new-product-form").reset(),window.handleProductTypeChange("new"),closeModal("new-product-modal"),window.loadAndRenderProducts&&await window.loadAndRenderProducts()}catch(b){console.error("Error al registrar:",b.message),alert("No se pudo registrar el producto: "+b.message)}finally{t.disabled=!1,t.classList.remove("opacity-80","cursor-not-allowed"),n.classList.remove("hidden"),a.classList.add("hidden"),o.textContent="Finalizar Registro"}}window.handleProductTypeChange=function(e="new"){const t=document.getElementById(`${e}-product-type`)||document.getElementById(`${e}-product-category`),n=document.getElementById(`${e}-product-parent-container`),a=document.getElementById(`${e}-product-parent-select`)||document.getElementById(`${e}-product-parent`),o=document.getElementById(`${e}-product-placeholder`);if(!t||!n||!a)return;if(t.value==="PACKAGE"||t.value==="Paquete")n.classList.remove("hidden"),a.setAttribute("required","required"),o&&o.classList.add("hidden"),n.animate([{opacity:0,transform:"translateY(-10px)"},{opacity:1,transform:"translateY(0)"}],{duration:250,easing:"ease-out"});else{const d=n.animate([{opacity:1,transform:"translateY(0)"},{opacity:0,transform:"translateY(-5px)"}],{duration:150,easing:"ease-in"});d.onfinish=()=>{n.classList.add("hidden"),a.removeAttribute("required"),a.value="",o&&o.classList.remove("hidden")}}};window.handleEditProductClick=function(e){console.log("ID recibida del botón:",typeof e,e);const t=window.allProductsMap[String(e)];console.log("Producto encontrado en el mapa:",t),t?(window.editingProductId=e,oe(t),openModal("edit-product-modal")):(console.error("No se encontró el producto en el mapa global."),alert("Error al cargar los datos del producto."))};window.handleDeleteProductClick=function(e){window.productIdToDelete=e;const t=window.allProductsMap[String(e)];if(!t)return;const n=(window.allProducts||[]).filter(r=>String(r.parent_product)===String(e)),a=document.getElementById("delete-product-name-placeholder"),o=document.getElementById("delete-product-warning");a&&(a.textContent=t.name),o&&(n.length>0?(o.innerHTML=`
                <div class="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
                    <i class="fas fa-exclamation-triangle text-orange-500 mt-1"></i>
                    <p class="text-[11px] text-orange-200 leading-tight">
                        <strong class="block mb-1">¡Atención!</strong>
                        Este producto es "Padre" de <b>${n.length} subproductos</b>. 
                        Si lo eliminas, los subproductos quedarán huérfanos.
                    </p>
                </div>`,o.classList.remove("hidden")):o.classList.add("hidden")),openModal("delete-product-modal")};async function re(){if(!c){console.error("Supabase no está inicializado.");return}const e=document.getElementById("debts-table-body"),t=document.getElementById("no-debts-message");if(!(!e||!t)){e.innerHTML='<tr><td colspan="4" class="text-center py-4 text-gray-500">Cargando deudas...</td></tr>',t.classList.add("hidden");try{const{data:n,error:a}=await c.from("ventas").select(`
                venta_id, 
                client_id, 
                created_at, 
                saldo_pendiente,
                clientes(name) 
            `).gt("saldo_pendiente",.01).order("created_at",{ascending:!1});if(a)throw a;const o={};(n||[]).forEach(i=>{var l;const s=i.client_id;o[s]||(o[s]={clientId:s,name:((l=i.clientes)==null?void 0:l.name)||"Cliente Desconocido",totalDebt:0,lastSaleDate:i.created_at,lastSaleId:i.venta_id}),o[s].totalDebt+=i.saldo_pendiente});const r=Object.values(o);if(e.innerHTML="",r.length===0){t.classList.remove("hidden");return}let d=[];r.forEach(i=>{const s=Y(i.lastSaleDate);d.push(`
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${i.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-lg font-extrabold text-red-600">${y(i.totalDebt)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${s}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                            onclick="window.handleViewClientDebt(${i.clientId})" 
                            class="text-indigo-600 hover:text-indigo-900 font-medium text-xs py-1 px-2 rounded bg-indigo-100"
                            title="Ver historial completo de cargos y abonos"
                        >
                            Ver Historial (${y(i.totalDebt)})
                        </button>
                    </td>
                </tr>
            `)}),e.innerHTML=d.join("")}catch(n){console.error("Error al cargar la tabla de deudas:",n),e.innerHTML='<tr><td colspan="4" class="text-center py-4 text-red-600">Error al cargar datos de deudas.</td></tr>'}}}window.loadClientsTable=async function(e="gestion"){if(!c){console.error("Supabase no está inicializado.");return}const t=document.getElementById("clients-list-body");if(!t)return;const n=e==="gestion";try{const{data:a,error:o}=await c.from("clientes").select("client_id, name, telefono").order("name",{ascending:!0});if(o)throw o;window.allClients=a,window.allClientsMap={},a.forEach(i=>{window.allClientsMap[i.client_id]=i});const r=a.map(i=>getClientSalesSummary(i.client_id)),d=await Promise.all(r);if(t.innerHTML="",a.length===0){t.innerHTML='<tr><td colspan="6" class="px-4 py-12 text-center text-white/20 italic tracking-widest uppercase text-[10px]">No hay clientes registrados</td></tr>';return}a.forEach((i,s)=>{const l=d[s],u=document.createElement("tr");u.className="group hover:bg-white/[0.03] transition-all duration-300 border-b border-white/5";const w=l.deudaNeta,f=w>.01;let b="";n&&(b=`
                    <td class="px-6 py-5 whitespace-nowrap text-right">
                        <div class="flex justify-end items-center space-x-1 opacity-30 group-hover:opacity-100 transition-all duration-300">
                            <button type="button" class="edit-client-btn p-2.5 text-white/60 hover:text-orange-500 hover:bg-orange-500/10 rounded-xl transition-all" 
                                    data-id="${i.client_id}" title="Editar Perfil">
                                <i class="fas fa-edit text-xs"></i>
                            </button>
                            <button type="button" class="abono-btn p-2.5 text-white/60 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all" 
                                    onclick="window.handleAbonoClick(${i.client_id})" title="Registrar Abono">
                                <i class="fas fa-hand-holding-usd text-xs"></i>
                            </button>
                            <button type="button" class="view-debt-btn p-2.5 text-white/60 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all" 
                                    data-id="${i.client_id}" title="Estado de Cuenta">
                                <i class="fas fa-file-invoice-dollar text-xs"></i>
                            </button>
                            <button type="button" class="delete-client-btn p-2.5 text-white/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all" 
                                    data-id="${i.client_id}" data-name="${i.name}" title="Eliminar Cliente">
                                <i class="fas fa-trash-alt text-xs"></i>
                            </button>
                        </div>
                    </td>
                `),u.innerHTML=`
                <td class="px-6 py-5 whitespace-nowrap">
                    <span class="font-mono text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded text-[10px]">#${i.client_id}</span>
                </td>
                <td class="px-6 py-5 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 text-white flex items-center justify-center font-black text-xs mr-4 group-hover:scale-110 transition-transform">
                            ${i.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="text-sm font-bold text-white tracking-wide">${i.name}</div>
                            <div class="text-[10px] text-white/30 flex items-center mt-1">
                                <i class="fas fa-phone-alt mr-2 text-[8px]"></i>
                                ${i.telefono||"Sin teléfono"}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-5 whitespace-nowrap">
                    <div class="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Total Consumo</div>
                    <div class="text-sm font-medium text-white/70 font-mono">${y(l.totalVentas)}</div>
                </td>
                <td class="px-6 py-5 whitespace-nowrap">
                    <div class="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Estado de Cuenta</div>
                    <div class="glass-badge ${f?"glass-badge-danger":"glass-badge-success"}">
                        <span class="h-1.5 w-1.5 rounded-full ${f?"bg-red-500 animate-pulse":"bg-emerald-500"} mr-2"></span>
                        <span class="font-mono">${y(w)}</span>
                    </div>
                </td>
                ${b} 
            `,t.appendChild(u)}),n&&(t.querySelectorAll(".edit-client-btn").forEach(i=>{i.onclick=()=>window.handleEditClientClick(i.dataset.id)}),t.querySelectorAll(".view-debt-btn").forEach(i=>{i.onclick=()=>window.handleViewClientDebt(i.dataset.id)}),t.querySelectorAll(".delete-client-btn").forEach(i=>{i.onclick=()=>window.handleDeleteClientClick(i.dataset.id,i.dataset.name)}))}catch(a){console.error("Error al cargar tabla de clientes:",a)}};window.handleDeleteClientClick=function(e){window.clientIdToDelete=String(e);const t=window.allClientsMap[window.clientIdToDelete],n=document.getElementById("delete-client-name-placeholder");if(n&&t)n.textContent=t.name;else{console.error("Error: Cliente no encontrado en el mapa global.",e);const a=window.allClients.find(o=>String(o.client_id)===String(e));a&&n&&(n.textContent=a.name)}openModal("delete-client-modal")};window.handleNewClient=async function(e){var a,o,r;e.preventDefault(),console.log("1. FUNCIÓN DE REGISTRO INICIADA.");const t=(a=document.getElementById("new-client-name"))==null?void 0:a.value.trim(),n=((o=document.getElementById("new-client-phone"))==null?void 0:o.value.trim())||null;if(console.log(`2. Datos capturados: Nombre='${t}', Teléfono='${n}'.`),typeof c>"u"||!c){console.error('ERROR CRÍTICO: La variable "supabase" no está definida o accesible globalmente.'),alert("Error: La conexión a la base de datos no está disponible.");return}if(!t||t.length<3){console.warn("Registro cancelado: Nombre inválido."),alert("Por favor, ingresa un nombre válido para el cliente."),(r=document.getElementById("new-client-name"))==null||r.focus();return}try{const{error:d}=await c.from("clientes").insert([{name:t,telefono:n,is_active:!0}]);if(d)console.error("4. ERROR DE SUPABASE al registrar cliente:",d),alert("Error al registrar cliente: "+d.message);else{alert("Cliente registrado exitosamente."),typeof window.loadClientsTable=="function"?await window.loadClientsTable("gestion"):console.error("ERROR: window.loadClientsTable no está definida para la recarga.");const i=document.getElementById("new-client-form");i==null||i.reset(),typeof closeModal=="function"?closeModal("new-client-modal"):console.error("closeModal no está definida globalmente.")}}catch(d){console.error("5. ERROR DE RED o EXCEPCIÓN AL REGISTRAR:",d),alert("Error desconocido al registrar cliente. Verifique la conexión a Supabase.")}};window.handleEditClientClick=function(e){console.log("Editando cliente ID:",e);let t=window.allClientsMap?window.allClientsMap[String(e)]:null;if(!t&&window.allClients&&(t=window.allClients.find(r=>String(r.client_id)===String(e))),!t){alert("Error: Cliente no encontrado para editar (ID: "+e+")");return}const n=document.getElementById("edit-client-id"),a=document.getElementById("edit-client-name"),o=document.getElementById("edit-client-phone");n&&(n.value=t.client_id),a&&(a.value=t.name||""),o&&(o.value=t.telefono||""),openModal("edit-client-modal")};async function ie(e){e.preventDefault();const t=document.getElementById("edit-client-id").value,n=document.getElementById("edit-client-name").value.trim(),a=document.getElementById("edit-client-phone").value.trim();if(!t){alert("Error de Edición: No se pudo obtener la ID del cliente.");return}const{error:o}=await c.from("clientes").update({name:n,telefono:a}).eq("client_id",t);o?(console.error("Error al actualizar cliente:",o),alert("Error al actualizar cliente: "+o.message)):(alert("Cliente actualizado exitosamente."),await L(),document.getElementById("edit-client-form").reset(),closeModal("edit-client-modal"))}window.handleRegisterPayment=async function(e){var i,s,l,u;e&&(e.preventDefault(),e.stopPropagation());const t=(i=document.getElementById("abono-client-id"))==null?void 0:i.value,n=(s=document.getElementById("abono-amount"))==null?void 0:s.value,a=(l=document.getElementById("payment-method-abono"))==null?void 0:l.value,o=parseFloat(n),r=((u=document.getElementById("abono-client-name-display"))==null?void 0:u.textContent)||"Cliente";if(!t||isNaN(o)||o<=0||!a){alert("⚠️ Por favor completa todos los campos correctamente.");return}const d=document.getElementById("btn-confirm-abono");try{d&&(d.disabled=!0,d.innerText="PROCESANDO...");const{data:w,error:f}=await c.from("ventas").select("venta_id, saldo_pendiente, paid_amount").eq("client_id",t).gt("saldo_pendiente",0).order("created_at",{ascending:!0});if(f)throw f;let b=o,p=[];for(let h of w){if(b<=0)break;let m=Math.min(b,h.saldo_pendiente);await c.from("pagos").insert([{venta_id:h.venta_id,client_id:t,amount:m,metodo_pago:a}]),await c.from("ventas").update({saldo_pendiente:h.saldo_pendiente-m,paid_amount:(h.paid_amount||0)+m}).eq("venta_id",h.venta_id),p.push({id:h.id||h.venta_id,monto:m}),b-=m}const{data:v}=await c.from("ventas").select("saldo_pendiente").eq("client_id",t),x=v.reduce((h,m)=>h+(m.saldo_pendiente||0),0);await c.from("clientes").update({deuda_total:x}).eq("client_id",t),confirm(`✅ Pago de $${o} registrado. ¿Generar comprobante PDF?`)&&window.generarComprobanteAbono({cliente:r,montoTotal:o,metodo:a,distribucion:p,deudaRestante:x}),closeModal("abono-client-modal"),typeof window.loadDebts=="function"&&await window.loadDebts(),typeof window.loadDashboardData=="function"&&await window.loadDashboardData()}catch(w){console.error(w),alert("Error al procesar abono")}finally{d&&(d.disabled=!1,d.innerText="Confirmar Pago en Cascada")}};window.openAbonoModal=function(e,t,n=null){var l;window.debtToPayId=e;const a=window.allClientsMap[e]!==void 0,o=document.getElementById("abono-client-id-input"),r=document.getElementById("abono-client-name-display"),d=document.getElementById("abono-debt-info-container"),i=document.getElementById("abono-current-debt"),s=document.querySelector("#modal-record-abono h3");if(o&&(o.value=e),r){let u=a?`Deuda General de: ${t}`:`Venta #${e} de ${t}`;r.textContent=u}s&&(s.textContent=a?"Registrar Abono General":"Registrar Pago a Venta Específica"),n!==null&&n>0?(d&&d.classList.remove("hidden"),i&&(i.textContent=y(n))):d&&d.classList.add("hidden"),(l=document.getElementById("abono-client-form"))==null||l.reset(),openModal("modal-record-abono")};async function de(e){if(e.preventDefault(),!c){console.error("Supabase no está inicializado.");return}const t=document.getElementById("abono-amount-sale");document.getElementById("payment-method-sale").value,document.getElementById("payment-sale-id").value;let n=t?t.valueAsNumber:0;if(isNaN(n)){const a=t.value.replace(",",".");n=parseFloat(a)||0}{alert("Por favor, ingresa un monto de abono válido y asegúrate de que la venta y el cliente estén cargados.");return}}window.handleViewAction=async function(e,t,n){e.classList.add("btn-loading");try{await handleViewSaleDetails(t,n)}finally{e.classList.remove("btn-loading")}};window.handleDeleteAction=async function(e,t,n,a){handleDeleteSale(t,n,a)};window.loadMonthlySalesReport=function(e,t){(async()=>{if(!c){console.error("Supabase no está inicializado.");return}const n=document.getElementById("monthly-sales-report-body"),a=document.getElementById("report-total-sales"),o=document.getElementById("report-total-debt-generated"),r=document.getElementById("monthly-report-no-data");if(!(!n||!a||!o||!r)){n.innerHTML=`
            <tr>
                <td colspan="5" class="px-6 py-16 text-center">
                    <div class="flex flex-col justify-center items-center space-y-3">
                        <i class="fas fa-circle-notch animate-spin text-orange-500 text-2xl"></i>
                        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Sincronizando Reportes Globales</span>
                    </div>
                </td>
            </tr>`;try{const d=new Date().getMonth()+1,i=new Date().getFullYear();let s=e>=1&&e<=12?e:d,l=t>=2e3?t:i,u=new Date(Date.UTC(l,s-1,1)),w=new Date(Date.UTC(l,s,1));const{data:f,error:b}=await c.from("ventas").select("venta_id, client_id, created_at, total_amount, saldo_pendiente, metodo_pago, clientes(name)").gte("created_at",u.toISOString()).lt("created_at",w.toISOString()).order("created_at",{ascending:!1});if(b)throw b;let p=0,v=0;n.innerHTML="",f&&f.length>0?(f.forEach(x=>{var $;p+=x.total_amount,v+=x.saldo_pendiente;const h=(($=x.clientes)==null?void 0:$.name)||"Cliente Final",m=new Date(x.created_at),P=m.toLocaleDateString("es-MX",{day:"2-digit",month:"short"}),C=m.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}),S=x.saldo_pendiente>.01,T=`
                        <tr class="group hover:bg-white/[0.03] transition-all duration-300 border-b border-white/5">
                            <td class="px-8 py-5 whitespace-nowrap">
                                <div class="font-mono text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] inline-block mb-1">
                                    #${x.venta_id}
                                </div>
                                <div class="text-[9px] text-white/30 uppercase tracking-widest font-bold">${P} • ${C}</div>
                            </td>
                            <td class="px-8 py-5 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/10 text-white flex items-center justify-center text-[10px] font-black mr-3 group-hover:border-orange-500/30 transition-colors">
                                        ${h.charAt(0).toUpperCase()}
                                    </div>
                                    <div class="text-sm font-bold text-white/90 tracking-wide">${h}</div>
                                </div>
                            </td>
                            <td class="px-8 py-5 whitespace-nowrap text-right">
                                <div class="text-sm font-black text-white font-mono">${y(x.total_amount)}</div>
                                <div class="text-[9px] text-white/20 uppercase tracking-[0.1em] mt-0.5">${x.metodo_pago}</div>
                            </td>
                            <td class="px-8 py-5 whitespace-nowrap text-right">
                                <div class="glass-badge ${S?"glass-badge-danger":"glass-badge-success"} inline-flex items-center">
                                    <span class="h-1 w-1 rounded-full ${S?"bg-red-500 animate-pulse":"bg-emerald-500"} mr-2"></span>
                                    <span class="font-mono text-[11px]">${y(x.saldo_pendiente)}</span>
                                </div>
                            </td>
                            <td class="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                                <div class="flex justify-end space-x-2 opacity-20 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                    <button onclick="handleViewAction(this, '${x.venta_id}', '${x.client_id}')" 
                                            class="p-2 text-white/60 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all border border-transparent hover:border-blue-400/20" title="Ver Detalles">
                                        <i class="fas fa-eye text-xs"></i>
                                    </button>
                                    <button onclick="handleDeleteAction(this, '${x.venta_id}', ${s}, ${l})" 
                                            class="p-2 text-white/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20" title="Anular Venta">
                                        <i class="fas fa-trash-alt text-xs"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>`;n.insertAdjacentHTML("beforeend",T)}),r.classList.add("hidden")):r.classList.remove("hidden"),a.innerHTML=`<span class="text-emerald-500 font-black">${y(p)}</span>`,o.innerHTML=`<span class="${v>0?"text-red-500":"text-white/40"} font-black">${y(v)}</span>`}catch(d){console.error("Error:",d),n.innerHTML='<tr><td colspan="5" class="px-6 py-10 text-center text-red-500 font-bold uppercase text-[10px] tracking-widest">Fallo de conexión con el servidor</td></tr>'}}})()};window.handleDeleteSale=async function(e,t,n){if(!c){alert("Error de conexión a la base de datos.");return}if(confirm(`ADVERTENCIA: ¿Está seguro de que desea eliminar la Venta #${e}? 
        
        Esta acción es irreversible, eliminará todos los detalles y pagos asociados, y afectará la deuda del cliente.
        
        Presione OK para continuar.`))try{const{error:o}=await c.from("ventas").delete().eq("venta_id",e);if(o)throw console.error("Error de eliminación en Supabase:",o),o.code==="23503"?new Error("Violación de restricción: La venta tiene registros asociados que no se pudieron eliminar. Revise las reglas de 'ON DELETE CASCADE' en su base de datos."):o;alert(`Venta #${e} eliminada exitosamente.`),typeof loadMonthlySalesReport=="function"?await loadMonthlySalesReport(t,n):location.reload()}catch(o){console.error("Error al eliminar la venta:",o),alert(`Error al eliminar la venta. Detalles: ${o.message}`)}};function le(){const e=document.getElementById("report-month-select");if(!e)return;e.innerHTML="";const t=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],n=new Date().getMonth()+1;t.forEach((a,o)=>{const r=o+1,d=document.createElement("option");d.value=r,d.textContent=a,r===n&&(d.selected=!0),e.appendChild(d)})}function G(e){var l;const n=(u,w)=>{const f=y(w),b=32-u.length-f.length;return u+" ".repeat(b)+f},a=u=>{const w=32-u.length,f=Math.floor(w/2);return" ".repeat(f)+u};let o=a("Creativa Cortes CNC")+`
`;o+=`--------------------------------
`,o+=`
`,o+=a("Tel: 9851001141")+`
`,o+=a("Dirección: Calle 33 x 48 y 46")+`
`,o+=a("Col. Candelaria")+`
`,o+="Fecha: "+new Date(e.created_at).toLocaleDateString("es-MX")+`
`,o+="Venta: "+e.venta_id+`
`,o+=`--------------------------------
`;const r=((l=e.clientes)==null?void 0:l.name)||"Consumidor Final";o+="Cliente: "+r+`
`,o+=`================================
`,o+=`
`,o+=`Producto             Cant.  Total
`,o+=`--------------------------------
`,e.detalle_ventas.forEach(u=>{const f=u.productos.name.substring(0,18).padEnd(18," "),b=u.quantity.toString().padStart(5," "),p=y(u.subtotal).padStart(6," ");o+=`${f} ${b} ${p}
`}),o+=`--------------------------------
`,o+=`
`;const d=e.total_amount||0,i=e.saldo_pendiente||0,s=d-i;return o+=n("SALDO PENDIENTE:",i)+`
`,o+=n("ANTICIPO:",s)+`
`,o+=`================================
`,o+=n("TOTAL:",d)+`
`,o+=`================================
`,o+=`
`,o+=a("¡Gracias por su compra!")+`
`,o+=`
`,o+=`--------------------------------
`,o}let U=null;async function K(e){const{data:t,error:n}=await c.from("ventas").select("*, clientes(name), detalle_ventas (quantity, price, subtotal, productos(name))").eq("venta_id",e).single();if(n||!t)return;const o=`<pre style="font-family: monospace; font-size: 14px; margin: 0 auto; text-align: left;">${G(t)}</pre>`,r=document.getElementById("ticket-preview-content");r&&(r.innerHTML=o),U=e,openModal("modal-ticket-preview")}window.showTicketPreviewModal=K;async function se(e){const{data:t,error:n}=await c.from("ventas").select("*, clientes(name), detalle_ventas (quantity, price, subtotal, productos(name))").eq("venta_id",e).single();if(n||!t){console.error("Error al obtener datos para impresión:",n==null?void 0:n.message);return}const a=G(t);if(!qz.websocket.isActive()){alert("QZ Tray no está conectado. Por favor, asegúrate de que esté corriendo y recarga la página.");return}try{const o=[{type:"raw",data:a},{type:"raw",data:"VA\0"}],r=qz.configs.create("XP-58 (copy 1)",{encoding:"858"});await qz.print(r,o),console.log("Ticket enviado a la impresora correctamente.")}catch(o){alert("Error de impresión con QZ Tray. Revisa la consola para más detalles."),console.error(o)}}async function ce(){const{data:e,error:t}=await c.from("clientes").select("client_id, name");if(t){console.error("Error al cargar datos de clientes para el mapa:",t);return}e.reduce((n,a)=>(n[a.client_id]=a.name,n),{})}window.loadAndRenderProducts=async function(){console.log("🔄 Sincronizando inventario con Supabase...");try{const{data:e,error:t}=await c.from("productos").select("*").order("name",{ascending:!0});if(t)throw t;window.allProducts=e||[],window.allProductsMap=Object.fromEntries(window.allProducts.map(a=>[String(a.producto_id),a]));const n=document.getElementById("products-table-body");if(!n)return;if(n.innerHTML="",window.allProducts.length===0){n.innerHTML=`
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                        <i class="fas fa-box-open text-4xl mb-3 block opacity-20"></i>
                        No hay productos registrados en el inventario.
                    </td>
                </tr>`;return}window.allProducts.forEach(a=>{let o="";if(a.type==="PACKAGE"&&a.parent_product){const l=window.allProductsMap[String(a.parent_product)];o=l?`<div class="flex items-center text-[10px] text-indigo-500 mt-1 font-medium bg-indigo-50 w-fit px-1.5 py-0.5 rounded">
                         <i class="fas fa-link mr-1 text-[8px]"></i> Vinculado a: ${l.name}
                       </div>`:""}const r=a.type==="PACKAGE",d=r?"bg-purple-50 text-purple-700 ring-purple-700/10":"bg-blue-50 text-blue-700 ring-blue-700/10",i=r?"fa-boxes":"fa-box",s=document.createElement("tr");s.className="group hover:bg-slate-50/50 border-b border-slate-100 transition-colors",s.innerHTML=`
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">ID #${a.producto_id}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mr-3 border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <i class="fas ${i} text-xs"></i>
                        </div>
                        <div>
                            <div class="text-sm font-bold text-slate-800">${a.name}</div>
                            ${o}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ring-1 ring-inset ${d}">
                        ${r?"SUBPRODUCTO":"INDIVIDUAL"}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Precio Unitario</div>
                    <div class="text-sm font-black text-emerald-600">${y(a.price||0)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button onclick="handleEditProductClick(${a.producto_id})" 
                                class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Editar">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button onclick="handleDeleteProductClick(${a.producto_id})" 
                                class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                </td>
            `,n.appendChild(s)}),typeof window.populateParentSelectors=="function"&&window.populateParentSelectors(),console.log("✅ Interfaz de productos actualizada.")}catch(e){console.error("❌ Error fatal en carga de productos:",e.message)}};function Y(e){if(!e)return"N/A";try{const t=new Date(e),n={year:"numeric",month:"2-digit",day:"2-digit"};return t.toLocaleDateString("es-MX",n)}catch(t){return console.error("Error al formatear la fecha:",t,e),"Fecha inválida"}}document.addEventListener("DOMContentLoaded",async()=>{var r,d,i,s,l,u,w,f,b,p,v,x,h,m,P,C,S,T,$,k,F,O,q;async function e(g){const E=document.getElementById(g);if(!E){console.error(`Error: Modal con ID '${g}' no encontrado.`);return}g==="new-product-modal"&&typeof window.openNewProductModal=="function"&&await window.openNewProductModal(),E.classList.remove("hidden"),E.classList.add("flex")}if(document.querySelectorAll("[data-open-modal]").forEach(g=>{g.addEventListener("click",async E=>{E.preventDefault();const I=g.getAttribute("data-open-modal");await e(I)})}),window.openNewProductModal=async function(){await window.loadMainProductsAndPopulateSelect();const g=document.getElementById("new-product-type");g&&window.handleProductTypeChange&&(g.value="PRODUCT",window.handleProductTypeChange())},document.querySelectorAll("[data-close-modal]").forEach(g=>{g.addEventListener("click",E=>{E.preventDefault();const I=g.getAttribute("data-close-modal");closeModal(I)})}),document.addEventListener("click",g=>{document.querySelectorAll(".modal-overlay:not(.hidden)").forEach(I=>{g.target===I&&closeModal(I.id)})}),document.addEventListener("keydown",g=>{if(g.key==="Escape"){const E=document.querySelectorAll(".modal-overlay:not(.hidden)"),I=E[E.length-1];I&&closeModal(I.id)}}),window.switchView=async function(g){console.log(`Cambiando a vista: ${g}`),document.querySelectorAll(".menu-item").forEach(D=>{D.classList.remove("active-menu-item")}),document.querySelectorAll(".dashboard-view").forEach(D=>{D.classList.add("hidden")});const E=document.getElementById(g);E&&E.classList.remove("hidden");const I=document.querySelector(`[data-view="${g}"]`);I&&I.classList.add("active-menu-item");try{g==="home-view"?typeof L=="function"&&await L():g==="deudas-view"?(typeof loadDebtsTable=="function"?await loadDebtsTable():typeof M=="function"&&await M(),typeof actualizarMetricasDeudas=="function"&&await actualizarMetricasDeudas(window.allClients)):g==="report-view"?(console.log("📊 Refrescando reportes..."),typeof window.loadSalesData=="function"&&await window.loadSalesData(),typeof window.initReportView=="function"&&window.initReportView()):g==="sales-view"&&typeof window.loadSalesData=="function"&&(await window.loadSalesData(),typeof window.handleFilterSales=="function"&&window.handleFilterSales())}catch(D){console.error(`Error al cargar datos de la vista ${g}:`,D)}},document.querySelectorAll("[data-view]").forEach(g=>{g.addEventListener("click",E=>{E.preventDefault();const I=g.getAttribute("data-view");switchView(I)})}),!window.supabase){console.error("Error Fatal: Librería Supabase no encontrada. La aplicación no funcionará.");return}window.supabase||console.error("Error Fatal: Librería Supabase no encontrada. La aplicación no funcionará."),await ce(),N(),le();const t=document.getElementById("report-month-selector");t&&t.addEventListener("change",loadMonthlySalesReport),loadMonthlySalesReport();const n=document.getElementById("new-client-form");n&&n.addEventListener("submit",window.handleNewClient),(r=document.getElementById("open-sale-modal-btn"))==null||r.addEventListener("click",async()=>{var g;try{(g=document.getElementById("new-sale-form"))==null||g.reset(),await j(),loadMainProductsForSaleSelect(),_=[],updateSaleTableDisplay(),document.getElementById("total-amount").value="0.00",document.getElementById("paid-amount").value="0.00",document.getElementById("display-saldo-pendiente").value="0.00",e("new-sale-modal")}catch(E){console.error("Error al cargar datos del modal de venta:",E),alert("Error al cargar los datos. Revise la consola (F12).")}}),(d=document.getElementById("new-sale-form"))==null||d.addEventListener("submit",handleNewSale),(i=document.getElementById("paid-amount"))==null||i.addEventListener("input",()=>A()),(s=document.getElementById("payment-method"))==null||s.addEventListener("change",()=>A()),(l=document.getElementById("paid-amount"))==null||l.addEventListener("input",()=>{B()}),(u=document.getElementById("payment-method"))==null||u.addEventListener("change",()=>{B()}),(w=document.getElementById("add-product-btn"))==null||w.addEventListener("click",handleAddProductToSale),(f=document.getElementById("abono-client-form"))==null||f.addEventListener("submit",handleRegisterPayment),(b=document.getElementById("register-payment-form"))==null||b.addEventListener("submit",de);const a=document.getElementById("paid-amount");a&&a.addEventListener("input",A);const o=document.getElementById("payment-method");o&&o.addEventListener("change",A),(p=document.getElementById("login-form"))==null||p.addEventListener("submit",Q),(v=document.getElementById("logout-btn"))==null||v.addEventListener("click",ee),(x=document.getElementById("sales-month-filter"))==null||x.addEventListener("change",()=>{L()}),(h=document.getElementById("reset-sales-filter"))==null||h.addEventListener("click",()=>{const g=document.getElementById("sales-month-filter");g&&(g.value=""),L()}),(m=document.getElementById("print-ticket-btn"))==null||m.addEventListener("click",()=>{se(U)}),(P=document.getElementById("open-monthly-report-btn"))==null||P.addEventListener("click",()=>{loadMonthlySalesReport(),e("modal-monthly-report")}),document.addEventListener("click",function(g){const E=g.target.closest(".view-sale-details-btn");if(E){const I=E.getAttribute("data-venta-id"),D=E.getAttribute("data-client-id");I&&D?(console.log(`DEBUG: Clic en Detalle Detectado. Venta ID: ${I}, Cliente ID: ${D}`),handleViewSaleDetails(I,D)):console.error("ERROR: El botón de detalle le faltan atributos (data-venta-id o data-client-id).")}}),document.addEventListener("DOMContentLoaded",()=>{const g=document.getElementById("new-client-form");g&&g.addEventListener("submit",handleNewClient)}),(C=document.getElementById("open-admin-products-modal"))==null||C.addEventListener("click",async()=>{try{await loadAndRenderProducts(),e("admin-products-modal")}catch(g){console.error("Error al cargar la administración de productos:",g),alert("Error al cargar la lista de productos.")}}),(S=document.getElementById("open-product-modal-btn"))==null||S.addEventListener("click",()=>{var g;closeModal("admin-products-modal"),(g=document.getElementById("new-product-form"))==null||g.reset(),z(),e("modal-register-product")}),(T=document.getElementById("new-product-type"))==null||T.addEventListener("change",g=>{z(),g.target.value==="PACKAGE"&&ne("parent-product-select")}),($=document.getElementById("new-product-form"))==null||$.addEventListener("submit",ae),(k=document.getElementById("product-main-select"))==null||k.addEventListener("change",handleChangeProductForSale),(F=document.getElementById("subproduct-select"))==null||F.addEventListener("change",g=>{updatePriceField(g.target.value)}),document.addEventListener("DOMContentLoaded",()=>{var E;const g=document.getElementById("edit-product-form");g&&g.addEventListener("submit",window.handleUpdateProduct),(E=document.getElementById("edit-product-category"))==null||E.addEventListener("change",function(I){const D=document.getElementById("edit-product-parent-container"),W=document.getElementById("edit-product-id").value;I.target.value==="Paquete"?(D.classList.remove("hidden"),window.populateParentSelect("edit-product-parent",W)):D.classList.add("hidden")})}),document.addEventListener("click",async function(g){if(g.target&&g.target.id==="confirm-delete-client-btn"){const E=g.target;if(!window.clientIdToDelete){console.error("No hay un ID de cliente seleccionado para eliminar.");return}console.log("Intentando eliminar cliente ID:",window.clientIdToDelete);const I=E.textContent;E.disabled=!0,E.textContent="Eliminando...";try{const{error:D}=await c.from("clientes").delete().eq("client_id",window.clientIdToDelete);if(D)if(D.code==="23503")alert("No se puede eliminar: El cliente tiene ventas o deudas registradas.");else throw D;else console.log("✅ Cliente eliminado de la base de datos."),alert("Cliente eliminado correctamente."),closeModal("delete-client-modal"),typeof window.loadClientsTable=="function"&&await window.loadClientsTable()}catch(D){console.error("Error crítico al borrar:",D),alert("Error al intentar eliminar: "+D.message)}finally{E.disabled=!1,E.textContent=I,window.clientIdToDelete=null}}}),(O=document.getElementById("clients-list-body"))==null||O.addEventListener("click",async g=>{const E=g.target.closest("button");if(E){g.preventDefault();const I=E.getAttribute("data-client-id");E.classList.contains("edit-client-btn")&&await handleEditClientClick(I),E.classList.contains("delete-client-btn")&&handleDeleteClientClick(I),E.classList.contains("view-debt-btn")&&await handleViewClientDebt(I)}}),(q=document.getElementById("edit-client-form"))==null||q.addEventListener("submit",ie)});document.addEventListener("DOMContentLoaded",()=>{console.log("DOM Cargado. Inicializando aplicación...");const e=document.getElementById("edit-sale-price-form");e&&e.addEventListener("submit",window.handlePriceEditSubmit);const t=document.getElementById("abono-client-form");t&&t.addEventListener("submit",async function(n){n.preventDefault(),console.log("🚀 Procesando abono en cascada..."),typeof window.handleAbonoSubmit=="function"&&await window.handleAbonoSubmit(n)}),window.loadDashboardData&&(window.loadDashboardData(),console.log("Datos del Dashboard cargados.")),document.body.addEventListener("click",n=>{const a=n.target.closest("[data-close-modal]");if(a){const r=a.dataset.closeModal;window.closeModal(r);return}const o=n.target.closest("[data-open-modal]");if(o){const r=o.dataset.openModal;if(r==="abono-client-modal"&&window.viewingClientId){window.handleAbonoClick(window.viewingClientId);return}const d=`open${r.split("-").map(i=>i.charAt(0).toUpperCase()+i.slice(1)).join("")}`;typeof window[d]=="function"?window[d]():window.openModal(r)}n.target.classList.contains("modal-overlay")&&window.closeModal(n.target.id)})});document.addEventListener("DOMContentLoaded",()=>{const e=document.getElementById("confirm-delete-btn");e&&e.addEventListener("click",async()=>{if(!window.productIdToDelete)return;e.disabled=!0,e.innerHTML='<i class="fas fa-spinner fa-spin"></i> Eliminando...';const{error:t}=await c.from("productos").delete().eq("producto_id",window.productIdToDelete);t?t.code==="23503"?alert("No se puede eliminar porque este producto está en una venta."):alert("Error al eliminar: "+t.message):(alert("Producto eliminado."),closeModal("delete-product-modal"),await window.loadAndRenderProducts()),e.disabled=!1,e.textContent="Sí, Eliminar"})});var V;(V=document.getElementById("open-abono-from-report-btn"))==null||V.addEventListener("click",e=>{var a;if(e.preventDefault(),!window.viewingClientId)return;const t=((a=document.getElementById("client-report-total-debt"))==null?void 0:a.textContent)||"$0.00";parseFloat(t.replace(/[^0-9.-]+/g,""))>.01?(window.handleAbonoClick(window.viewingClientId),closeModal("modal-client-debt-report")):alert("El cliente no tiene deuda pendiente.")});document.addEventListener("submit",async function(e){var t,n,a;if(e.target&&e.target.id==="abono-client-form"){e.preventDefault(),e.stopPropagation(),console.log("🚀 Procesando abono sin recargar página...");const o=e.target,r=o.querySelector('button[type="submit"]'),d=(t=document.getElementById("abono-client-id"))==null?void 0:t.value,i=parseFloat((n=document.getElementById("abono-amount"))==null?void 0:n.value),s=(a=document.getElementById("payment-method-abono"))==null?void 0:a.value;if(!d||isNaN(i)||i<=0||!s){alert("⚠️ Por favor complete todos los campos correctamente.");return}r&&(r.disabled=!0,r.textContent="Guardando...");try{const{error:l}=await c.from("pagos").insert([{client_id:d,amount:i,metodo_pago:s,type:"ABONO_GENERAL",created_at:new Date().toISOString()}]);if(l)throw l;alert(`✅ Abono de ${i} registrado correctamente.`),typeof closeModal=="function"&&closeModal("abono-client-modal"),o.reset(),typeof window.loadClientsTable=="function"&&await window.loadClientsTable("gestion"),typeof window.loadDashboardMetrics=="function"&&await window.loadDashboardMetrics()}catch(l){console.error("❌ Error en Supabase:",l),alert("Error al registrar el abono: "+l.message)}finally{r&&(r.disabled=!1,r.textContent="Confirmar Abono")}}});document.addEventListener("DOMContentLoaded",()=>{const e=document.getElementById("product-main-select");e&&(e.addEventListener("change",window.handleChangeProductForSale),console.log("✅ Listener de Producto Principal (product-main-select) conectado."));const t=document.getElementById("filter-start-date"),n=document.getElementById("filter-end-date"),a=document.getElementById("filter-search-term");t&&t.addEventListener("change",window.handleFilterSales),n&&n.addEventListener("change",window.handleFilterSales),a&&a.addEventListener("input",window.handleFilterSales),window.loadProductsData&&loadProductsData().then(()=>{window.loadMainProductsForSaleSelect()}),window.loadSalesData&&window.loadSalesData().then(()=>{window.handleFilterSales()}),window.loadClientsData&&window.loadClientsData()});
