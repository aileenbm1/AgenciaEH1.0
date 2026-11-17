# Genera index.html (guía por tipo de usuario) a partir de pasos.json y las capturas.
import json, html, sys, os
base = sys.argv[1]
steps = json.load(open(os.path.join(base, 'pasos.json'), encoding='utf-8'))
durs = [64.0, 53.4, 84.8, 35.16, 27.68, 69.44]
e = html.escape

ROLES = [
  ('visitante', 'Visitante', 'Sin cuenta', 'Cualquier persona que entra al sitio.',
   'No necesita cuenta.',
   ['Buscar y filtrar propiedades en renta y venta', 'Ver fotos en carrusel, ficha técnica, mapa y fanpage', 'Cotizar una reserva (por noche, semana o mes)', 'Escribir al asesor, pedir una visita o contactarlo por WhatsApp', 'Compartir cualquier propiedad', 'Ver perfiles públicos de asesores y agencias'],
   'Para enviar una reserva o apartado tiene que crear su cuenta de comprador.'),
  ('comprador', 'Comprador / Inquilino', 'comprador.demo@example.com', 'Quien busca comprar o rentar.',
   'Se registra solo, al instante, en “Crear cuenta”. También se la puede crear el administrador.',
   ['Reservar en línea por noche, semana o mes, o apartar una compra', 'Chatear con el anunciante y subir documentos privados', 'Ver el total, lo pagado y lo que falta de cada reserva', 'Cancelar dentro de las 24 horas siguientes a su solicitud (si no reservó con un día o menos de anticipación)', 'Guardar favoritos y búsquedas con aviso por correo', 'Comparar propiedades'],
   'El pago no se hace en la plataforma: es por transferencia o en efectivo y lo registra el anunciante.'),
  ('agente', 'Agente / Asesor', 'agente.demo@example.com', 'Asesor independiente o de una agencia.',
   'La crea el administrador y le llega un enlace para elegir su contraseña.',
   ['Publicar propiedades (pasan por revisión del administrador)', 'Configurar la renta en línea: modalidades, precios, huéspedes, reglas y fechas bloqueadas', 'Aprobar o rechazar solicitudes y agendar la cita de pago', 'Registrar anticipo y abonos hasta liquidar', 'Dar seguimiento a prospectos y visitas (CRM)', 'Diseñar la fanpage de cada propiedad y compartirla con campañas', 'Editar su perfil público y ver sus estadísticas'],
   'Si su membresía vence, no puede entrar hasta que el administrador registre el pago.'),
  ('agencia', 'Agencia', 'agencia.demo@example.com', 'Inmobiliaria con un equipo de asesores.',
   'La crea el administrador. Los asesores de la agencia también los crea el administrador y los liga a ella.',
   ['Todo lo que hace un agente, a nombre de la agencia', 'Ver estadísticas de todo el equipo', 'Ver y aceptar reservas de las propiedades de sus asesores', 'Ver los prospectos del equipo', 'Editar su página pública con sus asesores y propiedades'],
   ''),
  ('desarrolladora', 'Desarrolladora', 'desarrolladora.demo@example.com', 'Empresa que desarrolla proyectos: preventas, torres, fraccionamientos.',
   'La crea el administrador.',
   ['Lo mismo que una agencia, para sus proyectos', 'Usar la plantilla de fanpage “Preventa / Desarrollo”'],
   ''),
  ('admin', 'Administrador', 'admin.demo@example.com', 'El equipo de Agencia EH.',
   'En tu sitio, el administrador es tu propia cuenta.',
   ['Revisar y publicar (o rechazar) propiedades', 'Crear todas las cuentas de agentes, agencias, desarrolladoras y administradores', 'Editar usuarios, cambiar roles, aprobar y desactivar cuentas', 'Registrar membresías y ver métricas', 'Definir campos personalizados', 'Decidir quién diseña fanpages, aprobarlas y administrar plantillas', 'Agregar propiedades a nombre de cualquier agencia, desarrolladora o agente', 'Intervenir en cualquier reserva, incluso registrar pagos tardíos y anular pagos capturados por error'],
   'La guía interna “Cómo funciona” solo la ve el administrador.'),
]

