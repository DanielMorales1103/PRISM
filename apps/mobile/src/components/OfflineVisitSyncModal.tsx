import type { Doctor } from '@prism/shared';
import { Search, UploadCloud } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SessionUser } from '../app/types';
import { api } from '../services/api';
import { OfflineVisitDraft, removeOfflineVisit } from '../services/offlineVisitQueue';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';

interface OfflineVisitSyncModalProps { user: SessionUser; queue: OfflineVisitDraft[]; onSynced: (id: string) => void; }
const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function OfflineVisitSyncModal({ user, queue, onSynced }: OfflineVisitSyncModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
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
    setSaving(true); setMessage('');
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesion no disponible.');
      await api.savePresentationVisit(token, { doctorId: selectedDoctor.id, doctorName: selectedDoctor.name, doctorSpecialty: selectedDoctor.specialty, clinic: selectedDoctor.hospitalOrClinic, address: selectedDoctor.address, presentedFlows: [], visitStatus: visit.visitStatus, requestedProducts: visit.productName && visit.productQuantity > 0 ? [{ productName: visit.productName, line: visit.productLine || 'Sin línea', quantity: visit.productQuantity }] : [], samplesDelivered: [], interestLevel: visit.interestLevel, requiresFollowUp: visit.requiresFollowUp, urgentRequest: visit.urgentRequest, finalComments: visit.finalComments });
      await removeOfflineVisit(visit.id);
      onSynced(visit.id);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo sincronizar la visita.'); }
    finally { setSaving(false); }
  };

  const sync = () => {
    if (discrepancies.length) {
      Alert.alert('Datos del médico actualizados', `Se detectaron diferencias. Se usará la información registrada en la base de datos:\n\n${discrepancies.map(([label, offline, database]) => `${label}\nCapturado: ${offline}\nBD: ${database}`).join('\n\n')}`, [{ text: 'Aceptar datos de BD', onPress: () => { void persist(); } }]);
      return;
    }
    void persist();
  };

  if (!visit) return null;
  return <Modal visible transparent animationType="fade"><View style={styles.overlay}><View style={styles.modal}><View style={styles.header}><View style={styles.icon}><UploadCloud size={23} color={colors.primary} /></View><View><Text style={styles.title}>Visita pendiente de sincronizar</Text><Text style={styles.subtitle}>Quedan {queue.length} visita{queue.length === 1 ? '' : 's'} guardada{queue.length === 1 ? '' : 's'} en esta tablet.</Text></View></View><View style={styles.summary}><Text style={styles.summaryName}>{visit.doctorName}</Text><Text style={styles.summaryText}>{new Date(visit.createdAt).toLocaleString('es-GT')}</Text>{visit.finalComments ? <Text style={styles.summaryText}>{visit.finalComments}</Text> : null}</View><Text style={styles.label}>Confirma el médico de tu cartera</Text><View style={styles.search}><Search size={17} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar médico" placeholderTextColor="#9CA3AF" style={styles.searchInput} /></View><ScrollView style={styles.doctorList}>{matches.map((doctor) => <Pressable key={doctor.id} onPress={() => setSelectedDoctorId(doctor.id)} style={[styles.doctor, selectedDoctorId === doctor.id && styles.doctorActive]}><View><Text style={styles.doctorName}>{doctor.name}</Text><Text style={styles.doctorMeta}>{doctor.specialty || 'Sin especialidad'} · {doctor.address}</Text></View><Text style={[styles.select, selectedDoctorId === doctor.id && styles.selectActive]}>{selectedDoctorId === doctor.id ? 'Seleccionado' : 'Elegir'}</Text></Pressable>)}</ScrollView>{message ? <Text style={styles.error}>{message}</Text> : null}<Pressable disabled={!selectedDoctor || saving} onPress={sync} style={[styles.button, (!selectedDoctor || saving) && styles.disabled]}>{saving ? <ActivityIndicator color={colors.onPrimary} /> : <UploadCloud size={19} color={colors.onPrimary} />}<Text style={styles.buttonText}>{saving ? 'Sincronizando...' : 'Guardar y sincronizar visita'}</Text></Pressable></View></View></Modal>;
}

const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg }, modal: { width: '100%', maxWidth: 680, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadows.card }, header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' }, icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, title: { color: colors.text, fontSize: 20, fontWeight: '900' }, subtitle: { color: colors.muted, marginTop: 2 }, summary: { backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: spacing.md, gap: 4 }, summaryName: { color: colors.text, fontWeight: '900', fontSize: 16 }, summaryText: { color: colors.muted, fontSize: 13 }, label: { color: colors.text, fontWeight: '900', fontSize: 13 }, search: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm }, searchInput: { flex: 1, color: colors.text }, doctorList: { maxHeight: 240, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, doctor: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }, doctorActive: { backgroundColor: colors.primarySoft }, doctorName: { color: colors.text, fontWeight: '900' }, doctorMeta: { color: colors.muted, fontSize: 12, marginTop: 2, maxWidth: 470 }, select: { color: colors.muted, fontSize: 12, fontWeight: '800' }, selectActive: { color: colors.primary }, button: { minHeight: 50, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm }, buttonText: { color: colors.onPrimary, fontWeight: '900' }, disabled: { opacity: 0.55 }, error: { color: colors.primaryDark, fontWeight: '800' } });
