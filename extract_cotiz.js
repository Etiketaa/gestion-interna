const fs = require('fs');

const pathCoti = 'public/cotizacion.html';
const pathIndex = 'public/index.html';
const pathCSS = 'public/css/styles.css';
const pathJS = 'public/js/cotizacion-app.js';

let cotiHtml = fs.readFileSync(pathCoti, 'utf8');
let indexHtml = fs.readFileSync(pathIndex, 'utf8');

// 1. EXTRACT CSS
// We don't want the body/header tag styles, only the cotizacion specific classes
const styleMatch = cotiHtml.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
    let cssText = styleMatch[1];
    // Remove body, header, :root selectors to avoid overriding index.html globals
    cssText = cssText.replace(/:root\s*\{[\s\S]*?\}/g, '');
    cssText = cssText.replace(/body\s*\{[\s\S]*?\}/g, '');
    cssText = cssText.replace(/body::before\s*\{[\s\S]*?\}/g, '');
    cssText = cssText.replace(/header\s*\{[\s\S]*?\}/g, '');
    // Append to styles.css
    fs.appendFileSync(pathCSS, '\n/* --- COTIZACION EXTRACTED CSS --- */\n' + cssText);
    console.log('✅ CSS extracted');
}

// 2. EXTRACT JS
// We extract lines 841 to the end (excluding last closing tags)
const jsMatch = cotiHtml.match(/<script>\s*\/\/\s*════════════ STATE ════════════([\s\S]*?)<\/script>/);
if (jsMatch) {
    let jsText = '// ════════════ STATE ════════════' + jsMatch[1];
    fs.writeFileSync(pathJS, jsText);
    console.log('✅ JS extracted to cotizacion-app.js');
}

// 3. UPDATE INDEX.HTML Sidebar Link
indexHtml = indexHtml.replace(/<a href="\/cotizacion\.html" target="_blank" class="nav-link"/, '<a href="#" class="nav-link" data-page="cotizacion"');

// 4. INJECT HTML TO INDEX.HTML
// We need from <nav class="tab-nav"> to the end of modals (before <script src="/js/config.js">)
const htmlContentMatch = cotiHtml.match(/(<nav class="tab-nav">[\s\S]*?)(<script src="\/js\/config\.js">)/);
if (htmlContentMatch) {
    const extractedDom = htmlContentMatch[1];

    // Wrap it inside <div id="page-cotizacion" class="page">
    const pageCotizacion = `
            <!-- Cotizacion Page -->
            <div id="page-cotizacion" class="page">
                <div class="page-header">
                    <span class="page-badge">// atención comercial</span>
                    <h2 class="page-title">Recepción y Cotización</h2>
                    <p class="page-subtitle">Recepción de equipos y generación de cotizaciones</p>
                </div>
                ${extractedDom}
            </div>
`;

    // Insert exactly before </main>
    indexHtml = indexHtml.replace('</main>', pageCotizacion + '\n        </main>');
    console.log('✅ HTML content injected into index.html');
}

// 5. INJECT SCRIPT TAG to INDEX.HTML
if (!indexHtml.includes('cotizacion-app.js')) {
    indexHtml = indexHtml.replace('</body>', '    <script src="/js/cotizacion-app.js"></script>\n</body>');
}

fs.writeFileSync(pathIndex, indexHtml);
console.log('✅ index.html updated');
