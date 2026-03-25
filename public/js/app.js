// ============================================
// APLICACIÓN PRINCIPAL
// ============================================

let currentPage = 'dashboard';

/**
 * Inicializar aplicación
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación antes de cargar el panel
    if (!checkAuth()) return;

    console.log('🏠 Bit House - Sistema de Gestión Iniciado');

    // Mostrar info del usuario autenticado
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl && user.username) {
        userInfoEl.textContent = `👤 ${user.username}`;
    }

    // Configurar navegación
    setupNavigation();

    // Cargar datos iniciales
    await loadDashboard();
    await loadClientesSelect();

    // Mostrar página inicial
    showPage('dashboard');
});

/**
 * Configurar navegación
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showPage(page);
        });
    });
}

/**
 * Mostrar página
 */
async function showPage(pageName) {
    // Ocultar todas las páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Mostrar página seleccionada
    const page = document.getElementById(`page-${pageName}`);
    if (page) {
        page.classList.add('active');
    }

    // Actualizar navegación activa
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });

    currentPage = pageName;

    // Cargar datos según la página
    switch (pageName) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'clientes':
            await loadClientes();
            break;
        case 'equipos':
            await loadEquipos();
            break;
        case 'presupuestos':
            await loadPresupuestos();
            break;
        case 'retiros-entregas':
            await loadRetirosEntregas();
            break;
    }
}

/**
 * Cargar dashboard
 */
