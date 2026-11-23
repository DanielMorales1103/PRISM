import type { Cycle, Doctor, GeoLocation, Institution, Pharmacy, PlannedProduct, Product, Specialty, UserProfile, VisitPlan, VisitPlanStatus } from '@prism/shared';
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

export interface KpiGoalValues {
  doctorVisits: number;
  pharmacyVisits: number;
  salesAmount: number;
  collectionAmount: number;
}

export interface KpiDashboardResponse {
  filters: {
    cycles: Array<{ id: string; name: string; number: number; startsAt: string; endsAt: string; durationWeeks: number; active: boolean }>;
    visitors: Array<{ id: string; name: string }>;
    selectedCycleId: string;
    selectedUserId?: string;
    year: number;
  };
  summary: {
    doctors: { actual: number; goal: number; percentage: number };
    pharmacies: { actual: number; goal: number; percentage: number };
    sales: { actual: number; goal: number; percentage: number };
    collections: { actual: number; goal: number; percentage: number; pendingBalance: number; creditAmount: number };
  };
  weekly: Array<{
    weekNumber: number;
    doctorActual: number; doctorGoal: number; doctorPercentage: number;
    pharmacyActual: number; pharmacyGoal: number; pharmacyPercentage: number;
    salesActual: number; salesGoal: number; salesPercentage: number;
    collectionActual: number; collectionGoal: number; collectionPercentage: number;
  }>;
  frequency: { year: number; totalDoctors: number; distribution: Array<{ cyclesVisited: number; count: number }>; details: Array<{ doctorId: string; doctorName: string; userId: string; userName: string; cyclesVisited: number }> };
  evaluations: Array<{ id: string; title: string; passingScore: number; completed: number; averageScore: number; passed: number; passRate: number }>;
  invoices: { total: number; paid: number; partial: number; pending: number };
  target?: {
    cycleGoals: KpiGoalValues;
    weeklyGoals: Array<{ weekNumber: number; goals: KpiGoalValues }>;
    revisionCount: number;
    updatedAt: string;
    revisions: Array<{ cycleGoals: KpiGoalValues; weeklyGoals: Array<{ weekNumber: number; goals: KpiGoalValues }>; reason?: string; changedAt: string; changedBy?: string; changedByName: string }>;
  };
}

export interface ReturnLine {
  productId: string;
  productName: string;
  soldQuantity: number;
  returnedQuantity: number;
  reason?: string;
}

export interface InvoiceReturn {
  id: string;
  number: string;
  requestedAt: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  items: ReturnLine[];
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface InvoiceItem {
  id: string; number: string; userId: string; cycleId: string; collectionCycleId: string;
  clientType: 'doctor' | 'pharmacy' | 'institution'; clientId: string; clientName: string;
  invoiceDate: string; originalAmount: number; paidAmount: number; creditedAmount: number; balance: number;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice?: number }>;
  status: 'paid' | 'partial' | 'pending';
  payments: Array<{ id: string; amount: number; paidAt: string; reference?: string }>;
  creditNotes: Array<{ id: string; number: string; amount: number; appliedAt: string; returnId?: string }>;
  returns: InvoiceReturn[];
}

export interface ReturnReport {
  soldUnits: number; returnedUnits: number; returnRate: number; creditAmount: number; untrackedInvoices: number;
  pending: number; approved: number; rejected: number;
  products: Array<{ productId: string; productName: string; soldUnits: number; returnedUnits: number; returnRate: number }>;
  recurring: Array<{ clientId: string; clientName: string; productId: string; productName: string; count: number }>;
  byVisitor: Array<{ userId: string; soldUnits: number; returnedUnits: number; returnRate: number; creditAmount: number }>;
  byCycle: Array<{ cycleId: string; soldUnits: number; returnedUnits: number; returnRate: number; creditAmount: number }>;
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
  unitPrice: number;
  composition?: string;
  dosage?: string;
  details?: string;
  imageUrl?: string;
}

export interface SampleInventoryItem {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  line: string;
  presentation: string;
  quantity: number;
}

