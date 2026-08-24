import {
  BarChart3,
  BookOpenCheck,
  CreditCard,
  History,
  Home,
  LogOut,
  Map,
  Megaphone,
  PackagePlus,
  Settings,
  Users,
} from 'lucide-react-native';
import { ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { canAccessScreen } from '../app/permissions';
import { getRoleLabel } from '../app/roleLabels';
import { AppRole, AppScreen } from '../app/types';
import { colors, radius, spacing } from '../theme/theme';

interface SidebarProps {
  active: AppScreen;
  compact: boolean;
  role: AppRole;
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => void;
}

const items: Array<{ screen: AppScreen; label: string; icon: ComponentType<{ size: number; color: string }> }> = [
  { screen: 'home', label: 'Inicio', icon: Home },
  { screen: 'dashboard', label: 'KPIs Comerciales', icon: BarChart3 },
  { screen: 'clients', label: 'Clientes', icon: Users },
  { screen: 'map', label: 'Mapa Inteligente', icon: Map },
  { screen: 'visits', label: 'Historial CRM', icon: History },
  { screen: 'marketing', label: 'Marketing', icon: Megaphone },
  { screen: 'coaching', label: 'Coaching', icon: BookOpenCheck },
  { screen: 'billing', label: 'Ventas/Cobros', icon: CreditCard },
  { screen: 'admin-users', label: 'Usuarios', icon: Settings },
  { screen: 'admin-products', label: 'Productos', icon: PackagePlus },
];

export function Sidebar({ active, compact, role, onNavigate, onLogout }: SidebarProps) {
  const visibleItems = items.filter((item) => canAccessScreen(role, item.screen));

  return (
    <View style={[styles.sidebar, compact && styles.compact]}>
      <View style={styles.logoBlock}>
        <Text style={styles.logo}>PRISM</Text>
        {!compact && <Text style={styles.tagline}>MedConnect</Text>}
        {!compact && <Text style={styles.roleLabel}>{getRoleLabel(role)}</Text>}
      </View>
      <ScrollView
        contentContainerStyle={[styles.nav, compact && styles.navCompact]}
        showsVerticalScrollIndicator={false}
        style={styles.navScroll}
      >
        {visibleItems.map((item) => {
          const selected = active === item.screen;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.screen}
              onPress={() => onNavigate(item.screen)}
              style={[styles.navItem, selected && styles.navItemActive, compact && styles.navItemCompact]}
            >
              <Icon size={22} color={selected ? colors.primary : colors.muted} />
              <Text style={[styles.navText, selected && styles.navTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
    paddingBottom: spacing.md,
  },
  navScroll: {
    flex: 1,
  },
  navCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  navItem: {
    minHeight: 46,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'flex-start',
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
