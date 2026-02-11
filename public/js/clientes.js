// ============================================
// GESTIÓN DE CLIENTES
// ============================================

let clientesData = [];

/**
 * Cargar clientes
 */
async function loadClientes(search = '') {
    try {
        const data = await apiRequest(`/clientes?search=${search}&limit=100`);
        clientesData = data.clientes;
        renderClientesTable();
    } catch (error) {
        showToast('Error al cargar clientes', 'error');
    }
}

/**
 * Renderizar tabla de clientes
 */
function renderClientesTable() {
    const tbody = document.getElementById('clientes-table-body');
    if (!tbody) return;

    if (clientesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay clientes registrados</td></tr>';
        return;
    }

    tbody.innerHTML = clientesData.map(cliente => `
        <tr>
            <td><strong>${cliente.nombre}</strong></td>
            <td>${cliente.telefono}</td>
            <td>${cliente.direccion || '-'}</td>
            <td>${cliente.email || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="verEquiposCliente(${cliente.id})">
                    Ver Equipos
                </button>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editCliente(${cliente.id})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCliente(${cliente.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Abrir modal de cliente
 */
function openClienteModal(clienteId = null) {
    const modal = document.getElementById('modal-cliente');
    const title = document.getElementById('modal-cliente-title');
    const form = document.getElementById('form-cliente');

    form.reset();
    document.getElementById('cliente-id').value = '';

    if (clienteId) {
        title.textContent = 'Editar Cliente';
        const cliente = clientesData.find(c => c.id === clienteId);
        if (cliente) {
            document.getElementById('cliente-id').value = cliente.id;
            document.getElementById('cliente-nombre').value = cliente.nombre;
            document.getElementById('cliente-telefono').value = cliente.telefono;
            document.getElementById('cliente-email').value = cliente.email || '';
            document.getElementById('cliente-direccion').value = cliente.direccion || '';
            document.getElementById('cliente-notas').value = cliente.notas || '';
        }
    } else {
        title.textContent = 'Nuevo Cliente';
    }

    openModal('modal-cliente');
}

/**
 * Guardar cliente
 */
async function saveCliente() {
    const id = document.getElementById('cliente-id').value;
    const nombre = document.getElementById('cliente-nombre').value.trim();
    const telefono = document.getElementById('cliente-telefono').value.trim();
    const email = document.getElementById('cliente-email').value.trim();
    const direccion = document.getElementById('cliente-direccion').value.trim();
    const notas = document.getElementById('cliente-notas').value.trim();

    if (!nombre || !telefono) {
        showToast('Nombre y teléfono son obligatorios', 'warning');
        return;
    }

    const clienteData = {
        nombre,
        telefono,
        email: email || null,
        direccion: direccion || null,
        notas: notas || null
    };

    try {
        showLoading();

        if (id) {
            await apiRequest(`/clientes/${id}`, {
                method: 'PUT',
                body: JSON.stringify(clienteData)
            });
            showToast('Cliente actualizado exitosamente', 'success');
        } else {
            await apiRequest('/clientes', {
                method: 'POST',
                body: JSON.stringify(clienteData)
            });
            showToast('Cliente creado exitosamente', 'success');
        }

        closeModal('modal-cliente');
        await loadClientes();
        await loadClientesSelect(); // Actualizar select de equipos
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Editar cliente
 */
function editCliente(id) {
    openClienteModal(id);
}

/**
 * Eliminar cliente
 */
async function deleteCliente(id) {
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/clientes/${id}`, { method: 'DELETE' });
        showToast('Cliente eliminado exitosamente', 'success');
        await loadClientes();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Ver equipos de un cliente
 */
async function verEquiposCliente(clienteId) {
    // Cambiar a página de equipos y filtrar por cliente
    showPage('equipos');
    // Aquí podrías implementar un filtro adicional por cliente
}

/**
 * Cargar clientes en select (para formulario de equipos)
 */
async function loadClientesSelect() {
    try {
        const data = await apiRequest('/clientes?limit=1000');
        const select = document.getElementById('equipo-cliente');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar cliente...</option>' +
            data.clientes.map(c => `<option value="${c.id}">${c.nombre} - ${c.telefono}</option>`).join('');
    } catch (error) {
        console.error('Error al cargar clientes para select:', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-clientes');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            loadClientes(e.target.value);
        });
    }
});
