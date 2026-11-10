# Agencia EH — V0.19.0

Plataforma inmobiliaria desarrollada con Next.js, NestJS y **MySQL** (compatible con Hostinger). El backend usa `mysql2` con consultas SQL parametrizadas; no se utiliza ORM.

## Arquitectura
- Frontend: Next.js 16, React 19 y TypeScript (salida `standalone`).
- API: Node.js 20+ y NestJS 11.
- Base de datos: MySQL 8 / MariaDB 10.6+.
- Sesiones: JWT de acceso y refresh token en cookie HttpOnly.
- El navegador llama a `/api/v1/*` en el propio sitio y Next.js lo reenvía a la API (`API_URL`). Así no hace falta CORS y el mismo compilado sirve en cualquier dominio.

## Desarrollo local

### 1. MySQL
1. Crea una base de datos y un usuario.
2. Importa `backend/database/schema.sql` (se puede ejecutar más de una vez).
3. Copia `backend/.env.example` a `backend/.env` y configura `DB_*` y los secretos JWT.

### 2. API
```bash
cd backend
npm install
npm run db:check
npm run start:dev
```

Crear un administrador:

```bash
npm run admin:create -- admin@correo.com "Nombre Apellido" "contraseña-segura"
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Por defecto el frontend busca la API en `http://127.0.0.1:4000/api/v1`. Para otra dirección crea `frontend/.env.local` con `API_URL=...`.

## Desplegar en Hostinger
```bash
bash scripts/build-hostinger.sh
```
Genera, ya compilados, `deploy/agencia-eh-sitio-unico.zip` (sitio y API en un solo sitio Node.js) y, por separado, `deploy/agencia-eh-frontend.zip` y `deploy/agencia-eh-api.zip`. Sigue la guía paso a paso en [`docs/DESPLIEGUE-HOSTINGER.md`](docs/DESPLIEGUE-HOSTINGER.md).

## Endpoints principales
- `GET /api/v1/health`.
- `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`.
- `GET /api/v1/auth/me`, `PATCH /api/v1/auth/profile`.
- `GET /api/v1/properties`, `GET /api/v1/properties/:slug`.
- `GET /api/v1/properties/mine`, `POST /api/v1/properties`, `PATCH /api/v1/properties/:id`.
- `POST /api/v1/properties/:id/submit`, `PATCH /api/v1/properties/:id/moderate`, `DELETE /api/v1/properties/:id`.

## Panel de administración
- `GET /api/v1/admin/metrics`, `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id` (rol, activar/desactivar, nombre, correo, teléfono).
- `POST /api/v1/admin/users/:id/password` (fijar contraseña), `POST /api/v1/admin/users/:id/password-link` (enlace de 24 h), `POST /api/v1/admin/users/:id/delete` (borra con sus propiedades, fotos y pagos; requiere `confirmEmail`).
- `GET|POST /api/v1/admin/payments`, `DELETE /api/v1/admin/payments/:id`: pagos de membresía (efectivo/transferencia). La membresía está activa mientras el último periodo pagado no haya vencido.
- `GET /api/v1/properties/review`: cola de propiedades en revisión.

## Cuentas y acceso
- Registro público **solo para compradores/inquilinos** (activos al instante). `PUBLIC_SIGNUP=false` lo cierra.
- **Solo el administrador crea las demás cuentas** (agentes, agencias, desarrolladoras y administradores) con `POST /api/v1/users` y enlace de activación de 7 días; al crear un agente puede ligarlo a su agencia. Quien quiera anunciar lo solicita en `/anunciar`.
- Reservas: todo en línea salvo el pago, que es **por transferencia o en persona**. Las aceptan y registran el pago el agente dueño, su agencia/desarrolladora o el administrador.
- "Cómo funciona" es una guía interna visible solo para administradores.
- Membresía vencida (último periodo pagado < hoy) = sin acceso. Sin pagos registrados no se bloquea. Los administradores nunca se bloquean.

## Compradores y prospectos
- Ficha: contacto real del anunciante (WhatsApp) y formularios de mensaje y visita → `POST /api/v1/leads` (aviso por correo al anunciante).
- Prospectos (CRM): `GET /api/v1/leads/mine` (`?scope=team` para agencias), `PATCH /api/v1/leads/:id`; el comprador ve los suyos en `GET /api/v1/leads/sent`.
- Favoritos: `/api/v1/favorites`. Búsquedas guardadas con aviso por correo al publicarse algo que coincide: `/api/v1/saved-searches`.
- Perfil público de agencia: `/agencias/[slug]` (`GET /api/v1/agencies/:slug`, la agencia lo edita con `PATCH /api/v1/agencies/me`).
- Comparar usa propiedades reales elegidas con "+ Comparar" (se guardan en el navegador).

