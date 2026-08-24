export const userRoles = ['visitador', 'supervisor', 'facturacion', 'jefe', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

export const clientTypes = ['doctor', 'pharmacy', 'institution'] as const;
export type ClientType = (typeof clientTypes)[number];

export const doctorCategories = ['A', 'B', 'C'] as const;
export type DoctorCategory = (typeof doctorCategories)[number];

export const pharmacyCategories = ['A', 'B', 'C', 'cadena'] as const;
export type PharmacyCategory = (typeof pharmacyCategories)[number];

export const institutionCategories = ['consulta_externa', 'jefes', 'residentes'] as const;
export type InstitutionCategory = (typeof institutionCategories)[number];

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface AuditFields {
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  deletedAt?: string;
}

export interface Specialty {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface Cycle {
  id: string;
  name: string;
  number: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  line: string;
  presentation: string;
  composition?: string;
  dosage?: string;
  details?: string;
  imageUrl?: string;
  active: boolean;
}

export interface ClientBase {
  id: string;
  type: ClientType;
  name: string;
  category: string;
  address: string;
  assignedUserId?: string;
  location?: GeoLocation;
  active: boolean;
  deletedAt?: string;
}

export interface Doctor extends ClientBase {
  type: 'doctor';
  collegiateNumber?: string;
  specialtyId?: string;
  specialty?: string;
  subSpecialty?: string;
  hospitalOrClinic?: string;
  birthDate?: string;
  clinicPhone?: string;
  mobilePhone?: string;
  emailOrSocial?: string;
  visitDays?: string[];
  visitHours?: string;
  secretaryName?: string;
  secretaryBirthDate?: string;
}

export interface Pharmacy extends ClientBase {
  type: 'pharmacy';
  nit?: string;
  ownerName?: string;
  purchaseManager?: string;
  phone?: string;
  mobilePhone?: string;
  emailOrSocial?: string;
  visitDays?: string[];
  visitHours?: string;
}

export interface Institution extends ClientBase {
  type: 'institution';
  phone?: string;
  contactName?: string;
  emailOrSocial?: string;
  visitDays?: string[];
  visitHours?: string;
}

export interface VisitRecord {
  id: string;
  clientType: ClientType;
  clientId: string;
  userId: string;
  visitedAt: string;
  notes?: string;
  syncedAt?: string;
}
