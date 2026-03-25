const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bithouse-gestion-secret-key-dev-2024';

/**
 * Middleware de autenticación JWT
 * Verifica el token en el header Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
    // Rutas públicas que no requieren autenticación
    const publicPaths = [
        '/api/auth/login',
        '/api/tracking',
    ];

    // Verificar si la ruta es pública
    const isPublic = publicPaths.some(path => req.path.startsWith(path));
    if (isPublic) {
        return next();
    }

    // Verificar si es una ruta de API (solo proteger /api/*)
    if (!req.path.startsWith('/api/')) {
        return next();
    }

    // Obtener token del header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Acceso no autorizado. Token requerido.',
            code: 'NO_TOKEN'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado. Inicie sesión nuevamente.',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({
            error: 'Token inválido.',
            code: 'INVALID_TOKEN'
        });
    }
}

module.exports = { authMiddleware, JWT_SECRET };
