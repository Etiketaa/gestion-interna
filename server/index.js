require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/database');

// Importar middleware de autenticación
const { authMiddleware } = require('./middleware/auth');

// Importar rutas
const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const equiposRoutes = require('./routes/equipos');
const diagnosticosRoutes = require('./routes/diagnosticos');
const presupuestosRoutes = require('./routes/presupuestos');
const estadosRoutes = require('./routes/estados');
const trackingRoutes = require('./routes/tracking');
const fotosRoutes = require('./routes/fotos');
const cotInvRoutes = require('./routes/cotizacion-inventario');
const cotProvRoutes = require('./routes/cotizacion-proveedores');
const cotQuotesRoutes = require('./routes/cotizacion-quotes');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

// Seguridad: Proteger cabeceras HTTP
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Permite cargar recursos necesarios en el frontend
}));

// CORS - Permitir requests desde el frontend (incluyendo Vercel)
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:3001', 'http://localhost:5500', 'http://127.0.0.1:5500']
    : ['http://localhost:3001', 'http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (herramientas como curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            return callback(null, true);
        }
        callback(null, true); // Permitir todo en desarrollo
    },
    credentials: true
}));

// Body parser - Parsear JSON con límite de tamaño (100kb para mitigar Payload injections)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ limit: '100kb', extended: true }));

// Servir archivos estáticos solo en desarrollo (cuando el frontend no está en Vercel)
if (!process.env.FRONTEND_URL) {
    app.use(express.static(path.join(__dirname, '../public')));
}

// Servir archivos de uploads (fotos) — siempre disponible
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logger simple
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Middleware de autenticación JWT (protege rutas /api/* excepto públicas)
app.use(authMiddleware);

// ============================================
// RUTAS API
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/diagnosticos', diagnosticosRoutes);
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/estados', estadosRoutes);
app.use('/api/tracking', trackingRoutes); // Ruta pública para clientes
app.use('/api/fotos', fotosRoutes); // Ruta para subir/obtener fotos
app.use('/api/cotizacion', cotInvRoutes); // Inventario + márgenes cotización
app.use('/api/cotizacion/proveedores', cotProvRoutes); // Proveedores cotización
app.use('/api/cotizacion/cotizaciones', cotQuotesRoutes); // Cotizaciones guardadas

// Ruta raíz de la API
app.get('/api', (req, res) => {
    res.json({
        message: 'API de Gestión de Reparaciones - Bit House',
        version: '1.0.0',
        endpoints: {
            clientes: '/api/clientes',
            equipos: '/api/equipos',
            diagnosticos: '/api/diagnosticos',
            presupuestos: '/api/presupuestos',
            estados: '/api/estados'
        }
    });
});

// ============================================
// MANEJO DE ERRORES
// ============================================

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.path
    });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

async function startServer() {
    try {
        // Inicializar schema de PostgreSQL si es necesario
        if (db.USE_POSTGRES) {
            await db.initSchema();
        }

        app.listen(PORT, () => {
            console.log('\n╔════════════════════════════════════════╗');
            console.log('║   🏠 BIT HOUSE - Sistema de Gestión   ║');
            console.log('╚════════════════════════════════════════╝\n');
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log(`📱 API disponible en http://localhost:${PORT}/api`);
            console.log(`🌐 Frontend disponible en http://localhost:${PORT}`);
            console.log(`💾 Base de datos: ${db.USE_POSTGRES ? 'PostgreSQL' : 'SQLite'}\n`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error);
        process.exit(1);
    }
}

startServer();

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    console.log('\n\n👋 Cerrando servidor...');
    await db.close();
    process.exit(0);
});

module.exports = app;
