import type { Product, VisitPlan } from '@prism/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AdminScreen } from '../screens/AdminScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { CyclesScreen } from '../screens/CyclesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { KpiDashboardScreen } from '../screens/KpiDashboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MapScreen } from '../screens/MapScreen';
import { MarketingScreen } from '../screens/MarketingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { VisitadoresScreen } from '../screens/VisitadoresScreen';
import { VisitHistoryScreen } from '../screens/VisitHistoryScreen';
import { ModuleScreen } from '../screens/ModuleScreen';
import { NewVisitScreen } from '../screens/NewVisitScreen';
import { OfflineVisitScreen } from '../screens/OfflineVisitScreen';
import { ProductSelectionScreen } from '../screens/ProductSelectionScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { ProductPresentationScreen } from '../screens/ProductPresentationScreen';
import { TrainingScreen } from '../screens/TrainingScreen';
import { VisitCommentsScreen } from '../screens/VisitCommentsScreen';
import { VisitResultDraft, VisitResultScreen } from '../screens/VisitResultScreen';
import { Sidebar } from '../components/Sidebar';
import { OfflineVisitSyncModal } from '../components/OfflineVisitSyncModal';
import { canAccessScreen } from './permissions';
import { AppScreen, SessionUser, VisitDoctorSnapshot } from './types';
import { colors } from '../theme/theme';
import { api } from '../services/api';
import { clearSession, loadSession, loadToken } from '../services/session';
import { saveSession } from '../services/session';
import { loadOfflineVisits, OfflineVisitDraft } from '../services/offlineVisitQueue';
import { loadOfflineCatalog } from '../services/offlineCatalog';
import { Menu, WifiOff } from 'lucide-react-native';

