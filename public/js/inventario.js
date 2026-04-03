// ════════════════════════════════════════
// INVENTARIO — CRUD conectado a la API
// ════════════════════════════════════════

// Estado local (se sincroniza con la API)
let inventory = [];
let editInvId = null;

const DEF_MARGINS = {
  'Módulo pantalla': 2.7, 'Batería': 2.5, 'Conector carga': 2.8, 'Cámara': 2.6,
  'Carcasa': 2.4, 'Botones': 3.0, 'Parlante / Micrófono': 2.8, 'Flex / Cable': 3.0,
  'Servicio': 1.0, 'Mano de obra': 1.0, 'Diagnóstico': 1.0, 'Otro': 2.5
};
let margins = { ...DEF_MARGINS };

const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n || 0);
const getM  = item => item.margin || (margins[item.cat] || 2.5);
const getSP = item => Math.round(item.cost * getM(item));

// ── Cargar inventario desde la API ──
async function loadInventory() {
  try {
    inventory = await apiRequest('/cotizacion/inventario');
  } catch (e) {
    showToast('Error al cargar inventario: ' + e.message, 'error');
    inventory = [];
  }
}

// ── Cargar márgenes desde la API ──
async function loadMargins() {
  try {
    const data = await apiRequest('/cotizacion/margenes');
    margins = data;
  } catch (e) {
    margins = { ...DEF_MARGINS };
  }
}

