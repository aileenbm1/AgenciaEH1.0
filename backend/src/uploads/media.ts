import { accessSync, constants, mkdirSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join, resolve, sep } from 'path';

/** Prefijo público de los archivos subidos (servidos por la API, vía el proxy del sitio). */
export const MEDIA_PREFIX = '/api/v1/media/';
/** Ruta pública válida de una foto subida. */
export const MEDIA_PATH_RE = /^\/api\/v1\/media\/properties\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

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
