import type { Product } from '@prism/shared';
import { createElement, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Play, Presentation } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { SessionUser, VisitDoctorSnapshot } from '../app/types';
import { NewVisitScreen } from './NewVisitScreen';
import { ProductSelectionScreen } from './ProductSelectionScreen';
import { VisitResultDraft, VisitResultScreen } from './VisitResultScreen';
import { VisitCommentsScreen } from './VisitCommentsScreen';
import { enqueueOfflineVisit } from '../services/offlineVisitQueue';
import { loadOfflineCatalog, OfflineCatalogSnapshot } from '../services/offlineCatalog';
import { colors, shadows, spacing } from '../theme/theme';

interface OfflineVisitScreenProps {
  currentUser?: SessionUser | null;
  onBack: () => void;
  onSaved: () => void;
}

type OfflineStage = 'doctor' | 'products' | 'presentation' | 'result' | 'comments';
const offlineUser: SessionUser = { id: 'offline', name: 'Visitador', email: '', role: 'visitador' };

export function OfflineVisitScreen({ currentUser, onBack, onSaved }: OfflineVisitScreenProps) {
  const [catalog, setCatalog] = useState<OfflineCatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<OfflineStage>('doctor');
  const [doctor, setDoctor] = useState<VisitDoctorSnapshot>();
  const [queue, setQueue] = useState<Product[]>([]);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [presentationStarted, setPresentationStarted] = useState(false);
  const [result, setResult] = useState<VisitResultDraft>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadOfflineCatalog().then((snapshot) => {
      setCatalog(snapshot);
      setLoading(false);
    });
  }, []);

  const productImageUris = useMemo(
    () => Object.fromEntries(Object.entries(catalog?.presentations ?? {}).map(([productId, presentation]) => [productId, presentation.coverUri])),
    [catalog],
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Cargando contenido de la tablet...</Text></View>;
  }

  if (!catalog) {
    return <View style={styles.center}><Presentation size={48} color={colors.primary} /><Text style={styles.errorTitle}>No hay contenido sincronizado</Text><Text style={styles.errorText}>Conéctate y usa Actualizar tablet antes de registrar una visita sin conexión.</Text><Pressable onPress={onBack} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Volver</Text></Pressable></View>;
  }

  if (stage === 'doctor') {
    return <NewVisitScreen currentUser={currentUser ?? offlineUser} offline onBack={onBack} onContinue={(nextDoctor) => {
      if (!nextDoctor.name.trim()) return;
      setDoctor(nextDoctor);
      setStage('products');
    }} />;
  }

  if (stage === 'products') {
    return <ProductSelectionScreen productsOverride={catalog.products} productImageUris={productImageUris} initialProductIds={queue.map((product) => product.id)} onBack={() => setStage('doctor')} onStartPrepared={(products) => {
      setQueue(products);
      setPresentationIndex(0);
      setPresentationStarted(false);
      setStage('presentation');
    }} />;
  }

  if (stage === 'presentation') {
    const product = queue[presentationIndex];
    const presentation = product ? catalog.presentations[product.id] : undefined;
    const hasNext = presentationIndex + 1 < queue.length;
    const finish = () => {
      if (hasNext) {
        setPresentationIndex((current) => current + 1);
        setPresentationStarted(false);
        return;
      }
      setStage('result');
    };

    if (!product) {
      setStage('products');
      return null;
    }

    if (!presentationStarted) {
      return <View style={styles.coverScreen}><Pressable onPress={() => setStage('products')} style={styles.backButton}><ArrowLeft size={23} color={colors.text} /></Pressable><View style={styles.coverCard}>{presentation?.coverUri ? <Image source={{ uri: presentation.coverUri }} style={styles.coverImage} resizeMode="cover" /> : <View style={styles.coverPlaceholder}><Presentation size={56} color={colors.primary} /></View>}<View style={styles.coverBody}><Text style={styles.eyebrow}>PRESENTACIÓN DE PRODUCTO</Text><Text style={styles.productName}>{product.name}</Text><Text style={styles.productDescription}>{product.presentation}</Text>{presentation ? <Pressable onPress={() => setPresentationStarted(true)} style={styles.primaryButton}><Play size={20} color={colors.onPrimary} fill={colors.onPrimary} /><Text style={styles.primaryButtonText}>Iniciar presentación</Text></Pressable> : <><Text style={styles.unavailable}>Este producto no tiene una presentación descargada.</Text><Pressable onPress={finish} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{hasNext ? 'Siguiente producto' : 'Continuar al resultado'}</Text></Pressable></>}</View></View></View>;
    }

    return <View style={styles.viewer}><View style={styles.viewerControls}><Pressable onPress={finish} style={styles.finishButton}><Text style={styles.finishText}>{hasNext ? 'Siguiente producto' : 'Finalizar presentación'}</Text></Pressable></View>{Platform.OS === 'web' && presentation?.html ? createElement('iframe', { srcDoc: presentation.html, title: `Presentación de ${product.name}`, sandbox: 'allow-scripts allow-forms allow-popups', style: { width: '100%', height: '100%', border: 0, backgroundColor: '#FFFFFF' } }) : presentation?.uri ? <WebView source={{ uri: presentation.uri }} originWhitelist={['*']} allowFileAccess /> : null}</View>;
  }

  if (stage === 'result') {
    return <VisitResultScreen productsOverride={catalog.products} sampleInventoryOverride={catalog.sampleInventory ?? []} allowUnassignedSamples onContinue={(nextResult) => {
      setResult(nextResult);
      setStage('comments');
    }} />;
  }

  return <VisitCommentsScreen saving={saving} onBack={() => setStage('result')} onSave={(comments) => {
    if (!doctor || !result) return;
    setSaving(true);
    void enqueueOfflineVisit({
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      clinic: doctor.clinic,
      address: doctor.address,
      finalComments: comments.finalComments,
      productQuantity: 0,
      requestedProducts: result.requestedProducts.filter((product) => product.quantity > 0),
      samplesDelivered: result.samplesDelivered,
      productsPresented: queue.map((product, index) => ({ productId: product.id, productName: product.name, productLine: product.line, order: index + 1 })),
      probablePurchaseDate: result.probablePurchaseDate,
      competitionDetected: result.competitionDetected,
      interestLevel: result.interestLevel,
      visitStatus: result.visitStatus,
      requiresFollowUp: comments.requiresFollowUp || result.visitStatus === 'follow_up_pending',
      urgentRequest: comments.urgentRequest,
    }).then(onSaved).finally(() => setSaving(false));
  }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.xl },
  loadingText: { color: colors.muted, fontSize: 16, fontWeight: '800' },
  errorTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  errorText: { color: colors.muted, fontSize: 16, textAlign: 'center', maxWidth: 520 },
  coverScreen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.xl },
  backButton: { width: 46, height: 46, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  coverCard: { flex: 1, maxWidth: 1120, width: '100%', alignSelf: 'center', flexDirection: 'row', overflow: 'hidden', borderRadius: 8, backgroundColor: colors.surface, ...shadows.card },
  coverImage: { width: '50%', height: '100%', backgroundColor: colors.primarySoft },
  coverPlaceholder: { width: '50%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  coverBody: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', padding: 56, gap: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  productName: { color: colors.text, fontSize: 42, fontWeight: '900' },
  productDescription: { color: colors.muted, fontSize: 18, lineHeight: 27, marginBottom: spacing.lg },
  unavailable: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  primaryButton: { minHeight: 50, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '900' },
  viewer: { flex: 1, backgroundColor: colors.surface },
  viewerControls: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 2 },
  finishButton: { minHeight: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, backgroundColor: colors.primary, ...shadows.card },
  finishText: { color: colors.onPrimary, fontSize: 14, fontWeight: '900' },
});
