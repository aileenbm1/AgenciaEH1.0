-- =====================================================================
-- Mi Casa — Enlace para cambiar la contraseña de una cuenta
-- =====================================================================
-- 1) Cambia SOLO las 2 líneas de abajo (deja las comillas):
--      @correo  -> el correo de la cuenta
--      @codigo  -> una palabra temporal que tú inventes, SIN espacios
--                  (NO es la contraseña; sirve una sola vez, durante 24 horas)
-- 2) Pégalo en phpMyAdmin → pestaña SQL → Continuar
--    (o impórtalo en hPanel → Bases de datos → Importar datos).
-- 3) Abre en el navegador (cambia TU_CODIGO por el código que pusiste):
--      https://agenciaeh.guanax.com/restablecer-contrasena?token=TU_CODIGO
--    y escribe tu contraseña nueva (mínimo 10 caracteres).
--
-- No cambia el rol ni borra nada; solo deja listo el enlace.
-- =====================================================================

SET @correo = 'TU_CORREO@gmail.com';
SET @codigo = 'escribe-aqui-un-codigo-temporal';

UPDATE Users
SET PasswordResetTokenHash = SHA2(@codigo, 256),
    PasswordResetExpiresAt = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR),
    IsActive = 1,
    UpdatedAt = UTC_TIMESTAMP()
WHERE Email = CONVERT(LOWER(TRIM(@correo)) USING utf8mb4) COLLATE utf8mb4_unicode_ci;

-- Debe aparecer tu cuenta. Si sale vacío, el correo no coincide con ninguna cuenta.
SELECT Email, FullName, Role, PasswordResetExpiresAt AS EnlaceVenceUTC FROM Users WHERE Email = CONVERT(LOWER(TRIM(@correo)) USING utf8mb4) COLLATE utf8mb4_unicode_ci;
