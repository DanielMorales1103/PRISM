import type { Product } from '@prism/shared';
import { useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ArrowRight, X } from 'lucide-react-native';
import { colors, shadows, spacing } from '../theme/theme';

interface StorytellingPresentationScreenProps {
  product: Product;
  onClose: () => void;
  onFinish: () => void;
}

const slides = [
  {
    episode: 'CRONICA DE PACIENTE - EPISODIO 1',
    title: 'El Desafio de\nMaria',
    quote: '"Paciente, 34 anos. Melasma post-parto severo."',
    text: 'Maria sentia que su rostro ya no era suyo. El melasma habia afectado su confianza.',
    image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1600&q=80',
  },
  {
    episode: 'CRONICA DE PACIENTE - EPISODIO 2',
    title: 'Impacto\nEmocional',
    quote: '"Mas alla de lo estetico."',
    text: 'El 72% de las pacientes con melasma reportan una disminucion significativa en su calidad de vida.',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80',
  },
  {
    episode: 'CRONICA DE PACIENTE - EPISODIO 3',
    title: 'La Intervencion\nMedica',
    quote: '"Prescribiendo confianza."',
    text: 'Su dermatologo integro el producto en su rutina diaria de recuperacion.',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=80',
  },
  {
    episode: 'CRONICA DE PACIENTE - EPISODIO 4',
    title: 'Un Nuevo\nComienzo',
    quote: '"Recuperacion clinica y emocional."',
    text: 'Semana 8: pigmentacion reducida y mayor satisfaccion con el tratamiento.',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1600&q=80',
  },
];

export function StorytellingPresentationScreen({ product, onClose, onFinish }: StorytellingPresentationScreenProps) {
  const [slide, setSlide] = useState(0);
  const currentSlide = slides[slide];
  const next = slide === slides.length - 1 ? onFinish : () => setSlide((current) => Math.min(current + 1, slides.length - 1));

  return (
    <ImageBackground source={{ uri: currentSlide.image }} style={styles.screen}>
      <View style={styles.overlay} />
      <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
        <X size={28} color="#050505" />
      </Pressable>

      <View style={styles.productPill}>
        <View style={styles.dot} />
        <Text style={styles.pillText}>PRESENTACION DE PRODUCTO</Text>
        <Text style={styles.pillDivider}>|</Text>
        <Text style={styles.pillProduct}>{product.name}</Text>
      </View>

      <View style={styles.chapter}>
        <Text style={styles.chapterNumber}>{String(slide + 1).padStart(2, '0')}</Text>
        <Text style={styles.chapterLabel}>CAPITULO</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.episode}>{currentSlide.episode}</Text>
        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.quote}>{currentSlide.quote}</Text>
        <Text style={styles.text}>{currentSlide.text}</Text>
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
          {slides.map((item, index) => (
            <View key={item.episode} style={[styles.indicatorDot, slide === index && styles.indicatorDotActive]} />
          ))}
        </View>
        <Pressable onPress={next} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
          <Text style={styles.continueText}>{slide === slides.length - 1 ? 'CERRAR VISITA' : 'CONTINUAR'}</Text>
          <View style={styles.arrowBox}>
            <ArrowRight size={22} color={colors.onPrimary} />
          </View>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050505',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
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
    maxWidth: '45%',
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
  chapter: {
    position: 'absolute',
    top: 48,
    right: spacing.xl,
    zIndex: 11,
    alignItems: 'flex-end',
    transform: [{ translateY: 22 }],
  },
  chapterNumber: {
    color: colors.primary,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 42,
  },
  chapterLabel: {
    color: '#9A9A9A',
    fontSize: 12,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: '26%',
    paddingRight: spacing.xl,
    paddingBottom: 80,
  },
  episode: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.surface,
    fontSize: 76,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 92,
  },
  quote: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    marginTop: 46,
  },
  text: {
    maxWidth: 760,
    color: '#C8C8C8',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 36,
    marginTop: spacing.xl,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  roundButton: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  inactiveButton: {
    opacity: 0.35,
  },
  dots: {
    height: 42,
    minWidth: 180,
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
    minHeight: 86,
    borderRadius: 28,
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
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
