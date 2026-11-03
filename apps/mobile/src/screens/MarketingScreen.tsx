import type { Product } from '@prism/shared';
import { FileArchive, ImagePlus, Megaphone, UploadCloud } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, MarketingAsset } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';

const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

function chooseWebFile(accept: string): Promise<any | null> {
  const browserDocument = (globalThis as any).document;
  if (!browserDocument) return Promise.reject(new Error('La carga de archivos estará disponible desde la versión web.'));
  return new Promise((resolve) => {
    const input = browserDocument.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function fileAsBase64(file: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const Reader = (globalThis as any).FileReader;
    const reader = new Reader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
}

export function MarketingScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const token = await loadToken();
        if (!token) throw new Error('Sesión no disponible.');
        const [allProducts, marketing] = await Promise.all([api.getProducts(), api.getMarketingAssets(token)]);
        if (!live) return;
        setProducts(allProducts.filter((product) => product.active));
        setAssets(marketing.assets);
      } catch (cause) {
        if (live) { setError(true); setMessage(cause instanceof Error ? cause.message : 'No se pudo cargar Marketing.'); }
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const assetsByProduct = useMemo(() => new Map(products.map((product) => [product.id, assets.filter((asset) => asset.productId === product.id)])), [assets, products]);

  const uploadAsset = async (product: Product, type: 'cover' | 'presentation') => {
    setMessage('');
    setError(false);
    try {
      const file = await chooseWebFile(type === 'cover' ? 'image/jpeg,image/png,image/webp' : '.zip,application/zip,application/x-zip-compressed');
      if (!file) return;
      const limit = type === 'cover' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > limit) throw new Error(`El archivo supera el máximo de ${type === 'cover' ? '10 MB' : '50 MB'}.`);
      setUploading(`${product.id}-${type}`);
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      const asset = await api.uploadMarketingAsset(token, product.id, { type, fileName: file.name, contentType: file.type, base64: await fileAsBase64(file) });
      setAssets((current) => [...current.filter((item) => !(item.productId === product.id && item.type === type)), asset]);
      setMessage(`${type === 'cover' ? 'Portada' : 'Presentación'} de ${product.name} subida como versión ${asset.version}.`);
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : 'No se pudo subir el archivo.');
    } finally {
      setUploading(null);
    }
  };

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View style={styles.headerIcon}><Megaphone size={26} color={colors.primary} /></View><View><Text style={styles.title}>Marketing</Text><Text style={styles.subtitle}>Carga la portada y la presentación interactiva vigente de cada producto.</Text></View></View>
    {message ? <Text style={[styles.message, error && styles.messageError]}>{message}</Text> : null}
    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.subtitle}>Cargando productos...</Text></View> : null}
    <View style={styles.grid}>{products.map((product) => { const productAssets = assetsByProduct.get(product.id) ?? []; const cover = productAssets.find((asset) => asset.type === 'cover'); const presentation = productAssets.find((asset) => asset.type === 'presentation'); return <View key={product.id} style={styles.productCard}>
      <View><Text style={styles.productName}>{product.name}</Text><Text style={styles.productMeta}>{product.line} · {product.presentation}</Text></View>
      <AssetSlot icon={<ImagePlus size={21} color={colors.primary} />} label="Portada del producto" acceptLabel="JPG, PNG o WebP · máximo 10 MB" asset={cover} loading={uploading === `${product.id}-cover`} onUpload={() => void uploadAsset(product, 'cover')} />
      <AssetSlot icon={<FileArchive size={21} color={colors.primary} />} label="Presentación interactiva" acceptLabel="ZIP autocontenido · máximo 50 MB" asset={presentation} loading={uploading === `${product.id}-presentation`} onUpload={() => void uploadAsset(product, 'presentation')} />
    </View>; })}</View>
    {!loading && products.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No hay productos activos</Text><Text style={styles.subtitle}>Crea primero un producto desde Administración.</Text></View> : null}
  </ScrollView>;
}

function AssetSlot({ icon, label, acceptLabel, asset, loading, onUpload }: { icon: React.ReactNode; label: string; acceptLabel: string; asset?: MarketingAsset; loading: boolean; onUpload: () => void; }) {
  return <View style={styles.slot}><View style={styles.slotIcon}>{icon}</View><View style={styles.slotCopy}><Text style={styles.slotTitle}>{label}</Text>{asset ? <Text style={styles.assetName}>v{asset.version} · {asset.fileName} · {formatSize(asset.size)}</Text> : <Text style={styles.slotHint}>{acceptLabel}</Text>}</View><Pressable disabled={loading} onPress={onUpload} style={[styles.uploadButton, loading && styles.disabled]}>{loading ? <ActivityIndicator color={colors.onPrimary} /> : <><UploadCloud size={17} color={colors.onPrimary} /><Text style={styles.uploadText}>{asset ? 'Reemplazar' : 'Subir'}</Text></>}</Pressable></View>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 3 },
  message: { color: colors.success, fontWeight: '800' }, messageError: { color: colors.primaryDark },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  productCard: { flexBasis: 360, flexGrow: 1, maxWidth: 620, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadows.card },
  productName: { color: colors.text, fontSize: 19, fontWeight: '900' }, productMeta: { color: colors.muted, fontSize: 13, marginTop: 3 },
  slot: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm },
  slotIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, slotCopy: { flex: 1, minWidth: 100 }, slotTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, slotHint: { color: colors.muted, fontSize: 12, marginTop: 3 }, assetName: { color: colors.success, fontSize: 12, fontWeight: '800', marginTop: 3 },
  uploadButton: { minHeight: 38, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.sm }, uploadText: { color: colors.onPrimary, fontSize: 13, fontWeight: '900' }, disabled: { opacity: .58 },
  empty: { minHeight: 160, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surface }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
});
