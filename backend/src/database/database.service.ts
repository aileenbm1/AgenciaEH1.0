import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createPool, Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/** Variable de entorno sin espacios sobrantes (frecuentes al copiar y pegar). */
const env = (k: string) => process.env[k]?.trim() || undefined;

export type Row = RowDataPacket & Record<string, any>;
/** Conexión o transacción sobre la que se ejecutan consultas. */
export interface Queryable { query(sql: string, params?: any[]): Promise<any> }

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool?: Pool;
  /** Estado del esquema, visible en /api/v1/health. */
  schema: { ok: boolean; created: string[]; missing: string[]; error?: string } = { ok: false, created: [], missing: [] };
  async onModuleInit() {
    try { const c = await this.getPool().getConnection(); c.release(); }
    catch (err: any) {
      // Cierra el pool fallido: start.js reintenta y no deben acumularse conexiones.
      const pool = this.pool; this.pool = undefined; await pool?.end().catch(() => undefined);
      throw new ServiceUnavailableException(describeDbError(err));
    }
    await this.ensureSchema();
  }

  /** Cambios en tablas existentes (idempotentes). */
  private async migrate() {
    const cols = await this.query<any>("SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('Users','Leads')");
    const has = (t: string, c: string) => cols.some((r) => r.t === t && r.c === c);
    const tables = new Set(cols.map((r) => r.t));
    const changes: [string, string, string][] = [
      ['Users', 'CreatedById', 'ALTER TABLE Users ADD COLUMN CreatedById CHAR(36) NULL, ADD INDEX IX_Users_CreatedBy (CreatedById)'],
      ['Leads', 'UserId', 'ALTER TABLE Leads ADD COLUMN UserId CHAR(36) NULL'],
      ['Leads', 'Kind', "ALTER TABLE Leads ADD COLUMN Kind VARCHAR(10) NOT NULL DEFAULT 'MESSAGE'"],
      ['Leads', 'VisitAt', 'ALTER TABLE Leads ADD COLUMN VisitAt DATETIME NULL'],
      ['Leads', 'Notes', 'ALTER TABLE Leads ADD COLUMN Notes VARCHAR(1000) NULL'],
      ['Leads', 'UpdatedAt', 'ALTER TABLE Leads ADD COLUMN UpdatedAt DATETIME NULL'],
      ['Users', 'ApprovalStatus', "ALTER TABLE Users ADD COLUMN ApprovalStatus VARCHAR(10) NOT NULL DEFAULT 'APPROVED'"],
    ];
    for (const [t, c, sql] of changes) {
      if (tables.has(t) && !has(t, c)) { await this.getPool().query(sql); console.error(`[Agencia EH] Migración: columna ${t}.${c} agregada`); }
    }
    // Rol Desarrollador: actualizar la restricción CHECK de Users.Role si es la anterior.
    try {
      const [ck] = await this.query<any>("SELECT CHECK_CLAUSE AS c FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'CK_Users_Role' LIMIT 1");
      if (ck && !String(ck.c).includes('DEVELOPER')) {
        await this.getPool().query('ALTER TABLE Users DROP CONSTRAINT CK_Users_Role');
        await this.getPool().query("ALTER TABLE Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('BUYER','AGENT','AGENCY','DEVELOPER','ADMIN'))");
        console.error('[Agencia EH] Migración: rol DEVELOPER habilitado');
      }
    } catch (e: any) { console.error('[Agencia EH] No se pudo actualizar CK_Users_Role:', e?.message); }
  }

  private async tableNames(): Promise<string[]> {
    const rows = await this.query<any>('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
    return rows.map((r) => String(r.name));
  }

  /**
   * Crea las tablas que falten ejecutando database/schema.sql (todo es
   * CREATE TABLE IF NOT EXISTS: no modifica tablas existentes ni datos).
   * Así no hace falta importar el esquema a mano en phpMyAdmin.
   */
  private async ensureSchema() {
    const required = ['Users', 'AgencyProfiles', 'AgentProfiles', 'Properties', 'PropertyImages', 'Leads', 'Favorites', 'Payments', 'SavedSearches'];
    try {
      const before = await this.tableNames();
      const missingBefore = required.filter((t) => !before.includes(t));
      if (missingBefore.length) {
        const file = [join(__dirname, '..', '..', 'database', 'schema.sql'), join(process.cwd(), 'database', 'schema.sql')].find((f) => existsSync(f));
        if (!file) throw new Error('No se encontró database/schema.sql');
        const sql = readFileSync(file, 'utf8').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
        for (const statement of sql.split(/;\s*(?:\n|$)/).map((x) => x.trim()).filter(Boolean)) await this.getPool().query(statement);
      }
      await this.migrate();
      const after = await this.tableNames();
      const missing = required.filter((t) => !after.includes(t));
      // Tablas con otro uso de mayúsculas (p. ej. "users"): MySQL en Linux distingue mayúsculas.
      const wrongCase = missing.filter((t) => after.some((a) => a.toLowerCase() === t.toLowerCase()));
      this.schema = {
        ok: missing.length === 0,
        created: missingBefore.filter((t) => after.includes(t)),
        missing,
        ...(wrongCase.length ? { error: `Existen con otras mayúsculas: ${wrongCase.join(', ')}` } : {}),
      };
      if (this.schema.created.length) console.error(`[Agencia EH] Tablas creadas: ${this.schema.created.join(', ')}`);
    } catch (err: any) {
      this.schema = { ok: false, created: [], missing: required, error: `${err?.code ? err.code + ': ' : ''}${err?.sqlMessage || err?.message}` };
      console.error('[Agencia EH] No se pudo verificar/crear el esquema:', this.schema.error);
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
