import type { Product } from '@prism/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ArrowLeft, ArrowRight, CheckCircle2, Heart, X, Zap } from 'lucide-react-native';
import { colors, shadows, spacing } from '../theme/theme';

interface InteractivePresentationScreenProps {
  product: Product;
  onClose: () => void;
  onFinish: () => void;
}

export function InteractivePresentationScreen({ product, onClose, onFinish }: InteractivePresentationScreenProps) {
  const [slide, setSlide] = useState(0);
  const { width, height } = useWindowDimensions();
  const compact = width < 900 || height > width;
  const next = slide === 2 ? onFinish : () => setSlide((current) => Math.min(current + 1, 2));

  return (
    <View style={styles.screen}>
      <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
        <X size={28} color="#050505" />
      </Pressable>

      <View style={styles.productPill}>
        <View style={styles.dot} />
        <Text style={styles.pillText}>PRESENTACION DE PRODUCTO</Text>
        <Text style={styles.pillDivider}>|</Text>
        <Text style={styles.pillProduct}>{product.name}</Text>
      </View>

      <View style={[styles.content, compact && styles.contentCompact]}>
        {slide === 0 && <IntroSlide product={product} compact={compact} />}
        {slide === 1 && <MechanismSlide product={product} compact={compact} />}
        {slide === 2 && <ResultsSlide product={product} compact={compact} />}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => setSlide((current) => Math.max(current - 1, 0))}
          disabled={slide === 0}
          style={({ pressed }) => [styles.roundButton, slide === 0 && styles.inactiveButton, pressed && styles.pressed]}
        >
          <ArrowLeft size={25} color="#050505" />
        </Pressable>
        <View style={styles.dots}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={[styles.indicatorDot, slide === index && styles.indicatorDotActive]} />
          ))}
        </View>
        <Pressable onPress={next} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
          <Text style={styles.continueText}>{slide === 2 ? 'CERRAR VISITA' : 'CONTINUAR'}</Text>
          <View style={styles.arrowBox}>
            <ArrowRight size={22} color={colors.onPrimary} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function IntroSlide({ product, compact }: { product: Product; compact: boolean }) {
  return (
    <View style={styles.centerSlide}>
      <View style={styles.heroIcon}>
        <Zap size={58} color={colors.onPrimary} />
      </View>
      <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>{product.name}.</Text>
      <Text style={styles.heroText}>{product.details ?? 'Presentacion medica preparada para mostrar beneficios principales del producto.'}</Text>
      <View style={[styles.benefitRow, compact && styles.benefitRowCompact]}>
        {[
          ['RAPIDA ACCION', 'Resultados visibles y seguimiento claro.'],
          ['ALTA TOLERANCIA', 'Formula orientada a una experiencia confiable.'],
          ['SEGURIDAD', 'Contenido tecnico para reforzar la recomendacion.'],
        ].map(([title, text], index) => {
          const Icon = index === 0 ? Zap : index === 1 ? Heart : CheckCircle2;
          return (
            <View key={title} style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Icon size={26} color={colors.primary} />
              </View>
              <Text style={styles.benefitTitle}>{title}</Text>
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MechanismSlide({ product, compact }: { product: Product; compact: boolean }) {
  return (
    <View style={[styles.splitSlide, compact && styles.splitSlideCompact]}>
      <View style={styles.mechanismText}>
        <Text style={styles.eyebrow}>BIO-TECNOLOGIA MOLECULAR</Text>
        <Text style={[styles.mechanismTitle, compact && styles.mechanismTitleCompact]}>
          MECHANISM{'\n'}<Text style={styles.orangeText}>ACTION</Text>
        </Text>
        <Text style={styles.mechanismDescription}>{product.composition ?? 'Componentes principales pendientes de confirmar con datos reales.'}</Text>
        {['Inhibicion de tirosinasa', 'Soporte en tratamiento', 'Recordacion de marca'].map((item, index) => (
          <View key={item} style={styles.bulletRow}>
            <View style={styles.bulletNumber}>
              <Text style={styles.bulletNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.mechanismGraphic}>
        <View style={styles.centerGraphic}>
          <Zap size={56} color={colors.primary} />
        </View>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <View key={item} style={[styles.orbitBox, { transform: [{ rotate: `${item * 60}deg` }, { translateY: -160 }] }]} />
        ))}
      </View>
    </View>
  );
}

function ResultsSlide({ product, compact }: { product: Product; compact: boolean }) {
  return (
    <View style={styles.resultsSlide}>
      <Text style={[styles.resultsTitle, compact && styles.resultsTitleCompact]}>
        RESULTADOS <Text style={styles.orangeText}>INMEDIATOS</Text>
      </Text>
      <Text style={styles.resultsSubtitle}>VISIBILIDAD Y RECORDACION DE MARCA</Text>
      <View style={[styles.resultCards, compact && styles.benefitRowCompact]}>
        <View style={styles.darkResultCard}>
          <Text style={styles.darkCardTitle}>DOSIS RECOMENDADA</Text>
          <Text style={styles.darkResultText}>{product.dosage ?? 'Dosis pendiente de confirmar.'}</Text>
          <View style={styles.badgesRow}>
            <Text style={styles.lightBadge}>DAILY USE</Text>
            <Text style={styles.orangeBadge}>CLINICALLY PROVEN</Text>
          </View>
        </View>
        <View style={styles.lightResultCard}>
          <Text style={styles.darkResultTitle}>VENTAJA COMPETITIVA</Text>
          <Text style={styles.lightResultText}>Refuerza estabilidad, recordacion y seguimiento posterior con el medico visitado.</Text>
          <View style={styles.professionalBox}>
            <Text style={styles.professionalText}>+1,200 PROFESIONALES</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xl,
    zIndex: 10,
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  productPill: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.card,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  pillText: {
    color: '#050505',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  pillDivider: {
    color: '#C6C6C6',
    fontSize: 20,
  },
  pillProduct: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingHorizontal: 160,
    paddingTop: 96,
    paddingBottom: 174,
  },
  contentCompact: {
    paddingHorizontal: spacing.xl,
    paddingTop: 110,
  },
  centerSlide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    color: '#050505',
    fontSize: 74,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  heroTitleCompact: {
    fontSize: 54,
  },
  heroText: {
    maxWidth: 860,
    color: '#8A8A8A',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
  },
  benefitRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: 34,
  },
  benefitRowCompact: {
    flexDirection: 'column',
  },
  benefitCard: {
    flex: 1,
    minHeight: 178,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.card,
  },
  benefitIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    color: '#050505',
    fontSize: 21,
    fontWeight: '900',
    marginTop: spacing.lg,
  },
  benefitText: {
    color: '#7B7B7B',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: spacing.md,
  },
  splitSlide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 80,
  },
  splitSlideCompact: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  mechanismText: {
    flex: 1,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  mechanismTitle: {
    color: '#050505',
    fontSize: 60,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 74,
  },
  mechanismTitleCompact: {
    fontSize: 42,
    lineHeight: 52,
  },
  orangeText: {
    color: colors.primary,
  },
  mechanismDescription: {
    color: '#6C6C6C',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 36,
    marginVertical: spacing.xl,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  bulletNumber: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletNumberText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '900',
  },
  bulletText: {
    color: '#050505',
    fontSize: 22,
    fontWeight: '900',
  },
  mechanismGraphic: {
    flex: 1,
    minHeight: 430,
    borderRadius: 34,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  centerGraphic: {
    width: 150,
    height: 150,
    borderRadius: 32,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitBox: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  resultsSlide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsTitle: {
    color: '#050505',
    fontSize: 68,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  resultsTitleCompact: {
    fontSize: 40,
  },
  resultsSubtitle: {
    color: '#969696',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 5,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  resultCards: {
    width: '100%',
    flexDirection: 'row',
    gap: 60,
    marginTop: 80,
  },
  darkResultCard: {
    flex: 1,
    minHeight: 280,
    borderRadius: 34,
    backgroundColor: '#080200',
    padding: spacing.xl,
  },
  lightResultCard: {
    flex: 1,
    minHeight: 280,
    borderRadius: 34,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  darkResultTitle: {
    color: '#050505',
    fontSize: 30,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  darkCardTitle: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  darkResultText: {
    color: '#D8D8D8',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: spacing.xl,
  },
  lightResultText: {
    color: '#7A7A7A',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 34,
    marginTop: spacing.xl,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  lightBadge: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    color: '#050505',
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  orangeBadge: {
    borderRadius: 24,
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  professionalBox: {
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  professionalText: {
    color: '#9A9A9A',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 38,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  roundButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  inactiveButton: {
    opacity: 0.35,
  },
  dots: {
    height: 38,
    minWidth: 136,
    borderRadius: 24,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E2E2',
  },
  indicatorDotActive: {
    width: 42,
    backgroundColor: colors.primary,
  },
  continueButton: {
    minHeight: 70,
    borderRadius: 24,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadows.card,
  },
  continueText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  arrowBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
