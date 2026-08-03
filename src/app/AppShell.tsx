import { useCallback, useState } from 'react';
import { SafeAreaView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AdminScreen } from '../screens/AdminScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { Sidebar } from '../components/Sidebar';
import { AppScreen, SessionUser } from './types';
import { colors } from '../theme/theme';

export function AppShell() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [user, setUser] = useState<SessionUser | null>(null);
  const { width, height } = useWindowDimensions();
  const compactNav = width < 820 || height > width;

  const handleSplashDone = useCallback(() => {
    setScreen('login');
  }, []);

  const handleLogin = (nextUser: SessionUser) => {
    setUser(nextUser);
    setScreen('home');
  };

  if (screen === 'splash') {
    return <SplashScreen onDone={handleSplashDone} />;
  }

  if (screen === 'login' || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const renderScreen = () => {
    switch (screen) {
      case 'admin-users':
        return <AdminScreen type="users" />;
      case 'admin-products':
        return <AdminScreen type="products" />;
      case 'admin-catalogs':
        return <AdminScreen type="catalogs" />;
      case 'dashboard':
        return <AdminScreen type="dashboard" />;
      case 'home':
      default:
        return <HomeScreen user={user} onNavigate={setScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.shell, compactNav && styles.shellCompact]}>
        <Sidebar active={screen} compact={compactNav} onNavigate={setScreen} />
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
});
