"use client";
import ProtectedPanel from '@/components/protected-panel';
import { PublisherPanel } from '@/components/publisher-panel';

export default function Page() {
  return <ProtectedPanel allowed={['AGENCY']}>{user => <PublisherPanel user={user} />}</ProtectedPanel>;
}
