"use client";
import ProtectedPanel from '@/components/protected-panel';
import PublisherHome from '@/components/publisher/publisher-home';

export default function Page() {
  return <ProtectedPanel allowed={['DEVELOPER']}>{user => <PublisherHome user={user} />}</ProtectedPanel>;
}
