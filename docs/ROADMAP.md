# Agencia EH — Roadmap

## V0.1 — Prototipo visual
Pantallas y dirección visual inicial.

## V0.2 — Monorepo base
Next.js, NestJS y esquema de datos inicial; el acceso a datos se realiza directamente mediante el paquete mssql.

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
- [x] Filtros y ordenamiento desde SQL Server.
- [x] Paginación y estados sin resultados/API no disponible.
- [ ] Carga real de fotografías a almacenamiento externo.
- [ ] Pruebas de integración y E2E con SQL Server.


## V0.7 — SQL Server nativo
- Acceso a datos mediante `mssql` y consultas SQL parametrizadas.
- Esquema SQL versionado: usuarios, perfiles, propiedades, imágenes, leads y favoritos.
- Servicios de autenticación y catálogo migrados a consultas SQL parametrizadas.
- Pendiente: compilar con dependencias instaladas, ejecutar scripts en SQL Server real y pruebas de integración.
