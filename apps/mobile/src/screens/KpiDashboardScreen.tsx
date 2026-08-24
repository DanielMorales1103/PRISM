import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, CreditCard, Store, Target, TrendingUp, Users } from 'lucide-react-native';
import { colors, shadows, spacing } from '../theme/theme';

interface KpiDashboardScreenProps {
  onBack: () => void;
}

type DashboardMode = 'summary' | 'detail';

interface TooltipState {
  key: string;
  title: string;
  lines: Array<{ label: string; value: string; color: string }>;
}

const networkData = {
  doctors: [
    { label: 'Sem 1', real: 48, goal: 50 },
    { label: 'Sem 2', real: 52, goal: 50 },
    { label: 'Sem 3', real: 45, goal: 50 },
    { label: 'Sem 4', real: 55, goal: 50 },
    { label: 'Sem 5', real: 42, goal: 50 },
  ],
  pharmacies: [
    { label: 'Sem 1', real: 8, goal: 10 },
    { label: 'Sem 2', real: 12, goal: 10 },
    { label: 'Sem 3', real: 9, goal: 10 },
    { label: 'Sem 4', real: 11, goal: 10 },
    { label: 'Sem 5', real: 10, goal: 10 },
  ],
};

const frequencyData = [
  { label: 'C1', doctors: 7.2, pharmacies: 6.8, trend: 'Base', detail: 'Punto inicial del seguimiento del ciclo.' },
  { label: 'C2', doctors: 8.5, pharmacies: 7.2, trend: '+18% medicos', detail: 'Medicos subieron 1.3 puntos y farmacias 0.4 vs C1.' },
  { label: 'C3', doctors: 8.8, pharmacies: 8.1, trend: 'Estable', detail: 'Frecuencia medica estable y mejora visible en farmacias.' },
  { label: 'C4', doctors: 9.2, pharmacies: 8.5, trend: 'Mejorando', detail: 'Mejor desempeno del periodo, cerca de la meta de 10 visitas.' },
];

const financialData = [
  { label: 'Ene', ventasReal: 18000, ventasMeta: 20000, cobrosReal: 15000, cobrosMeta: 18000 },
  { label: 'Feb', ventasReal: 22000, ventasMeta: 20000, cobrosReal: 19000, cobrosMeta: 18000 },
  { label: 'Mar', ventasReal: 20000, ventasMeta: 22000, cobrosReal: 21000, cobrosMeta: 20000 },
  { label: 'Abr', ventasReal: 24000, ventasMeta: 22000, cobrosReal: 22000, cobrosMeta: 20000 },
];

