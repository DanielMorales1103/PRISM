import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Archive, BarChart3, CheckCircle2, CircleHelp, LockKeyhole, Pencil, Plus, RotateCcw, Send, Trash2 } from 'lucide-react-native';
import { ExamItem, ExamQuestionType, api } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, spacing } from '../theme/theme';
import { ExamResultsPanel } from './ExamResultsPanel';
import { ConfirmationModal } from './ConfirmationModal';
import type { Cycle } from '@prism/shared';

interface QuestionDraft { id?: string; prompt: string; type: ExamQuestionType; options: string[]; correctOptionIndexes: number[]; acceptedAnswers: string; }
const newQuestion = (): QuestionDraft => ({ prompt: '', type: 'single_choice', options: ['', ''], correctOptionIndexes: [], acceptedAnswers: '' });

interface ExamPanelProps { canManage: boolean; cycles: Cycle[]; onExamActiveChange?: (active: boolean) => void; }

export function ExamPanel({ canManage, cycles, onExamActiveChange }: ExamPanelProps) {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [title, setTitle] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resultsExam, setResultsExam] = useState<ExamItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [taking, setTaking] = useState<ExamItem | null>(null);
  const [pendingStart, setPendingStart] = useState<ExamItem | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionIndexes?: number[]; textAnswer?: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const answersRef = useRef(answers);
  const submittingRef = useRef(false);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => {
    onExamActiveChange?.(Boolean(taking));
    return () => onExamActiveChange?.(false);
  }, [onExamActiveChange, taking]);

  const load = async () => {
    const token = await loadToken();
    if (!token) throw new Error('Sesion no disponible.');
    setExams(await api.getExams(token));
  };

  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los examenes.')); }, []);

  const updateQuestion = (index: number, update: Partial<QuestionDraft>) => setQuestions((current) => current.map((question, currentIndex) => currentIndex === index ? { ...question, ...update } : question));
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => setQuestions((current) => current.map((question, currentIndex) => currentIndex === questionIndex ? { ...question, options: question.options.map((option, currentOptionIndex) => currentOptionIndex === optionIndex ? value : option) } : question));
  const toggleCorrect = (questionIndex: number, optionIndex: number) => setQuestions((current) => current.map((question, currentIndex) => {
    if (currentIndex !== questionIndex) return question;
    const selected = question.correctOptionIndexes.includes(optionIndex);
    return { ...question, correctOptionIndexes: question.type === 'single_choice' ? [optionIndex] : selected ? question.correctOptionIndexes.filter((value) => value !== optionIndex) : [...question.correctOptionIndexes, optionIndex] };
  }));

  const startEditor = (exam?: ExamItem) => {
    if (exam) {
      setEditingId(exam.id);
      setCycleId(exam.cycleId ?? '');
      setTitle(exam.title);
      setDescription(exam.description ?? '');
      setPassingScore(String(exam.passingScore));
      setMaxAttempts(String(exam.maxAttempts ?? 1));
      setQuestions(exam.questions.map((question) => ({ id: question.id, prompt: question.prompt, type: question.type, options: question.options, correctOptionIndexes: question.correctOptionIndexes ?? [], acceptedAnswers: (question.acceptedAnswers ?? []).join('\n') })));
    } else {
      setEditingId(null); setCycleId(cycles.find((cycle) => cycle.active)?.id ?? cycles[0]?.id ?? ''); setTitle(''); setDescription(''); setPassingScore('70'); setMaxAttempts('1'); setQuestions([newQuestion()]);
    }
    setCreating(true);
    setMessage('');
  };

  const publish = async () => {
    if (!title.trim()) { setMessage('Escribe el titulo del examen.'); return; }
    setSaving(true);
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesion no disponible.');
      const payload = {
        cycleId: cycleId || undefined, title: title.trim(), description: description.trim(), passingScore: Number(passingScore), maxAttempts: Number(maxAttempts),
        questions: questions.map((question) => ({ ...question, options: question.options.filter((option) => option.trim()), acceptedAnswers: question.acceptedAnswers.split('\n').map((answer) => answer.trim()).filter(Boolean) })),
      };
      const exam = editingId ? await api.updateExam(token, editingId, payload) : await api.createExam(token, payload);
      setExams((current) => editingId ? current.map((item) => item.id === exam.id ? exam : item) : [exam, ...current]);
      setCycleId(''); setTitle(''); setDescription(''); setPassingScore('70'); setMaxAttempts('1'); setQuestions([newQuestion()]); setCreating(false); setEditingId(null); setConfirmation(editingId ? 'Examen actualizado.' : 'Examen publicado.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo publicar el examen.'); }
    finally { setSaving(false); }
  };

  const begin = (exam: ExamItem) => {
    if (Platform.OS === 'web') {
      setPendingStart(exam);
      return;
    }
    Alert.alert(
      '¿Iniciar examen?',
      'Al comenzar no podrás abrir materiales ni salir de esta pantalla. Si cambias de pestaña, minimizas la aplicación o intentas salir, el examen se enviará con las respuestas registradas hasta ese momento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar examen', onPress: () => { setTaking(exam); setAnswers({}); answersRef.current = {}; setMessage(''); } },
      ],
    );
  };
  const confirmStart = () => {
    if (!pendingStart) return;
    const exam = pendingStart;
    setPendingStart(null);
    setTaking(exam); setAnswers({}); answersRef.current = {}; setMessage('');
  };
  const updateStatus = async (exam: ExamItem) => {
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesion no disponible.');
      const updated = await api.updateExamStatus(token, exam.id, !exam.active);
      setExams((current) => current.map((item) => item.id === exam.id ? updated : item));
      setConfirmation(updated.active ? 'Examen habilitado.' : 'Examen deshabilitado.');
    } catch (error) {
      Alert.alert('No se pudo cambiar el estado', error instanceof Error ? error.message : 'Intenta nuevamente.');
    }
  };
  const toggleAnswer = (question: ExamItem['questions'][number], optionIndex: number) => setAnswers((current) => {
    const selected = current[question.id]?.selectedOptionIndexes ?? [];
    const next = question.type === 'single_choice' ? [optionIndex] : selected.includes(optionIndex) ? selected.filter((value) => value !== optionIndex) : [...selected, optionIndex];
    return { ...current, [question.id]: { selectedOptionIndexes: next } };
  });
  const submit = async (automatic = false) => {
    if (!taking || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesion no disponible.');
      const result = await api.submitExam(token, taking.id, taking.questions.map((question) => ({ questionId: question.id, ...answersRef.current[question.id] })));
      setExams((current) => current.map((exam) => exam.id === taking.id ? { ...exam, latestAttempt: result, attemptCount: (exam.attemptCount ?? 0) + 1 } : exam));
      setTaking(null);
      Alert.alert(automatic ? 'Examen enviado automáticamente' : result.passed ? 'Examen aprobado' : 'Examen finalizado', `${result.correctCount} de ${result.totalQuestions} respuestas correctas. Nota: ${result.score}%.`);
    } catch (error) { Alert.alert('No se pudo enviar', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  useEffect(() => {
    if (!taking) return;

    const sendAutomatically = () => { void submit(true); };
    const backSubscription = Platform.OS === 'web'
      ? null
      : BackHandler.addEventListener('hardwareBackPress', () => { sendAutomatically(); return true; });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'inactive' || state === 'background') sendAutomatically();
    });

    const handleVisibility = () => { if (document.visibilityState === 'hidden') sendAutomatically(); };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      sendAutomatically();
      event.preventDefault();
      event.returnValue = '';
    };
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      backSubscription?.remove();
      appStateSubscription.remove();
      if (Platform.OS === 'web') {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [taking]);

  if (resultsExam) return <ExamResultsPanel exam={resultsExam} onBack={() => setResultsExam(null)} />;

  if (taking) return <View style={[styles.section, styles.protectedExam]}><View style={styles.protectedHeader}><View style={styles.lockIcon}><LockKeyhole size={20} color={colors.primary} /></View><View style={styles.protectedCopy}><Text style={styles.sectionTitle}>{taking.title}</Text><Text style={styles.subtitle}>Examen en curso. Salir o cambiar de aplicación enviará tus respuestas automáticamente.</Text></View></View>{taking.questions.map((question, index) => <View key={question.id} style={styles.question}><Text style={styles.questionTitle}>{index + 1}. {question.prompt}</Text>{question.type === 'short_answer' ? <TextInput value={answers[question.id]?.textAnswer ?? ''} onChangeText={(textAnswer) => setAnswers((current) => ({ ...current, [question.id]: { textAnswer } }))} placeholder="Escribe tu respuesta" placeholderTextColor="#9CA3AF" style={styles.input} /> : question.options.map((option, optionIndex) => { const selected = (answers[question.id]?.selectedOptionIndexes ?? []).includes(optionIndex); return <Pressable key={`${question.id}-${optionIndex}`} onPress={() => toggleAnswer(question, optionIndex)} style={[styles.answer, selected && styles.answerSelected]}><View style={[styles.answerMark, selected && styles.answerMarkSelected]}>{selected ? <CheckCircle2 size={15} color={colors.onPrimary} /> : null}</View><Text style={[styles.answerText, selected && styles.answerTextSelected]}>{option}</Text></Pressable>; })}</View>)}<Pressable disabled={submitting} onPress={() => { void submit(); }} style={[styles.primaryButton, submitting && styles.disabled]}><Send size={17} color={colors.onPrimary} /><Text style={styles.primaryButtonText}>{submitting ? 'Calificando...' : 'Enviar examen'}</Text></Pressable></View>;

  return <View style={styles.section}><View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Exámenes</Text><Text style={styles.subtitle}>Evaluaciones con calificación automática.</Text></View>{canManage ? <Pressable onPress={() => creating ? setCreating(false) : startEditor()} style={styles.outlineButton}><Plus size={17} color={colors.primary} /><Text style={styles.outlineButtonText}>{creating ? 'Cerrar' : 'Crear examen'}</Text></Pressable> : null}</View>
    <Modal visible={Boolean(pendingStart)} transparent animationType="fade" onRequestClose={() => setPendingStart(null)}><View style={styles.modalOverlay}><View style={styles.confirmation}><Text style={styles.confirmationTitle}>¿Iniciar examen?</Text><Text style={styles.confirmationText}>Al comenzar no podrás abrir materiales ni salir de esta pantalla. Si cambias de pestaña o sales, se enviarán las respuestas registradas.</Text><View style={styles.confirmationActions}><Pressable onPress={() => setPendingStart(null)} style={styles.outlineButton}><Text style={styles.outlineButtonText}>Cancelar</Text></Pressable><Pressable onPress={confirmStart} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Iniciar examen</Text></Pressable></View></View></View></Modal>
    {canManage && creating ? <View style={styles.builder}><View style={styles.cycleBlock}><Text style={styles.label}>Ciclo</Text><View style={styles.typeRow}>{cycles.map((cycle) => <Pressable key={cycle.id} onPress={() => setCycleId(cycle.id)} style={[styles.typeButton, cycleId === cycle.id && styles.typeButtonActive]}><Text style={[styles.typeText, cycleId === cycle.id && styles.typeTextActive]}>{cycle.name}</Text></Pressable>)}</View></View><TextInput value={title} onChangeText={setTitle} placeholder="Titulo del examen" placeholderTextColor="#9CA3AF" style={styles.input} /><TextInput value={description} onChangeText={setDescription} placeholder="Descripción opcional" placeholderTextColor="#9CA3AF" style={styles.input} /><View style={styles.scoreRow}><Text style={styles.label}>Calificación mínima para aprobar (%)</Text><TextInput value={passingScore} onChangeText={setPassingScore} keyboardType="number-pad" style={styles.scoreInput} /></View><View style={styles.scoreRow}><Text style={styles.label}>Límite de intentos</Text><TextInput value={maxAttempts} onChangeText={(value) => setMaxAttempts(value.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="1" style={styles.scoreInput} /></View>{questions.map((question, questionIndex) => <View key={questionIndex} style={styles.questionBuilder}><View style={styles.questionHeader}><Text style={styles.label}>Pregunta {questionIndex + 1}</Text>{questions.length > 1 ? <Pressable onPress={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))}><Trash2 size={17} color={colors.primaryDark} /></Pressable> : null}</View><TextInput value={question.prompt} onChangeText={(prompt) => updateQuestion(questionIndex, { prompt })} placeholder="Escribe la pregunta" placeholderTextColor="#9CA3AF" style={styles.input} /><View style={styles.typeRow}>{([{ id: 'single_choice', label: 'Una respuesta' }, { id: 'multiple_choice', label: 'Varias respuestas' }, { id: 'short_answer', label: 'Respuesta directa' }] as const).map((type) => <Pressable key={type.id} onPress={() => updateQuestion(questionIndex, { type: type.id, correctOptionIndexes: [] })} style={[styles.typeButton, question.type === type.id && styles.typeButtonActive]}><Text style={[styles.typeText, question.type === type.id && styles.typeTextActive]}>{type.label}</Text></Pressable>)}</View>{question.type === 'short_answer' ? <TextInput value={question.acceptedAnswers} onChangeText={(acceptedAnswers) => updateQuestion(questionIndex, { acceptedAnswers })} multiline placeholder="Una respuesta válida por línea" placeholderTextColor="#9CA3AF" style={[styles.input, styles.textArea]} /> : <View style={styles.options}>{question.options.map((option, optionIndex) => <View key={optionIndex} style={styles.optionRow}><Pressable onPress={() => toggleCorrect(questionIndex, optionIndex)} style={[styles.correctMark, question.correctOptionIndexes.includes(optionIndex) && styles.correctMarkActive]}>{question.correctOptionIndexes.includes(optionIndex) ? <CheckCircle2 size={15} color={colors.onPrimary} /> : null}</Pressable><TextInput value={option} onChangeText={(value) => updateOption(questionIndex, optionIndex, value)} placeholder={`Opción ${optionIndex + 1}`} placeholderTextColor="#9CA3AF" style={[styles.input, styles.optionInput]} /></View>)}<Pressable onPress={() => updateQuestion(questionIndex, { options: [...question.options, ''] })}><Text style={styles.addOption}>+ Agregar opción</Text></Pressable><Text style={styles.helper}>Marca la respuesta correcta a la izquierda.</Text></View>}</View>)}<Pressable onPress={() => setQuestions((current) => [...current, newQuestion()])} style={styles.outlineButton}><Plus size={17} color={colors.primary} /><Text style={styles.outlineButtonText}>Agregar pregunta</Text></Pressable><Pressable disabled={saving} onPress={() => { void publish(); }} style={[styles.primaryButton, saving && styles.disabled]}><Text style={styles.primaryButtonText}>{saving ? 'Publicando...' : 'Publicar examen'}</Text></Pressable></View> : null}
    {message ? <Text style={styles.message}>{message}</Text> : null}<View style={styles.examList}>{exams.length === 0 ? <Text style={styles.empty}>Aún no hay exámenes publicados.</Text> : exams.map((exam) => { const exhausted = !canManage && (exam.attemptCount ?? 0) >= exam.maxAttempts; return <View key={exam.id} style={[styles.exam, !exam.active && styles.examInactive]}><View style={styles.examIcon}><CircleHelp size={22} color={colors.primary} /></View><View style={styles.examInfo}><Text style={styles.examTitle}>{exam.title}</Text>{exam.description ? <Text style={styles.examDescription}>{exam.description}</Text> : null}<Text style={styles.examMeta}>{exam.questions.length} preguntas · Nota mínima {exam.passingScore}% · Intentos {exam.attemptCount ?? 0}/{exam.maxAttempts}{!exam.active ? ' · Deshabilitado' : ''}</Text>{!canManage && exam.latestAttempt ? <Text style={[styles.result, exam.latestAttempt.passed ? styles.resultPass : styles.resultFail]}>Último intento: {exam.latestAttempt.score}% · {exam.latestAttempt.passed ? 'Aprobado' : 'Pendiente'}</Text> : null}{exhausted ? <Text style={styles.resultFail}>Límite de intentos alcanzado</Text> : null}</View>{canManage ? <View style={styles.managerActions}><Pressable onPress={() => startEditor(exam)} style={styles.iconButton}><Pencil size={16} color={colors.primary} /></Pressable><Pressable onPress={() => setResultsExam(exam)} style={styles.iconButton}><BarChart3 size={16} color={colors.primary} /></Pressable><Pressable onPress={() => { void updateStatus(exam); }} style={[styles.statusButton, exam.active ? styles.disableButton : styles.enableButton]}>{exam.active ? <Archive size={15} color={colors.primary} /> : <RotateCcw size={15} color={colors.success} />}<Text style={[styles.statusText, !exam.active && styles.enableText]}>{exam.active ? 'Deshabilitar' : 'Volver a habilitar'}</Text></Pressable></View> : exam.active && !exhausted ? <Pressable onPress={() => begin(exam)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Responder</Text></Pressable> : null}</View>; })}</View>
    <ConfirmationModal visible={Boolean(confirmation)} message={confirmation} onClose={() => setConfirmation('')} />
  </View>;
}

const styles = {
  section: { gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg }, modalOverlay: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: 'rgba(17,24,39,0.52)', padding: spacing.lg }, confirmation: { width: '100%' as const, maxWidth: 460, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.xl }, confirmationTitle: { color: colors.text, fontWeight: '900' as const, fontSize: 20 }, confirmationText: { color: colors.muted, lineHeight: 20 }, confirmationActions: { flexDirection: 'row' as const, justifyContent: 'flex-end' as const, gap: spacing.sm, flexWrap: 'wrap' as const },
  protectedExam: { width: '100%' as const, maxWidth: 980, alignSelf: 'center' as const }, protectedHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md }, lockIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.primarySoft }, protectedCopy: { flex: 1 },
  sectionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, gap: spacing.md, flexWrap: 'wrap' as const },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' as const }, subtitle: { color: colors.muted, marginTop: 3 }, label: { color: colors.text, fontWeight: '900' as const, fontSize: 13 },
  builder: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }, input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, paddingHorizontal: spacing.md }, textArea: { minHeight: 80, paddingVertical: spacing.sm, textAlignVertical: 'top' as const }, scoreRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md }, scoreInput: { width: 88, minHeight: 40, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, paddingHorizontal: spacing.sm },
  cycleBlock: { gap: spacing.sm },
  questionBuilder: { gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md }, questionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const }, typeRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm }, typeButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 7 }, typeButtonActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, typeText: { color: colors.muted, fontSize: 12, fontWeight: '800' as const }, typeTextActive: { color: colors.primary }, options: { gap: spacing.sm }, optionRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm }, correctMark: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const }, correctMarkActive: { backgroundColor: colors.primary, borderColor: colors.primary }, optionInput: { flex: 1 }, addOption: { color: colors.primary, fontWeight: '900' as const, fontSize: 13 }, helper: { color: colors.muted, fontSize: 12 },
  outlineButton: { alignSelf: 'flex-start' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, outlineButtonText: { color: colors.primary, fontWeight: '900' as const, fontSize: 13 }, primaryButton: { alignSelf: 'flex-start' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, primaryButtonText: { color: colors.onPrimary, fontWeight: '900' as const, fontSize: 13 }, disabled: { opacity: 0.6 },
  message: { color: colors.primaryDark, fontWeight: '800' as const }, examList: { gap: spacing.sm }, exam: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }, examInactive: { opacity: 0.65 }, examIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center' as const, justifyContent: 'center' as const }, examInfo: { flex: 1, gap: 3 }, examTitle: { color: colors.text, fontWeight: '900' as const, fontSize: 16 }, examDescription: { color: colors.muted, fontSize: 13 }, examMeta: { color: colors.muted, fontSize: 12, fontWeight: '800' as const }, result: { fontSize: 12, fontWeight: '900' as const }, resultPass: { color: colors.success }, resultFail: { color: colors.primaryDark }, managerActions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, flexWrap: 'wrap' as const, justifyContent: 'flex-end' as const }, iconButton: { width: 34, height: 34, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const }, statusButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, minHeight: 34 }, disableButton: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, enableButton: { borderColor: colors.success, backgroundColor: '#E8F7F4' }, statusText: { color: colors.primary, fontWeight: '900' as const, fontSize: 11 }, enableText: { color: colors.success }, empty: { color: colors.muted, textAlign: 'center' as const, paddingVertical: spacing.md },
  back: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 }, backText: { color: colors.text, fontWeight: '800' as const }, question: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }, questionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' as const }, answer: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm }, answerSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, answerMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const }, answerMarkSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, answerText: { color: colors.text, flex: 1 }, answerTextSelected: { color: colors.primary, fontWeight: '800' as const },
};
