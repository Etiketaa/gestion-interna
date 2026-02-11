const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ============================================
// Función para generar número de orden automático
// ============================================
async function generateOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `BH-${year}-`;

    // Obtener el último número de orden del año actual
    const lastOrder = await db.get(
        `SELECT numero_orden FROM equipos 
         WHERE numero_orden LIKE ? 
         ORDER BY numero_orden DESC LIMIT 1`,
        [`${prefix}%`]
    );

    let nextNumber = 1;
    if (lastOrder) {
        // Extraer el número y sumar 1
        const lastNumber = parseInt(lastOrder.numero_orden.split('-')[2]);
        nextNumber = lastNumber + 1;
    }

    // Formatear con ceros a la izquierda (4 dígitos)
    const orderNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
    return orderNumber;
}

// ============================================
// GET /api/equipos
// Obtener todos los equipos con filtros
// ============================================
router.get('/', async (req, res) => {
    try {
        const { estado, sistema_operativo, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT 
                e.*,
                c.nombre as cliente_nombre,
                c.telefono as cliente_telefono,
                c.direccion as cliente_direccion
            FROM equipos e
            INNER JOIN clientes c ON e.cliente_id = c.id
            WHERE 1=1
        `;
        let params = [];

        // Filtro por estado
        if (estado) {
            sql += ' AND e.estado_actual = ?';
            params.push(estado);
        }

        // Filtro por sistema operativo
        if (sistema_operativo) {
            sql += ' AND e.sistema_operativo = ?';
            params.push(sistema_operativo);
        }

        sql += ' ORDER BY e.fecha_ingreso DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const equipos = await db.all(sql, params);

        res.json({ equipos });
    } catch (error) {
        console.error('Error al obtener equipos:', error);
        res.status(500).json({ error: 'Error al obtener equipos' });
    }
});

// ============================================
// GET /api/equipos/:id
// Obtener un equipo específico con toda su información
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener equipo con datos del cliente
        const equipo = await db.get(`
            SELECT 
                e.*,
                c.nombre as cliente_nombre,
                c.telefono as cliente_telefono,
                c.direccion as cliente_direccion,
                c.email as cliente_email
            FROM equipos e
            INNER JOIN clientes c ON e.cliente_id = c.id
            WHERE e.id = ?
        `, [id]);

        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        // Obtener diagnóstico si existe
        const diagnostico = await db.get(
            'SELECT * FROM diagnosticos WHERE equipo_id = ? ORDER BY fecha_diagnostico DESC LIMIT 1',
            [id]
        );

        // Obtener presupuestos
        const presupuestos = await db.all(
            'SELECT * FROM presupuestos WHERE equipo_id = ? ORDER BY fecha_creacion DESC',
            [id]
        );

        // Obtener historial de estados
        const historial = await db.all(
            'SELECT * FROM estados_historial WHERE equipo_id = ? ORDER BY fecha_cambio ASC',
            [id]
        );

        res.json({
            equipo,
            diagnostico,
            presupuestos,
            historial
        });
    } catch (error) {
        console.error('Error al obtener equipo:', error);
        res.status(500).json({ error: 'Error al obtener equipo' });
    }
});

// ============================================
// POST /api/equipos
// Registrar un nuevo equipo
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            cliente_id,
            marca,
            modelo,
            sistema_operativo,
            imei,
            falla_reportada,
            estado_fisico,
            accesorios,
            icloud_status,
            biometria_tipo
        } = req.body;

        // Validaciones
        if (!cliente_id || !marca || !modelo || !sistema_operativo || !falla_reportada) {
            return res.status(400).json({
                error: 'Campos obligatorios: cliente_id, marca, modelo, sistema_operativo, falla_reportada'
            });
        }

        // Verificar que el cliente existe
        const cliente = await db.get('SELECT id FROM clientes WHERE id = ? AND activo = 1', [cliente_id]);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Validar sistema operativo
        if (!['Android', 'iOS'].includes(sistema_operativo)) {
            return res.status(400).json({ error: 'Sistema operativo debe ser Android o iOS' });
        }

        // Generar número de orden automático
        const numeroOrden = await generateOrderNumber();

        // Convertir accesorios a JSON si es array
        const accesoriosJson = Array.isArray(accesorios) ? JSON.stringify(accesorios) : accesorios;

        const result = await db.run(`
            INSERT INTO equipos (
                cliente_id, marca, modelo, sistema_operativo, imei,
                falla_reportada, estado_fisico, accesorios,
                icloud_status, biometria_tipo, numero_orden
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            cliente_id, marca, modelo, sistema_operativo, imei || null,
            falla_reportada, estado_fisico || null, accesoriosJson || null,
            icloud_status || null, biometria_tipo || null, numeroOrden
        ]);

        // Registrar en historial
        await db.run(`
            INSERT INTO estados_historial (equipo_id, estado_anterior, estado_nuevo, observaciones, usuario)
            VALUES (?, NULL, 'ingresado', 'Equipo recibido en local', 'Sistema')
        `, [result.lastID]);

        const nuevoEquipo = await db.get('SELECT * FROM equipos WHERE id = ?', [result.lastID]);

        res.status(201).json({
            message: 'Equipo registrado exitosamente',
            equipo: nuevoEquipo
        });
    } catch (error) {
        console.error('Error al registrar equipo:', error);
        res.status(500).json({ error: 'Error al registrar equipo' });
    }
});

