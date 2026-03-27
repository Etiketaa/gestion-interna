const fs = require('fs');
const path = require('path');

// 1. Read the new UI file
const sourceFile = path.join(__dirname, 'cotizacion-celulares.html');
let content = fs.readFileSync(sourceFile, 'utf8');

// 2. Add Topbar HTML for dashboard navigation
const topbarHtml = `
<div class="cot-topbar">
  <div class="cot-topbar-left">
    <a href="/" class="cot-back-btn">⬅ Volver al Inicio</a>
    <span style="color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem;letter-spacing:0.5px">Bit House</span>
  </div>
</div>
`;

content = content.replace('<body>', '<body>\n' + topbarHtml);

const topbarCss = `
  .cot-topbar {
    position: sticky;
    top: 0;
    z-index: 200;
    background: linear-gradient(90deg, #1e40af 0%, #1e3a8a 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 56px;
    box-shadow: 0 2px 12px rgba(0,0,0,.35);
  }
  .cot-topbar-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .cot-back-btn {
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.2);
    color: #fff;
    border-radius: 8px;
    padding: 6px 14px;
    font-size: .82rem;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background .2s;
  }
  .cot-back-btn:hover {
    background: rgba(255,255,255,.2);
  }
  /* Adjust the original TechFix header to not double stick */
  header { top: 56px !important; }
`;

content = content.replace('</style>', topbarCss + '\n</style>');

// 3. Add API Logic scripts
const apiLogicHtml = `
<script src="/js/config.js"></script>
<script>
  window.API = window.API_URL || '/api';
  const token = () => localStorage.getItem('token') || '';
  const hdrs = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() });

  async function apiGet(path) {
    const res = await fetch(API + path, { headers: hdrs() });
    if (res.status === 401) { alert('Sesión expirada'); window.location.href = '/login.html'; throw new Error('No auth'); }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async function apiPost(path, body) {
    const res = await fetch(API + path, { method: 'POST', headers: hdrs(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async function apiPut(path, body) {
    const res = await fetch(API + path, { method: 'PUT', headers: hdrs(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async function apiDelete(path) {
    const res = await fetch(API + path, { method: 'DELETE', headers: hdrs() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
</script>
`;

content = content.replace('<script>', apiLogicHtml + '\n<script>');

// 4. Replace init logic inside <script>
// Find the state initialization
const stateRegex = /let services=\[\].*?let orderCounter=parseInt\(localStorage\.getItem\('orderCounter'\)\|\|'1000'\);\nlet savedQuotes=JSON\.parse\(localStorage\.getItem\('savedQuotes'\)\|\|'\[\]'\);\n\nconst DEF_MARGINS=[\s\S]*?let margins=JSON\.parse\(localStorage\.getItem\('margins'\)\|\|'null'\)\|\|\{\.\.\.DEF_MARGINS\};\n\nlet inventory=JSON\.parse\(localStorage\.getItem\('inventory'\)\|\|'null'\);\nif\(!inventory\)\{[\s\S]*?\}\n\nlet suppliers=JSON\.parse\(localStorage\.getItem\('suppliers'\)\|\|'null'\);\nif\(!suppliers\)\{[\s\S]*?\}\n\nlet invIdCnt=inventory\[inventory\.length-1\].id\+1;\nlet provIdCnt=suppliers\[suppliers\.length-1\]\.id\+1;/g;

