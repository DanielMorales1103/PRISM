import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, CheckCircle2, MessageSquare, Save, UserRound, AlertCircle } from 'lucide-react-native';
import { colors, shadows, spacing } from '../theme/theme';

interface VisitCommentsScreenProps {
  saving: boolean;
  onBack: () => void;
  onSave: (comments: { finalComments: string; requiresFollowUp: boolean; urgentRequest: boolean }) => void;
}

export function VisitCommentsScreen({ saving, onBack, onSave }: VisitCommentsScreenProps) {
  const [finalComments, setFinalComments] = useState('');
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);
  const [urgentRequest, setUrgentRequest] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Observaciones Finales</Text>
        <View style={styles.savedPill}>
          <Save size={16} color={colors.primary} />
          <Text style={styles.savedText}>BORRADOR GUARDADO</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <MessageSquare size={36} color={colors.onPrimary} />
          </View>
          <View>
            <Text style={styles.bannerTitle}>Feedback del Medico</Text>
            <Text style={styles.bannerSubtitle}>Captura reacciones, objeciones y puntos clave.</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>TRANSCRIPCION INTELIGENTE</Text>
          <TextInput
            value={finalComments}
            onChangeText={setFinalComments}
            multiline
            placeholder="Escribe aqui los comentarios mas relevantes de la visita medica..."
            placeholderTextColor="#B9B9B9"
            style={styles.commentInput}
          />

          <View style={styles.optionsRow}>
            <Pressable onPress={() => setRequiresFollowUp((current) => !current)} style={styles.optionCard}>
              <UserRound size={22} color={colors.primary} />
              <Text style={styles.optionText}>Requiere Seguimiento</Text>
              <View style={[styles.radio, requiresFollowUp && styles.radioActive]}>
                {requiresFollowUp && <CheckCircle2 size={17} color={colors.primary} />}
              </View>
            </Pressable>
            <Pressable onPress={() => setUrgentRequest((current) => !current)} style={styles.optionCard}>
              <AlertCircle size={22} color="#050505" />
              <Text style={styles.optionText}>Solicitud Urgente</Text>
              <View style={[styles.radio, urgentRequest && styles.radioActive]}>
                {urgentRequest && <CheckCircle2 size={17} color={colors.primary} />}
              </View>
            </Pressable>
          </View>
        </View>

        <Pressable
          disabled={saving}
          onPress={() => onSave({ finalComments, requiresFollowUp, urgentRequest })}
          style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.pressed]}
        >
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Save size={26} color={colors.onPrimary} />}
          <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Finalizar y Guardar CRM'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topbar: {
    minHeight: 140,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: '#050505',
    fontSize: 30,
    fontWeight: '900',
  },
  savedPill: {
    minHeight: 42,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  savedText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  banner: {
    minHeight: 130,
    borderRadius: 34,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadows.card,
  },
  bannerIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    color: colors.onPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
  bannerSubtitle: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  panel: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 40,
    marginTop: 50,
    ...shadows.card,
  },
  sectionLabel: {
    color: '#B0B0B0',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: spacing.xl,
  },
  commentInput: {
    minHeight: 130,
    borderRadius: 34,
    backgroundColor: '#EFEFEF',
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: 40,
  },
  optionCard: {
    flex: 1,
    minWidth: 280,
    minHeight: 68,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F2F2F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionText: {
    flex: 1,
    color: '#333333',
    fontSize: 16,
    fontWeight: '900',
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#D5D5D5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  radioActive: {
    borderColor: colors.primary,
  },
  saveButton: {
    minHeight: 96,
    borderRadius: 28,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: 60,
    ...shadows.card,
  },
  saveText: {
    color: colors.onPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