export function KpiDashboardScreen({ onBack }: KpiDashboardScreenProps) {
  const [mode, setMode] = useState<DashboardMode>('summary');
  const { width } = useWindowDimensions();
  const wide = width >= 980;

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerIcon}>
          <BarChart3 size={28} color={colors.onPrimary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Panel de Desempeno</Text>
          <Text style={styles.subtitle}>CICLO 4 - MAYO 2026</Text>
        </View>
        <View style={styles.segment}>
          <Pressable onPress={() => setMode('summary')} style={[styles.segmentOption, mode === 'summary' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'summary' && styles.segmentTextActive]}>Resumen</Text>
          </Pressable>
          <Pressable onPress={() => setMode('detail')} style={[styles.segmentOption, mode === 'detail' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'detail' && styles.segmentTextActive]}>Detallado</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.metricGrid}>
          <SummaryCard icon={Users} label="Cobertura medicos" value="232/250" accent="92.8%" detail="Ciclo: 5 semanas" delta="+5%" />
          <SummaryCard icon={Store} label="Cobertura farmacias" value="45/50" accent="90%" detail="Territorio asignado" delta="+2%" darkIcon />
          <SummaryCard icon={Clock3} label="Frecuencia medicos" value="9.2" accent="Optimo" detail="Meta: 10 visitas/ano" delta="Estable" />
          <SummaryCard icon={TrendingUp} label="Ventas del ciclo" value="Q 18,240" accent="91.2%" detail="Meta: Q 20,000" delta="+12%" />
        </View>

        <SectionTitle icon={Target} title="Cobertura de Red" />
        <View style={[styles.twoColumn, !wide && styles.stacked]}>
          <BarChartCard title="Medicos" data={networkData.doctors} max={60} realColor={colors.primary} />
          <BarChartCard title="Farmacias" data={networkData.pharmacies} max={12} realColor={colors.black} />
        </View>

        <SectionTitle icon={Clock3} title="Analisis de Frecuencia" />
        <FrequencySummaryCard />

        <View style={[styles.twoColumn, !wide && styles.stacked]}>
          <VisitResultCard />
          <View style={styles.sideStack}>
            <PercentageRow icon={CheckCircle2} title="Visitados/Compra" subtitle="Frecuencia acumulada del periodo" value="65%" active />
            <PercentageRow icon={Clock3} title="Visitados/Sin Compra" subtitle="Frecuencia acumulada del periodo" value="25%" />
            <PercentageRow icon={CheckCircle2} title="No Visitados" subtitle="Frecuencia acumulada del periodo" value="10%" />
            <View style={styles.noteCard}>
              <View style={styles.noteAccent} />
              <Text style={styles.noteTitle}>Trazabilidad Comercial</Text>
              <Text style={styles.noteText}>Control mock de cada cliente visitado, compras registradas y razones de no compra para mejorar estrategia.</Text>
            </View>
          </View>
        </View>

        {mode === 'detail' && (
          <>
            <SectionTitle icon={CreditCard} title="Control Financiero" />
            <FinancialChartCard />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
  detail,
  delta,
  darkIcon = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: string;
  detail: string;
  delta: string;
  darkIcon?: boolean;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, darkIcon && styles.summaryIconNeutral]}>
        <Icon size={25} color={darkIcon ? colors.black : colors.primary} />
      </View>
      <Text style={styles.deltaBadge}>{delta}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardAccent}>{accent}</Text>
      </View>
      <Text style={styles.cardDetail}>{detail}</Text>
    </View>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Target; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Icon size={26} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function BarChartCard({ title, data, max, realColor }: { title: string; data: typeof networkData.doctors; max: number; realColor: string }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  return (
    <View style={styles.chartCard}>
      <ChartHeader title={title} labels={[['Real', realColor], ['Meta', '#E9E9E9']]} />
      <View style={styles.barChartArea}>
        {[0, 1, 2, 3].map((line) => (
          <View key={line} style={[styles.gridLine, { bottom: `${line * 25}%` }]} />
        ))}
        <View style={styles.barGroups}>
          {data.map((item) => {
            const key = `${title}-${item.label}`;
            const active = tooltip?.key === key;
            return (
              <Pressable
                key={item.label}
                onHoverIn={() =>
                  setTooltip({
                    key,
                    title: item.label,
                    lines: [
                      { label: 'meta', value: String(item.goal), color: '#E9E9E9' },
                      { label: 'real', value: String(item.real), color: realColor },
                    ],
                  })
                }
                onHoverOut={() => setTooltip(null)}
                onPress={() =>
                  setTooltip((current) =>
                    current?.key === key
                      ? null
                      : {
                          key,
                          title: item.label,
                          lines: [
                            { label: 'meta', value: String(item.goal), color: '#E9E9E9' },
                            { label: 'real', value: String(item.real), color: realColor },
                          ],
                        },
                  )
                }
                style={[styles.barGroup, active && styles.activeChartItem]}
              >
                <View style={styles.barPair}>
                  <View style={[styles.bar, { height: `${(item.real / max) * 100}%`, backgroundColor: realColor }]} />
                  <View style={[styles.bar, { height: `${(item.goal / max) * 100}%`, backgroundColor: '#E9E9E9' }]} />
                </View>
                <Text style={styles.axisLabel}>{item.label}</Text>
                {active && <Tooltip title={tooltip.title} lines={tooltip.lines} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function FrequencySummaryCard() {
  const [selectedCycle, setSelectedCycle] = useState(frequencyData[1]);
  const averages = useMemo(
    () => ({
      doctors: (frequencyData.reduce((total, item) => total + item.doctors, 0) / frequencyData.length).toFixed(1),
      pharmacies: (frequencyData.reduce((total, item) => total + item.pharmacies, 0) / frequencyData.length).toFixed(1),
    }),
    [],
  );

  return (
    <View style={styles.frequencyCard}>
      <ChartHeader title="Resumen de Frecuencia por Ciclo" subtitle="Medicos vs farmacias" labels={[['Medicos', colors.primary], ['Farmacias', colors.black]]} />
      <View style={styles.frequencyBody}>
        <View style={styles.frequencyTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeadText, styles.cycleColumn]}>Ciclo</Text>
            <Text style={styles.tableHeadText}>Medicos</Text>
            <Text style={styles.tableHeadText}>Farmacias</Text>
            <Text style={styles.tableHeadText}>Tendencia</Text>
          </View>
          {frequencyData.map((item) => {
            const selected = selectedCycle.label === item.label;

            return (
              <Pressable
                key={item.label}
                onHoverIn={() => setSelectedCycle(item)}
                onPress={() => setSelectedCycle(item)}
                style={[styles.tableRow, selected && styles.tableRowActive]}
              >
                <Text style={[styles.tableCellStrong, styles.cycleColumn]}>{item.label}</Text>
                <Text style={styles.tableCellOrange}>{item.doctors}</Text>
                <Text style={styles.tableCell}>{item.pharmacies}</Text>
                <Text style={styles.tableCellStrong}>{item.trend}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.frequencyDetail}>
          <Text style={styles.detailEyebrow}>Detalle seleccionado</Text>
          <Text style={styles.detailTitle}>{selectedCycle.label}</Text>
          <Text style={styles.detailText}>{selectedCycle.detail}</Text>
          <View style={styles.averageGrid}>
            <View style={styles.averageCard}>
              <Text style={styles.averageValue}>{averages.doctors}</Text>
              <Text style={styles.averageLabel}>Prom. medicos</Text>
            </View>
            <View style={styles.averageCard}>
              <Text style={styles.averageValue}>{averages.pharmacies}</Text>
              <Text style={styles.averageLabel}>Prom. farmacias</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function VisitResultCard() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const lines = [
    { label: 'Visitados/Compra', value: '65', color: colors.primary },
    { label: 'Visitados/Sin Compra', value: '25', color: colors.black },
    { label: 'No visitados', value: '10', color: '#BDBDBD' },
  ];

  return (
    <Pressable
      onHoverIn={() => setTooltip({ key: 'visit-result', title: 'Resultado de Visitas', lines })}
      onHoverOut={() => setTooltip(null)}
      onPress={() => setTooltip((current) => (current ? null : { key: 'visit-result', title: 'Resultado de Visitas', lines }))}
      style={styles.donutCard}
    >
      <Text style={styles.cardHeading}>Resultado de Visitas</Text>
      <View style={styles.donutWrap}>
        <View style={styles.donutOuter}>
          <View style={styles.donutInner}>
            <Text style={styles.donutValue}>90%</Text>
            <Text style={styles.donutLabel}>EJECUCION</Text>
          </View>
        </View>
        {tooltip && <Tooltip title={tooltip.title} lines={tooltip.lines} />}
      </View>
    </Pressable>
  );
}

function PercentageRow({ icon: Icon, title, subtitle, value, active = false }: { icon: typeof CheckCircle2; title: string; subtitle: string; value: string; active?: boolean }) {
  return (
    <View style={styles.percentRow}>
      <View style={[styles.percentIcon, active && styles.percentIconActive]}>
        <Icon size={25} color={active ? colors.primary : '#9C9C9C'} />
      </View>
      <View style={styles.percentCopy}>
        <Text style={styles.percentTitle}>{title}</Text>
        <Text style={styles.percentSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.percentValue}>{value}</Text>
    </View>
  );
}

function FinancialChartCard() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const max = 24000;

  return (
    <View style={styles.financialCard}>
      <ChartHeader
        title="Metas vs Actuales"
        subtitle="Ventas & cobros / comparativo trimestral"
        labels={[
          ['Ventas real', colors.primary],
          ['Ventas meta', '#F9D7C8'],
          ['Cobros real', colors.black],
          ['Cobros meta', '#DFDFDF'],
        ]}
      />
      <View style={styles.financialArea}>
        {[0, 1, 2, 3, 4].map((line) => (
          <View key={line} style={[styles.gridLine, { bottom: `${line * 24}%` }]} />
        ))}
        <View style={styles.financialGroups}>
          {financialData.map((item) => {
            const key = `financial-${item.label}`;
            const active = tooltip?.key === key;
            return (
              <Pressable
                key={item.label}
                onHoverIn={() =>
                  setTooltip({
                    key,
                    title: item.label,
                    lines: [
                      { label: 'cobros_meta', value: String(item.cobrosMeta), color: '#DFDFDF' },
                      { label: 'cobros_real', value: String(item.cobrosReal), color: colors.black },
                      { label: 'ventas_meta', value: String(item.ventasMeta), color: '#F9D7C8' },
                      { label: 'ventas_real', value: String(item.ventasReal), color: colors.primary },
                    ],
                  })
                }
                onHoverOut={() => setTooltip(null)}
                onPress={() =>
                  setTooltip((current) =>
                    current?.key === key
                      ? null
                      : {
                          key,
                          title: item.label,
                          lines: [
                            { label: 'cobros_meta', value: String(item.cobrosMeta), color: '#DFDFDF' },
                            { label: 'cobros_real', value: String(item.cobrosReal), color: colors.black },
                            { label: 'ventas_meta', value: String(item.ventasMeta), color: '#F9D7C8' },
                            { label: 'ventas_real', value: String(item.ventasReal), color: colors.primary },
                          ],
                        },
                  )
                }
                style={[styles.financialGroup, active && styles.activeChartItem]}
              >
                <View style={styles.financialBarSet}>
                  <View style={[styles.financialBar, { height: `${(item.ventasReal / max) * 100}%`, backgroundColor: colors.primary }]} />
                  <View style={[styles.financialBar, { height: `${(item.ventasMeta / max) * 100}%`, backgroundColor: '#F9D7C8' }]} />
                  <View style={[styles.financialBar, { height: `${(item.cobrosReal / max) * 100}%`, backgroundColor: colors.black }]} />
                  <View style={[styles.financialBar, { height: `${(item.cobrosMeta / max) * 100}%`, backgroundColor: '#DFDFDF' }]} />
                </View>
                <Text style={styles.axisLabel}>{item.label}</Text>
                {active && <Tooltip title={tooltip.title} lines={tooltip.lines} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function ChartHeader({ title, subtitle, labels }: { title: string; subtitle?: string; labels: Array<[string, string]> }) {
  return (
    <View style={styles.chartHeader}>
      <View>
        {subtitle && <Text style={styles.chartSubtitle}>{subtitle}</Text>}
        <Text style={styles.chartTitle}>{title}</Text>
      </View>
      <View style={styles.legend}>
        {labels.map(([label, color]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Tooltip({ title, lines }: { title: string; lines: TooltipState['lines'] }) {
  return (
    <View style={styles.tooltip}>
      <Text style={styles.tooltipTitle}>{title}</Text>
      {lines.map((line) => (
        <Text key={line.label} style={[styles.tooltipLine, { color: line.color }]}>
          {line.label}: {line.value}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topbar: {
    minHeight: 112,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.black,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: '#A7A7A7',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
  },
  segment: {
    minHeight: 48,
    borderRadius: 22,
    backgroundColor: '#EFEFEF',
    flexDirection: 'row',
    padding: 4,
  },
  segmentOption: {
    minWidth: 106,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  segmentText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.black,
  },
  content: {
    paddingHorizontal: 120,
    paddingTop: 52,
    paddingBottom: 80,
    gap: spacing.xl,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    minWidth: 245,
    minHeight: 215,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    position: 'relative',
    ...shadows.card,
  },
  summaryIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconNeutral: {
    backgroundColor: '#F0F0F0',
  },
  deltaBadge: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    borderRadius: 10,
    backgroundColor: '#F3F3F3',
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cardLabel: {
    color: '#A9A9A9',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: spacing.xl,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardValue: {
    color: colors.black,
    fontSize: 29,
    fontWeight: '900',
  },
  cardAccent: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  cardDetail: {
    color: '#8C8C8C',
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.black,
    fontSize: 25,
    fontWeight: '900',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stacked: {
    flexDirection: 'column',
  },
  chartCard: {
    flex: 1,
    minHeight: 420,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  chartTitle: {
    color: colors.black,
    fontSize: 20,
    fontWeight: '900',
  },
  chartSubtitle: {
    color: '#8B8B8B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  barChartArea: {
    flex: 1,
    marginTop: spacing.xl,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  barGroups: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barGroup: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  activeChartItem: {
    zIndex: 40,
    elevation: 40,
  },
  barPair: {
    height: '84%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bar: {
    width: 42,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  axisLabel: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  frequencyCard: {
    minHeight: 390,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  frequencyBody: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  frequencyTable: {
    flex: 1.5,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    minHeight: 54,
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  tableHeadText: {
    flex: 1,
    color: '#9A9A9A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tableRow: {
    minHeight: 62,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  tableRowActive: {
    backgroundColor: colors.primarySoft,
  },
  cycleColumn: {
    flex: 0.7,
  },
  tableCell: {
    flex: 1,
    color: colors.black,
    fontSize: 17,
    fontWeight: '800',
  },
  tableCellOrange: {
    flex: 1,
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  tableCellStrong: {
    flex: 1,
    color: colors.black,
    fontSize: 17,
    fontWeight: '900',
  },
  frequencyDetail: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    padding: spacing.xl,
  },
  detailEyebrow: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  detailTitle: {
    color: colors.black,
    fontSize: 34,
    fontWeight: '900',
    marginTop: spacing.md,
  },
  detailText: {
    color: '#6F6F6F',
    fontSize: 16,
    lineHeight: 25,
    marginTop: spacing.md,
  },
  averageGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  averageCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  averageValue: {
    color: colors.black,
    fontSize: 26,
    fontWeight: '900',
  },
  averageLabel: {
    color: '#8F8F8F',
    fontSize: 12,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  donutCard: {
    flex: 1,
    minHeight: 520,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  cardHeading: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '900',
  },
  donutWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutOuter: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 34,
    borderColor: colors.primary,
    borderBottomColor: colors.black,
    borderRightColor: '#CFCFCF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-40deg' }],
  },
  donutInner: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '40deg' }],
  },
  donutValue: {
    color: colors.black,
    fontSize: 38,
    fontWeight: '900',
  },
  donutLabel: {
    color: '#B0B0B0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sideStack: {
    flex: 1,
    gap: spacing.lg,
  },
  percentRow: {
    minHeight: 110,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadows.card,
  },
  percentIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentIconActive: {
    backgroundColor: colors.primarySoft,
  },
  percentCopy: {
    flex: 1,
  },
  percentTitle: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '900',
  },
  percentSubtitle: {
    color: '#8F8F8F',
    fontSize: 13,
    marginTop: spacing.xs,
  },
  percentValue: {
    color: colors.black,
    fontSize: 28,
    fontWeight: '900',
  },
  noteCard: {
    minHeight: 200,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  noteAccent: {
    width: 6,
    height: 32,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  noteTitle: {
    color: colors.black,
    fontSize: 23,
    fontWeight: '900',
  },
  noteText: {
    color: '#6F6F6F',
    fontSize: 16,
    lineHeight: 26,
    marginTop: spacing.lg,
  },
  financialCard: {
    minHeight: 620,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  financialArea: {
    flex: 1,
    marginTop: spacing.xl,
    position: 'relative',
  },
  financialGroups: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  financialGroup: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  financialBarSet: {
    height: '86%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  financialBar: {
    width: 58,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tooltip: {
    position: 'absolute',
    zIndex: 100,
    left: '48%',
    top: '28%',
    minWidth: 150,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
    elevation: 100,
  },
  tooltipTitle: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  tooltipLine: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.84,
  },
});
