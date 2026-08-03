import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, spacing } from '../theme/theme';

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  useEffect(() => {
    const timer = setTimeout(onDone, 1600);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <View style={[styles.screen, landscape && styles.landscape]}>
      <View style={styles.brandWrap}>
        <Text style={styles.logo}>PRISM</Text>
        <Text style={styles.product}>MedConnect</Text>
        <Text style={[styles.quote, landscape && styles.quoteWide]}>
          Transformando la visita medica a traves de tecnologia inteligente.
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Prism Life Sciences Guatemala</Text>
        <View style={styles.rule} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  landscape: {
    paddingHorizontal: spacing.xxl,
  },
  brandWrap: {
    alignItems: 'center',
  },
  logo: {
    color: colors.onPrimary,
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 0,
  },
  product: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  quote: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 18,
    lineHeight: 27,
    textAlign: 'center',
    marginTop: spacing.xl,
    maxWidth: 420,
  },
  quoteWide: {
    maxWidth: 560,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rule: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
