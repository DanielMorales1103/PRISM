import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const storageKey = 'prism.offline.visits.v1';

export interface OfflineVisitDraft {
  id: string;
  createdAt: string;
  doctorName: string;
  doctorSpecialty?: string;
  clinic?: string;
  address?: string;
  finalComments?: string;
  productName?: string;
  productLine?: string;
  productQuantity: number;
  interestLevel: number;
  visitStatus: 'purchase_made' | 'follow_up_pending' | 'not_interested';
  requiresFollowUp: boolean;
  urgentRequest: boolean;
}

async function readRaw() {
  return Platform.OS === 'web' ? localStorage.getItem(storageKey) : AsyncStorage.getItem(storageKey);
}

async function writeRaw(value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(storageKey, value);
    return;
  }
  await AsyncStorage.setItem(storageKey, value);
}

export async function loadOfflineVisits(): Promise<OfflineVisitDraft[]> {
  try {
    const raw = await readRaw();
    if (!raw) return [];
    const queue = JSON.parse(raw) as unknown;
    return Array.isArray(queue) ? queue.filter((visit): visit is OfflineVisitDraft => Boolean(visit && typeof visit === 'object' && typeof (visit as OfflineVisitDraft).id === 'string')) : [];
  } catch {
    return [];
  }
}

export async function enqueueOfflineVisit(visit: Omit<OfflineVisitDraft, 'id' | 'createdAt'>) {
  const next = { ...visit, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() };
  const queue = await loadOfflineVisits();
  await writeRaw(JSON.stringify([...queue, next]));
  return next;
}

export async function removeOfflineVisit(id: string) {
  const queue = await loadOfflineVisits();
  await writeRaw(JSON.stringify(queue.filter((visit) => visit.id !== id)));
}
