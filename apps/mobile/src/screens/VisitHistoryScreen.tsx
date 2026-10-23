import type { Doctor, UserProfile } from '@prism/shared';
import { CalendarDays, ClipboardList, MapPin, Search, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SessionUser } from '../app/types';
import { api, CompletedVisit, VisitDetail } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';

interface VisitHistoryScreenProps { currentUser: SessionUser; }

const formatDateTime = (value: string) => new Date(value).toLocaleString('es-GT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const outcomeLabels = { purchase_made: 'Compra realizada', follow_up_pending: 'Seguimiento pendiente', not_interested: 'Sin interés' };

export function VisitHistoryScreen({ currentUser }: VisitHistoryScreenProps) {
  const canFilterVisitador = currentUser.role === 'admin' || currentUser.role === 'jefe';
  const [visits, setVisits] = useState<CompletedVisit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [visitadorId, setVisitadorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<VisitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState('');

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const token = await loadToken();
        if (!token) throw new Error('Sesion no disponible.');
        const [data, clients, allUsers] = await Promise.all([
          api.getVisits(token, { from, to, userId: canFilterVisitador ? visitadorId : undefined }),
          api.getClients(),
          api.getUsers(),
        ]);
        if (!live) return;
        setVisits(data);
        setDoctors(clients.doctors);
        setUsers(allUsers.filter((user) => user.role === 'visitador' && user.active));
        setMessage('');
      } catch (error) {
        if (live) setMessage(error instanceof Error ? error.message : 'No se pudo cargar el historial.');
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [canFilterVisitador, from, to, visitadorId]);

  const doctorsById = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor])), [doctors]);
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const visibleVisits = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visits;
    return visits.filter((visit) => {
      const doctor = doctorsById.get(visit.clientId);
      const visitador = usersById.get(visit.userId);
      return `${doctor?.name ?? ''} ${doctor?.address ?? ''} ${visitador?.name ?? ''} ${visit.notes ?? ''}`.toLowerCase().includes(term);
    });
  }, [doctorsById, search, usersById, visits]);

  const clearFilters = () => { setSearch(''); setFrom(''); setTo(''); setVisitadorId(''); };
  const openDetail = async (visitId: string) => {
    setDetailLoading(true);
    setDetailMessage('');
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      setSelectedVisit(await api.getVisit(token, visitId));
    } catch (error) {
      setDetailMessage(error instanceof Error ? error.message : 'No se pudo cargar el detalle.');
    } finally {
      setDetailLoading(false);
    }
  };

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.title}>Historial CRM</Text><Text style={styles.subtitle}>Visitas médicas realizadas y sincronizadas.</Text></View><View style={styles.count}><ClipboardList size={18} color={colors.primary} /><Text style={styles.countText}>{visibleVisits.length} visitas</Text></View></View>
    <View style={styles.filters}>
      <View style={styles.search}><Search size={19} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar médico, dirección o comentario" placeholderTextColor="#9CA3AF" style={styles.searchInput} /></View>
      <View style={styles.dateField}><CalendarDays size={17} color={colors.primary} /><TextInput value={from} onChangeText={setFrom} placeholder="Desde: AAAA-MM-DD" placeholderTextColor="#9CA3AF" style={styles.dateInput} /></View>
      <View style={styles.dateField}><CalendarDays size={17} color={colors.primary} /><TextInput value={to} onChangeText={setTo} placeholder="Hasta: AAAA-MM-DD" placeholderTextColor="#9CA3AF" style={styles.dateInput} /></View>
      {canFilterVisitador && <View style={styles.visitadores}>{[{ id: '', name: 'Todo el equipo' }, ...users].map((user) => <Pressable key={user.id || 'all'} onPress={() => setVisitadorId(user.id)} style={[styles.visitadorChip, visitadorId === user.id && styles.visitadorChipActive]}><UserRound size={14} color={visitadorId === user.id ? colors.primary : colors.muted} /><Text style={[styles.visitadorText, visitadorId === user.id && styles.visitadorTextActive]}>{user.name}</Text></Pressable>)}</View>}
      <Pressable onPress={clearFilters} style={styles.clear}><Text style={styles.clearText}>Limpiar filtros</Text></Pressable>
    </View>
    {loading ? <Text style={styles.muted}>Cargando visitas...</Text> : null}
    {message ? <Text style={styles.error}>{message}</Text> : null}
    {!loading && !message && visibleVisits.length === 0 ? <View style={styles.empty}><ClipboardList size={30} color={colors.primary} /><Text style={styles.emptyTitle}>Sin visitas para estos filtros</Text><Text style={styles.muted}>Las visitas guardadas aparecerán aquí.</Text></View> : null}
    <View style={styles.list}>{visibleVisits.map((visit) => { const doctor = doctorsById.get(visit.clientId); const visitador = usersById.get(visit.userId); const quantity = visit.productsDelivered.reduce((total, product) => total + product.quantity, 0); return <Pressable key={visit.id} onPress={() => { void openDetail(visit.id); }} style={({ pressed }) => [styles.visit, pressed && styles.visitPressed]}>
      <View style={styles.dateBadge}><Text style={styles.dateTime}>{new Date(visit.visitedAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text><Text style={styles.dateDay}>{new Date(visit.visitedAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })}</Text></View>
    <View style={styles.visitInfo}><View style={styles.visitTop}><Text style={styles.doctor}>{doctor?.name ?? 'Médico no disponible'}</Text><Text style={styles.synced}>{visit.syncedAt ? 'Sincronizada' : 'Pendiente'}</Text></View><Text style={styles.meta}><MapPin size={13} color={colors.muted} /> {doctor?.address ?? 'Sin dirección registrada'}</Text><Text style={styles.meta}>Visitador: {visitador?.name ?? 'No disponible'} · {formatDateTime(visit.visitedAt)}</Text>{quantity > 0 ? <Text style={styles.products}>{quantity} producto{quantity === 1 ? '' : 's'} registrado{quantity === 1 ? '' : 's'}</Text> : null}{visit.samplesDelivered.reduce((total, sample) => total + sample.quantity, 0) > 0 ? <Text style={styles.samples}>{visit.samplesDelivered.reduce((total, sample) => total + sample.quantity, 0)} muestra{visit.samplesDelivered.reduce((total, sample) => total + sample.quantity, 0) === 1 ? '' : 's'} entregada{visit.samplesDelivered.reduce((total, sample) => total + sample.quantity, 0) === 1 ? '' : 's'}</Text> : null}{visit.notes ? <Text style={styles.notes}>{visit.notes}</Text> : null}</View>
    </Pressable>; })}</View>
    <Modal transparent visible={detailLoading || Boolean(selectedVisit) || Boolean(detailMessage)} animationType="fade" onRequestClose={() => { setSelectedVisit(null); setDetailMessage(''); }}>
      <View style={styles.modalOverlay}><View style={styles.detailCard}>
        {detailLoading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        {detailMessage ? <><Text style={styles.detailTitle}>No se pudo abrir la visita</Text><Text style={styles.detailText}>{detailMessage}</Text></> : null}
        {selectedVisit ? (() => { const doctor = doctorsById.get(selectedVisit.clientId); const visitador = usersById.get(selectedVisit.userId); const outcome = selectedVisit.outcome; return <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.detailTitle}>{doctor?.name ?? 'Detalle de visita'}</Text>
          <Text style={styles.detailText}>{formatDateTime(selectedVisit.visitedAt)} · {visitador?.name ?? 'Visitador no disponible'}</Text>
          <Text style={styles.detailSection}>Resultado</Text>
          <View style={styles.detailGrid}><Text style={styles.detailLabel}>{outcome ? outcomeLabels[outcome.visitStatus] : 'Visita registrada'}</Text>{outcome?.interestLevel ? <Text style={styles.detailLabel}>Interés: {outcome.interestLevel}/5</Text> : null}{outcome?.requiresFollowUp ? <Text style={styles.detailLabel}>Requiere seguimiento</Text> : null}{outcome?.urgentRequest ? <Text style={styles.detailLabel}>Solicitud urgente</Text> : null}</View>
          {outcome?.probablePurchaseDate ? <Text style={styles.detailText}>Compra estimada: {outcome.probablePurchaseDate}</Text> : null}
          {outcome?.competitionDetected ? <Text style={styles.detailText}>Competencia: {outcome.competitionDetected}</Text> : null}
          <Text style={styles.detailSection}>Productos registrados</Text>
          {selectedVisit.productsDelivered.length ? selectedVisit.productsDelivered.map((product, index) => <Text key={`${product.productId ?? product.productName}-${index}`} style={styles.detailRow}>{product.productName ?? 'Producto'} · {product.quantity}</Text>) : <Text style={styles.detailText}>Sin productos registrados.</Text>}
          <Text style={styles.detailSection}>Muestras entregadas</Text>
          {selectedVisit.samplesDelivered.length ? selectedVisit.samplesDelivered.map((sample, index) => <Text key={`${sample.productId ?? sample.productName}-${index}`} style={styles.detailRow}>{sample.productName ?? 'Muestra'} · {sample.quantity}</Text>) : <Text style={styles.detailText}>No se entregaron muestras.</Text>}
          {outcome?.presentedFlows.length ? <><Text style={styles.detailSection}>Material presentado</Text>{outcome.presentedFlows.map((flow, index) => <Text key={`${flow.productName}-${index}`} style={styles.detailRow}>{flow.productName ?? 'Producto'} · {flow.type}</Text>)}</> : null}
          <Text style={styles.detailSection}>Observaciones</Text><Text style={styles.detailText}>{outcome?.finalComments || selectedVisit.notes || 'Sin observaciones registradas.'}</Text>
        </ScrollView>; })() : null}
        {!detailLoading ? <Pressable onPress={() => { setSelectedVisit(null); setDetailMessage(''); }} style={styles.closeDetail}><Text style={styles.closeDetailText}>Cerrar</Text></Pressable> : null}
      </View></View>
    </Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg }, header: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, alignItems: 'flex-start' }, title: { color: colors.text, fontWeight: '900', fontSize: 28 }, subtitle: { color: colors.muted, fontSize: 16, marginTop: 3 }, count: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, countText: { color: colors.primary, fontWeight: '900' }, filters: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadows.card }, search: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm }, searchInput: { flex: 1, color: colors.text, fontSize: 15 }, dateField: { minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, gap: spacing.sm, maxWidth: 240 }, dateInput: { color: colors.text, flex: 1 }, visitadores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, visitadorChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, visitadorChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, visitadorText: { color: colors.muted, fontWeight: '700', fontSize: 13 }, visitadorTextActive: { color: colors.primary }, clear: { alignSelf: 'flex-start', paddingVertical: spacing.xs }, clearText: { color: colors.primary, fontWeight: '800' }, list: { gap: spacing.md }, visit: { flexDirection: 'row', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md, ...shadows.card }, visitPressed: { opacity: 0.76 }, dateBadge: { minWidth: 72, justifyContent: 'center', alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primarySoft, padding: spacing.sm, gap: 3 }, dateTime: { color: colors.primaryDark, fontWeight: '900', fontSize: 16 }, dateDay: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 }, visitInfo: { flex: 1, gap: 5 }, visitTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }, doctor: { flex: 1, color: colors.text, fontWeight: '900', fontSize: 18 }, synced: { color: colors.success, backgroundColor: '#E6F7F2', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3, fontSize: 11, fontWeight: '900' }, meta: { color: colors.muted, fontSize: 13 }, products: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' }, samples: { color: colors.success, fontSize: 13, fontWeight: '800' }, notes: { color: colors.text, fontSize: 14 }, empty: { minHeight: 190, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadows.card }, emptyTitle: { color: colors.text, fontWeight: '900', fontSize: 18 }, muted: { color: colors.muted }, error: { color: colors.primaryDark, fontWeight: '800' }, modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg }, detailCard: { width: '100%', maxWidth: 580, maxHeight: '82%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md }, detailContent: { gap: spacing.sm }, detailTitle: { color: colors.text, fontSize: 22, fontWeight: '900' }, detailText: { color: colors.muted, fontSize: 14, lineHeight: 20 }, detailSection: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: spacing.sm }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, detailLabel: { color: colors.primaryDark, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 5, fontWeight: '800', fontSize: 12 }, detailRow: { color: colors.text, fontSize: 14, paddingVertical: 2 }, closeDetail: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: radius.md, backgroundColor: colors.primary }, closeDetailText: { color: colors.onPrimary, fontWeight: '900' },
});
