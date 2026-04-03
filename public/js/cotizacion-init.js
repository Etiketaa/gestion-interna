// ════════════════════════════════════════
// COTIZACION APP — Inicializador principal
// Reemplaza la lógica de localStorage con API
// ════════════════════════════════════════

// ── Estado de la cotización ──
let services = [], damages = [], rowId = 0;
let orderCounter = 1000;
let savedQuotes = [];

// ── Tabs ──
function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (!b.id || !b.id.startsWith('ptab')) b.classList.remove('active');
  });
  document.getElementById('tab-'+name).classList.add('active');
  btn.classList.add('active');
  if (name === 'preview')    genPreview();
  if (name === 'historial')  renderHist();
  if (name === 'inventario') { renderInvStats(); renderInv(); }
  if (name === 'margenes')   renderMargins();
  if (name === 'proveedores'){ renderProvStats(); renderProvList(); }
}

// ── Autocomplete de inventario en cotización ──
let acIdx = -1;
function searchAC(q) {
  const list = document.getElementById('acList');
  if (!q || q.length < 2) { list.classList.remove('open'); return; }
  const res = inventory.filter(i =>
    i.name.toLowerCase().includes(q.toLowerCase()) ||
    (i.brand||'').toLowerCase().includes(q.toLowerCase()) ||
    i.cat.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);
  if (!res.length) { list.classList.remove('open'); return; }
  acIdx = -1;
  list.innerHTML = res.map(item => {
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
  const list  = document.getElementById('acList');
  const items = list.querySelectorAll('.ac-item');
  if (e.key === 'ArrowDown')  { acIdx = Math.min(acIdx+1, items.length-1); hiAC(items); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { acIdx = Math.max(acIdx-1, -1); hiAC(items); e.preventDefault(); }
  else if (e.key === 'Enter' && acIdx >= 0) { items[acIdx].click(); e.preventDefault(); }
  else if (e.key === 'Escape') list.classList.remove('open');
}
function hiAC(items) { items.forEach((el,i) => el.classList.toggle('sel', i === acIdx)); }
function selectAC(id) {
  const item = inventory.find(i => i.id === id); if (!item) return;
  addRow(item.name, item.cat, item.cost, getM(item), getSP(item), item.id);
  document.getElementById('invSearch').value = '';
  document.getElementById('acList').classList.remove('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-wrap')) document.getElementById('acList').classList.remove('open');
});

// ── Filas de cotización ──
function addRow(name, cat, cost, margin, salePrice, invId = null) {
  const empRow = document.getElementById('empty-row'); if (empRow) empRow.remove();
  rowId++; const id = rowId;
  services.push({ id, name, cat, cost, margin, price: salePrice, qty: 1, invId });
  const tbody = document.getElementById('serviceTableBody');
  const isFixed = ['Servicio','Mano de obra','Diagnóstico'].includes(cat);
  const mgLabel = isFixed
    ? `<span style="color:var(--muted);font-size:.73rem;font-family:'DM Mono',monospace">manual</span>`
    : `<span style="color:var(--accent2);font-family:'DM Mono',monospace;font-size:.78rem">×${margin.toFixed(1)}</span>`;
  const tr = document.createElement('tr'); tr.id = 'row-'+id;
  tr.innerHTML = `
    <td style="color:var(--muted);font-family:'DM Mono',monospace;font-size:.7rem">${rowId}</td>
    <td><input type="text" value="${name}" style="width:100%;min-width:140px" onchange="updRow(${id},'name',this.value)"></td>
    <td><span class="category-tag" style="font-size:.68rem">${cat}</span></td>
    <td style="text-align:center"><input type="number" value="1" min="1" style="width:48px;text-align:center" onchange="updRow(${id},'qty',this.value)"></td>
    <td style="text-align:right;font-family:'DM Mono',monospace;font-size:.78rem;color:var(--warn)">${cost > 0 ? fmt(cost) : '—'}</td>
    <td style="text-align:right">${mgLabel}</td>
    <td><input type="number" value="${salePrice}" style="width:100px;text-align:right;font-family:'DM Mono',monospace" onchange="updRow(${id},'price',this.value)"></td>
    <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--accent);font-weight:700" id="sub-${id}">${fmt(salePrice)}</td>
    <td><button class="remove-btn" onclick="remRow(${id})">✕</button></td>`;
  tbody.appendChild(tr); recalc();
}

function addQuick(name, price, cat) { addRow(name, cat, 0, 1, price); }
function addEmptyRow() { addRow('Servicio / Repuesto', 'Otro', 0, 1, 0); }
function addDiscount()  { addRow('Descuento', 'Otro', 0, 1, -5000); }

function updRow(id, field, val) {
  const s = services.find(s => s.id === id); if (!s) return;
  if (field === 'name')  s.name  = val;
  if (field === 'qty')   s.qty   = parseInt(val) || 1;
  if (field === 'price') s.price = parseFloat(val) || 0;
  document.getElementById('sub-'+id).textContent = fmt(s.qty * s.price);
  recalc();
}

function remRow(id) {
  services = services.filter(s => s.id !== id);
  const el = document.getElementById('row-'+id); if (el) el.remove();
  if (!services.length)
    document.getElementById('serviceTableBody').innerHTML =
      '<tr id="empty-row"><td colspan="9" style="text-align:center;color:var(--muted);font-style:italic;padding:24px">Busque en el inventario o agregue servicios de mano de obra</td></tr>';
  recalc();
}

function recalc() {
  const sub  = services.reduce((a,s) => a + s.qty * s.price, 0);
  const cost = services.reduce((a,s) => a + s.qty * (s.cost||0), 0);
  const iva  = document.getElementById('ivaToggle').checked ? Math.max(0, sub*0.19) : 0;
  const total = sub + iva;
  document.getElementById('t-subtotal').textContent = fmt(sub);
  document.getElementById('t-descuento').textContent = fmt(services.filter(s=>s.price<0).reduce((a,s)=>a+s.qty*s.price,0));
  document.getElementById('t-iva').textContent       = fmt(iva);
  document.getElementById('t-costo').textContent     = fmt(cost);
  document.getElementById('t-ganancia').textContent  = fmt(total - cost);
  document.getElementById('t-total').textContent     = fmt(total);
}

// ── Mapa de daños ──
function addDamage(e) {
  const map = document.getElementById('phoneMap');
  const rect = map.getBoundingClientRect();
  const x = ((e.clientX-rect.left)/rect.width*100).toFixed(1);
  const y = ((e.clientY-rect.top)/rect.height*100).toFixed(1);
  const n = damages.length + 1; damages.push({x,y,n});
  const dot = document.createElement('div');
  dot.className = 'damage-dot'; dot.style.left = x+'%'; dot.style.top = y+'%';
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

// ── Firmas ──
function initCanvas(id) {
  const c = document.getElementById(id); if (!c) return;
  let drawing = false; const ctx = c.getContext('2d');
  ctx.strokeStyle = '#00e5a0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const pos = (e, c) => { const r = c.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; };
  c.addEventListener('mousedown', e => { drawing=true; ctx.beginPath(); ctx.moveTo(...pos(e,c)); });
  c.addEventListener('mousemove', e => { if (!drawing) return; ctx.lineTo(...pos(e,c)); ctx.stroke(); });
  c.addEventListener('mouseup', () => drawing=false);
  c.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; ctx.beginPath(); ctx.moveTo(...pos(e.touches[0],c)); },{passive:false});
  c.addEventListener('touchmove',  e => { e.preventDefault(); if (!drawing) return; ctx.lineTo(...pos(e.touches[0],c)); ctx.stroke(); },{passive:false});
  c.addEventListener('touchend', () => drawing=false);
}
function clearSig()    { const c=document.getElementById('sigCanvas');    c.getContext('2d').clearRect(0,0,c.width,c.height); }
function clearSigTec() { const c=document.getElementById('sigCanvasTec'); c.getContext('2d').clearRect(0,0,c.width,c.height); }

