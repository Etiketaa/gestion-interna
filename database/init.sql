-- ============================================
-- Sistema de Gestión de Reparación - Bit House
-- Base de datos SQLite
-- ============================================

-- Eliminar vistas si existen
DROP VIEW IF EXISTS vista_dashboard_estados;
DROP VIEW IF EXISTS vista_equipos_completa;

-- Eliminar tablas si existen (para reinicialización)
DROP TABLE IF EXISTS fotos;
DROP TABLE IF EXISTS retiros_entregas;
DROP TABLE IF EXISTS estados_historial;
DROP TABLE IF EXISTS presupuestos;
DROP TABLE IF EXISTS diagnosticos;
DROP TABLE IF EXISTS equipos;
DROP TABLE IF EXISTS clientes;

-- ============================================
-- TABLA: clientes
-- ============================================
CREATE TABLE clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT,
    email TEXT,
    notas TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo INTEGER DEFAULT 1
);

-- ============================================
-- TABLA: equipos
-- ============================================
CREATE TABLE equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_orden TEXT NOT NULL UNIQUE, -- Número de orden automático: BH-2024-0001
    cliente_id INTEGER NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    sistema_operativo TEXT NOT NULL CHECK(sistema_operativo IN ('Android', 'iOS')),
    imei TEXT,
    falla_reportada TEXT NOT NULL,
    estado_fisico TEXT,
    accesorios TEXT, -- JSON: ["cargador", "funda", "auriculares"]
    
    -- Campos específicos para iOS
    icloud_status TEXT, -- "desbloqueado", "bloqueado", "desconocido"
    biometria_tipo TEXT, -- "Face ID", "Touch ID", "ninguno"
    
    -- Estado y seguimiento
    estado_actual TEXT DEFAULT 'ingresado' CHECK(estado_actual IN (
        'ingresado', 
        'diagnostico', 
        'presupuestado', 
        'en_reparacion', 
        'listo', 
        'en_camino', 
        'entregado'
    )),
    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega DATETIME,
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- ============================================
-- TABLA: diagnosticos
-- ============================================
CREATE TABLE diagnosticos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER NOT NULL,
    tecnico TEXT NOT NULL,
    diagnostico_detallado TEXT NOT NULL,
    reparable INTEGER DEFAULT 1, -- 0 = no reparable, 1 = reparable
    observaciones TEXT,
    fecha_diagnostico DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
);

-- ============================================
-- TABLA: presupuestos
-- ============================================
CREATE TABLE presupuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER NOT NULL,
    diagnostico_id INTEGER,
    
    -- Detalles del presupuesto
    detalle_repuestos TEXT, -- JSON: [{"nombre": "Pantalla", "precio": 15000}]
    costo_repuestos REAL DEFAULT 0,
    costo_mano_obra REAL DEFAULT 0,
    total REAL NOT NULL,
    
    -- Estado del presupuesto
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'aceptado', 'rechazado')),
    observaciones TEXT,
    
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta DATETIME,
    
    FOREIGN KEY (equipo_id) REFERENCES equipos(id),
    FOREIGN KEY (diagnostico_id) REFERENCES diagnosticos(id)
);

-- ============================================
-- TABLA: estados_historial
-- ============================================
CREATE TABLE estados_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER NOT NULL,
    estado_anterior TEXT,
    estado_nuevo TEXT NOT NULL,
    observaciones TEXT,
    usuario TEXT DEFAULT 'Sistema',
    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
);

-- ============================================
-- TABLA: retiros_entregas
-- ============================================
CREATE TABLE retiros_entregas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('retiro', 'entrega')),
    direccion TEXT NOT NULL,
    fecha_programada DATETIME,
    fecha_realizada DATETIME,
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'realizado', 'cancelado')),
    observaciones TEXT,
    
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
);

-- ============================================
-- TABLA: fotos
-- ============================================
CREATE TABLE fotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'diagnostico', 'reparacion', 'entrega')),
    nombre_archivo TEXT NOT NULL,
    ruta_archivo TEXT NOT NULL,
    descripcion TEXT,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
);

-- ============================================
-- ÍNDICES para mejorar rendimiento
-- ============================================
CREATE INDEX idx_equipos_cliente ON equipos(cliente_id);
CREATE INDEX idx_equipos_estado ON equipos(estado_actual);
CREATE INDEX idx_equipos_sistema ON equipos(sistema_operativo);
CREATE INDEX idx_equipos_orden ON equipos(numero_orden); -- Búsqueda por número de orden
CREATE INDEX idx_diagnosticos_equipo ON diagnosticos(equipo_id);
CREATE INDEX idx_presupuestos_equipo ON presupuestos(equipo_id);
CREATE INDEX idx_presupuestos_estado ON presupuestos(estado);
CREATE INDEX idx_historial_equipo ON estados_historial(equipo_id);
CREATE INDEX idx_retiros_estado ON retiros_entregas(estado);
CREATE INDEX idx_fotos_equipo ON fotos(equipo_id);

-- ============================================
-- DATOS DE EJEMPLO PARA TESTING
-- ============================================

