// ════════════════════════════════════════
// PROVEEDORES — CRUD conectado a la API
// ════════════════════════════════════════

let suppliers = [];
let editProvId = null;
let editingProvForPrice = null;

// ── Cargar proveedores desde la API ──
async function loadSuppliers() {
  try {
    suppliers = await apiRequest('/cotizacion/proveedores');
  } catch (e) {
    showToast('Error al cargar proveedores: ' + e.message, 'error');
    suppliers = [];
  }
}

// ── Stats ──
function renderProvStats() {
  const total = suppliers.length;
  const allPrices = suppliers.flatMap(s => s.prices || []);
  const coveredItems = new Set(allPrices.map(p => p.itemId)).size;
  let maxSaving = 0;
  inventory.forEach(item => {
    const prices = suppliers.map(s => (s.prices||[]).find(p => p.itemId === item.id)?.price).filter(Boolean);
    if (prices.length >= 2) {
      const saving = Math.max(...prices) - Math.min(...prices);
      if (saving > maxSaving) maxSaving = saving;
    }
  });
  const avgRating = total ? (suppliers.reduce((a,s) => a+s.rating,0)/total).toFixed(1) : 0;
  document.getElementById('provStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Proveedores</div><div class="stat-value" style="color:var(--accent)">${total}</div><div class="stat-sub">registrados</div></div>
    <div class="stat-card"><div class="stat-label">Repuestos cotizados</div><div class="stat-value" style="color:var(--accent2)">${coveredItems}</div><div class="stat-sub">con al menos 1 precio</div></div>
    <div class="stat-card"><div class="stat-label">Mayor ahorro potencial</div><div class="stat-value" style="font-size:1rem;color:var(--accent)">${fmt(maxSaving)}</div><div class="stat-sub">en un mismo repuesto</div></div>
    <div class="stat-card"><div class="stat-label">Rating promedio</div><div class="stat-value" style="color:#ffc107">${avgRating}</div><div class="stat-sub">${'⭐'.repeat(Math.round(avgRating))}</div></div>`;
}

// ── Lista de proveedores ──
function renderProvList() {
  const f = (document.getElementById('provFilter')?.value || '').toLowerCase();
  const list = suppliers.filter(s => !f || s.name.toLowerCase().includes(f) || s.type.toLowerCase().includes(f));
  const wrap = document.getElementById('provListWrap');
  if (!list.length) {
    wrap.innerHTML = '<div style="text-align:center;color:var(--muted);padding:32px">No hay proveedores. Agregue uno con el botón de arriba.</div>';
    return;
  }
  const qualityLabels = { original:'🥇 Original', premium:'🥈 Premium', estandar:'🥉 Estándar', economico:'💲 Económico' };
  wrap.innerHTML = list.map(s => {
    const tagCls = s.rating >= 4 ? 'prov-tag-a' : s.rating === 3 ? 'prov-tag-b' : 'prov-tag-c';
    const stars = '⭐'.repeat(s.rating);
    const prices = s.prices || [];
    const priceCount = prices.length;
    const wins = prices.filter(p => {
      const others = suppliers.filter(x => x.id !== s.id).map(x => (x.prices||[]).find(q => q.itemId === p.itemId)?.price).filter(Boolean);
      return !others.length || p.price <= Math.min(...others);
    }).length;

    const priceRows = prices.map(p => {
      const item = inventory.find(i => i.id === p.itemId);
      if (!item) return '';
      const diff = item.cost - p.price;
      const diffPct = item.cost > 0 ? ((diff/item.cost)*100).toFixed(0) : 0;
      const isBest = suppliers.every(x => x.id === s.id || !((x.prices||[]).find(q => q.itemId === p.itemId)?.price < p.price));
      const savingEl = diff > 0
        ? `<span style="color:var(--accent);font-family:'DM Mono',monospace;font-size:.75rem">▼ ${fmt(diff)} (${Math.abs(diffPct)}% más barato)</span>`
        : diff < 0
          ? `<span style="color:var(--warn);font-family:'DM Mono',monospace;font-size:.75rem">▲ ${fmt(Math.abs(diff))} (${Math.abs(diffPct)}% más caro)</span>`
          : `<span style="color:var(--muted);font-size:.75rem">= Igual al inventario</span>`;
      return `<tr ${isBest ? 'class="best-price"' : ''}>
        <td>${isBest ? '<span class="winner-badge">🏆 Mejor</span> ' : ''}${item.name}</td>
        <td><span class="category-tag">${item.cat}</span></td>
        <td style="font-size:.78rem;color:var(--muted)">${qualityLabels[p.quality]||p.quality}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;color:${isBest?'var(--accent)':'var(--text)'}">  ${fmt(p.price)}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace;font-size:.8rem;color:var(--muted)">${fmt(item.cost)}</td>
        <td>${savingEl}</td>
        <td style="font-size:.75rem;color:var(--muted)">${p.avail}</td>
        <td style="font-size:.75rem;color:var(--muted)">${p.notes||'—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="editProvPrice(${s.id},${p.itemId})" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="delProvPrice(${s.id},${p.itemId})" style="color:var(--warn)" title="Eliminar">🗑</button>
        </td></tr>`;
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
        ${s.url ? `<span>🌐 <a href="${s.url}" target="_blank" style="color:var(--accent2)">${s.url.replace('https://','')}</a></span>` : ''}
        <span>🚚 ${s.delivery}</span>
        <span>💳 ${s.payment}</span>
        <span>📦 ${priceCount} repuesto${priceCount!==1?'s':''} cotizado${priceCount!==1?'s':''}</span>
        ${s.notes ? `<span style="color:var(--muted)">📝 ${s.notes}</span>` : ''}
      </div>
      ${priceCount > 0 ? `
      <div style="overflow-x:auto">
        <table class="prov-table">
          <thead><tr>
            <th>Repuesto</th><th>Categoría</th><th>Calidad</th>
            <th style="text-align:right">Precio prov.</th>
            <th style="text-align:right">Costo actual</th>
            <th>Diferencia</th><th>Disponibilidad</th><th>Notas</th><th></th>
          </tr></thead>
          <tbody>${priceRows}</tbody>
        </table>
      </div>` : `<div style="color:var(--muted);font-size:.84rem;font-style:italic;padding:8px 0">Sin precios registrados aún. Use "+ Precio" para agregar.</div>`}
    </div>`;
  }).join('');
}

