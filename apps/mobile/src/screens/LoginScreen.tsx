import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Lock, User } from 'lucide-react-native';
import { SessionUser } from '../app/types';
import { api } from '../services/api';
import { saveSession } from '../services/session';
import { colors, radius, spacing } from '../theme/theme';

interface LoginScreenProps {
  onLogin: (user: SessionUser) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('admin@prism.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { width, height } = useWindowDimensions();
  const landscape = width > height && width >= 840;

  const submit = async () => {
    setLoading(true);
    setError('');

    try {
      const session = await api.login(email, password);
      const nextUser: SessionUser = {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      };

      await saveSession({
        token: session.token,
        user: nextUser,
      });

      onLogin(nextUser);
    } catch {
      setError('Credenciales invalidas o API no disponible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      {landscape && (
        <View style={styles.hero}>
          <View style={styles.heroShade}>
            <Text style={styles.heroLogo}>PRISM</Text>
            <Text style={styles.heroTitle}>Innovacion en la visita medica</Text>
            <Text style={styles.heroCopy}>Gestion inteligente de rutas, productos, visitas y KPIs para equipos de campo.</Text>
          </View>
        </View>
      )}

      <View style={[styles.formSide, !landscape && styles.formFull]}>
        <View style={styles.formCard}>
          {!landscape && <Text style={styles.mobileLogo}>PRISM</Text>}
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Ingresa tus credenciales corporativas</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Usuario</Text>
            <View style={styles.inputWrap}>
              <User size={18} color={colors.muted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="visitador@prism.com"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contrasena</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={colors.muted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="********"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={loading} onPress={submit} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}>
            <Text style={styles.buttonText}>{loading ? 'Validando...' : 'Ingresar al sistema'}</Text>
          </Pressable>

          <Text style={styles.hint}>Usa el usuario administrador creado en MongoDB.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
  },
  hero: {
    flex: 1,
    backgroundColor: colors.black,
  },
  heroShade: {
    flex: 1,
    padding: spacing.xxl,
    justifyContent: 'center',
  },
  heroLogo: {
    color: colors.onPrimary,
    fontSize: 42,
    fontWeight: '900',
    marginBottom: spacing.xl,
  },
  heroTitle: {
    color: colors.onPrimary,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
    maxWidth: 460,
  },
  heroCopy: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 440,
    marginTop: spacing.lg,
  },
  formSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  formFull: {
    width: '100%',
  },
  formCard: {
    width: '100%',
    maxWidth: 460,
  },
  mobileLogo: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  inputWrap: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  button: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  error: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
