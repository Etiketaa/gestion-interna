// ════════════ STATE ════════════
let services = [], damages = [], editId = null, acIdx = -1;
let orderCounter = parseInt(localStorage.getItem('orderCounter') || '1000');
let savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');

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
let margins = JSON.parse(localStorage.getItem('margins') || 'null') || { ...DEF_MARGINS };

let inventory = JSON.parse(localStorage.getItem('inventory') || 'null');
if (!inventory) {
  inventory = [
    { id: 1, name: 'Módulo pantalla iPhone 14', cat: 'Módulo pantalla', brand: 'Apple iPhone 14', cost: 32000, stock: 3, min: 1, notes: 'OLED compatible', margin: null },
    { id: 2, name: 'Módulo pantalla Samsung A54', cat: 'Módulo pantalla', brand: 'Samsung A54', cost: 18000, stock: 5, min: 2, notes: '', margin: null },
    { id: 3, name: 'Módulo pantalla Motorola G32', cat: 'Módulo pantalla', brand: 'Motorola G32', cost: 14000, stock: 2, min: 1, notes: 'LCD', margin: null },
    { id: 4, name: 'Batería iPhone 13', cat: 'Batería', brand: 'Apple iPhone 13', cost: 8500, stock: 8, min: 3, notes: '2000mAh', margin: null },
    { id: 5, name: 'Batería iPhone 14', cat: 'Batería', brand: 'Apple iPhone 14', cost: 12000, stock: 4, min: 2, notes: '', margin: null },
    { id: 6, name: 'Batería Samsung A32', cat: 'Batería', brand: 'Samsung A32', cost: 5000, stock: 6, min: 2, notes: '', margin: null },
    { id: 7, name: 'Conector USB-C universal', cat: 'Conector carga', brand: 'Universal', cost: 2500, stock: 12, min: 4, notes: '', margin: null },
    { id: 8, name: 'Conector Lightning iPhone', cat: 'Conector carga', brand: 'Apple iPhone', cost: 3500, stock: 7, min: 2, notes: '', margin: null },
    { id: 9, name: 'Cámara trasera iPhone 12', cat: 'Cámara', brand: 'Apple iPhone 12', cost: 22000, stock: 2, min: 1, notes: 'Triple cámara', margin: null },
    { id: 10, name: 'Cámara frontal Samsung A53', cat: 'Cámara', brand: 'Samsung A53', cost: 9000, stock: 3, min: 1, notes: '', margin: null },
    { id: 11, name: 'Carcasa trasera Xiaomi Redmi Note 11', cat: 'Carcasa', brand: 'Xiaomi Redmi Note 11', cost: 7000, stock: 4, min: 1, notes: '', margin: null },
    { id: 12, name: 'Parlante inferior iPhone 11', cat: 'Parlante / Micrófono', brand: 'Apple iPhone 11', cost: 4500, stock: 5, min: 2, notes: '', margin: null },
    { id: 13, name: 'Botón home Samsung A12', cat: 'Botones', brand: 'Samsung A12', cost: 1800, stock: 10, min: 3, notes: '', margin: null },
    { id: 14, name: 'Flex botón power iPhone X', cat: 'Flex / Cable', brand: 'Apple iPhone X', cost: 3200, stock: 6, min: 2, notes: '', margin: null },
  ];
  localStorage.setItem('inventory', JSON.stringify(inventory));
}
let invIdCnt = Math.max(...inventory.map(i => i.id), 0) + 1;
document.getElementById('eq-orden').value = 'ORD-' + (orderCounter + 1);

// ════════════ HELPERS ════════════
const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n || 0);
const getM = item => item.margin || (margins[item.cat] || 2.5);
const getSP = item => Math.round(item.cost * getM(item));

// ════════════ TABS ════════════
function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => { if (!b.id || !b.id.startsWith('ptab')) b.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'preview') genPreview();
  if (name === 'historial') renderHist();
  if (name === 'inventario') { renderInvStats(); renderInv(); }
  if (name === 'margenes') renderMargins();
  if (name === 'proveedores') { renderProvStats(); renderProvList(); }
}

// ════════════ MARGINS ════════════
function renderMargins() {
  document.getElementById('mgGrid').innerHTML = Object.keys(DEF_MARGINS).map(cat => `
    <div class="mg-row">
      <div class="mg-label"><div class="mg-name">${cat}</div><div class="mg-desc">${MG_DESC[cat]}</div></div>
      <div class="mg-input-wrap">
        <span style="color:var(--muted);font-size:.82rem">×</span>
        <input type="number" step="0.1" min="1" max="20" value="${margins[cat] || DEF_MARGINS[cat]}"
          id="mg-${cat.replace(/\W/g, '_')}" oninput="renderMgPreview()">
      </div>
    </div>`).join('');
  renderMgPreview();
}
function renderMgPreview() {
  document.getElementById('mgPreview').innerHTML = Object.keys(DEF_MARGINS).map(cat => {
    const k = cat.replace(/\W/g, '_');
    const el = document.getElementById('mg-' + k);
    const m = el ? parseFloat(el.value) || DEF_MARGINS[cat] : DEF_MARGINS[cat];
    const pc = ((m - 1) * 100).toFixed(0);
    const pv = ((1 - 1 / m) * 100).toFixed(0);
    const cls = m >= 2.5 ? 'mh' : m >= 1.8 ? 'mm' : 'ml';
    return `<tr><td><span class="category-tag">${cat}</span></td>
      <td style="text-align:center"><span class="margin-pill ${cls}">×${m.toFixed(1)}</span></td>
      <td style="text-align:center;font-family:'DM Mono',monospace;color:var(--accent)">${pc}%</td>
      <td style="text-align:center;font-family:'DM Mono',monospace;color:var(--accent2)">${pv}%</td>
      <td style="font-family:'DM Mono',monospace;color:var(--text)">${fmt(10000 * m)}</td></tr>`;
  }).join('');
}
function saveMargins() {
  Object.keys(DEF_MARGINS).forEach(cat => {
    const el = document.getElementById('mg-' + cat.replace(/\W/g, '_'));
    if (el) margins[cat] = parseFloat(el.value) || DEF_MARGINS[cat];
  });
  localStorage.setItem('margins', JSON.stringify(margins));
  renderInv();
  alert('✅ Márgenes guardados.');
}
function resetMargins() {
  if (!confirm('¿Restablecer márgenes por defecto?')) return;
  margins = { ...DEF_MARGINS };
  localStorage.setItem('margins', JSON.stringify(margins));
  renderMargins(); renderInv();
}

// ════════════ INVENTORY ════════════
function saveInv() { localStorage.setItem('inventory', JSON.stringify(inventory)); }
function renderInvStats() {
  const out = inventory.filter(i => i.stock === 0).length;
  const low = inventory.filter(i => i.stock > 0 && i.stock <= i.min).length;
  const val = inventory.reduce((a, i) => a + i.cost * i.stock, 0);
  const valV = inventory.reduce((a, i) => a + getSP(i) * i.stock, 0);
  document.getElementById('invStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total productos</div><div class="stat-value" style="color:var(--accent)">${inventory.length}</div><div class="stat-sub">en inventario</div></div>
    <div class="stat-card"><div class="stat-label">Stock bajo</div><div class="stat-value" style="color:#ffc107">${low}</div><div class="stat-sub">por reponer</div></div>
    <div class="stat-card"><div class="stat-label">Sin stock</div><div class="stat-value" style="color:var(--warn)">${out}</div><div class="stat-sub">agotados</div></div>
    <div class="stat-card"><div class="stat-label">Valor venta aprox.</div><div class="stat-value" style="font-size:1rem;color:var(--accent2)">${fmt(valV)}</div><div class="stat-sub">costo: ${fmt(val)}</div></div>`;
}
function renderInv() {
  const f = (document.getElementById('invFilter')?.value || '').toLowerCase();
  const cf = document.getElementById('catFilter')?.value || '';
  // refresh cat options
  const cats = [...new Set(inventory.map(i => i.cat))].sort();
  const cs = document.getElementById('catFilter');
  const prev = cs.value;
  cs.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option value="${c}"${c === prev ? ' selected' : ''}>${c}</option>`).join('');

  const list = inventory.filter(i => {
    const mt = !f || i.name.toLowerCase().includes(f) || (i.brand || '').toLowerCase().includes(f) || i.cat.toLowerCase().includes(f);
    return mt && (!cf || i.cat === cf);
  });
  const tbody = document.getElementById('invBody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:28px">Sin resultados.</td></tr>'; return; }
  tbody.innerHTML = list.map(item => {
    const sp = getSP(item); const m = getM(item);
    const gain = sp - item.cost; const pct = item.cost > 0 ? ((gain / item.cost) * 100).toFixed(0) : 0;
    const cls = m >= 2.5 ? 'mh' : m >= 1.8 ? 'mm' : 'ml';
    const custom = item.margin ? '✏️ ' : '';
    let stockEl = item.stock === 0 ? `<span class="stock-out">⛔ Agotado</span>` :
      item.stock <= item.min ? `<span class="stock-low">⚠️ ${item.stock}</span>` :
        `<span class="stock-ok">✅ ${item.stock}</span>`;
    const barW = Math.min(100, Math.round((pct / 300) * 100));
    return `<tr>
      <td><strong style="color:var(--text)">${item.name}</strong>${item.notes ? `<div style="font-size:.72rem;color:var(--muted)">${item.notes}</div>` : ''}</td>
      <td><span class="category-tag">${item.cat}</span></td>
      <td style="color:var(--muted);font-size:.8rem">${item.brand || '—'}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--warn)">${fmt(item.cost)}</td>
      <td style="text-align:right"><span class="margin-pill ${cls}">${custom}×${m.toFixed(1)}</span></td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--accent);font-weight:700">${fmt(sp)}</td>
      <td style="text-align:center">${stockEl}</td>
      <td><div style="display:flex;align-items:center;gap:6px">
        <div class="profit-bar-wrap"><div class="profit-bar" style="width:${barW}%"></div></div>
        <span style="font-family:'DM Mono',monospace;font-size:.74rem;color:var(--accent2)">${pct}%</span>
      </div></td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="editItem(${item.id})">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="delItem(${item.id})" style="color:var(--warn)">🗑</button>
      </div></td></tr>`;
  }).join('');
}

