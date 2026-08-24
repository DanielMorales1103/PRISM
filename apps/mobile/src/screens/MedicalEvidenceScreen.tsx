import type { Product } from '@prism/shared';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, CheckCircle2, Microscope, X } from 'lucide-react-native';
import { colors, shadows, spacing } from '../theme/theme';

interface MedicalEvidenceScreenProps {
  product: Product;
  onClose: () => void;
  onContinue: () => void;
}

export function MedicalEvidenceScreen({ product, onClose, onContinue }: MedicalEvidenceScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
        <X size={28} color="#050505" />
      </Pressable>

      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Microscope size={25} color={colors.primary} />
            <Text style={styles.title}>EVIDENCIA TECNICA</Text>
          </View>
          <Text style={styles.subtitle}>ESTUDIO MULTICENTRICO FUNCIGIDA</Text>
        </View>

        <View style={styles.productPill}>
          <View style={styles.dot} />
          <Text style={styles.pillText}>PRESENTACION DE PRODUCTO</Text>
          <Text style={styles.pillDivider}>|</Text>
          <Text style={styles.pillProduct}>{product.name}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.leftColumn}>
          <View style={styles.patientCard}>
            <Text style={styles.cardEyebrow}>PERFIL DEL PACIENTE</Text>
            <InfoRow label="DIAGNOSTICO" value={product.composition ?? 'Pendiente'} />
            <InfoRow label="FOTOTIPO" value="III - IV (Fitzpatrick)" />
            <InfoRow label="LINEA" value={product.line} />
          </View>

          <View style={styles.efficacyCard}>
            <Text style={styles.cardEyebrow}>EFICACIA CLINICA</Text>
            <View style={styles.efficacyRows}>
              {[
                { label: 'Producto', value: 88, color: colors.primary, width: '88%' as const },
                { label: 'Comparativo', value: 62, color: '#050505', width: '62%' as const },
                { label: 'Placebo', value: 31, color: '#D9D9D9', width: '31%' as const },
              ].map((item) => (
                <View key={item.label} style={styles.progressRow}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>{item.label}</Text>
                    <Text style={styles.progressValue}>{item.value}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: item.width, backgroundColor: item.color }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.mainColumn}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>EVOLUCION CLINICA</Text>
            <Text style={styles.chartSubtitle}>SEGUIMIENTO DE RESULTADOS TERAPEUTICOS</Text>
            <View style={styles.evolutionGrid}>
              {[
                { day: 'Dia 0', value: '100%', height: 100 },
                { day: 'Dia 3', value: '70%', height: 70 },
                { day: 'Dia 7', value: '16%', height: 16 },
                { day: 'Dia 14', value: '2%', height: 2 },
              ].map((point) => (
                <View key={point.day} style={styles.evolutionItem}>
                  <Text style={styles.evolutionValue}>{point.value}</Text>
                  <View style={styles.evolutionBarTrack}>
                    <View style={[styles.evolutionBar, { height: `${Math.max(point.height, 8)}%` }]} />
                  </View>
                  <Text style={styles.evolutionDay}>{point.day}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomCards}>
            <View style={styles.methodCard}>
              <Text style={styles.methodEyebrow}>METODOLOGIA CIENTIFICA</Text>
              <Text style={styles.methodText}>Doble ciego, aleatorizado controlado contra placebo.</Text>
              <View style={styles.studyBadges}>
                <Text style={styles.studyBadge}>Fase III</Text>
                <Text style={styles.studyBadge}>N=450</Text>
              </View>
            </View>

            <View style={styles.satisfactionCard}>
              <View style={styles.satisfactionIcon}>
                <CheckCircle2 size={34} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.satisfactionTitle}>SATISFACCION</Text>
                <Text style={styles.satisfactionText}>Reportado por pacientes post tratamiento en clinica.</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={onContinue} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
          <Text style={styles.continueText}>CONTINUAR</Text>
          <View style={styles.arrowBox}>
            <ArrowRight size={22} color={colors.onPrimary} />
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7F6',
  },
  screenContent: {
    minHeight: '100%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 44,
    gap: spacing.xl,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: spacing.xl,
    top: spacing.xl,
    zIndex: 5,
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingLeft: 84,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: '#050505',
    fontSize: 23,
    fontWeight: '900',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
  },
  subtitle: {
    color: '#8A8A8A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  productPill: {
    minHeight: 46,
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pillText: {
    color: '#050505',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  pillDivider: {
    color: '#C6C6C6',
  },
  pillProduct: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  leftColumn: {
    width: 380,
    gap: spacing.xl,
  },
  patientCard: {
    minHeight: 210,
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  efficacyCard: {
    minHeight: 360,
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  cardEyebrow: {
    color: '#AFAFAF',
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  infoRow: {
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  infoLabel: {
    color: '#777777',
    fontSize: 11,
    fontWeight: '800',
  },
  infoValue: {
    color: '#050505',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
  },
  efficacyRows: {
    gap: spacing.lg,
  },
  progressRow: {
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  progressValue: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    height: 16,
    borderRadius: 999,
    backgroundColor: '#EFEFEF',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  mainColumn: {
    flex: 1,
    minWidth: 640,
    gap: spacing.xl,
  },
  chartCard: {
    minHeight: 470,
    borderRadius: 34,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  chartTitle: {
    color: '#050505',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  chartSubtitle: {
    color: '#9A9A9A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: spacing.sm,
  },
  evolutionGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  evolutionItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  evolutionValue: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  evolutionBarTrack: {
    width: 46,
    height: 250,
    borderRadius: 999,
    backgroundColor: '#EFEFEF',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  evolutionBar: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  evolutionDay: {
    color: '#777777',
    fontSize: 11,
    fontWeight: '900',
  },
  bottomCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  methodCard: {
    flex: 1,
    minWidth: 300,
    minHeight: 160,
    borderRadius: 28,
    backgroundColor: '#050505',
    padding: spacing.xl,
  },
  methodEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  methodText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  studyBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  studyBadge: {
    color: colors.onPrimary,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  satisfactionCard: {
    flex: 1,
    minWidth: 300,
    minHeight: 160,
    borderRadius: 28,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    ...shadows.card,
  },
  satisfactionIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satisfactionTitle: {
    color: '#050505',
    fontSize: 15,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  satisfactionText: {
    color: '#929292',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  continueButton: {
    minHeight: 62,
    borderRadius: 24,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.card,
  },
  continueText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  arrowBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
