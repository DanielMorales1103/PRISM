import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ClipboardList, Package, ShieldCheck, Users } from 'lucide-react-native';
import { canManageUsers } from '../app/permissions';
import { AppRole, SessionUser } from '../app/types';
import { MetricCard } from '../components/MetricCard';
import { api, DashboardSummary } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, spacing } from '../theme/theme';

interface AdminScreenProps {
  currentUser: SessionUser;
  type: 'users' | 'products' | 'catalogs' | 'dashboard';
}

const assignableRoles: AppRole[] = ['visitador', 'supervisor', 'facturacion', 'jefe'];

const copy = {
  users: {
    title: 'Usuarios y roles',
    description: 'Gestion inicial de visitadores, supervisores, facturacion y administradores.',
    rows: ['Daniella Morales - Visitador', 'Carlos Mendez - Supervisor', 'Admin Prism - Administrador'],
  },
  products: {
    title: 'Productos',
    description: 'Catalogo base para productos, lineas, muestras y presentaciones medicas.',
    rows: ['Nolasma - Activo', 'Epivate - Activo', 'Zoterb Tabs - Activo'],
  },
  catalogs: {
    title: 'Catalogos base',
    description: 'Especialidades, ciclos, departamentos, municipios y parametros del sistema.',
    rows: ['Especialidades medicas', 'Ciclos de trabajo', 'Departamentos y municipios'],
  },
  dashboard: {
    title: 'KPIs comerciales',
    description: 'Vista inicial para indicadores de visitas, cobertura, muestras y cumplimiento.',
    rows: ['Cobertura medicos - 74%', 'Cobertura farmacias - 61%', 'Coaching - Pendiente'],
  },
} as const;

const fallbackSummary: DashboardSummary = {
  activeUsers: 0,
  activeProducts: 0,
  totalClients: 0,
  activeDoctors: 0,
  activePharmacies: 0,
  activeInstitutions: 0,
  plannedVisits: 0,
  completedVisits: 0,
  coverage: 0,
};

