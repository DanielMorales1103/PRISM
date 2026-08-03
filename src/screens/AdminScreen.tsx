import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ClipboardList, Package, ShieldCheck, Users } from 'lucide-react-native';
import { MetricCard } from '../components/MetricCard';
import { colors, radius, spacing } from '../theme/theme';

interface AdminScreenProps {
  type: 'users' | 'products' | 'catalogs' | 'dashboard';
}

const copy = {
  users: {
    title: 'Usuarios y roles',
    description: 'Gestion inicial de visitadores, supervisores, facturacion y administradores.',
    rows: ['Daniella Morales - Visitador', 'Carlos Mendez - Supervisor', 'Admin Prism - Administrador'],
  },
  products: {
    title: 'Productos',
    description: 'Catalogo base para productos, lineas, muestras y presentaciones medicas.',
    rows: ['Nolasma - Activo', 'Epivate - Activo', 'Zoterb Tabs - Activo'],
  },
  catalogs: {
    title: 'Catalogos base',
    description: 'Especialidades, ciclos, departamentos, municipios y parametros del sistema.',
    rows: ['Especialidades medicas', 'Ciclos de trabajo', 'Departamentos y municipios'],
  },
  dashboard: {
    title: 'KPIs comerciales',
    description: 'Vista inicial para indicadores de visitas, cobertura, muestras y cumplimiento.',
    rows: ['Cobertura medicos - 74%', 'Cobertura farmacias - 61%', 'Coaching - Pendiente'],
  },
} as const;

export function AdminScreen({ type }: AdminScreenProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const data = copy[type];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.description}>{data.description}</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Registros" value="24" detail="Base inicial" icon={<ClipboardList size={25} color={colors.primary} />} />
        <MetricCard label="Activos" value="18" detail="Listos para demo" icon={<ShieldCheck size={25} color={colors.primary} />} />
        <MetricCard label="Pendientes" value="6" detail="Por cargar" icon={<Package size={25} color={colors.primary} />} />
      </View>

      <View style={[styles.panel, wide && styles.panelWide]}>
        <View style={styles.tableCard}>
          <Text style={styles.cardTitle}>Registros recientes</Text>
          {data.rows.map((row) => (
            <View key={row} style={styles.row}>
              <View style={styles.rowIcon}>
                <Users size={18} color={colors.primary} />
              </View>
              <Text style={styles.rowText}>{row}</Text>
              <Text style={styles.status}>Demo</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.cardTitle}>Fase 1</Text>
          <Text style={styles.noteText}>
            Esta pantalla replica la estructura administrativa inicial. En la siguiente etapa se conectara a backend, permisos reales y formularios completos.
          </Text>
        </View>
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
    maxWidth: 720,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  panel: {
    gap: spacing.md,
  },
  panelWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tableCard: {
    flex: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  noteCard: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderColor: '#FFD4C4',
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  status: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900',
  },
  noteText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
});