const newInitLogic = `
let services = [], damages = [], editId = null, acIdx = -1;
let orderCounter = 1000;
let savedQuotes = [];

const DEF_MARGINS = {
  'Módulo pantalla': 2.7, 'Batería': 2.5, 'Conector carga': 2.8, 'Cámara': 2.6,
  'Carcasa': 2.4, 'Botones': 3.0, 'Parlante / Micrófono': 2.8, 'Flex / Cable': 3.0,
  'Servicio': 1.0, 'Mano de obra': 1.0, 'Diagnóstico': 1.0, 'Otro': 2.5
};
const MG_DESC = {
  'Módulo pantalla': 'Pantallas y módulos táctiles', 'Batería': 'Baterías y acumuladores',
  'Conector carga': 'Puerto USB/Lightning', 'Cámara': 'Módulos de cámara frontal/trasera',
  'Carcasa': 'Tapas traseras y marcos', 'Botones': 'Botones físicos y laterales',
  'Parlante / Micrófono': 'Audio interno', 'Flex / Cable': 'Cintas y cables internos',
  'Servicio': 'Precio fijo manual', 'Mano de obra': 'Precio fijo manual',
  'Diagnóstico': 'Precio fijo manual', 'Otro': 'Misceláneos'
};

let margins = { ...DEF_MARGINS };
let inventory = [];
let suppliers = [];

async function initApp() {
  try {
    const invData = await apiGet('/cotizacion/inventario');
    inventory = invData.repuestos || [];
    margins = invData.margins || { ...DEF_MARGINS };
    orderCounter = parseInt(invData.orderCounter || '1000');

    suppliers = await apiGet('/cotizacion/proveedores');
    savedQuotes = await apiGet('/cotizacion/cotizaciones');

    // Initial render
    renderInv(); renderInvStats();
    renderProvList(); renderProvStats();
    renderHist(); renderMargins();
  } catch (err) {
    console.error('Error init:', err);
    alert('No se pudieron cargar los datos del backend.');
  }
}
// Delete the auto-renders at the bottom, we'll call initApp() there.
`;

content = content.replace(stateRegex, newInitLogic);

// 5. Replace localStorage-saving functions
content = content.replace(/function saveInv\(\) \{[\s\S]*?\}/, ''); // delete saveInv
content = content.replace(/function saveSuppliers\(\) \{[\s\S]*?\}/, ''); // delete saveSuppliers

content = content.replace(/function saveMargins\(\) \{[\s\S]*?\n    saveInv\(\);\n  \}/, `
  async function saveMargins() {
    let m = {};
    Object.keys(MG_DESC).forEach(k => {
      const v = document.getElementById('mg-'+k.replace(/\\W/g,'')).value;
      if (v && parseFloat(v) > 0) m[k] = parseFloat(v);
    });
    margins = m;
    try {
      await apiPost('/cotizacion/inventario/margenes', margins);
      alert('✅ Márgenes guardados.');
      renderMargins();
    } catch (e) { alert('❌ Error: ' + e.message); }
  }
`);

content = content.replace(/function resetMargins\(\) \{[\s\S]*?\n    saveInv\(\);\n  \}/, `
  async function resetMargins() {
    if (!confirm('¿Restablecer márgenes de fábrica?')) return;
    margins = { ...DEF_MARGINS };
    try {
      await apiPost('/cotizacion/inventario/margenes', margins);
      renderMargins();
    } catch (e) { alert('❌ Error: ' + e.message); }
  }
`);


const newSaveItem = `async function saveItem() {
    const name = document.getElementById('m-name').value.trim();
    const cat = document.getElementById('m-cat').value;
    const cost = parseFloat(document.getElementById('m-cost').value) || 0;
    if (!name || !cat) { alert('Nombre y categoría son obligatorios.'); return; }
    
    const itemData = {
      name, cat, brand: document.getElementById('m-brand').value.trim(),
      cost, margin: parseFloat(document.getElementById('m-margin').value) || null,
      stock: parseInt(document.getElementById('m-stock').value) || 0,
      min: parseInt(document.getElementById('m-minstock').value) || 2,
      notes: document.getElementById('m-notes').value.trim()
    };

    if (editId) {
      await apiPut('/cotizacion/inventario/' + editId, itemData);
      const idx = inventory.findIndex(i => i.id === editId);
      if (idx > -1) inventory[idx] = { ...inventory[idx], ...itemData };
    } else {
      const res = await apiPost('/cotizacion/inventario', itemData);
      inventory.push({ id: res.id, ...itemData });
    }
    renderInv(); renderInvStats(); closeModal();
  }`;

