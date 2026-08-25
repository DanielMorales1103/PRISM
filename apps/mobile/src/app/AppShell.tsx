import type { Product } from '@prism/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AdminScreen } from '../screens/AdminScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { ExperienceDigitalScreen } from '../screens/ExperienceDigitalScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { InteractivePresentationScreen } from '../screens/InteractivePresentationScreen';
import { KpiDashboardScreen } from '../screens/KpiDashboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MedicalEvidenceScreen } from '../screens/MedicalEvidenceScreen';
import { ModuleScreen } from '../screens/ModuleScreen';
import { NewVisitScreen } from '../screens/NewVisitScreen';
import { ProductSelectionScreen } from '../screens/ProductSelectionScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { StorytellingPresentationScreen } from '../screens/StorytellingPresentationScreen';
import { VisitCommentsScreen } from '../screens/VisitCommentsScreen';
import { VisitResultDraft, VisitResultScreen } from '../screens/VisitResultScreen';
import { Sidebar } from '../components/Sidebar';
import { canAccessScreen } from './permissions';
import { AppScreen, SessionUser, VisitDoctorSnapshot } from './types';
import { colors } from '../theme/theme';
import { api } from '../services/api';
import { clearSession, loadSession, loadToken } from '../services/session';

interface VisitDraft {
  doctor?: VisitDoctorSnapshot;
  product?: Product;
  presentedFlows?: PresentedFlowDraft[];
  result?: VisitResultDraft;
}

type PresentationFlowType = 'interactive' | 'storytelling' | 'clinical';

interface PresentedFlowDraft {
  type: PresentationFlowType;
  productId?: string;
  productName?: string;
  startedAt: string;
  completedAt?: string;
}

const fullScreenFlow: AppScreen[] = [
  'new-visit',
  'product-selection',
  'experience-digital',
  'interactive-presentation',
  'storytelling-presentation',
  'medical-evidence',
  'visit-result',
  'visit-comments',
  'dashboard',
  'planner',
];

