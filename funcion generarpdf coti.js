window.generateQuotation = async function() {|
    if (!currentSaleItems || currentSaleItems.length === 0) {
        Swal.fire({ title: 'Carrito Vacío', text: 'Agrega productos', icon: 'warning', background: '#121212', color: '#fff' });
        return;
    }

    const clientSelect = document.getElementById('client-select');
    let clientName = "Ventanilla / Público General";
    if (clientSelect && clientSelect.selectedIndex > 0) {
        clientName = clientSelect.options[clientSelect.selectedIndex].text;
    }

    const total = currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0);

    // 1. Mostrar Preview en Pantalla
    Swal.fire({
        title: `<span class="text-blue-500 font-sans font-black uppercase tracking-widest text-xs">Opciones de Cotización</span>`,
        background: '#121212',
        color: '#fff',
        html: `
            <div class="text-left border border-white/40 rounded-xl p-4 bg-white/5 font-sans mb-4">
                <p class="text-[12px] text-blue-500 font-bold uppercase mb-2">Resumen para: ${clientName}</p>
                <p class="text-lg font-black italic">${formatCurrency(total)}</p>
            </div>
            <p class="text-[12px] text-gray-500 uppercase">¿Cómo deseas entregar el presupuesto?</p>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '<i class="fab fa-whatsapp mr-2"></i> WhatsApp',
        denyButtonText: '<i class="fas fa-file-pdf mr-2"></i> Descargar PDF',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#10b981',
        denyButtonColor: '#3b82f6',
    }).then((result) => {
        if (result.isConfirmed) {
            // WHATSAPP
            const msg = `*COTIZACIÓN CREATIVA*%0A*Cliente:* ${clientName}%0A*Total:* ${formatCurrency(total)}%0A%0A_Precios sujetos a cambio._`;
            window.open(`https://wa.me/?text=${msg}`, '_blank');
        } else if (result.isDenied) {
            // PDF
            downloadQuotePDF(clientName, total);
        }
    });
};