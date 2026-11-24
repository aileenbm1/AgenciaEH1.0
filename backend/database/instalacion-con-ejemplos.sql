-- ============================================================================
-- Agencia EH · INSTALACIÓN CON EJEMPLOS (base de datos vacía)
-- Crea todas las tablas y carga propiedades, cuentas y reservas de ejemplo.
-- Úsalo en hPanel → Bases de datos → Importar datos (o phpMyAdmin → Importar).
-- Las cuentas de ejemplo usan la contraseña PruebaEH2026 (bórralas antes de abrir
-- el sitio al público con borrar-usuarios-excepto-admin.sql).
-- El administrador NO se crea aquí: regístrate en el sitio con el correo que
-- pusiste en ADMIN_EMAILS y al iniciar sesión queda como administrador.
-- ============================================================================
SET NAMES utf8mb4;

-- Agencia EH — esquema MySQL / MariaDB
-- En Hostinger: crea la base desde hPanel (Bases de datos → MySQL) y luego
-- importa este archivo en phpMyAdmin con esa base seleccionada.
-- Es seguro ejecutarlo más de una vez (CREATE TABLE IF NOT EXISTS).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS Users (
  Id CHAR(36) NOT NULL,
  Email VARCHAR(190) NOT NULL,
  FullName VARCHAR(100) NOT NULL,
  Phone VARCHAR(25) NULL,
  PasswordHash VARCHAR(100) NOT NULL,
  Role VARCHAR(20) NOT NULL,
  IsActive TINYINT(1) NOT NULL DEFAULT 1,
  RefreshTokenHash VARCHAR(64) NULL,
  EmailVerificationTokenHash VARCHAR(64) NULL,
  EmailVerificationExpiresAt DATETIME NULL,
  EmailVerifiedAt DATETIME NULL,
  PasswordResetTokenHash VARCHAR(64) NULL,
  PasswordResetExpiresAt DATETIME NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CreatedById CHAR(36) NULL,
  ApprovalStatus VARCHAR(10) NOT NULL DEFAULT 'APPROVED',
  CONSTRAINT PK_Users PRIMARY KEY (Id),
  INDEX IX_Users_CreatedBy (CreatedById),
  CONSTRAINT UQ_Users_Email UNIQUE (Email),
  CONSTRAINT CK_Users_Role CHECK (Role IN ('BUYER','AGENT','AGENCY','DEVELOPER','ADMIN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS AgencyProfiles (
  Id CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  Name VARCHAR(140) NOT NULL,
  Slug VARCHAR(180) NOT NULL,
  Description VARCHAR(1000) NULL,
  Phone VARCHAR(25) NULL,
  Views INT NOT NULL DEFAULT 0,
  CONSTRAINT PK_AgencyProfiles PRIMARY KEY (Id),
  CONSTRAINT UQ_AgencyProfiles_User UNIQUE (UserId),
  CONSTRAINT UQ_AgencyProfiles_Slug UNIQUE (Slug),
  CONSTRAINT FK_AgencyProfiles_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS AgentProfiles (
  Id CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  AgencyId CHAR(36) NULL,
  Bio VARCHAR(1000) NULL,
  Phone VARCHAR(25) NULL,
  Slug VARCHAR(180) NULL,
  PhotoUrl VARCHAR(500) NULL,
  Views INT NOT NULL DEFAULT 0,
  CONSTRAINT PK_AgentProfiles PRIMARY KEY (Id),
  CONSTRAINT UQ_AgentProfiles_Slug UNIQUE (Slug),
  CONSTRAINT UQ_AgentProfiles_User UNIQUE (UserId),
  CONSTRAINT FK_AgentProfiles_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
  CONSTRAINT FK_AgentProfiles_Agencies FOREIGN KEY (AgencyId) REFERENCES AgencyProfiles(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Properties (
  Id CHAR(36) NOT NULL,
  Slug VARCHAR(100) NOT NULL,
  Title VARCHAR(180) NOT NULL,
  Description MEDIUMTEXT NOT NULL,
  Operation VARCHAR(10) NOT NULL,
  Status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  Price DECIMAL(12,2) NOT NULL,
  RentPrice DECIMAL(12,2) NULL,
  Currency CHAR(3) NOT NULL DEFAULT 'MXN',
  Municipality VARCHAR(100) NOT NULL,
  Neighborhood VARCHAR(120) NULL,
  PropertyType VARCHAR(80) NOT NULL,
  Category VARCHAR(30) NULL,
  Availability VARCHAR(12) NOT NULL DEFAULT 'AVAILABLE',
  AvailableFrom DATE NULL,
  Latitude DECIMAL(9,6) NULL,
  Longitude DECIMAL(9,6) NULL,
  ShowExactLocation TINYINT(1) NOT NULL DEFAULT 0,
  Bedrooms INT NULL,
  Bathrooms INT NULL,
  LandArea DECIMAL(12,2) NULL,
  BuiltArea DECIMAL(12,2) NULL,
  OwnerId CHAR(36) NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_Properties PRIMARY KEY (Id),
  CONSTRAINT UQ_Properties_Slug UNIQUE (Slug),
  CONSTRAINT FK_Properties_Users FOREIGN KEY (OwnerId) REFERENCES Users(Id),
  CONSTRAINT CK_Properties_Operation CHECK (Operation IN ('RENT','SALE','BOTH')),
  CONSTRAINT CK_Properties_Status CHECK (Status IN ('DRAFT','REVIEW','PUBLISHED','RENTED','SOLD','REJECTED')),
  CONSTRAINT CK_Properties_Price CHECK (Price > 0),
  INDEX IX_Properties_PublicSearch (Status, Operation, Municipality, Price),
  INDEX IX_Properties_Owner (OwnerId, UpdatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PropertyImages (
  Id CHAR(36) NOT NULL,
  PropertyId CHAR(36) NOT NULL,
  Url VARCHAR(2048) NOT NULL,
  Alt VARCHAR(250) NULL,
  Label VARCHAR(40) NULL,
  Position INT NOT NULL DEFAULT 0,
  CONSTRAINT PK_PropertyImages PRIMARY KEY (Id),
  CONSTRAINT FK_PropertyImages_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Leads (
  Id CHAR(36) NOT NULL,
  PropertyId CHAR(36) NULL,
  Name VARCHAR(120) NOT NULL,
  Email VARCHAR(190) NOT NULL,
  Phone VARCHAR(25) NULL,
  Message VARCHAR(2000) NULL,
  Status VARCHAR(24) NOT NULL DEFAULT 'NEW',
  AssignedToId CHAR(36) NULL,
  UserId CHAR(36) NULL,
  Kind VARCHAR(10) NOT NULL DEFAULT 'MESSAGE',
  VisitAt DATETIME NULL,
  Notes VARCHAR(1000) NULL,
  Source VARCHAR(40) NULL,
  Campaign VARCHAR(80) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NULL,
  CONSTRAINT PK_Leads PRIMARY KEY (Id),
  CONSTRAINT FK_Leads_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE SET NULL,
  CONSTRAINT FK_Leads_AssignedTo FOREIGN KEY (AssignedToId) REFERENCES Users(Id),
  CONSTRAINT CK_Leads_Status CHECK (Status IN ('NEW','CONTACTED','VISIT_SCHEDULED','CLOSED','LOST')),
  INDEX IX_Leads_Assigned_Status (AssignedToId, Status, CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Favorites (
  Id CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  PropertyId CHAR(36) NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_Favorites PRIMARY KEY (Id),
  CONSTRAINT UQ_Favorites_User_Property UNIQUE (UserId, PropertyId),
  CONSTRAINT FK_Favorites_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
  CONSTRAINT FK_Favorites_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pagos de membresía registrados por un administrador (efectivo o transferencia).
-- La membresía de un usuario está activa mientras su último PeriodEnd no haya pasado.
CREATE TABLE IF NOT EXISTS Payments (
  Id CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  Plan VARCHAR(60) NOT NULL,
  Amount DECIMAL(12,2) NOT NULL,
  Currency CHAR(3) NOT NULL DEFAULT 'MXN',
  Method VARCHAR(12) NOT NULL,
  Reference VARCHAR(120) NULL,
  PaidAt DATE NOT NULL,
  PeriodStart DATE NOT NULL,
  PeriodEnd DATE NOT NULL,
  Notes VARCHAR(500) NULL,
  RecordedById CHAR(36) NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_Payments PRIMARY KEY (Id),
  CONSTRAINT FK_Payments_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
  CONSTRAINT FK_Payments_RecordedBy FOREIGN KEY (RecordedById) REFERENCES Users(Id),
  CONSTRAINT CK_Payments_Method CHECK (Method IN ('CASH','TRANSFER')),
  CONSTRAINT CK_Payments_Amount CHECK (Amount > 0),
  CONSTRAINT CK_Payments_Period CHECK (PeriodEnd >= PeriodStart),
  INDEX IX_Payments_User_Period (UserId, PeriodEnd),
  INDEX IX_Payments_PaidAt (PaidAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Búsquedas guardadas por usuarios; con Alerts=1 se avisa por correo cuando se
-- publica una propiedad que coincide.
CREATE TABLE IF NOT EXISTS SavedSearches (
  Id CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  Name VARCHAR(120) NOT NULL,
  Query VARCHAR(600) NOT NULL,
  Alerts TINYINT(1) NOT NULL DEFAULT 1,
  LastNotifiedAt DATETIME NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_SavedSearches PRIMARY KEY (Id),
  CONSTRAINT FK_SavedSearches_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
  INDEX IX_SavedSearches_User (UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campos personalizados que define el administrador (RF-03).
CREATE TABLE IF NOT EXISTS CustomFields (
  Id CHAR(36) NOT NULL,
  FieldKey VARCHAR(40) NOT NULL,
  Label VARCHAR(80) NOT NULL,
  Type VARCHAR(10) NOT NULL,
  Options VARCHAR(1000) NULL,
  Required TINYINT(1) NOT NULL DEFAULT 0,
  Filterable TINYINT(1) NOT NULL DEFAULT 0,
  Position INT NOT NULL DEFAULT 0,
  Active TINYINT(1) NOT NULL DEFAULT 1,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_CustomFields PRIMARY KEY (Id),
  CONSTRAINT UQ_CustomFields_Key UNIQUE (FieldKey),
  CONSTRAINT CK_CustomFields_Type CHECK (Type IN ('TEXT','NUMBER','BOOLEAN','SELECT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PropertyCustomValues (
  PropertyId CHAR(36) NOT NULL,
  FieldId CHAR(36) NOT NULL,
  Value VARCHAR(500) NOT NULL,
  CONSTRAINT PK_PropertyCustomValues PRIMARY KEY (PropertyId, FieldId),
  CONSTRAINT FK_PCV_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE,
  CONSTRAINT FK_PCV_Fields FOREIGN KEY (FieldId) REFERENCES CustomFields(Id) ON DELETE CASCADE,
  INDEX IX_PCV_Field_Value (FieldId, Value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Reservas en línea (RF-20 a RF-27). El pago es en persona; aquí solo se registra. ──
-- Configuración de reservas por propiedad (renta mensual o por noche).
CREATE TABLE IF NOT EXISTS RentalSettings (
  PropertyId CHAR(36) NOT NULL,
  Enabled TINYINT(1) NOT NULL DEFAULT 0,
  Mode VARCHAR(10) NOT NULL DEFAULT 'MONTHLY',
  NightPrice DECIMAL(12,2) NULL,
  MinStay INT NOT NULL DEFAULT 1,
  MaxStay INT NULL,
  MaxGuests INT NULL,
  Deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
  TaxRate DECIMAL(5,2) NOT NULL DEFAULT 0,
  CancellationPolicy VARCHAR(1000) NULL,
  -- Reglas de la casa que el interesado ve antes de reservar.
  Rules VARCHAR(2000) NULL,
  Nearby VARCHAR(700) NULL,
  Seasons VARCHAR(4000) NULL,
  SaleRequests TINYINT(1) NOT NULL DEFAULT 1,
  -- Modalidades que acepta (una o varias): NIGHTLY (por noche), WEEKLY (por semana), MONTHLY (por mes).
  Modes VARCHAR(40) NULL,
  WeekPrice DECIMAL(12,2) NULL,
  MonthPrice DECIMAL(12,2) NULL,
  MinWeeks INT NOT NULL DEFAULT 1,
  MaxWeeks INT NULL,
  MinMonths INT NOT NULL DEFAULT 1,
  MaxMonths INT NULL,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_RentalSettings PRIMARY KEY (PropertyId),
  CONSTRAINT FK_RentalSettings_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE,
  CONSTRAINT CK_RentalSettings_Mode CHECK (Mode IN ('MONTHLY','NIGHTLY'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Solicitudes de reserva (renta por noche, renta mensual o apartado de compra).
-- Estados: PENDING → APPROVED → DEPOSIT_PAID (apartada, anticipo registrado) → COMPLETED; REJECTED; CANCELLED.
CREATE TABLE IF NOT EXISTS Reservations (
  Id CHAR(36) NOT NULL,
  PropertyId CHAR(36) NOT NULL,
  GuestId CHAR(36) NOT NULL,
  OwnerId CHAR(36) NOT NULL,
  Kind VARCHAR(10) NOT NULL,
  Status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  CheckIn DATE NULL,
  CheckOut DATE NULL,
  Months INT NULL,
  Weeks INT NULL,
  Nights INT NULL,
  Guests INT NULL,
  PaymentType VARCHAR(20) NULL,
  Subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  Taxes DECIMAL(12,2) NOT NULL DEFAULT 0,
  Deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
  Total DECIMAL(12,2) NOT NULL DEFAULT 0,
  AdvanceRequired DECIMAL(12,2) NULL,
  AdvanceAmount DECIMAL(12,2) NULL,
  AdvanceMethod VARCHAR(12) NULL,
  AdvancePaidAt DATETIME NULL,
  PaidAmount DECIMAL(12,2) NULL,
  PaidMethod VARCHAR(12) NULL,
  PaidAt DATETIME NULL,
  PaymentNotes VARCHAR(500) NULL,
  AppointmentAt DATETIME NULL,
  AppointmentPlace VARCHAR(250) NULL,
  GuestConfirmedAt DATETIME NULL,
  ReminderSentAt DATETIME NULL,
  CheckinReminderAt DATETIME NULL,
  PayReminderAt DATETIME NULL,
  PayDueReminderAt DATETIME NULL,
  OverdueNoticeAt DATETIME NULL,
  GuestNote VARCHAR(1000) NULL,
  OwnerNote VARCHAR(1000) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_Reservations PRIMARY KEY (Id),
  CONSTRAINT FK_Reservations_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE,
  CONSTRAINT CK_Reservations_Kind CHECK (Kind IN ('NIGHTLY','WEEKLY','MONTHLY','SALE')),
  CONSTRAINT CK_Reservations_Status CHECK (Status IN ('PENDING','APPROVED','DEPOSIT_PAID','COMPLETED','REJECTED','CANCELLED')),
  INDEX IX_Reservations_Property (PropertyId, Status, CheckIn),
  INDEX IX_Reservations_Guest (GuestId, CreatedAt),
  INDEX IX_Reservations_Owner (OwnerId, Status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat de cada reserva.
CREATE TABLE IF NOT EXISTS ReservationMessages (
  Id CHAR(36) NOT NULL,
  ReservationId CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  Body VARCHAR(2000) NOT NULL,
  Seq INT NOT NULL DEFAULT 0,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_ReservationMessages PRIMARY KEY (Id),
  CONSTRAINT FK_ResMessages_Reservations FOREIGN KEY (ReservationId) REFERENCES Reservations(Id) ON DELETE CASCADE,
  INDEX IX_ResMessages (ReservationId, CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documentos privados de la reserva (INE, comprobantes). Se guardan fuera de la carpeta pública.
CREATE TABLE IF NOT EXISTS ReservationDocuments (
  Id CHAR(36) NOT NULL,
  ReservationId CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  Kind VARCHAR(40) NULL,
  FileName VARCHAR(200) NOT NULL,
  StoredName VARCHAR(80) NOT NULL,
  Mime VARCHAR(60) NOT NULL,
  Size INT NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_ReservationDocuments PRIMARY KEY (Id),
  CONSTRAINT FK_ResDocs_Reservations FOREIGN KEY (ReservationId) REFERENCES Reservations(Id) ON DELETE CASCADE,
  INDEX IX_ResDocs (ReservationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fechas bloqueadas manualmente por el anunciante (calendario).
CREATE TABLE IF NOT EXISTS BlockedDates (
  Id CHAR(36) NOT NULL,
  PropertyId CHAR(36) NOT NULL,
  StartDate DATE NOT NULL,
  EndDate DATE NOT NULL,
  Reason VARCHAR(200) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_BlockedDates PRIMARY KEY (Id),
  CONSTRAINT FK_BlockedDates_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE,
  INDEX IX_BlockedDates (PropertyId, StartDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fanpage de cada propiedad (RF fanpage). Solo bloques y colores: nunca HTML ni CSS.
-- Blocks/Theme = versión publicada; DraftBlocks/DraftTheme = borrador en edición.
CREATE TABLE IF NOT EXISTS Fanpages (
  PropertyId CHAR(36) NOT NULL,
  Status VARCHAR(10) NOT NULL DEFAULT 'DRAFT',
  Theme TEXT NULL,
  Blocks MEDIUMTEXT NULL,
  DraftTheme TEXT NULL,
  DraftBlocks MEDIUMTEXT NULL,
  ReviewNote VARCHAR(500) NULL,
  UpdatedById CHAR(36) NULL,
  UpdatedAt DATETIME NULL,
  PublishedAt DATETIME NULL,
  CONSTRAINT PK_Fanpages PRIMARY KEY (PropertyId),
  CONSTRAINT FK_Fanpages_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE,
  CONSTRAINT CK_Fanpages_Status CHECK (Status IN ('DRAFT','PENDING','PUBLISHED','REJECTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de versiones publicadas/guardadas de la fanpage (para revertir).
CREATE TABLE IF NOT EXISTS FanpageVersions (
  Id CHAR(36) NOT NULL,
  PropertyId CHAR(36) NOT NULL,
  Theme TEXT NULL,
  Blocks MEDIUMTEXT NULL,
  Note VARCHAR(200) NULL,
  CreatedById CHAR(36) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_FanpageVersions PRIMARY KEY (Id),
  CONSTRAINT FK_FanpageVersions_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE,
  INDEX IX_FanpageVersions (PropertyId, CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plantillas de fanpage que administra el admin (se clonan al crear una fanpage).
CREATE TABLE IF NOT EXISTS FanpageTemplates (
  Id CHAR(36) NOT NULL,
  Name VARCHAR(80) NOT NULL,
  Description VARCHAR(300) NULL,
  Theme TEXT NULL,
  Blocks MEDIUMTEXT NULL,
  IsActive TINYINT(1) NOT NULL DEFAULT 1,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_FanpageTemplates PRIMARY KEY (Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estadísticas de la fanpage: visitas, clics en compartir, clics en botones y prospectos.
CREATE TABLE IF NOT EXISTS FanpageEvents (
  Id BIGINT NOT NULL AUTO_INCREMENT,
  PropertyId CHAR(36) NOT NULL,
  Kind VARCHAR(10) NOT NULL,
  Channel VARCHAR(30) NULL,
  Campaign VARCHAR(80) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_FanpageEvents PRIMARY KEY (Id),
  CONSTRAINT FK_FanpageEvents_Properties FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE,
  INDEX IX_FanpageEvents (PropertyId, Kind, CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajustes generales que cambia el admin desde el panel (clave → valor JSON).
CREATE TABLE IF NOT EXISTS SiteSettings (
  K VARCHAR(60) NOT NULL,
  V MEDIUMTEXT NULL,
  CONSTRAINT PK_SiteSettings PRIMARY KEY (K)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de versiones publicadas del diseño del sitio (editor del administrador).
CREATE TABLE IF NOT EXISTS SiteVersions (
  Id CHAR(36) NOT NULL,
  Config MEDIUMTEXT NOT NULL,
  Note VARCHAR(120) NULL,
  CreatedById CHAR(36) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_SiteVersions PRIMARY KEY (Id),
  INDEX IX_SiteVersions_Created (CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de pagos de cada reserva (anticipo y abonos). El saldo = Total − suma de pagos vigentes.
CREATE TABLE IF NOT EXISTS ReservationPayments (
  Id CHAR(36) NOT NULL,
  ReservationId CHAR(36) NOT NULL,
  Amount DECIMAL(12,2) NOT NULL,
  Method VARCHAR(10) NOT NULL,
  Kind VARCHAR(10) NOT NULL DEFAULT 'PAYMENT',
  Notes VARCHAR(500) NULL,
  CreatedById CHAR(36) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  VoidedAt DATETIME NULL,
  VoidedById CHAR(36) NULL,
  VoidReason VARCHAR(300) NULL,
  CONSTRAINT PK_ReservationPayments PRIMARY KEY (Id),
  CONSTRAINT FK_ResPayments_Reservations FOREIGN KEY (ReservationId) REFERENCES Reservations(Id) ON DELETE CASCADE,
  CONSTRAINT CK_ResPayments_Method CHECK (Method IN ('CASH','TRANSFER')),
  INDEX IX_ResPayments (ReservationId, CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- Agencia EH · DATOS DE PRUEBA
-- Importa este archivo en phpMyAdmin (pestaña Importar o SQL) con tu base
-- seleccionada, DESPUÉS de haber desplegado la versión 0.15.0 o posterior
-- (la API crea/actualiza las tablas al arrancar).
--
-- Cuentas de prueba (todas con la contraseña: PruebaEH2026):
--   agencia.demo@example.com      Agencia  (Inmobiliaria Demo Bajío)
--   agente.demo@example.com       Agente de la agencia
--   asesor.demo@example.com       Agente independiente
--   comprador.demo@example.com    Comprador (con favoritos, búsqueda y visita)
--   compradora.demo@example.com   Comprador (sin actividad)
--   desarrolladora.demo@example.com  Desarrolladora (Desarrollos Demo del Bajío)
-- Las cuentas profesionales tienen membresía anual vigente desde el día que
-- importes este archivo. Rentas listas para reservar en línea (noche, semana y mes).
-- El administrador es tu propia cuenta. Se puede ejecutar más de una vez.
-- Para quitar todo, usa datos-prueba-borrar.sql.
-- ============================================================================
SET NAMES utf8mb4;
SET @admin := (SELECT Id FROM Users WHERE Role='ADMIN' ORDER BY CreatedAt LIMIT 1);

-- Usuarios
INSERT IGNORE INTO Users(Id,Email,FullName,Phone,PasswordHash,Role,IsActive,EmailVerifiedAt,CreatedById,CreatedAt,UpdatedAt) VALUES('d3e00001-0000-4000-8000-000000000001','agencia.demo@example.com','Laura Méndez','4770000001','$2a$12$9SWmo/iCKJhiS.8dAqcs0eKIFBxIZX7KBaCmmLducU6KrWWq31/pq','AGENCY',1,UTC_TIMESTAMP(),@admin,UTC_TIMESTAMP() - INTERVAL 20 DAY,UTC_TIMESTAMP());
INSERT IGNORE INTO Users(Id,Email,FullName,Phone,PasswordHash,Role,IsActive,EmailVerifiedAt,CreatedById,CreatedAt,UpdatedAt) VALUES('d3e00002-0000-4000-8000-000000000002','agente.demo@example.com','Ana Vendedora','4770000002','$2a$12$9SWmo/iCKJhiS.8dAqcs0eKIFBxIZX7KBaCmmLducU6KrWWq31/pq','AGENT',1,UTC_TIMESTAMP(),'d3e00001-0000-4000-8000-000000000001',UTC_TIMESTAMP() - INTERVAL 20 DAY,UTC_TIMESTAMP());
INSERT IGNORE INTO Users(Id,Email,FullName,Phone,PasswordHash,Role,IsActive,EmailVerifiedAt,CreatedById,CreatedAt,UpdatedAt) VALUES('d3e00003-0000-4000-8000-000000000003','asesor.demo@example.com','Carlos Asesor','4770000003','$2a$12$9SWmo/iCKJhiS.8dAqcs0eKIFBxIZX7KBaCmmLducU6KrWWq31/pq','AGENT',1,UTC_TIMESTAMP(),@admin,UTC_TIMESTAMP() - INTERVAL 20 DAY,UTC_TIMESTAMP());
INSERT IGNORE INTO Users(Id,Email,FullName,Phone,PasswordHash,Role,IsActive,EmailVerifiedAt,CreatedById,CreatedAt,UpdatedAt) VALUES('d3e00004-0000-4000-8000-000000000004','comprador.demo@example.com','Beto Comprador','4770000004','$2a$12$9SWmo/iCKJhiS.8dAqcs0eKIFBxIZX7KBaCmmLducU6KrWWq31/pq','BUYER',1,UTC_TIMESTAMP(),'d3e00002-0000-4000-8000-000000000002',UTC_TIMESTAMP() - INTERVAL 20 DAY,UTC_TIMESTAMP());
INSERT IGNORE INTO Users(Id,Email,FullName,Phone,PasswordHash,Role,IsActive,EmailVerifiedAt,CreatedById,CreatedAt,UpdatedAt) VALUES('d3e00005-0000-4000-8000-000000000005','compradora.demo@example.com','Sofía Compradora',NULL,'$2a$12$9SWmo/iCKJhiS.8dAqcs0eKIFBxIZX7KBaCmmLducU6KrWWq31/pq','BUYER',1,UTC_TIMESTAMP(),'d3e00001-0000-4000-8000-000000000001',UTC_TIMESTAMP() - INTERVAL 20 DAY,UTC_TIMESTAMP());
INSERT IGNORE INTO Users(Id,Email,FullName,Phone,PasswordHash,Role,IsActive,EmailVerifiedAt,CreatedById,CreatedAt,UpdatedAt) VALUES('d3e00007-0000-4000-8000-000000000007','desarrolladora.demo@example.com','Marco Desarrollos','4770000007','$2a$12$9SWmo/iCKJhiS.8dAqcs0eKIFBxIZX7KBaCmmLducU6KrWWq31/pq','DEVELOPER',1,UTC_TIMESTAMP(),@admin,UTC_TIMESTAMP() - INTERVAL 20 DAY,UTC_TIMESTAMP());

-- Perfiles de agencia y agentes (Ana pertenece a la agencia)
INSERT IGNORE INTO AgencyProfiles(Id,UserId,Name,Slug,Description,Phone) VALUES('d3e00011-0000-4000-8000-000000000011','d3e00001-0000-4000-8000-000000000001','Inmobiliaria Demo Bajío','inmobiliaria-demo-bajio','Agencia de ejemplo para pruebas: casas, departamentos y locales en León, Irapuato y Silao.','4770000001');
INSERT IGNORE INTO AgentProfiles(Id,UserId,AgencyId,Slug) VALUES('d3e00012-0000-4000-8000-000000000012','d3e00002-0000-4000-8000-000000000002','d3e00011-0000-4000-8000-000000000011','ana-vendedora-d3e00');
INSERT IGNORE INTO AgentProfiles(Id,UserId,AgencyId,Slug) VALUES('d3e00013-0000-4000-8000-000000000013','d3e00003-0000-4000-8000-000000000003',NULL,'carlos-asesor-d3e00');
INSERT IGNORE INTO AgencyProfiles(Id,UserId,Name,Slug,Description,Phone) VALUES('d3e00015-0000-4000-8000-000000000015','d3e00007-0000-4000-8000-000000000007','Desarrollos Demo del Bajío','desarrollos-demo-del-bajio','Desarrolladora de ejemplo para pruebas: preventas de departamentos en León.','4770000007');

-- Propiedades (10 publicadas, 2 en revisión, 1 borrador, 1 rechazada)
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00101-0000-4000-8000-000000000101','casa-con-jardin-en-el-molino-demo','Casa con jardín en El Molino','Casa de dos niveles con jardín amplio, cochera para dos autos, cocina integral y estudio. A 5 minutos de Blvd. Campestre.','SALE','PUBLISHED',3450000,'MXN','León','El Molino','Casa',3,3,220,185,'d3e00002-0000-4000-8000-000000000002',UTC_TIMESTAMP() - INTERVAL 2 DAY,UTC_TIMESTAMP() - INTERVAL 2 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01010-0000-4000-8000-000000001010','d3e00101-0000-4000-8000-000000000101','/demo/residencia-1.jpg','Casa con jardín en El Molino',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01011-0000-4000-8000-000000001011','d3e00101-0000-4000-8000-000000000101','/demo/residencia-6.jpg','Casa con jardín en El Molino',1);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00102-0000-4000-8000-000000000102','departamento-amueblado-cerca-de-plaza-mayor-demo','Departamento amueblado cerca de Plaza Mayor','Departamento amueblado en piso 4 con elevador, balcón, estacionamiento techado y vigilancia 24 h. Incluye mantenimiento.','RENT','PUBLISHED',14500,'MXN','León','Jardines del Moral','Departamento',2,2,NULL,95,'d3e00002-0000-4000-8000-000000000002',UTC_TIMESTAMP() - INTERVAL 3 DAY,UTC_TIMESTAMP() - INTERVAL 3 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01020-0000-4000-8000-000000001020','d3e00102-0000-4000-8000-000000000102','/demo/departamento-interior.jpg','Departamento amueblado cerca de Plaza Mayor',0);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00103-0000-4000-8000-000000000103','residencia-en-campestre-con-alberca-demo','Residencia en Campestre con alberca','Residencia de lujo con alberca, jardín, cuarto de servicio, 4 recámaras con baño propio y terraza techada. Fraccionamiento privado.','SALE','PUBLISHED',8900000,'MXN','León','Campestre','Casa',4,4,450,380,'d3e00001-0000-4000-8000-000000000001',UTC_TIMESTAMP() - INTERVAL 1 DAY,UTC_TIMESTAMP() - INTERVAL 1 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01030-0000-4000-8000-000000001030','d3e00103-0000-4000-8000-000000000103','/demo/residencia-2.jpg','Residencia en Campestre con alberca',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01031-0000-4000-8000-000000001031','d3e00103-0000-4000-8000-000000000103','/demo/residencia-3.jpg','Residencia en Campestre con alberca',1);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01032-0000-4000-8000-000000001032','d3e00103-0000-4000-8000-000000000103','/demo/residencia-4.jpg','Residencia en Campestre con alberca',2);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00104-0000-4000-8000-000000000104','local-comercial-sobre-blvd-lopez-mateos-demo','Local comercial sobre Blvd. López Mateos','Local en planta baja con frente de 8 m, alto flujo peatonal y vehicular. Ideal para tienda o consultorio.','RENT','PUBLISHED',28000,'MXN','León','Centro','Local comercial',NULL,1,120,120,'d3e00001-0000-4000-8000-000000000001',UTC_TIMESTAMP() - INTERVAL 6 DAY,UTC_TIMESTAMP() - INTERVAL 6 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01040-0000-4000-8000-000000001040','d3e00104-0000-4000-8000-000000000104','/demo/local-10.jpg','Local comercial sobre Blvd. López Mateos',0);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00105-0000-4000-8000-000000000105','casa-colonial-en-el-centro-de-guanajuato-demo','Casa colonial en el centro de Guanajuato','Casa colonial restaurada a dos calles del Jardín Unión, con patio central, techos altos y terraza con vista a la ciudad.','SALE','PUBLISHED',4200000,'MXN','Guanajuato','Centro','Casa',3,2,160,210,'d3e00003-0000-4000-8000-000000000003',UTC_TIMESTAMP() - INTERVAL 4 DAY,UTC_TIMESTAMP() - INTERVAL 4 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01050-0000-4000-8000-000000001050','d3e00105-0000-4000-8000-000000000105','/demo/colonial-fachada.jpg','Casa colonial en el centro de Guanajuato',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01051-0000-4000-8000-000000001051','d3e00105-0000-4000-8000-000000000105','/demo/colonial-patio.jpg','Casa colonial en el centro de Guanajuato',1);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00106-0000-4000-8000-000000000106','departamento-para-estudiantes-cerca-de-la-ug-demo','Departamento para estudiantes cerca de la UG','Departamento pequeño y luminoso, ideal para estudiante. Servicios incluidos (agua e internet). Contrato por semestre.','RENT','PUBLISHED',6500,'MXN','Guanajuato','Pastita','Departamento',1,1,NULL,45,'d3e00003-0000-4000-8000-000000000003',UTC_TIMESTAMP() - INTERVAL 8 DAY,UTC_TIMESTAMP() - INTERVAL 8 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01060-0000-4000-8000-000000001060','d3e00106-0000-4000-8000-000000000106','/demo/departamento-interior.jpg','Departamento para estudiantes cerca de la UG',0);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00107-0000-4000-8000-000000000107','casa-en-fraccionamiento-con-vigilancia-demo','Casa en fraccionamiento con vigilancia','Casa en coto privado con caseta de vigilancia, áreas verdes y alberca común. Cochera para un auto.','RENT','PUBLISHED',12000,'MXN','Irapuato','Villas de Irapuato','Casa',3,2,140,120,'d3e00002-0000-4000-8000-000000000002',UTC_TIMESTAMP() - INTERVAL 5 DAY,UTC_TIMESTAMP() - INTERVAL 5 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01070-0000-4000-8000-000000001070','d3e00107-0000-4000-8000-000000000107','/demo/residencia-5.jpg','Casa en fraccionamiento con vigilancia',0);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00108-0000-4000-8000-000000000108','terreno-habitacional-en-silao-demo','Terreno habitacional en Silao','Terreno plano de 500 m² con servicios a pie de lote, escrituras en regla. A 10 minutos del Puerto Interior.','SALE','PUBLISHED',1250000,'MXN','Silao','Los Sauces','Terreno',NULL,NULL,500,NULL,'d3e00001-0000-4000-8000-000000000001',UTC_TIMESTAMP() - INTERVAL 10 DAY,UTC_TIMESTAMP() - INTERVAL 10 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01080-0000-4000-8000-000000001080','d3e00108-0000-4000-8000-000000000108','/demo/terreno-8.jpg','Terreno habitacional en Silao',0);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00109-0000-4000-8000-000000000109','oficina-ejecutiva-en-celaya-demo','Oficina ejecutiva en Celaya','Oficina en edificio corporativo con recepción, sala de juntas compartida y 3 cajones de estacionamiento.','RENT','PUBLISHED',18000,'MXN','Celaya','Zona de Oro','Oficina',NULL,2,NULL,110,'d3e00003-0000-4000-8000-000000000003',UTC_TIMESTAMP() - INTERVAL 7 DAY,UTC_TIMESTAMP() - INTERVAL 7 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01090-0000-4000-8000-000000001090','d3e00109-0000-4000-8000-000000000109','/demo/oficina-12.jpg','Oficina ejecutiva en Celaya',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01091-0000-4000-8000-000000001091','d3e00109-0000-4000-8000-000000000109','/demo/oficina-13.jpg','Oficina ejecutiva en Celaya',1);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00110-0000-4000-8000-000000000110','casa-con-vista-en-san-miguel-de-allende-demo','Casa con vista en San Miguel de Allende','Casa estilo mexicano contemporáneo con roof garden y vista a la Parroquia. Ideal para vivir o renta vacacional.','SALE','PUBLISHED',6800000,'MXN','San Miguel de Allende','Guadiana','Casa',3,3,300,260,'d3e00002-0000-4000-8000-000000000002',UTC_TIMESTAMP() - INTERVAL 9 DAY,UTC_TIMESTAMP() - INTERVAL 9 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01100-0000-4000-8000-000000001100','d3e00110-0000-4000-8000-000000000110','/demo/colonial-vista.jpg','Casa con vista en San Miguel de Allende',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01101-0000-4000-8000-000000001101','d3e00110-0000-4000-8000-000000000110','/demo/colonial-patio.jpg','Casa con vista en San Miguel de Allende',1);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00111-0000-4000-8000-000000000111','departamento-nuevo-en-preventa-demo','Departamento nuevo en preventa','Departamento en preventa con entrega en 12 meses, amenidades: gimnasio, roof garden y área de juegos.','SALE','REVIEW',2150000,'MXN','León','Lomas del Campestre','Departamento',2,2,NULL,88,'d3e00007-0000-4000-8000-000000000007',UTC_TIMESTAMP() - INTERVAL 0 DAY,UTC_TIMESTAMP() - INTERVAL 0 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01110-0000-4000-8000-000000001110','d3e00111-0000-4000-8000-000000000111','/demo/departamento-interior.jpg','Departamento nuevo en preventa',0);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00112-0000-4000-8000-000000000112','bodega-industrial-en-irapuato-demo','Bodega industrial en Irapuato','Bodega con andén de carga, oficinas y altura libre de 9 m. Acceso para tráiler.','RENT','REVIEW',45000,'MXN','Irapuato','Parque Industrial','Local comercial',NULL,2,800,600,'d3e00001-0000-4000-8000-000000000001',UTC_TIMESTAMP() - INTERVAL 0 DAY,UTC_TIMESTAMP() - INTERVAL 0 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01120-0000-4000-8000-000000001120','d3e00112-0000-4000-8000-000000000112','/demo/local-11.jpg','Bodega industrial en Irapuato',0);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00113-0000-4000-8000-000000000113','casa-en-celaya-borrador-demo','Casa en Celaya (borrador)','Borrador de ejemplo: le faltan fotos. Sirve para probar el flujo de enviar a revisión.','SALE','DRAFT',1900000,'MXN','Celaya','Las Insurgentes','Casa',3,2,150,130,'d3e00002-0000-4000-8000-000000000002',UTC_TIMESTAMP() - INTERVAL 0 DAY,UTC_TIMESTAMP() - INTERVAL 0 DAY);
INSERT IGNORE INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,Currency,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,OwnerId,CreatedAt,UpdatedAt) VALUES('d3e00114-0000-4000-8000-000000000114','terreno-sin-papeles-rechazado-demo','Terreno sin papeles (rechazado)','Ejemplo de propiedad rechazada por el administrador. El asesor puede corregirla y reenviarla.','SALE','REJECTED',600000,'MXN','Silao','Ejido','Terreno',NULL,NULL,1000,NULL,'d3e00003-0000-4000-8000-000000000003',UTC_TIMESTAMP() - INTERVAL 0 DAY,UTC_TIMESTAMP() - INTERVAL 0 DAY);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01140-0000-4000-8000-000000001140','d3e00114-0000-4000-8000-000000000114','/demo/terreno-9.jpg','Terreno sin papeles (rechazado)',0);

-- Prospectos y visitas
INSERT IGNORE INTO Leads(Id,PropertyId,Name,Email,Phone,Message,Status,AssignedToId,UserId,Kind,VisitAt,Notes,CreatedAt,UpdatedAt) VALUES
 ('d3e00201-0000-4000-8000-000000000201','d3e00101-0000-4000-8000-000000000101','Mariana López','mariana.demo@example.com','4779001122','Hola, ¿aceptan crédito Infonavit?','NEW','d3e00002-0000-4000-8000-000000000002',NULL,'MESSAGE',NULL,NULL,UTC_TIMESTAMP() - INTERVAL 1 DAY,UTC_TIMESTAMP() - INTERVAL 1 DAY),
 ('d3e00202-0000-4000-8000-000000000202','d3e00102-0000-4000-8000-000000000102','Beto Comprador','comprador.demo@example.com','4770000004','Me gustaría verlo el fin de semana.','NEW','d3e00002-0000-4000-8000-000000000002','d3e00004-0000-4000-8000-000000000004','VISIT',UTC_TIMESTAMP() + INTERVAL 3 DAY,NULL,UTC_TIMESTAMP() - INTERVAL 5 HOUR,UTC_TIMESTAMP() - INTERVAL 5 HOUR),
 ('d3e00203-0000-4000-8000-000000000203','d3e00103-0000-4000-8000-000000000103','Jorge Ramírez','jorge.demo@example.com',NULL,'¿El precio es negociable?','CONTACTED','d3e00001-0000-4000-8000-000000000001',NULL,'MESSAGE',NULL,'Le llamé, pide descuento del 5%.',UTC_TIMESTAMP() - INTERVAL 3 DAY,UTC_TIMESTAMP() - INTERVAL 2 DAY),
 ('d3e00204-0000-4000-8000-000000000204','d3e00105-0000-4000-8000-000000000105','Beto Comprador','comprador.demo@example.com','4770000004',NULL,'VISIT_SCHEDULED','d3e00003-0000-4000-8000-000000000003','d3e00004-0000-4000-8000-000000000004','VISIT',UTC_TIMESTAMP() + INTERVAL 1 DAY,'Confirmada por WhatsApp.',UTC_TIMESTAMP() - INTERVAL 2 DAY,UTC_TIMESTAMP() - INTERVAL 1 DAY);

-- Favoritos y búsqueda guardada del comprador
INSERT IGNORE INTO Favorites(Id,UserId,PropertyId) VALUES('d3e00301-0000-4000-8000-000000000301','d3e00004-0000-4000-8000-000000000004','d3e00101-0000-4000-8000-000000000101'),('d3e00302-0000-4000-8000-000000000302','d3e00004-0000-4000-8000-000000000004','d3e00105-0000-4000-8000-000000000105');
INSERT IGNORE INTO SavedSearches(Id,UserId,Name,Query,Alerts) VALUES('d3e00401-0000-4000-8000-000000000401','d3e00004-0000-4000-8000-000000000004','Casas en venta en León','operation=SALE&municipality=Le%C3%B3n&propertyType=Casa',1);

-- Membresías anuales vigentes desde hoy (requiere que exista al menos un administrador)
INSERT IGNORE INTO Payments(Id,UserId,Plan,Amount,Method,Reference,PaidAt,PeriodStart,PeriodEnd,Notes,RecordedById)
 SELECT 'd3e00501-0000-4000-8000-000000000501','d3e00001-0000-4000-8000-000000000001','Anual',4800,'TRANSFER','SPEI DEMO-001',UTC_DATE(),UTC_DATE(),UTC_DATE() + INTERVAL 364 DAY,'Membresía de prueba',@admin FROM DUAL WHERE @admin IS NOT NULL;
INSERT IGNORE INTO Payments(Id,UserId,Plan,Amount,Method,Reference,PaidAt,PeriodStart,PeriodEnd,Notes,RecordedById)
 SELECT 'd3e00502-0000-4000-8000-000000000502','d3e00002-0000-4000-8000-000000000002','Anual',4800,'TRANSFER','SPEI DEMO-002',UTC_DATE(),UTC_DATE(),UTC_DATE() + INTERVAL 364 DAY,'Membresía de prueba',@admin FROM DUAL WHERE @admin IS NOT NULL;
INSERT IGNORE INTO Payments(Id,UserId,Plan,Amount,Method,Reference,PaidAt,PeriodStart,PeriodEnd,Notes,RecordedById)
 SELECT 'd3e00503-0000-4000-8000-000000000503','d3e00003-0000-4000-8000-000000000003','Anual',4800,'TRANSFER','SPEI DEMO-003',UTC_DATE(),UTC_DATE(),UTC_DATE() + INTERVAL 364 DAY,'Membresía de prueba',@admin FROM DUAL WHERE @admin IS NOT NULL;
INSERT IGNORE INTO Payments(Id,UserId,Plan,Amount,Method,Reference,PaidAt,PeriodStart,PeriodEnd,Notes,RecordedById)
 SELECT 'd3e00504-0000-4000-8000-000000000504','d3e00007-0000-4000-8000-000000000007','Anual',4800,'TRANSFER','SPEI DEMO-004',UTC_DATE(),UTC_DATE(),UTC_DATE() + INTERVAL 364 DAY,'Membresía de prueba',@admin FROM DUAL WHERE @admin IS NOT NULL;

-- Reservas en línea: el departamento y la casa de Irapuato se rentan por noche, semana o mes.
INSERT IGNORE INTO RentalSettings(PropertyId,Enabled,Mode,Modes,NightPrice,WeekPrice,MonthPrice,MinStay,MaxStay,MinWeeks,MaxWeeks,MinMonths,MaxMonths,MaxGuests,Deposit,TaxRate,CancellationPolicy,Rules,Nearby,Seasons,SaleRequests)
 VALUES('d3e00102-0000-4000-8000-000000000102',1,'MONTHLY','NIGHTLY,WEEKLY,MONTHLY',1200,7000,NULL,1,14,1,8,1,12,4,2000,0,'Cancelación sin costo dentro de las 24 horas siguientes a la reserva y antes del día de entrada.','Entrada a partir de las 3:00 pm y salida a más tardar a las 12:00 pm.\nNo se permiten fiestas ni eventos.\nProhibido fumar dentro del inmueble.\nNo se admiten mascotas.\nHorario de silencio de 10:00 pm a 8:00 am.\nLos daños al inmueble o al mobiliario corren por cuenta del huésped.\nEl pago total se liquida a más tardar un día antes de la llegada, por transferencia o en efectivo.','Plaza Mayor · 5 min\nHospital Ángeles · 8 min\nParada de camión · 2 min\nParque Metropolitano · 10 min','[]',1);
INSERT IGNORE INTO RentalSettings(PropertyId,Enabled,Mode,Modes,NightPrice,WeekPrice,MinStay,MaxStay,MinWeeks,MaxWeeks,MinMonths,MaxMonths,MaxGuests,Deposit,TaxRate,Rules,Nearby,Seasons,SaleRequests)
 VALUES('d3e00107-0000-4000-8000-000000000107',1,'MONTHLY','NIGHTLY,WEEKLY,MONTHLY',900,5000,1,30,1,8,1,12,6,3000,0,'Entrada a partir de las 3:00 pm y salida a más tardar a las 12:00 pm.\nNo se admiten mascotas grandes.\nNo se permiten fiestas.\nLos daños al inmueble corren por cuenta del huésped.','Centro de Irapuato · 10 min\nPlaza comercial · 6 min\nEscuelas · 4 min','[]',1);

-- Ubicación en el mapa (las que no muestran la exacta se ven como zona aproximada)
UPDATE Properties SET Latitude=21.1236, Longitude=-101.68, ShowExactLocation=0 WHERE Id='d3e00101-0000-4000-8000-000000000101' AND Latitude IS NULL;
UPDATE Properties SET Latitude=21.1619, Longitude=-101.6921, ShowExactLocation=0 WHERE Id='d3e00102-0000-4000-8000-000000000102' AND Latitude IS NULL;
UPDATE Properties SET Latitude=21.155, Longitude=-101.7015, ShowExactLocation=0 WHERE Id='d3e00103-0000-4000-8000-000000000103' AND Latitude IS NULL;
UPDATE Properties SET Latitude=21.1221, Longitude=-101.6826, ShowExactLocation=1 WHERE Id='d3e00104-0000-4000-8000-000000000104' AND Latitude IS NULL;
UPDATE Properties SET Latitude=21.019, Longitude=-101.2574, ShowExactLocation=1 WHERE Id='d3e00105-0000-4000-8000-000000000105' AND Latitude IS NULL;
UPDATE Properties SET Latitude=21.0175, Longitude=-101.249, ShowExactLocation=0 WHERE Id='d3e00106-0000-4000-8000-000000000106' AND Latitude IS NULL;
UPDATE Properties SET Latitude=20.6767, Longitude=-101.3563, ShowExactLocation=0 WHERE Id='d3e00107-0000-4000-8000-000000000107' AND Latitude IS NULL;
UPDATE Properties SET Latitude=20.948, Longitude=-101.428, ShowExactLocation=0 WHERE Id='d3e00108-0000-4000-8000-000000000108' AND Latitude IS NULL;
UPDATE Properties SET Latitude=20.523, Longitude=-100.815, ShowExactLocation=1 WHERE Id='d3e00109-0000-4000-8000-000000000109' AND Latitude IS NULL;
UPDATE Properties SET Latitude=20.9144, Longitude=-100.7452, ShowExactLocation=0 WHERE Id='d3e00110-0000-4000-8000-000000000110' AND Latitude IS NULL;
