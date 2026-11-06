# Agencia EH — V0.7.1

Plataforma inmobiliaria desarrollada con Next.js, NestJS y **MySQL** (compatible con el hosting de Hostinger). El backend utiliza el paquete `mysql2` y consultas SQL parametrizadas; no se utiliza ORM.

## Arquitectura
- Frontend: Next.js 14, React 18 y TypeScript.
- API: Node.js + NestJS.
- Base de datos: MySQL 8 / MariaDB.
- Acceso a datos: `mysql2`.
- Sesiones: JWT de acceso y refresh token en cookie HttpOnly.

## Preparar MySQL
1. Crea la base de datos y su usuario. En Hostinger: hPanel → Bases de datos → MySQL.
2. Importa `backend/database/schema.sql` en esa base (por ejemplo con phpMyAdmin). Se puede ejecutar más de una vez.
3. Copia `backend/.env.example` a `backend/.env` y configura `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y los secretos JWT.
4. Todas las fechas se guardan en UTC.

## Iniciar API
```bash
cd backend
npm install
npm run db:check
npm run build
npm run start:dev
```

## Iniciar frontend
```bash
cd frontend
npm install
npm run dev
```
Configura `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` en `frontend/.env.local`.

## Endpoints principales
- `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`.
- `GET /api/v1/auth/me`, `PATCH /api/v1/auth/profile`.
- `GET /api/v1/properties`, `GET /api/v1/properties/:slug`.
- `GET /api/v1/properties/mine`, `POST /api/v1/properties`, `PATCH /api/v1/properties/:id`.
- `POST /api/v1/properties/:id/submit`, `PATCH /api/v1/properties/:id/moderate`, `DELETE /api/v1/properties/:id`.

## Notas
Los scripts SQL son versionados manualmente. Respalda la base antes de ejecutarlos en una instalación con datos. Las fotografías se almacenan por URL; falta integrar el proveedor de almacenamiento. Los enlaces de verificación y recuperación se imprimen en consola en desarrollo; falta configurar un proveedor real de correo.

## Estado de validación
El paquete contiene la implementación y los scripts. La compilación y las pruebas de integración deben ejecutarse en el entorno del proyecto, con dependencias instaladas y una base MySQL disponible. No desplegar directamente en producción sin esas pruebas.
