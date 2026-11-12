-- ============================================================================
-- Agencia EH · BORRAR TODOS LOS USUARIOS EXCEPTO LOS ADMINISTRADORES
--
-- Deja la base "limpia" para empezar pruebas: borra a todos los usuarios que
-- NO son administradores (compradores, agentes, agencias y desarrolladoras) y
-- todo lo que les pertenece: sus propiedades (con fotos, fanpages, reservas,
-- calendario y estadísticas), prospectos, favoritos, búsquedas guardadas,
-- membresías, mensajes y documentos de reservas.
--
-- NO se borran: las cuentas de administrador, las propiedades que estén a nombre
-- de un administrador, los campos personalizados, las plantillas de fanpage ni
-- los ajustes del sitio.
--
-- ⚠ No se puede deshacer. Haz un respaldo antes (phpMyAdmin → Exportar).
-- Cómo usarlo: phpMyAdmin → selecciona tu base → pestaña "SQL" → pega todo → Continuar.
-- Si no existe ningún administrador, el script no borra nada.
-- ============================================================================
SET NAMES utf8mb4;
SET @admins := (SELECT COUNT(*) FROM Users WHERE Role = 'ADMIN');

-- 1) Reservas donde participa alguien que se borra (sus mensajes, documentos y pagos se borran en cascada)
DELETE FROM Reservations WHERE @admins > 0 AND (
  GuestId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x)
  OR OwnerId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') y));
DELETE FROM ReservationMessages WHERE @admins > 0 AND UserId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x);
DELETE FROM ReservationDocuments WHERE @admins > 0 AND UserId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x);

-- 2) Prospectos, membresías, favoritos y búsquedas
DELETE FROM Leads WHERE @admins > 0 AND (
  AssignedToId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x)
  OR UserId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') y));
DELETE FROM Payments WHERE @admins > 0 AND UserId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x);
DELETE FROM Favorites WHERE @admins > 0 AND UserId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x);
DELETE FROM SavedSearches WHERE @admins > 0 AND UserId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x);

-- 3) Propiedades de esos usuarios (fotos, fanpage, reservas, calendario y estadísticas se borran en cascada)
DELETE FROM Properties WHERE @admins > 0 AND OwnerId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x);

-- 4) Perfiles de agentes y agencias (primero los agentes, porque apuntan a su agencia)
DELETE FROM AgentProfiles WHERE @admins > 0 AND UserId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x);
DELETE FROM AgencyProfiles WHERE @admins > 0 AND UserId IN (SELECT Id FROM (SELECT Id FROM Users WHERE Role <> 'ADMIN') x);

-- 5) Los usuarios
UPDATE Users SET CreatedById = NULL WHERE @admins > 0 AND Role = 'ADMIN';
DELETE FROM Users WHERE @admins > 0 AND Role <> 'ADMIN';

-- Resultado: debe quedar solo el (o los) administrador(es).
SELECT Email, FullName, Role FROM Users;
