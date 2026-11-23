import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BookOpenCheck, CircleHelp, ExternalLink, Eye, FileArchive, ImageIcon, Library, Package, Search, X } from 'lucide-react-native';
import { api, LibraryAsset, LibraryExam, LibraryResponse } from '../services/api';
import { loadToken } from '../services/session';
import { presentationHtmlFromArchive } from '../services/presentationPackage';
import { colors, radius, shadows, spacing } from '../theme/theme';

type ViewMode = 'cycles' | 'products';
type Preview = { type: 'cover'; url: string; title: string } | { type: 'presentation'; htmlUrl: string; title: string } | { type: 'exam'; exam: LibraryExam; title: string };

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

export function LibraryScreen() {
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [mode, setMode] = useState<ViewMode>('cycles');
  const [cycleId, setCycleId] = useState('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    void loadToken().then((token) => {
      if (!token) throw new Error('Sesión no disponible.');
      return api.getLibrary(token);
    }).then((result) => { if (live) setData(result); })
      .catch((error) => { if (live) setMessage(error instanceof Error ? error.message : 'No se pudo cargar la biblioteca.'); });
    return () => {
      live = false;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleCycles = useMemo(() => {
    if (!data) return [];
    return [...data.cycles].sort((a, b) => a.number - b.number).filter((cycle) => cycleId === 'all' || cycle.id === cycleId).map((cycle) => ({
      ...cycle,
      trainings: data.trainings.filter((item) => item.cycleId === cycle.id && (!normalizedSearch || `${item.title} ${item.description ?? ''}`.toLowerCase().includes(normalizedSearch))),
      exams: data.exams.filter((item) => item.cycleId === cycle.id && (!normalizedSearch || `${item.title} ${item.description ?? ''}`.toLowerCase().includes(normalizedSearch))),
    })).filter((cycle) => cycle.trainings.length || cycle.exams.length || cycleId !== 'all');
  }, [cycleId, data, normalizedSearch]);

  const unassigned = useMemo(() => data ? {
    trainings: data.trainings.filter((item) => !item.cycleId && (!normalizedSearch || `${item.title} ${item.description ?? ''}`.toLowerCase().includes(normalizedSearch))),
    exams: data.exams.filter((item) => !item.cycleId && (!normalizedSearch || `${item.title} ${item.description ?? ''}`.toLowerCase().includes(normalizedSearch))),
  } : { trainings: [], exams: [] }, [data, normalizedSearch]);

  const productGroups = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, { productId: string; productName: string; productLine: string; assets: LibraryAsset[] }>();
    data.assets.forEach((asset) => {
      if (normalizedSearch && !`${asset.productName} ${asset.productLine} ${asset.fileName}`.toLowerCase().includes(normalizedSearch)) return;
      const current = groups.get(asset.productId) ?? { productId: asset.productId, productName: asset.productName, productLine: asset.productLine, assets: [] };
      current.assets.push(asset);
      groups.set(asset.productId, current);
    });
    return [...groups.values()].sort((a, b) => a.productName.localeCompare(b.productName));
  }, [data, normalizedSearch]);

  const closePreview = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setPreview(null);
  };

  const openAsset = async (asset: LibraryAsset) => {
    setOpeningId(asset.id);
    setMessage('');
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      const access = await api.getMarketingAssetAccess(token, asset.id);
      if (asset.type === 'cover') {
        setPreview({ type: 'cover', url: access.url, title: `${asset.productName} · Portada v${asset.version}` });
        return;
      }
      if (Platform.OS !== 'web') {
        await Linking.openURL(access.url);
        return;
      }
      const response = await fetch(access.url);
      if (!response.ok) throw new Error('No se pudo descargar esta versión.');
      const html = await presentationHtmlFromArchive(await response.arrayBuffer());
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      setPreview({ type: 'presentation', htmlUrl: objectUrl.current, title: `${asset.productName} · Presentación v${asset.version}` });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo abrir el archivo.');
    } finally {
      setOpeningId(null);
    }
  };

  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View style={styles.headerIcon}><Library size={27} color={colors.primary} /></View><View style={styles.headerCopy}><Text style={styles.title}>Biblioteca</Text><Text style={styles.subtitle}>Consulta materiales, evaluaciones y versiones históricas de productos.</Text></View></View>

      <View style={styles.toolbar}>
        <View style={styles.segmented}><Pressable onPress={() => setMode('cycles')} style={[styles.segment, mode === 'cycles' && styles.segmentActive]}><BookOpenCheck size={17} color={mode === 'cycles' ? colors.primary : colors.muted} /><Text style={[styles.segmentText, mode === 'cycles' && styles.segmentTextActive]}>Por ciclo</Text></Pressable><Pressable onPress={() => setMode('products')} style={[styles.segment, mode === 'products' && styles.segmentActive]}><Package size={17} color={mode === 'products' ? colors.primary : colors.muted} /><Text style={[styles.segmentText, mode === 'products' && styles.segmentTextActive]}>Por producto</Text></Pressable></View>
        <View style={styles.search}><Search size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder={mode === 'cycles' ? 'Buscar documento o examen' : 'Buscar producto o archivo'} placeholderTextColor="#9CA3AF" style={styles.searchInput} /></View>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {!data && !message ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.subtitle}>Organizando biblioteca...</Text></View> : null}

      {data && mode === 'cycles' ? <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cycleFilters}><Pressable onPress={() => setCycleId('all')} style={[styles.filter, cycleId === 'all' && styles.filterActive]}><Text style={[styles.filterText, cycleId === 'all' && styles.filterTextActive]}>Todos los ciclos</Text></Pressable>{[...data.cycles].sort((a, b) => a.number - b.number).map((cycle) => <Pressable key={cycle.id} onPress={() => setCycleId(cycle.id)} style={[styles.filter, cycleId === cycle.id && styles.filterActive]}><Text style={[styles.filterText, cycleId === cycle.id && styles.filterTextActive]}>{cycle.name}</Text></Pressable>)}</ScrollView>
        <View style={styles.sections}>{visibleCycles.map((cycle) => <CycleSection key={cycle.id} title={cycle.name} subtitle={`${formatDate(cycle.startsAt)} al ${formatDate(cycle.endsAt)}`} trainings={cycle.trainings} exams={cycle.exams} onOpenExam={(exam) => setPreview({ type: 'exam', exam, title: exam.title })} />)}{cycleId === 'all' && (unassigned.trainings.length > 0 || unassigned.exams.length > 0) ? <CycleSection title="Sin ciclo asignado" subtitle="Contenido creado antes de organizar la biblioteca por ciclos" trainings={unassigned.trainings} exams={unassigned.exams} onOpenExam={(exam) => setPreview({ type: 'exam', exam, title: exam.title })} /> : null}</View>
        {visibleCycles.length === 0 && unassigned.trainings.length === 0 && unassigned.exams.length === 0 ? <EmptyState text="No hay materiales para este filtro." /> : null}
      </> : null}

      {data && mode === 'products' ? <View style={styles.sections}>{productGroups.map((group) => <View key={group.productId} style={styles.section}><View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>{group.productName}</Text><Text style={styles.sectionSubtitle}>{group.productLine} · {group.assets.length} versiones guardadas</Text></View></View><View style={styles.assetList}>{group.assets.map((asset) => <View key={asset.id} style={styles.row}><View style={styles.rowIcon}>{asset.type === 'cover' ? <ImageIcon size={20} color={colors.primary} /> : <FileArchive size={20} color={colors.primary} />}</View><View style={styles.rowCopy}><View style={styles.rowTitleLine}><Text style={styles.rowTitle}>{asset.type === 'cover' ? 'Portada' : 'Presentación'} v{asset.version}</Text>{asset.active ? <Text style={styles.currentBadge}>Vigente</Text> : <Text style={styles.historyBadge}>Histórica</Text>}</View><Text style={styles.rowMeta}>{asset.fileName} · {formatSize(asset.size)} · {formatDate(asset.createdAt)}</Text></View><Pressable disabled={openingId === asset.id} onPress={() => { void openAsset(asset); }} style={styles.openButton}>{openingId === asset.id ? <ActivityIndicator size="small" color={colors.primary} /> : <><ExternalLink size={16} color={colors.primary} /><Text style={styles.openText}>Abrir</Text></>}</Pressable></View>)}</View></View>)}{productGroups.length === 0 ? <EmptyState text="No hay versiones de producto para este filtro." /> : null}</View> : null}
    </ScrollView>

    <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={closePreview}><View style={styles.modalOverlay}><View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{preview?.title}</Text><Pressable accessibilityLabel="Cerrar vista previa" onPress={closePreview} style={styles.closeButton}><X size={20} color={colors.text} /></Pressable></View><View style={styles.preview}>{preview?.type === 'cover' ? <Image source={{ uri: preview.url }} style={styles.previewImage} resizeMode="contain" /> : preview?.type === 'presentation' ? createElement('iframe', { src: preview.htmlUrl, title: preview.title, sandbox: 'allow-scripts allow-forms allow-popups', style: { width: '100%', height: '100%', border: 0, backgroundColor: '#FFFFFF' } }) : preview?.type === 'exam' ? <ExamPreview exam={preview.exam} /> : null}</View></View></View></Modal>
  </View>;
}

