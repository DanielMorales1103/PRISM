export type AppRole = 'visitador' | 'supervisor' | 'facturacion' | 'jefe' | 'admin';

export type AppScreen =
  | 'splash'
  | 'login'
  | 'offline-visit'
  | 'home'
  | 'settings'
  | 'new-visit'
  | 'product-selection'
  | 'experience-digital'
  | 'interactive-presentation'
  | 'storytelling-presentation'
  | 'medical-evidence'
  | 'visit-result'
  | 'visit-comments'
  | 'clients'
  | 'visitadores'
  | 'planner'
  | 'map'
  | 'visits'
  | 'marketing'
  | 'coaching'
  | 'billing'
  | 'admin-users'
  | 'admin-products'
  | 'admin-catalogs'
  | 'admin-cycles'
  | 'dashboard';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

export interface VisitDoctorSnapshot {
  id?: string;
  name: string;
  specialty?: string;
  clinic?: string;
  address?: string;
}
