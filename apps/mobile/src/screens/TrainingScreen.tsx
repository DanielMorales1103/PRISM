import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BookOpenCheck, CheckCircle2, ExternalLink, Plus } from 'lucide-react-native';
import { SessionUser } from '../app/types';
import { api, TrainingItem } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';
import { ExamPanel } from '../components/ExamPanel';

interface TrainingScreenProps { currentUser: SessionUser; }

export function TrainingScreen({ currentUser }: TrainingScreenProps) {
  const canManage = currentUser.role === 'admin' || currentUser.role === 'jefe';
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let live = true;
    void loadToken().then((token) => {
      if (!token) throw new Error('Sesion no disponible.');
      return api.getTrainings(token);
    }).then((items) => {
      if (live) setTrainings(items);
    }).catch((error) => {
      if (live) setMessage(error instanceof Error ? error.message : 'No se pudieron cargar las capacitaciones.');
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const completedCount = useMemo(() => trainings.filter((training) => training.completedAt).length, [trainings]);

  const publish = async () => {
    if (!title.trim() || !resourceUrl.trim()) {
      setMessage('Completa el titulo y el enlace de Google Drive.');
      return;
    }
    setSaving(true);
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesion no disponible.');
      const training = await api.createTraining(token, { title: title.trim(), description: description.trim(), resourceUrl: resourceUrl.trim() });
      setTrainings((current) => [training, ...current]);
      setTitle('');
      setDescription('');
      setResourceUrl('');
      setMessage('Capacitacion publicada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo publicar la capacitacion.');
    } finally {
      setSaving(false);
    }
  };

  const openResource = async (training: TrainingItem) => {
    const supported = await Linking.canOpenURL(training.resourceUrl);
    if (!supported) {
      Alert.alert('No se pudo abrir el enlace', 'Verifica que el enlace de Google Drive sea valido.');
      return;
    }
    await Linking.openURL(training.resourceUrl);
  };

  const complete = async (training: TrainingItem) => {
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesion no disponible.');
      const result = await api.completeTraining(token, training.id);
      setTrainings((current) => current.map((item) => item.id === training.id ? { ...item, completedAt: result.completedAt } : item));
    } catch (error) {
      Alert.alert('No se pudo actualizar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    }
  };

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.title}>Capacitaciones</Text><Text style={styles.subtitle}>{canManage ? 'Publica guias en Google Drive para el equipo.' : 'Material de estudio disponible para tu trabajo de visita.'}</Text></View><View style={styles.counter}><BookOpenCheck size={19} color={colors.primary} /><Text style={styles.counterText}>{completedCount}/{trainings.length} completadas</Text></View></View>

    {canManage && <View style={styles.publishCard}>
      <Text style={styles.cardTitle}>Nueva capacitacion</Text>
      <View style={styles.formRow}><View style={styles.field}><Text style={styles.label}>Titulo</Text><TextInput value={title} onChangeText={setTitle} placeholder="Ej. Portafolio de dermatologia" placeholderTextColor="#9CA3AF" style={styles.input} /></View><View style={styles.field}><Text style={styles.label}>Enlace de Google Drive</Text><TextInput value={resourceUrl} onChangeText={setResourceUrl} autoCapitalize="none" placeholder="https://drive.google.com/..." placeholderTextColor="#9CA3AF" style={styles.input} /></View></View>
      <View style={styles.field}><Text style={styles.label}>Descripcion</Text><TextInput value={description} onChangeText={setDescription} multiline placeholder="Opcional" placeholderTextColor="#9CA3AF" style={[styles.input, styles.textArea]} /></View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable disabled={saving} onPress={publish} style={({ pressed }) => [styles.publishButton, pressed && styles.pressed, saving && styles.disabled]}><Plus size={18} color={colors.onPrimary} /><Text style={styles.publishText}>{saving ? 'Publicando...' : 'Publicar capacitacion'}</Text></Pressable>
    </View>}

    {!canManage && message ? <Text style={styles.error}>{message}</Text> : null}
    {loading ? <Text style={styles.empty}>Cargando capacitaciones...</Text> : null}
    {!loading && trainings.length === 0 ? <View style={styles.emptyCard}><BookOpenCheck size={30} color={colors.primary} /><Text style={styles.emptyTitle}>Aun no hay capacitaciones</Text><Text style={styles.empty}>Las guias publicadas por el equipo apareceran aqui.</Text></View> : null}
    <View style={styles.list}>{trainings.map((training) => <View key={training.id} style={[styles.training, !training.active && styles.trainingInactive]}>
      <View style={styles.trainingIcon}><BookOpenCheck size={23} color={colors.primary} /></View>
      <View style={styles.trainingInfo}><View style={styles.trainingTop}><Text style={styles.trainingTitle}>{training.title}</Text>{training.completedAt ? <View style={styles.completed}><CheckCircle2 size={14} color={colors.success} /><Text style={styles.completedText}>Completada</Text></View> : null}</View>{training.description ? <Text style={styles.trainingDescription}>{training.description}</Text> : null}<Text style={styles.trainingMeta}>{training.active ? 'Material disponible' : 'Material archivado'}</Text></View>
      <View style={styles.actions}><Pressable onPress={() => { void openResource(training); }} style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}><ExternalLink size={16} color={colors.primary} /><Text style={styles.openText}>Abrir guia</Text></Pressable>{!training.completedAt && training.active ? <Pressable onPress={() => { void complete(training); }} style={({ pressed }) => [styles.completeButton, pressed && styles.pressed]}><Text style={styles.completeText}>Marcar completada</Text></Pressable> : null}</View>
    </View>)}</View>
    <ExamPanel canManage={canManage} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.lg, flexWrap: 'wrap' },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 16, marginTop: 3 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  counterText: { color: colors.primary, fontWeight: '900' },
  publishCard: { gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { flex: 1, minWidth: 250, gap: 6 },
  label: { color: colors.text, fontSize: 13, fontWeight: '900' },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, paddingHorizontal: spacing.md },
  textArea: { minHeight: 82, paddingVertical: spacing.sm, textAlignVertical: 'top' },
  message: { color: colors.success, fontWeight: '800' },
  error: { color: colors.primaryDark, fontWeight: '800' },
  publishButton: { alignSelf: 'flex-start', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.lg },
  publishText: { color: colors.onPrimary, fontWeight: '900' },
  list: { gap: spacing.md },
  training: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg, ...shadows.card },
  trainingInactive: { opacity: 0.6 },
  trainingIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primarySoft },
  trainingInfo: { flex: 1, gap: 4, minWidth: 180 },
  trainingTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  trainingTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '900' },
  trainingDescription: { color: colors.muted, fontSize: 14 },
  trainingMeta: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  completed: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F7F4', borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 4 },
  completedText: { color: colors.success, fontSize: 11, fontWeight: '900' },
  actions: { alignItems: 'flex-end', gap: spacing.sm },
  openButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  openText: { color: colors.primary, fontWeight: '900', fontSize: 13 },
  completeButton: { borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  completeText: { color: colors.onPrimary, fontWeight: '900', fontSize: 12 },
  emptyCard: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  emptyTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  empty: { color: colors.muted, textAlign: 'center' },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.6 },
});