// ── Guardar/limpiar cotización ──
async function saveQuote() {
  orderCounter++;
  const q = {
    order: 'ORD-'+orderCounter,
    clienteName: document.getElementById('cli-nombre').value || '(Sin nombre)',
    equipoDesc:  [document.getElementById('eq-marca').value, document.getElementById('eq-modelo').value].filter(Boolean).join(' ') || '(Sin equipo)',
    servicios:   JSON.stringify(services),
    total:       parseFloat(document.getElementById('t-total').textContent.replace(/\D/g,'')) || 0,
    estado:      'Pendiente'
  };
  try {
    await apiRequest('/cotizacion/cotizaciones', { method: 'POST', body: JSON.stringify(q) });
    document.getElementById('eq-orden').value = 'ORD-'+(orderCounter+1);
    showToast('✅ Cotización guardada como ' + q.order, 'success');
    renderHist();
  } catch (e) {
    // fallback local si el endpoint falla
    orderCounter--;
    showToast('Error al guardar: ' + e.message, 'error');
  }
}

function clearForm() {
  if (!confirm('¿Limpiar todo el formulario?')) return;
  ['cli-nombre','cli-rut','cli-tel','cli-wa','cli-email','eq-modelo','eq-imei','eq-color','tecnico','motivo-cliente','motivo-tecnico','obs-cotizacion','garantia-obs']
    .forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  services = [];
  document.getElementById('serviceTableBody').innerHTML =
    '<tr id="empty-row"><td colspan="9" style="text-align:center;color:var(--muted);font-style:italic;padding:24px">Busque en el inventario o agregue servicios de mano de obra</td></tr>';
  recalc(); clearDamages(); clearSig(); clearSigTec();
}

