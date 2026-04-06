const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Default margins
const DEF_MARGINS = {
    'Módulo pantalla': 2.7, 'Batería': 2.5, 'Conector carga': 2.8, 'Cámara': 2.6,
    'Carcasa': 2.4, 'Botones': 3.0, 'Parlante / Micrófono': 2.8, 'Flex / Cable': 3.0,
    'Servicio': 1.0, 'Mano de obra': 1.0, 'Diagnóstico': 1.0, 'Otro': 2.5
};

// Default inventory items
const DEFAULT_INVENTORY = [
    { name: 'Módulo pantalla iPhone 14', cat: 'Módulo pantalla', brand: 'Apple iPhone 14', cost: 32000, stock: 3, min: 1, notes: 'OLED compatible' },
    { name: 'Módulo pantalla Samsung A54', cat: 'Módulo pantalla', brand: 'Samsung A54', cost: 18000, stock: 5, min: 2, notes: '' },
    { name: 'Módulo pantalla Motorola G32', cat: 'Módulo pantalla', brand: 'Motorola G32', cost: 14000, stock: 2, min: 1, notes: 'LCD' },
    { name: 'Batería iPhone 13', cat: 'Batería', brand: 'Apple iPhone 13', cost: 8500, stock: 8, min: 3, notes: '2000mAh' },
    { name: 'Batería iPhone 14', cat: 'Batería', brand: 'Apple iPhone 14', cost: 12000, stock: 4, min: 2, notes: '' },
    { name: 'Batería Samsung A32', cat: 'Batería', brand: 'Samsung A32', cost: 5000, stock: 6, min: 2, notes: '' },
    { name: 'Conector USB-C universal', cat: 'Conector carga', brand: 'Universal', cost: 2500, stock: 12, min: 4, notes: '' },
    { name: 'Conector Lightning iPhone', cat: 'Conector carga', brand: 'Apple iPhone', cost: 3500, stock: 7, min: 2, notes: '' },
    { name: 'Cámara trasera iPhone 12', cat: 'Cámara', brand: 'Apple iPhone 12', cost: 22000, stock: 2, min: 1, notes: 'Triple cámara' },
    { name: 'Cámara frontal Samsung A53', cat: 'Cámara', brand: 'Samsung A53', cost: 9000, stock: 3, min: 1, notes: '' },
    { name: 'Carcasa trasera Xiaomi Redmi Note 11', cat: 'Carcasa', brand: 'Xiaomi Redmi Note 11', cost: 7000, stock: 4, min: 1, notes: '' },
    { name: 'Parlante inferior iPhone 11', cat: 'Parlante / Micrófono', brand: 'Apple iPhone 11', cost: 4500, stock: 5, min: 2, notes: '' },
    { name: 'Botón home Samsung A12', cat: 'Botones', brand: 'Samsung A12', cost: 1800, stock: 10, min: 3, notes: '' },
    { name: 'Flex botón power iPhone X', cat: 'Flex / Cable', brand: 'Apple iPhone X', cost: 3200, stock: 6, min: 2, notes: '' },
];

// ── Seed defaults if DB is empty ──
async function seedIfEmpty() {
    const count = await db.get('SELECT COUNT(*) as c FROM cot_inventario');
    if (count && count.c === 0) {
        for (const item of DEFAULT_INVENTORY) {
            await db.run(
                'INSERT INTO cot_inventario (name, cat, brand, cost, stock, min_stock, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [item.name, item.cat, item.brand, item.cost, item.stock, item.min, item.notes || '']
            );
        }
        // Seed default margins
        await db.run(
            "INSERT INTO cot_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            ['margins', JSON.stringify(DEF_MARGINS)]
        );
        // Seed initial order counter
        await db.run(
            "INSERT INTO cot_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            ['orderCounter', '1000']
        );
        console.log('✅ Cotización: datos de ejemplo cargados');
    }
}

// ════════════ INVENTARIO ════════════

// GET /api/cotizacion/inventario
router.get('/inventario', async (req, res) => {
    try {
        await seedIfEmpty();
        const items = await db.all('SELECT * FROM cot_inventario ORDER BY id');
        // Convert DB format to frontend format
        const result = items.map(i => ({
            id: i.id, name: i.name, cat: i.cat, brand: i.brand || '',
            cost: parseFloat(i.cost), margin: i.margin ? parseFloat(i.margin) : null,
            stock: i.stock, min: i.min_stock, notes: i.notes || ''
        }));
        res.json(result);
    } catch (err) {
        console.error('Error GET inventario:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/cotizacion/inventario
router.post('/inventario', async (req, res) => {
    try {
        const { name, cat, brand, cost, margin, stock, min, notes } = req.body;
        if (!name || !cat) return res.status(400).json({ error: 'Nombre y categoría son obligatorios' });
        const result = await db.run(
            'INSERT INTO cot_inventario (name, cat, brand, cost, margin, stock, min_stock, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, cat, brand || '', cost || 0, margin || null, stock || 0, min || 2, notes || '']
        );
        res.json({ id: result.lastID, message: 'Repuesto creado' });
    } catch (err) {
        console.error('Error POST inventario:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/cotizacion/inventario/:id
router.put('/inventario/:id', async (req, res) => {
    try {
        const { name, cat, brand, cost, margin, stock, min, notes } = req.body;
        await db.run(
            'UPDATE cot_inventario SET name=?, cat=?, brand=?, cost=?, margin=?, stock=?, min_stock=?, notes=? WHERE id=?',
            [name, cat, brand || '', cost || 0, margin || null, stock || 0, min || 2, notes || '', req.params.id]
        );
        res.json({ message: 'Repuesto actualizado' });
    } catch (err) {
        console.error('Error PUT inventario:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/cotizacion/inventario/:id
router.delete('/inventario/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM cot_inventario WHERE id=?', [req.params.id]);
        res.json({ message: 'Repuesto eliminado' });
    } catch (err) {
        console.error('Error DELETE inventario:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── Reset Inventory (Clear All) ──
router.delete('/reset', async (req, res) => {
    try {
        await db.run('DELETE FROM cot_inventario');
        res.json({ message: 'Inventario vaciado con éxito' });
    } catch (err) {
        console.error('Error RESET inventario:', err);
        res.status(500).json({ error: err.message });
    }
});

// ════════════ MÁRGENES ════════════

// GET /api/cotizacion/margenes
router.get('/margenes', async (req, res) => {
    try {
        const row = await db.get("SELECT value FROM cot_config WHERE key='margins'");
        res.json(row ? JSON.parse(row.value) : DEF_MARGINS);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/cotizacion/margenes
router.put('/margenes', async (req, res) => {
    try {
        const margins = req.body;
        await db.run(
            "INSERT INTO cot_config (key, value) VALUES ('margins', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            [JSON.stringify(margins)]
        );
        res.json({ message: 'Márgenes guardados' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
