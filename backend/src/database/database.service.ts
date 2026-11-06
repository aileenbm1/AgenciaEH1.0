import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { createPool, Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export type Row = RowDataPacket & Record<string, any>;
/** Conexión o transacción sobre la que se ejecutan consultas. */
export interface Queryable { query(sql: string, params?: any[]): Promise<any> }

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool?: Pool;
  async onModuleInit() {
    try { const c = await this.getPool().getConnection(); c.release(); }
    catch { throw new ServiceUnavailableException('No fue posible conectar con MySQL. Revisa DB_HOST, credenciales y disponibilidad del servidor.'); }
  }
  async onModuleDestroy() { await this.pool?.end(); }
  private getPool(): Pool {
    if (!this.pool) {
      this.pool = createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectionLimit: Number(process.env.DB_POOL_MAX || 10),
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