function CycleSection({ title, subtitle, trainings, exams, onOpenExam }: { title: string; subtitle: string; trainings: LibraryResponse['trainings']; exams: LibraryResponse['exams']; onOpenExam: (exam: LibraryExam) => void; }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View><Text style={styles.count}>{trainings.length + exams.length} elementos</Text></View><View style={styles.assetList}>{trainings.map((training) => <View key={training.id} style={styles.row}><View style={styles.rowIcon}><BookOpenCheck size={20} color={colors.primary} /></View><View style={styles.rowCopy}><View style={styles.rowTitleLine}><Text style={styles.rowTitle}>{training.title}</Text>{!training.active ? <Text style={styles.historyBadge}>Deshabilitado</Text> : null}</View><Text style={styles.rowMeta}>Documento · {formatDate(training.createdAt)}</Text>{training.description ? <Text style={styles.rowDescription}>{training.description}</Text> : null}</View><Pressable onPress={() => { void Linking.openURL(training.resourceUrl); }} style={styles.openButton}><ExternalLink size={16} color={colors.primary} /><Text style={styles.openText}>Abrir</Text></Pressable></View>)}{exams.map((exam) => <View key={exam.id} style={styles.row}><View style={styles.rowIcon}><CircleHelp size={20} color={colors.primary} /></View><View style={styles.rowCopy}><View style={styles.rowTitleLine}><Text style={styles.rowTitle}>{exam.title}</Text>{!exam.active ? <Text style={styles.historyBadge}>Deshabilitado</Text> : null}</View><Text style={styles.rowMeta}>Evaluación · {exam.questionCount} preguntas · Nota mínima {exam.passingScore}% · Máximo {exam.maxAttempts} intentos · {formatDate(exam.createdAt)}</Text>{exam.description ? <Text style={styles.rowDescription}>{exam.description}</Text> : null}</View><Pressable onPress={() => onOpenExam(exam)} style={styles.openButton}><Eye size={16} color={colors.primary} /><Text style={styles.openText}>Ver examen</Text></Pressable></View>)}</View></View>;
}

