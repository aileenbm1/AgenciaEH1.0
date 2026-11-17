// Recorrido guiado de Agencia EH: capturas por tipo de usuario + video con subtítulos.
// Uso: node recorrido.js <carpeta-guia>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2], H = 'http://localhost:3900';
const IMG = path.join(OUT, 'img'), VID = path.join(OUT, 'video');
const PASS = 'PruebaEH2026';
const DEPTO = 'departamento-amueblado-cerca-de-plaza-mayor-demo', DEPTO_ID = 'd3e00102-0000-4000-8000-000000000102';
const steps = []; const fails = [];
const tile = fs.readFileSync(path.join(OUT, 'tile.png'));

// Fecha (YYYY-MM-DD) del mes siguiente, para elegir días en el calendario.
const now = new Date(); const ny = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), nm = (now.getMonth() + 1) % 12;
const D = n => `${ny}-${String(nm + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;

const INIT = () => {
  try { localStorage.setItem('eh_pwa_no', '1'); } catch { }
  const add = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div'); c.id = '__cur';
    c.style.cssText = 'position:fixed;z-index:2147483647;width:22px;height:22px;margin:-4px 0 0 -4px;pointer-events:none;left:-50px;top:-50px;transition:transform .08s';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.5 13.8 L10.5 20 L13.2 18.8 L10.3 12.7 L16.5 12.7 Z" fill="#172536" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    window.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    window.addEventListener('mousedown', () => { c.style.transform = 'scale(.8)'; }, true);
    window.addEventListener('mouseup', () => { c.style.transform = ''; }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
};

async function newRole(b, key) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: VID, size: { width: 1280, height: 720 } }, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
  await ctx.addInitScript(INIT);
  await ctx.route(/tile\.openstreetmap\.org/, r => r.fulfill({ status: 200, contentType: 'image/png', body: tile }));
  await ctx.route(/nominatim\.openstreetmap\.org/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => fails.push(`${key}: ${e.message}`));
  return { ctx, p, key };
}
const pause = (p, ms) => p.waitForTimeout(ms);
async function caption(p, text) {
  await p.evaluate(t => {
    let el = document.getElementById('__cap');
    if (!el) { el = document.createElement('div'); el.id = '__cap'; el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);max-width:1080px;z-index:2147483646;background:rgba(23,37,54,.92);color:#fff;font:600 21px/1.35 Arial,Helvetica,sans-serif;padding:12px 22px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);text-align:center;pointer-events:none'; document.body.appendChild(el); }
    el.textContent = t; el.style.display = t ? 'block' : 'none';
  }, text).catch(() => { });
}
async function titleCard(p, title, sub) {
  await p.evaluate(([t, s]) => {
    const el = document.createElement('div'); el.id = '__title';
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#172536;color:#F7F5F0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:Georgia,serif;text-align:center';
    el.innerHTML = `<div style="font:600 15px Arial;letter-spacing:.2em;color:#C5A46D">AGENCIA EH · GUÍA DE USO</div><div style="font-size:56px">${t}</div><div style="font:400 22px Arial;max-width:900px;line-height:1.5;opacity:.9">${s}</div>`;
    document.body.appendChild(el);
  }, [title, sub]);
  await pause(p, 3200);
  await p.evaluate(() => document.getElementById('__title')?.remove());
}
async function go(p, url) { await p.goto(H + url, { waitUntil: 'networkidle' }).catch(() => { }); await pause(p, 700); }
async function move(p, loc) { await loc.scrollIntoViewIfNeeded().catch(() => { }); const bx = await loc.boundingBox(); if (!bx) throw new Error('no visible'); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2, { steps: 18 }); return bx; }
async function click(p, sel) { const loc = typeof sel === 'string' ? p.locator(sel).first() : sel; await move(p, loc); await pause(p, 250); await loc.click(); await pause(p, 600); }
async function type(p, sel, text) { const loc = p.locator(sel).first(); await move(p, loc); await loc.click(); await loc.fill(''); await loc.pressSequentially(text, { delay: 35 }); }
async function scrollTo(p, sel, block = 'start') { await p.locator(sel).first().evaluate((e, b) => { if (b === 'start') { const y = e.getBoundingClientRect().top + window.scrollY - 96; window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); } else e.scrollIntoView({ behavior: 'smooth', block: b }); }, block).catch(() => { }); await pause(p, 900); }
// Paso de la guía: subtítulo + captura (sin el subtítulo) + pausa para el video.
async function step(r, id, title, text, opts = {}) {
  await caption(r.p, title);
  await pause(r.p, opts.before ?? 900);
  await r.p.evaluate(() => { const c = document.getElementById('__cap'); if (c) c.style.visibility = 'hidden'; const k = document.getElementById('__cur'); if (k) k.style.visibility = 'hidden'; });
  const file = `${r.key}-${String(steps.filter(s => s.role === r.key).length + 1).padStart(2, '0')}-${id}.jpg`;
  await r.p.screenshot({ path: path.join(IMG, file), type: 'jpeg', quality: 82 });
  await r.p.evaluate(() => { const c = document.getElementById('__cap'); if (c) c.style.visibility = ''; const k = document.getElementById('__cur'); if (k) k.style.visibility = ''; });
  steps.push({ role: r.key, file, title, text });
  await pause(r.p, opts.after ?? 2400);
  // El subtítulo solo acompaña a su paso; las acciones siguientes van sin texto.
  await caption(r.p, '');
}
async function safe(r, name, fn) { try { await fn(); } catch (e) { fails.push(`${r.key} · ${name}: ${e.message.split('\n')[0]}`); await caption(r.p, ''); } }
async function login(r, email) {
  await go(r.p, '/acceso');
  await caption(r.p, `Iniciar sesión · ${email}`);
  await type(r.p, 'input[type=email]', email); await type(r.p, 'input[type=password]', PASS);
  await click(r.p, 'form button[type=submit]');
  await r.p.waitForURL(u => !u.pathname.startsWith('/acceso'), { timeout: 15000 }); await r.p.waitForLoadState('networkidle').catch(() => { }); await pause(r.p, 800);
}
async function finish(r) { await caption(r.p, ''); await pause(r.p, 400); const v = r.p.video(); await r.ctx.close(); const src = await v.path(); fs.renameSync(src, path.join(VID, `${r.order}-${r.key}.webm`)); }

(async () => {
  const b = await chromium.launch();

  // ───────── 1. Visitante ─────────
  let r = await newRole(b, 'visitante'); r.order = 1;
  await go(r.p, '/'); await titleCard(r.p, 'Visitante', 'Cualquier persona, sin cuenta: busca propiedades, ve fotos, mapas y fanpages, comparte y escribe al asesor.');
  await safe(r, 'inicio', () => step(r, 'inicio', 'Página de inicio', 'La portada lleva al catálogo, a los municipios y a anunciar una propiedad.'));
  await safe(r, 'catalogo', async () => {
    await go(r.p, '/propiedades'); await scrollTo(r.p, '.property-grid', 'center');
    await move(r.p, r.p.locator('.card-carousel').nth(1)); await pause(r.p, 600);
    await step(r, 'catalogo', 'Catálogo con filtros y fotos en carrusel', 'Filtra por operación, municipio, categoría, precio, recámaras y baños. Las fotos de cada tarjeta pasan solas; al pasar el ratón (o tocar en el celular) se detienen y el clic abre la propiedad en esa foto.');
  });
  await safe(r, 'mapa', async () => {
    await scrollTo(r.p, '.view-toggle', 'center'); await click(r.p, '.view-toggle a:has-text("Mapa")'); await r.p.waitForSelector('.leaflet-container', { timeout: 15000 }); await pause(r.p, 1200);
    await scrollTo(r.p, '.catalog-map', 'center');
    await step(r, 'mapa', 'Vista de mapa', 'Las propiedades con ubicación aparecen en el mapa (OpenStreetMap). Los círculos indican una zona aproximada cuando el anunciante no muestra la dirección exacta.');
  });
  await safe(r, 'ficha', async () => {
    await go(r.p, `/propiedades/${DEPTO}`);
    await step(r, 'ficha', 'Ficha de la propiedad', 'Fotos, precio, descripción, ficha técnica, ubicación, contacto con el asesor por WhatsApp o mensaje, y botones para compartir.');
    await scrollTo(r.p, '#reservar', 'start'); await pause(r.p, 600);
    await click(r.p, '.unit-tabs button:has-text("Por noche")');
    await click(r.p, '.cal-head button[aria-label="Mes siguiente"]');
    await click(r.p, `.cal-day[aria-label^="${D(10)}"]`); await click(r.p, `.cal-day[aria-label^="${D(12)}"]`);
    await r.p.waitForSelector('.quote'); await scrollTo(r.p, '#reservar', 'start');
    await step(r, 'reserva-cotizacion', 'Reserva en línea: por noche, semana o mes', 'Elige la modalidad, marca las fechas en el calendario (los días ocupados no se pueden elegir) y ve el total al momento. Para enviar la solicitud hay que iniciar sesión.');
  });
  await safe(r, 'fanpage', async () => {
    await go(r.p, '/propiedades/casa-con-jardin-en-el-molino-demo/fanpage');
    await step(r, 'fanpage', 'Fanpage de la propiedad', 'Página promocional para compartir en redes. Registra visitas, clics y prospectos, y el origen de cada campaña.');
    await r.p.mouse.wheel(0, 900); await pause(r.p, 1500);
  });
  await safe(r, 'asesor', async () => { await go(r.p, '/asesores/ana-vendedora-d3e00'); await step(r, 'perfil-asesor', 'Perfil público del asesor', 'Foto, presentación, WhatsApp y todas sus propiedades activas.'); });
  await safe(r, 'registro', async () => {
    await go(r.p, '/acceso?registro=1');
    await step(r, 'registro', 'Crear cuenta (solo compradores)', 'Los compradores e inquilinos se registran solos y al instante. Las cuentas de agentes, agencias y desarrolladoras las crea el administrador.');
    await go(r.p, '/anunciar');
    await step(r, 'anunciar', '¿Quieres anunciar?', 'Agentes, agencias y desarrolladoras solicitan su cuenta desde aquí; el administrador la crea y les envía el enlace de activación.');
  });
  await finish(r);

  // ───────── 2. Comprador ─────────
  r = await newRole(b, 'comprador'); r.order = 2;
  await go(r.p, '/acceso'); await titleCard(r.p, 'Comprador / Inquilino', 'Guarda favoritos y búsquedas, reserva en línea por noche, semana o mes y da seguimiento a sus pagos.');
  await safe(r, 'login', () => login(r, 'comprador.demo@example.com'));
  await safe(r, 'panel', () => step(r, 'panel', 'Panel del comprador', 'Accesos a buscar propiedades, mis reservas, favoritos, comparar y mis mensajes y visitas.'));
  await safe(r, 'reservar', async () => {
    await go(r.p, `/propiedades/${DEPTO}`); await scrollTo(r.p, '#reservar', 'start');
    await click(r.p, '.unit-tabs button:has-text("Por noche")');
    await click(r.p, '.cal-head button[aria-label="Mes siguiente"]');
    await click(r.p, `.cal-day[aria-label^="${D(10)}"]`); await click(r.p, `.cal-day[aria-label^="${D(12)}"]`);
    await r.p.waitForSelector('.quote');
    const sel = r.p.locator('.reserve-fields select').first(); await move(r.p, sel); await sel.selectOption('2');
    await type(r.p, '.reserve-box textarea', 'Hola, llegamos en la tarde. ¡Gracias!');
    await scrollTo(r.p, '.reserve-terms', 'center');
    await step(r, 'reglas', 'Reglas, cancelación y pago antes de reservar', 'Antes de enviar se ven las reglas de la casa, el límite de huéspedes, cuándo se puede cancelar y hasta cuándo hay que liquidar.');
    await click(r.p, 'button:has-text("Solicitar reserva")');
    await r.p.waitForURL(/\/panel\/reservas\//, { timeout: 15000 }); await r.p.waitForSelector('.res-timeline'); await pause(r.p, 800);
    await step(r, 'solicitud', 'Solicitud enviada', 'La reserva queda “Por aprobar”. Se ve la línea de tiempo, el detalle y el total. El anunciante recibe un aviso por correo.');
  });
  await safe(r, 'chat', async () => {
    await type(r.p, '.chat-form textarea', '¿Hay estacionamiento techado?'); await click(r.p, '.chat-form button'); await r.p.waitForSelector('.chat-msg.mine');
    fs.writeFileSync(path.join(OUT, 'identificacion.pdf'), '%PDF-1.4\n% documento de prueba\n');
    await r.p.setInputFiles('.doc-form input[type=file]', path.join(OUT, 'identificacion.pdf')); await click(r.p, '.doc-form button'); await r.p.waitForSelector('.doc-list li');
    await scrollTo(r.p, '.chat', 'start');
    await step(r, 'chat-documentos', 'Chat y documentos de la reserva', 'Todo el trato es en línea: chat con el anunciante y documentos privados (identificación, comprobantes) que solo ven las partes y el administrador.');
    await scrollTo(r.p, '#pagos', 'start');
    await step(r, 'pagos-pendiente', 'Pagos: total, pagado y lo que falta', 'Cuando el anunciante registra el anticipo o abonos, aquí se ve el historial, el saldo y la fecha límite para liquidar (un día antes de la llegada).');
  });
  await safe(r, 'lista', async () => { await go(r.p, '/panel/reservas'); await step(r, 'mis-reservas', 'Mis reservas', 'Todas sus rentas y apartados con su estado.'); });
  await finish(r);

  // ───────── 3. Agente ─────────
  r = await newRole(b, 'agente'); r.order = 3;
  await go(r.p, '/acceso'); await titleCard(r.p, 'Agente / Asesor', 'Publica propiedades, configura las reservas en línea, acepta solicitudes, registra pagos y da seguimiento a sus prospectos.');
  await safe(r, 'login', () => login(r, 'agente.demo@example.com'));
  await safe(r, 'panel', async () => {
    await step(r, 'panel', 'Panel del agente', 'Accesos rápidos y el flujo de publicación: borrador → en revisión → publicada.');
    await scrollTo(r.p, '.metric-grid', 'center');
    await step(r, 'estadisticas', 'Estadísticas y perfil público', 'Visitas a su perfil, propiedades activas, prospectos, reservas y resultados de sus fanpages. Más abajo edita su foto, WhatsApp y presentación.');
  });
  await safe(r, 'propiedades', async () => {
    await go(r.p, '/panel/agente/propiedades');
    await step(r, 'mis-propiedades', 'Mis propiedades', 'Cada propiedad con su estado. Desde aquí se envía a revisión, se cambia la disponibilidad, se edita, se abre su fanpage y se configuran las reservas.');
    await click(r.p, 'button:has-text("+ Nueva propiedad")'); await r.p.waitForSelector('#formulario'); await scrollTo(r.p, '#formulario', 'start');
    await step(r, 'nueva-propiedad', 'Nueva propiedad', 'Datos, venta y/o renta, precio por noche y por semana (opcional), ubicación en el mapa y fotos con etiqueta. Se guarda como borrador hasta enviarla a revisión.');
    await r.p.mouse.wheel(0, 700); await pause(r.p, 1200);
    await click(r.p, '#formulario button:has-text("Cancelar")');
  });
  await safe(r, 'config', async () => {
    const card = r.p.locator('.property-management-card', { hasText: 'Departamento amueblado' });
    await click(r.p, card.locator('button:has-text("Reservas y calendario")')); await r.p.waitForSelector('.unit-config');
    await scrollTo(r.p, '.unit-config', 'start');
    await step(r, 'reservas-config', 'Reservas y calendario', 'Activa renta por noche, por semana y/o por mes con su precio, mínimos y máximos; límite de huéspedes, depósito, reglas de la casa (hay unas de ejemplo) y fechas bloqueadas.');
    await scrollTo(r.p, '.blocks', 'center'); await pause(r.p, 1500);
  });
  await safe(r, 'aprobar', async () => {
    await go(r.p, '/panel/reservas');
    await step(r, 'reservas', 'Solicitudes de reserva', 'Las solicitudes nuevas aparecen “Por aprobar”.');
    await click(r.p, '.res-card'); await r.p.waitForSelector('.res-timeline');
    await scrollTo(r.p, 'h3:has-text("Acciones")', 'start');
    await click(r.p, '.property-actions button:has-text("Aprobar")');
    await type(r.p, '.action-form input[type=number]', '1000');
    await step(r, 'aprobar', 'Aprobar con anticipo', 'Al aprobar puede pedir un anticipo para apartar. Las solicitudes que choquen con esas fechas se rechazan solas.', { after: 900 });
    await click(r.p, '.action-form button:has-text("Confirmar")'); await r.p.waitForSelector('text=Solicitud aprobada');
    await scrollTo(r.p, '#pagos', 'start');
    await click(r.p, '#pagos button:has-text("Registrar")');
    const sel = r.p.locator('#pagos select'); await move(r.p, sel); await sel.selectOption('TRANSFER');
    await type(r.p, '#pagos input[maxlength="500"]', 'SPEI 4821');
    await step(r, 'registrar-pago', 'Registrar el anticipo', 'El pago es por transferencia o en efectivo, fuera de la plataforma; aquí se registra con su folio. Ningún pago puede pasar de lo que falta.', { after: 900 });
    await click(r.p, '#pagos button:has-text("Registrar pago")'); await r.p.waitForSelector('text=Abono registrado');
    await click(r.p, '#pagos button:has-text("Registrar abono")'); await r.p.locator('#pagos input[type=number]').fill('2000');
    await click(r.p, '#pagos button:has-text("Registrar pago")'); await r.p.waitForSelector('.pay-table tbody tr:nth-child(2)');
    await scrollTo(r.p, '#pagos', 'start');
    await step(r, 'abonos', 'Abonos con historial', 'Cada abono baja el saldo. Se ve el total, lo pagado, lo que falta y la fecha límite. Con el botón “Liquidar saldo” se registra exactamente lo que falta.');
  });
  await safe(r, 'prospectos', async () => { await go(r.p, '/panel/prospectos'); await step(r, 'prospectos', 'Prospectos y visitas (CRM)', 'Mensajes y solicitudes de visita de sus propiedades, con su origen (ficha, fanpage, Facebook…), estado y notas internas.'); });
  await safe(r, 'fanpage', async () => {
    await go(r.p, `/panel/fanpage/${DEPTO_ID}`); await r.p.waitForSelector('.fp-editor'); await scrollTo(r.p, '.fp-editor', 'start');
    await move(r.p, r.p.locator('.fp-preview section.fp-editable').nth(1)); await pause(r.p, 500);
    await step(r, 'fanpage-editor', 'Editor de fanpage por bloques', 'Arrastra bloques desde la paleta o directamente en la vista previa, cambia colores y textos. Se guarda solo; “Publicar” la hace visible. Nadie escribe código.');
    await click(r.p, '[role=tab]:has-text("Compartir y kit")'); await r.p.waitForSelector('.fp-kit');
    await step(r, 'fanpage-kit', 'Compartir y kit para redes', 'Enlaces con campaña (UTM) por red social, texto listo para copiar y descarga de fotos para publicar.');
  });
  await finish(r);

  // ───────── 4. Agencia ─────────
  r = await newRole(b, 'agencia'); r.order = 4;
  await go(r.p, '/acceso'); await titleCard(r.p, 'Agencia', 'Publica a nombre de la inmobiliaria y supervisa a su equipo: prospectos, reservas y estadísticas de todos sus asesores.');
  await safe(r, 'login', () => login(r, 'agencia.demo@example.com'));
  await safe(r, 'panel', async () => {
    await step(r, 'panel', 'Panel de la agencia', 'Las mismas herramientas del agente, a nombre de la agencia.');
    await scrollTo(r.p, '.metric-grid', 'center');
    await step(r, 'estadisticas', 'Estadísticas del equipo', 'Visitas al perfil de la agencia y totales de todo el equipo: propiedades, prospectos, reservas y fanpages.');
    await scrollTo(r.p, '#perfil-agencia', 'start');
    await step(r, 'perfil', 'Perfil público de la agencia', 'Nombre, WhatsApp y descripción que ven los compradores.');
  });
  await safe(r, 'reservas', async () => { await go(r.p, '/panel/reservas'); await step(r, 'reservas-equipo', 'Reservas del equipo', 'Ve y puede aceptar las reservas de las propiedades de sus asesores.'); });
  await safe(r, 'publico', async () => { await go(r.p, '/agencias/inmobiliaria-demo-bajio'); await step(r, 'pagina-publica', 'Página pública de la agencia', 'Sus asesores (con enlace a su perfil) y todas las propiedades del equipo.'); });
  await finish(r);

  // ───────── 5. Desarrolladora ─────────
  r = await newRole(b, 'desarrolladora'); r.order = 5;
  await go(r.p, '/acceso'); await titleCard(r.p, 'Desarrolladora', 'Publica los inmuebles de sus proyectos (preventas, fraccionamientos) con su equipo de vendedores.');
  await safe(r, 'login', () => login(r, 'desarrolladora.demo@example.com'));
  await safe(r, 'panel', () => step(r, 'panel', 'Panel de la desarrolladora', 'Igual que una agencia: propiedades, equipo, prospectos y reservas.'));
  await safe(r, 'propiedades', async () => { await go(r.p, '/panel/agente/propiedades'); await step(r, 'propiedades', 'Propiedad en revisión', 'La preventa se envió a revisión; aparece en el catálogo cuando el administrador la aprueba.'); });
  await safe(r, 'plantillas', async () => {
    const id = await r.p.locator('.property-management-card a:has-text("Fanpage")').first().getAttribute('href');
    await go(r.p, id); await r.p.waitForSelector('.fp-editor');
    await click(r.p, '[role=tab]:has-text("Plantillas")'); await r.p.waitForSelector('.fp-template');
    await step(r, 'plantillas', 'Plantillas de fanpage', 'Plantillas listas (Clásica, Vacacional, Preventa / Desarrollo) que administra el admin. Al usarla se reemplaza el borrador y se puede volver atrás en “Versiones”.');
  });
  await finish(r);

  // ───────── 6. Administrador ─────────
  r = await newRole(b, 'admin'); r.order = 6;
  await go(r.p, '/acceso'); await titleCard(r.p, 'Administrador', 'Revisa y publica propiedades, crea todas las cuentas, registra membresías y puede intervenir en cualquier reserva.');
  await safe(r, 'login', () => login(r, 'admin.demo@example.com'));
  await safe(r, 'panel', async () => {
    await step(r, 'panel', 'Panel del administrador', 'Accesos a revisar propiedades, cuentas, membresías, campos personalizados, fanpages, reservas y prospectos.');
    await scrollTo(r.p, '.metric-grid', 'start');
    await step(r, 'metricas', 'Métricas generales', 'Usuarios, propiedades por estado, prospectos, ingresos y membresías por vencer.');
  });
  await safe(r, 'revision', async () => {
    await scrollTo(r.p, '#revision', 'start');
    await step(r, 'revision', 'Propiedades por revisar', 'Nada se publica sin su aprobación: revisa datos, precio y fotos, y aprueba o rechaza.', { after: 900 });
    await click(r.p, '#revision button:has-text("Aprobar y publicar")'); await pause(r.p, 1500);
  });
  await safe(r, 'cuentas', async () => {
    await scrollTo(r.p, '#cuentas', 'start');
    const sel = r.p.locator('#cuentas select').first(); await move(r.p, sel); await sel.selectOption('AGENT'); await pause(r.p, 500);
    await type(r.p, '#cuentas input[maxlength="100"]', 'Pedro Ramírez'); await type(r.p, '#cuentas input[type=email]', 'pedro.demo@example.com');
    const ag = r.p.locator('#cuentas select').nth(1); if (await ag.count()) { await move(r.p, ag); await ag.selectOption({ index: 1 }); }
    await step(r, 'crear-cuenta', 'Crear cuentas', 'Solo el administrador crea agentes, agencias, desarrolladoras y otros administradores. Al crear un agente lo puede ligar a su agencia.', { after: 900 });
    await click(r.p, '#cuentas button:has-text("Crear cuenta")'); await r.p.waitForSelector('.invite-box', { timeout: 10000 });
    await scrollTo(r.p, '.invite-box', 'center');
    await step(r, 'activacion', 'Enlace de activación', 'La persona recibe un enlace por correo (o se le envía por WhatsApp) para elegir su contraseña. Vence en 7 días.');
  });
  await safe(r, 'usuarios', async () => { await scrollTo(r.p, '#usuarios', 'start'); await step(r, 'usuarios', 'Usuarios y aprobaciones', 'Buscar, editar, activar o desactivar cuentas, cambiar rol, enviar enlace de contraseña y aprobar cuentas pendientes.'); });
  await safe(r, 'pagos', async () => { await scrollTo(r.p, '#pagos', 'start'); await step(r, 'membresias', 'Membresías y pagos', 'Registro de membresías pagadas en efectivo o transferencia. Una membresía vencida bloquea el acceso del anunciante.'); });
  await safe(r, 'campos', async () => { await scrollTo(r.p, '#campos', 'start'); await step(r, 'campos', 'Campos personalizados', 'Datos extra para las propiedades (alberca, amueblado…), obligatorios u opcionales, y si sirven como filtro en el catálogo.'); });
  await safe(r, 'fanpages', async () => { await scrollTo(r.p, '#fanpages', 'start'); await step(r, 'fanpages', 'Ajustes de fanpages', 'Quién puede diseñar fanpages, si requieren aprobación, la cola por aprobar y las plantillas.'); });
  await safe(r, 'nueva', async () => {
    await go(r.p, '/panel/agente/propiedades#nueva'); await r.p.waitForSelector('.owner-pick select'); await pause(r.p, 800);
    const sel = r.p.locator('.owner-pick select'); await move(r.p, sel); await sel.selectOption({ index: 1 });
    await scrollTo(r.p, '#formulario', 'start');
    await step(r, 'nueva-propiedad', 'Agregar propiedad a nombre de otro', 'El administrador también agrega propiedades y elige a nombre de qué agencia, desarrolladora o agente quedan. Lo que él publica sale directo al catálogo.');
  });
  await safe(r, 'reservas', async () => {
    await go(r.p, '/panel/reservas'); await click(r.p, '.res-card'); await r.p.waitForSelector('#pagos'); await scrollTo(r.p, '#pagos', 'start');
    await step(r, 'reserva-admin', 'Intervenir en cualquier reserva', 'Ve todas las reservas, puede aprobarlas, cancelarlas, registrar pagos (incluso tardíos) y anular un pago capturado por error; queda en el historial.');
  });
  await finish(r);

  await b.close();
  fs.writeFileSync(path.join(OUT, 'pasos.json'), JSON.stringify(steps, null, 1));
  console.log('pasos:', steps.length); console.log('fallas:', fails.length ? fails : 'ninguna');
})().catch(e => { console.error('FALLO', e); process.exit(1); });
