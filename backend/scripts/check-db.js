require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    const [[r]] = await conn.query('SELECT DATABASE() AS databaseName, VERSION() AS version');
    console.log('Conexión correcta:', r.databaseName);
    console.log('Versión:', r.version);
    const [tables] = await conn.query('SHOW TABLES');
    console.log('Tablas:', tables.length ? tables.map((t) => Object.values(t)[0]).join(', ') : '(ninguna, ejecuta database/schema.sql)');
  } catch (e) {
    console.error('No fue posible conectar a MySQL:', e.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
