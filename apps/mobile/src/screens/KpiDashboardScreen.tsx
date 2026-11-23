import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ArrowLeft, BarChart3, BookOpenCheck, Building2, ChevronDown, CircleDollarSign, Pencil, Save, Stethoscope, Users } from 'lucide-react-native';
import { SessionUser } from '../app/types';
import { api, KpiDashboardResponse, KpiGoalValues } from '../services/api';
import { loadToken } from '../services/session';
import { colors, shadows, spacing } from '../theme/theme';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface KpiDashboardScreenProps { currentUser: SessionUser; onBack: () => void; }
type Mode = 'summary' | 'detail';
type GoalDraft = { doctorVisits: string; pharmacyVisits: string; salesAmount: string; collectionAmount: string };

const toDraft = (values?: KpiGoalValues): GoalDraft => ({
  doctorVisits: String(values?.doctorVisits ?? 0), pharmacyVisits: String(values?.pharmacyVisits ?? 0),
  salesAmount: String(values?.salesAmount ?? 0), collectionAmount: String(values?.collectionAmount ?? 0),
});
const toValues = (draft: GoalDraft): KpiGoalValues => ({
  doctorVisits: Number(draft.doctorVisits) || 0, pharmacyVisits: Number(draft.pharmacyVisits) || 0,
  salesAmount: Number(draft.salesAmount) || 0, collectionAmount: Number(draft.collectionAmount) || 0,
});
const totalGoals = (weeks: Array<{ goals: GoalDraft }>): KpiGoalValues => {
  const total = weeks.reduce<KpiGoalValues>((sum, week) => {
    const goals = toValues(week.goals);
    return {
      doctorVisits: sum.doctorVisits + goals.doctorVisits,
      pharmacyVisits: sum.pharmacyVisits + goals.pharmacyVisits,
      salesAmount: sum.salesAmount + goals.salesAmount,
      collectionAmount: sum.collectionAmount + goals.collectionAmount,
    };
  }, { doctorVisits: 0, pharmacyVisits: 0, salesAmount: 0, collectionAmount: 0 });
  return { ...total, salesAmount: Math.round(total.salesAmount * 100) / 100, collectionAmount: Math.round(total.collectionAmount * 100) / 100 };
};
const money = (value: number) => `Q ${value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function KpiDashboardScreen({ currentUser, onBack }: KpiDashboardScreenProps) {
  const [data, setData] = useState<KpiDashboardResponse | null>(null);
  const [cycleId, setCycleId] = useState('');
  const [userId, setUserId] = useState(currentUser.role === 'visitador' ? currentUser.id : '');
  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState<Mode>('summary');
  const [frequencyFilter, setFrequencyFilter] = useState<number | null>(null);
  const [frequencySearch, setFrequencySearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingGoals, setEditingGoals] = useState(false);
  const [weeklyDrafts, setWeeklyDrafts] = useState<Array<{ weekNumber: number; goals: GoalDraft }>>([]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const canViewTeam = currentUser.role !== 'visitador';
  const canEditGoals = currentUser.role === 'admin' || currentUser.role === 'jefe';

  const load = async (nextCycleId = cycleId, nextUserId = userId, nextYear = year) => {
    setLoading(true); setMessage('');
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      const result = await api.getKpiDashboard(token, { cycleId: nextCycleId || undefined, userId: nextUserId || undefined, year: nextYear });
      setData(result);
      if (!nextCycleId) setCycleId(result.filters.selectedCycleId);
      setYear(result.filters.year);
      if (currentUser.role === 'visitador') setUserId(currentUser.id);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los indicadores.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!data) return;
    setWeeklyDrafts(data.weekly.map((week) => ({
      weekNumber: week.weekNumber,
      goals: toDraft(data.target?.weeklyGoals.find((item) => item.weekNumber === week.weekNumber)?.goals),
    })));
  }, [data]);

  const selectedCycle = data?.filters.cycles.find((cycle) => cycle.id === data.filters.selectedCycleId);
  const selectedVisitor = data?.filters.visitors.find((visitor) => visitor.id === data.filters.selectedUserId);
  const frequencyDetails = useMemo(() => data?.frequency.details.filter((item) =>
    (frequencyFilter === null || item.cyclesVisited === frequencyFilter) &&
    item.doctorName.toLocaleLowerCase('es').includes(frequencySearch.trim().toLocaleLowerCase('es'))
  ) ?? [], [data, frequencyFilter, frequencySearch]);
  const changeCycle = (next: string) => { setCycleId(next); setEditingGoals(false); void load(next, userId); };
  const changeUser = (next: string) => { setUserId(next); setEditingGoals(false); void load(cycleId, next); };
  const changeYear = (next: number) => { setYear(next); void load(cycleId, userId, next); };

  const saveGoals = async () => {
    if (!data?.filters.selectedUserId) return;
    setSaving(true); setMessage('');
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      await api.updateKpiTarget(token, data.filters.selectedUserId, data.filters.selectedCycleId, {
        cycleGoals: totalGoals(weeklyDrafts), weeklyGoals: weeklyDrafts.map((week) => ({ weekNumber: week.weekNumber, goals: toValues(week.goals) })), reason: reason.trim(),
      });
      setEditingGoals(false); setReason(''); setConfirmation('Metas actualizadas y ajuste guardado en el historial.');
      await load(data.filters.selectedCycleId, data.filters.selectedUserId);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron guardar las metas.'); }
    finally { setSaving(false); }
  };

  return <><View style={styles.screen}>
    <View style={styles.topbar}>
      <Pressable onPress={onBack} style={styles.iconButton}><ArrowLeft size={23} color={colors.text} /></Pressable>
      <View style={styles.titleIcon}><BarChart3 size={24} color={colors.onPrimary} /></View>
      <View style={styles.titleCopy}><Text style={styles.title}>KPIs comerciales</Text><Text style={styles.subtitle}>{selectedCycle?.name ?? 'Indicadores por ciclo'}{selectedVisitor ? ` · ${selectedVisitor.name}` : canViewTeam ? ' · Todo el equipo' : ''}</Text></View>
      <View style={styles.segment}><Pressable onPress={() => setMode('summary')} style={[styles.segmentButton, mode === 'summary' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'summary' && styles.segmentTextActive]}>Resumen</Text></Pressable><Pressable onPress={() => setMode('detail')} style={[styles.segmentButton, mode === 'detail' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'detail' && styles.segmentTextActive]}>Detallado</Text></Pressable></View>
    </View>

    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {data ? <View style={styles.filters}>
        <Text style={styles.filterLabel}>Ciclo</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{data.filters.cycles.map((cycle) => <Pressable key={cycle.id} onPress={() => changeCycle(cycle.id)} style={[styles.filterButton, data.filters.selectedCycleId === cycle.id && styles.filterActive]}><Text style={[styles.filterText, data.filters.selectedCycleId === cycle.id && styles.filterTextActive]}>{cycle.name}</Text></Pressable>)}</ScrollView>
        {canViewTeam ? <><Text style={styles.filterLabel}>Visitador</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}><Pressable onPress={() => changeUser('')} style={[styles.filterButton, !data.filters.selectedUserId && styles.filterActive]}><Users size={15} color={!data.filters.selectedUserId ? colors.primary : colors.muted} /><Text style={[styles.filterText, !data.filters.selectedUserId && styles.filterTextActive]}>Todo el equipo</Text></Pressable>{data.filters.visitors.map((visitor) => <Pressable key={visitor.id} onPress={() => changeUser(visitor.id)} style={[styles.filterButton, data.filters.selectedUserId === visitor.id && styles.filterActive]}><Text style={[styles.filterText, data.filters.selectedUserId === visitor.id && styles.filterTextActive]}>{visitor.name}</Text></Pressable>)}</ScrollView></> : null}
        <Text style={styles.filterLabel}>Año de frecuencia</Text><View style={styles.yearControl}><Pressable onPress={() => changeYear(year - 1)} style={styles.yearButton}><Text style={styles.yearButtonText}>−</Text></Pressable><Text style={styles.yearValue}>{year}</Text><Pressable onPress={() => changeYear(year + 1)} style={styles.yearButton}><Text style={styles.yearButtonText}>+</Text></Pressable></View>
      </View> : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>Calculando indicadores reales...</Text></View> : null}
      {!loading && data ? <>
        <View style={styles.metricGrid}>
          <MetricCard icon={Stethoscope} title="Cobertura médica" actual={`${data.summary.doctors.actual}/${data.summary.doctors.goal}`} percentage={data.summary.doctors.percentage} note="Visitas realizadas / meta del ciclo" />
          <MetricCard icon={Building2} title="Cobertura de farmacias" actual={`${data.summary.pharmacies.actual}/${data.summary.pharmacies.goal}`} percentage={data.summary.pharmacies.percentage} note="Indicador independiente de médicos" />
          <MetricCard icon={CircleDollarSign} title="Ventas del ciclo" actual={money(data.summary.sales.actual)} percentage={data.summary.sales.percentage} note={`Meta ${money(data.summary.sales.goal)}`} />
          <MetricCard icon={CircleDollarSign} title="Cobros del ciclo" actual={money(data.summary.collections.actual)} percentage={data.summary.collections.percentage} />
        </View>

        {canEditGoals && data.filters.selectedUserId ? <View style={styles.actionBand}><View><Text style={styles.bandTitle}>Metas de {selectedVisitor?.name}</Text><Text style={styles.muted}>{data.target ? `${data.target.revisionCount} ajustes registrados` : 'Aún no tiene metas para este ciclo'}</Text></View><Pressable onPress={() => setEditingGoals((current) => !current)} style={styles.outlineButton}><Pencil size={16} color={colors.primary} /><Text style={styles.outlineText}>{editingGoals ? 'Cerrar edición' : 'Configurar metas'}</Text></Pressable></View> : null}
        {editingGoals ? <GoalEditor weeklyDrafts={weeklyDrafts} setWeeklyDrafts={setWeeklyDrafts} reason={reason} setReason={setReason} saving={saving} onSave={() => { void saveGoals(); }} /> : null}
        {mode === 'detail' && canEditGoals && data.target?.revisions.length ? <View style={styles.section}><SectionHeader title="Historial de metas" subtitle="Valores anteriores conservados al realizar cada ajuste" compact /><View style={styles.revisionList}>{data.target.revisions.map((revision, index) => <View key={`${revision.changedAt}-${index}`} style={styles.revisionRow}><View style={styles.revisionTop}><Text style={styles.revisionTitle}>{revision.reason || 'Ajuste de metas'}</Text><Text style={styles.revisionDate}>{new Date(revision.changedAt).toLocaleString('es-GT')}</Text></View><Text style={styles.muted}>Registrado por {revision.changedByName}</Text><View style={styles.revisionGoals}><Text style={styles.revisionValue}>Médicos: {revision.cycleGoals.doctorVisits}</Text><Text style={styles.revisionValue}>Farmacias: {revision.cycleGoals.pharmacyVisits}</Text><Text style={styles.revisionValue}>Ventas: {money(revision.cycleGoals.salesAmount)}</Text><Text style={styles.revisionValue}>Cobros: {money(revision.cycleGoals.collectionAmount)}</Text></View></View>)}</View></View> : null}

        <SectionHeader title="Cumplimiento semanal" subtitle="Avance real frente a la meta configurada" />
        <View style={styles.weekList}>{data.weekly.map((week) => <View key={week.weekNumber} style={styles.weekRow}><Text style={styles.weekName}>Semana {week.weekNumber}</Text><Progress label="Médicos" actual={week.doctorActual} goal={week.doctorGoal} percentage={week.doctorPercentage} /><Progress label="Farmacias" actual={week.pharmacyActual} goal={week.pharmacyGoal} percentage={week.pharmacyPercentage} />{mode === 'detail' ? <><Progress label="Ventas" actualLabel={money(week.salesActual)} goalLabel={money(week.salesGoal)} percentage={week.salesPercentage} /><Progress label="Cobros" actualLabel={money(week.collectionActual)} goalLabel={money(week.collectionGoal)} percentage={week.collectionPercentage} /></> : null}</View>)}</View>

        <View style={[styles.columns, !wide && styles.stacked]}>
          <View style={styles.section}><SectionHeader title="Frecuencia médica anual" subtitle={`${data.frequency.totalDoctors} médicos con visita válida en ${data.frequency.year}`} compact />{data.frequency.distribution.length ? <View style={styles.frequencyList}>{data.frequency.distribution.map((item) => <Pressable key={item.cyclesVisited} accessibilityRole="button" accessibilityState={{ selected: frequencyFilter === item.cyclesVisited }} onPress={() => { setFrequencyFilter((current) => current === item.cyclesVisited ? null : item.cyclesVisited); setMode('detail'); }} style={[styles.frequencyRow, frequencyFilter === item.cyclesVisited && styles.frequencyRowSelected]}><Text style={styles.frequencyCount}>{item.count}</Text><Text style={styles.frequencyText}>médicos visitados en {item.cyclesVisited} {item.cyclesVisited === 1 ? 'ciclo' : 'ciclos'}</Text></Pressable>)}</View> : <Empty text="Aún no hay frecuencia acumulada para este año." />}</View>
          <View style={styles.section}><SectionHeader title="Evaluaciones del ciclo" subtitle="Último resultado por visitador" compact />{data.evaluations.length ? <View style={styles.evaluationList}>{data.evaluations.map((evaluation) => <View key={evaluation.id} style={styles.evaluationRow}><View style={styles.evaluationIcon}><BookOpenCheck size={19} color={colors.primary} /></View><View style={styles.evaluationCopy}><Text style={styles.evaluationTitle}>{evaluation.title}</Text><Text style={styles.muted}>{evaluation.completed} evaluados · mínima {evaluation.passingScore}%</Text></View><View style={styles.score}><Text style={styles.scoreValue}>{evaluation.averageScore}%</Text><Text style={styles.scoreLabel}>{evaluation.passRate}% aprobó</Text></View></View>)}</View> : <Empty text="No hay evaluaciones asignadas a este ciclo." />}</View>
        </View>

        {mode === 'detail' && data.frequency.details.length ? <View style={styles.section}><SectionHeader title="Detalle de frecuencia" subtitle="Cada médico cuenta una sola vez por ciclo" compact /><View style={styles.frequencyTools}><TextInput value={frequencySearch} onChangeText={setFrequencySearch} placeholder="Buscar médico por nombre" placeholderTextColor={colors.muted} style={styles.frequencySearch} />{frequencyFilter !== null ? <Pressable onPress={() => setFrequencyFilter(null)} style={styles.filterButton}><Text style={styles.filterText}>Mostrar todos</Text></Pressable> : null}</View><View style={styles.reportTable}><View style={styles.reportHeader}><Text style={[styles.reportHeadText, styles.reportDoctor]}>Médico</Text>{canViewTeam ? <Text style={styles.reportHeadText}>Visitador</Text> : null}<Text style={styles.reportHeadText}>Ciclos visitados</Text></View><ScrollView nestedScrollEnabled style={styles.frequencyTableScroll}>{frequencyDetails.length ? frequencyDetails.map((item) => <View key={`${item.userId}-${item.doctorId}`} style={styles.reportRow}><Text style={[styles.reportCellStrong, styles.reportDoctor]}>{item.doctorName}</Text>{canViewTeam ? <Text style={styles.reportCell}>{item.userName}</Text> : null}<Text style={styles.reportCellStrong}>{item.cyclesVisited}</Text></View>) : <View style={styles.frequencyEmpty}><Text style={styles.muted}>No hay médicos con esos filtros.</Text></View>}</ScrollView></View></View> : null}

        {mode === 'detail' ? <><SectionHeader title="Cartera y cobros" subtitle="Facturas, pagos y créditos se mantienen separados" /><View style={styles.financialGrid}><FinancialValue label="Facturas asignadas" value={String(data.invoices.total)} /><FinancialValue label="Pagadas" value={String(data.invoices.paid)} success /><FinancialValue label="Parciales" value={String(data.invoices.partial)} /><FinancialValue label="Pendientes" value={String(data.invoices.pending)} /><FinancialValue label="Notas de crédito" value={money(data.summary.collections.creditAmount)} /><FinancialValue label="Saldo pendiente" value={money(data.summary.collections.pendingBalance)} /></View></> : null}
      </> : null}
    </ScrollView>
  </View><ConfirmationModal visible={Boolean(confirmation)} message={confirmation} onClose={() => setConfirmation('')} /></>;
}

function MetricCard({ icon: Icon, title, actual, percentage, note }: { icon: typeof Stethoscope; title: string; actual: string; percentage: number; note?: string }) {
  return <View style={styles.metricCard}><View style={styles.metricTop}><View style={styles.metricIcon}><Icon size={22} color={colors.primary} /></View><Text style={styles.percentage}>{percentage}%</Text></View><Text style={styles.metricTitle}>{title}</Text><Text style={styles.metricValue}>{actual}</Text>{note ? <Text style={styles.muted}>{note}</Text> : null}<View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, percentage)}%` as `${number}%` }]} /></View></View>;
}

