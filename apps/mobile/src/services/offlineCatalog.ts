import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@prism/shared';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from './api';
import type { SampleInventoryItem } from './api';
import { presentationHtmlFromArchive } from './presentationPackage';

const storageKey = 'prism.offline.catalog.v1';

export interface OfflineCatalogSnapshot {
  syncedAt: string;
  products: Product[];
  presentations: Record<string, { updatedAt: string; uri?: string; html?: string; coverUri?: string }>;
  sampleInventory?: SampleInventoryItem[];
}

function folderName(productId: string) { return productId.replace(/[^a-zA-Z0-9_-]/g, ''); }

async function packagePresentation(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudo descargar una presentación.');
  return presentationHtmlFromArchive(await response.arrayBuffer());
}

async function coverDataUri(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudo descargar una portada.');
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo guardar una portada.'));
    reader.readAsDataURL(blob);
  });
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

export async function loadOfflineCatalog(): Promise<OfflineCatalogSnapshot | null> {
  try {
    const raw = await readRaw();
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as OfflineCatalogSnapshot;
    return Array.isArray(snapshot.products) ? snapshot : null;
  } catch {
    return null;
  }
}

export async function syncOfflineCatalog(token: string) {
  const [allProducts, sampleInventory] = await Promise.all([api.getProducts(), api.getSampleInventory(token)]);
  const products = allProducts.filter((product) => product.active);
  const previous = await loadOfflineCatalog();
  const presentations: OfflineCatalogSnapshot['presentations'] = {};

  for (const product of products) {
    try {
      const presentation = await api.getProductPresentation(token, product.id);
      const html = await packagePresentation(presentation.presentation.url);
      if (Platform.OS === 'web') {
        const coverUri = presentation.cover?.url ? await coverDataUri(presentation.cover.url) : undefined;
        presentations[product.id] = { updatedAt: new Date().toISOString(), html, coverUri };
        continue;
      }

      const baseDirectory = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ''}prism-presentations/${folderName(product.id)}/`;
      if (!baseDirectory) throw new Error('No se encontró almacenamiento local para la presentación.');
      await FileSystem.makeDirectoryAsync(baseDirectory, { intermediates: true });
      const uri = `${baseDirectory}index.html`;
      await FileSystem.writeAsStringAsync(uri, html, { encoding: FileSystem.EncodingType.UTF8 });
      const coverUri = presentation.cover?.url ? `${baseDirectory}cover` : undefined;
      if (presentation.cover?.url && coverUri) await FileSystem.downloadAsync(presentation.cover.url, coverUri);
      presentations[product.id] = { updatedAt: new Date().toISOString(), uri, coverUri };
    } catch {
      const existing = previous?.presentations?.[product.id];
      if (existing) presentations[product.id] = existing;
    }
  }

  const snapshot: OfflineCatalogSnapshot = { syncedAt: new Date().toISOString(), products, presentations, sampleInventory };
  await writeRaw(JSON.stringify(snapshot));
  return snapshot;
}
