const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('../middleware/auth');

// Credenciales del admin desde variables de entorno
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
// Hash de la contraseña por defecto 'admin123' - cambiar en producción
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);

const rateLimit = require('express-rate-limit');

// Rate limiting para evitar ataques de fuerza bruta
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Límite de 5 intentos por IP
    message: { error: 'Demasiados intentos de inicio de sesión desde esta IP. Por favor intente de nuevo en 15 minutos.' }
});

// ============================================
// POST /api/auth/login
// Iniciar sesión
// ============================================
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: 'Se requieren usuario y contraseña'
            });
        }

        // Verificar usuario
        if (username !== ADMIN_USER) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, DEFAULT_PASSWORD_HASH);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token JWT (expira en 24 horas)
        const token = jwt.sign(
            { username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: { username, role: 'admin' },
            expiresIn: 86400 // 24 horas en segundos
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ============================================
// GET /api/auth/verify
// Verificar si el token es válido
// ============================================
router.get('/verify', (req, res) => {
    // Si llega aquí, el middleware ya verificó el token
    res.json({
        valid: true,
        user: req.user
    });
});

// ============================================
// POST /api/auth/change-password
// Cambiar contraseña (requiere auth)
// ============================================
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Se requieren la contraseña actual y la nueva'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar contraseña actual
        const validPassword = await bcrypt.compare(currentPassword, DEFAULT_PASSWORD_HASH);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        // Nota: En esta versión con env vars, el cambio de contraseña
        // solo se puede hacer cambiando ADMIN_PASSWORD en las variables de entorno
        res.json({
            message: 'Para cambiar la contraseña, actualice la variable de entorno ADMIN_PASSWORD en el servidor.'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
