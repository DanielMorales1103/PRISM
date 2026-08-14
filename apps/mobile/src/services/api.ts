import type { Cycle, Product, Specialty, UserProfile } from '@prism/shared';
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
  doctors: unknown[];
  pharmacies: unknown[];
  institutions: unknown[];
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

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
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
  getUsers: () => getJson<UserProfile[]>('/api/users'),
  getProducts: () => getJson<Product[]>('/api/products'),
  getCatalogs: () => getJson<CatalogResponse>('/api/catalogs'),
  getClients: () => getJson<ClientResponse>('/api/clients'),
  getDashboardSummary: () => getJson<DashboardSummary>('/api/dashboard/summary'),
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
    throw new Error(`API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}
