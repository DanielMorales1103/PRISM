import type { Cycle } from '@prism/shared';
import { CalendarPlus, Clock3 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';

const formatDate = (value: string) => new Date(value).toLocaleDateString('es-GT', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
});

export function CyclesScreen() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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
      {loading ? <Text style={styles.cardText}>Cargando ciclos...</Text> : orderedCycles.map((cycle) => <View key={cycle.id} style={styles.cycleRow}>
        <View style={styles.icon}><Clock3 size={19} color={colors.primary} /></View>
        <View style={styles.cycleInfo}><Text style={styles.cycleName}>{cycle.name}</Text><Text style={styles.cycleDate}>{formatDate(cycle.startsAt)} - {formatDate(cycle.endsAt)}</Text></View>
        <Text style={[styles.badge, cycle.active && styles.badgeActive]}>{cycle.active ? 'Activo' : '5 semanas'}</Text>
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
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cycleInfo: { flex: 1, gap: 2 },
  cycleName: { color: colors.text, fontWeight: '800', fontSize: 16 },
  cycleDate: { color: colors.muted, fontSize: 14 },
  badge: { color: colors.muted, backgroundColor: '#F3F4F6', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, fontWeight: '700', fontSize: 12 },
  badgeActive: { color: colors.success, backgroundColor: '#E6F7F2' },
});
