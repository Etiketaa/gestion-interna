const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Default suppliers
const DEFAULT_SUPPLIERS = [
    { name: 'TechParts BA', type: 'Mayorista local', rating: 4, contact: '11-5555-0001', delivery: '1-2 días', url: '', payment: 'Efectivo + Transferencia', notes: 'Buen precio en pantallas' },
    { name: 'MobileImport', type: 'Importador directo', rating: 3, contact: '11-5555-0002', delivery: '5-10 días', url: '', payment: 'Transferencia', notes: 'Más barato pero tarda' },
    { name: 'FixShop Online', type: 'Tienda online', rating: 5, contact: 'info@fixshop.com', delivery: '2-3 días', url: 'https://fixshop.com', payment: 'MercadoPago', notes: '' },
];

async function seedSuppliers() {
    const count = await db.get('SELECT COUNT(*) as c FROM cot_proveedores');
    if (count && count.c === 0) {
        for (const s of DEFAULT_SUPPLIERS) {
            await db.run(
                'INSERT INTO cot_proveedores (name, type, rating, contact, delivery, url, payment, notes) VALUES (?,?,?,?,?,?,?,?)',
                [s.name, s.type, s.rating, s.contact, s.delivery, s.url, s.payment, s.notes]
            );
        }
        console.log('✅ Cotización: proveedores de ejemplo cargados');
    }
}

// ════════════ PROVEEDORES ════════════

// GET /api/cotizacion/proveedores
router.get('/', async (req, res) => {
    try {
        await seedSuppliers();
        const provs = await db.all('SELECT * FROM cot_proveedores ORDER BY id');
        // For each, attach prices
        const result = [];
        for (const p of provs) {
            const prices = await db.all('SELECT * FROM cot_proveedor_precios WHERE proveedor_id=?', [p.id]);
            result.push({
                id: p.id, name: p.name, type: p.type || '', rating: p.rating,
                contact: p.contact || '', delivery: p.delivery || '', url: p.url || '',
                payment: p.payment || '', notes: p.notes || '',
                prices: prices.map(pr => ({
                    itemId: pr.item_id, price: parseFloat(pr.price),
                    quality: pr.quality, avail: pr.avail, notes: pr.notes || ''
                }))
            });
        }
        res.json(result);
    } catch (err) {
        console.error('Error GET proveedores:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/cotizacion/proveedores
router.post('/', async (req, res) => {
    try {
        const { name, type, rating, contact, delivery, url, payment, notes, prices } = req.body;
        if (!name) return res.status(400).json({ error: 'Nombre es obligatorio' });
        const result = await db.run(
            'INSERT INTO cot_proveedores (name, type, rating, contact, delivery, url, payment, notes) VALUES (?,?,?,?,?,?,?,?)',
            [name, type || '', rating || 4, contact || '', delivery || '', url || '', payment || '', notes || '']
        );
        const provId = result.lastID;
        // Insert prices if any
        if (prices && prices.length) {
            for (const p of prices) {
                if (p.itemId && p.price) {
                    await db.run(
                        'INSERT INTO cot_proveedor_precios (proveedor_id, item_id, price, quality, avail, notes) VALUES (?,?,?,?,?,?)',
                        [provId, p.itemId, p.price, p.quality || 'premium', p.avail || 'En stock', p.notes || '']
                    );
                }
            }
        }
        res.json({ id: provId, message: 'Proveedor creado' });
    } catch (err) {
        console.error('Error POST proveedor:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/cotizacion/proveedores/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, type, rating, contact, delivery, url, payment, notes } = req.body;
        await db.run(
            'UPDATE cot_proveedores SET name=?, type=?, rating=?, contact=?, delivery=?, url=?, payment=?, notes=? WHERE id=?',
            [name, type || '', rating || 4, contact || '', delivery || '', url || '', payment || '', notes || '', req.params.id]
        );
        res.json({ message: 'Proveedor actualizado' });
    } catch (err) {
        console.error('Error PUT proveedor:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/cotizacion/proveedores/:id
router.delete('/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM cot_proveedores WHERE id=?', [req.params.id]);
        res.json({ message: 'Proveedor eliminado' });
    } catch (err) {
        console.error('Error DELETE proveedor:', err);
        res.status(500).json({ error: err.message });
    }
});

// ════════════ PRECIOS POR PROVEEDOR ════════════

// POST /api/cotizacion/proveedores/:id/precios
router.post('/:id/precios', async (req, res) => {
    try {
        const { itemId, price, quality, avail, notes } = req.body;
        if (!itemId || !price) return res.status(400).json({ error: 'Repuesto y precio son obligatorios' });
        // Upsert: if price for this supplier+item exists, update it
        const existing = await db.get(
            'SELECT id FROM cot_proveedor_precios WHERE proveedor_id=? AND item_id=?',
            [req.params.id, itemId]
        );
        if (existing) {
            await db.run(
                'UPDATE cot_proveedor_precios SET price=?, quality=?, avail=?, notes=? WHERE id=?',
                [price, quality || 'premium', avail || 'En stock', notes || '', existing.id]
            );
        } else {
            await db.run(
                'INSERT INTO cot_proveedor_precios (proveedor_id, item_id, price, quality, avail, notes) VALUES (?,?,?,?,?,?)',
                [req.params.id, itemId, price, quality || 'premium', avail || 'En stock', notes || '']
            );
        }
        res.json({ message: 'Precio guardado' });
    } catch (err) {
        console.error('Error POST precio:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/cotizacion/proveedores/:provId/precios/:itemId
router.delete('/:provId/precios/:itemId', async (req, res) => {
    try {
        await db.run(
            'DELETE FROM cot_proveedor_precios WHERE proveedor_id=? AND item_id=?',
            [req.params.provId, req.params.itemId]
        );
        res.json({ message: 'Precio eliminado' });
    } catch (err) {
        console.error('Error DELETE precio:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