// ════════════ INVENTORY MODAL ════════════
function openModal() {
  editId = null;
  document.getElementById('modalTitle').textContent = '➕ Agregar Repuesto / Servicio';
  ['m-name', 'm-brand', 'm-cost', 'm-margin', 'm-stock', 'm-minstock', 'm-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m-cat').value = 'Módulo pantalla';
  updateModalPreview();
  document.getElementById('addModal').classList.add('open');
}
function editItem(id) {
  const item = inventory.find(i => i.id === id); if (!item) return;
  editId = id;
  document.getElementById('modalTitle').textContent = '✏️ Editar Repuesto';
  document.getElementById('m-name').value = item.name;
  document.getElementById('m-cat').value = item.cat;
  document.getElementById('m-brand').value = item.brand || '';
  document.getElementById('m-cost').value = item.cost;
  document.getElementById('m-margin').value = item.margin || '';
  document.getElementById('m-stock').value = item.stock;
  document.getElementById('m-minstock').value = item.min;
  document.getElementById('m-notes').value = item.notes || '';
  updateModalPreview();
  document.getElementById('addModal').classList.add('open');
}
function closeModal() { document.getElementById('addModal').classList.remove('open'); }
function updateModalPreview() {
  const cost = parseFloat(document.getElementById('m-cost').value) || 0;
  const cat = document.getElementById('m-cat').value;
  const cm = parseFloat(document.getElementById('m-margin').value) || 0;
  const m = cm > 0 ? cm : (margins[cat] || 2.5);
  const sp = Math.round(cost * m); const gain = sp - cost;
  document.getElementById('mpPrice').textContent = fmt(sp);
  document.getElementById('mpInfo').textContent = `${fmt(cost)} × ${m.toFixed(2)} = ${fmt(sp)} | Ganancia: ${fmt(gain)} (${cost > 0 ? ((gain / cost) * 100).toFixed(0) : 0}% sobre costo)`;
}
function saveItem() {
  const name = document.getElementById('m-name').value.trim();
  const cat = document.getElementById('m-cat').value;
  const cost = parseFloat(document.getElementById('m-cost').value) || 0;
  if (!name || !cat) { alert('Nombre y categoría son obligatorios.'); return; }
  const item = {
    id: editId || invIdCnt++, name, cat,
    brand: document.getElementById('m-brand').value.trim(),
    cost, margin: parseFloat(document.getElementById('m-margin').value) || null,
    stock: parseInt(document.getElementById('m-stock').value) || 0,
    min: parseInt(document.getElementById('m-minstock').value) || 2,
    notes: document.getElementById('m-notes').value.trim()
  };
  if (editId) { const idx = inventory.findIndex(i => i.id === editId); if (idx > -1) inventory[idx] = item; }
  else inventory.push(item);
  saveInv(); renderInv(); renderInvStats(); closeModal();
}
function delItem(id) {
  if (!confirm('¿Eliminar este repuesto?')) return;
  inventory = inventory.filter(i => i.id !== id);
  saveInv(); renderInv(); renderInvStats();
}

