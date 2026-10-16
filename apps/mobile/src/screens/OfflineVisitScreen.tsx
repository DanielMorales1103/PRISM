import { useState } from 'react';
import { AlertCircle, ArrowLeft, Save } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { enqueueOfflineVisit } from '../services/offlineVisitQueue';
import { colors, radius, shadows, spacing } from '../theme/theme';

interface OfflineVisitScreenProps { onBack: () => void; onSaved: () => void; }
type VisitStatus = 'purchase_made' | 'follow_up_pending' | 'not_interested';
const statuses: Array<{ id: VisitStatus; label: string }> = [{ id: 'purchase_made', label: 'Compra realizada' }, { id: 'follow_up_pending', label: 'Seguimiento' }, { id: 'not_interested', label: 'Sin interés' }];

export function OfflineVisitScreen({ onBack, onSaved }: OfflineVisitScreenProps) {
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinic, setClinic] = useState('');
  const [address, setAddress] = useState('');
  const [comments, setComments] = useState('');
  const [productName, setProductName] = useState('');
  const [productLine, setProductLine] = useState('');
  const [productQuantity, setProductQuantity] = useState('0');
  const [interestLevel, setInterestLevel] = useState(3);
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);
  const [urgentRequest, setUrgentRequest] = useState(false);
  const [status, setStatus] = useState<VisitStatus>('follow_up_pending');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!doctorName.trim()) return;
    setSaving(true);
    await enqueueOfflineVisit({ doctorName: doctorName.trim(), doctorSpecialty: specialty.trim(), clinic: clinic.trim(), address: address.trim(), finalComments: comments.trim(), productName: productName.trim(), productLine: productLine.trim(), productQuantity: Math.max(0, Number(productQuantity) || 0), interestLevel, visitStatus: status, requiresFollowUp: requiresFollowUp || status === 'follow_up_pending', urgentRequest });
    setSaving(false);
    onSaved();
  };

  return <View style={styles.screen}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.back}><ArrowLeft size={22} color={colors.text} /></Pressable><View><Text style={styles.title}>Visita sin conexión</Text><Text style={styles.subtitle}>Se guardará en esta tablet y se sincronizará al iniciar sesión con internet.</Text></View></View>
    <View style={styles.notice}><AlertCircle size={20} color={colors.warning} /><Text style={styles.noticeText}>Modo offline: solo puedes registrar visitas manuales.</Text></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Información del médico</Text><Text style={styles.label}>Nombre del médico *</Text><TextInput value={doctorName} onChangeText={setDoctorName} placeholder="Nombre completo" placeholderTextColor="#9CA3AF" style={styles.input} /><Text style={styles.label}>Especialidad</Text><TextInput value={specialty} onChangeText={setSpecialty} placeholder="Opcional" placeholderTextColor="#9CA3AF" style={styles.input} /><Text style={styles.label}>Clínica / hospital</Text><TextInput value={clinic} onChangeText={setClinic} placeholder="Opcional" placeholderTextColor="#9CA3AF" style={styles.input} /><Text style={styles.label}>Dirección</Text><TextInput value={address} onChangeText={setAddress} placeholder="Opcional" placeholderTextColor="#9CA3AF" style={styles.input} /></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Producto y resultado</Text><Text style={styles.label}>Producto presentado / solicitado</Text><TextInput value={productName} onChangeText={setProductName} placeholder="Nombre del producto" placeholderTextColor="#9CA3AF" style={styles.input} /><Text style={styles.label}>Línea</Text><TextInput value={productLine} onChangeText={setProductLine} placeholder="Opcional" placeholderTextColor="#9CA3AF" style={styles.input} /><Text style={styles.label}>Cantidad</Text><TextInput value={productQuantity} onChangeText={setProductQuantity} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF" style={styles.input} /><View style={styles.statuses}>{statuses.map((item) => <Pressable key={item.id} onPress={() => setStatus(item.id)} style={[styles.status, status === item.id && styles.statusActive]}><Text style={[styles.statusText, status === item.id && styles.statusTextActive]}>{item.label}</Text></Pressable>)}</View><Text style={styles.label}>Nivel de interés</Text><View style={styles.statuses}>{[1, 2, 3, 4, 5].map((level) => <Pressable key={level} onPress={() => setInterestLevel(level)} style={[styles.status, interestLevel === level && styles.statusActive]}><Text style={[styles.statusText, interestLevel === level && styles.statusTextActive]}>{level}</Text></Pressable>)}</View><View style={styles.statuses}><Pressable onPress={() => setRequiresFollowUp((value) => !value)} style={[styles.status, requiresFollowUp && styles.statusActive]}><Text style={[styles.statusText, requiresFollowUp && styles.statusTextActive]}>Requiere seguimiento</Text></Pressable><Pressable onPress={() => setUrgentRequest((value) => !value)} style={[styles.status, urgentRequest && styles.statusActive]}><Text style={[styles.statusText, urgentRequest && styles.statusTextActive]}>Solicitud urgente</Text></Pressable></View><Text style={styles.label}>Observaciones</Text><TextInput value={comments} onChangeText={setComments} multiline placeholder="Qué ocurrió durante la visita" placeholderTextColor="#9CA3AF" style={[styles.input, styles.comments]} /></View>
    <Pressable disabled={!doctorName.trim() || saving} onPress={save} style={[styles.save, (!doctorName.trim() || saving) && styles.disabled]}><Save size={19} color={colors.onPrimary} /><Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar visita en tablet'}</Text></Pressable>
  </ScrollView></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.xl, gap: spacing.lg }, header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, title: { color: colors.text, fontSize: 27, fontWeight: '900' }, subtitle: { color: colors.muted, marginTop: 2 }, notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: spacing.md }, noticeText: { color: colors.warning, fontWeight: '800' }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, ...shadows.card }, cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm }, label: { color: colors.text, fontWeight: '800', fontSize: 13, marginTop: spacing.xs }, input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text }, comments: { minHeight: 110, paddingVertical: spacing.sm, textAlignVertical: 'top' }, statuses: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, status: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, statusActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, statusText: { color: colors.muted, fontWeight: '800', fontSize: 13 }, statusTextActive: { color: colors.primary }, save: { minHeight: 54, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm }, saveText: { color: colors.onPrimary, fontWeight: '900', fontSize: 16 }, disabled: { opacity: 0.55 } });
