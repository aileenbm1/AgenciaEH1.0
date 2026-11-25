"use client";
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { authJson } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { AdminUser, fmtDate } from './admin-types';
import Modal from './modal';
import UserMembership from './payment-form';

/** Registrar un pago de membresía: buscar a la persona y abrir su membresía. */
export default function RegisterPayment({ onClose, onSaved, initial }: { onClose: () => void; onSaved: () => void; initial?: AdminUser | null }) {
  const [q, setQ] = useState(''); const [items, setItems] = useState<AdminUser[] | null>(null); const [pick, setPick] = useState<AdminUser | null>(initial ?? null);
  useEffect(() => {
    if (pick) return;
    const t = setTimeout(() => authJson<{ items: AdminUser[] }>(`/admin/users?take=20${q ? `&search=${encodeURIComponent(q)}` : ''}`)
      .then(d => setItems(d.items.filter(u => u.role !== 'BUYER' && u.role !== 'ADMIN'))).catch(() => setItems([])), 250);
    return () => clearTimeout(t);
  }, [q, pick]);
  return <Modal title={pick ? `Membresía · ${pick.fullName}` : 'Registrar pago de membresía'} onClose={onClose} wide={!!pick}>
    {pick ? <UserMembership user={pick} onClose={onClose} onSaved={onSaved} />
      : <>
        <label className="adm-search"><Search size={18} aria-hidden /><input autoFocus placeholder="Busca a la persona por nombre, correo o teléfono" value={q} onChange={e => setQ(e.target.value)} /></label>
        {items === null ? <p className="muted">Cargando…</p> : items.length === 0 ? <p className="muted">No hay agentes, agencias ni desarrolladoras con esa búsqueda.</p>
          : <div className="adm-pick">{items.map(u => <button key={u.id} type="button" onClick={() => setPick(u)}>
            <span className="adm-av sm">{u.fullName.trim().charAt(0).toUpperCase()}</span>
            <span><b>{u.fullName}</b><small>{ROLES[u.role]?.label} · {u.email}</small></span>
            <i className={`adm-pill ${u.membership?.active ? 'ok' : u.membership ? 'warn' : 'mute'}`}>{u.membership ? `${u.membership.active ? 'Vence' : 'Venció'} ${fmtDate(u.membership.periodEnd)}` : 'Sin membresía'}</i>
          </button>)}</div>}
      </>}
  </Modal>;
}
