const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ============================================
// GET /api/tracking/:numeroOrden
// Consulta pública de estado de reparación
// ============================================
router.get('/:numeroOrden', async (req, res) => {
    try {
        const { numeroOrden } = req.params;

        // Buscar equipo por número de orden
        const equipo = await db.get(`
            SELECT 
                e.numero_orden,
                e.marca,
                e.modelo,
                e.sistema_operativo,
                e.estado_actual,
                e.fecha_ingreso,
                e.fecha_entrega,
                c.nombre as cliente_nombre
            FROM equipos e
            INNER JOIN clientes c ON e.cliente_id = c.id
            WHERE e.numero_orden = ?
        `, [numeroOrden.toUpperCase()]);

        if (!equipo) {
            return res.status(404).json({
                error: 'Número de orden no encontrado',
                message: 'Verifique que el número de orden sea correcto'
            });
        }

        // Obtener historial de estados
        const historial = await db.all(`
            SELECT 
                estado_nuevo,
                observaciones,
                fecha_cambio
            FROM estados_historial
            WHERE equipo_id = (SELECT id FROM equipos WHERE numero_orden = ?)
            ORDER BY fecha_cambio ASC
        `, [numeroOrden.toUpperCase()]);

        // Obtener presupuesto si existe
        const presupuesto = await db.get(`
            SELECT 
                total,
                estado,
                fecha_creacion
            FROM presupuestos
            WHERE equipo_id = (SELECT id FROM equipos WHERE numero_orden = ?)
            AND estado != 'rechazado'
            ORDER BY fecha_creacion DESC
            LIMIT 1
        `, [numeroOrden.toUpperCase()]);

        res.json({
            equipo,
            historial,
            presupuesto
        });
    } catch (error) {
        console.error('Error en tracking:', error);
        res.status(500).json({ error: 'Error al consultar el estado' });
    }
});

module.exports = router;
