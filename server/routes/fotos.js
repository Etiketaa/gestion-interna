const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

// ============================================
// Configuración de Multer para subida de fotos
// ============================================

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generar nombre único: equipoID_timestamp_originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const equipoId = req.body.equipo_id || 'temp';
        cb(null, `equipo_${equipoId}_${uniqueSuffix}${ext}`);
    }
});

// Filtro para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WEBP)'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: fileFilter
});

// ============================================
// POST /api/fotos
// Subir una o varias fotos para un equipo
// ============================================
router.post('/', upload.array('fotos', 10), async (req, res) => {
    try {
        const { equipo_id, tipo, descripcion } = req.body;

        if (!equipo_id || !tipo) {
            return res.status(400).json({
                error: 'Campos obligatorios: equipo_id, tipo'
            });
        }

        // Verificar que el equipo existe
        const equipo = await db.get('SELECT id FROM equipos WHERE id = ?', [equipo_id]);
        if (!equipo) {
            // Eliminar archivos subidos si el equipo no existe
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        // Validar tipo de foto
        const tiposValidos = ['ingreso', 'diagnostico', 'reparacion', 'entrega'];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({
                error: 'Tipo de foto no válido. Debe ser: ingreso, diagnostico, reparacion o entrega'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subieron archivos' });
        }

        // Guardar información de cada foto en la base de datos
        const fotosGuardadas = [];
        for (const file of req.files) {
            const result = await db.run(`
                INSERT INTO fotos (equipo_id, tipo, nombre_archivo, ruta_archivo, descripcion)
                VALUES (?, ?, ?, ?, ?)
            `, [
                equipo_id,
                tipo,
                file.filename,
                `/uploads/${file.filename}`,
                descripcion || null
            ]);

            fotosGuardadas.push({
                id: result.lastID,
                nombre_archivo: file.filename,
                ruta_archivo: `/uploads/${file.filename}`,
                tipo,
                descripcion
            });
        }

        res.status(201).json({
            message: `${fotosGuardadas.length} foto(s) subida(s) exitosamente`,
            fotos: fotosGuardadas
        });
    } catch (error) {
        console.error('Error al subir fotos:', error);
        // Limpiar archivos si hubo error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        res.status(500).json({ error: error.message || 'Error al subir fotos' });
    }
});

// ============================================
// GET /api/fotos/equipo/:equipoId
// Obtener todas las fotos de un equipo
// ============================================
router.get('/equipo/:equipoId', async (req, res) => {
    try {
        const { equipoId } = req.params;
        const { tipo } = req.query;

        let sql = 'SELECT * FROM fotos WHERE equipo_id = ?';
        let params = [equipoId];

        if (tipo) {
            sql += ' AND tipo = ?';
            params.push(tipo);
        }

        sql += ' ORDER BY fecha_subida DESC';

        const fotos = await db.all(sql, params);

        res.json({ fotos });
    } catch (error) {
        console.error('Error al obtener fotos:', error);
        res.status(500).json({ error: 'Error al obtener fotos' });
    }
});

// ============================================
// DELETE /api/fotos/:id
// Eliminar una foto
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener información de la foto
        const foto = await db.get('SELECT * FROM fotos WHERE id = ?', [id]);
        if (!foto) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }

        // Eliminar archivo físico
        const filePath = path.join(__dirname, '../../uploads', foto.nombre_archivo);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Eliminar registro de la base de datos
        await db.run('DELETE FROM fotos WHERE id = ?', [id]);

        res.json({ message: 'Foto eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar foto:', error);
        res.status(500).json({ error: 'Error al eliminar foto' });
    }
});

module.exports = router;
