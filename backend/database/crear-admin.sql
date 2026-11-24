-- =====================================================================
-- Mi Casa — Crear (o convertir) la cuenta de ADMINISTRADOR
-- =====================================================================
-- 1) Cambia SOLO las 3 líneas de abajo (deja las comillas):
--      @correo  -> el correo con el que vas a entrar
--      @nombre  -> tu nombre como aparecerá en el panel
--      @codigo  -> una palabra o frase temporal que tú inventes
--                  (NO es tu contraseña; solo sirve una vez, durante 24 horas)
-- 2) Importa este archivo (hPanel → Bases de datos → Importar datos)
--    o pégalo en phpMyAdmin → pestaña SQL → Continuar.
-- 3) Abre en el navegador (cambia TU_CODIGO por el código que pusiste):
--      https://agenciaeh.guanax.com/restablecer-contrasena?token=TU_CODIGO
--    y ahí escribe tu contraseña (mínimo 10 caracteres).
-- 4) Inicia sesión con tu correo y esa contraseña: entras como Administrador.
--
-- Si el correo ya tiene cuenta, la convierte en Administrador sin borrar nada.
-- Por seguridad, la contraseña nunca va escrita en este archivo: MySQL no puede
-- cifrarla como lo hace el sitio, así que la eliges en la página del paso 3.
-- =====================================================================

SET @correo = 'TU_CORREO@gmail.com';
SET @nombre = 'Tu Nombre';
SET @codigo = 'escribe-aqui-un-codigo-temporal';

SET NAMES utf8mb4;

INSERT INTO Users (Id, Email, FullName, PasswordHash, Role, IsActive, ApprovalStatus,
                   EmailVerifiedAt, PasswordResetTokenHash, PasswordResetExpiresAt)
VALUES (UUID(), LOWER(TRIM(@correo)), @nombre,
        CONCAT('sin-contrasena-', SHA2(RAND(), 256)), 'ADMIN', 1, 'APPROVED',
        UTC_TIMESTAMP(), SHA2(@codigo, 256), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR))
ON DUPLICATE KEY UPDATE
  Role = 'ADMIN',
  IsActive = 1,
  ApprovalStatus = 'APPROVED',
  EmailVerifiedAt = COALESCE(EmailVerifiedAt, UTC_TIMESTAMP()),
  PasswordResetTokenHash = SHA2(@codigo, 256),
  PasswordResetExpiresAt = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR),
  RefreshTokenHash = NULL,
  UpdatedAt = UTC_TIMESTAMP();

-- Debe aparecer tu correo con Role = ADMIN
SELECT Email, FullName, Role FROM Users WHERE Email = CONVERT(LOWER(TRIM(@correo)) USING utf8mb4) COLLATE utf8mb4_unicode_ci;
