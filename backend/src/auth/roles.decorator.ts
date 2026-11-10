import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'eh_roles';
export type AppRole = 'BUYER' | 'AGENT' | 'AGENCY' | 'DEVELOPER' | 'ADMIN';
/** Organizaciones con equipo de agentes (perfil público de empresa). */
export const ORG_ROLES = ['AGENCY', 'DEVELOPER'];
/** Roles que publican propiedades. */
export const PUBLISHER_ROLES = ['AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN'];
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