export interface TrainingItem {
  id: string;
  cycleId?: string;
  title: string;
  description?: string;
  resourceUrl: string;
  active: boolean;
  completedAt?: string;
  createdAt?: string;
}

export type ExamQuestionType = 'single_choice' | 'multiple_choice' | 'short_answer';

export interface ExamQuestion {
  id: string;
  prompt: string;
  type: ExamQuestionType;
  options: string[];
  correctOptionIndexes?: number[];
  acceptedAnswers?: string[];
}

export interface ExamResultDetail {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  score: number;
  correctCount: number;
  passed: boolean;
  submittedAt: string;
  answers: Array<{ questionId: string; selectedOptionIndexes: number[]; textAnswer?: string; correct: boolean }>;
}

export interface ExamResultsResponse {
  exam: ExamItem;
  results: ExamResultDetail[];
}

export interface ExamItem {
  id: string;
  cycleId?: string;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  attemptCount?: number;
  active: boolean;
  questions: ExamQuestion[];
  latestAttempt?: { score: number; correctCount: number; passed: boolean; submittedAt: string };
  createdAt?: string;
}

export interface LibraryCycle {
  id: string;
  name: string;
  number: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export interface LibraryExam {
  id: string;
  cycleId?: string;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  questionCount: number;
  questions: Array<{
    id: string;
    prompt: string;
    type: ExamQuestionType;
    options: string[];
    correctOptionIndexes?: number[];
  }>;
  active: boolean;
  createdAt: string;
}

export interface LibraryAsset extends MarketingAsset {
  productName: string;
  productLine: string;
}

export interface LibraryResponse {
  cycles: LibraryCycle[];
  trainings: TrainingItem[];
  exams: LibraryExam[];
  assets: LibraryAsset[];
}

export interface ExamAttemptResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  submittedAt: string;
}

export interface SavePresentationVisitPayload {
  offlineSync?: boolean;
  planId?: string;
  doctorId?: string;
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
  samplesDelivered: Array<{
    productId?: string;
    productName: string;
    line: string;
    quantity: number;
  }>;
  probablePurchaseDate?: string;
  competitionDetected?: string;
  interestLevel?: number;
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
  plannedProducts?: PlannedProduct[];
}

export interface UpdateVisitPlanPayload {
  userId?: string;
  cycleId?: string;
  clientId?: string;
  clientType?: 'doctor' | 'pharmacy';
  plannedDate?: string;
  order?: number;
  notes?: string;
  status?: VisitPlanStatus;
  plannedProducts?: PlannedProduct[];
}

export interface ReplicateVisitPlanResponse {
  created: VisitPlan[];
  skipped: number;
}

export interface CompletedVisit {
  id: string;
  clientType: 'doctor' | 'pharmacy' | 'institution';
  clientId: string;
  userId: string;
  visitedAt: string;
  notes?: string;
  productsDelivered: Array<{ productId?: string; productName?: string; line?: string; quantity: number }>;
  samplesDelivered: Array<{ productId?: string; productName?: string; line?: string; quantity: number }>;
  location?: GeoLocation;
  syncedAt?: string;
}

export interface VisitDetail extends CompletedVisit {
  outcome?: {
    visitStatus: 'purchase_made' | 'follow_up_pending' | 'not_interested';
    interestLevel?: number;
    requiresFollowUp: boolean;
    urgentRequest: boolean;
    probablePurchaseDate?: string;
    competitionDetected?: string;
    finalComments?: string;
    presentedFlows: Array<{ type: string; productName?: string; completedAt?: string }>;
  };
}

export interface MarketingAsset {
  id: string;
  productId: string;
  type: 'cover' | 'presentation';
  version: number;
  fileName: string;
  contentType: string;
  size: number;
  active: boolean;
  createdAt: string;
}

export interface MarketingAssetsResponse {
  configured: boolean;
  assets: MarketingAsset[];
}

export interface ProductCoversResponse {
  covers: Array<MarketingAsset & { url: string }>;
}