content = content.replace(/function saveItem\(\) \{[\s\S]*?closeModal\(\);\n  \}/, newSaveItem);

const newDelItem = `async function delItem(id) {
    if (!confirm('¿Eliminar este repuesto?')) return;
    await apiDelete('/cotizacion/inventario/' + id);
    inventory = inventory.filter(i => i.id !== id);
    renderInv(); renderInvStats();
  }`;
content = content.replace(/function delItem\(id\) \{[\s\S]*?renderInvStats\(\);\n  \}/, newDelItem);

const newSaveQuote = `async function saveQuote() {
    const totalRaw = document.getElementById('t-total').textContent;
    const total = parseInt(totalRaw.replace(/[^0-9]/g, '')) || 0;
    const q = {
      orden: 'ORD-' + (orderCounter + 1),
      cliente: document.getElementById('cli-nombre').value || '(Sin nombre)',
      equipo: [document.getElementById('eq-marca').value, document.getElementById('eq-modelo').value].filter(Boolean).join(' ') || '(Sin equipo)',
      servicios: services,
      total,
      estado: 'Pendiente'
    };
    try {
      const res = await apiPost('/cotizacion/cotizaciones', q);
      orderCounter++;
      savedQuotes.unshift({ ...q, id: res.id, fecha: new Date().toISOString() });
      document.getElementById('eq-orden').value = 'ORD-' + (orderCounter + 1);
      alert('✅ Cotización guardada como ' + q.orden);
    } catch (e) { alert('❌ Error al guardar cotización: ' + e.message); }
  }`;
content = content.replace(/function saveQuote\(\) \{[\s\S]*?alert\('✅ Cotización guardada como ' \+ q\.id\);\n  \}/, newSaveQuote);

const newRenderHist = `async function renderHist() {
    const el = document.getElementById('historialContent');
    try { savedQuotes = await apiGet('/cotizacion/cotizaciones'); } catch (e) {}
    if (!savedQuotes.length) { el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">No hay órdenes guardadas aún.</div>'; return; }
    
    el.innerHTML = savedQuotes.map(q => \`
    <div class="quote-row">
      <div style="font-family:'DM Mono',monospace;color:var(--accent)">\${q.orden || ('ORD-' + q.id)}</div>
      <div style="font-weight:500">\${q.cliente}</div>
      <div style="font-size:.82rem;color:var(--muted)">\${q.equipo}</div>
      <div style="font-family:'DM Mono',monospace;font-size:.82rem;color:var(--muted)">\${new Date(q.fecha).toLocaleDateString('es-CL')}</div>
      <div style="font-family:'DM Mono',monospace;color:var(--accent);font-weight:600;text-align:right">\${fmt(q.total)}</div>
      <div style="text-align:right"><span class="badge badge-pending">\${q.estado}</span></div>
    </div>\`).join('');
  }`;
