import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  prominent?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export function ActionCard({ title, subtitle, icon, prominent, style, onPress }: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        prominent && styles.prominent,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.title, prominent && styles.prominentText]}>{title}</Text>
      <Text style={[styles.subtitle, prominent && styles.prominentSub]}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 150,
    minWidth: 180,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  prominent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  prominentText: {
    color: colors.onPrimary,
  },
  prominentSub: {
    color: 'rgba(255,255,255,0.82)',
  },
});