export interface ProductPresentationResponse {
  cover?: MarketingAsset & { url: string };
  presentation: MarketingAsset & { url: string };
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
  recordOfflineSync: (token: string) => postJson<UserProfile>('/api/users/me/offline-sync', {}, token),
  createUser: (token: string, payload: CreateUserPayload) => postJson<UserProfile>('/api/users', payload, token),
  deactivateUser: (token: string, id: string) => deleteJson<UserProfile>(`/api/users/${id}`, token),
  getUsers: () => getJson<UserProfile[]>('/api/users'),
  getProducts: () => getJson<Product[]>('/api/products'),
  getMarketingAssets: (token: string) => getAuthorizedJson<MarketingAssetsResponse>('/api/marketing', token),
  getProductCovers: (token: string) => getAuthorizedJson<ProductCoversResponse>('/api/marketing/covers', token),
  getLibrary: (token: string) => getAuthorizedJson<LibraryResponse>('/api/library', token),
  getMarketingAssetAccess: (token: string, assetId: string) => getAuthorizedJson<{ asset: MarketingAsset; url: string }>(`/api/marketing/assets/${assetId}/access`, token),
  getProductPresentation: (token: string, productId: string) =>
    getAuthorizedJson<ProductPresentationResponse>(`/api/marketing/products/${productId}/presentation`, token),
  uploadMarketingAsset: (token: string, productId: string, payload: { type: 'cover' | 'presentation'; fileName: string; contentType: string; base64: string }) =>
    postJson<MarketingAsset>(`/api/marketing/${productId}/assets`, payload, token),
  getSampleInventory: (token: string, userId?: string) =>
    getAuthorizedJson<SampleInventoryItem[]>(`/api/sample-inventory${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, token),
  assignSamples: (token: string, payload: { userId: string; productId: string; quantity: number }) =>
    postJson<SampleInventoryItem>('/api/sample-inventory/assign', payload, token),
  getTrainings: (token: string) => getAuthorizedJson<TrainingItem[]>('/api/trainings', token),
  createTraining: (token: string, payload: { cycleId?: string; title: string; description?: string; resourceUrl: string }) =>
    postJson<TrainingItem>('/api/trainings', payload, token),
  updateTrainingStatus: (token: string, id: string, active: boolean) =>
    patchJson<TrainingItem>(`/api/trainings/${id}/status`, { active }, token),
  updateTrainingCycle: (token: string, id: string, cycleId?: string) =>
    patchJson<TrainingItem>(`/api/trainings/${id}/cycle`, { cycleId }, token),
  completeTraining: (token: string, id: string) => postJson<{ trainingId: string; completedAt: string }>(`/api/trainings/${id}/complete`, {}, token),
  getExams: (token: string) => getAuthorizedJson<ExamItem[]>('/api/exams', token),
  createExam: (token: string, payload: { cycleId?: string; title: string; description?: string; passingScore: number; maxAttempts: number; questions: Array<{ id?: string; prompt: string; type: ExamQuestionType; options: string[]; correctOptionIndexes: number[]; acceptedAnswers: string[] }> }) => postJson<ExamItem>('/api/exams', payload, token),
  updateExam: (token: string, id: string, payload: { cycleId?: string; title: string; description?: string; passingScore: number; maxAttempts: number; questions: Array<{ id?: string; prompt: string; type: ExamQuestionType; options: string[]; correctOptionIndexes: number[]; acceptedAnswers: string[] }> }) => patchJson<ExamItem>(`/api/exams/${id}`, payload, token),
  updateExamStatus: (token: string, id: string, active: boolean) => patchJson<ExamItem>(`/api/exams/${id}/status`, { active }, token),
  getExamResults: (token: string, id: string) => getAuthorizedJson<ExamResultsResponse>(`/api/exams/${id}/results`, token),
  submitExam: (token: string, id: string, answers: Array<{ questionId: string; selectedOptionIndexes?: number[]; textAnswer?: string }>) => postJson<ExamAttemptResult>(`/api/exams/${id}/submit`, { answers }, token),
  createProduct: (token: string, payload: CreateProductPayload) => postJson<Product>('/api/products', payload, token),
  updateProductPrice: (token: string, id: string, unitPrice: number) => patchJson<Product>(`/api/products/${id}/price`, { unitPrice }, token),
  getCatalogs: () => getJson<CatalogResponse>('/api/catalogs'),
  createCycle: (token: string, durationWeeks = 5, startsAt?: string) => postJson<Cycle>('/api/cycles', { durationWeeks, ...(startsAt ? { startsAt } : {}) }, token),
  updateCycle: (token: string, id: string, startsAt: string, durationWeeks: number) => patchJson<{ cycles: Cycle[] }>(`/api/cycles/${id}`, { startsAt, durationWeeks }, token),
  deleteCycle: (token: string, id: string) => deleteJson<{ deletedId: string }>(`/api/cycles/${id}`, token),
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
  replicateVisitPlan: (token: string, id: string, cycleIds: string[]) =>
    postJson<ReplicateVisitPlanResponse>(`/api/visit-plans/${id}/replicate`, { cycleIds }, token),
  getVisits: (token: string, filters: { from?: string; to?: string; userId?: string; clientId?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
    return getAuthorizedJson<CompletedVisit[]>(`/api/visits${query.size ? `?${query.toString()}` : ''}`, token);
  },
  getVisit: (token: string, id: string) => getAuthorizedJson<VisitDetail>(`/api/visits/${id}`, token),
  getDashboardSummary: () => getJson<DashboardSummary>('/api/dashboard/summary'),
  getKpiDashboard: (token: string, filters: { cycleId?: string; userId?: string; year?: number } = {}) => {
    const query = new URLSearchParams();
    if (filters.cycleId) query.set('cycleId', filters.cycleId);
    if (filters.userId) query.set('userId', filters.userId);
    if (filters.year) query.set('year', String(filters.year));
    return getAuthorizedJson<KpiDashboardResponse>(`/api/dashboard/kpis${query.size ? `?${query.toString()}` : ''}`, token);
  },
  updateKpiTarget: (token: string, userId: string, cycleId: string, payload: { cycleGoals: KpiGoalValues; weeklyGoals: Array<{ weekNumber: number; goals: KpiGoalValues }>; reason?: string }) =>
    patchJson<KpiDashboardResponse['target']>(`/api/dashboard/targets/${userId}/${cycleId}`, payload, token),
  getInvoices: (token: string, filters: { userId?: string; cycleId?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.userId) query.set('userId', filters.userId);
    if (filters.cycleId) query.set('cycleId', filters.cycleId);
    return getAuthorizedJson<InvoiceItem[]>(`/api/invoices${query.size ? `?${query.toString()}` : ''}`, token);
  },
  createInvoice: (token: string, payload: { number: string; userId: string; cycleId: string; collectionCycleId: string; clientType: 'doctor' | 'pharmacy' | 'institution'; clientId: string; clientName: string; invoiceDate: string; items: Array<{ productId: string; quantity: number }> }) => postJson<InvoiceItem>('/api/invoices', payload, token),
  getReturnReport: (token: string, filters: { userId?: string; cycleId?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.userId) query.set('userId', filters.userId);
    if (filters.cycleId) query.set('cycleId', filters.cycleId);
    return getAuthorizedJson<ReturnReport>(`/api/invoices/returns/report${query.size ? `?${query.toString()}` : ''}`, token);
  },
  addInvoicePayment: (token: string, invoiceId: string, payload: { amount: number; paidAt: string; reference?: string }) => postJson<InvoiceItem>(`/api/invoices/${invoiceId}/payments`, payload, token),
  submitInvoiceReturn: (token: string, invoiceId: string, payload: { items: Array<{ productId: string; returnedQuantity: number; reason?: string }> }) =>
    postJson<InvoiceItem>(`/api/invoices/${invoiceId}/returns`, payload, token),
  reviewInvoiceReturn: (token: string, invoiceId: string, returnId: string, payload: { decision: 'rejected' } | { decision: 'approved'; appliedAt: string }) =>
    postJson<InvoiceItem>(`/api/invoices/${invoiceId}/returns/${returnId}/review`, payload, token),
  savePresentationVisit: (token: string, payload: SavePresentationVisitPayload) =>
    postJson<{ ok: boolean; id: string; visitId?: string; completedAt: string }>('/api/presentation-visits', payload, token),
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
