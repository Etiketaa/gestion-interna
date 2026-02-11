const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ============================================
// POST /api/presupuestos
// Crear un presupuesto para un equipo
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            equipo_id,
            diagnostico_id,
            detalle_repuestos,
            costo_repuestos,
            costo_mano_obra,
            observaciones
        } = req.body;

        // Validaciones
        if (!equipo_id || costo_repuestos === undefined || costo_mano_obra === undefined) {
            return res.status(400).json({
                error: 'Campos obligatorios: equipo_id, costo_repuestos, costo_mano_obra'
            });
        }

        // Verificar que el equipo existe
        const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [equipo_id]);
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        // Calcular total
        const total = parseFloat(costo_repuestos) + parseFloat(costo_mano_obra);

        // Convertir detalle_repuestos a JSON si es array
        const detalleJson = Array.isArray(detalle_repuestos)
            ? JSON.stringify(detalle_repuestos)
            : detalle_repuestos;

        const result = await db.run(`
            INSERT INTO presupuestos (
                equipo_id, diagnostico_id, detalle_repuestos,
                costo_repuestos, costo_mano_obra, total, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            equipo_id,
            diagnostico_id || null,
            detalleJson || null,
            costo_repuestos,
            costo_mano_obra,
            total,
            observaciones || null
        ]);

        // Actualizar estado del equipo a 'presupuestado'
        await db.run('UPDATE equipos SET estado_actual = ? WHERE id = ?', ['presupuestado', equipo_id]);

        // Registrar cambio de estado
        await db.run(`
            INSERT INTO estados_historial (equipo_id, estado_anterior, estado_nuevo, observaciones, usuario)
            VALUES (?, ?, ?, ?, ?)
        `, [equipo_id, equipo.estado_actual, 'presupuestado', 'Presupuesto generado', 'Sistema']);

        const nuevoPresupuesto = await db.get('SELECT * FROM presupuestos WHERE id = ?', [result.lastID]);

        res.status(201).json({
            message: 'Presupuesto creado exitosamente',
            presupuesto: nuevoPresupuesto
        });
    } catch (error) {
        console.error('Error al crear presupuesto:', error);
        res.status(500).json({ error: 'Error al crear presupuesto' });
    }
});

// ============================================
// GET /api/presupuestos/equipo/:equipoId
// Obtener todos los presupuestos de un equipo
// ============================================
router.get('/equipo/:equipoId', async (req, res) => {
    try {
        const { equipoId } = req.params;

        const presupuestos = await db.all(
            'SELECT * FROM presupuestos WHERE equipo_id = ? ORDER BY fecha_creacion DESC',
            [equipoId]
        );

        res.json({ presupuestos });
    } catch (error) {
        console.error('Error al obtener presupuestos:', error);
        res.status(500).json({ error: 'Error al obtener presupuestos' });
    }
});

// ============================================
// GET /api/presupuestos/pendientes
// Obtener presupuestos pendientes de respuesta
// ============================================
router.get('/pendientes', async (req, res) => {
    try {
        const presupuestos = await db.all(`
            SELECT 
                p.*,
                e.marca,
                e.modelo,
                e.sistema_operativo,
                c.nombre as cliente_nombre,
                c.telefono as cliente_telefono
            FROM presupuestos p
            INNER JOIN equipos e ON p.equipo_id = e.id
            INNER JOIN clientes c ON e.cliente_id = c.id
            WHERE p.estado = 'pendiente'
            ORDER BY p.fecha_creacion DESC
        `);

        res.json({ presupuestos });
    } catch (error) {
        console.error('Error al obtener presupuestos pendientes:', error);
        res.status(500).json({ error: 'Error al obtener presupuestos pendientes' });
    }
});

// ============================================
// PUT /api/presupuestos/:id/estado
// Cambiar el estado de un presupuesto (aceptar/rechazar)
// ============================================
router.put('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, observaciones } = req.body;

        // Validar estado
        if (!['aceptado', 'rechazado'].includes(estado)) {
            return res.status(400).json({ error: 'Estado debe ser "aceptado" o "rechazado"' });
        }

        // Verificar que el presupuesto existe
        const presupuesto = await db.get('SELECT * FROM presupuestos WHERE id = ?', [id]);
        if (!presupuesto) {
            return res.status(404).json({ error: 'Presupuesto no encontrado' });
        }

        // Actualizar presupuesto
        await db.run(`
            UPDATE presupuestos SET
                estado = ?,
                fecha_respuesta = CURRENT_TIMESTAMP,
                observaciones = ?
            WHERE id = ?
        `, [estado, observaciones || presupuesto.observaciones, id]);

        // Si fue aceptado, cambiar estado del equipo a 'en_reparacion'
        if (estado === 'aceptado') {
            const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [presupuesto.equipo_id]);

            await db.run('UPDATE equipos SET estado_actual = ? WHERE id = ?', ['en_reparacion', presupuesto.equipo_id]);

            await db.run(`
                INSERT INTO estados_historial (equipo_id, estado_anterior, estado_nuevo, observaciones, usuario)
                VALUES (?, ?, ?, ?, ?)
            `, [presupuesto.equipo_id, equipo.estado_actual, 'en_reparacion', 'Presupuesto aceptado - Reparación iniciada', 'Sistema']);
        }

        const presupuestoActualizado = await db.get('SELECT * FROM presupuestos WHERE id = ?', [id]);

        res.json({
            message: `Presupuesto ${estado} exitosamente`,
            presupuesto: presupuestoActualizado
        });
    } catch (error) {
        console.error('Error al actualizar estado del presupuesto:', error);
        res.status(500).json({ error: 'Error al actualizar estado del presupuesto' });
    }
});

module.exports = router;
