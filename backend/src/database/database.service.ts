import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { createPool, Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/** Variable de entorno sin espacios sobrantes (frecuentes al copiar y pegar). */
const env = (k: string) => process.env[k]?.trim() || undefined;

export type Row = RowDataPacket & Record<string, any>;
/** Conexión o transacción sobre la que se ejecutan consultas. */
export interface Queryable { query(sql: string, params?: any[]): Promise<any> }

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool?: Pool;
  async onModuleInit() {
    try { const c = await this.getPool().getConnection(); c.release(); }
    catch (err: any) {
      // Cierra el pool fallido: start.js reintenta y no deben acumularse conexiones.
      const pool = this.pool; this.pool = undefined; await pool?.end().catch(() => undefined);
      throw new ServiceUnavailableException(describeDbError(err));
    }
  }
  async onModuleDestroy() { await this.pool?.end(); }
  private getPool(): Pool {
    if (!this.pool) {
      this.pool = createPool({
        host: env('DB_HOST') || 'localhost',
        port: Number(env('DB_PORT') || 3306),
        database: env('DB_NAME'),
        user: env('DB_USER'),
        password: env('DB_PASSWORD'),
        connectionLimit: Number(env('DB_POOL_MAX') || 5),   // hosting compartido: pocas conexiones
        maxIdle: 2,
        idleTimeout: 60000,     // cierra conexiones inactivas tras 1 min
        charset: 'utf8mb4',
        timezone: 'Z',          // fechas en UTC
        decimalNumbers: true,   // DECIMAL como number, no string
        connectTimeout: 15000,
      });
      // Todas las fechas (NOW(), CURRENT_TIMESTAMP) se guardan en UTC.
      (this.pool as any).pool.on('connection', (conn: any) => conn.query("SET time_zone = '+00:00'"));
    }
    return this.pool;
  }
  /** SELECT: devuelve las filas. */
  async query<T = Row>(text: string, params: any[] = [], conn?: Queryable): Promise<T[]> {
    const [rows] = await (conn ?? this.getPool()).query(text, params);
    return rows as T[];
  }
  /** INSERT/UPDATE/DELETE: devuelve el resultado (affectedRows, etc.). */
  async execute(text: string, params: any[] = [], conn?: Queryable): Promise<ResultSetHeader> {
    const [result] = await (conn ?? this.getPool()).query(text, params);
    return result as ResultSetHeader;
  }
  async transaction<T>(work: (tx: PoolConnection) => Promise<T>): Promise<T> {
    const conn = await this.getPool().getConnection();
    await conn.beginTransaction();
    try { const result = await work(conn); await conn.commit(); return result; }
    catch (error) { await conn.rollback(); throw error; }
    finally { conn.release(); }
  }
}

/** Mensaje de diagnóstico de conexión sin exponer la contraseña. */
function describeDbError(err: any): string {
  const code = err?.code ? ` (${err.code})` : '';
  const parts: string[] = [`No fue posible conectar con MySQL${code}.`];
  const keys = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) parts.push(`Faltan las variables: ${missing.join(', ')}.`);
  const spaced = keys.filter((k) => process.env[k] && process.env[k] !== process.env[k]!.trim());
  if (spaced.length) parts.push(`Aviso: ${spaced.join(', ')} tenían espacios al inicio o al final (ya se ignoran).`);
  // Mensaje de MySQL (incluye usuario@host y si se envió contraseña), con el usuario parcialmente oculto.
  const sqlMessage: string | undefined = err?.sqlMessage;
  if (sqlMessage) parts.push(`MySQL: ${sqlMessage.replace(/'([^'@]+)'@/, (_m: string, u: string) => `'${u.length > 6 ? u.slice(0, 4) + '…' + u.slice(-3) : u}'@`)}`);
  parts.push(`Configuración usada: DB_HOST=${process.env.DB_HOST || 'localhost'}, DB_PORT=${process.env.DB_PORT || 3306}, DB_NAME=${process.env.DB_NAME || '(vacío)'}, DB_PASSWORD=${process.env.DB_PASSWORD ? `${process.env.DB_PASSWORD.length} caracteres` : '(vacía)'}.`);
  if (!missing.length && !spaced.length) parts.push('Revisa que DB_USER y DB_NAME incluyan el prefijo (u123456789_), que la contraseña sea la del usuario y que el usuario esté asignado a la base.');
  return parts.join(' ');
}