function ExamPreview({ exam }: { exam: LibraryExam }) {
  return <ScrollView contentContainerStyle={styles.examPreview}><View style={styles.examSummary}><Text style={styles.examSummaryTitle}>Evaluación de consulta</Text><Text style={styles.examSummaryMeta}>{exam.questionCount} preguntas · Calificación mínima para aprobar {exam.passingScore}%</Text>{exam.description ? <Text style={styles.rowDescription}>{exam.description}</Text> : null}</View>{exam.questions.map((question, index) => <View key={question.id} style={styles.examQuestion}><Text style={styles.examQuestionTitle}>{index + 1}. {question.prompt}</Text>{question.type === 'short_answer' ? <View style={styles.shortAnswer}><Text style={styles.shortAnswerText}>Respuesta escrita</Text></View> : <View style={styles.examOptions}>{question.options.map((option, optionIndex) => <View key={`${question.id}-${optionIndex}`} style={[styles.examOption, question.correctOptionIndexes?.includes(optionIndex) && styles.examOptionCorrect]}><View style={[styles.optionBullet, question.correctOptionIndexes?.includes(optionIndex) && styles.optionBulletCorrect]} /> <Text style={styles.examOptionText}>{option}</Text>{question.correctOptionIndexes?.includes(optionIndex) ? <Text style={styles.correctLabel}>Respuesta correcta</Text> : null}</View>)}</View>}</View>)}</ScrollView>;
}

