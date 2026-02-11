/**
 * Subir fotos para un equipo
 */
async function subirFotos(equipoId) {
    const fileInput = document.getElementById(`foto-input-${equipoId}`);
    const tipoSelect = document.getElementById(`foto-tipo-${equipoId}`);

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Por favor seleccione al menos una foto', 'warning');
        return;
    }

    if (fileInput.files.length > 10) {
        showToast('Máximo 10 fotos por vez', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('equipo_id', equipoId);
    formData.append('tipo', tipoSelect.value);

    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('fotos', fileInput.files[i]);
    }

    try {
        showLoading();
        const response = await fetch(`${API_URL}/fotos`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al subir fotos');
        }

        const data = await response.json();
        showToast(data.message, 'success');

        // Limpiar input y recargar galería
        fileInput.value = '';
        await cargarFotos(equipoId);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Cargar fotos de un equipo
 */
async function cargarFotos(equipoId) {
    try {
        const data = await apiRequest(`/fotos/equipo/${equipoId}`);
        renderGaleriaFotos(equipoId, data.fotos);
    } catch (error) {
        document.getElementById(`galeria-fotos-${equipoId}`).innerHTML = `
            <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary);">
                No hay fotos cargadas
            </div>
        `;
    }
}

/**
 * Renderizar galería de fotos
 */
function renderGaleriaFotos(equipoId, fotos) {
    const galeria = document.getElementById(`galeria-fotos-${equipoId}`);

    if (!fotos || fotos.length === 0) {
        galeria.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary);">
                No hay fotos cargadas
            </div>
        `;
        return;
    }

    // Agrupar fotos por tipo
    const fotosPorTipo = {
        ingreso: [],
        diagnostico: [],
        reparacion: [],
        entrega: []
    };

    fotos.forEach(foto => {
        if (fotosPorTipo[foto.tipo]) {
            fotosPorTipo[foto.tipo].push(foto);
        }
    });

    const tipoLabels = {
        ingreso: '📥 Ingreso',
        diagnostico: '🔍 Diagnóstico',
        reparacion: '🔧 Reparación',
        entrega: '📦 Entrega'
    };

    let html = '';

    Object.keys(fotosPorTipo).forEach(tipo => {
        if (fotosPorTipo[tipo].length > 0) {
            html += `
                <div style="margin-bottom: var(--spacing-lg);">
                    <h5 style="margin-bottom: var(--spacing-md);">${tipoLabels[tipo]}</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--spacing-md);">
                        ${fotosPorTipo[tipo].map(foto => `
                            <div style="position: relative; border: 1px solid var(--border-color); border-radius: var(--border-radius); overflow: hidden;">
                                <img src="${foto.ruta_archivo}" 
                                     alt="${foto.descripcion || 'Foto del equipo'}" 
                                     style="width: 100%; height: 150px; object-fit: cover; cursor: pointer;"
                                     onclick="window.open('${foto.ruta_archivo}', '_blank')">
                                <button 
                                    onclick="eliminarFoto(${foto.id}, ${equipoId})"
                                    style="position: absolute; top: 5px; right: 5px; background: rgba(220, 38, 38, 0.9); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;"
                                    title="Eliminar foto">
                                    ×
                                </button>
                                ${foto.descripcion ? `
                                    <div style="padding: var(--spacing-sm); background: var(--bg-secondary); font-size: var(--font-size-sm);">
                                        ${foto.descripcion}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });

    galeria.innerHTML = html || `
        <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary);">
            No hay fotos cargadas
        </div>
    `;
}

/**
 * Eliminar foto
 */
async function eliminarFoto(fotoId, equipoId) {
    if (!window.confirm('¿Está seguro de eliminar esta foto?')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/fotos/${fotoId}`, {
            method: 'DELETE'
        });
        showToast('Foto eliminada exitosamente', 'success');
        await cargarFotos(equipoId);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}
