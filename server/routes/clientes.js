const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ============================================
// GET /api/clientes
// Obtener todos los clientes (con paginación opcional)
// ============================================
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let sql = 'SELECT * FROM clientes WHERE activo = 1';
        let params = [];

        // Búsqueda por nombre o teléfono
        if (search) {
            sql += ' AND (nombre LIKE ? OR telefono LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY nombre ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const clientes = await db.all(sql, params);

        // Contar total para paginación
        let countSql = 'SELECT COUNT(*) as total FROM clientes WHERE activo = 1';
        let countParams = [];
        if (search) {
            countSql += ' AND (nombre LIKE ? OR telefono LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }
        const { total } = await db.get(countSql, countParams);

        res.json({
            clientes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
});

// ============================================
// GET /api/clientes/:id
// Obtener un cliente específico
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cliente = await db.get('SELECT * FROM clientes WHERE id = ? AND activo = 1', [id]);

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(cliente);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ error: 'Error al obtener cliente' });
    }
});

// ============================================
// GET /api/clientes/:id/equipos
// Obtener todos los equipos de un cliente
// ============================================
router.get('/:id/equipos', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el cliente existe
        const cliente = await db.get('SELECT id FROM clientes WHERE id = ? AND activo = 1', [id]);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const equipos = await db.all(
            'SELECT * FROM equipos WHERE cliente_id = ? ORDER BY fecha_ingreso DESC',
            [id]
        );

        res.json(equipos);
    } catch (error) {
        console.error('Error al obtener equipos del cliente:', error);
        res.status(500).json({ error: 'Error al obtener equipos del cliente' });
    }
});

// ============================================
// POST /api/clientes
// Crear un nuevo cliente
// ============================================
router.post('/', async (req, res) => {
    try {
        const { nombre, telefono, direccion, email, notas } = req.body;

        // Validaciones
        if (!nombre || !telefono) {
            return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
        }

        const result = await db.run(
            'INSERT INTO clientes (nombre, telefono, direccion, email, notas) VALUES (?, ?, ?, ?, ?)',
            [nombre, telefono, direccion || null, email || null, notas || null]
        );

        const nuevoCliente = await db.get('SELECT * FROM clientes WHERE id = ?', [result.lastID]);

        res.status(201).json({
            message: 'Cliente creado exitosamente',
            cliente: nuevoCliente
        });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ error: 'Error al crear cliente' });
    }
});

// ============================================
// PUT /api/clientes/:id
// Actualizar un cliente
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, telefono, direccion, email, notas } = req.body;

        // Verificar que el cliente existe
        const cliente = await db.get('SELECT id FROM clientes WHERE id = ? AND activo = 1', [id]);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Validaciones
        if (!nombre || !telefono) {
            return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
        }

        await db.run(
            'UPDATE clientes SET nombre = ?, telefono = ?, direccion = ?, email = ?, notas = ? WHERE id = ?',
            [nombre, telefono, direccion || null, email || null, notas || null, id]
        );

        const clienteActualizado = await db.get('SELECT * FROM clientes WHERE id = ?', [id]);

        res.json({
            message: 'Cliente actualizado exitosamente',
            cliente: clienteActualizado
        });
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ error: 'Error al actualizar cliente' });
    }
});

// ============================================
// DELETE /api/clientes/:id
// Eliminar un cliente (soft delete)
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el cliente existe
        const cliente = await db.get('SELECT id FROM clientes WHERE id = ? AND activo = 1', [id]);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Verificar si tiene equipos activos
        const equiposActivos = await db.get(
            "SELECT COUNT(*) as count FROM equipos WHERE cliente_id = ? AND estado_actual != 'entregado'",
            [id]
        );

        if (equiposActivos.count > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar el cliente porque tiene equipos en proceso de reparación'
            });
        }

        // Soft delete
        await db.run('UPDATE clientes SET activo = 0 WHERE id = ?', [id]);

        res.json({ message: 'Cliente eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ error: 'Error al eliminar cliente' });
    }
});

module.exports = router;