start = 0.0; starts = []
for d in durs: starts.append(start); start += d
fmt = lambda s: f"{int(s)//60}:{int(s)%60:02d}"

nav = ''.join(f'<a href="#{k}" class="chip" data-role="{k}">{e(t)}</a>' for k, t, *_ in ROLES)
chapters = ''.join(f'<button type="button" class="chapter" data-t="{starts[i]:.1f}"><span class="tc">{fmt(starts[i])}</span>{e(r[1])}</button>' for i, r in enumerate(ROLES))

sections = []
for i, (key, title, acct, who, how, can, note) in enumerate(ROLES):
    st = [s for s in steps if s['role'] == key]
    items = []
    for n, s in enumerate(st, 1):
        items.append(f'''<li class="step">
  <button type="button" class="shot" data-src="img/{e(s['file'])}" data-cap="{e(s['title'])}" aria-label="Ampliar captura: {e(s['title'])}">
    <img src="img/{e(s['file'])}" alt="{e(s['title'])}" loading="lazy" width="1280" height="720">
  </button>
  <div class="step-text"><span class="step-n">Paso {n}</span><h4>{e(s['title'])}</h4><p>{e(s['text'])}</p></div>
</li>''')
    acct_html = f'<code>{e(acct)}</code>' if '@' in acct else f'<span>{e(acct)}</span>'
    sections.append(f'''<section class="role" id="{key}" aria-labelledby="h-{key}">
  <div class="role-head">
    <div class="role-intro">
      <span class="eyebrow">Tipo de usuario {i + 1} de {len(ROLES)}</span>
      <h2 id="h-{key}">{e(title)}</h2>
      <p class="who">{e(who)}</p>
      <dl class="facts">
        <div><dt>Cuenta de prueba</dt><dd>{acct_html}</dd></div>
        <div><dt>¿Quién crea la cuenta?</dt><dd>{e(how)}</dd></div>
      </dl>
      <button type="button" class="watch" data-t="{starts[i]:.1f}">▶ Ver en el video ({fmt(starts[i])})</button>
    </div>
    <div class="can"><h3>Qué puede hacer</h3><ul>{''.join(f'<li>{e(c)}</li>' for c in can)}</ul>{f'<p class="note">{e(note)}</p>' if note else ''}</div>
  </div>
  <ol class="steps">{''.join(items)}</ol>
</section>''')

