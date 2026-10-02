import { useState } from 'react';
import { AtSign, KeyRound, LockKeyhole, Save, UserRound } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SessionUser } from '../app/types';
import { api } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';

interface SettingsScreenProps {
  currentUser: SessionUser;
  onSessionUpdated: (user: SessionUser, token: string) => void;
}

export function SettingsScreen({ currentUser, onSessionUpdated }: SettingsScreenProps) {
  const [email, setEmail] = useState(currentUser.email);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const submit = async () => {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) {
      setError(true);
      setMessage('Ingresa un correo electrónico.');
      return;
    }
    if (password && password !== passwordConfirmation) {
      setError(true);
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    if (!password && nextEmail === currentUser.email) {
      setError(true);
      setMessage('No hay cambios para guardar.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible. Ingresa de nuevo.');
      const session = await api.updateMyProfile(token, { email: nextEmail, password: password || undefined });
      const nextUser: SessionUser = { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role };
      onSessionUpdated(nextUser, session.token);
      setPassword('');
      setPasswordConfirmation('');
      setError(false);
      setMessage('Tus ajustes se guardaron correctamente.');
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : 'No se pudieron guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View style={styles.headerIcon}><UserRound size={26} color={colors.primary} /></View><View><Text style={styles.title}>Configuración</Text><Text style={styles.subtitle}>Administra las credenciales de tu cuenta.</Text></View></View>
    <View style={styles.card}>
      <View style={styles.cardHeading}><AtSign size={21} color={colors.primary} /><View><Text style={styles.cardTitle}>Correo electrónico</Text><Text style={styles.cardHint}>Se usará en tu próximo inicio de sesión.</Text></View></View>
      <View style={styles.field}><Text style={styles.label}>Correo</Text><View style={styles.inputWrap}><AtSign size={18} color={colors.muted} /><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} /></View></View>
    </View>
    <View style={styles.card}>
      <View style={styles.cardHeading}><KeyRound size={21} color={colors.primary} /><View><Text style={styles.cardTitle}>Contraseña</Text><Text style={styles.cardHint}>Déjala vacía si no deseas cambiarla.</Text></View></View>
      <View style={styles.field}><Text style={styles.label}>Nueva contraseña</Text><View style={styles.inputWrap}><LockKeyhole size={18} color={colors.muted} /><TextInput autoComplete="new-password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Nueva contraseña" placeholderTextColor="#9CA3AF" style={styles.input} /></View></View>
      <View style={styles.field}><Text style={styles.label}>Confirmar contraseña</Text><View style={styles.inputWrap}><LockKeyhole size={18} color={colors.muted} /><TextInput autoComplete="new-password" secureTextEntry value={passwordConfirmation} onChangeText={setPasswordConfirmation} placeholder="Repite la contraseña" placeholderTextColor="#9CA3AF" style={styles.input} /></View></View>
    </View>
    {message ? <Text style={[styles.message, error && styles.errorMessage]}>{message}</Text> : null}
    <Pressable disabled={saving} onPress={() => void submit()} style={[styles.saveButton, saving && styles.disabled]}><Save size={19} color={colors.onPrimary} /><Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar ajustes'}</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg, maxWidth: 760 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 3 },
  card: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  cardHeading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  cardHint: { color: colors.muted, fontSize: 13, marginTop: 3 },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 13, fontWeight: '800' },
  inputWrap: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { flex: 1, minHeight: 46, color: colors.text },
  message: { color: colors.success, fontWeight: '800' },
  errorMessage: { color: colors.primaryDark },
  saveButton: { alignSelf: 'flex-start', minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.lg },
  saveText: { color: colors.onPrimary, fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
