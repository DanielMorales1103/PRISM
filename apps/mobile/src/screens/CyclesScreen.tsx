import type { Cycle } from '@prism/shared';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock3, Pencil, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';

const formatDate = (value: string) => new Date(value).toLocaleDateString('es-GT', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
});
const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function calendarWeeks(date: Date) { const first = new Date(date.getFullYear(), date.getMonth(), 1).getDay(); const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); const days: Array<number | null> = Array.from({ length: first }, () => null); for (let day = 1; day <= count; day += 1) days.push(day); while (days.length % 7) days.push(null); return Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7)); }

export function CyclesScreen() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [cycleStart, setCycleStart] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [savingEdit, setSavingEdit] = useState(false);
  const [message, setMessage] = useState('');
  const orderedCycles = useMemo(() => [...cycles].sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()), [cycles]);

  useEffect(() => {
    let live = true;
    void api.getCatalogs()
      .then((catalogs) => { if (live) setCycles(catalogs.cycles); })
      .catch(() => { if (live) setMessage('No se pudieron cargar los ciclos.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const createNextCycle = async () => {
    setCreating(true);
    setMessage('');
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesion no disponible.');
      const cycle = await api.createCycle(token);
      setCycles((current) => [...current, cycle]);
      setMessage(`${cycle.name} creado: ${formatDate(cycle.startsAt)} al ${formatDate(cycle.endsAt)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear el ciclo.');
    } finally {
      setCreating(false);
    }
  };

  const editCycle = (cycle: Cycle) => {
    setEditingCycleId(cycle.id);
    setCycleStart(cycle.startsAt.slice(0, 10));
    setCalendarMonth(new Date(`${cycle.startsAt.slice(0, 10)}T12:00:00`));
    setCalendarOpen(false);
    setMessage('');
  };

  const saveCycle = async () => {
    if (!editingCycleId) return;
    setSavingEdit(true);
    setMessage('');
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      const response = await api.updateCycle(token, editingCycleId, cycleStart);
      const updated = new Map(response.cycles.map((cycle) => [cycle.id, cycle]));
      setCycles((current) => current.map((cycle) => updated.get(cycle.id) ?? cycle));
      setEditingCycleId(null);
      setMessage('Ciclo actualizado. Los ciclos posteriores y sus citas pendientes se reacomodaron automáticamente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el ciclo.');
    } finally {
      setSavingEdit(false);
    }
  };

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}>
      <Text style={styles.title}>Ciclos de trabajo</Text>
      <Text style={styles.subtitle}>Cada ciclo dura cinco semanas, inicia lunes y continúa inmediatamente después del anterior.</Text>
    </View>
    <View style={styles.createCard}>
      <View style={styles.createCopy}><Text style={styles.cardTitle}>Siguiente ciclo</Text><Text style={styles.cardText}>Se calculará automáticamente a partir del último ciclo registrado.</Text></View>
      <Pressable disabled={creating} onPress={createNextCycle} style={[styles.button, creating && styles.disabled]}>
        <CalendarPlus size={18} color={colors.onPrimary} /><Text style={styles.buttonText}>{creating ? 'Creando...' : 'Crear siguiente ciclo'}</Text>
      </Pressable>
    </View>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    <View style={styles.listCard}>
      <View style={styles.listHeader}><View><Text style={styles.cardTitle}>Ciclos registrados</Text><Text style={styles.cardText}>{orderedCycles.length} ciclos generales disponibles para planificación.</Text></View></View>
      {loading ? <Text style={styles.cardText}>Cargando ciclos...</Text> : orderedCycles.map((cycle) => <View key={cycle.id} style={styles.cycleBlock}>
        <View style={styles.cycleRow}>
          <View style={styles.icon}><Clock3 size={19} color={colors.primary} /></View>
          <View style={styles.cycleInfo}><Text style={styles.cycleName}>{cycle.name}</Text><Text style={styles.cycleDate}>{formatDate(cycle.startsAt)} - {formatDate(cycle.endsAt)}</Text></View>
          <Text style={[styles.badge, cycle.active && styles.badgeActive]}>{cycle.active ? 'Activo' : '5 semanas'}</Text>
          <Pressable accessibilityLabel={`Editar ${cycle.name}`} onPress={() => editCycle(cycle)} style={styles.editButton}><Pencil size={17} color={colors.primary} /></Pressable>
        </View>
        {editingCycleId === cycle.id ? <View style={styles.editPanel}><View style={styles.editField}><Text style={styles.editLabel}>Inicio del ciclo, lunes</Text><Pressable onPress={() => setCalendarOpen((open) => !open)} style={styles.dateTrigger}><CalendarDays size={18} color={colors.primary} /><Text style={styles.dateTriggerText}>{cycleStart ? formatDate(`${cycleStart}T12:00:00`) : 'Selecciona una fecha'}</Text></Pressable>{calendarOpen ? <View style={styles.datePicker}><View style={styles.datePickerHeader}><Pressable onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} style={styles.pickerNav}><ChevronLeft size={17} color={colors.text} /></Pressable><Text style={styles.pickerTitle}>{months[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</Text><Pressable onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} style={styles.pickerNav}><ChevronRight size={17} color={colors.text} /></Pressable></View><View style={styles.pickerWeek}>{['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.pickerWeekDay}>{day}</Text>)}</View>{calendarWeeks(calendarMonth).map((week, index) => <View key={index} style={styles.pickerRow}>{week.map((day, dayIndex) => { const value = day ? dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)) : ''; const selected = value === cycleStart; const monday = day ? new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day).getDay() === 1 : false; return <Pressable key={dayIndex} disabled={!day} onPress={() => { if (monday) { setCycleStart(value); setCalendarOpen(false); } }} style={[styles.pickerDay, selected && styles.pickerDaySelected, Boolean(day) && !monday && styles.pickerDayDisabled]}><Text style={[styles.pickerDayText, selected && styles.pickerDayTextSelected, Boolean(day) && !monday && styles.pickerDayTextDisabled]}>{day ?? ''}</Text></Pressable>; })}</View>)}</View> : null}</View><View style={styles.editActions}><Pressable disabled={savingEdit} onPress={() => void saveCycle()} style={[styles.saveButton, savingEdit && styles.disabled]}><Text style={styles.buttonText}>{savingEdit ? 'Guardando...' : 'Guardar'}</Text></Pressable><Pressable onPress={() => { setEditingCycleId(null); setCalendarOpen(false); }} style={styles.cancelButton}><X size={16} color={colors.primary} /><Text style={styles.cancelText}>Cancelar</Text></Pressable></View><Text style={styles.editHint}>Solo se pueden seleccionar lunes. Se actualizarán este ciclo y los siguientes.</Text></View> : null}
      </View>)}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 16, maxWidth: 720 },
  createCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg, ...shadows.card },
  createCopy: { flex: 1, gap: spacing.xs },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 18 },
  cardText: { color: colors.muted, fontSize: 14 },
  button: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  buttonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.6 },
  message: { color: colors.success, fontWeight: '700' },
  listCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadows.card },
  listHeader: { paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  cycleRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  cycleBlock: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cycleInfo: { flex: 1, gap: 2 },
  cycleName: { color: colors.text, fontWeight: '800', fontSize: 16 },
  cycleDate: { color: colors.muted, fontSize: 14 },
  badge: { color: colors.muted, backgroundColor: '#F3F4F6', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, fontWeight: '700', fontSize: 12 },
  badgeActive: { color: colors.success, backgroundColor: '#E6F7F2' },
  editButton: { width: 38, height: 38, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  editPanel: { position: 'relative', zIndex: 20, backgroundColor: '#FFF7F3', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  editField: { position: 'relative', zIndex: 30, gap: 5, maxWidth: 300 },
  editLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  dateTrigger: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateTriggerText: { color: colors.text, fontWeight: '800' },
  datePicker: { position: 'absolute', top: 72, left: 0, width: 300, zIndex: 100, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, backgroundColor: colors.surface, ...shadows.card },
  datePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  pickerNav: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#F3F4F6' },
  pickerTitle: { color: colors.text, fontWeight: '900' },
  pickerWeek: { flexDirection: 'row' },
  pickerWeekDay: { width: '14.2857%', color: colors.muted, fontSize: 11, fontWeight: '900', textAlign: 'center', paddingVertical: 4 },
  pickerRow: { flexDirection: 'row' },
  pickerDay: { width: '14.2857%', height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  pickerDaySelected: { backgroundColor: colors.primary },
  pickerDayDisabled: { opacity: 0.35 },
  pickerDayText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  pickerDayTextSelected: { color: colors.onPrimary },
  pickerDayTextDisabled: { color: colors.muted },
  editActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  saveButton: { minHeight: 40, borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { minHeight: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  cancelText: { color: colors.primary, fontWeight: '800' },
  editHint: { color: colors.muted, fontSize: 12 },
});
