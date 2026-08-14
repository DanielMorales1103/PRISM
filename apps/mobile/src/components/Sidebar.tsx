import { Pressable, StyleSheet, Text, View } from 'react-native';
import { canAccessScreen } from '../app/permissions';
import { AppRole, AppScreen } from '../app/types';
import { colors, radius, spacing } from '../theme/theme';

interface SidebarProps {
  active: AppScreen;
  compact: boolean;
  role: AppRole;
  onNavigate: (screen: AppScreen) => void;
}

const items: Array<{ screen: AppScreen; label: string }> = [
  { screen: 'home', label: 'Inicio' },
  { screen: 'dashboard', label: 'KPIs' },
  { screen: 'admin-users', label: 'Usuarios' },
  { screen: 'admin-products', label: 'Productos' },
  { screen: 'admin-catalogs', label: 'Catalogos' },
];

export function Sidebar({ active, compact, role, onNavigate }: SidebarProps) {
  const visibleItems = items.filter((item) => canAccessScreen(role, item.screen));

  return (
    <View style={[styles.sidebar, compact && styles.compact]}>
      <View style={styles.logoBlock}>
        <Text style={styles.logo}>PRISM</Text>
        {!compact && <Text style={styles.tagline}>MedConnect</Text>}
      </View>
      <View style={[styles.nav, compact && styles.navCompact]}>
        {visibleItems.map((item) => {
          const selected = active === item.screen;
          return (
            <Pressable
              key={item.screen}
              onPress={() => onNavigate(item.screen)}
              style={[styles.navItem, selected && styles.navItemActive, compact && styles.navItemCompact]}
            >
              <Text style={[styles.navText, selected && styles.navTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 248,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  compact: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  logoBlock: {
    gap: 2,
  },
  logo: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  tagline: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  nav: {
    gap: spacing.sm,
  },
  navCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  navItem: {
    minHeight: 46,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  navItemCompact: {
    minHeight: 38,
  },
  navItemActive: {
    backgroundColor: colors.primarySoft,
  },
  navText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  navTextActive: {
    color: colors.primary,
  },
});
