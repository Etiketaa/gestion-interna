// ============================================
// GESTIÓN DE EQUIPOS
// ============================================

let equiposData = [];

/**
 * Cargar equipos
 */
async function loadEquipos(estado = '', sistema = '') {
    try {
        let url = '/equipos?limit=100';
        if (estado) url += `&estado=${estado}`;
        if (sistema) url += `&sistema_operativo=${sistema}`;

        const data = await apiRequest(url);
        equiposData = data.equipos;
        renderEquiposTable();
    } catch (error) {
        showToast('Error al cargar equipos', 'error');
    }
}

/**
 * Renderizar tabla de equipos
 */
function renderEquiposTable() {
    const tbody = document.getElementById('equipos-table-body');
    if (!tbody) return;

    if (equiposData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay equipos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = equiposData.map(equipo => `
        <tr>
            <td><strong>${equipo.numero_orden || 'N/A'}</strong></td>
            <td>${equipo.cliente_nombre}<br><small style="color: var(--text-secondary);">${equipo.cliente_telefono}</small></td>
            <td><strong>${equipo.marca} ${equipo.modelo}</strong></td>
            <td>${getSOBadge(equipo.sistema_operativo)}</td>
            <td><small>${equipo.falla_reportada.substring(0, 50)}${equipo.falla_reportada.length > 50 ? '...' : ''}</small></td>
            <td>${getEstadoBadge(equipo.estado_actual)}</td>
            <td><small>${formatDateShort(equipo.fecha_ingreso)}</small></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="verDetalleEquipo(${equipo.id})">👁️</button>
                <button class="btn btn-sm btn-secondary" onclick="cambiarEstadoEquipo(${equipo.id})">🔄</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Abrir modal de equipo
 */
function openEquipoModal() {
    const form = document.getElementById('form-equipo');
    form.reset();
    document.getElementById('ios-fields').classList.add('hidden');
    openModal('modal-equipo');
}

/**
 * Toggle campos iOS
 */
function toggleIOSFields() {
    const sistema = document.getElementById('equipo-sistema').value;
    const iosFields = document.getElementById('ios-fields');

    if (sistema === 'iOS') {
        iosFields.classList.remove('hidden');
    } else {
        iosFields.classList.add('hidden');
    }
}

/**
 * Guardar equipo
 */
async function saveEquipo() {
    const clienteId = document.getElementById('equipo-cliente').value;
    const marca = document.getElementById('equipo-marca').value.trim();
    const modelo = document.getElementById('equipo-modelo').value.trim();
    const sistema = document.getElementById('equipo-sistema').value;
    const imei = document.getElementById('equipo-imei').value.trim();
    const falla = document.getElementById('equipo-falla').value.trim();
    const estadoFisico = document.getElementById('equipo-estado-fisico').value.trim();
    const accesoriosStr = document.getElementById('equipo-accesorios').value.trim();

    if (!clienteId || !marca || !modelo || !sistema || !falla) {
        showToast('Complete todos los campos obligatorios', 'warning');
        return;
    }

    const accesorios = parseAccesorios(accesoriosStr);

    const equipoData = {
        cliente_id: parseInt(clienteId),
        marca,
        modelo,
        sistema_operativo: sistema,
        imei: imei || null,
        falla_reportada: falla,
        estado_fisico: estadoFisico || null,
        accesorios: accesorios.length > 0 ? accesorios : null
    };

    // Campos iOS
    if (sistema === 'iOS') {
        equipoData.icloud_status = document.getElementById('equipo-icloud').value || null;
        equipoData.biometria_tipo = document.getElementById('equipo-biometria').value || null;
    }

    try {
        showLoading();
        const response = await apiRequest('/equipos', {
            method: 'POST',
            body: JSON.stringify(equipoData)
        });

        // Mostrar número de orden al usuario
        const numeroOrden = response.equipo.numero_orden;
        alert(`✅ Equipo registrado exitosamente\n\n📋 NÚMERO DE ORDEN:\n${numeroOrden}\n\nEntregue este número al cliente para que pueda consultar el estado de su reparación.`);

        showToast('Equipo registrado exitosamente', 'success');
        closeModal('modal-equipo');
        await loadEquipos();
        await loadDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Ver detalle de equipo
 */
async function verDetalleEquipo(equipoId) {
    try {
        showLoading();
        const data = await apiRequest(`/equipos/${equipoId}`);
        renderDetalleEquipo(data);
        openModal('modal-detalle-equipo');
    } catch (error) {
        showToast('Error al cargar detalle del equipo', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Renderizar detalle de equipo
 */
function renderDetalleEquipo(data) {
    const { equipo, diagnostico, presupuestos, historial } = data;

    let html = `
        <div class="card">
            <div class="card-header">
                <h4>Información del Equipo</h4>
            </div>
            <div class="card-body">
                <div style="background: var(--primary); color: white; padding: var(--spacing-md); border-radius: var(--border-radius); margin-bottom: var(--spacing-md); text-align: center;">
                    <div style="font-size: var(--font-size-sm); opacity: 0.9;">Número de Orden</div>
                    <div style="font-size: var(--font-size-2xl); font-weight: 700; letter-spacing: 2px;">${equipo.numero_orden || 'N/A'}</div>
                </div>
                <div class="form-row">
                    <div><strong>Cliente:</strong> ${equipo.cliente_nombre}</div>
                    <div><strong>Teléfono:</strong> ${equipo.cliente_telefono}</div>
                </div>
                <div class="form-row mt-1">
                    <div><strong>Equipo:</strong> ${equipo.marca} ${equipo.modelo}</div>
                    <div><strong>Sistema:</strong> ${getSOBadge(equipo.sistema_operativo)}</div>
                    <div><strong>IMEI:</strong> ${equipo.imei || '-'}</div>
                </div>
                ${equipo.sistema_operativo === 'iOS' ? `
                    <div class="form-row mt-1">
                        <div><strong>iCloud:</strong> ${equipo.icloud_status || '-'}</div>
                        <div><strong>Biometría:</strong> ${equipo.biometria_tipo || '-'}</div>
                    </div>
                ` : ''}
                <div class="mt-1">
                    <strong>Falla Reportada:</strong><br>
                    ${equipo.falla_reportada}
                </div>
                <div class="mt-1">
                    <strong>Estado Físico:</strong><br>
                    ${equipo.estado_fisico || '-'}
                </div>
                <div class="mt-1">
                    <strong>Accesorios:</strong> ${formatAccesorios(equipo.accesorios)}
                </div>
                <div class="mt-1">
                    <strong>Estado Actual:</strong> ${getEstadoBadge(equipo.estado_actual)}
                </div>
            </div>
        </div>
        
        ${diagnostico ? `
            <div class="card mt-2">
                <div class="card-header">
                    <h4>Diagnóstico Técnico</h4>
                </div>
                <div class="card-body">
                    <div><strong>Técnico:</strong> ${diagnostico.tecnico}</div>
                    <div class="mt-1"><strong>Diagnóstico:</strong><br>${diagnostico.diagnostico_detallado}</div>
                    <div class="mt-1"><strong>Reparable:</strong> ${diagnostico.reparable ? '✅ Sí' : '❌ No'}</div>
                    ${diagnostico.observaciones ? `<div class="mt-1"><strong>Observaciones:</strong><br>${diagnostico.observaciones}</div>` : ''}
                    <div class="mt-1"><small>Fecha: ${formatDate(diagnostico.fecha_diagnostico)}</small></div>
                </div>
            </div>
        ` : ''}
        
        ${presupuestos.length > 0 ? `
            <div class="card mt-2">
                <div class="card-header">
                    <h4>Presupuestos</h4>
                </div>
                <div class="card-body">
                    ${presupuestos.map(p => `
                        <div style="border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-md); margin-bottom: var(--spacing-md);">
                            <div class="flex-between">
                                <strong>Presupuesto #${p.id}</strong>
                                ${getPresupuestoBadge(p.estado)}
                            </div>
                            <div class="mt-1">
                                <div>Repuestos: ${formatCurrency(p.costo_repuestos)}</div>
                                <div>Mano de Obra: ${formatCurrency(p.costo_mano_obra)}</div>
                                <div><strong>Total: ${formatCurrency(p.total)}</strong></div>
                            </div>
                            <div class="mt-1"><small>Creado: ${formatDate(p.fecha_creacion)}</small></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="card mt-2">
            <div class="card-header">
                <h4>Historial de Estados</h4>
            </div>
            <div class="card-body">
                <div class="timeline">
                    ${historial.map(h => `
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div><strong>${h.estado_nuevo.replace('_', ' ').toUpperCase()}</strong></div>
                                ${h.observaciones ? `<div>${h.observaciones}</div>` : ''}
                                <div class="timeline-date">${formatDate(h.fecha_cambio)} - ${h.usuario}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="card mt-2">
            <div class="card-header">
                <h4>📸 Fotos del Equipo</h4>
            </div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Subir Fotos</label>
                    <div style="display: flex; gap: var(--spacing-md); align-items: end;">
                        <div style="flex: 1;">
                            <input type="file" id="foto-input-${equipo.id}" accept="image/*" multiple class="form-input">
                        </div>
                        <div>
                            <select id="foto-tipo-${equipo.id}" class="form-select">
                                <option value="ingreso">Ingreso</option>
                                <option value="diagnostico">Diagnóstico</option>
                                <option value="reparacion">Reparación</option>
                                <option value="entrega">Entrega</option>
                            </select>
                        </div>
                        <div>
                            <button class="btn btn-primary" onclick="subirFotos(${equipo.id})">📤 Subir</button>
                        </div>
                    </div>
                    <small style="color: var(--text-secondary); display: block; margin-top: var(--spacing-sm);">
                        Máximo 10 fotos, 5MB cada una. Formatos: JPG, PNG, GIF, WEBP
                    </small>
                </div>
                
                <div id="galeria-fotos-${equipo.id}" class="mt-2">
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary);">
                        Cargando fotos...
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-2">
            <button class="btn btn-primary" onclick="abrirDiagnostico(${equipo.id})">📋 Cargar Diagnóstico</button>
            <button class="btn btn-primary" onclick="abrirPresupuesto(${equipo.id})">💰 Generar Presupuesto</button>
            <button class="btn btn-secondary" onclick="cambiarEstadoEquipo(${equipo.id})">🔄 Cambiar Estado</button>
        </div>
    `;

    document.getElementById('detalle-equipo-content').innerHTML = html;

    // Cargar fotos después de renderizar
    cargarFotos(equipo.id);
}

/**
 * Cambiar estado de equipo
 */
async function cambiarEstadoEquipo(equipoId) {
    const estados = [
        { value: 'ingresado', text: 'Ingresado' },
        { value: 'diagnostico', text: 'Diagnóstico' },
        { value: 'presupuestado', text: 'Presupuestado' },
        { value: 'en_reparacion', text: 'En Reparación' },
        { value: 'listo', text: 'Listo' },
        { value: 'en_camino', text: 'En Camino' },
        { value: 'entregado', text: 'Entregado' }
    ];

    const estadoSeleccionado = prompt('Seleccione nuevo estado:\n' +
        estados.map((e, i) => `${i + 1}. ${e.text}`).join('\n'));

    if (!estadoSeleccionado) return;

    const index = parseInt(estadoSeleccionado) - 1;
    if (index < 0 || index >= estados.length) {
        showToast('Estado no válido', 'warning');
        return;
    }

    const nuevoEstado = estados[index].value;
    const observaciones = prompt('Observaciones (opcional):');

    try {
        showLoading();
        await apiRequest(`/equipos/${equipoId}/cambiar-estado`, {
            method: 'POST',
            body: JSON.stringify({
                nuevo_estado: nuevoEstado,
                observaciones,
                usuario: 'Usuario'
            })
        });
        showToast('Estado actualizado exitosamente', 'success');
        await loadEquipos();
        await loadDashboard();
        closeModal('modal-detalle-equipo');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Abrir formulario de diagnóstico
 */
function abrirDiagnostico(equipoId) {
    const tecnico = prompt('Nombre del técnico:');
    if (!tecnico) return;

    const diagnostico = prompt('Diagnóstico detallado:');
    if (!diagnostico) return;

    const reparable = window.confirm('¿Es reparable?');
    const observaciones = prompt('Observaciones (opcional):');

    crearDiagnostico(equipoId, tecnico, diagnostico, reparable, observaciones);
}

/**
 * Crear diagnóstico
 */
async function crearDiagnostico(equipoId, tecnico, diagnostico, reparable, observaciones) {
    try {
        showLoading();
        await apiRequest('/diagnosticos', {
            method: 'POST',
            body: JSON.stringify({
                equipo_id: equipoId,
                tecnico,
                diagnostico_detallado: diagnostico,
                reparable,
                observaciones
            })
        });
        showToast('Diagnóstico creado exitosamente', 'success');
        await verDetalleEquipo(equipoId);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Abrir formulario de presupuesto
 */
function abrirPresupuesto(equipoId) {
    const costoRepuestos = parseFloat(prompt('Costo de repuestos (ARS):') || '0');
    const costoManoObra = parseFloat(prompt('Costo de mano de obra (ARS):') || '0');

    if (isNaN(costoRepuestos) || isNaN(costoManoObra)) {
        showToast('Valores inválidos', 'warning');
        return;
    }

    const total = costoRepuestos + costoManoObra;

    if (!window.confirm(`Total del presupuesto: ${formatCurrency(total)}\n¿Confirmar?`)) {
        return;
    }

    crearPresupuesto(equipoId, costoRepuestos, costoManoObra);
}

/**
 * Crear presupuesto
 */
async function crearPresupuesto(equipoId, costoRepuestos, costoManoObra) {
    try {
        showLoading();
        await apiRequest('/presupuestos', {
            method: 'POST',
            body: JSON.stringify({
                equipo_id: equipoId,
                costo_repuestos: costoRepuestos,
                costo_mano_obra: costoManoObra
            })
        });
        showToast('Presupuesto creado exitosamente', 'success');
        await verDetalleEquipo(equipoId);
        await loadPresupuestos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const filterEstado = document.getElementById('filter-estado');
    const filterSistema = document.getElementById('filter-sistema');

    if (filterEstado) {
        filterEstado.addEventListener('change', () => {
            loadEquipos(filterEstado.value, filterSistema.value);
        });
    }

    if (filterSistema) {
        filterSistema.addEventListener('change', () => {
            loadEquipos(filterEstado.value, filterSistema.value);
        });
    }
});
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
