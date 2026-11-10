import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

const env = (k: string) => process.env[k]?.trim() || undefined;
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/**
 * Envío de correos por SMTP (en Hostinger: smtp.hostinger.com, puerto 465, con
 * una cuenta de correo creada en hPanel → Correos).
 * Variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM (opcional).
 * Sin SMTP configurado, fuera de producción el enlace se escribe en la consola.
 */
@Injectable()
export class MailService {
  private transporter?: Transporter;
  /** Estado visible en /api/v1/health (sin credenciales). */
  status: { configured: boolean; lastOk?: string; lastError?: string } = { configured: false };

  constructor() {
    const host = env('SMTP_HOST'), user = env('SMTP_USER'), pass = process.env.SMTP_PASSWORD;
    if (host && user && pass) {
      const port = Number(env('SMTP_PORT') || 465);
      this.transporter = createTransport({
        host, port, secure: port === 465, auth: { user, pass },
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
      });
      this.status.configured = true;
    }
  }

  private siteUrl() { return (env('WEB_ORIGIN') || 'http://localhost:3000').split(',')[0].trim().replace(/\/+$/, ''); }
  private from() { return env('MAIL_FROM') || `Agencia EH <${env('SMTP_USER')}>`; }

  /** Envía en segundo plano: la respuesta HTTP no espera ni revela si el correo existe. */
  private send(to: string, subject: string, title: string, intro: string, button: string, path: string, footnote: string) {
    const link = `${this.siteUrl()}${path}`;
    if (!this.transporter) {
      if (env('NODE_ENV') !== 'production') console.info(`[Agencia EH · ${subject}] ${link}`);
      else console.error(`[Agencia EH] No se envió "${subject}": falta configurar SMTP_HOST, SMTP_USER y SMTP_PASSWORD.`);
      return;
    }
    const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;color:#1b2533">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e8e3d9">
<tr><td style="background:#16213a;padding:22px 28px;color:#f7f5f0;font:600 20px Georgia,serif;letter-spacing:.04em">AGENCIA EH</td></tr>
<tr><td style="padding:30px 28px">
<h1 style="margin:0 0 14px;font:600 24px Georgia,serif;color:#16213a">${escapeHtml(title)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a5260">${escapeHtml(intro)}</p>
<a href="${link}" style="display:inline-block;background:#16213a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 26px;border-radius:6px">${escapeHtml(button)}</a>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#737373">${escapeHtml(footnote)}</p>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9a9a9a;word-break:break-all">Si el botón no funciona, copia este enlace en tu navegador:<br>${link}</p>
</td></tr></table></td></tr></table></body></html>`;
    const text = `${title}\n\n${intro}\n\n${button}: ${link}\n\n${footnote}`;
    this.transporter.sendMail({ from: this.from(), to, subject, html, text })
      .then(() => { this.status.lastOk = new Date().toISOString(); this.status.lastError = undefined; })
      .catch((err: any) => {
        this.status.lastError = `${new Date().toISOString()} ${err?.code || ''} ${err?.response || err?.message || err}`.trim();
        console.error(`[Agencia EH] Error al enviar "${subject}":`, this.status.lastError);
      });
  }

  resetLink(token: string) { return `${this.siteUrl()}/restablecer-contrasena?token=${token}`; }

  sendPasswordReset(to: string, token: string, validFor = '1 hora', byAdmin = false) {
    this.send(to, 'Restablece tu contraseña · Agencia EH', 'Restablece tu contraseña',
      byAdmin
        ? `El equipo de Agencia EH te envió este enlace para que elijas una nueva contraseña. El enlace vence en ${validFor}.`
        : `Recibimos una solicitud para cambiar la contraseña de tu cuenta. Usa el botón para elegir una nueva. El enlace vence en ${validFor}.`,
      'Elegir nueva contraseña', `/restablecer-contrasena?token=${token}`,
      'Si no lo esperabas, ignora este correo: tu contraseña no cambiará.');
  }

  /** Enlace público de activación (se muestra también a quien creó la cuenta). */
  activationLink(token: string) { return `${this.siteUrl()}/restablecer-contrasena?token=${token}&bienvenida=1`; }

  sendInvite(to: string, token: string, name: string, invitedBy: string) {
    this.send(to, 'Activa tu cuenta · Agencia EH', `Hola, ${name}`,
      `${invitedBy} creó tu cuenta en Agencia EH. Elige tu contraseña con el botón para activarla. El enlace vence en 7 días.`,
      'Activar mi cuenta', `/restablecer-contrasena?token=${token}&bienvenida=1`,
      'Si no esperabas este correo, puedes ignorarlo.');
  }

  /** Aviso al anunciante: llegó un mensaje o una solicitud de visita. */
  sendLeadNotice(to: string, kind: 'MESSAGE' | 'VISIT', property: string, from: string, when?: string) {
    this.send(to, kind === 'VISIT' ? `Solicitud de visita · ${property}` : `Nuevo prospecto · ${property}`,
      kind === 'VISIT' ? 'Te pidieron una visita' : 'Tienes un nuevo prospecto',
      kind === 'VISIT' ? `${from} quiere visitar "${property}"${when ? ` el ${when}` : ''}. Confírmale desde tu panel.` : `${from} te escribió por "${property}". Responde pronto desde tu panel.`,
      'Ver en mi panel', '/panel/prospectos', 'Recibes este aviso porque publicaste esta propiedad en Agencia EH.');
  }

  /** Aviso de búsqueda guardada: se publicó una propiedad que coincide. */
  sendSearchAlert(to: string, searchName: string, title: string, slug: string) {
    this.send(to, `Nueva propiedad para "${searchName}" · Agencia EH`, 'Hay una propiedad nueva para ti',
      `Se publicó "${title}", que coincide con tu búsqueda guardada "${searchName}".`,
      'Ver propiedad', `/propiedades/${slug}`, 'Puedes desactivar estos avisos en tu panel, en "Búsquedas guardadas".');
  }

  sendApprovalNeeded(to: string, name: string, role: string) {
    const label = ({ AGENT: 'agente', AGENCY: 'agencia', DEVELOPER: 'desarrolladora' } as any)[role] || role;
    this.send(to, `Cuenta por aprobar · ${name}`, 'Hay una cuenta por aprobar', `${name} se registró como ${label}. Revísala y apruébala o recházala desde tu panel.`,
      'Revisar cuentas', '/panel/admin#usuarios', 'Recibes este aviso porque eres administrador de Agencia EH.');
  }

  sendApprovalResult(to: string, approved: boolean) {
    this.send(to, approved ? 'Tu cuenta fue aprobada · Agencia EH' : 'Tu solicitud de cuenta · Agencia EH', approved ? '¡Tu cuenta fue aprobada!' : 'Tu solicitud no fue aprobada',
      approved ? 'Ya puedes publicar propiedades y usar todas las herramientas de tu panel.' : 'Revisamos tu solicitud y por ahora no fue aprobada. Si crees que es un error, contáctanos.',
      approved ? 'Ir a mi panel' : 'Ir a Agencia EH', approved ? '/acceso' : '/', 'Gracias por tu interés en Agencia EH.');
  }

  sendEmailVerification(to: string, token: string) {
    this.send(to, 'Confirma tu correo · Agencia EH', 'Confirma tu correo',
      'Gracias por registrarte en Agencia EH. Confirma que este correo es tuyo para terminar de activar tu cuenta. El enlace vence en 24 horas.',
      'Confirmar correo', `/verificar-correo?token=${token}`,
      'Si no creaste una cuenta en Agencia EH, ignora este correo.');
  }
}