// ── Stats de inventario ──
function renderInvStats() {
  const out  = inventory.filter(i => i.stock === 0).length;
  const low  = inventory.filter(i => i.stock > 0 && i.stock <= i.min).length;
  const val  = inventory.reduce((a, i) => a + i.cost * i.stock, 0);
  const valV = inventory.reduce((a, i) => a + getSP(i) * i.stock, 0);
  document.getElementById('invStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total productos</div><div class="stat-value" style="color:var(--accent)">${inventory.length}</div><div class="stat-sub">en inventario</div></div>
    <div class="stat-card"><div class="stat-label">Stock bajo</div><div class="stat-value" style="color:#ffc107">${low}</div><div class="stat-sub">por reponer</div></div>
    <div class="stat-card"><div class="stat-label">Sin stock</div><div class="stat-value" style="color:var(--warn)">${out}</div><div class="stat-sub">agotados</div></div>
    <div class="stat-card"><div class="stat-label">Valor venta aprox.</div><div class="stat-value" style="font-size:1rem;color:var(--accent2)">${fmt(valV)}</div><div class="stat-sub">costo: ${fmt(val)}</div></div>`;
}

// ── Renderizar tabla de inventario ──
function renderInv() {
  const f  = (document.getElementById('invFilter')?.value || '').toLowerCase();
  const cf = document.getElementById('catFilter')?.value || '';
  const cats = [...new Set(inventory.map(i => i.cat))].sort();
  const cs   = document.getElementById('catFilter');
  const prev = cs.value;
  cs.innerHTML = '<option value="">Todas las categorías</option>' +
    cats.map(c => `<option value="${c}"${c === prev ? ' selected' : ''}>${c}</option>`).join('');

  const list = inventory.filter(i => {
    const mt = !f || i.name.toLowerCase().includes(f) || (i.brand||'').toLowerCase().includes(f) || i.cat.toLowerCase().includes(f);
    return mt && (!cf || i.cat === cf);
  });
  const tbody = document.getElementById('invBody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:28px">Sin resultados.</td></tr>'; return; }
  tbody.innerHTML = list.map(item => {
    const sp = getSP(item); const m = getM(item);
    const gain = sp - item.cost; const pct = item.cost > 0 ? ((gain/item.cost)*100).toFixed(0) : 0;
    const cls = m >= 2.5 ? 'mh' : m >= 1.8 ? 'mm' : 'ml';
    const custom = item.margin ? '✏️ ' : '';
    let stockEl = item.stock === 0
      ? `<span class="stock-out">⛔ Agotado</span>`
      : item.stock <= item.min
        ? `<span class="stock-low">⚠️ ${item.stock}</span>`
        : `<span class="stock-ok">✅ ${item.stock}</span>`;
    const barW = Math.min(100, Math.round((pct/300)*100));
    return `<tr>
      <td><strong style="color:var(--text)">${item.name}</strong>${item.notes ? `<div style="font-size:.72rem;color:var(--muted)">${item.notes}</div>` : ''}</td>
      <td><span class="category-tag">${item.cat}</span></td>
      <td style="color:var(--muted);font-size:.8rem">${item.brand||'—'}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--warn)">${fmt(item.cost)}</td>
      <td style="text-align:right"><span class="margin-pill ${cls}">${custom}×${m.toFixed(1)}</span></td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--accent);font-weight:700">${fmt(sp)}</td>
      <td style="text-align:center">${stockEl}</td>
      <td><div style="display:flex;align-items:center;gap:6px">
        <div class="profit-bar-wrap"><div class="profit-bar" style="width:${barW}%"></div></div>
        <span style="font-family:'DM Mono',monospace;font-size:.74rem;color:var(--accent2)">${pct}%</span>
      </div></td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="editInvItem(${item.id})" title="Editar">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteInvItem(${item.id})" style="color:var(--warn)" title="Eliminar">🗑</button>
      </div></td></tr>`;
  }).join('');
}

// ── Abrir modal para agregar ──
function openInvModal() {
  editInvId = null;
  document.getElementById('modalTitle').textContent = '➕ Agregar Repuesto / Servicio';
  ['m-name','m-brand','m-cost','m-margin','m-stock','m-minstock','m-notes'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  document.getElementById('m-cat').value = 'Módulo pantalla';
  document.getElementById('btn-save-item').textContent = '💾 Guardar';
  updateModalPreview();
  document.getElementById('addModal').classList.add('active');
}

// ── Abrir modal para editar ──
function editInvItem(id) {
  const item = inventory.find(i => i.id === id); if (!item) return;
  editInvId = id;
  document.getElementById('modalTitle').textContent = '✏️ Editar Repuesto';
  document.getElementById('m-name').value  = item.name;
  document.getElementById('m-cat').value   = item.cat;
  document.getElementById('m-brand').value = item.brand || '';
  document.getElementById('m-cost').value  = item.cost;
  document.getElementById('m-margin').value= item.margin || '';
  document.getElementById('m-stock').value = item.stock;
  document.getElementById('m-minstock').value = item.min;
  document.getElementById('m-notes').value = item.notes || '';
  document.getElementById('btn-save-item').textContent = '💾 Actualizar';
  updateModalPreview();
  document.getElementById('addModal').classList.add('active');
}

function closeInvModal() { document.getElementById('addModal').classList.remove('active'); }

function updateModalPreview() {
  const cost = parseFloat(document.getElementById('m-cost')?.value) || 0;
  const cat  = document.getElementById('m-cat')?.value;
  const cm   = parseFloat(document.getElementById('m-margin')?.value) || 0;
  const m    = cm > 0 ? cm : (margins[cat] || 2.5);
  const sp   = Math.round(cost * m); const gain = sp - cost;
  document.getElementById('mpPrice').textContent = fmt(sp);
  document.getElementById('mpInfo').textContent  = `${fmt(cost)} × ${m.toFixed(2)} = ${fmt(sp)} | Ganancia: ${fmt(gain)} (${cost > 0 ? ((gain/cost)*100).toFixed(0) : 0}% sobre costo)`;
}

// ── Guardar (crear o actualizar) ──
async function saveItem() {
  const name  = document.getElementById('m-name').value.trim();
  const cat   = document.getElementById('m-cat').value;
  const cost  = parseFloat(document.getElementById('m-cost').value) || 0;
  if (!name || !cat) { showToast('Nombre y categoría son obligatorios.', 'error'); return; }

  const payload = {
    name, cat,
    brand:  document.getElementById('m-brand').value.trim(),
    cost,
    margin: parseFloat(document.getElementById('m-margin').value) || null,
    stock:  parseInt(document.getElementById('m-stock').value) || 0,
    min:    parseInt(document.getElementById('m-minstock').value) || 2,
    notes:  document.getElementById('m-notes').value.trim()
  };

  const btn = document.getElementById('btn-save-item');
  btn.disabled = true; btn.textContent = '⏳ Guardando...';

  try {
    if (editInvId) {
      await apiRequest(`/cotizacion/inventario/${editInvId}`, {
        method: 'PUT', body: JSON.stringify(payload)
      });
      showToast('✅ Repuesto actualizado', 'success');
    } else {
      await apiRequest('/cotizacion/inventario', {
        method: 'POST', body: JSON.stringify(payload)
      });
      showToast('✅ Repuesto creado', 'success');
    }
    closeInvModal();
    await loadInventory();
    renderInv();
    renderInvStats();
    populateCmpSelects();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editInvId ? '💾 Actualizar' : '💾 Guardar';
  }
}

// ── Eliminar ──
async function deleteInvItem(id) {
  const item = inventory.find(i => i.id === id);
  if (!confirm(`¿Eliminar "${item?.name}"? Esta acción no se puede deshacer.`)) return;
  try {
    await apiRequest(`/cotizacion/inventario/${id}`, { method: 'DELETE' });
    showToast('🗑 Repuesto eliminado', 'info');
    await loadInventory();
    renderInv();
    renderInvStats();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── Compatibilidad: alias para cotizacion-app.js ──
function delItem(id) { deleteInvItem(id); }
function editItem(id) { editInvItem(id); }
function closeModal() { closeInvModal(); }

// ════════════ MÁRGENES ════════════
const MG_DESC = {
  'Módulo pantalla':'Pantallas y módulos táctiles','Batería':'Baterías y acumuladores',
  'Conector carga':'Puerto USB/Lightning','Cámara':'Módulos de cámara frontal/trasera',
  'Carcasa':'Tapas traseras y marcos','Botones':'Botones físicos y laterales',
  'Parlante / Micrófono':'Audio interno','Flex / Cable':'Cintas y cables internos',
  'Servicio':'Precio fijo manual','Mano de obra':'Precio fijo manual',
  'Diagnóstico':'Precio fijo manual','Otro':'Misceláneos'
};

function renderMargins() {
  document.getElementById('mgGrid').innerHTML = Object.keys(DEF_MARGINS).map(cat => `
    <div class="mg-row">
      <div class="mg-label"><div class="mg-name">${cat}</div><div class="mg-desc">${MG_DESC[cat]}</div></div>
      <div class="mg-input-wrap">
        <span style="color:var(--muted);font-size:.82rem">×</span>
        <input type="number" step="0.1" min="1" max="20" value="${margins[cat] || DEF_MARGINS[cat]}"
          id="mg-${cat.replace(/\W/g,'_')}" oninput="renderMgPreview()">
      </div>
    </div>`).join('');
  renderMgPreview();
}

function renderMgPreview() {
  document.getElementById('mgPreview').innerHTML = Object.keys(DEF_MARGINS).map(cat => {
    const k = cat.replace(/\W/g,'_');
    const el = document.getElementById('mg-'+k);
    const m = el ? parseFloat(el.value)||DEF_MARGINS[cat] : DEF_MARGINS[cat];
    const pc = ((m-1)*100).toFixed(0);
    const pv = ((1-1/m)*100).toFixed(0);
    const cls = m>=2.5?'mh':m>=1.8?'mm':'ml';
    return `<tr><td><span class="category-tag">${cat}</span></td>
      <td style="text-align:center"><span class="margin-pill ${cls}">×${m.toFixed(1)}</span></td>
      <td style="text-align:center;font-family:'DM Mono',monospace;color:var(--accent)">${pc}%</td>
      <td style="text-align:center;font-family:'DM Mono',monospace;color:var(--accent2)">${pv}%</td>
      <td style="font-family:'DM Mono',monospace;color:var(--text)">${fmt(10000*m)}</td></tr>`;
  }).join('');
}

async function saveMargins() {
  const newMargins = {};
  Object.keys(DEF_MARGINS).forEach(cat => {
    const el = document.getElementById('mg-'+cat.replace(/\W/g,'_'));
    if (el) newMargins[cat] = parseFloat(el.value) || DEF_MARGINS[cat];
  });
  try {
    await apiRequest('/cotizacion/margenes', { method: 'PUT', body: JSON.stringify(newMargins) });
    margins = newMargins;
    renderInv();
    showToast('✅ Márgenes guardados', 'success');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function resetMargins() {
  if (!confirm('¿Restablecer márgenes por defecto?')) return;
  try {
    await apiRequest('/cotizacion/margenes', { method: 'PUT', body: JSON.stringify(DEF_MARGINS) });
    margins = { ...DEF_MARGINS };
    renderMargins(); renderInv();
    showToast('✅ Márgenes restablecidos', 'info');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}
