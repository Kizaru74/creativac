window.handleViewSaleDetails = async function(venta_id) {
    try {
        // 1. Obtener la venta (Aquí ya viene la columna metodo_pago que me mostraste)
        const { data: venta, error: vError } = await supabase
            .from('ventas')
            .select('*')
            .eq('venta_id', parseInt(venta_id))
            .maybeSingle();

        if (vError) throw vError;

        // 2. Obtener productos y pagos relacionados
        const [prodRes, pagosRes] = await Promise.all([
            supabase.from('detalle_ventas').select('*').eq('venta_id', venta_id),
            supabase.from('pagos').select('created_at, metodo_pago, amount').eq('venta_id', venta_id) 
        ]);

        const productos = prodRes.data || [];
        const pagos = pagosRes.data || [];
        window.currentSaleForPrint = { ...venta, productos, pagos };

        // 3. LLENAR EL CAMPO QUE SOLICITASTE
        // Tomamos el valor directamente de la columna 'metodo_pago' de tu tabla 'ventas'
        const detailPaymentMethod = document.getElementById('detail-payment-method');
        if (detailPaymentMethod) {
            detailPaymentMethod.textContent = venta.metodo_pago || 'No especificado';
        }

        // --- LLENADO DE DATOS GENERALES ---
        document.getElementById('detail-sale-id').textContent = venta.venta_id;
        const cliente = window.allClients?.find(c => String(c.client_id) === String(venta.client_id));
        document.getElementById('detail-client-name').textContent = cliente ? cliente.name : 'Cliente General';

        // 4. OPCIÓN DE CAMBIAR FECHA
        const fechaContenedor = document.getElementById('detail-sale-date');
        if (fechaContenedor) {
            fechaContenedor.innerHTML = `
                <span class="font-medium">${new Date(venta.created_at).toLocaleDateString()}</span>
                <button onclick="window.editSaleDate(${venta.venta_id}, '${venta.created_at}')" 
                        class="ml-2 text-indigo-600 hover:text-indigo-800 text-xs border border-indigo-200 px-2 py-1 rounded bg-white">
                    <i class="fas fa-calendar-alt"></i> Cambiar
                </button>
            `;
        }

        // 5. ESTADO VISUAL (Badge de Crédito/Contado)
        const metodoDisplay = document.getElementById('detail-sale-method');
        if (metodoDisplay) {
            if (venta.saldo_pendiente > 0.05) {
                metodoDisplay.innerHTML = `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">⚠️ VENTA A CRÉDITO</span>`;
            } else {
                metodoDisplay.innerHTML = `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">✅ PAGADO</span>`;
            }
        }

        // 6. TABLA DE PRODUCTOS (Con botones de Editar y Borrar)
        const productsBody = document.getElementById('detail-products-body');
        productsBody.innerHTML = productos.map(item => `
            <tr class="border-b">
                <td class="px-4 py-2">${item.name}</td>
                <td class="px-4 py-2 text-right">${item.quantity}</td>
                <td class="px-4 py-2 text-right">${formatCurrency(item.price)}</td>
                <td class="px-4 py-2 text-right font-bold">${formatCurrency(item.subtotal)}</td>
                <td class="px-4 py-2 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="window.editItemPrice(${item.detalle_id || item.id}, ${item.price}, ${item.quantity}, ${venta_id})" class="text-blue-500"><i class="fas fa-edit"></i></button>
                        <button onclick="window.deleteItemFromSale(${item.detalle_id || item.id}, ${venta_id})" class="text-red-400"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

        // 7. HISTORIAL DE ABONOS (Detalle de pagos extras si existen)
        const abonosBody = document.getElementById('detail-abonos-body');
        abonosBody.innerHTML = pagos.length > 0 ? pagos.map(p => `
            <tr class="text-xs border-b">
                <td class="py-2 px-3 text-gray-500">${new Date(p.created_at).toLocaleDateString()}</td>
                <td class="py-2 px-3 font-semibold text-indigo-700 uppercase">${p.metodo_pago || 'EFECTIVO'}</td>
                <td class="py-2 px-3 text-right font-bold text-green-600">${formatCurrency(p.amount || p.monto)}</td>
            </tr>
        `).join('') : '<tr><td colspan="3" class="text-center py-4 text-gray-400">No hay pagos registrados</td></tr>';

        // 8. TOTALES
        document.getElementById('detail-total-amount').textContent = formatCurrency(venta.total_amount);
        const saldoE = document.getElementById('detail-pending-amount');
        if (saldoE) {
            saldoE.textContent = formatCurrency(venta.saldo_pendiente);
            saldoE.className = venta.saldo_pendiente > 0 ? "text-2xl font-black text-red-600" : "text-2xl font-black text-green-600";
        }

        window.openModal('modal-detail-sale');
    } catch (err) { 
        console.error("Error:", err);
        alert("Error al cargar la información de la venta.");
    }
};