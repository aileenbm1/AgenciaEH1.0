import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService, Queryable } from '../database/database.service';

export type CustomField = { id: string; key: string; label: string; type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT'; options: string[]; required: boolean; filterable: boolean; position: number; active: boolean };
export type CustomFieldInput = { label?: string; key?: string; type?: string; options?: string[]; required?: boolean; filterable?: boolean; position?: number; active?: boolean };

const slugKey = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '').slice(0, 40);

/** RF-03: campos personalizados definidos por el administrador. */
@Injectable()
export class CustomFieldsService {
  private cache?: { at: number; list: CustomField[] };
  constructor(private readonly db: DatabaseService) {}

  private row(r: any): CustomField {
    let options: string[] = [];
    try { options = r.Options ? JSON.parse(r.Options) : []; } catch { options = []; }
    return { id: r.Id, key: r.FieldKey, label: r.Label, type: r.Type, options, required: !!r.Required, filterable: !!r.Filterable, position: r.Position, active: !!r.Active };
  }

  async list(all = false): Promise<CustomField[]> {
    if (!all && this.cache && Date.now() - this.cache.at < 30000) return this.cache.list;
    const rows = await this.db.query<any>(`SELECT * FROM CustomFields ${all ? '' : 'WHERE Active=1'} ORDER BY Position, Label`);
    const list = rows.map((r) => this.row(r));
    if (!all) this.cache = { at: Date.now(), list };
    return list;
  }

  private validate(d: CustomFieldInput, partial: boolean) {
    if (!partial || d.label !== undefined) if (!d.label?.trim() || d.label.trim().length > 80) throw new BadRequestException('El nombre del campo es obligatorio (máx. 80 caracteres).');
    if (!partial || d.type !== undefined) if (!['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT'].includes(String(d.type))) throw new BadRequestException('Tipo de campo no válido.');
    if (d.type === 'SELECT' && (!Array.isArray(d.options) || d.options.filter((o) => String(o).trim()).length < 2)) throw new BadRequestException('Una lista necesita al menos 2 opciones.');
    if (d.options && JSON.stringify(d.options).length > 1000) throw new BadRequestException('Demasiadas opciones.');
  }

  async create(d: CustomFieldInput) {
    this.validate(d, false);
    const key = slugKey(d.key || d.label!);
    if (!key) throw new BadRequestException('Clave de campo no válida.');
    const id = randomUUID();
    try {
      await this.db.execute('INSERT INTO CustomFields(Id,FieldKey,Label,Type,Options,Required,Filterable,Position,Active) VALUES(?,?,?,?,?,?,?,?,1)',
        [id, key, d.label!.trim(), d.type, d.type === 'SELECT' ? JSON.stringify(d.options!.map((o) => String(o).trim()).filter(Boolean)) : null, d.required ? 1 : 0, d.filterable ? 1 : 0, Number(d.position) || 0]);
    } catch (e: any) { if (e?.errno === 1062) throw new ConflictException('Ya existe un campo con esa clave.'); throw e; }
    this.cache = undefined;
    return (await this.list(true)).find((f) => f.id === id);
  }

  async update(id: string, d: CustomFieldInput) {
    const [cur] = await this.db.query<any>('SELECT * FROM CustomFields WHERE Id=?', [id]);
    if (!cur) throw new NotFoundException('Campo no encontrado.');
    const merged = { ...this.row(cur), ...d } as any;
    this.validate(merged, false);
    await this.db.execute('UPDATE CustomFields SET Label=?,Type=?,Options=?,Required=?,Filterable=?,Position=?,Active=? WHERE Id=?',
      [merged.label.trim(), merged.type, merged.type === 'SELECT' ? JSON.stringify(merged.options.map((o: any) => String(o).trim()).filter(Boolean)) : null, merged.required ? 1 : 0, merged.filterable ? 1 : 0, Number(merged.position) || 0, merged.active ? 1 : 0, id]);
    this.cache = undefined;
    return (await this.list(true)).find((f) => f.id === id);
  }

  async remove(id: string) {
    const r = await this.db.execute('DELETE FROM CustomFields WHERE Id=?', [id]);
    if (!r.affectedRows) throw new NotFoundException('Campo no encontrado.');
    this.cache = undefined;
    return { deleted: true };
  }

