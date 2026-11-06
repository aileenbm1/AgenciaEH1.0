# Agencia EH — Roadmap

## V0.1 — Prototipo visual
Pantallas y dirección visual inicial.

## V0.2 — Monorepo base
Next.js, NestJS y esquema de datos inicial; acceso a datos directo con SQL parametrizado (inicialmente SQL Server/`mssql`, hoy MySQL/`mysql2`).

## V0.3 — Autenticación y sesiones
- Registro público de comprador, agente y agencia.
- Inicio/cierre de sesión.
- Access JWT + refresh token rotativo en cookie HttpOnly.
- Hash bcrypt de contraseñas y refresh tokens.
- Endpoint de perfil autenticado.
- Validación de entrada y configuración CORS.

## V0.4 — Autorización y endurecimiento
- Guards y políticas por rol y propietario del recurso.
- Rate limiting y protección anti-fuerza bruta.
- Verificación de correo y recuperación de contraseña.
- Pruebas unitarias/e2e y auditoría de seguridad.

## V0.5 — Gestión de propiedades
CRUD, carga segura de imágenes, revisión y publicación.

## V0.6 — CRM y operaciones
Leads, seguimiento, citas, favoritos y búsquedas guardadas.


## V0.6 — Catálogo conectado
- [x] Conectar inicio, catálogo y ficha pública a la API.
- [x] Filtros y ordenamiento desde la base de datos.
- [x] Paginación y estados sin resultados/API no disponible.
- [ ] Carga real de fotografías a almacenamiento externo.
- [ ] Pruebas de integración y E2E automatizadas.


## V0.7 — SQL Server nativo (reemplazado por MySQL en V0.8)
- Acceso a datos mediante `mssql` y consultas SQL parametrizadas.
- Esquema SQL versionado: usuarios, perfiles, propiedades, imágenes, leads y favoritos.
- Servicios de autenticación y catálogo migrados a consultas SQL parametrizadas.

## V0.8 — Migración a MySQL (hosting Hostinger)
- Acceso a datos con `mysql2` en lugar de `mssql`; esquema en `backend/database/schema.sql`.
- Fechas en UTC; identificadores `CHAR(36)` (UUID).
- Corregidos errores que impedían arrancar la API (guards sin `JwtService`, `JwtAuth` inexistente, import de `cookie-parser`).
- La paginación del catálogo ahora cuenta propiedades, no filas de imágenes.
- Probado contra MySQL/MariaDB: registro, login, refresh, perfil, verificación, recuperación, CRUD, filtros, paginación y permisos.

## V0.8.1 — Listo para Hostinger
- Next.js 16 y React 19; NestJS 11 (Express 5). Sin vulnerabilidades conocidas en dependencias de producción.
- Proxy `/api/v1` dentro del sitio: el navegador no llama a la API directamente, sin CORS y sin recompilar por dominio (`API_URL` en tiempo de ejecución).
- `scripts/build-hostinger.sh` genera los ZIP compilados del sitio y la API; guía en `docs/DESPLIEGUE-HOSTINGER.md`.
- `npm run admin:create` para crear el primer administrador.
- API preparada para proxy inverso (`trust proxy`), varios orígenes en `WEB_ORIGIN` y apagado ordenado.