// ════════════ AUTOCOMPLETE ════════════
function searchAC(q) {
  const list = document.getElementById('acList');
  if (!q || q.length < 2) { list.classList.remove('open'); return; }
  const res = inventory.filter(i =>
    i.name.toLowerCase().includes(q.toLowerCase()) ||
    (i.brand || '').toLowerCase().includes(q.toLowerCase()) ||
    i.cat.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);
  if (!res.length) { list.classList.remove('open'); return; }
  acIdx = -1;
  list.innerHTML = res.map((item, i) => {
    const sp = getSP(item);
    return `<div class="ac-item" onclick="selectAC(${item.id})">
      <span class="ac-cat">${item.cat}</span>
      <span class="ac-name">${item.name}${item.brand ? ` <small style="color:var(--muted)">(${item.brand})</small>` : ''}</span>
      <span class="ac-cost">Costo: ${fmt(item.cost)}</span>
      <span style="margin:0 4px;color:var(--border)">→</span>
      <span class="ac-price">${fmt(sp)}</span>
    </div>`;
  }).join('');
  list._res = res;
  list.classList.add('open');
}
function handleACKey(e) {
  const list = document.getElementById('acList');
  const items = list.querySelectorAll('.ac-item');
  if (e.key === 'ArrowDown') { acIdx = Math.min(acIdx + 1, items.length - 1); hiAC(items); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { acIdx = Math.max(acIdx - 1, -1); hiAC(items); e.preventDefault(); }
  else if (e.key === 'Enter' && acIdx >= 0) { items[acIdx].click(); e.preventDefault(); }
  else if (e.key === 'Escape') list.classList.remove('open');
}
function hiAC(items) { items.forEach((el, i) => el.classList.toggle('sel', i === acIdx)); }
function selectAC(id) {
  const item = inventory.find(i => i.id === id); if (!item) return;
  const sp = getSP(item); const m = getM(item);
  addRow(item.name, item.cat, item.cost, m, sp, item.id);
  document.getElementById('invSearch').value = '';
  document.getElementById('acList').classList.remove('open');
}
document.addEventListener('click', e => { if (!e.target.closest('.autocomplete-wrap')) document.getElementById('acList').classList.remove('open'); });

// ════════════ QUOTATION ROWS ════════════
let rowId = 0;
function addRow(name, cat, cost, margin, salePrice, invId = null) {
  rowId++; const id = rowId;
  services.push({ id, name, cat, cost, margin, price: salePrice, qty: 1, invId });
  renderServices();
}
function renderServices() {
  const tbody = document.getElementById('serviceTableBody');
  tbody.innerHTML = '';
  if (!services.length) {
    tbody.innerHTML = '<tr id="empty-row"><td colspan="9" style="text-align:center;color:var(--muted);font-style:italic;padding:24px">Busque en el inventario o agregue servicios de mano de obra</td></tr>';
    return;
  }
  services.forEach((s, idx) => {
    const isFixed = ['Servicio', 'Mano de obra', 'Diagnóstico'].includes(s.cat);
    const mgLabel = isFixed
      ? '<span style="color:var(--muted);font-size:.73rem;font-family:\'DM Mono\',monospace">manual</span>'
      : `<span style="color:var(--accent2);font-family:'DM Mono',monospace;font-size:.78rem">×${(s.margin || 1).toFixed(1)}</span>`;
    const tr = document.createElement('tr'); tr.id = 'row-' + s.id;
    tr.innerHTML = `
      <td style="color:var(--muted);font-family:'DM Mono',monospace;font-size:.7rem">${idx + 1}</td>
      <td><input type="text" value="${s.name}" style="width:100%;min-width:140px" onchange="updRow(${s.id},'name',this.value)"></td>
      <td><span class="category-tag" style="font-size:.68rem">${s.cat}</span></td>
      <td style="text-align:center"><input type="number" value="${s.qty}" min="1" style="width:48px;text-align:center" onchange="updRow(${s.id},'qty',this.value)"></td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:.78rem;color:var(--warn)">${(s.cost || 0) > 0 ? fmt(s.cost) : '—'}</td>
      <td style="text-align:right">${mgLabel}</td>
      <td><input type="number" value="${s.price}" style="width:100px;text-align:right;font-family:'DM Mono',monospace" onchange="updRow(${s.id},'price',this.value)"></td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--accent);font-weight:700" id="sub-${s.id}">${fmt(s.qty * s.price)}</td>
      <td><button class="remove-btn" onclick="remRow(${s.id})">✕</button></td>`;
    tbody.appendChild(tr);
  });
  recalc();
}
function addQuick(name, price, cat) { addRow(name, cat, 0, 1, price); }
function addEmptyRow() { addRow('Servicio / Repuesto', 'Otro', 0, 1, 0); }
function addDiscount() { addRow('Descuento', 'Otro', 0, 1, -5000); }
function updRow(id, field, val) {
  const s = services.find(s => s.id === id); if (!s) return;
  if (field === 'name') s.name = val;
  if (field === 'qty') s.qty = parseInt(val) || 1;
  if (field === 'price') s.price = parseFloat(val) || 0;
  document.getElementById('sub-' + id).textContent = fmt(s.qty * s.price);
  recalc();
}
function remRow(id) {
  services = services.filter(s => s.id !== id);
  renderServices();
}
function recalc() {
  const sub = services.reduce((a, s) => a + s.qty * s.price, 0);
  const cost = services.reduce((a, s) => a + s.qty * (s.cost || 0), 0);
  const disc = services.filter(s => s.price < 0).reduce((a, s) => a + s.qty * s.price, 0);
  const iva = document.getElementById('ivaToggle').checked ? Math.max(0, sub * 0.19) : 0;
  const total = sub + iva;
  document.getElementById('t-subtotal').textContent = fmt(sub);
  document.getElementById('t-descuento').textContent = fmt(disc);
  document.getElementById('t-iva').textContent = fmt(iva);
  document.getElementById('t-costo').textContent = fmt(cost);
  document.getElementById('t-ganancia').textContent = fmt(total - cost);
  document.getElementById('t-total').textContent = fmt(total);
}

// ════════════ DAMAGE MAP ════════════
function addDamage(e) {
  const map = document.getElementById('phoneMap');
  const rect = map.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
  const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
  const n = damages.length + 1; damages.push({ x, y, n });
  const dot = document.createElement('div');
  dot.className = 'damage-dot'; dot.style.left = x + '%'; dot.style.top = y + '%';
  map.appendChild(dot);
  const list = document.getElementById('damageList');
  if (n === 1) list.innerHTML = '';
  const d = document.createElement('div'); d.className = 'damage-item';
  d.innerHTML = `<strong style="color:var(--warn)">${n}</strong> Punto de daño`;
  list.appendChild(d);
}
function clearDamages() {
  damages = [];
  document.querySelectorAll('#phoneMap .damage-dot').forEach(d => d.remove());
  document.getElementById('damageList').innerHTML = '<div style="color:var(--muted);font-size:.82rem;font-style:italic">Haga clic para marcar puntos.</div>';
}

// ════════════ SIGNATURES ════════════
function initCanvas(id) {
  const c = document.getElementById(id); if (!c) return;
  let drawing = false; const ctx = c.getContext('2d');
  ctx.strokeStyle = '#00e5a0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const pos = (e, c) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c.addEventListener('mousedown', e => { drawing = true; ctx.beginPath(); ctx.moveTo(...pos(e, c)); });
  c.addEventListener('mousemove', e => { if (!drawing) return; ctx.lineTo(...pos(e, c)); ctx.stroke(); });
  c.addEventListener('mouseup', () => drawing = false);
  c.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; ctx.beginPath(); ctx.moveTo(...pos(e.touches[0], c)); }, { passive: false });
  c.addEventListener('touchmove', e => { e.preventDefault(); if (!drawing) return; ctx.lineTo(...pos(e.touches[0], c)); ctx.stroke(); }, { passive: false });
  c.addEventListener('touchend', () => drawing = false);
}
function clearSig() { const c = document.getElementById('sigCanvas'); c.getContext('2d').clearRect(0, 0, c.width, c.height); }
function clearSigTec() { const c = document.getElementById('sigCanvasTec'); c.getContext('2d').clearRect(0, 0, c.width, c.height); }
initCanvas('sigCanvas'); initCanvas('sigCanvasTec');