// ── Historial ──
async function renderHist() {
  const el = document.getElementById('historialContent');
  try {
    const data = await apiRequest('/cotizacion/cotizaciones');
    const quotes = data.cotizaciones || data || [];
    if (!quotes.length) {
      el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">No hay órdenes guardadas.</div>';
      return;
    }
    el.innerHTML = quotes.map(q => `
      <div class="quote-row">
        <span class="quote-id">${q.orden || q.order}</span>
        <span>${q.cliente_nombre || q.clienteName}</span>
        <span style="color:var(--muted)">${q.equipo_desc || q.equipoDesc}</span>
        <span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:.78rem">${new Date(q.fecha||q.created_at).toLocaleDateString('es-CL')}</span>
        <span style="color:var(--accent);font-family:'DM Mono',monospace">${fmt(q.total)}</span>
        <span><span class="badge badge-pending">${q.estado}</span></span>
      </div>`).join('');
  } catch (e) {
    el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">No hay órdenes guardadas.</div>';
  }
}

// ── Vista previa ──
function genPreview() {
  const g = id => document.getElementById(id)?.value || '—';
  const nombre=g('cli-nombre'),tel=g('cli-tel'),email=g('cli-email'),rut=g('cli-rut');
  const marca=g('eq-marca'),modelo=g('eq-modelo'),imei=g('eq-imei'),orden=g('eq-orden');
  const total=document.getElementById('t-total').textContent;
  const fecha=new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'});
  const garantia=g('garantia-periodo'),tiempo=g('tiempo-rep'),motivo=g('motivo-cliente'),obs=g('obs-cotizacion');
  const rows = services.map((s,i) => `<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;color:#999;font-size:.78rem">${i+1}</td>
    <td style="padding:8px;border-bottom:1px solid #eee">${s.name}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;color:#777;font-size:.78rem">${s.cat}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${s.qty}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${fmt(s.price)}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:700">${fmt(s.qty*s.price)}</td></tr>`).join('') ||
    '<tr><td colspan="6" style="padding:16px;text-align:center;color:#999">Sin servicios</td></tr>';

  document.getElementById('previewContent').innerHTML = `
    <div style="max-width:700px;margin:0 auto;font-family:'DM Sans',sans-serif;color:#111">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #111;margin-bottom:24px">
        <div><div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800">📱 Bit<span style="color:#00c87a">House</span></div>
          <div style="color:#666;font-size:.82rem;margin-top:3px">Servicio Técnico de Teléfonos Celulares</div></div>
        <div style="text-align:right">
          <div style="font-family:monospace;font-size:1.1rem;font-weight:700;color:#00c87a">${orden}</div>
          <div style="color:#666;font-size:.8rem">${fecha}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div style="background:#f8f9fa;border-radius:8px;padding:14px">
          <div style="font-weight:700;font-size:.78rem;text-transform:uppercase;color:#555;margin-bottom:8px">Cliente</div>
          <div style="font-size:.86rem;line-height:1.8"><strong>${nombre}</strong><br>RUT: ${rut}<br>📞 ${tel}<br>✉️ ${email}</div>
        </div>
        <div style="background:#f8f9fa;border-radius:8px;padding:14px">
          <div style="font-weight:700;font-size:.78rem;text-transform:uppercase;color:#555;margin-bottom:8px">Equipo</div>
          <div style="font-size:.86rem;line-height:1.8"><strong>${marca} ${modelo}</strong><br>IMEI: ${imei}<br>Falla: ${motivo.substring(0,60)}${motivo.length>60?'...':''}<br>Plazo: ${tiempo}</div>
        </div>
      </div>
      <div style="font-weight:700;font-size:.78rem;text-transform:uppercase;color:#555;margin-bottom:10px">Detalle de Servicios</div>
      <table style="width:100%;border-collapse:collapse;font-size:.84rem;margin-bottom:14px">
        <thead><tr style="background:#111;color:#fff">
          <th style="padding:8px;text-align:left;font-size:.73rem">#</th>
          <th style="padding:8px;text-align:left;font-size:.73rem">Descripción</th>
          <th style="padding:8px;text-align:left;font-size:.73rem">Categoría</th>
          <th style="padding:8px;text-align:center;font-size:.73rem">Cant.</th>
          <th style="padding:8px;text-align:right;font-size:.73rem">P. Unitario</th>
          <th style="padding:8px;text-align:right;font-size:.73rem">Subtotal</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:right;background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:16px">
        <div style="color:#666;font-size:.84rem;margin-bottom:3px">Subtotal: <strong style="font-family:monospace">${document.getElementById('t-subtotal').textContent}</strong></div>
        <div style="color:#666;font-size:.84rem;margin-bottom:6px">IVA: <strong style="font-family:monospace">${document.getElementById('t-iva').textContent}</strong></div>
        <div style="font-size:1.3rem;font-weight:800;font-family:'Syne',sans-serif">TOTAL: <span style="color:#00c87a;font-family:monospace">${total}</span></div>
      </div>
      ${obs !== '—' ? `<div style="background:#e8f5e9;border-left:3px solid #00c87a;padding:10px 14px;border-radius:6px;font-size:.82rem;margin-bottom:14px"><strong>Observaciones:</strong> ${obs}</div>` : ''}
      <div style="background:#e3f2fd;border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:.82rem">🛡 <strong>Garantía:</strong> ${garantia} | Desde la fecha de entrega al cliente.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding-top:16px;border-top:1px solid #ddd">
        <div style="text-align:center"><div style="height:50px;border-bottom:1px solid #ccc;margin-bottom:6px"></div><div style="font-size:.74rem;color:#666">Firma del cliente</div></div>
        <div style="text-align:center"><div style="height:50px;border-bottom:1px solid #ccc;margin-bottom:6px"></div><div style="font-size:.74rem;color:#666">Firma del técnico</div></div>
      </div>
    </div>`;
}