// ── Abrir modal agregar proveedor ──
function openProvModal() {
  editProvId = null;
  document.getElementById('provModalTitle').textContent = '🏪 Agregar Proveedor';
  ['pm-name','pm-contact','pm-url','pm-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pm-type').value    = 'Mayorista local';
  document.getElementById('pm-rating').value  = '4';
  document.getElementById('pm-delivery').value = '1-2 días';
  document.getElementById('pm-payment').value  = 'Efectivo + Transferencia';
  document.getElementById('pmPricesRows').innerHTML = '';
  document.getElementById('provModal').classList.add('active');
}

// ── Editar proveedor ──
function editProv(id) {
  const s = suppliers.find(s => s.id === id); if (!s) return;
  editProvId = id;
  document.getElementById('provModalTitle').textContent = '✏️ Editar Proveedor';
  document.getElementById('pm-name').value    = s.name;
  document.getElementById('pm-type').value    = s.type;
  document.getElementById('pm-rating').value  = s.rating;
  document.getElementById('pm-contact').value = s.contact||'';
  document.getElementById('pm-delivery').value= s.delivery;
  document.getElementById('pm-url').value     = s.url||'';
  document.getElementById('pm-payment').value = s.payment;
  document.getElementById('pm-notes').value   = s.notes||'';
  document.getElementById('pmPricesRows').innerHTML = '';
  document.getElementById('provModal').classList.add('active');
}

function closeProvModal() { document.getElementById('provModal').classList.remove('active'); }