// ════════════ SAVE / CLEAR ════════════
async function saveQuote() {
  try {
    showLoading();
    
    // 1. Recopilar Accesorios seleccionados
    const accesoriosSelected = [];
    document.querySelectorAll('#tab-recepcion .check-label input[type="checkbox"]').forEach(chk => {
       if(chk.checked) accesoriosSelected.push(chk.parentElement.textContent.trim());
    });

    // 2. Preparar el objeto de la orden
    const totalRaw = document.getElementById('t-total').textContent;
    const totalNum = parseFloat(totalRaw.replace(/[^0-9.-]+/g, "")) || 0;

    const qData = {
      orden: document.getElementById('eq-orden').value,
      cliente_nombre: document.getElementById('cli-nombre').value || '(Sin nombre)',
      equipo_desc: [document.getElementById('eq-marca').value, document.getElementById('eq-modelo').value].filter(Boolean).join(' ') || '(Sin equipo)',
      servicios: services,
      total: totalNum,
      estado: 'Pendiente',
      telefono: document.getElementById('cli-tel').value,
      whatsapp: document.getElementById('cli-wa').value,
      email: document.getElementById('cli-email').value,
      rut: document.getElementById('cli-rut').value,
      marca: document.getElementById('eq-marca').value,
      imei: document.getElementById('eq-imei').value,
      color: document.getElementById('eq-color').value,
      motivo_cliente: document.getElementById('motivo-cliente').value,
      motivo_tecnico: document.getElementById('motivo-tecnico').value,
      observaciones: document.getElementById('obs-cotizacion').value,
      garantia_periodo: document.getElementById('garantia-periodo').value,
      garantia_observaciones: document.getElementById('garantia-obs').value,
      accesorios: accesoriosSelected
    };

    let result;
    if (currentEditId) {
      // ACTUALIZAR
      result = await apiRequest(`/cotizacion/cotizaciones/${currentEditId}`, 'PUT', qData);
      alert('✅ Cotización ' + qData.orden + ' actualizada.');
    } else {
      // CREAR NUEVO
      result = await apiRequest('/cotizacion/cotizaciones', 'POST', qData);
      alert('✅ Cotización guardada como ' + qData.orden);
    }

    const internalId = result.id || currentEditId;

    // 3. Subir Fotos de Ingreso si hay
    const fileInput = document.getElementById('crear-fotos');
    if (fileInput && fileInput.files.length > 0) {
      console.log('Subiendo fotos de ingreso...');
      for (const file of fileInput.files) {
        const formData = new FormData();
        formData.append('foto', file);
        formData.append('equipoId', internalId);
        formData.append('tipo', 'ingreso');
        formData.append('descripcion', 'Foto de ingreso');
        
        await fetch('/api/fotos/upload', { method: 'POST', body: formData });
      }
    }

    // 4. Limpiar y refrescar
    clearForm(); // Esto reseteará currentEditId
    if (typeof loadQuotes === 'function') await loadQuotes(); // Asumimos que existe para recargar del server
    else location.reload(); // Fallback
    
  } catch (e) {
    console.error(e);
    alert('❌ Error al guardar: ' + e.message);
  } finally {
    hideLoading();
  }
}
function clearForm() {
  if (!confirm('¿Limpiar todo el formulario?')) return;
  
  // Resetear estados
  currentEditId = null;
  const saveBtn = document.querySelector('button[onclick="saveQuote()"]');
  if (saveBtn) {
    saveBtn.innerHTML = '💾 Guardar Orden';
    saveBtn.classList.remove('pulse-animation');
  }

  // Limpiar inputs de texto y select
  ['cli-nombre', 'cli-rut', 'cli-tel', 'cli-wa', 'cli-email', 'eq-modelo', 'eq-imei', 'eq-color', 'tecnico', 'motivo-cliente', 'motivo-tecnico', 'obs-cotizacion', 'garantia-obs'].forEach(id => { 
    const el = document.getElementById(id); 
    if (el) el.value = ''; 
  });
  
  // Limpiar servicios
  services = [];
  renderServices();
  
  // Limpiar firma y daños
  clearDamages(); 
  clearSig(); 
  clearSigTec();

  // Limpiar fotos de ingreso
  const fotosInp = document.getElementById('crear-fotos');
  if(fotosInp) fotosInp.value = '';
  const fotosPrv = document.getElementById('crearFotosPreview');
  if(fotosPrv) fotosPrv.innerHTML = '';

  // Desmarcar todos los checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach(chk => chk.checked = false);

  alert('✨ Formulario listo para nueva orden.');
}
function renderHist() {
  const el = document.getElementById('historialContent');
  if (!savedQuotes.length) { el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">No hay órdenes guardadas.</div>'; return; }
  el.innerHTML = savedQuotes.map(q => `
    <div class="quote-row">
      <span class="quote-id">${q.id}</span><span>${q.cliente}</span>
      <span style="color:var(--muted)">${q.equipo}</span>
      <span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:.78rem">${new Date(q.fecha).toLocaleDateString()}</span>
      <span style="color:var(--accent);font-family:'DM Mono',monospace">${fmt(q.total)}</span>
      <span style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span class="badge ${q.estado.toLowerCase().includes('listo') ? 'badge-ok' : 'badge-pending'}">${q.estado}</span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="editQuote(${q.id})" title="Editar Cotización">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="openTrackingModal(${q.id})" title="Gestionar Seguimiento">📍</button>
        </div>
      </span>
    </div>`).join('');
}

// ════════════ PREVIEW ════════════
function genPreview() {
  const g = id => document.getElementById(id)?.value || '—';
  const nombre = g('cli-nombre'), tel = g('cli-tel'), email = g('cli-email'), rut = g('cli-rut');
  const marca = g('eq-marca'), modelo = g('eq-modelo'), imei = g('eq-imei'), orden = g('eq-orden');
  const total = document.getElementById('t-total').textContent;
  const ganancia = document.getElementById('t-ganancia').textContent;
  const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  const garantia = g('garantia-periodo'), tiempo = g('tiempo-rep'), motivo = g('motivo-cliente'), obs = g('obs-cotizacion');
  const rows = services.map((s, i) => `<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;color:#999;font-size:.78rem">${i + 1}</td>
    <td style="padding:8px;border-bottom:1px solid #eee">${s.name}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;color:#777;font-size:.78rem">${s.cat}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${s.qty}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${fmt(s.price)}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:700">${fmt(s.qty * s.price)}</td></tr>`).join('') || '<tr><td colspan="6" style="padding:16px;text-align:center;color:#999">Sin servicios</td></tr>';

  document.getElementById('previewContent').innerHTML = `
    <div style="max-width:700px;margin:0 auto;font-family:'DM Sans',sans-serif;color:#111">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #111;margin-bottom:24px">
        <div><div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800">📱 TechFix<span style="color:#00c87a">Pro</span></div>
          <div style="color:#666;font-size:.82rem;margin-top:3px">Servicio Técnico de Teléfonos Celulares</div>
          <div style="color:#999;font-size:.76rem">📍 Dirección · 📞 Teléfono · ✉️ email@techfix.cl</div></div>
        <div style="text-align:right">
          <div style="font-family:monospace;font-size:1.1rem;font-weight:700;color:#00c87a">${orden}</div>
          <div style="color:#666;font-size:.8rem">${fecha}</div>
          <div style="display:inline-block;background:#fff3cd;color:#856404;border:1px solid #ffc107;border-radius:999px;padding:2px 10px;font-size:.7rem;margin-top:4px">PENDIENTE</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div style="background:#f8f9fa;border-radius:8px;padding:14px">
          <div style="font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:8px">Cliente</div>
          <div style="font-size:.86rem;line-height:1.8"><strong>${nombre}</strong><br>RUT: ${rut}<br>📞 ${tel}<br>✉️ ${email}</div>
        </div>
        <div style="background:#f8f9fa;border-radius:8px;padding:14px">
          <div style="font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:8px">Equipo</div>
          <div style="font-size:.86rem;line-height:1.8"><strong>${marca} ${modelo}</strong><br>IMEI: ${imei}<br>Falla: ${motivo.substring(0, 60)}${motivo.length > 60 ? '...' : ''}<br>Plazo: ${tiempo}</div>
        </div>
      </div>
      <div style="font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:10px">Detalle de Servicios</div>
      <table style="width:100%;border-collapse:collapse;font-size:.84rem;margin-bottom:14px">
        <thead><tr style="background:#111;color:#fff">
          <th style="padding:8px;text-align:left;font-weight:500;font-size:.73rem">#</th>
          <th style="padding:8px;text-align:left;font-weight:500;font-size:.73rem">Descripción</th>
          <th style="padding:8px;text-align:left;font-weight:500;font-size:.73rem">Categoría</th>
          <th style="padding:8px;text-align:center;font-weight:500;font-size:.73rem">Cant.</th>
          <th style="padding:8px;text-align:right;font-weight:500;font-size:.73rem">P. Unitario</th>
          <th style="padding:8px;text-align:right;font-weight:500;font-size:.73rem">Subtotal</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:right;background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:16px">
        <div style="color:#666;font-size:.84rem;margin-bottom:3px">Subtotal: <strong style="font-family:monospace">${document.getElementById('t-subtotal').textContent}</strong></div>
        <div style="color:#666;font-size:.84rem;margin-bottom:6px">IVA: <strong style="font-family:monospace">${document.getElementById('t-iva').textContent}</strong></div>
        <div style="font-size:1.3rem;font-weight:800;font-family:'Syne',sans-serif">TOTAL: <span style="color:#00c87a;font-family:monospace">${total}</span></div>
      </div>
      ${obs !== '—' ? `<div style="background:#e8f5e9;border-left:3px solid #00c87a;padding:10px 14px;border-radius:6px;font-size:.82rem;margin-bottom:14px;color:#2d6a4f"><strong>Observaciones:</strong> ${obs}</div>` : ''}
      <div style="background:#e3f2fd;border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:.82rem">🛡 <strong>Garantía:</strong> ${garantia} | Desde la fecha de entrega al cliente.</div>
      <div style="font-size:.74rem;color:#888;border-top:1px solid #ddd;padding-top:14px;line-height:1.7;margin-bottom:22px">
        <strong>Términos:</strong> Al entregar el equipo el cliente acepta los términos y condiciones. Diagnóstico con costo si no se aprueba reparación. Datos del equipo son responsabilidad del cliente. Garantía no aplica por caídas, agua o apertura por terceros.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding-top:16px;border-top:1px solid #ddd">
        <div style="text-align:center"><div style="height:50px;border-bottom:1px solid #ccc;margin-bottom:6px"></div><div style="font-size:.74rem;color:#666">Firma del cliente</div></div>
        <div style="text-align:center"><div style="height:50px;border-bottom:1px solid #ccc;margin-bottom:6px"></div><div style="font-size:.74rem;color:#666">Firma del técnico</div></div>
      </div>
    </div>`;
}
function printQuote() { genPreview(); setTimeout(() => window.print(), 200); }

// ════════════ PROVEEDORES ════════════
let suppliers = JSON.parse(localStorage.getItem('suppliers') || 'null');
if (!suppliers) {
  suppliers = [
    {
      id: 1, name: 'Repuestos Express', type: 'Mayorista local', rating: 5, contact: '+56 9 8765 4321', delivery: '1-2 días', url: '', payment: 'Efectivo + Transferencia', notes: 'Mínimo $20.000. Buenos descuentos por volumen.',
      prices: [
        { itemId: 1, price: 26000, quality: 'premium', avail: 'En stock', notes: '' },
        { itemId: 2, price: 14500, quality: 'premium', avail: 'En stock', notes: '' },
        { itemId: 4, price: 7000, quality: 'premium', avail: 'En stock', notes: '' },
        { itemId: 7, price: 1800, quality: 'estandar', avail: 'En stock', notes: '' },
      ]
    },
    {
      id: 2, name: 'TechParts Online', type: 'Tienda online', rating: 4, contact: 'ventas@techparts.cl', delivery: '3-5 días', url: 'https://techparts.cl', payment: 'Transferencia', notes: 'Despacho a todo Chile. Factura disponible.',
      prices: [
        { itemId: 1, price: 24500, quality: 'premium', avail: 'En stock', notes: 'Envío gratis +$50.000' },
        { itemId: 3, price: 11000, quality: 'estandar', avail: 'En stock', notes: '' },
        { itemId: 5, price: 10000, quality: 'premium', avail: 'En stock', notes: '' },
        { itemId: 9, price: 18500, quality: 'premium', avail: 'Bajo pedido (1 semana)', notes: '' },
      ]
    },
    {
      id: 3, name: 'AliExpress / Importación', type: 'Marketplace (ML/Ali)', rating: 3, contact: '', delivery: '2-3 semanas (importación)', url: 'https://aliexpress.com', payment: 'Tarjeta', notes: 'Precios bajos pero demora 3-4 semanas. Sin garantía de calidad constante.',
      prices: [
        { itemId: 1, price: 18000, quality: 'estandar', avail: 'Importación (2-4 semanas)', notes: 'Calidad variable' },
        { itemId: 2, price: 10000, quality: 'estandar', avail: 'Importación (2-4 semanas)', notes: '' },
        { itemId: 4, price: 4500, quality: 'economico', avail: 'Importación (2-4 semanas)', notes: '' },
        { itemId: 5, price: 7500, quality: 'economico', avail: 'Importación (2-4 semanas)', notes: '' },
      ]
    },
  ];
  localStorage.setItem('suppliers', JSON.stringify(suppliers));
}
let provIdCnt = Math.max(...suppliers.map(s => s.id), 0) + 1;
let editProvId = null;
let editingProvForPrice = null;
let pmPriceRowCount = 0;



// Sub-tab switch
function switchProvTab(name, btn) {
  ['provs', 'cmp', 'best'].forEach(t => {
    document.getElementById('ppanel-' + t).style.display = t === name ? '' : 'none';
    document.getElementById('ptab-' + t).classList.toggle('active', t === name);
  });
  if (name === 'cmp') populateCmpSelects();
  if (name === 'best') renderBestPrice();
  if (name === 'provs') renderProvList();
}

// ── Proveedor stats
function renderProvStats() {
  const total = suppliers.length;
  const allPrices = suppliers.flatMap(s => s.prices);
  const coveredItems = new Set(allPrices.map(p => p.itemId)).size;
  // find best saving
  let maxSaving = 0;
  inventory.forEach(item => {
    const prices = suppliers.map(s => s.prices.find(p => p.itemId === item.id)?.price).filter(Boolean);
    if (prices.length >= 2) {
      const saving = Math.max(...prices) - Math.min(...prices);
      if (saving > maxSaving) maxSaving = saving;
    }
  });
  const avgRating = total ? (suppliers.reduce((a, s) => a + s.rating, 0) / total).toFixed(1) : 0;
  document.getElementById('provStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Proveedores</div><div class="stat-value" style="color:var(--accent)">${total}</div><div class="stat-sub">registrados</div></div>
    <div class="stat-card"><div class="stat-label">Repuestos cotizados</div><div class="stat-value" style="color:var(--accent2)">${coveredItems}</div><div class="stat-sub">con al menos 1 precio</div></div>
    <div class="stat-card"><div class="stat-label">Mayor ahorro potencial</div><div class="stat-value" style="font-size:1rem;color:var(--accent)">${fmt(maxSaving)}</div><div class="stat-sub">en un mismo repuesto</div></div>
    <div class="stat-card"><div class="stat-label">Rating promedio</div><div class="stat-value" style="color:#ffc107">${avgRating}</div><div class="stat-sub">${'⭐'.repeat(Math.round(avgRating))}</div></div>
  `;
}

// ── Lista proveedores
function renderProvList() {
  const f = (document.getElementById('provFilter')?.value || '').toLowerCase();
  const list = suppliers.filter(s => !f || s.name.toLowerCase().includes(f) || s.type.toLowerCase().includes(f));
  const wrap = document.getElementById('provListWrap');
  if (!list.length) { wrap.innerHTML = '<div style="text-align:center;color:var(--muted);padding:32px">No hay proveedores. Agregue uno con el botón de arriba.</div>'; return; }
  wrap.innerHTML = list.map(s => {
    const tagCls = s.rating >= 4 ? 'prov-tag-a' : s.rating === 3 ? 'prov-tag-b' : 'prov-tag-c';
    const stars = '⭐'.repeat(s.rating);
    const priceCount = s.prices.length;
    // Find best prices this supplier offers vs others
    const wins = s.prices.filter(p => {
      const others = suppliers.filter(x => x.id !== s.id).map(x => x.prices.find(q => q.itemId === p.itemId)?.price).filter(Boolean);
      return !others.length || p.price <= Math.min(...others);
    }).length;

    const priceRows = s.prices.map(p => {
      const item = inventory.find(i => i.id === p.itemId);
      if (!item) return '';
      const currentCost = item.cost;
      const diff = currentCost - p.price;
      const diffPct = currentCost > 0 ? ((diff / currentCost) * 100).toFixed(0) : 0;
      const isBest = suppliers.every(x => x.id === s.id || !(x.prices.find(q => q.itemId === p.itemId)?.price < p.price));
      const qualityLabels = { original: '🥇 Original', premium: '🥈 Premium', estandar: '🥉 Estándar', economico: '💲 Económico' };
      const savingEl = diff > 0
        ? `<span style="color:var(--accent);font-family:'DM Mono',monospace;font-size:.75rem">▼ ${fmt(diff)} (${Math.abs(diffPct)}% más barato)</span>`
        : diff < 0
          ? `<span style="color:var(--warn);font-family:'DM Mono',monospace;font-size:.75rem">▲ ${fmt(Math.abs(diff))} (${Math.abs(diffPct)}% más caro)</span>`
          : `<span style="color:var(--muted);font-size:.75rem">= Igual al inventario</span>`;
      return `<tr ${isBest ? 'class="best-price"' : ''}>
        <td>${isBest ? '<span class="winner-badge">🏆 Mejor</span> ' : ''}${item.name}</td>
        <td><span class="category-tag">${item.cat}</span></td>
        <td style="font-size:.78rem;color:var(--muted)">${qualityLabels[p.quality] || p.quality}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;color:${isBest ? 'var(--accent)' : 'var(--text)'}">${fmt(p.price)}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace;font-size:.8rem;color:var(--muted)">${fmt(item.cost)}</td>
        <td>${savingEl}</td>
        <td style="font-size:.75rem;color:var(--muted)">${p.avail}</td>
        <td style="font-size:.75rem;color:var(--muted)">${p.notes || '—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="editProvPrice(${s.id},${p.itemId})" title="Editar precio">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="delProvPrice(${s.id},${p.itemId})" title="Eliminar precio" style="color:var(--warn)">🗑</button>
        </td>
      </tr>`;
    }).filter(Boolean).join('');

    return `<div class="prov-card">
      <div class="prov-header">
        <div class="prov-name">
          🏪 ${s.name}
          <span class="prov-tag ${tagCls}">${stars} ${s.type}</span>
          ${wins > 0 ? `<span style="font-size:.73rem;color:var(--accent);background:rgba(0,229,160,.1);padding:2px 8px;border-radius:999px;border:1px solid rgba(0,229,160,.2)">🏆 Mejor precio en ${wins}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="openAddPriceModal(${s.id})">+ Precio</button>
          <button class="btn btn-ghost btn-sm" onclick="editProv(${s.id})">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="delProv(${s.id})" style="color:var(--warn)">🗑</button>
        </div>
      </div>
      <div class="prov-meta">
        ${s.contact ? `<span>📞 ${s.contact}</span>` : ''}
        ${s.url ? `<span>🌐 <a href="${s.url}" target="_blank" style="color:var(--accent2)">${s.url.replace('https://', '')}</a></span>` : ''}
        <span>🚚 ${s.delivery}</span>
        <span>💳 ${s.payment}</span>
        <span>📦 ${priceCount} repuesto${priceCount !== 1 ? 's' : ''} cotizado${priceCount !== 1 ? 's' : ''}</span>
        ${s.notes ? `<span style="color:var(--muted)">📝 ${s.notes}</span>` : ''}
      </div>
      ${priceCount > 0 ? `
      <div style="overflow-x:auto">
        <table class="prov-table">
          <thead><tr>
            <th>Repuesto</th><th>Categoría</th><th>Calidad</th>
            <th style="text-align:right">Precio prov.</th>
            <th style="text-align:right">Costo actual</th>
            <th>Diferencia</th>
            <th>Disponibilidad</th>
            <th>Notas</th><th></th>
          </tr></thead>
          <tbody>${priceRows}</tbody>
        </table>
      </div>` : `<div style="color:var(--muted);font-size:.84rem;font-style:italic;padding:8px 0">Sin precios registrados aún. Use "+ Precio" para agregar.</div>`}
    </div>`;
  }).join('');
}

// ── Comparador
function populateCmpSelects() {
  const allItemIds = [...new Set(suppliers.flatMap(s => s.prices.map(p => p.itemId)))];
  const itemSel = document.getElementById('cmpItemSel');
  const provSel = document.getElementById('cmpProvSel');
  const prevItem = itemSel.value;
  itemSel.innerHTML = '<option value="">-- Seleccione un repuesto --</option>' +
    allItemIds.map(id => {
      const item = inventory.find(i => i.id === id);
      return item ? `<option value="${id}" ${id == prevItem ? 'selected' : ''}>${item.name}</option>` : '';
    }).filter(Boolean).join('');
  provSel.innerHTML = '<option value="">Todos los proveedores</option>' +
    suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (prevItem) renderComparador();
}

function renderComparador() {
  const itemId = parseInt(document.getElementById('cmpItemSel').value);
  const filtProvId = parseInt(document.getElementById('cmpProvSel').value) || null;
  const result = document.getElementById('cmpResult');
  if (!itemId) { result.innerHTML = ''; return; }
  const item = inventory.find(i => i.id === itemId);
  if (!item) return;

  const provPrices = suppliers
    .filter(s => !filtProvId || s.id === filtProvId)
    .map(s => {
      const p = s.prices.find(p => p.itemId === itemId);
      return p ? { supplier: s, price: p } : null;
    }).filter(Boolean).sort((a, b) => a.price.price - b.price.price);

  if (!provPrices.length) {
    result.innerHTML = `<div class="card"><div style="text-align:center;color:var(--muted);padding:24px">Ningún proveedor tiene precio para este repuesto.<br><small>Agregue precios desde la sección "Mis proveedores".</small></div></div>`;
    return;
  }

  const best = provPrices[0].price.price;
  const worst = provPrices[provPrices.length - 1].price.price;
  const currentCost = item.cost;
  const salePrice = getSP(item);
  const qualityLabels = { original: '🥇 Original / OEM', premium: '🥈 Compatible Premium', estandar: '🥉 Estándar', economico: '💲 Económico' };

  const rows = provPrices.map((entry, idx) => {
    const isBest = entry.price.price === best;
    const isWorst = provPrices.length > 1 && entry.price.price === worst;
    const diff = entry.price.price - best;
    const saving = worst - entry.price.price;
    const margin = salePrice - entry.price.price;
    const marginPct = salePrice > 0 ? ((margin / salePrice) * 100).toFixed(0) : 0;
    const stars = '⭐'.repeat(entry.supplier.rating);
    return `<tr ${isBest ? 'class="best-price"' : ''}>
      <td>
        ${isBest ? '<span class="winner-badge">🏆 Más barato</span>' : `<span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:.75rem">#${idx + 1}</span>`}
        <strong style="margin-left:6px;color:var(--text)">${entry.supplier.name}</strong>
        <div style="font-size:.72rem;color:var(--muted);margin-top:2px">${entry.supplier.type} · 🚚 ${entry.supplier.delivery}</div>
      </td>
      <td style="font-size:.78rem">${qualityLabels[entry.price.quality] || entry.price.quality}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;font-size:1rem;color:${isBest ? 'var(--accent)' : isWorst ? 'var(--warn)' : 'var(--text)'}">${fmt(entry.price.price)}</td>
      <td style="text-align:right">
        ${isBest ? '<span style="color:var(--accent);font-size:.78rem">Base</span>' : `<span style="color:var(--warn);font-family:\'DM Mono\',monospace;font-size:.78rem">+${fmt(diff)}</span>`}
      </td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:.82rem;color:var(--accent2)">${fmt(margin)}<div style="font-size:.7rem;color:var(--muted)">${marginPct}% del PV</div></td>
      <td style="font-size:.78rem;color:${entry.price.avail === 'En stock' ? 'var(--accent)' : 'var(--muted)'}">${entry.price.avail}</td>
      <td style="font-size:.75rem;color:var(--muted)">${entry.price.notes || '—'}</td>
      <td><button class="btn btn-accent2 btn-sm" onclick="useSupplierPrice(${item.id},${entry.price.price})" title="Usar este precio como costo en inventario">✅ Usar</button></td>
    </tr>`;
  }).join('');

  result.innerHTML = `
    <div class="card">
      <div class="card-title" style="margin-bottom:14px">
        <div class="card-title-icon">📊</div>
        Comparación: <span style="color:var(--accent)">${item.name}</span>
        <span class="category-tag" style="margin-left:4px">${item.cat}</span>
      </div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px;padding:14px;background:var(--surface2);border-radius:var(--radius-sm)">
        <div><div style="font-size:.72rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;margin-bottom:4px">Precio más bajo</div><div style="font-size:1.3rem;font-weight:800;font-family:'Syne',sans-serif;color:var(--accent)">${fmt(best)}</div></div>
        <div><div style="font-size:.72rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;margin-bottom:4px">Precio más alto</div><div style="font-size:1.3rem;font-weight:800;font-family:'Syne',sans-serif;color:var(--warn)">${fmt(worst)}</div></div>
        <div><div style="font-size:.72rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;margin-bottom:4px">Ahorro potencial</div><div style="font-size:1.3rem;font-weight:800;font-family:'Syne',sans-serif;color:var(--accent2)">${fmt(worst - best)}</div></div>
        <div><div style="font-size:.72rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;margin-bottom:4px">Costo actual inv.</div><div style="font-size:1.3rem;font-weight:800;font-family:'Syne',sans-serif;color:var(--text)">${fmt(currentCost)}</div></div>
        <div><div style="font-size:.72rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;margin-bottom:4px">Precio de venta</div><div style="font-size:1.3rem;font-weight:800;font-family:'Syne',sans-serif;color:var(--text)">${fmt(salePrice)}</div></div>
      </div>
      <div style="overflow-x:auto">
        <table class="prov-table">
          <thead><tr>
            <th>Proveedor</th><th>Calidad</th>
            <th style="text-align:right">Precio prov.</th>
            <th style="text-align:right">vs Mejor</th>
            <th style="text-align:right">Ganancia (PV)</th>
            <th>Disponibilidad</th><th>Notas</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="alert alert-info" style="margin-top:14px;margin-bottom:0">💡 <span>Presione <strong>✅ Usar</strong> en cualquier fila para actualizar el precio de costo del inventario con el precio de ese proveedor.</span></div>
    </div>`;
}

// ── Mejor precio global
function renderBestPrice() {
  const tbody = document.getElementById('bestPriceBody');
  const itemsWithPrices = inventory.filter(item =>
    suppliers.some(s => s.prices.find(p => p.itemId === item.id))
  );
  if (!itemsWithPrices.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:28px">Agregue precios a sus proveedores para ver la comparación.</td></tr>';
    return;
  }
  tbody.innerHTML = itemsWithPrices.map(item => {
    const provPrices = suppliers
      .map(s => { const p = s.prices.find(p => p.itemId === item.id); return p ? { name: s.name, price: p.price, id: s.id } : null; })
      .filter(Boolean).sort((a, b) => a.price - b.price);
    const best = provPrices[0];
    const worst = provPrices[provPrices.length - 1];
    const saving = worst.price - best.price;
    const savingPct = worst.price > 0 ? ((saving / worst.price) * 100).toFixed(0) : 0;
    const dots = provPrices.map(p => {
      const isBest = p.price === best.price;
      return `<span title="${p.name}: ${fmt(p.price)}" style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:999px;font-size:.7rem;font-family:'DM Mono',monospace;margin:2px;background:${isBest ? 'rgba(0,229,160,.12)' : 'rgba(42,42,58,.6)'};color:${isBest ? 'var(--accent)' : 'var(--muted)'};border:1px solid ${isBest ? 'rgba(0,229,160,.3)' : 'var(--border)'}">
        ${isBest ? '🏆 ' : ''}${p.name.split(' ')[0]}: ${fmt(p.price)}
      </span>`;
    }).join('');
    return `<tr>
      <td><strong style="color:var(--text)">${item.name}</strong></td>
      <td><span class="category-tag">${item.cat}</span></td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;color:var(--accent)">${fmt(best.price)}</td>
      <td><span class="winner-badge">🏆 ${best.name}</span></td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--warn)">${fmt(worst.price)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--accent2)">${saving > 0 ? fmt(saving) + ` <small style="color:var(--muted)">(${savingPct}%)</small>` : '<span style="color:var(--muted)">—</span>'}</td>
      <td>${dots}</td>
    </tr>`;
  }).join('');
}

// ── Usar precio del proveedor
function useSupplierPrice(itemId, price) {
  const item = inventory.find(i => i.id === itemId);
  if (!item) return;
  if (!confirm(`¿Actualizar el costo de "${item.name}" a ${fmt(price)} en el inventario?`)) return;
  item.cost = price;
  saveInv();
  renderComparador();
  renderBestPrice();
  alert(`✅ Precio actualizado a ${fmt(price)}`);
}

// ── Modal proveedor
function openProvModal() {
  editProvId = null;
  document.getElementById('provModalTitle').textContent = '🏪 Agregar Proveedor';
  ['pm-name', 'pm-contact', 'pm-url', 'pm-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pm-type').value = 'Mayorista local';
  document.getElementById('pm-rating').value = '4';
  document.getElementById('pm-delivery').value = '1-2 días';
  document.getElementById('pm-payment').value = 'Efectivo + Transferencia';
  pmPriceRowCount = 0;
  document.getElementById('pmPricesRows').innerHTML = '';
  document.getElementById('provModal').classList.add('open');
}

function editProv(id) {
  const s = suppliers.find(s => s.id === id);
  if (!s) return;
  editProvId = id;
  document.getElementById('provModalTitle').textContent = '✏️ Editar Proveedor';
  document.getElementById('pm-name').value = s.name;
  document.getElementById('pm-type').value = s.type;
  document.getElementById('pm-rating').value = s.rating;
  document.getElementById('pm-contact').value = s.contact || '';
  document.getElementById('pm-delivery').value = s.delivery;
  document.getElementById('pm-url').value = s.url || '';
  document.getElementById('pm-payment').value = s.payment;
  document.getElementById('pm-notes').value = s.notes || '';
  pmPriceRowCount = 0;
  document.getElementById('pmPricesRows').innerHTML = '';
  document.getElementById('provModal').classList.add('open');
}

function closeProvModal() { document.getElementById('provModal').classList.remove('open'); }

function addPmPriceRow() {
  const c = pmPriceRowCount++;
  const opts = inventory.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  const row = document.createElement('div');
  row.style.cssText = 'display:contents';
  row.innerHTML = `
    <select style="font-size:.82rem" id="pmpr-item-${c}"><option value="">-- Repuesto --</option>${opts}</select>
    <input type="number" placeholder="Precio $" id="pmpr-price-${c}" min="0" style="font-family:'DM Mono',monospace">
    <button type="button" class="remove-btn" onclick="this.parentElement.remove()" style="font-size:.9rem;flex-shrink:0">✕</button>
  `;
  document.getElementById('pmPricesRows').appendChild(row);
}

function saveProv() {
  const name = document.getElementById('pm-name').value.trim();
  if (!name) { alert('El nombre es obligatorio.'); return; }
  // Collect price rows
  const prices = editProvId ? (suppliers.find(s => s.id === editProvId)?.prices || []) : [];
  document.querySelectorAll('#pmPricesRows > div').forEach(row => {
    const itemEl = row.querySelector('[id^="pmpr-item"]');
    const priceEl = row.querySelector('[id^="pmpr-price"]');
    if (itemEl && priceEl && itemEl.value && priceEl.value) {
      const itemId = parseInt(itemEl.value);
      const existing = prices.findIndex(p => p.itemId === itemId);
      const entry = { itemId, price: parseFloat(priceEl.value), quality: 'premium', avail: 'En stock', notes: '' };
      if (existing > -1) prices[existing] = entry; else prices.push(entry);
    }
  });
  const s = {
    id: editProvId || provIdCnt++,
    name, type: document.getElementById('pm-type').value,
    rating: parseInt(document.getElementById('pm-rating').value),
    contact: document.getElementById('pm-contact').value.trim(),
    delivery: document.getElementById('pm-delivery').value,
    url: document.getElementById('pm-url').value.trim(),
    payment: document.getElementById('pm-payment').value,
    notes: document.getElementById('pm-notes').value.trim(),
    prices
  };
  if (editProvId) { const idx = suppliers.findIndex(x => x.id === editProvId); if (idx > -1) suppliers[idx] = s; }
  else suppliers.push(s);
  saveSuppliers();
  renderProvList();
  renderProvStats();
  closeProvModal();
}

function delProv(id) {
  const s = suppliers.find(s => s.id === id);
  if (!confirm(`¿Eliminar proveedor "${s?.name}"?`)) return;
  suppliers = suppliers.filter(s => s.id !== id);
  saveSuppliers();
  renderProvList();
  renderProvStats();
}

// ── Add price to existing supplier
function openAddPriceModal(supplierId) {
  editingProvForPrice = supplierId;
  const s = suppliers.find(s => s.id === supplierId);
  document.getElementById('addPriceTitle').textContent = `➕ Agregar precio — ${s?.name}`;
  const sel = document.getElementById('ap-item');
  sel.innerHTML = '<option value="">-- Seleccionar repuesto --</option>' +
    inventory.map(i => `<option value="${i.id}">${i.name} (${i.cat})</option>`).join('');
  document.getElementById('ap-price').value = '';
  document.getElementById('ap-quality').value = 'premium';
  document.getElementById('ap-avail').value = 'En stock';
  document.getElementById('ap-notes').value = '';
  document.getElementById('apPreviewText').textContent = 'Seleccione un repuesto para ver comparativa';
  document.getElementById('addPriceModal').classList.add('open');
}

function updateAPPreview() {
  const itemId = parseInt(document.getElementById('ap-item').value);
  const price = parseFloat(document.getElementById('ap-price').value) || 0;
  const el = document.getElementById('apPreviewText');
  if (!itemId || !price) { el.textContent = 'Ingrese repuesto y precio.'; return; }
  const item = inventory.find(i => i.id === itemId);
  if (!item) return;
  const sp = getSP(item);
  const margin = sp - price;
  const marginPct = sp > 0 ? ((margin / sp) * 100).toFixed(0) : 0;
  const otherPrices = suppliers
    .filter(s => s.id !== editingProvForPrice)
    .map(s => { const p = s.prices.find(p => p.itemId === itemId); return p ? { name: s.name, price: p.price } : null; })
    .filter(Boolean);
  const cheaper = otherPrices.filter(p => p.price < price);
  const cmpText = otherPrices.length
    ? (cheaper.length ? `⚠️ ${cheaper.length} proveedor(es) ofrecen más barato: ${cheaper.map(p => `${p.name} ${fmt(p.price)}`).join(', ')}` : '✅ Este es el precio más bajo entre proveedores')
    : 'Primer precio para este repuesto.';
  el.innerHTML = `Costo actual inventario: <strong>${fmt(item.cost)}</strong> | PV: <strong>${fmt(sp)}</strong> | Ganancia con este precio: <strong style="color:var(--accent2)">${fmt(margin)} (${marginPct}%)</strong><br><span style="font-size:.78rem;margin-top:4px;display:block">${cmpText}</span>`;
}

function editProvPrice(supplierId, itemId) {
  editingProvForPrice = supplierId;
  const s = suppliers.find(s => s.id === supplierId);
  const p = s?.prices.find(p => p.itemId === itemId);
  if (!p) return;
  document.getElementById('addPriceTitle').textContent = `✏️ Editar precio — ${s.name}`;
  const sel = document.getElementById('ap-item');
  sel.innerHTML = '<option value="">-- Seleccionar repuesto --</option>' +
    inventory.map(i => `<option value="${i.id}" ${i.id === itemId ? 'selected' : ''}>${i.name} (${i.cat})</option>`).join('');
  document.getElementById('ap-price').value = p.price;
  document.getElementById('ap-quality').value = p.quality;
  document.getElementById('ap-avail').value = p.avail;
  document.getElementById('ap-notes').value = p.notes || '';
  updateAPPreview();
  document.getElementById('addPriceModal').classList.add('open');
}

function saveProvPrice() {
  const itemId = parseInt(document.getElementById('ap-item').value);
  const price = parseFloat(document.getElementById('ap-price').value) || 0;
  if (!itemId || !price) { alert('Seleccione repuesto y precio.'); return; }
  const s = suppliers.find(s => s.id === editingProvForPrice);
  if (!s) return;
  const existing = s.prices.findIndex(p => p.itemId === itemId);
  const entry = { itemId, price, quality: document.getElementById('ap-quality').value, avail: document.getElementById('ap-avail').value, notes: document.getElementById('ap-notes').value.trim() };
  if (existing > -1) s.prices[existing] = entry; else s.prices.push(entry);
  saveSuppliers();
  renderProvList();
  renderProvStats();
  document.getElementById('addPriceModal').classList.remove('open');
}

function delProvPrice(supplierId, itemId) {
  const s = suppliers.find(s => s.id === supplierId);
  if (!confirm('¿Eliminar este precio?')) return;
  s.prices = s.prices.filter(p => p.itemId !== itemId);
  saveSuppliers();
  renderProvList();
  renderProvStats();
}

// proveedores tab is handled directly in the main switchTab function above

const now = new Date(), pad = n => String(n).padStart(2, '0');
document.getElementById('fecha-ingreso').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
renderMargins();
initApp();

// ── DESCARGA DE PDF ──
function descargarPDF() {
  const element = document.getElementById('previewContent');
  const cliNombre = document.getElementById('cli-nombre').value.trim() || 'cotizacion';
  const orden = document.getElementById('eq-orden').value || '0001';

  const opt = {
    margin: 10,
    filename: `TechFixPro_${orden}_${cliNombre.replace(/[^a-z0-9]/gi, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Ocultamos elementos temporalmente (no-print equivalent)
  const btnOriginal = element.innerHTML;
  html2pdf().set(opt).from(element).save();
}

// ════════════ SEGUIMIENTO / TRACKING ════════════
function openTrackingModal(id) {
  const q = savedQuotes.find(x => x.id === id);
  if (!q) return;
  document.getElementById('tmQuoteId').value = id;
  const statusSelect = document.getElementById('tmStatus');
  const currentStatus = q.estado.toLowerCase().replace(/ /g, '_');
  if ([...statusSelect.options].some(o => o.value === currentStatus)) {
    statusSelect.value = currentStatus;
  }
  document.getElementById('tmNotes').value = '';
  document.getElementById('tmPreview').innerHTML = '';
  document.getElementById('tmFile').value = '';
  document.getElementById('tModalTitle').textContent = `📍 Seguimiento: Orden ${q.orden || id}`;
  document.getElementById('trackingModal').classList.add('open');
}

function closeTrackingModal() {
  document.getElementById('trackingModal').classList.remove('open');
}

function previewTrackingFiles() {
  const preview = document.getElementById('tmPreview');
  const files = document.getElementById('tmFile').files;
  preview.innerHTML = '';
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const div = document.createElement('div');
      div.style.background = `url(${e.target.result}) center/cover`;
      div.style.borderRadius = '8px';
      div.style.aspectRatio = '1';
      div.style.border = '1px solid var(--border)';
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

async function saveTrackingUpdate() {
  const id = document.getElementById('tmQuoteId').value;
  const estado = document.getElementById('tmStatus').value;
  const observaciones = document.getElementById('tmNotes').value;
  const files = document.getElementById('tmFile').files;

  try {
    showLoading();
    
    // 1. Actualizar estado
    await apiRequest(`/cotizacion/cotizaciones/${id}/estado`, 'PUT', { estado, observaciones });

    // 2. Subir fotos si hay
    if (files.length > 0) {
      for (const file of files) {
        const formData = new FormData();
        formData.append('foto', file);
        formData.append('equipoId', id); // Usamos el ID de la cotización como equipo_id
        formData.append('tipo', 'seguimiento');
        formData.append('descripcion', observaciones || 'Foto de seguimiento');

        const res = await fetch('/api/fotos/upload', {
          method: 'POST',
          body: formData
        });
        if(!res.ok) console.error('Error subiendo foto:', file.name);
      }
    }

    // Actualizar UI local
    const idx = savedQuotes.findIndex(x => x.id == id);
    if(idx > -1) savedQuotes[idx].estado = estado;
    
    closeTrackingModal();
    renderHist();
    alert('✅ Seguimiento actualizado correctamente');
  } finally {
    hideLoading();
  }
}

// ════════════ MEJORAS DE RAPIDEZ (CÁMARA RÁPIDA) ════════════
function openQuickCamera() {
  if (savedQuotes && savedQuotes.length > 0) {
    // Tomar la orden más reciente
    const latest = savedQuotes[0]; 
    openTrackingModal(latest.id);
    // Disparar click en el input de archivo para abrir la cámara de inmediato
    setTimeout(() => {
      document.getElementById('tmFile').click();
    }, 300);
  } else {
    alert('No hay órdenes recientes para subir fotos.');
  }
}

let currentEditId = null;

async function editQuote(id) {
  try {
    showLoading();
    // 1. Buscar la orden en el estado local (o pedir al server si es necesario)
    const q = savedQuotes.find(x => x.id == id);
    if (!q) throw new Error('Cita no encontrada');

    currentEditId = id;
    
    // 2. Llenar campos Cliente
    document.getElementById('cli-nombre').value = q.cliente || '';
    document.getElementById('cli-tel').value = q.telefono || '';
    document.getElementById('cli-wa').value = q.whatsapp || '';
    document.getElementById('cli-email').value = q.email || '';
    document.getElementById('cli-rut').value = q.rut || '';
    
    // 3. Llenar campos Equipo
    document.getElementById('eq-marca').value = q.marca || '';
    document.getElementById('eq-modelo').value = q.equipo || q.modelo || '';
    document.getElementById('eq-imei').value = q.imei || '';
    document.getElementById('eq-color').value = q.color || '';
    document.getElementById('eq-orden').value = q.orden || q.id;
    
    // 4. Notas y Observaciones
    document.getElementById('motivo-cliente').value = q.motivo_cliente || '';
    document.getElementById('motivo-tecnico').value = q.motivo_tecnico || '';
    document.getElementById('obs-cotizacion').value = q.observaciones || '';
    
    // 5. Garantía
    const gPeriodo = document.getElementById('garantia-periodo');
    if(gPeriodo && q.garantia_periodo) gPeriodo.value = q.garantia_periodo;
    
    const gObs = document.getElementById('garantia-obs');
    if(gObs) gObs.value = q.garantia_observaciones || '';

    // 6. Servicios e Items
    if (q.servicios) {
       try {
           services = typeof q.servicios === 'string' ? JSON.parse(q.servicios) : q.servicios;
           renderServices(); // Asumimos que esta es la función que regenera la tabla
           recalc();
       } catch(e) { console.error('Error parseando servicios', e); }
    }

    // 7. Accesorios (Checkbox Logic)
    // Buscamos todos los checkboxes en tab-recepcion
    const checks = document.querySelectorAll('#tab-recepcion .check-label input[type="checkbox"]');
    if (q.accesorios && Array.isArray(q.accesorios)) {
        checks.forEach((chk, i) => {
            chk.checked = q.accesorios.includes(chk.parentElement.textContent.trim());
        });
    }

    // 8. Cambiar UI a modo Edición
    switchTab('recepcion', document.querySelectorAll('.tab-btn')[0]);
    
    const saveBtn = document.querySelector('button[onclick="saveQuote()"]');
    if (saveBtn) {
        saveBtn.innerHTML = '💾 Actualizar Cambios';
        saveBtn.classList.add('pulse-animation'); // Una clase visual opcional
    }
    
    // Scroll arriba para empezar a editar
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    alert('✏️ Editando Orden ' + (q.orden || q.id));
  } catch(e) {
    console.error(e);
    alert('❌ Error al cargar la orden: ' + e.message);
  } finally {
    hideLoading();
  }
}

// ════════════ INICIALIZACIÓN Y CARGA DESDE EL SERVIDOR ════════════
async function loadQuotes() {
  try {
    const quotes = await apiRequest('/cotizacion/cotizaciones');
    if (Array.isArray(quotes)) {
      savedQuotes = quotes;
      renderHist();
    }
  } catch (e) {
    console.error('Error cargando historial:', e);
  }
}

async function syncCounter() {
  try {
    const res = await apiRequest('/cotizacion/cotizaciones/counter');
    if (res && typeof res.counter === 'number') {
      orderCounter = res.counter;
      document.getElementById('eq-orden').value = 'ORD-' + (orderCounter + 1);
    }
  } catch (e) {
    console.error('Error sincronizando contador:', e);
  }
}

async function initApp() {
  showLoading();
  await Promise.all([
    loadQuotes(),
    syncCounter()
  ]);
  hideLoading();
  console.log('🚀 Bit House App Inicializada');
}
