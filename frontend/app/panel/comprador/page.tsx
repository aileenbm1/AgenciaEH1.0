"use client";
import ProtectedPanel from '@/components/protected-panel';
import BuyerHome from '@/components/buyer-home';

export default function Page() {
  return <ProtectedPanel allowed={['BUYER']}>{user => <BuyerHome user={user} />}</ProtectedPanel>;
}
