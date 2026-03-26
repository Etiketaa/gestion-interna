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
        const { orden, cliente, equipo, servicios, total, estado } = req.body;
        if (!orden) return res.status(400).json({ error: 'Número de orden es obligatorio' });

        await db.run(
            'INSERT INTO cot_cotizaciones (orden, cliente_nombre, equipo_desc, servicios, total, estado) VALUES (?,?,?,?,?,?)',
            [orden, cliente || '', equipo || '', JSON.stringify(servicios || []), total || 0, estado || 'Pendiente']
        );

        // Increment counter
        const current = await db.get("SELECT value FROM cot_config WHERE key='orderCounter'");
        const newCount = current ? parseInt(current.value) + 1 : 1;
        await db.run(
            "INSERT INTO cot_config (key, value) VALUES ('orderCounter', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            [String(newCount)]
        );

        res.json({ message: 'Cotización guardada', orden });
    } catch (err) {
        console.error('Error POST cotización:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/cotizacion/cotizaciones/:id/estado
router.put('/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;
        await db.run('UPDATE cot_cotizaciones SET estado=? WHERE id=?', [estado, req.params.id]);
        res.json({ message: 'Estado actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