async function loadDashboard() {
    try {
        // Cargar estadísticas
        const estadosData = await apiRequest('/estados/equipos');
        renderDashboardStats(estadosData.estadisticas);
        renderDashboardEquipos(estadosData.equipos_por_estado);
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
}

/**
 * Renderizar estadísticas del dashboard
 */
function renderDashboardStats(estadisticas) {
    const container = document.getElementById('stats-container');
    if (!container) return;

    // Agrupar por estado
    const stats = {};
    estadisticas.forEach(stat => {
        if (!stats[stat.estado_actual]) {
            stats[stat.estado_actual] = { total: 0, android: 0, ios: 0 };
        }
        stats[stat.estado_actual].total += stat.cantidad;
        if (stat.sistema_operativo === 'Android') {
            stats[stat.estado_actual].android = stat.cantidad;
        } else {
            stats[stat.estado_actual].ios = stat.cantidad;
        }
    });

    const estadosConfig = [
        { key: 'ingresado', label: 'Ingresados', icon: '📥', color: '#94a3b8' },
        { key: 'diagnostico', label: 'En Diagnóstico', icon: '🔍', color: '#3b82f6' },
        { key: 'presupuestado', label: 'Presupuestados', icon: '💰', color: '#f59e0b' },
        { key: 'en_reparacion', label: 'En Reparación', icon: '🔧', color: '#8b5cf6' },
        { key: 'listo', label: 'Listos', icon: '✅', color: '#10b981' },
        { key: 'en_camino', label: 'En Camino', icon: '🚚', color: '#06b6d4' }
    ];

    container.innerHTML = estadosConfig.map(estado => {
        const data = stats[estado.key] || { total: 0, android: 0, ios: 0 };
        return `
            <div class="stat-card" style="border-left-color: ${estado.color};">
                <div class="stat-header">
                    <div>
                        <div class="stat-value">${data.total}</div>
                        <div class="stat-label">${estado.label}</div>
                    </div>
                    <div class="stat-icon" style="background: ${estado.color}20; color: ${estado.color};">
                        ${estado.icon}
                    </div>
                </div>
                ${data.total > 0 ? `
                    <div style="margin-top: var(--spacing-sm); font-size: var(--font-size-xs); color: var(--text-secondary);">
                        🤖 ${data.android} Android | 🍎 ${data.ios} iOS
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Renderizar equipos del dashboard
 */
function renderDashboardEquipos(equiposPorEstado) {
    const tbody = document.getElementById('dashboard-equipos-body');
    if (!tbody) return;

    // Obtener todos los equipos excepto entregados
    const equipos = [];
    Object.keys(equiposPorEstado).forEach(estado => {
        if (estado !== 'entregado') {
            equipos.push(...equiposPorEstado[estado]);
        }
    });

    // Ordenar por fecha de ingreso (más recientes primero)
    equipos.sort((a, b) => new Date(b.fecha_ingreso) - new Date(a.fecha_ingreso));

    // Mostrar solo los 10 más recientes
    const equiposRecientes = equipos.slice(0, 10);

    if (equiposRecientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay equipos en proceso</td></tr>';
        return;
    }

    tbody.innerHTML = equiposRecientes.map(equipo => `
        <tr>
            <td><strong>${equipo.cliente_nombre}</strong><br><small>${equipo.cliente_telefono}</small></td>
            <td>${equipo.marca} ${equipo.modelo}</td>
            <td>${getSOBadge(equipo.sistema_operativo)}</td>
            <td>${getEstadoBadge(equipo.estado_actual)}</td>
            <td><small>${formatDateShort(equipo.fecha_ingreso)}</small></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="verDetalleEquipo(${equipo.id})">Ver</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Cargar presupuestos
 */
async function loadPresupuestos() {
    try {
        const data = await apiRequest('/presupuestos/pendientes');
        renderPresupuestosTable(data.presupuestos);
    } catch (error) {
        showToast('Error al cargar presupuestos', 'error');
    }
}

/**
 * Renderizar tabla de presupuestos
 */
function renderPresupuestosTable(presupuestos) {
    const tbody = document.getElementById('presupuestos-table-body');
    if (!tbody) return;

    if (presupuestos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay presupuestos pendientes</td></tr>';
        return;
    }

    tbody.innerHTML = presupuestos.map(p => `
        <tr>
            <td><strong>${p.cliente_nombre}</strong><br><small>${p.cliente_telefono}</small></td>
            <td>${p.marca} ${p.modelo}</td>
            <td>${getSOBadge(p.sistema_operativo)}</td>
            <td>${formatCurrency(p.costo_repuestos)}</td>
            <td>${formatCurrency(p.costo_mano_obra)}</td>
            <td><strong>${formatCurrency(p.total)}</strong></td>
            <td><small>${formatDateShort(p.fecha_creacion)}</small></td>
            <td>
                <button class="btn btn-sm btn-success" onclick="aprobarPresupuesto(${p.id})">✓</button>
                <button class="btn btn-sm btn-danger" onclick="rechazarPresupuesto(${p.id})">✗</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Aprobar presupuesto
 */
async function aprobarPresupuesto(presupuestoId) {
    if (!window.confirm('¿Confirmar aprobación del presupuesto?')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/presupuestos/${presupuestoId}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: 'aceptado' })
        });
        showToast('Presupuesto aprobado - Equipo en reparación', 'success');
        await loadPresupuestos();
        await loadDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Rechazar presupuesto
 */
async function rechazarPresupuesto(presupuestoId) {
    const motivo = prompt('Motivo del rechazo (opcional):');

    try {
        showLoading();
        await apiRequest(`/presupuestos/${presupuestoId}/estado`, {
            method: 'PUT',
            body: JSON.stringify({
                estado: 'rechazado',
                observaciones: motivo
            })
        });
        showToast('Presupuesto rechazado', 'info');
        await loadPresupuestos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Cargar retiros y entregas
 */
async function loadRetirosEntregas() {
    try {
        const data = await apiRequest('/estados/retiros-entregas/pendientes');
        renderRetirosEntregasTable(data.pendientes);
    } catch (error) {
        showToast('Error al cargar retiros/entregas', 'error');
    }
}

/**
 * Renderizar tabla de retiros/entregas
 */
function renderRetirosEntregasTable(pendientes) {
    const tbody = document.getElementById('retiros-entregas-table-body');
    if (!tbody) return;

    if (pendientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay retiros/entregas pendientes</td></tr>';
        return;
    }

    tbody.innerHTML = pendientes.map(re => `
        <tr>
            <td>
                <span class="badge ${re.tipo === 'retiro' ? 'badge-info' : 'badge-success'}">
                    ${re.tipo === 'retiro' ? '📥 Retiro' : '📤 Entrega'}
                </span>
            </td>
            <td><strong>${re.cliente_nombre}</strong><br><small>${re.cliente_telefono}</small></td>
            <td>${re.marca} ${re.modelo} ${getSOBadge(re.sistema_operativo)}</td>
            <td>${re.direccion}</td>
            <td>${re.fecha_programada ? formatDate(re.fecha_programada) : 'Sin programar'}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="marcarRealizado(${re.id})">✓ Realizado</button>
                <button class="btn btn-sm btn-danger" onclick="cancelarRetiroEntrega(${re.id})">✗ Cancelar</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Marcar retiro/entrega como realizado
 */
async function marcarRealizado(id) {
    const observaciones = prompt('Observaciones (opcional):');

    try {
        showLoading();
        await apiRequest(`/estados/retiros-entregas/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                estado: 'realizado',
                observaciones
            })
        });
        showToast('Marcado como realizado', 'success');
        await loadRetirosEntregas();
        await loadDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Cancelar retiro/entrega
 */
async function cancelarRetiroEntrega(id) {
    if (!window.confirm('¿Confirmar cancelación?')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/estados/retiros-entregas/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ estado: 'cancelado' })
        });
        showToast('Cancelado', 'info');
        await loadRetirosEntregas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Cerrar modales al hacer clic fuera
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
