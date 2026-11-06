# Agencia EH — V0.7.1

Plataforma inmobiliaria desarrollada con Next.js, NestJS y **Microsoft SQL Server**. El backend utiliza el paquete `mssql` y consultas SQL parametrizadas; no se utiliza ORM.

## Arquitectura
- Frontend: Next.js 14, React 18 y TypeScript.
- API: Node.js + NestJS.
- Base de datos: Microsoft SQL Server.
- Acceso a datos: `mssql`.
- Sesiones: JWT de acceso y refresh token en cookie HttpOnly.

## Preparar SQL Server
1. Ejecuta `backend/database/00-create-database.sql` en SSMS.
2. Ejecuta `backend/database/01-schema.sql` dentro de `AgenciaEH`.
3. Copia `backend/.env.example` a `backend/.env` y configura host, puerto, usuario, contraseña y secretos JWT.
4. Para desarrollo local puedes usar `SQLSERVER_TRUST_SERVER_CERTIFICATE=true`; en producción usa certificado válido y `false`.

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
El paquete contiene la implementación y los scripts. La compilación y las pruebas de integración deben ejecutarse en el entorno del proyecto, con dependencias instaladas y una instancia SQL Server disponible. No desplegar directamente en producción sin esas pruebas.
