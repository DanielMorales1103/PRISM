import { AppRole } from './types';

export const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  jefe: 'Jefe',
  supervisor: 'Supervisor',
  visitador: 'Visitador',
  facturacion: 'Facturacion',
  secretaria: 'Secretaria',
};

export function getRoleLabel(role: AppRole) {
  return roleLabels[role];
}