function printQuote() { genPreview(); setTimeout(() => window.print(), 200); }

function descargarPDF() {
  const element = document.getElementById('previewContent');
  const cliNombre = document.getElementById('cli-nombre').value.trim() || 'cotizacion';
  const orden = document.getElementById('eq-orden').value || '0001';
  const opt = {
    margin: 10,
    filename: `BitHouse_${orden}_${cliNombre.replace(/[^a-z0-9]/gi,'_')}.pdf`,
    image: { type:'jpeg', quality:0.98 },
    html2canvas: { scale:2, useCORS:true },
    jsPDF: { unit:'mm', format:'a4', orientation:'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

// ════════════ INICIALIZACIÓN ════════════
async function initApp() {
  try {
    await Promise.all([loadInventory(), loadMargins(), loadSuppliers()]);

    // Cargar historial de cotizaciones para obtener el última orden
    try {
      const data = await apiRequest('/cotizacion/cotizaciones');
      const quotes = data.cotizaciones || data || [];
      if (quotes.length) {
        const nums = quotes.map(q => parseInt((q.orden||q.order||'').replace('ORD-',''))).filter(n => !isNaN(n));
        if (nums.length) orderCounter = Math.max(...nums);
      }
    } catch (_) { /* usa default */ }

    // Establecer número de orden siguiente
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    const eq = document.getElementById('eq-orden');
    if (eq) eq.value = 'ORD-'+(orderCounter+1);
    const fi = document.getElementById('fecha-ingreso');
    if (fi) fi.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Inicializar canvas de firmas
    initCanvas('sigCanvas');
    initCanvas('sigCanvasTec');

    // Renderizar márgenes
    renderMargins();

    console.log('✅ App de cotización inicializada con API');
  } catch (e) {
    console.error('Error al inicializar:', e);
    showToast('Error de conexión con el servidor', 'error');
  }
}

// Cerrar modales al hacer clic fuera
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── Arrancar la app cuando el DOM esté listo ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
