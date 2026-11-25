"use client";
import ProtectedPanel from '@/components/protected-panel';
import AdminShell from '@/components/admin/admin-shell';
import FanpageAdmin from '@/components/admin/fanpage-admin';

export default function Page() {
  return <ProtectedPanel allowed={['ADMIN']}>{user => <AdminShell user={user} active="fanpages"><FanpageAdmin /></AdminShell>}</ProtectedPanel>;
}
