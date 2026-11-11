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
  V TEXT NULL,
  CONSTRAINT PK_SiteSettings PRIMARY KEY (K)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
