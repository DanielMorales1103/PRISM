import type { Product } from '@prism/shared';
import { ImageBackground, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ArrowLeft, BookOpen, Microscope, Play, Zap } from 'lucide-react-native';
import { colors, shadows, spacing } from '../theme/theme';

interface ExperienceDigitalScreenProps {
  product: Product;
  onBack: () => void;
  onStartInteractive: () => void;
  onStartStorytelling: () => void;
  onStartEvidence: () => void;
}

const options = [
  {
    key: 'interactive',
    title: 'Presentacion Interactiva',
    description: 'Experiencia rapida, moderna y altamente visual con contenido del producto.',
    icon: Zap,
    image: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=900&q=80',
    enabled: true,
  },
  {
    key: 'storytelling',
    title: 'Storytelling Medico',
    description: 'Narrativa medica centrada en casos humanos y recuperacion emocional.',
    icon: BookOpen,
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
    enabled: true,
  },
  {
    key: 'clinical',
    title: 'Evidencia Medica',
    description: 'Evidencia tecnica, estudios cientificos y resultados clave.',
    icon: Microscope,
    image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=900&q=80',
    enabled: true,
  },
];

export function ExperienceDigitalScreen({ product, onBack, onStartInteractive, onStartStorytelling, onStartEvidence }: ExperienceDigitalScreenProps) {
  const { width, height } = useWindowDimensions();
  const stacked = width < 900 || height > width;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft size={26} color={colors.surface} />
        </Pressable>
        <View>
          <Text style={styles.title}>Experiencia Digital</Text>
          <Text style={styles.productName}>{product.name}</Text>
        </View>
      </View>

      <View style={[styles.cards, stacked && styles.cardsStacked]}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Pressable
              key={option.key}
              disabled={!option.enabled}
              onPress={option.key === 'interactive' ? onStartInteractive : option.key === 'storytelling' ? onStartStorytelling : onStartEvidence}
              style={({ pressed }) => [styles.optionCard, stacked && styles.optionCardStacked, pressed && styles.pressed, !option.enabled && styles.disabledCard]}
            >
              <ImageBackground source={{ uri: option.image }} style={styles.cardImage} imageStyle={styles.cardImageStyle}>
                <View style={styles.overlay} />
                <View style={styles.iconBox}>
                  <Icon size={34} color={option.enabled ? colors.onPrimary : colors.surface} />
                </View>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
                <View style={styles.startRow}>
                  <Play size={22} color={colors.primary} fill={colors.primary} />
                  <Text style={styles.startText}>INICIAR EXPERIENCIA</Text>
                </View>
              </ImageBackground>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 54,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.surface,
    fontSize: 38,
    fontWeight: '900',
  },
  productName: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cards: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 34,
    paddingTop: spacing.sm,
  },
  cardsStacked: {
    flexDirection: 'column',
    gap: spacing.lg,
  },
  optionCard: {
    width: '29%',
    minWidth: 280,
    maxWidth: 480,
    height: '92%',
    maxHeight: 620,
    borderRadius: 36,
    overflow: 'hidden',
  },
  optionCardStacked: {
    width: '100%',
    maxWidth: 720,
    height: 240,
  },
  disabledCard: {
    opacity: 0.78,
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  cardImageStyle: {
    borderRadius: 36,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  cardTitle: {
    color: colors.surface,
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 38,
  },
  cardDescription: {
    color: '#D8D8D8',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 25,
    marginTop: spacing.md,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  startText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.84,
  },
});