let pmPriceRowCount = 0;
function addPmPriceRow() {
  const c = pmPriceRowCount++;
  const opts = inventory.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  const row = document.createElement('div');
  row.style.cssText = 'display:contents';
  row.innerHTML = `
    <select style="font-size:.82rem" id="pmpr-item-${c}"><option value="">-- Repuesto --</option>${opts}</select>
    <input type="number" placeholder="Precio $" id="pmpr-price-${c}" min="0" style="font-family:'DM Mono',monospace">
    <button type="button" class="remove-btn" onclick="this.parentElement.remove()" style="font-size:.9rem;flex-shrink:0">✕</button>`;
  document.getElementById('pmPricesRows').appendChild(row);
}

// ── Guardar proveedor (crear o actualizar) ──
async function saveProv() {
  const name = document.getElementById('pm-name').value.trim();
  if (!name) { showToast('El nombre es obligatorio.', 'error'); return; }

  // Recoger filas de precios del modal
  const newPrices = [];
  document.querySelectorAll('#pmPricesRows > div').forEach(row => {
    const itemEl  = row.querySelector('[id^="pmpr-item"]');
    const priceEl = row.querySelector('[id^="pmpr-price"]');
    if (itemEl?.value && priceEl?.value) {
      newPrices.push({ itemId: parseInt(itemEl.value), price: parseFloat(priceEl.value), quality: 'premium', avail: 'En stock', notes: '' });
    }
  });

  const payload = {
    name,
    type:    document.getElementById('pm-type').value,
    rating:  parseInt(document.getElementById('pm-rating').value),
    contact: document.getElementById('pm-contact').value.trim(),
    delivery:document.getElementById('pm-delivery').value,
    url:     document.getElementById('pm-url').value.trim(),
    payment: document.getElementById('pm-payment').value,
    notes:   document.getElementById('pm-notes').value.trim(),
    prices:  newPrices
  };

  try {
    if (editProvId) {
      await apiRequest(`/cotizacion/proveedores/${editProvId}`, { method: 'PUT', body: JSON.stringify(payload) });
      // guardar precios nuevos del modal
      for (const p of newPrices) {
        await apiRequest(`/cotizacion/proveedores/${editProvId}/precios`, { method: 'POST', body: JSON.stringify(p) });
      }
      showToast('✅ Proveedor actualizado', 'success');
    } else {
      await apiRequest('/cotizacion/proveedores', { method: 'POST', body: JSON.stringify(payload) });
      showToast('✅ Proveedor creado', 'success');
    }
    closeProvModal();
    await loadSuppliers();
    renderProvList();
    renderProvStats();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── Eliminar proveedor ──
async function delProv(id) {
  const s = suppliers.find(s => s.id === id);
  if (!confirm(`¿Eliminar proveedor "${s?.name}"?`)) return;
  try {
    await apiRequest(`/cotizacion/proveedores/${id}`, { method: 'DELETE' });
    showToast('🗑 Proveedor eliminado', 'info');
    await loadSuppliers();
    renderProvList();
    renderProvStats();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── Modal de precio ──
function openAddPriceModal(supplierId) {
  editingProvForPrice = supplierId;
  const s = suppliers.find(s => s.id === supplierId);
  document.getElementById('addPriceTitle').textContent = `➕ Agregar precio — ${s?.name}`;
  const sel = document.getElementById('ap-item');
  sel.innerHTML = '<option value="">-- Seleccionar repuesto --</option>' +
    inventory.map(i => `<option value="${i.id}">${i.name} (${i.cat})</option>`).join('');
  document.getElementById('ap-price').value   = '';
  document.getElementById('ap-quality').value = 'premium';
  document.getElementById('ap-avail').value   = 'En stock';
  document.getElementById('ap-notes').value   = '';
  document.getElementById('apPreviewText').textContent = 'Seleccione un repuesto para ver comparativa';
  document.getElementById('addPriceModal').classList.add('active');
}

function updateAPPreview() {
  const itemId = parseInt(document.getElementById('ap-item').value);
  const price  = parseFloat(document.getElementById('ap-price').value) || 0;
  const el = document.getElementById('apPreviewText');
  if (!itemId || !price) { el.textContent = 'Ingrese repuesto y precio.'; return; }
  const item = inventory.find(i => i.id === itemId); if (!item) return;
  const sp = getSP(item);
  const margin = sp - price;
  const marginPct = sp > 0 ? ((margin/sp)*100).toFixed(0) : 0;
  const otherPrices = suppliers.filter(s => s.id !== editingProvForPrice)
    .map(s => { const p = (s.prices||[]).find(p => p.itemId === itemId); return p ? {name:s.name,price:p.price} : null; })
    .filter(Boolean);
  const cheaper = otherPrices.filter(p => p.price < price);
  const cmpText = otherPrices.length
    ? (cheaper.length ? `⚠️ ${cheaper.length} proveedor(es) más baratos: ${cheaper.map(p=>`${p.name} ${fmt(p.price)}`).join(', ')}` : '✅ Precio más bajo entre proveedores')
    : 'Primer precio para este repuesto.';
  el.innerHTML = `Costo actual: <strong>${fmt(item.cost)}</strong> | PV: <strong>${fmt(sp)}</strong> | Ganancia: <strong style="color:var(--accent2)">${fmt(margin)} (${marginPct}%)</strong><br><span style="font-size:.78rem;margin-top:4px;display:block">${cmpText}</span>`;
}

function editProvPrice(supplierId, itemId) {
  editingProvForPrice = supplierId;
  const s = suppliers.find(s => s.id === supplierId);
  const p = (s?.prices||[]).find(p => p.itemId === itemId); if (!p) return;
  document.getElementById('addPriceTitle').textContent = `✏️ Editar precio — ${s.name}`;
  const sel = document.getElementById('ap-item');
  sel.innerHTML = '<option value="">-- Seleccionar repuesto --</option>' +
    inventory.map(i => `<option value="${i.id}" ${i.id === itemId ? 'selected':''} >${i.name} (${i.cat})</option>`).join('');
  document.getElementById('ap-price').value   = p.price;
  document.getElementById('ap-quality').value = p.quality;
  document.getElementById('ap-avail').value   = p.avail;
  document.getElementById('ap-notes').value   = p.notes||'';
  updateAPPreview();
  document.getElementById('addPriceModal').classList.add('active');
}

async function saveProvPrice() {
  const itemId = parseInt(document.getElementById('ap-item').value);
  const price  = parseFloat(document.getElementById('ap-price').value) || 0;
  if (!itemId || !price) { showToast('Seleccione repuesto y precio.', 'error'); return; }
  const payload = {
    itemId, price,
    quality: document.getElementById('ap-quality').value,
    avail:   document.getElementById('ap-avail').value,
    notes:   document.getElementById('ap-notes').value.trim()
  };
  try {
    await apiRequest(`/cotizacion/proveedores/${editingProvForPrice}/precios`, { method: 'POST', body: JSON.stringify(payload) });
    showToast('✅ Precio guardado', 'success');
    document.getElementById('addPriceModal').classList.remove('active');
    await loadSuppliers();
    renderProvList();
    renderProvStats();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function delProvPrice(supplierId, itemId) {
  if (!confirm('¿Eliminar este precio?')) return;
  try {
    await apiRequest(`/cotizacion/proveedores/${supplierId}/precios/${itemId}`, { method: 'DELETE' });
    showToast('🗑 Precio eliminado', 'info');
    await loadSuppliers();
    renderProvList();
    renderProvStats();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── Usar precio del proveedor en inventario ──
async function useSupplierPrice(itemId, price) {
  const item = inventory.find(i => i.id === itemId); if (!item) return;
  if (!confirm(`¿Actualizar el costo de "${item.name}" a ${fmt(price)} en el inventario?`)) return;
  try {
    await apiRequest(`/cotizacion/inventario/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...item, cost: price })
    });
    showToast(`✅ Precio actualizado a ${fmt(price)}`, 'success');
    await loadInventory();
    renderComparador();
    renderBestPrice();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── Tabs del panel de proveedores ──
function switchProvTab(name, btn) {
  ['provs','cmp','best'].forEach(t => {
    document.getElementById('ppanel-'+t).style.display = t === name ? '' : 'none';
    document.getElementById('ptab-'+t).classList.toggle('active', t === name);
  });
  if (name === 'cmp')   populateCmpSelects();
  if (name === 'best')  renderBestPrice();
  if (name === 'provs') renderProvList();
}

function populateCmpSelects() {
  const allItemIds = [...new Set(suppliers.flatMap(s => (s.prices||[]).map(p => p.itemId)))];
  const itemSel = document.getElementById('cmpItemSel');
  const provSel = document.getElementById('cmpProvSel');
  const prevItem = itemSel.value;
  itemSel.innerHTML = '<option value="">-- Seleccione un repuesto --</option>' +
    allItemIds.map(id => {
      const item = inventory.find(i => i.id === id);
      return item ? `<option value="${id}" ${id == prevItem ? 'selected':''}>${item.name}</option>` : '';
    }).filter(Boolean).join('');
  provSel.innerHTML = '<option value="">Todos los proveedores</option>' +
    suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (prevItem) renderComparador();
}

function renderComparador() {
  const itemId   = parseInt(document.getElementById('cmpItemSel').value);
  const filtProv = parseInt(document.getElementById('cmpProvSel').value) || null;
  const result   = document.getElementById('cmpResult');
  if (!itemId) { result.innerHTML = ''; return; }
  const item = inventory.find(i => i.id === itemId); if (!item) return;
  const qualityLabels = { original:'🥇 Original / OEM', premium:'🥈 Compatible Premium', estandar:'🥉 Estándar', economico:'💲 Económico' };
  const provPrices = suppliers
    .filter(s => !filtProv || s.id === filtProv)
    .map(s => { const p = (s.prices||[]).find(p => p.itemId === itemId); return p ? {supplier:s, price:p} : null; })
    .filter(Boolean).sort((a,b) => a.price.price - b.price.price);

  if (!provPrices.length) {
    result.innerHTML = `<div class="card"><div style="text-align:center;color:var(--muted);padding:24px">Ningún proveedor tiene precio para este repuesto.</div></div>`;
    return;
  }
  const best = provPrices[0].price.price;
  const worst = provPrices[provPrices.length-1].price.price;
  const sp = getSP(item);

  const rows = provPrices.map((entry, idx) => {
    const isBest  = entry.price.price === best;
    const isWorst = provPrices.length > 1 && entry.price.price === worst;
    const diff = entry.price.price - best;
    const margin = sp - entry.price.price;
    const marginPct = sp > 0 ? ((margin/sp)*100).toFixed(0) : 0;
    return `<tr ${isBest ? 'class="best-price"' : ''}>
      <td>${isBest ? '<span class="winner-badge">🏆 Más barato</span>' : `<span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:.75rem">#${idx+1}</span>`}
        <strong style="margin-left:6px;color:var(--text)">${entry.supplier.name}</strong>
        <div style="font-size:.72rem;color:var(--muted)">${entry.supplier.type} · 🚚 ${entry.supplier.delivery}</div></td>
      <td style="font-size:.78rem">${qualityLabels[entry.price.quality]||entry.price.quality}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;font-size:1rem;color:${isBest?'var(--accent)':isWorst?'var(--warn)':'var(--text)'}">${fmt(entry.price.price)}</td>
      <td style="text-align:right">${isBest ? '<span style="color:var(--accent);font-size:.78rem">Base</span>' : `<span style="color:var(--warn);font-size:.78rem">+${fmt(diff)}</span>`}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-size:.82rem;color:var(--accent2)">${fmt(margin)}<div style="font-size:.7rem;color:var(--muted)">${marginPct}% del PV</div></td>
      <td style="font-size:.78rem;color:${entry.price.avail==='En stock'?'var(--accent)':'var(--muted)'}">${entry.price.avail}</td>
      <td style="font-size:.75rem;color:var(--muted)">${entry.price.notes||'—'}</td>
      <td><button class="btn btn-accent2 btn-sm" onclick="useSupplierPrice(${item.id},${entry.price.price})">✅ Usar</button></td>
    </tr>`;
  }).join('');

  result.innerHTML = `<div class="card">
    <div class="card-title" style="margin-bottom:14px">
      <div class="card-title-icon">📊</div>
      Comparación: <span style="color:var(--accent)">${item.name}</span>
      <span class="category-tag" style="margin-left:4px">${item.cat}</span>
    </div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px;padding:14px;background:var(--surface2);border-radius:var(--radius-sm)">
      <div><div style="font-size:.72rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;margin-bottom:4px">Precio más bajo</div><div style="font-size:1.3rem;font-weight:800;color:var(--accent)">${fmt(best)}</div></div>
      <div><div style="font-size:.72rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;margin-bottom:4px">Precio más alto</div><div style="font-size:1.3rem;font-weight:800;color:var(--warn)">${fmt(worst)}</div></div>
      <div><div style="font-size:.72rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;margin-bottom:4px">Ahorro potencial</div><div style="font-size:1.3rem;font-weight:800;color:var(--accent2)">${fmt(worst-best)}</div></div>
      <div><div style="font-size:.72rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;margin-bottom:4px">Precio de venta</div><div style="font-size:1.3rem;font-weight:800;color:var(--text)">${fmt(sp)}</div></div>
    </div>
    <div style="overflow-x:auto">
      <table class="prov-table">
        <thead><tr><th>Proveedor</th><th>Calidad</th><th style="text-align:right">Precio prov.</th><th style="text-align:right">vs Mejor</th><th style="text-align:right">Ganancia (PV)</th><th>Disponibilidad</th><th>Notas</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="alert alert-info" style="margin-top:14px;margin-bottom:0">💡 <span>Presione <strong>✅ Usar</strong> para actualizar el costo del inventario con el precio de ese proveedor.</span></div>
  </div>`;
}

function renderBestPrice() {
  const tbody = document.getElementById('bestPriceBody');
  const itemsWithPrices = inventory.filter(item =>
    suppliers.some(s => (s.prices||[]).find(p => p.itemId === item.id))
  );
  if (!itemsWithPrices.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:28px">Agregue precios a sus proveedores para ver la comparación.</td></tr>';
    return;
  }
  tbody.innerHTML = itemsWithPrices.map(item => {
    const provPrices = suppliers
      .map(s => { const p = (s.prices||[]).find(p => p.itemId === item.id); return p ? {name:s.name, price:p.price, id:s.id} : null; })
      .filter(Boolean).sort((a,b) => a.price - b.price);
    const best = provPrices[0];
    const worst = provPrices[provPrices.length-1];
    const saving = worst.price - best.price;
    const savingPct = worst.price > 0 ? ((saving/worst.price)*100).toFixed(0) : 0;
    const dots = provPrices.map(p => {
      const isBest = p.price === best.price;
      return `<span title="${p.name}: ${fmt(p.price)}" style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:999px;font-size:.7rem;font-family:'DM Mono',monospace;margin:2px;background:${isBest?'rgba(0,229,160,.12)':'rgba(42,42,58,.6)'};color:${isBest?'var(--accent)':'var(--muted)'};border:1px solid ${isBest?'rgba(0,229,160,.3)':'var(--border)'}">
        ${isBest?'🏆 ':''}${p.name.split(' ')[0]}: ${fmt(p.price)}
      </span>`;
    }).join('');
    return `<tr>
      <td><strong style="color:var(--text)">${item.name}</strong></td>
      <td><span class="category-tag">${item.cat}</span></td>
      <td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;color:var(--accent)">${fmt(best.price)}</td>
      <td><span class="winner-badge">🏆 ${best.name}</span></td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--warn)">${fmt(worst.price)}</td>
      <td style="text-align:right;font-family:'DM Mono',monospace;color:var(--accent2)">${saving > 0 ? fmt(saving)+` <small style="color:var(--muted)">(${savingPct}%)</small>` : '<span style="color:var(--muted)">—</span>'}</td>
      <td>${dots}</td>
    </tr>`;
  }).join('');
}