content = content.replace(/function renderHist\(\) \{[\s\S]*?<\\\/div>\\n  \}'\)\.join\(''\);\n  \}/, newRenderHist);


const newUseSupplierPrice = `async function useSupplierPrice(itemId, price) {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    if (!confirm(\`¿Actualizar el costo de "\${item.name}" a \${fmt(price)} en el inventario?\`)) return;
    try {
      await apiPut('/cotizacion/inventario/' + itemId, { ...item, cost: price });
      item.cost = price;
      renderComparador();
      renderBestPrice();
      alert(\`✅ Precio actualizado a \${fmt(price)}\`);
    } catch (e) { alert('❌ Error al actualizar costo: ' + e.message); }
  }`;
content = content.replace(/function useSupplierPrice\(itemId, price\) \{[\s\S]*?alert\(\`✅ Precio actualizado a \${fmt\(price\)}\`\);\n  \}/, newUseSupplierPrice);

const newSaveProv = `async function saveProv() {
    const name = document.getElementById('pm-name').value.trim();
    if (!name) { alert('El nombre es obligatorio.'); return; }
    const sData = {
      name, type: document.getElementById('pm-type').value,
      rating: parseInt(document.getElementById('pm-rating').value),
      contact: document.getElementById('pm-contact').value.trim(),
      delivery: document.getElementById('pm-delivery').value,
      url: document.getElementById('pm-url').value.trim(),
      payment: document.getElementById('pm-payment').value,
      notes: document.getElementById('pm-notes').value.trim()
    };
    try {
      if (editProvId) {
        await apiPut('/cotizacion/proveedores/' + editProvId, sData);
        const idx = suppliers.findIndex(x => x.id === editProvId);
        if (idx > -1) suppliers[idx] = { ...suppliers[idx], ...sData };
      } else {
        const res = await apiPost('/cotizacion/proveedores', sData);
        suppliers.push({ id: res.id, ...sData, prices: [] });
      }
      renderProvList(); renderProvStats(); closeProvModal();
    } catch (e) { alert('❌ Error al guardar proveedor: ' + e.message); }
  }`;
content = content.replace(/function saveProv\(\) \{[\s\S]*?closeProvModal\(\);\n  \}/, newSaveProv);


const newDelProv = `async function delProv(id) {
    if (!confirm('¿Eliminar proveedor?')) return;
    try {
      await apiDelete('/cotizacion/proveedores/' + id);
      suppliers = suppliers.filter(s => s.id !== id);
      renderProvList(); renderProvStats();
    } catch (e) { alert('❌ Error al eliminar proveedor: ' + e.message); }
  }`;
content = content.replace(/function delProv\(id\) \{[\s\S]*?renderProvStats\(\);\n  \}/, newDelProv);


const newSaveProvPrice = `async function saveProvPrice() {
    const itemId = parseInt(document.getElementById('ap-item').value);
    const price = parseFloat(document.getElementById('ap-price').value) || 0;
    if (!itemId || !price) { alert('Seleccione repuesto y precio.'); return; }
    const pData = {
      itemId, price, quality: document.getElementById('ap-quality').value,
      avail: document.getElementById('ap-avail').value, notes: document.getElementById('ap-notes').value.trim()
    };
    try {
      await apiPost(\`/cotizacion/proveedores/\${editingProvForPrice}/precios\`, pData);
      const s = suppliers.find(s => s.id === editingProvForPrice);
      if (s) {
        const idx = s.prices.findIndex(p => p.itemId === itemId);
        if (idx > -1) s.prices[idx] = pData; else s.prices.push(pData);
      }
      renderProvList(); renderProvStats();
      document.getElementById('addPriceModal').classList.remove('open');
    } catch (e) { alert('❌ Error al guardar precio: ' + e.message); }
  }`;
content = content.replace(/function saveProvPrice\(\) \{[\s\S]*?classList\.remove\('open'\);\n  \}/, newSaveProvPrice);


const newDelProvPrice = `async function delProvPrice(supplierId, itemId) {
    if (!confirm('¿Eliminar este precio?')) return;
    try {
      await apiDelete(\`/cotizacion/proveedores/\${supplierId}/precios/\${itemId}\`);
      const s = suppliers.find(s => s.id === supplierId);
      if (s) s.prices = s.prices.filter(p => p.itemId !== itemId);
      renderProvList(); renderProvStats();
    } catch (e) { alert('❌ Error al eliminar precio: ' + e.message); }
  }`;
content = content.replace(/function delProvPrice\(supplierId, itemId\) \{[\s\S]*?renderProvStats\(\);\n  \}/, newDelProvPrice);


// Finally, replace initial rendering at the bottom with initApp()
content = content.replace(/renderMargins\(\);\n\n  renderInv\(\);\n  renderInvStats\(\);\n  renderProvList\(\);\n  renderProvStats\(\);/g, 'initApp();');
// Since some of those might not exist exactly, just attach initApp() to window.onload:
content = content.replace('</script>\n</body>', '  initApp();\n</script>\n</body>');


fs.writeFileSync(path.join(__dirname, 'public/cotizacion.html'), content);
console.log('✅ Porting complete!');
