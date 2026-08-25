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
    title: 'Historial CRM',
    description: {
      visitador: 'Consulta tus visitas recientes, observaciones y seguimientos abiertos.',
      supervisor: 'Revisa el historial de visitas y oportunidades detectadas por el equipo.',
      facturacion: 'Consulta visitas con impacto comercial y solicitudes relacionadas.',
      jefe: 'Consulta el historial consolidado de visitas, resultados y seguimientos.',
      admin: 'Vista tecnica del historial CRM y actividad registrada.',
    },
    rows: ['Ultimas visitas', 'Seguimientos abiertos', 'Observaciones clave'],
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
  const isVisitsPlaceholder = type === 'visits';
  const metricCopy = isVisitsPlaceholder
    ? [
        { label: 'Visitas', value: '12', detail: 'Este ciclo', icon: <BarChart3 size={25} color={colors.primary} /> },
        { label: 'Seguimientos', value: '4', detail: 'Pendientes', icon: <ClipboardList size={25} color={colors.primary} /> },
        { label: 'Compra', value: '65%', detail: 'Resultado estimado', icon: <Icon size={25} color={colors.primary} /> },
      ]
    : [
        { label: 'Vista', value: getRoleLabel(role), detail: 'Permisos aplicados', icon: <BarChart3 size={25} color={colors.primary} /> },
        { label: 'Registros', value: '0', detail: 'Pendiente de datos reales', icon: <ClipboardList size={25} color={colors.primary} /> },
        { label: 'Estado', value: 'Base', detail: 'Fase 1 visual', icon: <Icon size={25} color={colors.primary} /> },
      ];
  const visitCards = [
    {
      title: 'Ultimas visitas',
      text: 'Dr. Ricardo Salinas - Nolasma presentado. Resultado: seguimiento pendiente.',
    },
    {
      title: 'Seguimientos abiertos',
      text: '4 clientes requieren contacto posterior por interes medio o solicitud de producto.',
    },
    {
      title: 'Observaciones clave',
      text: 'Mayor interes en dermatologia y antifungicos. Competencia reportada en 2 visitas.',
    },
  ];

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
        {metricCopy.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} icon={metric.icon} />
        ))}
      </View>

      <View style={[styles.panel, wide && styles.panelWide]}>
        {(isVisitsPlaceholder ? visitCards : data.rows.map((row) => ({ title: row, text: 'Estructura preparada para conectar formularios y datos reales en la siguiente iteracion.' }))).map(
          (card) => (
            <View key={card.title} style={styles.card}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardText}>{card.text}</Text>
            </View>
          ),
        )}
      </View>

      {isVisitsPlaceholder ? (
        <View style={styles.timelinePanel}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>Actividad reciente</Text>
            <Text style={styles.timelineBadge}>Demo</Text>
          </View>
          {[
            ['Hoy 10:00', 'Dra. Beatriz Mencos', 'Presentacion de linea - Interes 4/5'],
            ['Ayer 15:30', 'Farmacia San Pablo', 'Solicitud de seguimiento comercial'],
            ['Lun 09:00', 'Dr. Sergio Valdes', 'Sin compra, requiere nueva visita'],
          ].map(([time, name, detail]) => (
            <View key={`${time}-${name}`} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineCopy}>
                <Text style={styles.timelineName}>{name}</Text>
                <Text style={styles.timelineDetail}>{detail}</Text>
              </View>
              <Text style={styles.timelineTime}>{time}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
  timelinePanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  timelineBadge: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: 12,
    fontWeight: '900',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  timelineCopy: {
    flex: 1,
  },
  timelineName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  timelineDetail: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  timelineTime: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
});
