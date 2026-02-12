const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/database');

// Importar rutas
const clientesRoutes = require('./routes/clientes');
const equiposRoutes = require('./routes/equipos');
const diagnosticosRoutes = require('./routes/diagnosticos');
const presupuestosRoutes = require('./routes/presupuestos');
const estadosRoutes = require('./routes/estados');
const trackingRoutes = require('./routes/tracking');
const fotosRoutes = require('./routes/fotos');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Permitir requests desde el frontend
app.use(cors());

// Body parser - Parsear JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Servir archivos de uploads (fotos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logger simple
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// RUTAS API
// ============================================

app.use('/api/clientes', clientesRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/diagnosticos', diagnosticosRoutes);
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/estados', estadosRoutes);
app.use('/api/tracking', trackingRoutes); // Ruta pública para clientes
app.use('/api/fotos', fotosRoutes); // Ruta para subir/obtener fotos

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
