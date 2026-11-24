import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { BRAND_THEME, cleanSiteConfig, SiteConfig } from './site-config';

const MAX_BYTES = 900_000;
const KEEP_VERSIONS = 30;
type Meta = { updatedAt?: string; publishedAt?: string; publishedBy?: string };
const VALUES_BLOCK = { id: 'valores', type: 'values', bg: 'soft', layout: 'cards', eyebrow: '¿POR QUÉ MI CASA?', title: 'Te acompañamos hasta tu hogar ideal',
  copy: 'MI CASA es una agencia inmobiliaria que conecta personas con el hogar ideal, brindando confianza, cercanía y acompañamiento profesional.',
  items: [
    { icon: 'escudo', title: 'Confianza', text: 'Cada propiedad se revisa antes de publicarse.' },
    { icon: 'personas', title: 'Cercanía', text: 'Un asesor te acompaña en cada paso.' },
    { icon: 'estrella', title: 'Profesionalismo', text: 'Procesos claros, contratos y pagos en orden.' },
    { icon: 'casa', title: 'Hogares reales', text: 'Fotos y datos reales de cada inmueble.' },
  ] };
const parse = <T>(s: string | null | undefined, d: T): T => { try { return s ? JSON.parse(s) : d; } catch { return d; } };

/** Diseño de todo el sitio: borrador (lo que edita el admin) y versión publicada (lo que ve el público). */
@Injectable()
export class SiteService implements OnModuleInit {
  private cache: { at: number; value: { config: SiteConfig | null; updatedAt: string | null } } | null = null;
  constructor(private readonly db: DatabaseService) {}

  /**
   * Branding de Mi Casa (una sola vez): el diseño guardado toma la paleta de la marca y el
   * Inicio gana la sección de valores. Después el administrador puede cambiar todo en el editor.
   */
  onModuleInit() {
    setTimeout(async () => {
      try {
        if ((await this.get<string | null>('brand.micasa3', null)) !== null) return;
        for (const k of ['site.draft', 'site.published']) {
          const c = await this.get<any>(k, null);
          if (!c) continue;
          c.theme = { ...(c.theme || {}), ...BRAND_THEME, font: 'original', pattern: true };
          if (c.brand) { c.brand.mark = ''; if (!c.brand.tagline || c.brand.tagline === 'BIENES RAÍCES · BAJÍO') c.brand.tagline = 'AGENCIA INMOBILIARIA'; }
          const home = c.pages?.home;
          if (Array.isArray(home) && !home.some((b: any) => b?.type === 'values')) {
            const at = home.findIndex((b: any) => b?.type === 'paths');
            home.splice(at >= 0 ? at + 1 : Math.min(1, home.length), 0, VALUES_BLOCK);
          }
          await this.set(k, cleanSiteConfig(c));
        }
        await this.set('brand.micasa3', '1');
        this.cache = null;
      } catch (e: any) { console.error('[Mi Casa] No se pudo aplicar el branding al diseño guardado:', e?.message); }
    }, 5000).unref?.();
  }

  private async get<T>(k: string, d: T): Promise<T> {
    const [r] = await this.db.query<any>('SELECT V FROM SiteSettings WHERE K=?', [k]);
    return parse<T>(r?.V, d);
  }
  private async set(k: string, v: unknown) {
    if (v === null) { await this.db.execute('DELETE FROM SiteSettings WHERE K=?', [k]); return; }
    const json = JSON.stringify(v);
    if (Buffer.byteLength(json) > MAX_BYTES) throw new BadRequestException('El diseño es demasiado grande. Quita algunos bloques o textos largos.');
    await this.db.execute('INSERT INTO SiteSettings(K,V) VALUES(?,?) ON DUPLICATE KEY UPDATE V=VALUES(V)', [k, json]);
  }

  /** Público: diseño publicado (null = diseño original). Se guarda en memoria unos segundos. */
  async publicConfig() {
    if (this.cache && Date.now() - this.cache.at < 10_000) return this.cache.value;
    const [config, meta] = await Promise.all([this.get<SiteConfig | null>('site.published', null), this.get<Meta>('site.meta', {})]);
    const value = { config, updatedAt: meta.publishedAt || null };
    this.cache = { at: Date.now(), value };
    return value;
  }

  async editor() {
    const [draft, published, meta] = await Promise.all([this.get<SiteConfig | null>('site.draft', null), this.get<SiteConfig | null>('site.published', null), this.get<Meta>('site.meta', {})]);
    return { draft: draft ?? published, published, hasPublished: !!published, publishedAt: meta.publishedAt || null, updatedAt: meta.updatedAt || null,
      unpublishedChanges: !!draft && JSON.stringify(draft) !== JSON.stringify(published) };
  }

  async saveDraft(body: any) {
    const config = cleanSiteConfig(body?.config);
    await this.set('site.draft', config);
    await this.set('site.meta', { ...(await this.get<Meta>('site.meta', {})), updatedAt: new Date().toISOString() });
    return this.editor();
  }

  private async snapshot(config: SiteConfig | null, note: string, userId: string) {
    if (!config) return;
    await this.db.execute('INSERT INTO SiteVersions(Id,Config,Note,CreatedById) VALUES(?,?,?,?)', [randomUUID(), JSON.stringify(config), note.slice(0, 120), userId]);
    const old = await this.db.query<any>(`SELECT Id FROM SiteVersions ORDER BY CreatedAt DESC, Id LIMIT 1000 OFFSET ${KEEP_VERSIONS}`);
    for (const o of old) await this.db.execute('DELETE FROM SiteVersions WHERE Id=?', [o.Id]);
  }

  async publish(userId: string, body: any) {
    const config = body?.config ? cleanSiteConfig(body.config) : await this.get<SiteConfig | null>('site.draft', null);
    if (!config) throw new BadRequestException('No hay cambios que publicar.');
    await this.set('site.draft', config);
    await this.set('site.published', config);
    const now = new Date().toISOString();
    await this.set('site.meta', { updatedAt: now, publishedAt: now, publishedBy: userId });
    await this.snapshot(config, 'Publicado', userId);
    this.cache = null;
    return this.editor();
  }

  async discard() { await this.set('site.draft', null); return this.editor(); }

  /** Vuelve al diseño original del sitio (guarda antes una copia del publicado). */
  async resetToOriginal(userId: string) {
    const published = await this.get<SiteConfig | null>('site.published', null);
    await this.snapshot(published, 'Antes de volver al diseño original', userId);
    await this.set('site.published', null);
    await this.set('site.draft', null);
    await this.set('site.meta', { updatedAt: new Date().toISOString() });
    this.cache = null;
    return this.editor();
  }

  async versions() {
    const rows = await this.db.query<any>(`SELECT v.Id, v.Note, v.CreatedAt, u.FullName FROM SiteVersions v LEFT JOIN Users u ON u.Id=v.CreatedById ORDER BY v.CreatedAt DESC LIMIT ${KEEP_VERSIONS}`);
    return rows.map((r) => ({ id: r.Id, note: r.Note, createdAt: r.CreatedAt, by: r.FullName || null }));
  }

  async restore(id: string) {
    const [v] = await this.db.query<any>('SELECT Config FROM SiteVersions WHERE Id=?', [id]);
    if (!v) throw new NotFoundException('Versión no encontrada.');
    await this.set('site.draft', cleanSiteConfig(parse(v.Config, {})));
    return this.editor();
  }
}
