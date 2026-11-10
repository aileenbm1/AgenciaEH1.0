// Genera database/datos-prueba.sql y database/datos-prueba-borrar.sql.
// Uso (desde backend/): node scripts/generar-datos-prueba.js . database/datos-prueba.sql database/datos-prueba-borrar.sql
const bcrypt = require(require.resolve('bcryptjs', { paths: [process.argv[2]] }));
const fs = require('fs');
const PASSWORD = 'PruebaEH2026';
const hash = bcrypt.hashSync(PASSWORD, 12);
const id = (n) => `d3e0${String(n).padStart(4, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`;
const q = (v) => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;

const U = { agencia: id(1), agente: id(2), asesor: id(3), comprador: id(4), comprador2: id(5), vencido: id(6) };
const AG = { profile: id(11), agenteProfile: id(12), asesorProfile: id(13), vencidoProfile: id(14) };
const users = [
  [U.agencia, 'agencia.demo@example.com', 'Laura Méndez', '4770000001', 'AGENCY', '@admin'],
  [U.agente, 'agente.demo@example.com', 'Ana Vendedora', '4770000002', 'AGENT', U.agencia],
  [U.asesor, 'asesor.demo@example.com', 'Carlos Asesor', '4770000003', 'AGENT', '@admin'],
  [U.comprador, 'comprador.demo@example.com', 'Beto Comprador', '4770000004', 'BUYER', U.agente],
  [U.comprador2, 'compradora.demo@example.com', 'Sofía Compradora', null, 'BUYER', U.agencia],
  [U.vencido, 'vencido.demo@example.com', 'Raúl Membresía Vencida', '4770000006', 'AGENT', '@admin'],
];
const D = (txt) => txt;
const props = [
  // [n, owner, title, op, status, price, municipio, colonia, tipo, rec, baños, terreno, constr, imgs, descripción, díasAtrás]
  [1, U.agente, 'Casa con jardín en El Molino', 'SALE', 'PUBLISHED', 3450000, 'León', 'El Molino', 'Casa', 3, 3, 220, 185, ['residencia-1', 'residencia-6'], 'Casa de dos niveles con jardín amplio, cochera para dos autos, cocina integral y estudio. A 5 minutos de Blvd. Campestre.', 2],
  [2, U.agente, 'Departamento amueblado cerca de Plaza Mayor', 'RENT', 'PUBLISHED', 14500, 'León', 'Jardines del Moral', 'Departamento', 2, 2, null, 95, ['departamento-interior'], 'Departamento amueblado en piso 4 con elevador, balcón, estacionamiento techado y vigilancia 24 h. Incluye mantenimiento.', 3],
  [3, U.agencia, 'Residencia en Campestre con alberca', 'SALE', 'PUBLISHED', 8900000, 'León', 'Campestre', 'Casa', 4, 4, 450, 380, ['residencia-2', 'residencia-3', 'residencia-4'], 'Residencia de lujo con alberca, jardín, cuarto de servicio, 4 recámaras con baño propio y terraza techada. Fraccionamiento privado.', 1],
  [4, U.agencia, 'Local comercial sobre Blvd. López Mateos', 'RENT', 'PUBLISHED', 28000, 'León', 'Centro', 'Local comercial', null, 1, 120, 120, ['local-10'], 'Local en planta baja con frente de 8 m, alto flujo peatonal y vehicular. Ideal para tienda o consultorio.', 6],
  [5, U.asesor, 'Casa colonial en el centro de Guanajuato', 'SALE', 'PUBLISHED', 4200000, 'Guanajuato', 'Centro', 'Casa', 3, 2, 160, 210, ['colonial-fachada', 'colonial-patio'], 'Casa colonial restaurada a dos calles del Jardín Unión, con patio central, techos altos y terraza con vista a la ciudad.', 4],
  [6, U.asesor, 'Departamento para estudiantes cerca de la UG', 'RENT', 'PUBLISHED', 6500, 'Guanajuato', 'Pastita', 'Departamento', 1, 1, null, 45, ['departamento-interior'], 'Departamento pequeño y luminoso, ideal para estudiante. Servicios incluidos (agua e internet). Contrato por semestre.', 8],
  [7, U.agente, 'Casa en fraccionamiento con vigilancia', 'RENT', 'PUBLISHED', 12000, 'Irapuato', 'Villas de Irapuato', 'Casa', 3, 2, 140, 120, ['residencia-5'], 'Casa en coto privado con caseta de vigilancia, áreas verdes y alberca común. Cochera para un auto.', 5],
  [8, U.agencia, 'Terreno habitacional en Silao', 'SALE', 'PUBLISHED', 1250000, 'Silao', 'Los Sauces', 'Terreno', null, null, 500, null, ['terreno-8'], 'Terreno plano de 500 m² con servicios a pie de lote, escrituras en regla. A 10 minutos del Puerto Interior.', 10],
  [9, U.asesor, 'Oficina ejecutiva en Celaya', 'RENT', 'PUBLISHED', 18000, 'Celaya', 'Zona de Oro', 'Oficina', null, 2, null, 110, ['oficina-12', 'oficina-13'], 'Oficina en edificio corporativo con recepción, sala de juntas compartida y 3 cajones de estacionamiento.', 7],
  [10, U.agente, 'Casa con vista en San Miguel de Allende', 'SALE', 'PUBLISHED', 6800000, 'San Miguel de Allende', 'Guadiana', 'Casa', 3, 3, 300, 260, ['colonial-vista', 'colonial-patio'], 'Casa estilo mexicano contemporáneo con roof garden y vista a la Parroquia. Ideal para vivir o renta vacacional.', 9],
  // Para probar la revisión del administrador y los estados del agente:
  [11, U.agente, 'Departamento nuevo en preventa', 'SALE', 'REVIEW', 2150000, 'León', 'Lomas del Campestre', 'Departamento', 2, 2, null, 88, ['departamento-interior'], 'Departamento en preventa con entrega en 12 meses, amenidades: gimnasio, roof garden y área de juegos.', 0],
  [12, U.agencia, 'Bodega industrial en Irapuato', 'RENT', 'REVIEW', 45000, 'Irapuato', 'Parque Industrial', 'Local comercial', null, 2, 800, 600, ['local-11'], 'Bodega con andén de carga, oficinas y altura libre de 9 m. Acceso para tráiler.', 0],
  [13, U.agente, 'Casa en Celaya (borrador)', 'SALE', 'DRAFT', 1900000, 'Celaya', 'Las Insurgentes', 'Casa', 3, 2, 150, 130, [], 'Borrador de ejemplo: le faltan fotos. Sirve para probar el flujo de enviar a revisión.', 0],
  [14, U.asesor, 'Terreno sin papeles (rechazado)', 'SALE', 'REJECTED', 600000, 'Silao', 'Ejido', 'Terreno', null, null, 1000, null, ['terreno-9'], 'Ejemplo de propiedad rechazada por el administrador. El asesor puede corregirla y reenviarla.', 0],
];
let sql = `-- ============================================================================
-- Agencia EH · DATOS DE PRUEBA
-- Importa este archivo en phpMyAdmin (pestaña Importar o SQL) con tu base
-- seleccionada, DESPUÉS de haber desplegado la versión 0.15.0 o posterior
-- (la API crea/actualiza las tablas al arrancar).
--
-- Cuentas de prueba (todas con la contraseña: ${PASSWORD}):
--   agencia.demo@example.com      Agencia  (Inmobiliaria Demo Bajío)
--   agente.demo@example.com       Agente de la agencia
--   asesor.demo@example.com       Agente independiente
--   comprador.demo@example.com    Comprador (con favoritos, búsqueda y visita)
--   compradora.demo@example.com   Comprador (sin actividad)
--   vencido.demo@example.com      Agente con membresía VENCIDA (no puede entrar)
-- El administrador es tu propia cuenta. Se puede ejecutar más de una vez.
-- Para quitar todo, usa datos-prueba-borrar.sql.
-- ============================================================================
SET NAMES utf8mb4;
SET @admin := (SELECT Id FROM Users WHERE Role='ADMIN' ORDER BY CreatedAt LIMIT 1);

`;
sql += `-- Usuarios\n` + users.map(([i, e, n, ph, r, by]) => `INSERT IGNORE INTO Users(Id,Email,FullName,Phone,PasswordHash,Role,IsActive,EmailVerifiedAt,CreatedById,CreatedAt,UpdatedAt) VALUES(${q(i)},${q(e)},${q(n)},${q(ph)},${q(hash)},${q(r)},1,UTC_TIMESTAMP(),${by === '@admin' ? '@admin' : q(by)},UTC_TIMESTAMP() - INTERVAL 20 DAY,UTC_TIMESTAMP());`).join('\n') + '\n\n';
sql += `-- Perfiles de agencia y agentes (Ana pertenece a la agencia)
INSERT IGNORE INTO AgencyProfiles(Id,UserId,Name,Slug,Description,Phone) VALUES(${q(AG.profile)},${q(U.agencia)},'Inmobiliaria Demo Bajío','inmobiliaria-demo-bajio','Agencia de ejemplo para pruebas: casas, departamentos y locales en León, Irapuato y Silao.','4770000001');
INSERT IGNORE INTO AgentProfiles(Id,UserId,AgencyId) VALUES(${q(AG.agenteProfile)},${q(U.agente)},${q(AG.profile)});
INSERT IGNORE INTO AgentProfiles(Id,UserId,AgencyId) VALUES(${q(AG.asesorProfile)},${q(U.asesor)},NULL);
INSERT IGNORE INTO AgentProfiles(Id,UserId,AgencyId) VALUES(${q(AG.vencidoProfile)},${q(U.vencido)},NULL);

-- Propiedades (10 publicadas, 2 en revisión, 1 borrador, 1 rechazada)
`;
for (const [n, owner, title, op, st, price, mun, col, type, rec, bath, land, built, imgs, desc, ago] of props) {
  const pid = id(100 + n);
  const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').replace(/-+$/, '') + '-demo';
  sql += `INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES(${q(pid)},${q(slug)},${q(title)},${q(desc)},${q(op)},${q(st)},${price},'MXN',${q(mun)},${q(col)},${q(type)},${q(rec)},${q(bath)},${q(land)},${q(built)},${q(owner)},UTC_TIMESTAMP() - INTERVAL ${ago} DAY,UTC_TIMESTAMP() - INTERVAL ${ago} DAY);\n`;
  // Fotos de ejemplo en frontend/public/demo (fotos reales para casas y departamentos).
  imgs.forEach((img, k) => { sql += `INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES(${q(id(1000 + n * 10 + k))},${q(pid)},'/demo/${img}.jpg',${q(title)},${k});\n`; });
}
const P = (n) => id(100 + n);
sql += `
-- Prospectos y visitas
INSERT IGNORE INTO Leads(Id,PropertyId,Name,Email,Phone,Message,Status,AssignedToId,UserId,Kind,VisitAt,Notes,CreatedAt,UpdatedAt) VALUES
 (${q(id(201))},${q(P(1))},'Mariana López','mariana.demo@example.com','4779001122','Hola, ¿aceptan crédito Infonavit?','NEW',${q(U.agente)},NULL,'MESSAGE',NULL,NULL,UTC_TIMESTAMP() - INTERVAL 1 DAY,UTC_TIMESTAMP() - INTERVAL 1 DAY),
 (${q(id(202))},${q(P(2))},'Beto Comprador','comprador.demo@example.com','4770000004','Me gustaría verlo el fin de semana.','NEW',${q(U.agente)},${q(U.comprador)},'VISIT',UTC_TIMESTAMP() + INTERVAL 3 DAY,NULL,UTC_TIMESTAMP() - INTERVAL 5 HOUR,UTC_TIMESTAMP() - INTERVAL 5 HOUR),
 (${q(id(203))},${q(P(3))},'Jorge Ramírez','jorge.demo@example.com',NULL,'¿El precio es negociable?','CONTACTED',${q(U.agencia)},NULL,'MESSAGE',NULL,'Le llamé, pide descuento del 5%.',UTC_TIMESTAMP() - INTERVAL 3 DAY,UTC_TIMESTAMP() - INTERVAL 2 DAY),
 (${q(id(204))},${q(P(5))},'Beto Comprador','comprador.demo@example.com','4770000004',NULL,'VISIT_SCHEDULED',${q(U.asesor)},${q(U.comprador)},'VISIT',UTC_TIMESTAMP() + INTERVAL 1 DAY,'Confirmada por WhatsApp.',UTC_TIMESTAMP() - INTERVAL 2 DAY,UTC_TIMESTAMP() - INTERVAL 1 DAY);

-- Favoritos y búsqueda guardada del comprador
INSERT IGNORE INTO Favorites(Id,UserId,PropertyId) VALUES(${q(id(301))},${q(U.comprador)},${q(P(1))}),(${q(id(302))},${q(U.comprador)},${q(P(5))});
INSERT IGNORE INTO SavedSearches(Id,UserId,Name,Query,Alerts) VALUES(${q(id(401))},${q(U.comprador)},'Casas en venta en León','operation=SALE&municipality=Le%C3%B3n&propertyType=Casa',1);

-- Membresías (requiere que exista al menos un administrador)
INSERT IGNORE INTO Payments(Id,UserId,Plan,Amount,Method,Reference,PaidAt,PeriodStart,PeriodEnd,Notes,RecordedById)
 SELECT ${q(id(501))},${q(U.agencia)},'Anual',4800,'TRANSFER','SPEI DEMO-001',UTC_DATE(),UTC_DATE(),UTC_DATE() + INTERVAL 364 DAY,'Pago de prueba',@admin FROM DUAL WHERE @admin IS NOT NULL;
INSERT IGNORE INTO Payments(Id,UserId,Plan,Amount,Method,Reference,PaidAt,PeriodStart,PeriodEnd,Notes,RecordedById)
 SELECT ${q(id(502))},${q(U.agente)},'Mensual',500,'CASH',NULL,UTC_DATE() - INTERVAL 25 DAY,UTC_DATE() - INTERVAL 25 DAY,UTC_DATE() + INTERVAL 5 DAY,'Vence pronto (aparece en "por vencer")',@admin FROM DUAL WHERE @admin IS NOT NULL;
INSERT IGNORE INTO Payments(Id,UserId,Plan,Amount,Method,Reference,PaidAt,PeriodStart,PeriodEnd,Notes,RecordedById)
 SELECT ${q(id(503))},${q(U.vencido)},'Mensual',500,'CASH',NULL,UTC_DATE() - INTERVAL 60 DAY,UTC_DATE() - INTERVAL 60 DAY,UTC_DATE() - INTERVAL 31 DAY,'Membresía vencida: esta cuenta no puede entrar',@admin FROM DUAL WHERE @admin IS NOT NULL;
`;
fs.writeFileSync(process.argv[3], sql);
const all = [...Object.values(U)].map(q).join(',');
const del = `-- ============================================================================
-- Agencia EH · BORRAR DATOS DE PRUEBA
-- Quita todo lo que agregó datos-prueba.sql (cuentas *.demo@example.com, sus
-- propiedades, prospectos, favoritos, búsquedas y pagos). No toca tus datos reales.
-- ============================================================================
SET NAMES utf8mb4;
DELETE FROM Leads WHERE Id LIKE 'd3e0%' OR AssignedToId IN (${all}) OR PropertyId IN (SELECT Id FROM Properties WHERE OwnerId IN (${all}));
DELETE FROM Payments WHERE UserId IN (${all});
DELETE FROM Favorites WHERE UserId IN (${all}) OR PropertyId IN (SELECT Id FROM Properties WHERE OwnerId IN (${all}));
DELETE FROM SavedSearches WHERE UserId IN (${all});
DELETE FROM Properties WHERE OwnerId IN (${all});
UPDATE AgentProfiles SET AgencyId = NULL WHERE AgencyId = ${q(AG.profile)};
UPDATE Users SET CreatedById = NULL WHERE CreatedById IN (${all});
DELETE FROM Users WHERE Id IN (${all});
`;
fs.writeFileSync(process.argv[4], del);
console.log('ok', sql.length, del.length);
