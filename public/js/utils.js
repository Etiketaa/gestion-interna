// ============================================
// UTILIDADES GENERALES
// ============================================

// Detectar automáticamente si estamos en producción o desarrollo
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`;

/**
 * Realizar petición a la API
 */
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en la petición');
        }

        return data;
    } catch (error) {
        console.error('Error en API:', error);
        throw error;
    }
}

/**
 * Mostrar notificación toast
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Formatear fecha
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Formatear fecha corta
 */
function formatDateShort(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Formatear moneda argentina
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(amount);
}

/**
 * Obtener badge de sistema operativo
 */
function getSOBadge(sistema) {
    const className = sistema === 'Android' ? 'badge-android' : 'badge-ios';
    const icon = sistema === 'Android' ? '🤖' : '🍎';
    return `<span class="badge ${className}">${icon} ${sistema}</span>`;
}

/**
 * Obtener badge de estado
 */
function getEstadoBadge(estado) {
    const estados = {
        'ingresado': { text: 'Ingresado', class: 'badge-ingresado' },
        'diagnostico': { text: 'Diagnóstico', class: 'badge-diagnostico' },
        'presupuestado': { text: 'Presupuestado', class: 'badge-presupuestado' },
        'en_reparacion': { text: 'En Reparación', class: 'badge-en-reparacion' },
        'listo': { text: 'Listo', class: 'badge-listo' },
        'en_camino': { text: 'En Camino', class: 'badge-en-camino' },
        'entregado': { text: 'Entregado', class: 'badge-entregado' }
    };

    const estadoInfo = estados[estado] || { text: estado, class: 'badge-ingresado' };
    return `<span class="badge ${estadoInfo.class}">${estadoInfo.text}</span>`;
}

/**
 * Obtener badge de presupuesto
 */
function getPresupuestoBadge(estado) {
    const estados = {
        'pendiente': { text: 'Pendiente', class: 'badge-pendiente' },
        'aceptado': { text: 'Aceptado', class: 'badge-aceptado' },
        'rechazado': { text: 'Rechazado', class: 'badge-rechazado' }
    };

    const estadoInfo = estados[estado] || { text: estado, class: 'badge-pendiente' };
    return `<span class="badge ${estadoInfo.class}">${estadoInfo.text}</span>`;
}

/**
 * Abrir modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Cerrar modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Limpiar formulario si existe
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            // Limpiar campos hidden
            const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
            hiddenInputs.forEach(input => input.value = '');
        }
    }
}

/**
 * Parsear accesorios (de string separado por comas a array)
 */
function parseAccesorios(accesoriosString) {
    if (!accesoriosString) return [];
    return accesoriosString.split(',').map(a => a.trim()).filter(a => a);
}

/**
 * Formatear accesorios para mostrar
 */
function formatAccesorios(accesoriosJson) {
    if (!accesoriosJson) return '-';
    try {
        const accesorios = JSON.parse(accesoriosJson);
        return accesorios.join(', ');
    } catch {
        return accesoriosJson;
    }
}

/**
 * Mostrar loading
 */
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
}

/**
 * Ocultar loading
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}
