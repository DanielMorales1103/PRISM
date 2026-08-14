import { LogOut } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { canAccessScreen } from '../app/permissions';
import { AppRole, AppScreen } from '../app/types';
import { colors, radius, spacing } from '../theme/theme';

interface SidebarProps {
  active: AppScreen;
  compact: boolean;
  role: AppRole;
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => void;
}

const items: Array<{ screen: AppScreen; label: string }> = [
  { screen: 'home', label: 'Inicio' },
  { screen: 'dashboard', label: 'KPIs' },
  { screen: 'clients', label: 'Clientes' },
  { screen: 'planner', label: 'Planificador' },
  { screen: 'map', label: 'Mapa' },
  { screen: 'visits', label: 'Visitas' },
  { screen: 'marketing', label: 'Marketing' },
  { screen: 'coaching', label: 'Coaching' },
  { screen: 'billing', label: 'Ventas/Cobros' },
  { screen: 'admin-users', label: 'Usuarios' },
  { screen: 'admin-products', label: 'Productos' },
  { screen: 'admin-catalogs', label: 'Catalogos' },
];

export function Sidebar({ active, compact, role, onNavigate, onLogout }: SidebarProps) {
  const visibleItems = items.filter((item) => canAccessScreen(role, item.screen));

  return (
    <View style={[styles.sidebar, compact && styles.compact]}>
      <View style={styles.logoBlock}>
        <Text style={styles.logo}>PRISM</Text>
        {!compact && <Text style={styles.tagline}>MedConnect</Text>}
        {!compact && <Text style={styles.roleLabel}>{role}</Text>}
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
      <Pressable onPress={onLogout} style={[styles.logout, compact && styles.logoutCompact]}>
        <LogOut size={17} color={colors.muted} />
        <Text style={styles.logoutText}>Salir</Text>
      </Pressable>
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
  roleLabel: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: 'capitalize',
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
  logout: {
    marginTop: 'auto',
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  logoutCompact: {
    alignSelf: 'flex-start',
    marginTop: 0,
  },
  logoutText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
});
