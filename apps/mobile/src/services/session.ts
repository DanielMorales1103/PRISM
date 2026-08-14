import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SessionUser } from '../app/types';

const tokenKey = 'prism.auth.token';
const userKey = 'prism.auth.user';

export interface StoredSession {
  token: string;
  user: SessionUser;
}

export async function saveSession(session: StoredSession) {
  if (Platform.OS === 'web') {
    localStorage.setItem(tokenKey, session.token);
    localStorage.setItem(userKey, JSON.stringify(session.user));
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(tokenKey, session.token),
    SecureStore.setItemAsync(userKey, JSON.stringify(session.user)),
  ]);
}

export async function loadSession(): Promise<StoredSession | null> {
  const [token, userJson] =
    Platform.OS === 'web'
      ? [localStorage.getItem(tokenKey), localStorage.getItem(userKey)]
      : await Promise.all([SecureStore.getItemAsync(tokenKey), SecureStore.getItemAsync(userKey)]);

  if (!token || !userJson) {
    return null;
  }

  try {
    return {
      token,
      user: JSON.parse(userJson) as SessionUser,
    };
  } catch {
    await clearSession();
    return null;
  }
}

export async function loadToken() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(tokenKey);
  }

  return SecureStore.getItemAsync(tokenKey);
}

export async function clearSession() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    return;
  }

  await Promise.all([SecureStore.deleteItemAsync(tokenKey), SecureStore.deleteItemAsync(userKey)]);
}
