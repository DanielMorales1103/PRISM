import type { Doctor, Pharmacy, UserProfile, VisitPlan } from '@prism/shared';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  Activity,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Map as MapIcon,
  Megaphone,
  PackagePlus,
  PlusCircle,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react-native';
import { ActionCard } from '../components/ActionCard';
import { MetricCard } from '../components/MetricCard';
import { canManageCatalogs } from '../app/permissions';
import { AppScreen, SessionUser } from '../app/types';
import { colors, radius, spacing } from '../theme/theme';
import { api } from '../services/api';
import { loadToken } from '../services/session';

interface HomeScreenProps {
  user: SessionUser;
  onNavigate: (screen: AppScreen) => void;
}

const formattedDate = new Intl.DateTimeFormat('es-GT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

export function HomeScreen({ user, onNavigate }: HomeScreenProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 920;
  const canAdminister = canManageCatalogs(user.role);
  const isBilling = user.role === 'facturacion';
  const isSupervisor = user.role === 'supervisor';
  const isExecutive = user.role === 'jefe' || user.role === 'admin';
  const [plans, setPlans] = useState<VisitPlan[]>([]);
  const [clients, setClients] = useState<Array<Doctor | Pharmacy>>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);

  useEffect(() => {
    let live = true;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    void (async () => {
      try {
        const token = await loadToken();
        if (!token) throw new Error('Sesion no disponible.');
        const [planData, clientData, userData] = await Promise.all([
          api.getVisitPlans(token, start.toISOString(), end.toISOString()),
          api.getClients(),
          api.getUsers(),
        ]);
        if (!live) return;
        setPlans(planData.filter((plan) => plan.status === 'planned' || plan.status === 'rescheduled'));
        setClients([...clientData.doctors, ...clientData.pharmacies]);
        setUsers(userData);
      } catch {
        if (live) {
          setPlans([]);
          setClients([]);
          setUsers([]);
        }
      } finally {
        if (live) setAgendaLoading(false);
      }
    })();

    return () => { live = false; };
  }, []);

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const usersById = useMemo(() => new Map(users.map((visitador) => [visitador.id, visitador])), [users]);
  const subhead = isBilling
    ? 'Consulta clientes, ventas, cobros y documentos administrativos.'
    : isSupervisor
      ? 'Da seguimiento a planificaciones, cobertura y coaching del equipo.'
      : isExecutive
        ? 'Consulta indicadores consolidados y administra configuraciones del CRM.'
        : plans.length ? `Tienes ${plans.length} visita${plans.length === 1 ? '' : 's'} planificada${plans.length === 1 ? '' : 's'} para hoy.` : 'No tienes visitas planificadas para hoy.';
  const quickActions = [
    { title: 'Mapa', subtitle: 'Optimiza tu ruta', icon: <MapIcon size={34} color={colors.primary} />, screen: 'map' as const, visible: !isBilling },
    { title: 'Ranking', subtitle: 'Top visitadores', icon: <Trophy size={34} color={colors.primary} />, screen: 'dashboard' as const, visible: isSupervisor || isExecutive },
    { title: 'Historial', subtitle: 'CRM medico', icon: <Activity size={34} color={colors.text} />, screen: 'visits' as const, visible: !isBilling },
    { title: 'Reportes', subtitle: 'Analitica real', icon: <TrendingUp size={34} color={colors.primary} />, screen: 'dashboard' as const, visible: true },
    { title: 'Clientes', subtitle: 'Medicos y farmacias', icon: <Users size={34} color={colors.primary} />, screen: 'clients' as const, visible: isBilling },
    { title: 'Cobros', subtitle: 'Ventas y cartera', icon: <CreditCard size={34} color={colors.primary} />, screen: 'billing' as const, visible: isBilling },
  ].filter((action) => action.visible).slice(0, 4);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, wide && styles.headerWide]}>
        <View>
          <Text style={styles.greeting}>
            Hola, <Text style={styles.greetingName}>{user.name}</Text>
          </Text>
          <Text style={styles.subhead}>{formattedDate} - {subhead}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => onNavigate('planner')} style={({ pressed }) => [styles.calendarButton, pressed && styles.pressed]}>
            <CalendarDays size={23} color={colors.text} />
            <View style={styles.notificationDot} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.slice(0, 2).toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Visitas hoy" value={agendaLoading ? '...' : String(plans.length)} detail="Agenda real" icon={<Users size={25} color={colors.primary} />} />
        <MetricCard label="Meta mensual" value="82%" detail="Ciclo activo" icon={<Activity size={25} color={colors.primary} />} />
        <MetricCard label="Cobertura" value="74%" detail="Medicos A/B/C" icon={<TrendingUp size={25} color={colors.primary} />} />
      </View>

      <View style={[styles.heroActions, wide && styles.heroActionsWide]}>
        <ActionCard
          prominent
          title={isBilling ? 'Ventas y cobros' : 'Nueva Visita Medica'}
          subtitle={isBilling ? 'Consulta cobros, notas de credito y devoluciones.' : 'Inicia una presentacion interactiva ahora mismo.'}
          icon={isBilling ? <CreditCard size={42} color={colors.onPrimary} /> : <PlusCircle size={42} color={colors.onPrimary} />}
          style={[styles.primaryAction, wide && styles.primaryActionWide]}
          onPress={() => onNavigate(isBilling ? 'billing' : 'new-visit')}
        />
        <View style={[styles.quickGrid, wide && styles.quickGridWide]}>
          {quickActions.map((action) => (
            <ActionCard
              key={action.title}
              title={action.title}
              subtitle={action.subtitle}
              icon={action.icon}
              style={styles.quickCard}
              onPress={() => onNavigate(action.screen)}
            />
          ))}
        </View>
      </View>

      <View style={[styles.secondaryActions, wide && styles.secondaryActionsWide]}>
        {!isBilling && <ActionCard title="Marketing" subtitle="Reja promocional y muestras." icon={<Megaphone size={32} color={colors.primary} />} onPress={() => onNavigate('marketing')} />}
        {!isBilling && <ActionCard title="Capacitaciones" subtitle="Guías y material de estudio." icon={<BookOpenCheck size={32} color={colors.primary} />} onPress={() => onNavigate('coaching')} />}
        {canAdminister && (
          <ActionCard
            title="Administracion"
            subtitle="Usuarios, roles, productos y catalogos."
            icon={<PackagePlus size={32} color={colors.primary} />}
            onPress={() => onNavigate('admin-users')}
          />
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Agenda de hoy</Text>
          <Pressable onPress={() => onNavigate('planner')}><Text style={styles.sectionAction}>Ver todo</Text></Pressable>
        </View>
        {agendaLoading ? <Text style={styles.emptyAgenda}>Cargando agenda de hoy...</Text> : null}
        {!agendaLoading && plans.length === 0 ? <Text style={styles.emptyAgenda}>No hay visitas planificadas para hoy.</Text> : null}
        {plans.map((plan) => {
          const client = clientsById.get(plan.clientId);
          const visitador = usersById.get(plan.userId);
          const scheduledAt = new Date(plan.plannedDate);
          const meta = client?.type === 'doctor'
            ? `${client.specialty || 'Médico'}${client.hospitalOrClinic ? ` - ${client.hospitalOrClinic}` : ''}`
            : `${client?.category || 'Farmacia'} - ${client?.address || 'Sin dirección'}`;
          return (
          <Pressable key={plan.id} onPress={() => onNavigate('planner')} style={({ pressed }) => [styles.visitRow, pressed && styles.pressed]}>
            <View style={styles.visitIcon}>
              <Users size={19} color={colors.primary} />
            </View>
            <View style={styles.visitCopy}>
              <Text style={styles.visitName}>{client?.name ?? 'Cliente no disponible'}</Text>
              <Text style={styles.visitMeta}>{meta}{isExecutive || isSupervisor ? ` · ${visitador?.name ?? 'Visitador'}` : ''}</Text>
            </View>
            <View style={styles.visitTimeWrap}>
              <Text style={styles.visitTime}>{scheduledAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
              <Text style={styles.priority}>{plan.status === 'rescheduled' ? 'REPROGRAMADA' : 'PLANIFICADA'}</Text>
            </View>
            <ChevronRight size={20} color="#B8B8B8" />
          </Pressable>);
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.md,
  },
  headerWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  greetingName: {
    color: colors.primary,
  },
  subhead: {
    color: colors.muted,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD4C4',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  calendarButton: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    right: 10,
    top: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.72,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  heroActions: {
    gap: spacing.md,
  },
  heroActionsWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  primaryAction: {
    minHeight: 250,
  },
  primaryActionWide: {
    flex: 1.25,
    minHeight: 320,
  },
  quickGrid: {
    gap: spacing.md,
  },
  quickGridWide: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickCard: {
    minHeight: 148,
    minWidth: 220,
  },
  secondaryActions: {
    gap: spacing.md,
  },
  secondaryActionsWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F1F1F2',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  visitIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  visitCopy: {
    flex: 1,
  },
  visitName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  visitMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  visitTimeWrap: {
    alignItems: 'flex-end',
  },
  visitTime: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  priority: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  emptyAgenda: {
    color: colors.muted,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
});
