// Crea (o promueve) un usuario administrador.
// Uso: npm run admin:create -- correo@dominio.com "Nombre completo" "contraseña-de-al-menos-10"
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

(async () => {
  const [emailArg, fullName, password] = process.argv.slice(2);
  if (!emailArg || !fullName || !password || password.length < 10) {
    console.error('Uso: npm run admin:create -- correo@dominio.com "Nombre completo" "contraseña (mín. 10 caracteres)"');
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      timezone: 'Z',
    });
    const hash = await bcrypt.hash(password, 12);
    const [rows] = await conn.query('SELECT Id FROM Users WHERE Email=? LIMIT 1', [email]);
    if (rows.length) {
      await conn.query("UPDATE Users SET Role='ADMIN', FullName=?, PasswordHash=?, IsActive=1, RefreshTokenHash=NULL, UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [fullName.trim(), hash, rows[0].Id]);
      console.log(`Usuario existente promovido a ADMIN: ${email}`);
    } else {
      await conn.query("INSERT INTO Users(Id,Email,FullName,PasswordHash,Role,EmailVerifiedAt) VALUES(?,?,?,?, 'ADMIN', UTC_TIMESTAMP())", [randomUUID(), email, fullName.trim(), hash]);
      console.log(`Administrador creado: ${email}`);
    }
  } catch (e) {
    console.error('No fue posible crear el administrador:', e.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
