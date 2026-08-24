import type { Cycle, Doctor, Institution, Pharmacy, Product, Specialty, UserProfile } from '@prism/shared';
import { AppRole } from '../app/types';

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface CatalogResponse {
  roles: string[];
  clientTypes: string[];
  doctorCategories: string[];
  pharmacyCategories: string[];
  institutionCategories: string[];
  specialties: Specialty[];
  cycles: Cycle[];
}

export interface ClientResponse {
  doctors: Doctor[];
  pharmacies: Pharmacy[];
  institutions: Institution[];
}

export interface CreateDoctorPayload {
  fullName: string;
  category?: 'A' | 'B' | 'C';
  collegiateNumber?: string;
  specialty?: string;
  subSpecialty?: string;
  address: string;
  hospitalOrClinic?: string;
  birthDate?: string;
  clinicPhone?: string;
  mobilePhone?: string;
  emailOrSocial?: string;
  secretaryName?: string;
  secretaryBirthDate?: string;
  visitDays?: string[];
  visitHours?: string;
}

export interface CreatePharmacyPayload {
  name: string;
  category?: 'A' | 'B' | 'C' | 'cadena';
  nit?: string;
  address: string;
  ownerName?: string;
  purchaseManager?: string;
  phone?: string;
  mobilePhone?: string;
  emailOrSocial?: string;
  ownerBirthDate?: string;
  visitDays?: string[];
  visitHours?: string;
}

export interface DashboardSummary {
  activeUsers: number;
  activeProducts: number;
  totalClients: number;
  activeDoctors: number;
  activePharmacies: number;
  activeInstitutions: number;
  plannedVisits: number;
  completedVisits: number;
  coverage: number;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: AppRole;
}

export interface CreateProductPayload {
  name: string;
  line: string;
  presentation: string;
  composition?: string;
  dosage?: string;
  details?: string;
  imageUrl?: string;
}

export interface SavePresentationVisitPayload {
  doctorName?: string;
  doctorSpecialty?: string;
  clinic?: string;
  address?: string;
  productId?: string;
  productName?: string;
  productLine?: string;
  presentedFlows: Array<{
    type: 'interactive' | 'storytelling' | 'clinical';
    productId?: string;
    productName?: string;
    startedAt: string;
    completedAt?: string;
  }>;
  finalFlowType?: 'interactive' | 'storytelling' | 'clinical';
  visitStatus: 'purchase_made' | 'follow_up_pending' | 'not_interested';
  requestedProducts: Array<{
    productId?: string;
    productName: string;
    line: string;
    quantity: number;
  }>;
  probablePurchaseDate?: string;
  competitionDetected?: string;
  interestLevel: number;
  requiresFollowUp: boolean;
  urgentRequest: boolean;
  finalComments?: string;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export const api = {
  getBaseUrl: () => baseUrl,
  login: (email: string, password: string) =>
    postJson<LoginResponse>('/api/auth/login', {
      email,
      password,
    }),
  createUser: (token: string, payload: CreateUserPayload) => postJson<UserProfile>('/api/users', payload, token),
  deactivateUser: (token: string, id: string) => deleteJson<UserProfile>(`/api/users/${id}`, token),
  getUsers: () => getJson<UserProfile[]>('/api/users'),
  getProducts: () => getJson<Product[]>('/api/products'),
  createProduct: (token: string, payload: CreateProductPayload) => postJson<Product>('/api/products', payload, token),
  getCatalogs: () => getJson<CatalogResponse>('/api/catalogs'),
  getClients: () => getJson<ClientResponse>('/api/clients'),
  createDoctor: (token: string, payload: CreateDoctorPayload) => postJson<Doctor>('/api/clients/doctors', payload, token),
  createPharmacy: (token: string, payload: CreatePharmacyPayload) => postJson<Pharmacy>('/api/clients/pharmacies', payload, token),
  deactivateDoctor: (token: string, id: string) => deleteJson<Doctor>(`/api/clients/doctors/${id}`, token),
  deactivatePharmacy: (token: string, id: string) => deleteJson<Pharmacy>(`/api/clients/pharmacies/${id}`, token),
  getDashboardSummary: () => getJson<DashboardSummary>('/api/dashboard/summary'),
  savePresentationVisit: (token: string, payload: SavePresentationVisitPayload) =>
    postJson<{ ok: boolean; id: string }>('/api/presentation-visits', payload, token),
};

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function deleteJson<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function getErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? `API error ${response.status}`;
  } catch {
    return `API error ${response.status}`;
  }
}
