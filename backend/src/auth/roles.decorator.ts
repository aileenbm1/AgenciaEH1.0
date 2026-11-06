import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'eh_roles';
export type AppRole = 'BUYER' | 'AGENT' | 'AGENCY' | 'ADMIN';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