page = f'''<title>Guía de Agencia EH</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@500;600&display=swap">
<style>
/* Diseño: la guía usa la identidad de Agencia EH (marino, dorado y marfil). Columna de lectura con capturas grandes; navegación por tipo de usuario fija arriba. */
:root{{
  --bg:#F7F5F0; --surface:#FFFFFF; --soft:#EFEBE2; --fg:#2E343A; --muted:#6B6F73; --line:#DCD7CC;
  --navy:#172536; --on-navy:#F7F5F0; --gold:#C5A46D; --gold-ink:#8B6A3F; --code-bg:#EFE9DD;
  --display:'Playfair Display',Georgia,'Times New Roman',serif; --body:Montserrat,system-ui,-apple-system,'Segoe UI',Arial,sans-serif; --mono:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;
}}
@media (prefers-color-scheme: dark){{ :root:not([data-theme="light"]){{
  --bg:#11161D; --surface:#18202A; --soft:#1F2833; --fg:#E7E3DA; --muted:#A3A7AC; --line:#2C3743;
  --navy:#0B1118; --on-navy:#F1ECE2; --gold:#D1B37F; --gold-ink:#D9BE8C; --code-bg:#243040; color-scheme:dark; }} }}
:root[data-theme="dark"]{{
  --bg:#11161D; --surface:#18202A; --soft:#1F2833; --fg:#E7E3DA; --muted:#A3A7AC; --line:#2C3743;
  --navy:#0B1118; --on-navy:#F1ECE2; --gold:#D1B37F; --gold-ink:#D9BE8C; --code-bg:#243040; color-scheme:dark; }}
*{{box-sizing:border-box}}
html{{scroll-behavior:smooth}}
@media (prefers-reduced-motion: reduce){{ html{{scroll-behavior:auto}} }}
body{{background:var(--bg); color:var(--fg); font:15px/1.65 var(--body); margin:0}}
body::before{{content:""; position:fixed; inset:0 0 auto; height:env(safe-area-inset-top,0px); z-index:10; background:var(--navy)}}
.wrap{{max-width:1120px; margin:0 auto; padding-left:max(16px, env(safe-area-inset-left,0px)); padding-right:max(16px, env(safe-area-inset-right,0px))}}
h1,h2,h3,h4{{text-wrap:balance; margin:0}}
code{{font:13px var(--mono); background:var(--code-bg); padding:2px 6px; border-radius:4px; word-break:break-all}}
.eyebrow{{font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--gold-ink)}}

.hero{{background:var(--navy); color:var(--on-navy)}}
.hero .wrap{{padding-block:48px 40px; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.25fr); gap:40px; align-items:center}}
.brand{{display:flex; align-items:center; gap:12px; margin-bottom:22px}}
.mark{{width:40px; height:40px; border-radius:6px; background:var(--on-navy); color:#172536; display:grid; place-items:center; font:600 17px var(--display); position:relative}}
.mark::after{{content:""; position:absolute; left:13px; right:13px; bottom:8px; height:1.5px; background:var(--gold)}}
.brand b{{font:600 16px var(--display); letter-spacing:.04em}}
.hero h1{{font:500 clamp(34px,4.4vw,52px)/1.08 var(--display); margin-bottom:16px}}
.hero h1 em{{color:var(--gold); font-style:italic}}
.hero p{{margin:0 0 20px; max-width:52ch; opacity:.92}}
.hero .eyebrow{{color:var(--gold)}}
.demo{{border:1px solid rgba(197,164,109,.45); border-radius:10px; padding:14px 16px; font-size:14px; display:grid; gap:4px}}
.demo b{{color:var(--gold)}}
.demo code{{background:rgba(255,255,255,.1); color:var(--on-navy)}}
.player{{display:grid; gap:10px; min-width:0}}
.player video{{width:100%; max-width:100%; aspect-ratio:16/9; border-radius:12px; background:#000; display:block; box-shadow:0 24px 48px -20px rgba(0,0,0,.55)}}
.chapters{{display:flex; flex-wrap:wrap; gap:6px}}
.chapter{{border:1px solid rgba(247,245,240,.25); background:transparent; color:var(--on-navy); border-radius:999px; padding:6px 12px; font:500 13px var(--body); cursor:pointer; display:inline-flex; gap:8px; align-items:center}}
.chapter:hover,.chapter:focus-visible{{border-color:var(--gold); outline:none}}
.chapter .tc{{font:12px var(--mono); color:var(--gold); font-variant-numeric:tabular-nums}}

.rolenav{{position:sticky; top:env(safe-area-inset-top,0px); z-index:5; background:var(--bg); border-bottom:1px solid var(--line)}}
.rolenav .wrap{{display:flex; gap:8px; overflow-x:auto; padding-block:10px; scrollbar-width:thin}}
.chip{{white-space:nowrap; text-decoration:none; color:var(--fg); border:1px solid var(--line); background:var(--surface); border-radius:999px; padding:7px 14px; font-weight:600; font-size:13px}}
.chip:hover,.chip:focus-visible{{border-color:var(--gold); outline:none}}
.chip.on{{background:var(--navy); color:var(--on-navy); border-color:var(--navy)}}

main .wrap{{display:grid; gap:56px; padding-block:40px 64px}}
.how{{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px}}
.how > div{{background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:16px 18px; min-width:0}}
.how h3{{font:600 15px var(--body); margin-bottom:4px}}
.how p{{margin:0; color:var(--muted); font-size:14px}}

.role{{display:grid; gap:28px; scroll-margin-top:64px}}
.role-head{{display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,1fr); gap:28px; padding-bottom:24px; border-bottom:1px solid var(--line)}}
.role h2{{font:500 clamp(30px,3.4vw,40px)/1.1 var(--display); color:var(--fg); margin:6px 0 8px}}
.who{{margin:0 0 14px; color:var(--muted); font-size:16px}}
.facts{{margin:0 0 16px; display:grid; gap:10px}}
.facts div{{display:grid; gap:2px}}
.facts dt{{font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted)}}
.facts dd{{margin:0}}
.watch{{border:0; background:var(--navy); color:var(--on-navy); border-radius:8px; padding:10px 16px; font:600 14px var(--body); cursor:pointer}}
.watch:hover,.watch:focus-visible{{outline:2px solid var(--gold); outline-offset:2px}}
.can{{background:var(--soft); border-radius:10px; padding:18px 20px; min-width:0}}
.can h3{{font:600 13px var(--body); letter-spacing:.08em; text-transform:uppercase; color:var(--gold-ink); margin-bottom:8px}}
.can ul{{margin:0; padding-left:18px; display:grid; gap:6px}}
.note{{margin:12px 0 0; font-size:14px; color:var(--muted); border-top:1px solid var(--line); padding-top:10px}}

.steps{{list-style:none; margin:0; padding:0; display:grid; gap:36px}}
.step{{display:grid; grid-template-columns:minmax(0,1.6fr) minmax(0,1fr); gap:24px; align-items:start}}
.step:nth-child(even) .shot{{order:2}}
.shot{{padding:0; border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--surface); cursor:zoom-in; display:block; width:100%; box-shadow:0 1px 2px rgba(23,37,54,.06),0 14px 30px -18px rgba(23,37,54,.35)}}
.shot img{{display:block; width:100%; height:auto; max-width:100%; aspect-ratio:16/9}}
.shot:focus-visible{{outline:3px solid var(--gold); outline-offset:3px}}
.step-text{{min-width:0; padding-top:6px}}
.step-n{{font:600 12px var(--mono); color:var(--gold-ink); letter-spacing:.04em}}
.step h4{{font:600 21px/1.25 var(--display); margin:4px 0 8px}}
.step p{{margin:0; max-width:46ch}}

footer{{border-top:1px solid var(--line); color:var(--muted); font-size:13px}}
footer .wrap{{padding-block:24px 36px; display:grid; gap:6px}}

dialog{{border:0; padding:0; background:transparent; max-width:min(1280px, 96vw); width:100%}}
dialog::backdrop{{background:rgba(10,14,20,.86)}}
dialog figure{{margin:0; display:grid; gap:10px}}
dialog img{{width:100%; height:auto; border-radius:8px; display:block}}
dialog figcaption{{color:#F1ECE2; font:600 16px var(--body); display:flex; justify-content:space-between; gap:12px; align-items:center}}
dialog button{{background:#F1ECE2; color:#172536; border:0; border-radius:6px; padding:8px 14px; font:600 14px var(--body); cursor:pointer}}

@media (max-width: 900px){{
  .hero .wrap{{grid-template-columns:minmax(0,1fr); gap:28px; padding-block:32px}}
  .role-head{{grid-template-columns:minmax(0,1fr)}}
  .how{{grid-template-columns:minmax(0,1fr)}}
  .step{{grid-template-columns:minmax(0,1fr); gap:12px}}
  .step:nth-child(even) .shot{{order:0}}
}}
</style>

<header class="hero">
  <div class="wrap">
    <div>
      <div class="brand"><span class="mark">EH</span><b>AGENCIA EH</b></div>
      <span class="eyebrow">Guía de uso por tipo de usuario</span>
      <h1>Cómo usar <em>Agencia EH</em>, paso a paso</h1>
      <p>Seis recorridos con capturas reales de la plataforma: visitante, comprador, agente, agencia, desarrolladora y administrador. El video muestra los mismos pasos en movimiento.</p>
      <div class="demo"><span><b>Cuentas de prueba</b> · contraseña <code>PruebaEH2026</code></span><span>Se crean con el archivo <code>datos-prueba.sql</code>. No las uses para datos reales.</span></div>
    </div>
    <div class="player">
      <video id="video" controls preload="metadata" playsinline poster="portada.jpg" src="agencia-eh-guia.mp4">Tu navegador no puede reproducir el video.</video>
      <div class="chapters" aria-label="Capítulos del video">{chapters}</div>
    </div>
  </div>
</header>

<nav class="rolenav" aria-label="Tipos de usuario"><div class="wrap">{nav}</div></nav>

<main><div class="wrap">
  <div class="how">
    <div><h3>Todo en línea, menos el pago</h3><p>Reservas, apartados, chat, documentos y citas se hacen en la plataforma. El pago es por transferencia o en efectivo y se registra en cada reserva.</p></div>
    <div><h3>Quién crea las cuentas</h3><p>Los compradores se registran solos. Agentes, agencias, desarrolladoras y administradores los crea únicamente el administrador.</p></div>
    <div><h3>Sobre las capturas</h3><p>Se tomaron con los datos de prueba. En estas capturas el mapa aparece con un fondo ilustrativo; en tu sitio se ve el mapa real de OpenStreetMap.</p></div>
  </div>
  {''.join(sections)}
</div></main>

<footer><div class="wrap"><span>Agencia EH · Guía de uso · Versión 0.19 de la plataforma.</span><span>Capturas y video generados con las cuentas de prueba; los nombres, correos y montos son ficticios.</span></div></footer>

<dialog id="zoom" aria-label="Captura ampliada"><figure><img id="zoom-img" alt=""><figcaption><span id="zoom-cap"></span><button type="button" id="zoom-close">Cerrar</button></figcaption></figure></dialog>

<script>
(function () {{
  const video = document.getElementById('video');
  const seek = t => {{ video.currentTime = Number(t); video.play().catch(() => {{}}); video.scrollIntoView({{ behavior: 'smooth', block: 'center' }}); }};
  document.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => seek(b.dataset.t)));
  const zoom = document.getElementById('zoom'), zi = document.getElementById('zoom-img'), zc = document.getElementById('zoom-cap');
  document.querySelectorAll('.shot').forEach(b => b.addEventListener('click', () => {{ zi.src = b.dataset.src; zi.alt = b.dataset.cap; zc.textContent = b.dataset.cap; zoom.showModal(); }}));
  document.getElementById('zoom-close').addEventListener('click', () => zoom.close());
  zoom.addEventListener('click', e => {{ if (e.target === zoom) zoom.close(); }});
  // Resalta en la barra el tipo de usuario que se está viendo.
  const chips = [...document.querySelectorAll('.chip')];
  const mark = id => chips.forEach(c => c.classList.toggle('on', c.dataset.role === id));
  const io = new IntersectionObserver(es => es.forEach(x => {{ if (x.isIntersecting) mark(x.target.id); }}), {{ rootMargin: '-45% 0px -50% 0px' }});
  document.querySelectorAll('.role').forEach(s => io.observe(s));
  if (location.hash) mark(location.hash.slice(1));
}})();
</script>
'''
open(os.path.join(base, 'index.html'), 'w', encoding='utf-8').write(page)
print('ok', len(page), 'pasos', len(steps))
