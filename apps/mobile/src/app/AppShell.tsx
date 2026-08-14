import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AdminScreen } from '../screens/AdminScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ModuleScreen } from '../screens/ModuleScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { Sidebar } from '../components/Sidebar';
import { canAccessScreen } from './permissions';
import { AppScreen, SessionUser } from './types';
import { colors } from '../theme/theme';
import { clearSession, loadSession } from '../services/session';

export function AppShell() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);
  const { width, height } = useWindowDimensions();
  const compactNav = width < 820 || height > width;

  const handleSplashDone = useCallback(() => {
    setCheckingSession(true);
    void loadSession()
      .then((session) => {
        if (session) {
          setUser(session.user);
          setScreen('home');
          return;
        }

        setScreen('login');
      })
      .finally(() => {
        setCheckingSession(false);
      });
  }, []);

  const handleLogin = (nextUser: SessionUser) => {
    setUser(nextUser);
    setScreen('home');
  };

  const handleLogout = () => {
    void clearSession().finally(() => {
      setUser(null);
      setScreen('login');
    });
  };

  if (screen === 'splash') {
    return <SplashScreen onDone={handleSplashDone} />;
  }

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (screen === 'login' || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const renderScreen = () => {
    if (!canAccessScreen(user.role, screen)) {
      return <HomeScreen user={user} onNavigate={setScreen} />;
    }

    switch (screen) {
      case 'admin-users':
        return <AdminScreen currentUser={user} type="users" />;
      case 'admin-products':
        return <AdminScreen currentUser={user} type="products" />;
      case 'admin-catalogs':
        return <AdminScreen currentUser={user} type="catalogs" />;
      case 'dashboard':
        return <AdminScreen currentUser={user} type="dashboard" />;
      case 'clients':
      case 'planner':
      case 'map':
      case 'visits':
      case 'marketing':
      case 'coaching':
      case 'billing':
        return <ModuleScreen role={user.role} type={screen} />;
      case 'home':
      default:
        return <HomeScreen user={user} onNavigate={setScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.shell, compactNav && styles.shellCompact]}>
        <Sidebar active={screen} compact={compactNav} role={user.role} onNavigate={setScreen} onLogout={handleLogout} />
        <View style={styles.content}>{renderScreen()}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  shellCompact: {
    flexDirection: 'column',
  },
  content: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
