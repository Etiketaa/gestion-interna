/**
 * Configuración del Frontend
 */

// Usamos el proxy de Vercel configurado en vercel.json
// En desarrollo (localhost), esto apuntará a la API local si usamos el script de dev
// En producción, Vercel redirigirá las llamadas /api a Railway
window.API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : '/api';
