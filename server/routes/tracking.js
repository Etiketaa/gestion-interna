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
        const ordenUpper = numeroOrden.toUpperCase();

        // 1. Buscar en New System (cot_cotizaciones)
        let quote = await db.get(`SELECT * FROM cot_cotizaciones WHERE orden = ?`, [ordenUpper]);
        
        let result = {};
        let internalId = null;

        if (quote) {
            internalId = quote.id;
            result.equipo = {
                numero_orden: quote.orden,
                cliente_nombre: quote.cliente_nombre,
                marca_modelo: quote.equipo_desc,
                estado_actual: quote.estado.toLowerCase().replace(/ /g, '_'),
                fecha_ingreso: quote.fecha,
                total: quote.total,
                servicios: quote.servicios ? JSON.parse(quote.servicios) : []
            };
        } else {
            // 2. Fallback to Old System (equipos)
            const equipo = await db.get(`
                SELECT e.*, c.nombre as cliente_nombre 
                FROM equipos e 
                INNER JOIN clientes c ON e.cliente_id = c.id 
                WHERE e.numero_orden = ?`, [ordenUpper]);
            
            if (!equipo) {
                return res.status(404).json({ error: 'Orden no encontrada' });
            }
            internalId = equipo.id;
            result.equipo = {
                numero_orden: equipo.numero_orden,
                cliente_nombre: equipo.cliente_nombre,
                marca_modelo: `${equipo.marca} ${equipo.modelo}`,
                estado_actual: equipo.estado_actual,
                fecha_ingreso: equipo.fecha_ingreso,
                total: 0 // Old system had separate budget table
            };
        }

        // 3. Obtener Historial (de estados_historial)
        // Buscamos por el ID interno (sea de cot_cotizaciones o de equipos)
        // NOTA: Para el nuevo sistema, guardaremos el historial usando el ID de cot_cotizaciones
        result.historial = await db.all(`
            SELECT estado_nuevo, observaciones, fecha_cambio 
            FROM estados_historial 
            WHERE equipo_id = ? 
            ORDER BY fecha_cambio ASC`, [internalId]);

        // 4. Obtener Fotos
        result.fotos = await db.all(`
            SELECT id, tipo, ruta_archivo as url, descripcion, fecha_subida 
            FROM fotos 
            WHERE equipo_id = ? 
            ORDER BY fecha_subida ASC`, [internalId]);

        res.json(result);
    } catch (error) {
        console.error('Error en tracking unificado:', error);
        res.status(500).json({ error: 'Error al consultar el servicio' });
    }
});

module.exports = router;
