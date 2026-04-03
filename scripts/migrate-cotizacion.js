/**
 * Migración: Crea las tablas de cotización en SQLite si no existen.
 * Ejecutar con: node scripts/migrate-cotizacion.js
 */
const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const DB_PATH = path.join(__dirname, '../database/bithouse.db');
const db = new sqlite3.Database(DB_PATH, err => {
  if (err) { console.error('❌ Error al abrir DB:', err.message); process.exit(1); }
  console.log('✅ Conectado a SQLite:', DB_PATH);
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  // ── cot_inventario ──
  db.run(`CREATE TABLE IF NOT EXISTS cot_inventario (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    cat        TEXT NOT NULL,
    brand      TEXT,
    cost       REAL NOT NULL DEFAULT 0,
    margin     REAL,
    stock      INTEGER DEFAULT 0,
    min_stock  INTEGER DEFAULT 2,
    notes      TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, err => err ? console.error('❌ cot_inventario:', err.message) : console.log('✅ Tabla cot_inventario OK'));

  // ── cot_proveedores ──
  db.run(`CREATE TABLE IF NOT EXISTS cot_proveedores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    type       TEXT,
    rating     INTEGER DEFAULT 4,
    contact    TEXT,
    delivery   TEXT,
    url        TEXT,
    payment    TEXT,
    notes      TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, err => err ? console.error('❌ cot_proveedores:', err.message) : console.log('✅ Tabla cot_proveedores OK'));

  // ── cot_proveedor_precios ──
  db.run(`CREATE TABLE IF NOT EXISTS cot_proveedor_precios (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER NOT NULL,
    item_id      INTEGER NOT NULL,
    price        REAL NOT NULL,
    quality      TEXT DEFAULT 'premium',
    avail        TEXT DEFAULT 'En stock',
    notes        TEXT,
    FOREIGN KEY (proveedor_id) REFERENCES cot_proveedores(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id)      REFERENCES cot_inventario(id)  ON DELETE CASCADE
  )`, err => err ? console.error('❌ cot_proveedor_precios:', err.message) : console.log('✅ Tabla cot_proveedor_precios OK'));

  // ── cot_cotizaciones ──
  db.run(`CREATE TABLE IF NOT EXISTS cot_cotizaciones (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    orden        TEXT UNIQUE NOT NULL,
    cliente_nombre TEXT,
    equipo_desc  TEXT,
    servicios    TEXT,
    total        REAL DEFAULT 0,
    estado       TEXT DEFAULT 'Pendiente',
    fecha        DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, err => err ? console.error('❌ cot_cotizaciones:', err.message) : console.log('✅ Tabla cot_cotizaciones OK'));

  // ── cot_config (márgenes, contador de orden) ──
  db.run(`CREATE TABLE IF NOT EXISTS cot_config (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    key   TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL
  )`, err => err ? console.error('❌ cot_config:', err.message) : console.log('✅ Tabla cot_config OK'));

  // Verificar resultado final
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'cot_%'", [], (err, rows) => {
    if (err) { console.error('❌ Error verificando:', err.message); }
    else {
      console.log('\n📊 Tablas de cotización en la DB:');
      rows.forEach(r => console.log('   -', r.name));
      if (rows.length === 5) {
        console.log('\n✨ ¡Migración completada! Reinicia el servidor.');
      } else {
        console.log('\n⚠️  Faltan algunas tablas. Revisa los errores arriba.');
      }
    }
    db.close();
  });
});
