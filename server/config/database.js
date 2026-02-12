const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// Determinar qué base de datos usar según el entorno
const USE_POSTGRES = process.env.DATABASE_URL ? true : false;

let db;
let pool;

if (USE_POSTGRES) {
    // Configuración PostgreSQL para producción
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    pool.on('connect', () => {
        console.log('✅ Conectado a PostgreSQL');
    });

    pool.on('error', (err) => {
        console.error('❌ Error en PostgreSQL:', err);
    });
} else {
    // Configuración SQLite para desarrollo
    const DB_PATH = path.join(__dirname, '../../database/bithouse.db');

    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error al conectar con SQLite:', err.message);
            process.exit(1);
        }
        console.log('✅ Conectado a SQLite (desarrollo)');
    });

    // Habilitar claves foráneas en SQLite
    db.run('PRAGMA foreign_keys = ON');
}

/**
 * Ejecutar una query que devuelve una sola fila
 */
const get = async (sql, params = []) => {
    if (USE_POSTGRES) {
        // Convertir placeholders de ? a $1, $2, etc.
        const pgSql = convertPlaceholders(sql);
        const result = await pool.query(pgSql, params);
        return result.rows[0];
    } else {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
};

/**
 * Ejecutar una query que devuelve múltiples filas
 */
const all = async (sql, params = []) => {
    if (USE_POSTGRES) {
        const pgSql = convertPlaceholders(sql);
        const result = await pool.query(pgSql, params);
        return result.rows;
    } else {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};

/**
 * Ejecutar una query de inserción, actualización o eliminación
 */
const run = async (sql, params = []) => {
    if (USE_POSTGRES) {
        const pgSql = convertPlaceholders(sql);

        // Para INSERT, necesitamos RETURNING id para obtener lastID
        let finalSql = pgSql;
        if (pgSql.trim().toUpperCase().startsWith('INSERT')) {
            if (!pgSql.toUpperCase().includes('RETURNING')) {
                finalSql = pgSql + ' RETURNING id';
            }
        }

        const result = await pool.query(finalSql, params);

        return {
            lastID: result.rows[0]?.id || null,
            changes: result.rowCount
        };
    } else {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
};

/**
 * Convertir placeholders de SQLite (?) a PostgreSQL ($1, $2, etc.)
 */
function convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => {
        index++;
        return `$${index}`;
    });
}

/**
 * Cerrar la conexión a la base de datos
 */
const close = async () => {
    if (USE_POSTGRES) {
        await pool.end();
    } else {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
};

/**
 * Inicializar el schema de la base de datos
 */
const initSchema = async () => {
    if (!USE_POSTGRES) {
        // SQLite ya tiene su schema inicializado
        return;
    }

    // Crear tablas en PostgreSQL
    const schema = `
        -- Tabla de clientes
        CREATE TABLE IF NOT EXISTS clientes (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(255) NOT NULL,
            telefono VARCHAR(50) NOT NULL,
            direccion TEXT,
            email VARCHAR(255),
            notas TEXT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            activo INTEGER DEFAULT 1
        );

        -- Tabla de equipos
        CREATE TABLE IF NOT EXISTS equipos (
            id SERIAL PRIMARY KEY,
            cliente_id INTEGER NOT NULL REFERENCES clientes(id),
            numero_orden VARCHAR(50) UNIQUE NOT NULL,
            marca VARCHAR(100) NOT NULL,
            modelo VARCHAR(100) NOT NULL,
            sistema_operativo VARCHAR(20) NOT NULL CHECK (sistema_operativo IN ('Android', 'iOS')),
            imei VARCHAR(50),
            falla_reportada TEXT NOT NULL,
            estado_fisico TEXT,
            accesorios TEXT,
            icloud_status VARCHAR(50),
            biometria_tipo VARCHAR(50),
            estado_actual VARCHAR(50) DEFAULT 'ingresado',
            fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_entrega TIMESTAMP
        );

        -- Tabla de diagnósticos
        CREATE TABLE IF NOT EXISTS diagnosticos (
            id SERIAL PRIMARY KEY,
            equipo_id INTEGER NOT NULL REFERENCES equipos(id),
            diagnostico TEXT NOT NULL,
            solucion_propuesta TEXT,
            fecha_diagnostico TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de presupuestos
        CREATE TABLE IF NOT EXISTS presupuestos (
            id SERIAL PRIMARY KEY,
            equipo_id INTEGER NOT NULL REFERENCES equipos(id),
            diagnostico_id INTEGER REFERENCES diagnosticos(id),
            detalle_repuestos TEXT,
            costo_repuestos DECIMAL(10, 2) NOT NULL,
            costo_mano_obra DECIMAL(10, 2) NOT NULL,
            total DECIMAL(10, 2) NOT NULL,
            estado VARCHAR(20) DEFAULT 'pendiente',
            observaciones TEXT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_respuesta TIMESTAMP
        );

        -- Tabla de historial de estados
        CREATE TABLE IF NOT EXISTS estados_historial (
            id SERIAL PRIMARY KEY,
            equipo_id INTEGER NOT NULL REFERENCES equipos(id),
            estado_anterior VARCHAR(50),
            estado_nuevo VARCHAR(50) NOT NULL,
            observaciones TEXT,
            usuario VARCHAR(100),
            fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de retiros y entregas
        CREATE TABLE IF NOT EXISTS retiros_entregas (
            id SERIAL PRIMARY KEY,
            equipo_id INTEGER NOT NULL REFERENCES equipos(id),
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('retiro', 'entrega')),
            direccion TEXT NOT NULL,
            fecha_programada TIMESTAMP,
            fecha_realizada TIMESTAMP,
            estado VARCHAR(20) DEFAULT 'pendiente',
            observaciones TEXT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de fotos
        CREATE TABLE IF NOT EXISTS fotos (
            id SERIAL PRIMARY KEY,
            equipo_id INTEGER NOT NULL REFERENCES equipos(id),
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'diagnostico', 'reparacion', 'entrega')),
            nombre_archivo VARCHAR(255) NOT NULL,
            ruta_archivo VARCHAR(500) NOT NULL,
            descripcion TEXT,
            fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Índices para mejorar performance
        CREATE INDEX IF NOT EXISTS idx_equipos_cliente ON equipos(cliente_id);
        CREATE INDEX IF NOT EXISTS idx_equipos_estado ON equipos(estado_actual);
        CREATE INDEX IF NOT EXISTS idx_equipos_orden ON equipos(numero_orden);
        CREATE INDEX IF NOT EXISTS idx_diagnosticos_equipo ON diagnosticos(equipo_id);
        CREATE INDEX IF NOT EXISTS idx_presupuestos_equipo ON presupuestos(equipo_id);
        CREATE INDEX IF NOT EXISTS idx_historial_equipo ON estados_historial(equipo_id);
        CREATE INDEX IF NOT EXISTS idx_fotos_equipo ON fotos(equipo_id);
    `;

    const statements = schema.split(';').filter(s => s.trim());

    for (const statement of statements) {
        if (statement.trim()) {
            try {
                await pool.query(statement);
            } catch (err) {
                // Ignorar errores de "ya existe" pero reportar otros
                if (!err.message.includes('already exists')) {
                    console.error('Error creando schema:', err.message);
                }
            }
        }
    }

    console.log('✅ Schema de PostgreSQL inicializado');
};

module.exports = {
    db: USE_POSTGRES ? pool : db,
    get,
    all,
    run,
    close,
    initSchema,
    USE_POSTGRES
};