function SectionHeader({ title, subtitle, compact = false }: { title: string; subtitle: string; compact?: boolean }) {
  return <View style={[styles.sectionHeader, compact && styles.sectionHeaderCompact]}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.muted}>{subtitle}</Text></View>;
}

function Progress({ label, actual = 0, goal = 0, actualLabel, goalLabel, percentage }: { label: string; actual?: number; goal?: number; actualLabel?: string; goalLabel?: string; percentage: number }) {
  return <View style={styles.progressBlock}><View style={styles.progressHeader}><Text style={styles.progressLabel}>{label}</Text><Text style={styles.progressValue}>{actualLabel ?? actual} / {goalLabel ?? goal} · {percentage}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, percentage)}%` as `${number}%` }]} /></View></View>;
}

function GoalEditor({ weeklyDrafts, setWeeklyDrafts, reason, setReason, saving, onSave }: { weeklyDrafts: Array<{ weekNumber: number; goals: GoalDraft }>; setWeeklyDrafts: (value: Array<{ weekNumber: number; goals: GoalDraft }>) => void; reason: string; setReason: (value: string) => void; saving: boolean; onSave: () => void }) {
  const updateWeek = (weekNumber: number, key: keyof GoalDraft, value: string) => setWeeklyDrafts(weeklyDrafts.map((week) => week.weekNumber === weekNumber ? { ...week, goals: { ...week.goals, [key]: value } } : week));
  return <View style={styles.editor}><Text style={styles.editorTitle}>Meta total del ciclo</Text><GoalFields value={totalGoals(weeklyDrafts)} /><Text style={styles.editorTitle}>Metas por semana</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekEditors}>{weeklyDrafts.map((week) => <View key={week.weekNumber} style={styles.weekEditor}><Text style={styles.weekEditorTitle}>Semana {week.weekNumber}</Text>{(['doctorVisits', 'pharmacyVisits', 'salesAmount', 'collectionAmount'] as const).map((key) => <GoalInput key={key} label={{ doctorVisits: 'Médicos', pharmacyVisits: 'Farmacias', salesAmount: 'Ventas Q', collectionAmount: 'Cobros Q' }[key]} value={week.goals[key]} onChange={(value) => updateWeek(week.weekNumber, key, value)} />)}</View>)}</ScrollView><View style={styles.reasonRow}><TextInput value={reason} onChangeText={setReason} placeholder="Motivo del ajuste (feriado, vacaciones, reunión...)" placeholderTextColor="#9CA3AF" style={styles.reasonInput} /><Pressable disabled={saving} onPress={onSave} style={[styles.saveButton, saving && styles.disabled]}><Save size={17} color={colors.onPrimary} /><Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar metas'}</Text></Pressable></View></View>;
}

function GoalFields({ value }: { value: KpiGoalValues }) {
  return <View style={styles.goalFields}>{([
    ['Visitas médicas', String(value.doctorVisits)], ['Visitas a farmacias', String(value.pharmacyVisits)],
    ['Ventas (Q)', money(value.salesAmount)], ['Cobros (Q)', money(value.collectionAmount)],
  ] as const).map(([label, total]) => <View key={label} style={styles.goalInput}><Text style={styles.inputLabel}>{label}</Text><View style={styles.totalValue}><Text style={styles.totalText}>{total}</Text></View></View>)}</View>;
}

function GoalInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View style={styles.goalInput}><Text style={styles.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.input} /></View>;
}

function FinancialValue({ label, value, success = false }: { label: string; value: string; success?: boolean }) { return <View style={styles.financialValue}><Text style={styles.muted}>{label}</Text><Text style={[styles.financialNumber, success && styles.success]}>{value}</Text></View>; }
function Empty({ text }: { text: string }) { return <View style={styles.empty}><ChevronDown size={21} color={colors.muted} /><Text style={styles.muted}>{text}</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topbar: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  titleIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primary }, titleCopy: { flex: 1 }, title: { color: colors.text, fontSize: 25, fontWeight: '900' }, subtitle: { color: colors.muted, marginTop: 2 },
  segment: { flexDirection: 'row', backgroundColor: '#ECEDEF', padding: 4, borderRadius: 8 }, segmentButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 6 }, segmentActive: { backgroundColor: colors.surface }, segmentText: { color: colors.muted, fontWeight: '800' }, segmentTextActive: { color: colors.primary },
  content: { padding: spacing.xl, paddingBottom: 60, gap: spacing.lg }, filters: { gap: spacing.sm }, filterLabel: { color: colors.text, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, filterRow: { gap: spacing.sm }, filterButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: colors.surface }, filterActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, filterText: { color: colors.muted, fontWeight: '800' }, filterTextActive: { color: colors.primary },
  yearControl: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface }, yearButton: { width: 42, height: 38, alignItems: 'center', justifyContent: 'center' }, yearButtonText: { color: colors.primary, fontSize: 20, fontWeight: '900' }, yearValue: { minWidth: 72, textAlign: 'center', color: colors.text, fontWeight: '900' },
  message: { color: colors.success, fontWeight: '800' }, loading: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: spacing.md }, muted: { color: colors.muted, fontSize: 13 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, metricCard: { flexGrow: 1, flexBasis: 240, minHeight: 190, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg, ...shadows.card }, metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, metricIcon: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, percentage: { color: colors.primary, fontSize: 19, fontWeight: '900' }, metricTitle: { color: colors.muted, fontSize: 13, fontWeight: '800' }, metricValue: { color: colors.text, fontSize: 25, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#ECEDEF' }, progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  actionBand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderWidth: 1, borderColor: '#FFD4C4', borderRadius: 8, backgroundColor: '#FFF7F3', padding: spacing.lg }, bandTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, outlineButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.md }, outlineText: { color: colors.primary, fontWeight: '900' },
  sectionHeader: { gap: 3, marginTop: spacing.sm }, sectionHeaderCompact: { marginTop: 0 }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  weekList: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface }, weekRow: { gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, padding: spacing.lg }, weekName: { color: colors.text, fontSize: 16, fontWeight: '900' }, progressBlock: { gap: 6 }, progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, progressLabel: { color: colors.text, fontWeight: '800' }, progressValue: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg }, stacked: { flexDirection: 'column' }, section: { flex: 1, width: '100%', minHeight: 260, gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg, ...shadows.card }, frequencyList: { gap: spacing.sm }, frequencyRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, frequencyRowSelected: { backgroundColor: colors.primarySoft }, frequencyCount: { minWidth: 45, color: colors.primary, fontSize: 22, fontWeight: '900' }, frequencyText: { color: colors.text, fontWeight: '700' }, frequencyTools: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, frequencySearch: { flex: 1, minWidth: 220, minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, paddingHorizontal: spacing.md }, frequencyTableScroll: { maxHeight: 240 }, frequencyEmpty: { minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  evaluationList: { gap: spacing.sm }, evaluationRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, evaluationIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, evaluationCopy: { flex: 1 }, evaluationTitle: { color: colors.text, fontWeight: '900' }, score: { alignItems: 'flex-end' }, scoreValue: { color: colors.text, fontSize: 20, fontWeight: '900' }, scoreLabel: { color: colors.success, fontSize: 11, fontWeight: '800' }, empty: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  reportTable: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }, reportHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F5F6', paddingHorizontal: spacing.md }, reportHeadText: { flex: 1, color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, reportRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.md }, reportCell: { flex: 1, color: colors.muted }, reportCellStrong: { flex: 1, color: colors.text, fontWeight: '900' }, reportDoctor: { flex: 1.4 },
  financialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, financialValue: { flexGrow: 1, flexBasis: 180, minHeight: 100, justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg }, financialNumber: { color: colors.text, fontSize: 22, fontWeight: '900' }, success: { color: colors.success },
  editor: { gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg }, editorTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, goalFields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, goalInput: { flexGrow: 1, flexBasis: 150, gap: 5 }, inputLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' }, input: { minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, paddingHorizontal: spacing.md }, totalValue: { minHeight: 42, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.background, paddingHorizontal: spacing.md }, totalText: { color: colors.text, fontWeight: '800' }, weekEditors: { gap: spacing.md }, weekEditor: { width: 220, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md }, weekEditorTitle: { color: colors.primary, fontWeight: '900' }, reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, reasonInput: { flex: 1, minWidth: 280, minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, paddingHorizontal: spacing.md }, saveButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: 8, backgroundColor: colors.primary, paddingHorizontal: spacing.lg }, saveText: { color: colors.onPrimary, fontWeight: '900' }, disabled: { opacity: 0.55 },
  revisionList: { gap: spacing.sm }, revisionRow: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.md }, revisionTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }, revisionTitle: { color: colors.text, fontWeight: '900' }, revisionDate: { color: colors.muted, fontSize: 12 }, revisionGoals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs }, revisionValue: { color: colors.text, fontSize: 12, fontWeight: '800' },
});
