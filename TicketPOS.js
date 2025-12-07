// ====================================================================
// FUNCIÓN PARA IMPRIMIR TICKET USANDO QZ TRAY
// ====================================================================

async function printTicketQZ(ventaId) {
    if (!qz.websocket.isActive()) {
        // Intenta conectar si no está activo
        try {
            await qz.websocket.connect();
        } catch (e) {
            console.error('Error al conectar con QZ Tray. Asegúrate de que esté ejecutándose.', e);
            alert('Error: QZ Tray no está conectado. Por favor, inícialo.');
            return;
        }
    }

    try {
        // 1. OBTENER DATOS DE SUPABASE
        const { data: sale, error } = await supabase
            .from('ventas')
            .select(`
                *, 
                clientes(name), 
                detalle_ventas (quantity, price, subtotal, productos(name))
            `)
            .eq('venta_id', ventaId)
            .single();

        if (error || !sale) throw new Error('Venta no encontrada.');

        // 2. GENERAR EL CÓDIGO ESC/POS
        // Generarás un array con comandos que la impresora entiende.
        let rawData = [];

        // Comandos ESC/POS de ejemplo:
        rawData.push('\x1B' + '\x40'); // Comando de inicialización de impresora
        rawData.push('\x1B' + '\x61' + '\x31'); // Comando de alineación central
        rawData.push('¡MI TIENDA!\n');
        rawData.push(sale.clientes.name + '\n');
        rawData.push('\x1B' + '\x61' + '\x30'); // Comando de alineación izquierda
        rawData.push('----------------------------------------\n');
        
        sale.detalle_ventas.forEach(item => {
            const line = `${item.quantity} ${item.productos.name} @ ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}\n`;
            rawData.push(line);
        });

        rawData.push('----------------------------------------\n');
        rawData.push('\x1B' + '\x61' + '\x32'); // Comando de alineación derecha
        rawData.push(`TOTAL: ${formatCurrency(sale.total_amount)}\n`);
        
        rawData.push('\x1B' + '\x61' + '\x31'); // Comando de alineación central
        rawData.push('¡Gracias por su compra!\n\n');
        
        rawData.push('\x1D' + '\x56' + '\x00'); // Comando de corte de papel

        // 3. ENVIAR A QZ TRAY
        const config = qz.configs.create("YOUR_PRINTER_NAME"); // ⬅️ REEMPLAZA CON EL NOMBRE DE TU IMPRESORA
        
        await qz.print(config, rawData);
        alert(`Ticket #${ventaId} enviado a impresión.`);

    } catch (e) {
        console.error('Error durante la impresión del ticket:', e);
        alert('Fallo la impresión. Consulta la consola para más detalles.');
    }
}