-- Clientes de ejemplo
INSERT INTO clientes (nombre, telefono, direccion, email, notas) VALUES
('Juan Pérez', '11-2345-6789', 'Av. Corrientes 1234, CABA', 'juan.perez@email.com', 'Cliente frecuente'),
('María González', '11-8765-4321', 'Calle Falsa 123, Vicente López', 'maria.gonzalez@email.com', NULL),
('Carlos Rodríguez', '11-5555-1234', 'San Martín 456, San Isidro', NULL, 'Prefiere contacto por WhatsApp');

-- Equipos de ejemplo
INSERT INTO equipos (numero_orden, cliente_id, marca, modelo, sistema_operativo, imei, falla_reportada, estado_fisico, accesorios, estado_actual) VALUES
('BH-2024-0001', 1, 'Samsung', 'Galaxy S21', 'Android', '123456789012345', 'Pantalla rota', 'Bueno, solo pantalla dañada', '["cargador", "funda"]', 'ingresado'),
('BH-2024-0002', 1, 'Apple', 'iPhone 12 Pro', 'iOS', '987654321098765', 'No enciende', 'Golpes en esquinas', '["cargador original"]', 'diagnostico'),
('BH-2024-0003', 2, 'Motorola', 'Moto G9', 'Android', '555666777888999', 'Batería se descarga rápido', 'Excelente estado', '["cargador", "auriculares", "caja original"]', 'presupuestado'),
('BH-2024-0004', 3, 'Apple', 'iPhone 13', 'iOS', '111222333444555', 'Cámara trasera no funciona', 'Muy buen estado', '["cargador", "funda"]', 'en_reparacion');

-- Actualizar campos específicos de iOS
UPDATE equipos SET icloud_status = 'desbloqueado', biometria_tipo = 'Face ID' WHERE id = 2;
UPDATE equipos SET icloud_status = 'desbloqueado', biometria_tipo = 'Face ID' WHERE id = 4;

-- Diagnósticos de ejemplo
INSERT INTO diagnosticos (equipo_id, tecnico, diagnostico_detallado, reparable, observaciones) VALUES
(2, 'Técnico Principal', 'Placa madre con daño por líquido. Se detectó oxidación en conector de batería. Posible cortocircuito.', 1, 'Reparación compleja. Requiere reballing y limpieza ultrasónica.'),
(3, 'Técnico Junior', 'Batería hinchada con 85% de desgaste. Necesita reemplazo urgente.', 1, 'Batería original agotada. Recomendar batería de calidad.'),
(4, 'Técnico Principal', 'Módulo de cámara trasera desconectado. Cable flex dañado.', 1, 'Reparación sencilla. Reemplazo de flex.');

-- Presupuestos de ejemplo
INSERT INTO presupuestos (equipo_id, diagnostico_id, detalle_repuestos, costo_repuestos, costo_mano_obra, total, estado) VALUES
(2, 1, '[{"nombre":"Limpieza placa","precio":8000},{"nombre":"Reballing","precio":12000}]', 20000, 15000, 35000, 'pendiente'),
(3, 2, '[{"nombre":"Batería compatible","precio":6000}]', 6000, 3000, 9000, 'aceptado'),
(4, 3, '[{"nombre":"Flex cámara iPhone 13","precio":4500}]', 4500, 2500, 7000, 'aceptado');

-- Historial de estados
INSERT INTO estados_historial (equipo_id, estado_anterior, estado_nuevo, observaciones, usuario) VALUES
(1, NULL, 'ingresado', 'Equipo recibido en local', 'Recepción'),
(2, 'ingresado', 'diagnostico', 'Enviado a diagnóstico técnico', 'Recepción'),
(3, 'ingresado', 'diagnostico', 'Diagnóstico realizado', 'Técnico Junior'),
(3, 'diagnostico', 'presupuestado', 'Presupuesto enviado al cliente', 'Sistema'),
(4, 'ingresado', 'diagnostico', 'Diagnóstico completado', 'Técnico Principal'),
(4, 'diagnostico', 'presupuestado', 'Presupuesto aceptado', 'Sistema'),
(4, 'presupuestado', 'en_reparacion', 'Reparación iniciada', 'Técnico Principal');

-- Retiros y entregas de ejemplo
INSERT INTO retiros_entregas (equipo_id, tipo, direccion, fecha_programada, estado, observaciones) VALUES
(1, 'retiro', 'Av. Corrientes 1234, CABA', datetime('now', '+1 day'), 'pendiente', 'Retiro programado para mañana'),
(3, 'entrega', 'Calle Falsa 123, Vicente López', datetime('now', '+2 days'), 'pendiente', 'Entrega una vez finalizada la reparación');

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Equipos con información de cliente
CREATE VIEW vista_equipos_completa AS
SELECT 
    e.id,
    e.numero_orden,
    e.marca,
    e.modelo,
    e.sistema_operativo,
    e.imei,
    e.falla_reportada,
    e.estado_actual,
    e.fecha_ingreso,
    c.nombre as cliente_nombre,
    c.telefono as cliente_telefono,
    c.direccion as cliente_direccion
FROM equipos e
INNER JOIN clientes c ON e.cliente_id = c.id
WHERE c.activo = 1;

-- Vista: Dashboard de estados
CREATE VIEW vista_dashboard_estados AS
SELECT 
    estado_actual,
    COUNT(*) as cantidad,
    sistema_operativo
FROM equipos
GROUP BY estado_actual, sistema_operativo;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
