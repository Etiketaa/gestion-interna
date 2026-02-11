const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/bithouse.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(clientes)", [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }

    console.log('\n📋 Estructura de tabla CLIENTES:\n');
    rows.forEach(col => {
        console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

    db.close();
});
