import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Lock, User } from 'lucide-react-native';
import { SessionUser } from '../app/types';
import { api } from '../services/api';
import { saveSession } from '../services/session';
import { colors, radius, spacing } from '../theme/theme';

interface LoginScreenProps {
  onLogin: (user: SessionUser) => void;
  onOffline: () => void;
}

export function LoginScreen({ onLogin, onOffline }: LoginScreenProps) {
  const [email, setEmail] = useState('');
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
        id: session.user.id,
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
            <Text style={styles.heroTitle}>Innovacion en la visita medica</Text>
            <Text style={styles.heroCopy}>Gestion inteligente de rutas, productos, visitas y KPIs para equipos de campo.</Text>
          </View>
        </View>
      )}

      <ScrollView style={[styles.formSide, !landscape && styles.formFull]} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Image source={require('../../assets/prism-logo-full.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="PriSm" />
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

          <Pressable disabled={loading} onPress={onOffline} style={styles.offlineButton}>
            <Text style={styles.offlineButtonText}>Entrar sin internet</Text>
          </Pressable>

        </View>
      </ScrollView>
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
  },
  formContent: {
    flexGrow: 1,
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
  logo: {
    width: 174,
    height: 76,
    alignSelf: 'center',
    marginBottom: spacing.lg,
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
  offlineButton: {
    minHeight: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  offlineButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  error: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
