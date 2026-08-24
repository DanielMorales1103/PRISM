import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart3, BookOpenCheck, CalendarDays, ClipboardList, CreditCard, MapPinned, Megaphone, Users } from 'lucide-react-native';
import { AppRole } from '../app/types';
import { getRoleLabel } from '../app/roleLabels';
import { MetricCard } from '../components/MetricCard';
import { colors, radius, spacing } from '../theme/theme';

type ModuleScreenType = 'clients' | 'planner' | 'map' | 'visits' | 'marketing' | 'coaching' | 'billing';

interface ModuleScreenProps {
  role: AppRole;
  type: ModuleScreenType;
}

const moduleCopy = {
  clients: {
    title: 'Clientes asignados',
    description: {
      visitador: 'Consulta medicos, farmacias e instituciones asignadas a tu ruta.',
      supervisor: 'Consulta y da seguimiento a la cartera asignada a tu equipo.',
      facturacion: 'Consulta datos administrativos y comerciales de clientes.',
      jefe: 'Consulta la base consolidada de clientes del CRM.',
      admin: 'Vista tecnica de clientes registrados.',
    },
    rows: ['Medicos asignados', 'Farmacias asignadas', 'Instituciones asignadas'],
    icon: Users,
  },
  planner: {
    title: 'Planificador',
    description: {
      visitador: 'Organiza tu agenda semanal y el orden de visita diario.',
      supervisor: 'Revisa planificaciones del equipo y seguimiento de rutas.',
      facturacion: '',
      jefe: 'Consulta planificaciones generales y cobertura por equipo.',
      admin: 'Vista tecnica del planificador.',
    },
    rows: ['Semana activa', 'Visitas programadas', 'Pendientes de revision'],
    icon: CalendarDays,
  },
  map: {
    title: 'Mapa',
    description: {
      visitador: 'Visualiza ubicaciones de clientes asignados y rutas del dia.',
      supervisor: 'Visualiza ubicaciones del equipo y zonas de cobertura.',
      facturacion: '',
      jefe: 'Visualiza cobertura geográfica consolidada.',
      admin: 'Vista tecnica de ubicaciones.',
    },
    rows: ['Clientes con ubicacion', 'Rutas del dia', 'Zonas pendientes'],
    icon: MapPinned,
  },
  visits: {
    title: 'Visitas',
    description: {
      visitador: 'Registra y consulta el historial de tus visitas diarias.',
      supervisor: 'Consulta formularios y seguimiento de visitas del equipo.',
      facturacion: 'Consulta formularios de visita en modo lectura.',
      jefe: 'Consulta historial consolidado de visitas.',
      admin: 'Vista tecnica de formularios de visita.',
    },
    rows: ['Formulario diario', 'Historial de visitas', 'Observaciones'],
    icon: ClipboardList,
  },
  marketing: {
    title: 'Marketing',
    description: {
      visitador: 'Consulta reja promocional, productos foco y muestras por especialidad.',
      supervisor: 'Revisa lineamientos comerciales y cumplimiento de estrategia.',
      facturacion: '',
      jefe: 'Consulta y da seguimiento a lineamientos comerciales.',
      admin: 'Vista tecnica de marketing.',
    },
    rows: ['Reja promocional', 'Reja por especialidad', 'Productos foco'],
    icon: Megaphone,
  },
  coaching: {
    title: 'Coaching',
    description: {
      visitador: 'Accede a capacitaciones, recursos y evaluaciones asignadas.',
      supervisor: 'Consulta avance de coaching del equipo y evaluaciones.',
      facturacion: '',
      jefe: 'Consulta resultados generales de capacitaciones.',
      admin: 'Vista tecnica de coaching.',
    },
    rows: ['Materiales de estudio', 'Evaluaciones', 'Resultados'],
    icon: BookOpenCheck,
  },
  billing: {
    title: 'Ventas y cobros',
    description: {
      visitador: 'Consulta tus ventas, cobros y notas relacionadas.',
      supervisor: 'Consulta ventas y cobros del equipo.',
      facturacion: 'Gestiona facturacion, cobros, notas de credito y devoluciones.',
      jefe: 'Consulta informacion financiera y comercial consolidada.',
      admin: 'Vista tecnica de ventas y cobros.',
    },
    rows: ['Ventas', 'Cobros', 'Notas de credito'],
    icon: CreditCard,
  },
} as const;

export function ModuleScreen({ role, type }: ModuleScreenProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const data = moduleCopy[type];
  const Icon = data.icon;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon size={30} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.description}>{data.description[role]}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Vista" value={getRoleLabel(role)} detail="Permisos aplicados" icon={<BarChart3 size={25} color={colors.primary} />} />
        <MetricCard label="Registros" value="0" detail="Pendiente de datos reales" icon={<ClipboardList size={25} color={colors.primary} />} />
        <MetricCard label="Estado" value="Base" detail="Fase 1 visual" icon={<Icon size={25} color={colors.primary} />} />
      </View>

      <View style={[styles.panel, wide && styles.panelWide]}>
        {data.rows.map((row) => (
          <View key={row} style={styles.card}>
            <Text style={styles.cardTitle}>{row}</Text>
            <Text style={styles.cardText}>Estructura preparada para conectar formularios y datos reales en la siguiente iteracion.</Text>
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
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    maxWidth: 820,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderColor: '#FFD4C4',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
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
  },
  card: {
    flex: 1,
    minHeight: 132,
    minWidth: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  cardText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
});
