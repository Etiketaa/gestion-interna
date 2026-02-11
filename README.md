# Sistema de Gestión de Reparación de Celulares - Bit House

Sistema profesional de gestión para taller de reparación de celulares en Argentina. Desarrollado con Node.js, Express y SQLite.

## 🚀 Características

- ✅ Gestión completa de clientes
- ✅ Registro y seguimiento de equipos (Android/iOS)
- ✅ Diagnósticos técnicos
- ✅ Generación y aprobación de presupuestos
- ✅ Historial de estados con timeline
- ✅ Servicio de retiro y entrega a domicilio
- ✅ Diferenciación Android/iOS con campos específicos
- ✅ Interfaz responsive (PC y móvil)
- ✅ Dashboard con estadísticas en tiempo real

## 📋 Requisitos

- Node.js 14 o superior
- npm o yarn

## 🔧 Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias**
```bash
npm install
```

3. **Inicializar la base de datos**
```bash
npm run init-db
```

Esto creará la base de datos SQLite con todas las tablas y datos de ejemplo.

## ▶️ Uso

### Iniciar el servidor

**Modo desarrollo (con auto-reload):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

El servidor estará disponible en: `http://localhost:3000`

### Acceder al sistema

1. Abrir navegador en `http://localhost:3000`
2. El dashboard mostrará estadísticas de equipos por estado
3. Navegar por las diferentes secciones usando el menú lateral

## 📁 Estructura del Proyecto

```
gestion-interna/
├── database/
│   ├── init.sql              # Script de creación de BD
│   └── bithouse.db           # Base de datos SQLite
├── server/
│   ├── index.js              # Servidor Express
│   ├── config/
│   │   └── database.js       # Configuración SQLite
│   └── routes/
│       ├── clientes.js       # API de clientes
│       ├── equipos.js        # API de equipos
│       ├── diagnosticos.js   # API de diagnósticos
│       ├── presupuestos.js   # API de presupuestos
│       └── estados.js        # API de estados
├── public/
│   ├── index.html            # Frontend
│   ├── css/
│   │   └── styles.css        # Estilos
│   └── js/
│       ├── app.js            # Lógica principal
│       ├── clientes.js       # Gestión de clientes
│       ├── equipos.js        # Gestión de equipos
│       └── utils.js          # Utilidades
├── scripts/
│   └── init-database.js      # Script de inicialización
└── package.json
```

## 🔌 API REST - Endpoints

### Clientes
- `GET /api/clientes` - Listar clientes
- `GET /api/clientes/:id` - Obtener cliente
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente
- `GET /api/clientes/:id/equipos` - Equipos del cliente

### Equipos
- `GET /api/equipos` - Listar equipos (filtros: estado, sistema_operativo)
- `GET /api/equipos/:id` - Obtener equipo completo
- `POST /api/equipos` - Registrar equipo
- `PUT /api/equipos/:id` - Actualizar equipo
- `POST /api/equipos/:id/cambiar-estado` - Cambiar estado
- `GET /api/equipos/:id/historial` - Historial de estados

### Diagnósticos
- `POST /api/diagnosticos` - Crear diagnóstico
- `GET /api/diagnosticos/equipo/:equipoId` - Obtener diagnóstico
- `PUT /api/diagnosticos/:id` - Actualizar diagnóstico

### Presupuestos
- `POST /api/presupuestos` - Crear presupuesto
- `GET /api/presupuestos/equipo/:equipoId` - Presupuestos de equipo
- `GET /api/presupuestos/pendientes` - Listar pendientes
- `PUT /api/presupuestos/:id/estado` - Aceptar/Rechazar

### Estados y Retiros/Entregas
- `GET /api/estados/equipos` - Dashboard de estados
- `POST /api/retiros` - Programar retiro
- `POST /api/entregas` - Programar entrega
- `GET /api/retiros-entregas/pendientes` - Listar pendientes
- `PUT /api/retiros-entregas/:id` - Marcar realizado/cancelado

## 📱 Flujo de Trabajo

### 1. Ingreso de Equipo
1. Registrar cliente (si es nuevo)
2. Ingresar equipo con datos completos
3. Sistema registra estado "ingresado"

### 2. Diagnóstico
1. Técnico revisa el equipo
2. Carga diagnóstico detallado
3. Indica si es reparable
4. Estado cambia a "diagnóstico"

### 3. Presupuesto
1. Generar presupuesto con costos
2. Cliente aprueba o rechaza
3. Si aprueba → estado "en_reparacion"
4. Si rechaza → equipo queda en espera

### 4. Reparación
1. Técnico realiza reparación
2. Al finalizar → estado "listo"

### 5. Entrega
1. Programar entrega a domicilio (opcional)
2. Estado "en_camino"
3. Al entregar → estado "entregado"

## 🤖 Diferenciación Android vs iOS

### Campos Específicos iOS
- **Estado iCloud**: Desbloqueado/Bloqueado/Desconocido
- **Biometría**: Touch ID/Face ID/Ninguno

### Indicadores Visuales
- 🤖 Badge verde para Android
- 🍎 Badge negro para iOS
- Campos adicionales solo visibles para iOS

## 🎨 Diseño

- **Responsive**: Optimizado para PC y móvil
- **Paleta profesional**: Azul corporativo con estados diferenciados
- **Badges de estado**: Colores distintos por cada estado
- **Timeline**: Historial visual de cambios
- **Dashboard**: Estadísticas en tiempo real

## 🔒 Seguridad

- Validaciones en backend
- Soft delete para clientes
- Constraints de base de datos
- Manejo de errores robusto

## 📊 Base de Datos

### Tablas Principales
- **clientes**: Datos de clientes
- **equipos**: Equipos ingresados
- **diagnosticos**: Diagnósticos técnicos
- **presupuestos**: Presupuestos generados
- **estados_historial**: Historial de cambios
- **retiros_entregas**: Servicio a domicilio

## 🚧 Roadmap Futuro

- [ ] Sistema de autenticación multi-usuario
- [ ] Reportes y estadísticas avanzadas
- [ ] Integración WhatsApp para notificaciones
- [ ] Sistema de facturación AFIP
- [ ] Gestión de inventario de repuestos
- [ ] App móvil nativa
- [ ] Impresión de órdenes de trabajo
- [ ] Backup automático de base de datos

## 🐛 Troubleshooting

### El servidor no inicia
- Verificar que el puerto 3000 esté libre
- Revisar que Node.js esté instalado correctamente

### Error de base de datos
- Ejecutar `npm run init-db` nuevamente
- Verificar permisos de escritura en carpeta database/

### Frontend no carga
- Verificar que el servidor esté corriendo
- Abrir consola del navegador para ver errores
- Verificar URL: `http://localhost:3000`

## 📝 Licencia

ISC

## 👨‍💻 Autor

Desarrollado para **Bit House** - Taller de Reparación de Celulares

---

**¡Sistema listo para usar!** 🎉
