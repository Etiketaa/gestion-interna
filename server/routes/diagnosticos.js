const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ============================================
// POST /api/diagnosticos
// Crear un diagnóstico para un equipo
// ============================================
router.post('/', async (req, res) => {
    try {
        const { equipo_id, tecnico, diagnostico_detallado, reparable, observaciones } = req.body;

        // Validaciones
        if (!equipo_id || !tecnico || !diagnostico_detallado) {
            return res.status(400).json({
                error: 'Campos obligatorios: equipo_id, tecnico, diagnostico_detallado'
            });
        }

        // Verificar que el equipo existe
        const equipo = await db.get('SELECT * FROM equipos WHERE id = ?', [equipo_id]);
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const result = await db.run(`
            INSERT INTO diagnosticos (equipo_id, tecnico, diagnostico_detallado, reparable, observaciones)
            VALUES (?, ?, ?, ?, ?)
        `, [equipo_id, tecnico, diagnostico_detallado, reparable !== false ? 1 : 0, observaciones || null]);

        // Actualizar estado del equipo a 'diagnostico'
        await db.run('UPDATE equipos SET estado_actual = ? WHERE id = ?', ['diagnostico', equipo_id]);

        // Registrar cambio de estado
        await db.run(`
            INSERT INTO estados_historial (equipo_id, estado_anterior, estado_nuevo, observaciones, usuario)
            VALUES (?, ?, ?, ?, ?)
        `, [equipo_id, equipo.estado_actual, 'diagnostico', 'Diagnóstico técnico completado', tecnico]);

        const nuevoDiagnostico = await db.get('SELECT * FROM diagnosticos WHERE id = ?', [result.lastID]);

        res.status(201).json({
            message: 'Diagnóstico creado exitosamente',
            diagnostico: nuevoDiagnostico
        });
    } catch (error) {
        console.error('Error al crear diagnóstico:', error);
        res.status(500).json({ error: 'Error al crear diagnóstico' });
    }
});

// ============================================
// GET /api/diagnosticos/equipo/:equipoId
// Obtener el diagnóstico de un equipo
// ============================================
router.get('/equipo/:equipoId', async (req, res) => {
    try {
        const { equipoId } = req.params;

        const diagnostico = await db.get(
            'SELECT * FROM diagnosticos WHERE equipo_id = ? ORDER BY fecha_diagnostico DESC LIMIT 1',
            [equipoId]
        );

        if (!diagnostico) {
            return res.status(404).json({ error: 'Diagnóstico no encontrado' });
        }

        res.json(diagnostico);
    } catch (error) {
        console.error('Error al obtener diagnóstico:', error);
        res.status(500).json({ error: 'Error al obtener diagnóstico' });
    }
});

// ============================================
// PUT /api/diagnosticos/:id
// Actualizar un diagnóstico
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tecnico, diagnostico_detallado, reparable, observaciones } = req.body;

        // Verificar que el diagnóstico existe
        const diagnostico = await db.get('SELECT * FROM diagnosticos WHERE id = ?', [id]);
        if (!diagnostico) {
            return res.status(404).json({ error: 'Diagnóstico no encontrado' });
        }

        await db.run(`
            UPDATE diagnosticos SET
                tecnico = ?, diagnostico_detallado = ?, reparable = ?, observaciones = ?
            WHERE id = ?
        `, [
            tecnico || diagnostico.tecnico,
            diagnostico_detallado || diagnostico.diagnostico_detallado,
            reparable !== undefined ? (reparable ? 1 : 0) : diagnostico.reparable,
            observaciones !== undefined ? observaciones : diagnostico.observaciones,
            id
        ]);

        const diagnosticoActualizado = await db.get('SELECT * FROM diagnosticos WHERE id = ?', [id]);

        res.json({
            message: 'Diagnóstico actualizado exitosamente',
            diagnostico: diagnosticoActualizado
        });
    } catch (error) {
        console.error('Error al actualizar diagnóstico:', error);
        res.status(500).json({ error: 'Error al actualizar diagnóstico' });
    }
});

module.exports = router;
