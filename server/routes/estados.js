const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ============================================
// GET /api/estados/equipos
// Dashboard de equipos agrupados por estado
// ============================================
router.get('/equipos', async (req, res) => {
    try {
        // Obtener conteo por estado
        const estadisticas = await db.all(`
            SELECT 
                estado_actual,
                sistema_operativo,
                COUNT(*) as cantidad
            FROM equipos
            GROUP BY estado_actual, sistema_operativo
            ORDER BY estado_actual
        `);

        // Obtener equipos por estado con información del cliente
        const equiposPorEstado = await db.all(`
            SELECT 
                e.*,
                c.nombre as cliente_nombre,
                c.telefono as cliente_telefono
            FROM equipos e
            INNER JOIN clientes c ON e.cliente_id = c.id
            WHERE e.estado_actual != 'entregado'
            ORDER BY e.fecha_ingreso DESC
        `);

        // Agrupar por estado
        const agrupados = {};
        equiposPorEstado.forEach(equipo => {
            if (!agrupados[equipo.estado_actual]) {
                agrupados[equipo.estado_actual] = [];
            }
            agrupados[equipo.estado_actual].push(equipo);
        });

        res.json({
            estadisticas,
            equipos_por_estado: agrupados
        });
    } catch (error) {
        console.error('Error al obtener dashboard de estados:', error);
        res.status(500).json({ error: 'Error al obtener dashboard de estados' });
    }
});

// ============================================
// POST /api/retiros
// Programar retiro a domicilio
// ============================================
router.post('/retiros', async (req, res) => {
    try {
        const { equipo_id, direccion, fecha_programada, observaciones } = req.body;

        // Validaciones
        if (!equipo_id || !direccion) {
            return res.status(400).json({ error: 'Campos obligatorios: equipo_id, direccion' });
        }

        // Verificar que el equipo existe
        const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [equipo_id]);
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const result = await db.run(`
            INSERT INTO retiros_entregas (equipo_id, tipo, direccion, fecha_programada, observaciones)
            VALUES (?, 'retiro', ?, ?, ?)
        `, [equipo_id, direccion, fecha_programada || null, observaciones || null]);

        const nuevoRetiro = await db.get('SELECT * FROM retiros_entregas WHERE id = ?', [result.lastID]);

        res.status(201).json({
            message: 'Retiro programado exitosamente',
            retiro: nuevoRetiro
        });
    } catch (error) {
        console.error('Error al programar retiro:', error);
        res.status(500).json({ error: 'Error al programar retiro' });
    }
});

// ============================================
// POST /api/entregas
// Programar entrega a domicilio
// ============================================
router.post('/entregas', async (req, res) => {
    try {
        const { equipo_id, direccion, fecha_programada, observaciones } = req.body;

        // Validaciones
        if (!equipo_id || !direccion) {
            return res.status(400).json({ error: 'Campos obligatorios: equipo_id, direccion' });
        }

        // Verificar que el equipo existe y está listo
        const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [equipo_id]);
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        if (equipo.estado_actual !== 'listo') {
            return res.status(400).json({
                error: 'El equipo debe estar en estado "listo" para programar entrega'
            });
        }

        const result = await db.run(`
            INSERT INTO retiros_entregas (equipo_id, tipo, direccion, fecha_programada, observaciones)
            VALUES (?, 'entrega', ?, ?, ?)
        `, [equipo_id, direccion, fecha_programada || null, observaciones || null]);

        // Actualizar estado del equipo a 'en_camino'
        await db.run('UPDATE equipos SET estado_actual = ? WHERE id = ?', ['en_camino', equipo_id]);

        // Registrar cambio de estado
        await db.run(`
            INSERT INTO estados_historial (equipo_id, estado_anterior, estado_nuevo, observaciones, usuario)
            VALUES (?, ?, ?, ?, ?)
        `, [equipo_id, equipo.estado_actual, 'en_camino', 'Entrega programada', 'Sistema']);

        const nuevaEntrega = await db.get('SELECT * FROM retiros_entregas WHERE id = ?', [result.lastID]);

        res.status(201).json({
            message: 'Entrega programada exitosamente',
            entrega: nuevaEntrega
        });
    } catch (error) {
        console.error('Error al programar entrega:', error);
        res.status(500).json({ error: 'Error al programar entrega' });
    }
});

// ============================================
// GET /api/retiros-entregas/pendientes
// Obtener retiros y entregas pendientes
// ============================================
router.get('/retiros-entregas/pendientes', async (req, res) => {
    try {
        const { tipo } = req.query;

        let sql = `
            SELECT 
                re.*,
                e.marca,
                e.modelo,
                e.sistema_operativo,
                c.nombre as cliente_nombre,
                c.telefono as cliente_telefono
            FROM retiros_entregas re
            INNER JOIN equipos e ON re.equipo_id = e.id
            INNER JOIN clientes c ON e.cliente_id = c.id
            WHERE re.estado = 'pendiente'
        `;

        const params = [];
        if (tipo) {
            sql += ' AND re.tipo = ?';
            params.push(tipo);
        }

        sql += ' ORDER BY re.fecha_programada ASC';

        const pendientes = await db.all(sql, params);

        res.json({ pendientes });
    } catch (error) {
        console.error('Error al obtener retiros/entregas pendientes:', error);
        res.status(500).json({ error: 'Error al obtener retiros/entregas pendientes' });
    }
});

// ============================================
// PUT /api/retiros-entregas/:id
// Marcar retiro/entrega como realizado
// ============================================
router.put('/retiros-entregas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, observaciones } = req.body;

        // Validar estado
        if (!['realizado', 'cancelado'].includes(estado)) {
            return res.status(400).json({ error: 'Estado debe ser "realizado" o "cancelado"' });
        }

        // Verificar que existe
        const retiroEntrega = await db.get('SELECT * FROM retiros_entregas WHERE id = ?', [id]);
        if (!retiroEntrega) {
            return res.status(404).json({ error: 'Retiro/Entrega no encontrado' });
        }

        // Actualizar
        await db.run(`
            UPDATE retiros_entregas SET
                estado = ?,
                fecha_realizada = CURRENT_TIMESTAMP,
                observaciones = ?
            WHERE id = ?
        `, [estado, observaciones || retiroEntrega.observaciones, id]);

        // Si es una entrega realizada, marcar equipo como entregado
        if (retiroEntrega.tipo === 'entrega' && estado === 'realizado') {
            const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [retiroEntrega.equipo_id]);

            await db.run(`
                UPDATE equipos SET 
                    estado_actual = 'entregado',
                    fecha_entrega = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [retiroEntrega.equipo_id]);

            await db.run(`
                INSERT INTO estados_historial (equipo_id, estado_anterior, estado_nuevo, observaciones, usuario)
                VALUES (?, ?, ?, ?, ?)
            `, [retiroEntrega.equipo_id, equipo.estado_actual, 'entregado', 'Equipo entregado al cliente', 'Sistema']);
        }

        const actualizado = await db.get('SELECT * FROM retiros_entregas WHERE id = ?', [id]);

        res.json({
            message: `${retiroEntrega.tipo === 'retiro' ? 'Retiro' : 'Entrega'} marcado como ${estado}`,
            retiro_entrega: actualizado
        });
    } catch (error) {
        console.error('Error al actualizar retiro/entrega:', error);
        res.status(500).json({ error: 'Error al actualizar retiro/entrega' });
    }
});

module.exports = router;
