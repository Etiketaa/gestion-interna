const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/bithouse.db');
const SQL_PATH = path.join(__dirname, '../database/init.sql');

console.log('🔧 Inicializando base de datos de Bit House...\n');

// Leer el archivo SQL
const sql = fs.readFileSync(SQL_PATH, 'utf8');

// Crear/abrir base de datos
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error al crear la base de datos:', err.message);
        process.exit(1);
    }
    console.log('✅ Conexión a base de datos establecida');
});

// Ejecutar el script SQL
db.exec(sql, (err) => {
    if (err) {
        console.error('❌ Error al ejecutar el script SQL:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('✅ Tablas creadas exitosamente');
    console.log('✅ Datos de ejemplo insertados');
    
    // Verificar las tablas creadas
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error('❌ Error al verificar tablas:', err.message);
        } else {
            console.log('\n📊 Tablas creadas:');
            tables.forEach(table => {
                console.log(`   - ${table.name}`);
            });
        }
        
        // Mostrar estadísticas
        db.get("SELECT COUNT(*) as count FROM clientes", [], (err, row) => {
            if (!err) console.log(`\n👥 Clientes de ejemplo: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM equipos", [], (err, row) => {
            if (!err) console.log(`📱 Equipos de ejemplo: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM diagnosticos", [], (err, row) => {
            if (!err) console.log(`🔍 Diagnósticos de ejemplo: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM presupuestos", [], (err, row) => {
            if (!err) console.log(`💰 Presupuestos de ejemplo: ${row.count}`);
            
            console.log('\n✨ Base de datos inicializada correctamente!');
            console.log('📍 Ubicación:', DB_PATH);
            
            db.close();
        });
    });
});