// ============================================
// PUT /api/equipos/:id
// Actualizar información de un equipo
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            marca,
            modelo,
            imei,
            falla_reportada,
            estado_fisico,
            accesorios,
            icloud_status,
            biometria_tipo
        } = req.body;

        // Verificar que el equipo existe
        const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [id]);
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        // Convertir accesorios a JSON si es array
        const accesoriosJson = Array.isArray(accesorios) ? JSON.stringify(accesorios) : accesorios;

        await db.run(`
            UPDATE equipos SET
                marca = ?, modelo = ?, imei = ?, falla_reportada = ?,
                estado_fisico = ?, accesorios = ?, icloud_status = ?, biometria_tipo = ?
            WHERE id = ?
        `, [
            marca || equipo.marca,
            modelo || equipo.modelo,
            imei !== undefined ? imei : equipo.imei,
            falla_reportada || equipo.falla_reportada,
            estado_fisico !== undefined ? estado_fisico : equipo.estado_fisico,
            accesoriosJson !== undefined ? accesoriosJson : equipo.accesorios,
            icloud_status !== undefined ? icloud_status : equipo.icloud_status,
            biometria_tipo !== undefined ? biometria_tipo : equipo.biometria_tipo,
            id
        ]);

        const equipoActualizado = await db.get('SELECT * FROM equipos WHERE id = ?', [id]);

        res.json({
            message: 'Equipo actualizado exitosamente',
            equipo: equipoActualizado
        });
    } catch (error) {
        console.error('Error al actualizar equipo:', error);
        res.status(500).json({ error: 'Error al actualizar equipo' });
    }
});

// ============================================
// POST /api/equipos/:id/cambiar-estado
// Cambiar el estado de un equipo
// ============================================
router.post('/:id/cambiar-estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevo_estado, observaciones, usuario = 'Sistema' } = req.body;

        // Verificar que el equipo existe
        const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [id]);
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        // Validar estado
        const estadosValidos = ['ingresado', 'diagnostico', 'presupuestado', 'en_reparacion', 'listo', 'en_camino', 'entregado'];
        if (!estadosValidos.includes(nuevo_estado)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }

        const estadoAnterior = equipo.estado_actual;

        // Actualizar estado del equipo
        await db.run('UPDATE equipos SET estado_actual = ? WHERE id = ?', [nuevo_estado, id]);

        // Si el estado es 'entregado', registrar fecha de entrega
        if (nuevo_estado === 'entregado') {
            await db.run('UPDATE equipos SET fecha_entrega = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        }

        // Registrar en historial
        await db.run(`
            INSERT INTO estados_historial (equipo_id, estado_anterior, estado_nuevo, observaciones, usuario)
            VALUES (?, ?, ?, ?, ?)
        `, [id, estadoAnterior, nuevo_estado, observaciones || null, usuario]);

        const equipoActualizado = await db.get('SELECT * FROM equipos WHERE id = ?', [id]);

        res.json({
            message: 'Estado actualizado exitosamente',
            equipo: equipoActualizado
        });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
});

// ============================================
// GET /api/equipos/:id/historial
// Obtener historial completo de un equipo
// ============================================
router.get('/:id/historial', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el equipo existe
        const equipo = await db.get('SELECT id FROM equipos WHERE id = ?', [id]);
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const historial = await db.all(
            'SELECT * FROM estados_historial WHERE equipo_id = ? ORDER BY fecha_cambio ASC',
            [id]
        );

        res.json({ historial });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

module.exports = router;
