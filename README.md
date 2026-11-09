# Agencia EH — V0.12.0

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
- `GET /api/v1/admin/metrics`, `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id` (rol, activar/desactivar).
- `GET|POST /api/v1/admin/payments`, `DELETE /api/v1/admin/payments/:id`: pagos de membresía (efectivo/transferencia). La membresía está activa mientras el último periodo pagado no haya vencido.
- `GET /api/v1/properties/review`: cola de propiedades en revisión.

## Pendientes conocidos
- Las fotos se suben desde el panel (se reducen en el navegador) y se guardan en `UPLOADS_DIR` (por defecto `~/agencia-eh-uploads`). Respáldala junto con la base de datos.
- Correos de verificación y recuperación por SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`); sin SMTP, fuera de producción el enlace se imprime en la consola.
- No hay pruebas automatizadas todavía. Respalda la base antes de aplicar cambios de esquema en producción.
