import type { Doctor } from '@prism/shared';
import { ArrowRight, Search, UploadCloud } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SessionUser } from '../app/types';
import { api } from '../services/api';
import { OfflineVisitDraft, removeOfflineVisit } from '../services/offlineVisitQueue';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';

interface OfflineVisitSyncModalProps { user: SessionUser; queue: OfflineVisitDraft[]; onSynced: (id: string) => void; }
const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function OfflineVisitSyncModal({ user, queue, onSynced }: OfflineVisitSyncModalProps) {
  const { width, height } = useWindowDimensions();
  const compact = width < 640 || height < 640;
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmingDifferences, setConfirmingDifferences] = useState(false);
  const visit = queue[0];

  useEffect(() => {
    if (!visit) return;
    let live = true;
    void api.getClients().then((clients) => {
      if (!live) return;
      const assigned = clients.doctors.filter((doctor) => doctor.active && doctor.assignedUserId === user.id);
      setDoctors(assigned);
      const matches = assigned.filter((doctor) => normalize(doctor.name).includes(normalize(visit.doctorName)) || normalize(visit.doctorName).includes(normalize(doctor.name)));
      setSelectedDoctorId(matches.length === 1 ? matches[0].id : '');
    }).catch(() => { if (live) setMessage('No se pudo cargar tu cartera de médicos.'); });
    return () => { live = false; };
  }, [user.id, visit?.id]);

  const matches = useMemo(() => {
    if (!visit) return [];
    const term = search.trim() ? normalize(search) : normalize(visit.doctorName);
    return doctors.filter((doctor) => !term || `${doctor.name} ${doctor.address}`.toLocaleLowerCase().includes(term)).slice(0, 12);
  }, [doctors, search, visit]);
  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId);
  const discrepancies = selectedDoctor && visit ? [
    ['Nombre', visit.doctorName, selectedDoctor.name],
    ['Especialidad', visit.doctorSpecialty, selectedDoctor.specialty],
    ['Clínica / hospital', visit.clinic, selectedDoctor.hospitalOrClinic],
    ['Dirección', visit.address, selectedDoctor.address],
  ].filter(([, offline, database]) => Boolean(offline && database && normalize(String(offline)) !== normalize(String(database)))) as Array<[string, string, string]> : [];

  const persist = async () => {
    if (!visit || !selectedDoctor) return;
    setSaving(true); setMessage('Sincronizando visita...');
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesion no disponible.');
      await api.savePresentationVisit(token, { offlineSync: true, doctorId: selectedDoctor.id, doctorName: selectedDoctor.name, doctorSpecialty: selectedDoctor.specialty, clinic: selectedDoctor.hospitalOrClinic, address: selectedDoctor.address, presentedFlows: (visit.productsPresented ?? []).map((product) => ({ type: 'interactive' as const, productId: product.productId, productName: product.productName, startedAt: visit.createdAt, completedAt: visit.createdAt })), visitStatus: visit.visitStatus, requestedProducts: visit.requestedProducts?.length ? visit.requestedProducts : visit.productName && visit.productQuantity > 0 ? [{ productName: visit.productName, line: visit.productLine || 'Sin línea', quantity: visit.productQuantity }] : [], samplesDelivered: visit.samplesDelivered ?? [], probablePurchaseDate: visit.probablePurchaseDate, competitionDetected: visit.competitionDetected, interestLevel: visit.interestLevel, requiresFollowUp: visit.requiresFollowUp, urgentRequest: visit.urgentRequest, finalComments: visit.finalComments });
      await removeOfflineVisit(visit.id);
      onSynced(visit.id);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo sincronizar la visita.'); }
    finally { setSaving(false); }
  };

  const sync = () => {
    if (discrepancies.length && !confirmingDifferences) {
      setConfirmingDifferences(true);
      setMessage('');
      return;
    }
    void persist();
  };

  if (!visit) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, compact && styles.modalCompact]}>
          <View style={styles.header}>
            <View style={styles.icon}><UploadCloud size={23} color={colors.primary} /></View>
            <View style={styles.headerText}><Text style={styles.title}>Visita pendiente de sincronizar</Text><Text style={styles.subtitle}>Queda {queue.length} visita guardada en esta tablet.</Text></View>
          </View>

          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
            <View style={styles.summary}>
              <Text style={styles.summaryName}>{visit.doctorName}</Text>
              <Text style={styles.summaryText}>{new Date(visit.createdAt).toLocaleString('es-GT')}</Text>
              {visit.finalComments ? <Text style={styles.summaryText}>{visit.finalComments}</Text> : null}
            </View>

            <Text style={styles.label}>Confirma el médico de tu cartera</Text>
            <View style={styles.search}><Search size={17} color={colors.muted} /><TextInput value={search} onChangeText={(value) => { setSearch(value); setConfirmingDifferences(false); setMessage(''); }} placeholder="Buscar médico" placeholderTextColor="#9CA3AF" style={styles.searchInput} /></View>
            <View style={styles.doctorList}>{matches.map((doctor) => <Pressable key={doctor.id} onPress={() => { setSelectedDoctorId(doctor.id); setConfirmingDifferences(false); setMessage(''); }} style={[styles.doctor, selectedDoctorId === doctor.id && styles.doctorActive]}><View style={styles.doctorInfo}><Text style={styles.doctorName}>{doctor.name}</Text><Text style={styles.doctorMeta}>{doctor.specialty || 'Sin especialidad'} · {doctor.address}</Text></View><Text style={[styles.select, selectedDoctorId === doctor.id && styles.selectActive]}>{selectedDoctorId === doctor.id ? 'Seleccionado' : 'Elegir'}</Text></Pressable>)}</View>

            {confirmingDifferences ? <View style={styles.differences}>
              <Text style={styles.differencesTitle}>Usaremos la ficha oficial del médico</Text>
              <Text style={styles.differencesHint}>Los datos capturados offline no se perderán; esta visita se vinculará al registro seleccionado.</Text>
              {discrepancies.map(([label, offline, database]) => <View key={label} style={styles.differenceRow}>
                <Text style={styles.differenceLabel}>{label}</Text>
                <View style={[styles.comparison, compact && styles.comparisonCompact]}><View style={styles.capturedValue}><Text style={styles.valueCaption}>CAPTURADO</Text><Text style={styles.valueText}>{offline}</Text></View><ArrowRight size={16} color={colors.muted} style={compact ? styles.arrowCompact : undefined} /><View style={styles.officialValue}><Text style={styles.officialCaption}>SE USARÁ</Text><Text style={styles.officialText}>{database}</Text></View></View>
              </View>)}
            </View> : null}

            {message ? <Text style={[styles.message, saving && styles.syncing]}>{message}</Text> : null}
          </ScrollView>

          <View style={styles.footer}><Pressable disabled={!selectedDoctor || saving} onPress={sync} style={[styles.button, (!selectedDoctor || saving) && styles.disabled]}>{saving ? <ActivityIndicator color={colors.onPrimary} /> : <UploadCloud size={19} color={colors.onPrimary} />}<Text style={styles.buttonText}>{saving ? 'Sincronizando...' : confirmingDifferences ? 'Usar ficha oficial y sincronizar' : 'Guardar y sincronizar visita'}</Text></Pressable></View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modal: { width: '88%', maxWidth: 760, height: '82%', maxHeight: 780, minHeight: 520, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadows.card },
  modalCompact: { width: '94%', height: '88%', minHeight: 0 },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  headerText: { flex: 1, minWidth: 0 },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  title: { color: colors.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 2 },
  contentScroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  summary: { backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: spacing.md, gap: 4 },
  summaryName: { color: colors.text, fontWeight: '900', fontSize: 16 },
  summaryText: { color: colors.muted, fontSize: 13 },
  label: { color: colors.text, fontWeight: '900', fontSize: 13 },
  search: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  searchInput: { flex: 1, color: colors.text },
  doctorList: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  doctor: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  doctorInfo: { flex: 1, minWidth: 0 },
  doctorActive: { backgroundColor: colors.primarySoft },
  doctorName: { color: colors.text, fontWeight: '900' },
  doctorMeta: { color: colors.muted, fontSize: 12, marginTop: 2, maxWidth: 470 },
  select: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  selectActive: { color: colors.primary },
  differences: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F9FAFB', padding: spacing.md, gap: spacing.sm },
  differencesTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  differencesHint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  differenceRow: { gap: 5, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  differenceLabel: { color: colors.text, fontSize: 12, fontWeight: '900' },
  comparison: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  comparisonCompact: { flexDirection: 'column', alignItems: 'stretch' },
  arrowCompact: { alignSelf: 'center', transform: [{ rotate: '90deg' }] },
  capturedValue: { flex: 1, minWidth: 0, borderRadius: radius.sm, backgroundColor: colors.surface, padding: spacing.sm },
  officialValue: { flex: 1, minWidth: 0, borderRadius: radius.sm, backgroundColor: '#E6F7F2', padding: spacing.sm },
  valueCaption: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  valueText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  officialCaption: { color: colors.success, fontSize: 9, fontWeight: '900' },
  officialText: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 2 },
  message: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
  syncing: { color: colors.success },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, padding: spacing.md },
  button: { minHeight: 50, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  buttonText: { color: colors.onPrimary, fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
