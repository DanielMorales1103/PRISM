export const userRoles = ['visitador', 'supervisor', 'facturacion', 'admin'] as const;

export type UserRole = (typeof userRoles)[number];

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  line: string;
  presentation: string;
  active: boolean;
}

export type ClientType = 'doctor' | 'pharmacy' | 'institution';

export interface ClientBase {
  id: string;
  type: ClientType;
  name: string;
  category: string;
  address: string;
  assignedUserId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface VisitRecord {
  id: string;
  clientId: string;
  userId: string;
  visitedAt: string;
  notes?: string;
  syncedAt?: string;
}
