"use client";
import AdminShell from '@/components/admin/admin-shell';
import ProtectedPanel from '@/components/protected-panel';
import HowItWorksContent from '@/components/how-it-works-content';

/** Guía interna: solo la ven los administradores. */
export default function Page() { return <ProtectedPanel allowed={['ADMIN']}>{user => <AdminShell user={user} active="ayuda"><HowItWorksContent /></AdminShell>}</ProtectedPanel>; }
