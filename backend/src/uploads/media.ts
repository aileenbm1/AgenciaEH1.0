import { accessSync, constants, mkdirSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join, resolve, sep } from 'path';

/** Prefijo público de los archivos subidos (servidos por la API, vía el proxy del sitio). */
export const MEDIA_PREFIX = '/api/v1/media/';
/** Ruta pública válida de una foto subida. */
export const MEDIA_PATH_RE = /^\/api\/v1\/media\/properties\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
/** Fotos de ejemplo incluidas en el sitio (datos de prueba). */
export const DEMO_PATH_RE = /^\/demo\/[a-z0-9-]{1,60}\.jpg$/;

let cachedRoot: string | undefined;

/**
 * Carpeta donde se guardan las fotos. Por defecto ~/agencia-eh-uploads: fuera de
 * la carpeta de la aplicación, para que subir un ZIP nuevo no las borre.
 * Se puede cambiar con UPLOADS_DIR.
 */
export function mediaRoot(): string {
  if (cachedRoot) return cachedRoot;
  const candidates = [process.env.UPLOADS_DIR?.trim(), join(homedir(), 'agencia-eh-uploads'), join(process.cwd(), 'uploads')].filter(Boolean) as string[];
  for (const dir of candidates) {
    try {
      mkdirSync(dir, { recursive: true });
      accessSync(dir, constants.W_OK);
      cachedRoot = resolve(dir);
      return cachedRoot;
    } catch { /* se prueba la siguiente */ }
  }
  throw new Error('No hay una carpeta con permiso de escritura para guardar fotos (configura UPLOADS_DIR).');
}

/** Borra del disco las fotos subidas indicadas (ignora enlaces externos). */
export function removeMedia(urls: string[]) {
  for (const url of urls) {
    if (!MEDIA_PATH_RE.test(url)) continue;
    const root = mediaRoot();
    const file = resolve(root, url.slice(MEDIA_PREFIX.length));
    if (!file.startsWith(root + sep)) continue;
    try { unlinkSync(file); } catch { /* ya no existe */ }
  }
}

let cachedPrivate: string | undefined;
/**
 * Carpeta PRIVADA para documentos de reservas (INE, comprobantes). No se sirve
 * públicamente: solo se descarga con sesión y permiso. Por defecto
 * ~/agencia-eh-privado (configurable con UPLOADS_PRIVATE_DIR).
 */
export function privateRoot(): string {
  if (cachedPrivate) return cachedPrivate;
  const candidates = [process.env.UPLOADS_PRIVATE_DIR?.trim(), join(homedir(), 'agencia-eh-privado'), join(process.cwd(), 'privado')].filter(Boolean) as string[];
  for (const dir of candidates) {
    try { mkdirSync(dir, { recursive: true, mode: 0o700 }); accessSync(dir, constants.W_OK); cachedPrivate = resolve(dir); return cachedPrivate; } catch { /* siguiente */ }
  }
  throw new Error('No hay una carpeta con permiso de escritura para documentos privados (configura UPLOADS_PRIVATE_DIR).');
}
