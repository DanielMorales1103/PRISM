import { StyleSheet, Text, View } from 'react-native';
import { targetTablet } from '../constants/device';
import { colors, spacing } from '../theme/theme';

export function WelcomeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Prism MedConnect</Text>
        <Text style={styles.title}>Base Android para tablet</Text>
        <Text style={styles.description}>
          Proyecto inicial en React Native/Expo para construir la app de visitadores medicos con roles, visitas, mapa, offline, KPI e integracion de datos.
        </Text>
        <View style={styles.specs}>
          <Text style={styles.spec}>Android {targetTablet.androidVersion}</Text>
          <Text style={styles.spec}>Modelo {targetTablet.model}</Text>
          <Text style={styles.spec}>{targetTablet.ramGb}GB RAM</Text>
          <Text style={styles.spec}>{targetTablet.storageGb}GB almacenamiento</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.xl,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  description: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 25,
    marginBottom: spacing.lg,
  },
  specs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  spec: {
    color: colors.text,
    backgroundColor: '#FFF1EC',
    borderColor: '#FFD4C4',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});