function EmptyState({ text }: { text: string }) {
  return <View style={styles.empty}><Library size={30} color={colors.primary} /><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  headerCopy: { flex: 1 }, title: { color: colors.text, fontSize: 28, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 15, marginTop: 3 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  segmented: { flexDirection: 'row', borderRadius: 8, backgroundColor: '#ECEDEF', padding: 4 }, segment: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 6, paddingHorizontal: spacing.md }, segmentActive: { backgroundColor: colors.surface }, segmentText: { color: colors.muted, fontWeight: '800' }, segmentTextActive: { color: colors.primary },
  search: { flex: 1, minWidth: 280, maxWidth: 560, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: colors.surface }, searchInput: { flex: 1, color: colors.text, minHeight: 46 },
  message: { color: colors.primaryDark, fontWeight: '800' }, loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  cycleFilters: { gap: spacing.sm, paddingVertical: 2 }, filter: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: colors.surface }, filterActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, filterText: { color: colors.muted, fontWeight: '800' }, filterTextActive: { color: colors.primary },
  sections: { gap: spacing.lg }, section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.lg, gap: spacing.md, ...shadows.card }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' }, sectionSubtitle: { color: colors.muted, marginTop: 3 }, count: { color: colors.primary, fontSize: 12, fontWeight: '900', backgroundColor: colors.primarySoft, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  assetList: { borderTopWidth: 1, borderTopColor: colors.border }, row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md }, rowIcon: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, rowCopy: { flex: 1, minWidth: 160, gap: 3 }, rowTitleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }, rowTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, rowMeta: { color: colors.muted, fontSize: 12, fontWeight: '700' }, rowDescription: { color: colors.muted, fontSize: 13 }, currentBadge: { color: colors.success, fontSize: 10, fontWeight: '900', backgroundColor: '#E8F7F4', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 }, historyBadge: { color: colors.muted, fontSize: 10, fontWeight: '900', backgroundColor: '#F0F1F3', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  openButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.md }, openText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }, emptyText: { color: colors.muted, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.58)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg }, modal: { width: '100%', maxWidth: 1180, height: '88%', borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface }, modalHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.lg }, modalTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '900' }, closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, preview: { flex: 1, backgroundColor: '#FFFFFF' }, previewImage: { width: '100%', height: '100%' },
  examPreview: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: spacing.xl, gap: spacing.md }, examSummary: { gap: 5, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, examSummaryTitle: { color: colors.text, fontSize: 20, fontWeight: '900' }, examSummaryMeta: { color: colors.muted, fontWeight: '700' }, examQuestion: { gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.lg, backgroundColor: colors.surface }, examQuestionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, examOptions: { gap: spacing.sm }, examOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: '#FAFAFB' }, examOptionCorrect: { borderColor: colors.success, backgroundColor: '#E8F7F4' }, optionBullet: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.muted }, optionBulletCorrect: { borderColor: colors.success, backgroundColor: colors.success }, examOptionText: { flex: 1, color: colors.text }, correctLabel: { color: colors.success, fontSize: 11, fontWeight: '900' }, shortAnswer: { minHeight: 52, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: '#FAFAFB' }, shortAnswerText: { color: colors.muted, fontStyle: 'italic' },
});
