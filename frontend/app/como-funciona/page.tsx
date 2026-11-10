"use client";
import ProtectedPanel from '@/components/protected-panel';
import HowItWorksContent from '@/components/how-it-works-content';

/** Guía interna: solo la ven los administradores. */
export default function Page() { return <ProtectedPanel allowed={['ADMIN']}><HowItWorksContent /></ProtectedPanel>; }
