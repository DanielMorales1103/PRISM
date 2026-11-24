import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { colors, radius, shadows, spacing } from '../theme/theme';

interface ConfirmationModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  title?: string;
  variant?: 'success' | 'error';
}

export function ConfirmationModal({ visible, message, onClose, title = 'Operación completada', variant = 'success' }: ConfirmationModalProps) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.icon}>{variant === 'error' ? <AlertCircle size={30} color={colors.primaryDark} /> : <CheckCircle2 size={30} color={colors.success} />}</View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <Pressable onPress={onClose} style={styles.button}><Text style={styles.buttonText}>Aceptar</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.52)', padding: spacing.lg },
  card: { width: '100%', maxWidth: 400, alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.xl, ...shadows.card },
  icon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#ECF9F6' },
  title: { color: colors.text, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: { alignSelf: 'stretch', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  buttonText: { color: colors.onPrimary, fontWeight: '900' },
});
