"use client";
import ProtectedPanel from '@/components/protected-panel';
import AdminShell from '@/components/admin/admin-shell';
import CustomFieldsManager from '@/components/admin/custom-fields-manager';

export default function Page() {
  return <ProtectedPanel allowed={['ADMIN']}>{user => <AdminShell user={user} active="campos"><CustomFieldsManager /></AdminShell>}</ProtectedPanel>;
}
