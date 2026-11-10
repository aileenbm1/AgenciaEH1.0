"use client";
import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { SessionUser } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

export type PanelAction = { title: string; text: string; href: string; primary?: boolean };

/**
 * Estructura común de todos los paneles:
 * 1) Quién eres y qué es este panel  2) Acciones reales  3) Contenido propio  4) Lo que viene.
 */
export function PanelShell({ user, intro, actions, children }: { user: SessionUser; intro: string; actions: PanelAction[]; children?: ReactNode }) {
  const role = ROLES[user.role];
  const [welcome, setWelcome] = useState(false);
  useEffect(() => { setWelcome(new URLSearchParams(window.location.search).has('bienvenida')); }, []);

  return <main className="page-wrap">
    {user.approvalStatus === 'PENDING' && <div className="notice" role="status"><b>Tu cuenta está en revisión.</b> El equipo de Agencia EH la aprobará pronto; mientras tanto puedes completar tu perfil. Podrás publicar propiedades y crear cuentas en cuanto quede aprobada (te avisaremos por correo).</div>}
    {welcome && <div className="welcome-banner" role="status">
      <b>¡Tu cuenta de {role.label.toLowerCase()} está lista, {user.fullName.split(' ')[0]}!</b>
      <span>{role.summary} Revisa tu correo para verificar tu cuenta.</span>
    </div>}

    <div className="page-heading panel-heading">
      <div>
        <span className="role-badge">{role.label}</span>
        <h1>Hola, {user.fullName.split(' ')[0]}</h1>
        <p>{intro}</p>
      </div>
      <Link className="button button-outline" href="/cuenta">Mi perfil</Link>
    </div>

    <h2 className="panel-subtitle">¿Qué quieres hacer?</h2>
    <div className="action-grid">
      {actions.map(a => <Link key={a.title} href={a.href} className={`action-card${a.primary ? ' primary' : ''}`}>
        <h3>{a.title}</h3><p>{a.text}</p><span aria-hidden>→</span>
      </Link>)}
    </div>

    {children}

    {role.soon?.length ? <section className="soon-box">
      <h3>Próximamente en tu panel</h3>
      <ul>{role.soon.map(s => <li key={s}>{s}</li>)}</ul>
    </section> : null}
  </main>;
}

/** Línea de pasos del flujo de publicación con conteos opcionales. */
export function PublishFlow({ counts }: { counts?: Record<string, number> }) {
  const steps = [
    { key: 'DRAFT', title: 'Borrador', text: 'Captura los datos y fotos. Solo tú lo ves.' },
    { key: 'REVIEW', title: 'En revisión', text: 'Lo envías y un administrador lo revisa.' },
    { key: 'PUBLISHED', title: 'Publicada', text: 'Aprobada: aparece en el catálogo público.' },
  ];
  return <section className="flow">
    <h2 className="panel-subtitle">Cómo se publica una propiedad</h2>
    <ol className="flow-steps">
      {steps.map((s, i) => <li key={s.key}>
        <span className="step-num">{i + 1}</span>
        <div><b>{s.title}{counts ? <em className="count">{counts[s.key] || 0}</em> : null}</b><p>{s.text}</p></div>
      </li>)}
    </ol>
    {counts && (counts.REJECTED || 0) > 0 && <p className="flow-alert">Tienes {counts.REJECTED} propiedad(es) rechazada(s). Corrígelas y vuelve a enviarlas a revisión.</p>}
  </section>;
}
