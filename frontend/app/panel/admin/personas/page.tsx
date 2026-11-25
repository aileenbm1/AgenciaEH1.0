"use client";
import ProtectedPanel from '@/components/protected-panel';
import AdminShell from '@/components/admin/admin-shell';
import AdminPeople from '@/components/admin/admin-people';

export default function Page() {
  return <ProtectedPanel allowed={['ADMIN']}>{user => <AdminShell user={user} active="personas"><AdminPeople me={user} /></AdminShell>}</ProtectedPanel>;
}
