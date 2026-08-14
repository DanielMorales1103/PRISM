import { AppRole, AppScreen } from './types';

const screenPermissions: Record<AppScreen, AppRole[]> = {
  splash: ['visitador', 'supervisor', 'facturacion', 'jefe', 'admin'],
  login: ['visitador', 'supervisor', 'facturacion', 'jefe', 'admin'],
  home: ['visitador', 'supervisor', 'facturacion', 'jefe', 'admin'],
  dashboard: ['visitador', 'supervisor', 'facturacion', 'jefe', 'admin'],
  'admin-users': ['jefe', 'admin'],
  'admin-products': ['jefe', 'admin'],
  'admin-catalogs': ['jefe', 'admin'],
};

export function canAccessScreen(role: AppRole, screen: AppScreen) {
  return screenPermissions[screen].includes(role);
}

export function canManageUsers(role: AppRole) {
  return role === 'admin' || role === 'jefe';
}

export function canManageCatalogs(role: AppRole) {
  return role === 'admin' || role === 'jefe';
}
