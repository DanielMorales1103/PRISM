import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Activity, BookOpenCheck, Calendar, CreditCard, Map, Megaphone, PackagePlus, PlusCircle, TrendingUp, Users } from 'lucide-react-native';
import { ActionCard } from '../components/ActionCard';
import { MetricCard } from '../components/MetricCard';
import { canManageCatalogs } from '../app/permissions';
import { AppScreen, SessionUser } from '../app/types';
import { colors, radius, spacing } from '../theme/theme';

interface HomeScreenProps {
  user: SessionUser;
  onNavigate: (screen: AppScreen) => void;
}

const agenda = [
  { name: 'Dr. Ricardo Salinas', meta: 'Dermatologia - Hospital Herrera Llerandi', time: '14:30', priority: 'Alta' },
  { name: 'Dra. Beatriz Mencos', meta: 'Pediatria - Centro Medico Z.10', time: '15:45', priority: 'Media' },
  { name: 'Farmacia San Pablo', meta: 'Tipo A - Zona 10', time: '17:00', priority: 'Alta' },
];

export function HomeScreen({ user, onNavigate }: HomeScreenProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 920;
  const canAdminister = canManageCatalogs(user.role);
  const isBilling = user.role === 'facturacion';
  const isSupervisor = user.role === 'supervisor';
  const isExecutive = user.role === 'jefe' || user.role === 'admin';
  const subhead = isBilling
    ? 'Consulta clientes, ventas, cobros y documentos administrativos.'
    : isSupervisor
      ? 'Da seguimiento a planificaciones, cobertura y coaching del equipo.'
      : isExecutive
        ? 'Consulta indicadores consolidados y administra configuraciones del CRM.'
        : 'Tienes 4 visitas prioritarias y 2 pendientes de sincronizar.';

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, wide && styles.headerWide]}>
        <View>
          <Text style={styles.greeting}>Hola, {user.name}</Text>
          <Text style={styles.subhead}>{subhead}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.slice(0, 2).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Visitas hoy" value="12" detail="+8% vs semana" icon={<Users size={25} color={colors.primary} />} />
        <MetricCard label="Meta mensual" value="82%" detail="Ciclo activo" icon={<Activity size={25} color={colors.primary} />} />
        <MetricCard label="Cobertura" value="74%" detail="Medicos A/B/C" icon={<TrendingUp size={25} color={colors.primary} />} />
      </View>

      <View style={[styles.actions, wide && styles.actionsWide]}>
        {!isBilling && (
          <ActionCard
            prominent
            title={isSupervisor || isExecutive ? 'Seguimiento de visitas' : 'Nueva visita medica'}
            subtitle={isSupervisor || isExecutive ? 'Revisa formularios, cobertura y observaciones.' : 'Registra visita, muestras y observaciones.'}
            icon={<PlusCircle size={34} color={colors.onPrimary} />}
            onPress={() => onNavigate('visits')}
          />
        )}
        {isBilling && (
          <ActionCard
            prominent
            title="Ventas y cobros"
            subtitle="Consulta cobros, notas de credito y devoluciones."
            icon={<CreditCard size={34} color={colors.onPrimary} />}
            onPress={() => onNavigate('billing')}
          />
        )}
        <ActionCard title="Clientes" subtitle="Medicos, farmacias e instituciones." icon={<Users size={32} color={colors.primary} />} onPress={() => onNavigate('clients')} />
        {!isBilling && <ActionCard title="Agenda" subtitle="Planificador diario y semanal." icon={<Calendar size={32} color={colors.primary} />} onPress={() => onNavigate('planner')} />}
        {!isBilling && <ActionCard title="Mapa" subtitle="Ubicaciones y rutas asignadas." icon={<Map size={32} color={colors.primary} />} onPress={() => onNavigate('map')} />}
        {!isBilling && <ActionCard title="Marketing" subtitle="Reja promocional y muestras." icon={<Megaphone size={32} color={colors.primary} />} onPress={() => onNavigate('marketing')} />}
        {!isBilling && <ActionCard title="Coaching" subtitle="Capacitaciones y evaluaciones." icon={<BookOpenCheck size={32} color={colors.primary} />} onPress={() => onNavigate('coaching')} />}
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
          <Text style={styles.sectionAction}>Ver todo</Text>
        </View>
        {agenda.map((visit) => (
          <View key={visit.name} style={styles.visitRow}>
            <View style={styles.visitIcon}>
              <Users size={19} color={colors.primary} />
            </View>
            <View style={styles.visitCopy}>
              <Text style={styles.visitName}>{visit.name}</Text>
              <Text style={styles.visitMeta}>{visit.meta}</Text>
            </View>
            <View style={styles.visitTimeWrap}>
              <Text style={styles.visitTime}>{visit.time}</Text>
              <Text style={styles.priority}>{visit.priority}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
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
  subhead: {
    color: colors.muted,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  avatar: {
    width: 54,
    height: 54,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  actionsWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
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
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
});