export function AdminScreen({ currentUser, type }: AdminScreenProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const data = copy[type];
  const [rows, setRows] = useState<string[]>([...data.rows]);
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);
  const [status, setStatus] = useState('Conectando con API...');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'visitador' as AppRole,
  });
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [dashboardSummary, users, products, catalogs, clients] = await Promise.all([
          api.getDashboardSummary(),
          api.getUsers(),
          api.getProducts(),
          api.getCatalogs(),
          api.getClients(),
        ]);

        if (!mounted) {
          return;
        }

        setSummary(dashboardSummary);
        setStatus(`Datos desde ${api.getBaseUrl()}`);

        if (type === 'users') {
          setRows(users.map((user) => `${user.name} - ${user.role}`));
          return;
        }

        if (type === 'products') {
          setRows(products.map((product) => `${product.name} - ${product.active ? 'Activo' : 'Inactivo'}`));
          return;
        }

        if (type === 'catalogs') {
          setRows([
            `Especialidades medicas - ${catalogs.specialties.length}`,
            `Ciclos de trabajo - ${catalogs.cycles.length}`,
            `Tipos de cliente - ${catalogs.clientTypes.length}`,
          ]);
          return;
        }

        setRows([
          `Usuarios activos - ${dashboardSummary.activeUsers}`,
          `Productos activos - ${dashboardSummary.activeProducts}`,
          `Clientes registrados - ${dashboardSummary.totalClients}`,
          `Doctores ${clients.doctors.length} / Farmacias ${clients.pharmacies.length}`,
        ]);
      } catch {
        if (!mounted) {
          return;
        }

        setRows([...data.rows]);
        setSummary(fallbackSummary);
        setStatus('Sin conexion al API, mostrando datos demo.');
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [data.rows, type]);

  const metrics = useMemo(() => {
    if (type === 'dashboard') {
      return {
        total: summary.totalClients,
        active: `${summary.coverage}%`,
        pending: summary.plannedVisits,
      };
    }

    if (type === 'products') {
      return {
        total: summary.activeProducts,
        active: summary.activeProducts,
        pending: 0,
      };
    }

    if (type === 'users') {
      return {
        total: summary.activeUsers,
        active: summary.activeUsers,
        pending: 0,
      };
    }

    return {
      total: rows.length,
      active: rows.length,
      pending: 0,
    };
  }, [rows.length, summary, type]);

  const submitUser = async () => {
    setFormMessage('');

    try {
      const token = await loadToken();
      if (!token) {
        setFormMessage('Sesion no disponible. Ingresa de nuevo.');
        return;
      }

      const createdUser = await api.createUser(token, form);
      setRows((currentRows) => [`${createdUser.name} - ${createdUser.role}`, ...currentRows]);
      setSummary((currentSummary) => ({
        ...currentSummary,
        activeUsers: currentSummary.activeUsers + 1,
      }));
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'visitador',
      });
      setFormMessage('Usuario creado correctamente.');
    } catch {
      setFormMessage('No se pudo crear el usuario. Revisa datos o permisos.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.description}>{data.description}</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Registros" value={String(metrics.total)} detail="Base inicial" icon={<ClipboardList size={25} color={colors.primary} />} />
        <MetricCard label="Activos" value={String(metrics.active)} detail="Desde MongoDB" icon={<ShieldCheck size={25} color={colors.primary} />} />
        <MetricCard label="Pendientes" value={String(metrics.pending)} detail="Por cargar" icon={<Package size={25} color={colors.primary} />} />
      </View>

      <View style={[styles.panel, wide && styles.panelWide]}>
        <View style={styles.tableCard}>
          <Text style={styles.cardTitle}>Registros recientes</Text>
          {rows.map((row) => (
            <View key={row} style={styles.row}>
              <View style={styles.rowIcon}>
                <Users size={18} color={colors.primary} />
              </View>
              <Text style={styles.rowText}>{row}</Text>
              <Text style={styles.status}>Demo</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.cardTitle}>Fase 1</Text>
          <Text style={styles.noteText}>
            {status}
          </Text>
        </View>
      </View>

      {type === 'users' && canManageUsers(currentUser.role) && (
        <View style={styles.createCard}>
          <Text style={styles.cardTitle}>Crear usuario</Text>
          <View style={styles.formGrid}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                value={form.name}
                onChangeText={(name) => setForm((currentForm) => ({ ...currentForm, name }))}
                placeholder="Nombre completo"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Correo</Text>
              <TextInput
                value={form.email}
                onChangeText={(email) => setForm((currentForm) => ({ ...currentForm, email }))}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="usuario@prism.com"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Clave temporal</Text>
              <TextInput
                value={form.password}
                onChangeText={(password) => setForm((currentForm) => ({ ...currentForm, password }))}
                secureTextEntry
                placeholder="Clave inicial"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Rol</Text>
          <View style={styles.roleGrid}>
            {assignableRoles.map((role) => {
              const selected = form.role === role;

              return (
                <Pressable
                  key={role}
                  onPress={() => setForm((currentForm) => ({ ...currentForm, role }))}
                  style={[styles.roleChip, selected && styles.roleChipActive]}
                >
                  <Text style={[styles.roleText, selected && styles.roleTextActive]}>{role}</Text>
                </Pressable>
              );
            })}
          </View>

          {formMessage ? <Text style={styles.formMessage}>{formMessage}</Text> : null}

          <Pressable onPress={submitUser} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Crear usuario</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    maxWidth: 720,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  panel: {
    gap: spacing.md,
  },
  panelWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tableCard: {
    flex: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  noteCard: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderColor: '#FFD4C4',
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  status: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900',
  },
  noteText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  createCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fieldGroup: {
    flex: 1,
    minWidth: 220,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleChip: {
    minHeight: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: '#FFD4C4',
  },
  roleText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  roleTextActive: {
    color: colors.primary,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  formMessage: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
});
