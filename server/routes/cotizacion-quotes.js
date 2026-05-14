const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/cotizacion/cotizaciones
router.get('/', async (req, res) => {
    try {
        const quotes = await db.all('SELECT * FROM cot_cotizaciones ORDER BY fecha DESC');
        const result = quotes.map(q => ({
            id: q.id, orden: q.orden, cliente: q.cliente_nombre, equipo: q.equipo_desc,
            servicios: q.servicios ? JSON.parse(q.servicios) : [],
            total: parseFloat(q.total), estado: q.estado, fecha: q.fecha
        }));
        res.json(result);
    } catch (err) {
        console.error('Error GET cotizaciones:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/cotizacion/cotizaciones/counter
router.get('/counter', async (req, res) => {
    try {
        const row = await db.get("SELECT value FROM cot_config WHERE key='orderCounter'");
        res.json({ counter: row ? parseInt(row.value) : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/cotizacion/cotizaciones
router.post('/', async (req, res) => {
    try {
        const { 
            orden, cliente_nombre, equipo_desc, servicios, total, estado,
            telefono, whatsapp, email, rut, marca, imei, color,
            motivo_cliente, motivo_tecnico, observaciones,
            garantia_periodo, garantia_observaciones, accesorios
        } = req.body;
        
        if (!orden) return res.status(400).json({ error: 'Número de orden es obligatorio' });

        const result = await db.run(`
            INSERT INTO cot_cotizaciones (
                orden, cliente_nombre, equipo_desc, servicios, total, estado,
                telefono, whatsapp, email, rut, marca, imei, color,
                motivo_cliente, motivo_tecnico, observaciones,
                garantia_periodo, garantia_observaciones, accesorios
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `, [
            orden, cliente_nombre || '', equipo_desc || '', JSON.stringify(servicios || []), total || 0, estado || 'Pendiente',
            telefono || '', whatsapp || '', email || '', rut || '', marca || '', imei || '', color || '',
            motivo_cliente || '', motivo_tecnico || '', observaciones || '',
            garantia_periodo || '', garantia_observaciones || '', JSON.stringify(accesorios || [])
        ]);

        // Increment counter
        const current = await db.get("SELECT value FROM cot_config WHERE key='orderCounter'");
        const newCount = current ? parseInt(current.value) + 1 : 1;
        await db.run(
            "INSERT INTO cot_config (key, value) VALUES ('orderCounter', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            [String(newCount)]
        );

        res.json({ message: 'Cotización guardada', id: result.lastID, orden });
    } catch (err) {
        console.error('Error POST cotización:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/cotizacion/cotizaciones/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            cliente_nombre, equipo_desc, servicios, total, estado,
            telefono, whatsapp, email, rut, marca, imei, color,
            motivo_cliente, motivo_tecnico, observaciones,
            garantia_periodo, garantia_observaciones, accesorios
        } = req.body;

        await db.run(`
            UPDATE cot_cotizaciones SET 
                cliente_nombre=?, equipo_desc=?, servicios=?, total=?, estado=?,
                telefono=?, whatsapp=?, email=?, rut=?, marca=?, imei=?, color=?,
                motivo_cliente=?, motivo_tecnico=?, observaciones=?,
                garantia_periodo=?, garantia_observaciones=?, accesorios=?
            WHERE id=?
        `, [
            cliente_nombre, equipo_desc, JSON.stringify(servicios || []), total, estado,
            telefono, whatsapp, email, rut, marca, imei, color,
            motivo_cliente, motivo_tecnico, observaciones,
            garantia_periodo, garantia_observaciones, JSON.stringify(accesorios || []),
            id
        ]);

        res.json({ message: 'Cotización actualizada', id });
    } catch (err) {
        console.error('Error PUT cotización:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/cotizacion/cotizaciones/:id/estado (Mantener para cambios rápidos)
router.put('/:id/estado', async (req, res) => {
    try {
        const { estado, observaciones } = req.body;
        const quoteId = req.params.id;

        // 1. Obtener estado anterior
        const old = await db.get('SELECT estado, orden FROM cot_cotizaciones WHERE id=?', [quoteId]);
        
        // 2. Actualizar estado principal
        await db.run('UPDATE cot_cotizaciones SET estado=? WHERE id=?', [estado, quoteId]);

        // 3. Registrar en historial (para el tracking)
        await db.run(`
            INSERT INTO estados_historial (equipo_id, estado_anterior, estado_nuevo, observaciones, usuario)
            VALUES (?, ?, ?, ?, ?)
        `, [quoteId, old ? old.estado : null, estado, observaciones || 'Actualización de sistema', 'Admin']);

        // 4. Hook de notificación (simulado)
        console.log(`[NOTIFICACIÓN] Enviando aviso a cliente de Orden ${old?.orden}: Nuevo estado -> ${estado}`);

        res.json({ message: 'Estado actualizado e historial registrado' });
    } catch (err) {
        console.error('Error PUT estado cotización:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