## Datos de prueba
- `backend/database/datos-prueba.sql`: cuentas `*.demo@example.com` (contraseña `PruebaEH2026`) para cada rol, 14 propiedades en renta y venta (publicadas, en revisión, borrador y rechazada) con ilustraciones de `frontend/public/demo/`, prospectos, visitas, favoritos, búsqueda guardada y membresías (una vencida).
- `backend/database/datos-prueba-borrar.sql`: quita todo lo anterior sin tocar datos reales.

## Propiedades
- Operación: Venta, Renta o **Venta y renta** (precio de venta + renta mensual). Los filtros de renta incluyen las de ambas y comparan la renta mensual.
- Categoría (Residencial, Comercial, Industrial, Terreno, Vacacional) y **disponibilidad** independiente de la revisión: Disponible, Apartada (sigue en catálogo), Rentada o Vendida (salen del catálogo; el enlace muestra "No disponible"). `PATCH /api/v1/properties/:id/availability`. Para rentas, "Disponible a partir de".
- Fotos con **etiqueta** (Fachada, Sala, Cocina, Plano…) y orden; la etiqueta "Plano" se muestra en "Plano de planta".
- **Campos personalizados** (RF-03) que define el admin (`/api/v1/admin/custom-fields`): texto, número, sí/no o lista; opcionalmente obligatorios y filtrables (`cf_<clave>` en la búsqueda).
- Para enviar a revisión: superficie, al menos una foto y los campos obligatorios.

## Reservas en línea (RF-21 a RF-27)
- Todo el trato es en línea; **solo el pago es en persona** y se registra en la plataforma.
- Por propiedad (Mis propiedades → "Reservas y calendario"): renta **mensual** o **por noche** (precio, temporadas, estadía mínima/máxima, huéspedes, depósito, impuestos, política de cancelación), apartado de compra y **fechas bloqueadas**.
- Ficha: calendario con días ocupados, cotización al momento y solicitud (requiere cuenta). Sin dobles reservas: al aprobar se rechazan las solicitudes que se cruzan.
- `/panel/reservas`: aprobar (con anticipo opcional), agendar cita de pago, el interesado la confirma, **anticipo → "Apartada"**, pago → cerrada (rentada/vendida). Chat y documentos privados (PDF/JPG/PNG) por reserva; correos en cada paso y recordatorios. El admin puede intervenir en cualquiera.
- API: `/api/v1/reservations` (calendar, quote, settings, blocks, mensajes, documentos).

## Perfiles y estadísticas (Fase 4)
- Perfil público del asesor `/asesores/[slug]` (foto, bio, WhatsApp, agencia y propiedades activas); se edita en el panel del agente. Las agencias enlazan a sus asesores.
- Estadísticas del perfil en el panel: visitas al perfil, propiedades, prospectos, reservas y fanpages (las agencias ven las de su equipo). `GET /api/v1/agents/stats/me`.

## Fanpage por propiedad (Fase 5)
- `/propiedades/[slug]/fanpage`: página promocional con estadísticas (visitas, compartidas, clics, prospectos) y origen por campaña UTM.
- Editor **por bloques**, sin HTML/CSS para nadie (tampoco el admin): portada, texto, galería, características, precio, video (YouTube/Vimeo), llamado a la acción, contacto, compartir y mapa; colores #RRGGBB y fuentes de una lista fija. El servidor valida y descarta todo lo demás.
- Plantillas que administra el admin, historial de versiones con "Restaurar", generador de enlaces UTM y "kit para redes" (texto listo y descarga de fotos).
- El admin decide qué roles pueden diseñarlas y si requieren su aprobación (`/panel/admin#fanpages`).

## Mapa, PWA y origen de prospectos (Fase 6)
- Mapa con **OpenStreetMap** (gratis, sin clave): ubicación en el formulario (búsqueda por dirección o clic), mapa en ficha y fanpage, y vista "Mapa" en el catálogo. Si no se marca "ubicación exacta", el público ve una zona aproximada (~1 km).
- PWA: se puede instalar en el celular; página "Sin conexión". La API nunca se guarda en caché.
- Cada prospecto guarda su **origen** (ficha, fanpage, facebook…) y campaña; filtro por origen en Prospectos.

## Pendientes conocidos
- Las fotos se suben desde el panel (se reducen en el navegador) y se guardan en `UPLOADS_DIR` (por defecto `~/agencia-eh-uploads`); los documentos de reservas en `UPLOADS_PRIVATE_DIR` (por defecto `~/agencia-eh-privado`). Respalda ambas junto con la base de datos.
- Correos de verificación y recuperación por SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`); sin SMTP, fuera de producción el enlace se imprime en la consola.
- No hay pruebas automatizadas todavía. Respalda la base antes de aplicar cambios de esquema en producción.
