import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, CheckCircle2, XCircle } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExamItem, ExamResultDetail, ExamResultsResponse, api } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, spacing } from '../theme/theme';

interface ExamResultsPanelProps { exam: ExamItem; onBack: () => void; }

export function ExamResultsPanel({ exam, onBack }: ExamResultsPanelProps) {
  const [data, setData] = useState<ExamResultsResponse | null>(null);
  const [selected, setSelected] = useState<ExamResultDetail | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let live = true;
    void loadToken().then((token) => {
      if (!token) throw new Error('Sesion no disponible.');
      return api.getExamResults(token, exam.id);
    }).then((result) => { if (live) setData(result); }).catch((error) => { if (live) setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los resultados.'); });
    return () => { live = false; };
  }, [exam.id]);

  const questionsById = useMemo(() => new Map((data?.exam.questions ?? []).map((question) => [question.id, question])), [data]);

  if (selected && data) return <ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => setSelected(null)} style={styles.back}><ChevronLeft size={18} color={colors.text} /><Text style={styles.backText}>Volver a resultados</Text></Pressable><Text style={styles.title}>{selected.userName}</Text><Text style={styles.subtitle}>{selected.score}% · {selected.correctCount}/{data.exam.questions.length} correctas · {selected.passed ? 'Aprobado' : 'Pendiente'}</Text>{selected.answers.map((answer, index) => { const question = questionsById.get(answer.questionId); const selectedText = question?.type === 'short_answer' ? answer.textAnswer || 'Sin respuesta' : (answer.selectedOptionIndexes ?? []).map((optionIndex) => question?.options[optionIndex]).filter(Boolean).join(', ') || 'Sin respuesta'; return <View key={`${answer.questionId}-${index}`} style={[styles.answer, answer.correct ? styles.answerCorrect : styles.answerWrong]}><View style={styles.answerHeader}>{answer.correct ? <CheckCircle2 size={18} color={colors.success} /> : <XCircle size={18} color={colors.primaryDark} />}<Text style={styles.question}>{question?.prompt ?? 'Pregunta modificada o eliminada'}</Text></View><Text style={styles.response}>Respuesta: {selectedText}</Text></View>; })}</ScrollView>;

  return <View style={styles.card}><Pressable onPress={onBack} style={styles.back}><ChevronLeft size={18} color={colors.text} /><Text style={styles.backText}>Volver a exámenes</Text></Pressable><Text style={styles.title}>Resultados: {exam.title}</Text><Text style={styles.subtitle}>Último intento registrado por visitador.</Text>{message ? <Text style={styles.error}>{message}</Text> : null}{!data && !message ? <Text style={styles.empty}>Cargando resultados...</Text> : null}{data && data.results.length === 0 ? <Text style={styles.empty}>Aún no hay respuestas para este examen.</Text> : null}{data?.results.map((result) => <Pressable key={result.id} onPress={() => setSelected(result)} style={styles.row}><View style={styles.avatar}><Text style={styles.avatarText}>{result.userName.slice(0, 2).toUpperCase()}</Text></View><View style={styles.info}><Text style={styles.name}>{result.userName}</Text><Text style={styles.email}>{result.userEmail}</Text><Text style={styles.date}>{new Date(result.submittedAt).toLocaleString('es-GT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</Text></View><View style={styles.score}><Text style={styles.scoreValue}>{result.score}%</Text><Text style={[styles.status, result.passed ? styles.pass : styles.fail]}>{result.passed ? 'Aprobado' : 'Pendiente'}</Text></View></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  content: { padding: spacing.xl, gap: spacing.md },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: colors.text, fontWeight: '800' },
  title: { color: colors.text, fontSize: 21, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: -spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  avatar: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '900' },
  info: { flex: 1, gap: 2 }, name: { color: colors.text, fontWeight: '900' }, email: { color: colors.muted, fontSize: 12 }, date: { color: colors.muted, fontSize: 11 },
  score: { alignItems: 'flex-end', gap: 3 }, scoreValue: { color: colors.text, fontSize: 18, fontWeight: '900' }, status: { fontSize: 11, fontWeight: '900' }, pass: { color: colors.success }, fail: { color: colors.primaryDark },
  answer: { gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md }, answerCorrect: { borderColor: '#BFEADF', backgroundColor: '#F1FCF8' }, answerWrong: { borderColor: '#FFD4C4', backgroundColor: '#FFF7F3' }, answerHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }, question: { flex: 1, color: colors.text, fontWeight: '900' }, response: { color: colors.muted, fontSize: 14 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.md }, error: { color: colors.primaryDark, fontWeight: '800' },
});
