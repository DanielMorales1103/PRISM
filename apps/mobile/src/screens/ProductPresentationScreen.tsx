import type { Product } from '@prism/shared';
import { createElement, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Play, Presentation, X } from 'lucide-react-native';
import { api } from '../services/api';
import { loadToken } from '../services/session';
import { presentationHtmlFromArchive } from '../services/presentationPackage';
import { colors, shadows, spacing } from '../theme/theme';

interface ProductPresentationScreenProps {
  product: Product;
  onBack: () => void;
  onFinish: () => void;
  finishLabel?: string;
}

export function ProductPresentationScreen({ product, onBack, onFinish, finishLabel = 'Finalizar presentación' }: ProductPresentationScreenProps) {
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const createdUrls = useRef<string[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setHtmlUrl(null);
    setCoverUrl(undefined);
    setStarted(false);

    const clearUrls = () => {
      createdUrls.current.forEach((url) => URL.revokeObjectURL(url));
      createdUrls.current = [];
    };

    const loadPresentation = async () => {
      if (Platform.OS !== 'web') {
        setError('Las presentaciones interactivas se mostrarán en la versión web durante esta etapa.');
        setLoading(false);
        return;
      }

      try {
        const token = await loadToken();
        if (!token) throw new Error('Sesión no disponible.');

        const response = await api.getProductPresentation(token, product.id);
        const archiveResponse = await fetch(response.presentation.url);
        if (!archiveResponse.ok) throw new Error('No se pudo descargar la presentación publicada.');

        const html = await presentationHtmlFromArchive(await archiveResponse.arrayBuffer());

        const documentUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        createdUrls.current.push(documentUrl);

        if (!active) return;
        setCoverUrl(response.cover?.url);
        setHtmlUrl(documentUrl);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'No se pudo abrir la presentación.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPresentation();
    return () => {
      active = false;
      clearUrls();
    };
  }, [product.id]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Preparando presentación...</Text>
      </View>
    );
  }

  if (error || !htmlUrl) {
    return (
      <View style={styles.errorScreen}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={23} color={colors.text} />
        </Pressable>
        <View style={styles.errorCard}>
          <Presentation size={38} color={colors.primary} />
          <Text style={styles.errorTitle}>Presentación no disponible</Text>
          <Text style={styles.errorText}>{error ?? 'No hay una presentación publicada para este producto.'}</Text>
          <Pressable onPress={onBack} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Volver al portafolio</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!started) {
    return (
      <View style={styles.coverScreen}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={23} color={colors.text} />
        </Pressable>
        <View style={styles.coverCard}>
          {coverUrl ? <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="cover" /> : <View style={styles.coverPlaceholder}><Presentation size={56} color={colors.primary} /></View>}
          <View style={styles.coverBody}>
            <Text style={styles.eyebrow}>PRESENTACIÓN DE PRODUCTO</Text>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDescription}>{product.presentation}</Text>
            <Pressable onPress={() => setStarted(true)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Play size={20} color={colors.onPrimary} fill={colors.onPrimary} />
              <Text style={styles.primaryButtonText}>Iniciar presentación</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.viewerScreen}>
      <View style={styles.iframeWrap}>
        {createElement('iframe', {
          src: htmlUrl,
          title: `Presentación de ${product.name}`,
          sandbox: 'allow-scripts allow-forms allow-popups',
          style: { width: '100%', height: '100%', border: 0, backgroundColor: '#FFFFFF' },
        })}
      </View>
      <View style={styles.viewerControls}>
        <Pressable onPress={onFinish} style={({ pressed }) => [styles.finishButton, pressed && styles.pressed]}>
          {finishLabel !== 'Siguiente producto' ? <X size={19} color={colors.onPrimary} /> : null}
          <Text style={styles.finishButtonText}>{finishLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background },
  loadingText: { color: colors.muted, fontSize: 16, fontWeight: '800' },
  errorScreen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  backButton: { width: 46, height: 46, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  errorCard: { width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center', gap: spacing.md, marginTop: 80, padding: spacing.xl, borderRadius: 8, backgroundColor: colors.surface, ...shadows.card },
  errorTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  errorText: { color: colors.muted, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  coverScreen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.xl },
  coverCard: { flex: 1, maxWidth: 1120, width: '100%', alignSelf: 'center', flexDirection: 'row', overflow: 'hidden', borderRadius: 8, backgroundColor: colors.surface, ...shadows.card },
  coverImage: { width: '50%', height: '100%', backgroundColor: colors.primarySoft },
  coverPlaceholder: { width: '50%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  coverBody: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', padding: 56, gap: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '900', letterSpacing: 0 },
  productName: { color: colors.text, fontSize: 42, fontWeight: '900' },
  productDescription: { color: colors.muted, fontSize: 18, lineHeight: 27, marginBottom: spacing.lg },
  primaryButton: { minHeight: 50, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '900' },
  viewerScreen: { flex: 1, position: 'relative', backgroundColor: colors.surface },
  viewerControls: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 2 },
  finishButton: { minHeight: 42, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.primary, ...shadows.card },
  finishButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: '900' },
  iframeWrap: { flex: 1, overflow: 'hidden', backgroundColor: colors.surface },
  pressed: { opacity: 0.84 },
});