interface VisitDraft {
  planId?: string;
  doctor?: VisitDoctorSnapshot;
  product?: Product;
  plannedProductIds?: string[];
  presentationQueue?: Product[];
  presentationIndex?: number;
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

export function AppShell() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);
  const [visitDraft, setVisitDraft] = useState<VisitDraft>({});
  const [savingVisit, setSavingVisit] = useState(false);
  const [savedVisitId, setSavedVisitId] = useState<string | null>(null);
  const [offlineVisits, setOfflineVisits] = useState<OfflineVisitDraft[]>([]);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [offlineVisitKey, setOfflineVisitKey] = useState(0);
  const [connectionLostVisible, setConnectionLostVisible] = useState(false);
  const apiFailureCount = useRef(0);
  const [planCandidates, setPlanCandidates] = useState<VisitPlan[]>([]);
  const [candidateDoctor, setCandidateDoctor] = useState<VisitDoctorSnapshot | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { width, height } = useWindowDimensions();
  const compactNav = width < 820 || height > width;

  useEffect(() => {
    if (compactNav) {
      setSidebarOpen(false);
    }
  }, [compactNav]);

  useEffect(() => {
    if (!user) {
      setApiAvailable(null);
      return;
    }

    let live = true;
    const checkApi = async () => {
      try {
        await api.getClients();
        if (live) {
          apiFailureCount.current = 0;
          setApiAvailable(true);
        }
      } catch {
        if (!live) return;
        apiFailureCount.current += 1;
        if (apiFailureCount.current < 2) return;
        setApiAvailable(false);
        setConnectionLostVisible(true);
      }
    };

    void checkApi();
    const timer = setInterval(() => { void checkApi(); }, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [user]);

  const handleSplashDone = useCallback(() => {
    setCheckingSession(true);
    void loadSession()
      .then((session) => {
        if (session) {
          setUser(session.user);
          void loadOfflineVisits().then(setOfflineVisits);
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
    apiFailureCount.current = 0;
    setUser(nextUser);
    setApiAvailable(true);
    void loadOfflineVisits().then(setOfflineVisits);
    setScreen('home');
  };

  const handleLogout = () => {
    void clearSession().finally(() => {
      setUser(null);
      setApiAvailable(null);
      setScreen('login');
    });
  };

  const confirmConnectionLost = () => {
    void clearSession().finally(() => {
      setConnectionLostVisible(false);
      setUser(null);
      setApiAvailable(null);
      setScreen('login');
    });
  };

  const navigateFromHome = (nextScreen: AppScreen) => {
    if (nextScreen !== 'new-visit' || user?.role !== 'visitador') {
      setScreen(nextScreen);
      return;
    }

    void api.getClients()
      .then(() => {
        setApiAvailable(true);
        setScreen('new-visit');
      })
      .catch(async () => {
        setApiAvailable(false);
        const snapshot = await loadOfflineCatalog();
        if (snapshot?.products.length) setConnectionLostVisible(true);
        else Alert.alert('Sin conexión', 'No hay un catálogo sincronizado disponible para registrar la visita sin conexión.');
      });
  };

  const continueVisit = (doctor: VisitDoctorSnapshot, planId?: string, plannedProductIds: string[] = []) => {
    setPlanCandidates([]);
    setCandidateDoctor(null);
    setVisitDraft({ doctor, planId, plannedProductIds });
    setScreen('product-selection');
  };

  const handleDoctorForVisit = async (doctor: VisitDoctorSnapshot) => {
    if (!user) {
      continueVisit(doctor);
      return;
    }

    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesion no disponible.');

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const plans = await api.getVisitPlans(token, start.toISOString(), end.toISOString(), user.id);
      const matches = plans.filter((plan) => plan.clientType === 'doctor' && plan.clientId === doctor.id && ['planned', 'rescheduled'].includes(plan.status));

      if (matches.length === 0) {
        continueVisit(doctor);
        return;
      }

      setCandidateDoctor(doctor);
      setPlanCandidates(matches);
    } catch {
      continueVisit(doctor);
    }
  };

  const finishProductPresentation = () => {
    const completedAt = new Date().toISOString();
    const nextIndex = (visitDraft.presentationIndex ?? 0) + 1;
    const hasNextProduct = Boolean(visitDraft.presentationQueue?.[nextIndex]);

    setVisitDraft((current) => ({
      ...current,
      product: hasNextProduct ? current.presentationQueue?.[nextIndex] : current.product,
      presentationIndex: nextIndex,
      presentedFlows: [
        ...(current.presentedFlows ?? []),
        {
          type: 'interactive',
          productId: current.product?.id,
          productName: current.product?.name,
          startedAt: completedAt,
          completedAt,
        },
      ],
    }));
    if (!hasNextProduct) setScreen('visit-result');
  };

  const handleSaveVisit = async (comments: { finalComments: string; requiresFollowUp: boolean; urgentRequest: boolean }) => {
    if (!visitDraft.result) {
      Alert.alert('Visita incompleta', 'Falta registrar el resultado de la visita.');
      return;
    }

    if (!visitDraft.doctor?.id) {
      Alert.alert('Selecciona un médico registrado', 'Busca y selecciona un médico de tu cartera antes de guardar la visita.');
      return;
    }

    setSavingVisit(true);

    try {
      const token = await loadToken();

      if (!token) {
        throw new Error('Missing token');
      }

      const savedVisit = await api.savePresentationVisit(token, {
        planId: visitDraft.planId,
        doctorId: visitDraft.doctor?.id,
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
        samplesDelivered: visitDraft.result.samplesDelivered,
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

  if (screen === 'offline-visit') {
    return <OfflineVisitScreen key={offlineVisitKey} currentUser={user} onBack={() => setScreen(user && apiAvailable ? 'home' : 'login')} onSaved={() => {
      void loadOfflineVisits().then(setOfflineVisits);
      setOfflineVisitKey((current) => current + 1);
      setScreen(user && apiAvailable ? 'home' : 'login');
    }} />;
  }

  if (screen === 'login' || !user) {
    return <LoginScreen onLogin={handleLogin} onOffline={() => setScreen('offline-visit')} />;
  }

  const renderScreen = () => {
    if (!canAccessScreen(user.role, screen)) {
      return <HomeScreen user={user} onNavigate={navigateFromHome} onStartVisit={continueVisit} />;
    }

    switch (screen) {
      case 'admin-users':
        return <AdminScreen currentUser={user} type="users" />;
      case 'admin-products':
        return <AdminScreen currentUser={user} type="products" />;
      case 'admin-catalogs':
        return <AdminScreen currentUser={user} type="catalogs" />;
      case 'admin-cycles':
        return <CyclesScreen />;
      case 'dashboard':
        return <KpiDashboardScreen onBack={() => setScreen('home')} />;
      case 'planner':
        return <AgendaScreen currentUser={user} onBack={() => setScreen('home')} onStartVisit={continueVisit} />;
      case 'new-visit':
        return (
          <NewVisitScreen
            currentUser={user}
            onBack={() => setScreen('home')}
            onContinue={(doctor) => { void handleDoctorForVisit(doctor); }}
          />
        );
      case 'product-selection':
        return (
          <ProductSelectionScreen
            onBack={() => setScreen('new-visit')}
            initialProductIds={visitDraft.plannedProductIds}
            onStartPrepared={(products) => {
              setVisitDraft((current) => ({ ...current, product: products[0], plannedProductIds: products.map((product) => product.id), presentationQueue: products, presentationIndex: 0 }));
              setScreen('interactive-presentation');
            }}
          />
        );
      case 'experience-digital':
        if (!visitDraft.product) {
          return (
            <ProductSelectionScreen
              onBack={() => setScreen('new-visit')}
              initialProductIds={visitDraft.plannedProductIds}
              onStartPrepared={(products) => {
                setVisitDraft((current) => ({ ...current, product: products[0], plannedProductIds: products.map((product) => product.id), presentationQueue: products, presentationIndex: 0 }));
                setScreen('interactive-presentation');
              }}
            />
          );
        }

        return (
          <ProductPresentationScreen
            product={visitDraft.product}
            onBack={() => setScreen('product-selection')}
            onFinish={finishProductPresentation}
            finishLabel={visitDraft.presentationQueue?.[(visitDraft.presentationIndex ?? 0) + 1] ? 'Siguiente producto' : 'Finalizar presentación'}
          />
        );
      case 'interactive-presentation':
        if (!visitDraft.product) {
          setScreen('product-selection');
          return null;
        }

        return (
          <ProductPresentationScreen
            product={visitDraft.product}
            onBack={() => setScreen('product-selection')}
            onFinish={finishProductPresentation}
            finishLabel={visitDraft.presentationQueue?.[(visitDraft.presentationIndex ?? 0) + 1] ? 'Siguiente producto' : 'Finalizar presentación'}
          />
        );
      case 'storytelling-presentation':
      case 'medical-evidence':
        if (!visitDraft.product) {
          setScreen('product-selection');
          return null;
        }

        return (
          <ProductPresentationScreen
            product={visitDraft.product}
            onBack={() => setScreen('product-selection')}
            onFinish={finishProductPresentation}
            finishLabel={visitDraft.presentationQueue?.[(visitDraft.presentationIndex ?? 0) + 1] ? 'Siguiente producto' : 'Finalizar presentación'}
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
      case 'settings':
        return <SettingsScreen currentUser={user} onSessionUpdated={(nextUser, token) => { void saveSession({ user: nextUser, token }); setUser(nextUser); }} />;
      case 'visitadores':
        return <VisitadoresScreen />;
      case 'coaching':
        return <TrainingScreen currentUser={user} />;
      case 'map':
        return <MapScreen currentUser={user} />;
      case 'visits':
        return <VisitHistoryScreen currentUser={user} />;
      case 'marketing':
        return <MarketingScreen />;
      case 'billing':
        return <ModuleScreen role={user.role} type={screen} />;
      case 'home':
      default:
        return <HomeScreen user={user} onNavigate={navigateFromHome} onStartVisit={continueVisit} />;
    }
  };

  const immersivePresentation = screen === 'interactive-presentation';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        {!immersivePresentation && !compactNav && sidebarOpen ? (
          <Sidebar
            active={screen}
            compact={false}
            role={user.role}
            onNavigate={setScreen}
            onLogout={handleLogout}
            onCollapse={() => setSidebarOpen(false)}
          />
        ) : null}
        <View style={styles.workspace}>
          {!immersivePresentation && (!sidebarOpen || compactNav) ? <View style={styles.navBar}>
            <Pressable
              accessibilityLabel={sidebarOpen ? 'Ocultar menu' : 'Abrir menu'}
              onPress={() => setSidebarOpen((open) => !open)}
              style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
            >
              <Menu size={22} color={colors.text} />
            </Pressable>
          </View> : null}
          <View style={styles.content}>{renderScreen()}</View>
        </View>
      </View>

      <Modal transparent visible={compactNav && sidebarOpen} animationType="fade" onRequestClose={() => setSidebarOpen(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable accessibilityLabel="Cerrar menu" onPress={() => setSidebarOpen(false)} style={styles.drawerDismiss} />
          <View style={styles.drawer}>
            <Sidebar
              active={screen}
              compact={false}
              role={user.role}
              onNavigate={(nextScreen) => {
                setScreen(nextScreen);
                setSidebarOpen(false);
              }}
              onLogout={handleLogout}
              onCollapse={() => setSidebarOpen(false)}
            />
          </View>
        </View>
      </Modal>

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
      <Modal transparent visible={connectionLostVisible} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.connectionIcon}><WifiOff size={28} color={colors.primary} /></View>
            <Text style={styles.modalTitle}>Sin conexión</Text>
            <Text style={styles.modalText}>Se perdió la conexión con el servidor. La sesión se cerrará para proteger los datos. Desde el inicio de sesión puedes entrar en modo offline.</Text>
            <Pressable onPress={confirmConnectionLost} style={({ pressed }) => [styles.modalButton, pressed && styles.modalButtonPressed]}>
              <Text style={styles.modalButtonText}>Ir al inicio de sesión</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={Boolean(candidateDoctor && planCandidates.length)} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{planCandidates.length === 1 ? 'Cita planificada encontrada' : 'Selecciona la cita'}</Text>
            <Text style={styles.modalText}>{planCandidates.length === 1 ? `Hay una cita pendiente hoy para ${candidateDoctor?.name}. ¿Deseas vincular esta visita?` : `Hay varias citas pendientes hoy para ${candidateDoctor?.name}. Elige la que corresponde a esta visita.`}</Text>
            <View style={styles.candidateList}>
              {planCandidates.map((plan) => <Pressable key={plan.id} onPress={() => candidateDoctor && continueVisit(candidateDoctor, plan.id, (plan.plannedProducts ?? []).sort((first, second) => first.order - second.order).map((product) => product.productId))} style={styles.candidateButton}>
                <Text style={styles.candidateTime}>{new Date(plan.plannedDate).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                <Text style={styles.candidateText}>{planCandidates.length === 1 ? 'Vincular cita' : plan.notes?.trim() || 'Cita planificada'}</Text>
              </Pressable>)}
            </View>
            <Pressable onPress={() => candidateDoctor && continueVisit(candidateDoctor)} style={({ pressed }) => [styles.secondaryModalButton, pressed && styles.modalButtonPressed]}>
              <Text style={styles.secondaryModalButtonText}>Continuar sin vincular</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {apiAvailable ? <OfflineVisitSyncModal user={user} queue={offlineVisits} onSynced={(id) => setOfflineVisits((current) => current.filter((visit) => visit.id !== id))} /> : null}
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
  workspace: {
    flex: 1,
    minWidth: 0,
  },
  navBar: {
    height: 52,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonPressed: {
    backgroundColor: colors.primarySoft,
  },
  content: {
    flex: 1,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.38)',
  },
  drawer: {
    width: 288,
    height: '100%',
    backgroundColor: colors.surface,
  },
  drawerDismiss: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  connectionIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  candidateList: {
    alignSelf: 'stretch',
    gap: 8,
  },
  candidateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  candidateTime: {
    color: colors.primary,
    fontWeight: '900',
  },
  candidateText: {
    flex: 1,
    color: colors.text,
    fontWeight: '800',
  },
  secondaryModalButton: {
    alignSelf: 'stretch',
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryModalButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
});