export function AppShell() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);
  const [visitDraft, setVisitDraft] = useState<VisitDraft>({});
  const [savingVisit, setSavingVisit] = useState(false);
  const [savedVisitId, setSavedVisitId] = useState<string | null>(null);
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

  const startPresentedFlow = (type: PresentationFlowType) => {
    const startedAt = new Date().toISOString();

    setVisitDraft((current) => ({
      ...current,
      presentedFlows: [
        ...(current.presentedFlows ?? []),
        {
          type,
          productId: current.product?.id,
          productName: current.product?.name,
          startedAt,
        },
      ],
    }));
  };

  const completeLatestPresentedFlow = () => {
    const completedAt = new Date().toISOString();

    setVisitDraft((current) => {
      const presentedFlows = [...(current.presentedFlows ?? [])];
      const latestIndex = presentedFlows.findLastIndex((flow) => !flow.completedAt);

      if (latestIndex >= 0) {
        presentedFlows[latestIndex] = {
          ...presentedFlows[latestIndex],
          completedAt,
        };
      }

      return {
        ...current,
        presentedFlows,
      };
    });
  };

  const handleSaveVisit = async (comments: { finalComments: string; requiresFollowUp: boolean; urgentRequest: boolean }) => {
    if (!visitDraft.result) {
      Alert.alert('Visita incompleta', 'Falta registrar el resultado de la visita.');
      return;
    }

    setSavingVisit(true);

    try {
      const token = await loadToken();

      if (!token) {
        throw new Error('Missing token');
      }

      const savedVisit = await api.savePresentationVisit(token, {
        doctorName: visitDraft.doctor?.name,
        doctorSpecialty: visitDraft.doctor?.specialty,
        clinic: visitDraft.doctor?.clinic,
        address: visitDraft.doctor?.address,
        productId: visitDraft.product?.id,
        productName: visitDraft.product?.name,
        productLine: visitDraft.product?.line,
        presentedFlows: visitDraft.presentedFlows ?? [],
        finalFlowType: visitDraft.presentedFlows?.at(-1)?.type,
        visitStatus: visitDraft.result.visitStatus,
        requestedProducts: visitDraft.result.requestedProducts,
        probablePurchaseDate: visitDraft.result.probablePurchaseDate,
        competitionDetected: visitDraft.result.competitionDetected,
        interestLevel: visitDraft.result.interestLevel,
        requiresFollowUp: comments.requiresFollowUp,
        urgentRequest: comments.urgentRequest,
        finalComments: comments.finalComments,
      });

      setVisitDraft({});
      setScreen('home');
      setSavedVisitId(savedVisit.id);
    } catch {
      Alert.alert('No se pudo guardar', 'Revisa la conexion con el API e intenta de nuevo.');
    } finally {
      setSavingVisit(false);
    }
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
        return <KpiDashboardScreen onBack={() => setScreen('home')} />;
      case 'planner':
        return <AgendaScreen onBack={() => setScreen('home')} />;
      case 'new-visit':
        return (
          <NewVisitScreen
            onBack={() => setScreen('home')}
            onContinue={(doctor) => {
              setVisitDraft((current) => ({ ...current, doctor }));
              setScreen('product-selection');
            }}
          />
        );
      case 'product-selection':
        return (
          <ProductSelectionScreen
            onBack={() => setScreen('new-visit')}
            onSelectProduct={(product) => {
              setVisitDraft((current) => ({ ...current, product }));
              setScreen('experience-digital');
            }}
          />
        );
      case 'experience-digital':
        if (!visitDraft.product) {
          return (
            <ProductSelectionScreen
              onBack={() => setScreen('new-visit')}
              onSelectProduct={(product) => {
                setVisitDraft((current) => ({ ...current, product }));
                setScreen('experience-digital');
              }}
            />
          );
        }

        return (
          <ExperienceDigitalScreen
            product={visitDraft.product}
            onBack={() => setScreen('product-selection')}
            onStartInteractive={() => {
              startPresentedFlow('interactive');
              setScreen('interactive-presentation');
            }}
            onStartStorytelling={() => {
              startPresentedFlow('storytelling');
              setScreen('storytelling-presentation');
            }}
            onStartEvidence={() => {
              startPresentedFlow('clinical');
              setScreen('medical-evidence');
            }}
          />
        );
      case 'interactive-presentation':
        if (!visitDraft.product) {
          setScreen('product-selection');
          return null;
        }

        return (
          <InteractivePresentationScreen
            product={visitDraft.product}
            onClose={() => setScreen('experience-digital')}
            onFinish={() => {
              completeLatestPresentedFlow();
              setScreen('visit-result');
            }}
          />
        );
      case 'storytelling-presentation':
        if (!visitDraft.product) {
          setScreen('product-selection');
          return null;
        }

        return (
          <StorytellingPresentationScreen
            product={visitDraft.product}
            onClose={() => setScreen('experience-digital')}
            onFinish={() => {
              completeLatestPresentedFlow();
              setScreen('visit-result');
            }}
          />
        );
      case 'medical-evidence':
        if (!visitDraft.product) {
          setScreen('product-selection');
          return null;
        }

        return (
          <MedicalEvidenceScreen
            product={visitDraft.product}
            onClose={() => setScreen('experience-digital')}
            onContinue={() => {
              completeLatestPresentedFlow();
              setScreen('visit-result');
            }}
          />
        );
      case 'visit-result':
        return (
          <VisitResultScreen
            onContinue={(result) => {
              setVisitDraft((current) => ({ ...current, result }));
              setScreen('visit-comments');
            }}
          />
        );
      case 'visit-comments':
        return <VisitCommentsScreen saving={savingVisit} onBack={() => setScreen('visit-result')} onSave={handleSaveVisit} />;
      case 'clients':
        return <ClientsScreen currentUser={user} />;
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
      {fullScreenFlow.includes(screen) ? (
        renderScreen()
      ) : (
        <View style={[styles.shell, compactNav && styles.shellCompact]}>
          <Sidebar active={screen} compact={compactNav} role={user.role} onNavigate={setScreen} onLogout={handleLogout} />
          <View style={styles.content}>{renderScreen()}</View>
        </View>
      )}

      <Modal transparent visible={savedVisitId !== null} animationType="fade" onRequestClose={() => setSavedVisitId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Visita guardada</Text>
            <Text style={styles.modalText}>La visita fue guardada correctamente en el CRM.</Text>
            {savedVisitId ? <Text style={styles.modalId}>ID: {savedVisitId}</Text> : null}
            <Pressable onPress={() => setSavedVisitId(null)} style={({ pressed }) => [styles.modalButton, pressed && styles.modalButtonPressed]}>
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  modalText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  modalId: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  modalButton: {
    alignSelf: 'stretch',
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  modalButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
});

