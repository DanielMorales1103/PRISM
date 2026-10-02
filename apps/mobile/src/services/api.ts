import type { Cycle, Doctor, GeoLocation, Institution, Pharmacy, Product, Specialty, UserProfile, VisitPlan, VisitPlanStatus } from '@prism/shared';
import { AppRole } from '../app/types';

function getDefaultApiUrl() {
  // Expo Web may be opened through the machine's LAN address instead of localhost.
  // Match that host so the browser can reach the API from either address.
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:4000`;
  }

  return 'http://localhost:4000';
}

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiUrl();

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

export interface UpdateMyProfilePayload {
  email: string;
  password?: string;
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

export interface CreateVisitPlanPayload {
  userId?: string;
  cycleId: string;
  plannedDate: string;
  clientType: 'doctor' | 'pharmacy';
  clientId: string;
  order?: number;
  notes?: string;
}

export interface UpdateVisitPlanPayload {
  plannedDate?: string;
  order?: number;
  notes?: string;
  status?: VisitPlanStatus;
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
  updateMyProfile: (token: string, payload: UpdateMyProfilePayload) => patchJson<LoginResponse>('/api/users/me', payload, token),
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
  updateDoctor: (token: string, id: string, payload: CreateDoctorPayload) => patchJson<Doctor>(`/api/clients/doctors/${id}`, payload, token),
  updatePharmacy: (token: string, id: string, payload: CreatePharmacyPayload) => patchJson<Pharmacy>(`/api/clients/pharmacies/${id}`, payload, token),
  assignDoctor: (token: string, id: string, assignedUserId?: string) =>
    patchJson<Doctor>(`/api/clients/doctors/${id}/assignment`, { assignedUserId }, token),
  assignPharmacy: (token: string, id: string, assignedUserId?: string) =>
    patchJson<Pharmacy>(`/api/clients/pharmacies/${id}/assignment`, { assignedUserId }, token),
  updateDoctorLocation: (token: string, id: string, location: GeoLocation) =>
    patchJson<Doctor>(`/api/clients/doctors/${id}/location`, location, token),
  updatePharmacyLocation: (token: string, id: string, location: GeoLocation) =>
    patchJson<Pharmacy>(`/api/clients/pharmacies/${id}/location`, location, token),
  getVisitPlans: (token: string, from: string, to: string, userId?: string) =>
    getAuthorizedJson<VisitPlan[]>(`/api/visit-plans?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`, token),
  createVisitPlan: (token: string, payload: CreateVisitPlanPayload) => postJson<VisitPlan>('/api/visit-plans', payload, token),
  updateVisitPlan: (token: string, id: string, payload: UpdateVisitPlanPayload) => patchJson<VisitPlan>(`/api/visit-plans/${id}`, payload, token),
  getDashboardSummary: () => getJson<DashboardSummary>('/api/dashboard/summary'),
  savePresentationVisit: (token: string, payload: SavePresentationVisitPayload) =>
    postJson<{ ok: boolean; id: string }>('/api/presentation-visits', payload, token),
};

async function getAuthorizedJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

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

async function patchJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
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

async function getErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? `API error ${response.status}`;
  } catch {
    return `API error ${response.status}`;
  }
}
