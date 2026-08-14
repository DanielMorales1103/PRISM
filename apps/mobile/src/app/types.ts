export type AppRole = 'visitador' | 'supervisor' | 'facturacion' | 'jefe' | 'admin';

export type AppScreen =
  | 'splash'
  | 'login'
  | 'home'
  | 'clients'
  | 'planner'
  | 'map'
  | 'visits'
  | 'marketing'
  | 'coaching'
  | 'billing'
  | 'admin-users'
  | 'admin-products'
  | 'admin-catalogs'
  | 'dashboard';

export interface SessionUser {
  name: string;
  email: string;
  role: AppRole;
}