  /** Normaliza y valida los valores enviados para una propiedad. */
  async clean(input: Record<string, any> | undefined) {
    const fields = await this.list();
    const out: { field: CustomField; value: string | null }[] = [];
    if (!input) return out;
    for (const f of fields) {
      if (!(f.key in input)) continue;
      const raw = input[f.key];
      if (raw === null || raw === undefined || String(raw).trim() === '') { out.push({ field: f, value: null }); continue; }
      let v = String(raw).trim().slice(0, 500);
      if (f.type === 'NUMBER') { const n = Number(v); if (!Number.isFinite(n)) throw new BadRequestException(`"${f.label}" debe ser un número.`); v = String(n); }
      if (f.type === 'BOOLEAN') v = ['1', 'true', 'si', 'sí', 'yes'].includes(v.toLowerCase()) ? '1' : '0';
      if (f.type === 'SELECT' && !f.options.includes(v)) throw new BadRequestException(`"${f.label}" debe ser una de: ${f.options.join(', ')}.`);
      out.push({ field: f, value: v });
    }
    return out;
  }

  async save(tx: Queryable, propertyId: string, values: { field: CustomField; value: string | null }[]) {
    for (const { field, value } of values) {
      if (value === null) await this.db.execute('DELETE FROM PropertyCustomValues WHERE PropertyId=? AND FieldId=?', [propertyId, field.id], tx);
      else await this.db.execute('INSERT INTO PropertyCustomValues(PropertyId,FieldId,Value) VALUES(?,?,?) ON DUPLICATE KEY UPDATE Value=VALUES(Value)', [propertyId, field.id, value], tx);
    }
  }

  /** Valores de varias propiedades: { propertyId: { clave: valor } }. */
  async valuesFor(ids: string[]) {
    const out: Record<string, Record<string, string>> = {};
    if (!ids.length) return out;
    const rows = await this.db.query<any>(`SELECT v.PropertyId, f.FieldKey, v.Value FROM PropertyCustomValues v JOIN CustomFields f ON f.Id=v.FieldId AND f.Active=1 WHERE v.PropertyId IN (${ids.map(() => '?').join(',')})`, ids);
    for (const r of rows) (out[r.PropertyId] ||= {})[r.FieldKey] = r.Value;
    return out;
  }

  /** Campos obligatorios sin valor (para enviar a revisión). */
  async missingRequired(propertyId: string) {
    const fields = (await this.list()).filter((f) => f.required);
    if (!fields.length) return [];
    const vals = (await this.valuesFor([propertyId]))[propertyId] || {};
    return fields.filter((f) => !vals[f.key]).map((f) => f.label);
  }

  /** Filtros de búsqueda por campos filtrables: cf_<clave>=valor. */
  async filters(q: Record<string, any>, where: string[], params: any[]) {
    for (const f of (await this.list()).filter((x) => x.filterable)) {
      const v = q[`cf_${f.key}`];
      if (v === undefined || String(v).trim() === '') continue;
      const val = String(v).trim().slice(0, 100);
      if (f.type === 'NUMBER') { const n = Number(val); if (!Number.isFinite(n)) continue; where.push('EXISTS (SELECT 1 FROM PropertyCustomValues cv WHERE cv.PropertyId=p.Id AND cv.FieldId=? AND CAST(cv.Value AS DECIMAL(14,2)) >= ?)'); params.push(f.id, n); }
      else if (f.type === 'TEXT') { where.push("EXISTS (SELECT 1 FROM PropertyCustomValues cv WHERE cv.PropertyId=p.Id AND cv.FieldId=? AND cv.Value LIKE CONCAT('%',?,'%'))"); params.push(f.id, val); }
      else { where.push('EXISTS (SELECT 1 FROM PropertyCustomValues cv WHERE cv.PropertyId=p.Id AND cv.FieldId=? AND cv.Value=?)'); params.push(f.id, f.type === 'BOOLEAN' ? (['1', 'true', 'si', 'sí'].includes(val.toLowerCase()) ? '1' : '0') : val); }
    }
  }
}
