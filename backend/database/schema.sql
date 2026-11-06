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
  CONSTRAINT PK_Users PRIMARY KEY (Id),
  CONSTRAINT UQ_Users_Email UNIQUE (Email),
  CONSTRAINT CK_Users_Role CHECK (Role IN ('BUYER','AGENT','AGENCY','ADMIN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS AgencyProfiles (
  Id CHAR(36) NOT NULL,
  UserId CHAR(36) NOT NULL,
  Name VARCHAR(140) NOT NULL,
  Slug VARCHAR(180) NOT NULL,
  Description VARCHAR(1000) NULL,
  Phone VARCHAR(25) NULL,
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
  CONSTRAINT PK_AgentProfiles PRIMARY KEY (Id),
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
  Currency CHAR(3) NOT NULL DEFAULT 'MXN',
  Municipality VARCHAR(100) NOT NULL,
  Neighborhood VARCHAR(120) NULL,
  PropertyType VARCHAR(80) NOT NULL,
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
  CONSTRAINT CK_Properties_Operation CHECK (Operation IN ('RENT','SALE')),
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
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
