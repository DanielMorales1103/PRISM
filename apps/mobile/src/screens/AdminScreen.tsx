import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import type { Product, UserProfile } from '@prism/shared';
import { ClipboardList, Package, ShieldCheck, Trash2, Users } from 'lucide-react-native';
import { canManageUsers } from '../app/permissions';
import { getRoleLabel } from '../app/roleLabels';
import { AppRole, SessionUser } from '../app/types';
import { MetricCard } from '../components/MetricCard';
import { api, DashboardSummary } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, spacing } from '../theme/theme';

interface AdminScreenProps {
  currentUser: SessionUser;
  type: 'users' | 'products' | 'catalogs' | 'dashboard';
}

interface CreatedUserModal {
  name: string;
  email: string;
  password: string;
  role: AppRole;
}

type UserListFilter = 'active' | 'deleted';

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'visitador' as AppRole,
  });
  const [productForm, setProductForm] = useState({
    name: '',
    line: '',
    presentation: '',
    composition: '',
    dosage: '',
    details: '',
    imageUrl: '',
  });
  const [formMessage, setFormMessage] = useState('');
  const [formMessageType, setFormMessageType] = useState<'success' | 'error'>('success');
  const [submittingUser, setSubmittingUser] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [createdUserModal, setCreatedUserModal] = useState<CreatedUserModal | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserProfile | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userListFilter, setUserListFilter] = useState<UserListFilter>('active');
  const filteredUsers = useMemo(
    () => users.filter((user) => (userListFilter === 'active' ? user.active : !user.active)),
    [userListFilter, users],
  );

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
        setUsers(users);
        setProducts(products);

        if (type === 'users') {
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
        setUsers([]);
        setSummary(fallbackSummary);
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
    const nextForm = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password.trim(),
    };

    if (!nextForm.name || !nextForm.email || !nextForm.password) {
      setFormMessageType('error');
      setFormMessage('Completa nombre, correo y clave temporal.');
      return;
    }

    if (!nextForm.email.includes('@')) {
      setFormMessageType('error');
      setFormMessage('Ingresa un correo valido.');
      return;
    }

    if (nextForm.password.length < 6) {
      setFormMessageType('error');
      setFormMessage('La clave temporal debe tener al menos 6 caracteres.');
      return;
    }

    setSubmittingUser(true);

    try {
      const token = await loadToken();
      if (!token) {
        setFormMessageType('error');
        setFormMessage('Sesion no disponible. Ingresa de nuevo.');
        return;
      }

      const createdUser = await api.createUser(token, nextForm);
      setUsers((currentUsers) => [createdUser, ...currentUsers].sort((first, second) => first.name.localeCompare(second.name)));
      setSummary((currentSummary) => ({
        ...currentSummary,
        activeUsers: currentSummary.activeUsers + 1,
      }));
      setCreatedUserModal({
        name: createdUser.name,
        email: createdUser.email,
        password: nextForm.password,
        role: createdUser.role as AppRole,
      });
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'visitador',
      });
      setFormMessageType('success');
      setFormMessage('');
    } catch (error) {
      setFormMessageType('error');
      const message = error instanceof Error ? error.message : 'No se pudo crear el usuario. Revisa datos o permisos.';
      setFormMessage(message === 'Invalid token' ? 'Sesion vencida. Cierra sesion e ingresa de nuevo.' : message);
    } finally {
      setSubmittingUser(false);
    }
  };

  const submitProduct = async () => {
    setFormMessage('');
    const nextProductForm = {
      name: productForm.name.trim(),
      line: productForm.line.trim(),
      presentation: productForm.presentation.trim(),
      composition: productForm.composition.trim(),
      dosage: productForm.dosage.trim(),
      details: productForm.details.trim(),
      imageUrl: productForm.imageUrl.trim(),
    };

    if (!nextProductForm.name || !nextProductForm.line || !nextProductForm.presentation) {
      setFormMessageType('error');
      setFormMessage('Completa nombre, linea y presentacion.');
      return;
    }

    setSubmittingProduct(true);

    try {
      const token = await loadToken();
      if (!token) {
        setFormMessageType('error');
        setFormMessage('Sesion no disponible. Ingresa de nuevo.');
        return;
      }

      const createdProduct = await api.createProduct(token, nextProductForm);
      setProducts((currentProducts) => [createdProduct, ...currentProducts].sort((first, second) => first.name.localeCompare(second.name)));
      setRows((currentRows) => [`${createdProduct.name} - Activo`, ...currentRows]);
      setSummary((currentSummary) => ({
        ...currentSummary,
        activeProducts: currentSummary.activeProducts + 1,
      }));
      setProductForm({
        name: '',
        line: '',
        presentation: '',
        composition: '',
        dosage: '',
        details: '',
        imageUrl: '',
      });
      setFormMessageType('success');
      setFormMessage(`Producto creado: ${createdProduct.name}`);
    } catch (error) {
      setFormMessageType('error');
      const message = error instanceof Error ? error.message : 'No se pudo crear el producto.';
      setFormMessage(message === 'Invalid token' ? 'Sesion vencida. Cierra sesion e ingresa de nuevo.' : message);
    } finally {
      setSubmittingProduct(false);
    }
  };

  const deactivateUser = async () => {
    if (!pendingDeleteUser) {
      return;
    }

    setDeletingUserId(pendingDeleteUser.id);
    setFormMessage('');

    try {
      const token = await loadToken();
      if (!token) {
        setFormMessageType('error');
        setFormMessage('Sesion no disponible. Ingresa de nuevo.');
        return;
      }

      const updatedUser = await api.deactivateUser(token, pendingDeleteUser.id);
      setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setUserListFilter('deleted');
      setSummary((currentSummary) => ({
        ...currentSummary,
        activeUsers: Math.max(0, currentSummary.activeUsers - 1),
      }));
      setPendingDeleteUser(null);
    } catch (error) {
      setFormMessageType('error');
      const message = error instanceof Error ? error.message : 'No se pudo desactivar el usuario.';
      setFormMessage(message === 'Invalid token' ? 'Sesion vencida. Cierra sesion e ingresa de nuevo.' : message);
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.description}>{data.description}</Text>
      </View>

      {type !== 'users' && type !== 'products' && (
        <>
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
          </View>
        </>
      )}

      {type === 'products' && canManageUsers(currentUser.role) && (
        <View style={styles.createCard}>
          <Text style={styles.cardTitle}>Agregar producto</Text>
          <View style={styles.formGrid}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                value={productForm.name}
                onChangeText={(name) => setProductForm((currentForm) => ({ ...currentForm, name }))}
                placeholder="Ej. Nolasma"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Linea</Text>
              <TextInput
                value={productForm.line}
                onChangeText={(line) => setProductForm((currentForm) => ({ ...currentForm, line }))}
                placeholder="Ej. Dermatologia"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Presentacion</Text>
              <TextInput
                value={productForm.presentation}
                onChangeText={(presentation) => setProductForm((currentForm) => ({ ...currentForm, presentation }))}
                placeholder="Ej. Tubo de 15 gramos"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Composicion</Text>
              <TextInput
                value={productForm.composition}
                onChangeText={(composition) => setProductForm((currentForm) => ({ ...currentForm, composition }))}
                placeholder="Ingrediente activo"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Imagen</Text>
              <TextInput
                value={productForm.imageUrl}
                onChangeText={(imageUrl) => setProductForm((currentForm) => ({ ...currentForm, imageUrl }))}
                autoCapitalize="none"
                placeholder="URL opcional de imagen"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Descripcion</Text>
              <TextInput
                value={productForm.details}
                onChangeText={(details) => setProductForm((currentForm) => ({ ...currentForm, details }))}
                placeholder="Resumen comercial del producto"
                placeholderTextColor="#9CA3AF"
                multiline
                style={[styles.input, styles.textArea]}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Dosis</Text>
              <TextInput
                value={productForm.dosage}
                onChangeText={(dosage) => setProductForm((currentForm) => ({ ...currentForm, dosage }))}
                placeholder="Indicaciones o dosis recomendada"
                placeholderTextColor="#9CA3AF"
                multiline
                style={[styles.input, styles.textArea]}
              />
            </View>
          </View>

          {formMessage ? <Text style={[styles.formMessage, formMessageType === 'error' && styles.formMessageError]}>{formMessage}</Text> : null}

          <Pressable
            disabled={submittingProduct}
            onPress={submitProduct}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submittingProduct && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{submittingProduct ? 'Guardando...' : 'Agregar producto'}</Text>
          </Pressable>
        </View>
      )}

      {type === 'products' && (
        <View style={styles.userListCard}>
          <View style={styles.userListHeader}>
            <View>
              <Text style={styles.cardTitle}>Productos registrados</Text>
              <Text style={styles.userListSubhead}>Estos productos alimentan el portafolio y el flujo de visita medica.</Text>
            </View>
            <Text style={styles.userCount}>{products.filter((product) => product.active).length} activos</Text>
          </View>

          <View style={styles.productList}>
            {products.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Sin productos</Text>
                <Text style={styles.emptyText}>Agrega un producto para verlo en esta lista.</Text>
              </View>
            )}
            {products.map((product) => (
              <View key={product.id} style={styles.productRow}>
                <View style={styles.rowIcon}>
                  <Package size={18} color={colors.primary} />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.userName}>{product.name}</Text>
                  <Text style={styles.userEmail}>{product.composition || 'Sin composicion registrada'}</Text>
                </View>
                <Text style={styles.productLine}>{product.line}</Text>
                <Text style={styles.productPresentation}>{product.presentation}</Text>
                <Text style={[styles.userStatus, product.active ? styles.userStatusActive : styles.userStatusInactive]}>
                  {product.active ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

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
                  <Text style={[styles.roleText, selected && styles.roleTextActive]}>{getRoleLabel(role)}</Text>
                </Pressable>
              );
            })}
          </View>

          {formMessage ? <Text style={[styles.formMessage, formMessageType === 'error' && styles.formMessageError]}>{formMessage}</Text> : null}

          <Pressable
            disabled={submittingUser}
            onPress={submitUser}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submittingUser && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{submittingUser ? 'Creando...' : 'Crear usuario'}</Text>
          </Pressable>
        </View>
      )}

      {type === 'users' && canManageUsers(currentUser.role) && (
        <View style={styles.userListCard}>
          <View style={styles.userListHeader}>
            <View>
              <Text style={styles.cardTitle}>Usuarios registrados</Text>
              <Text style={styles.userListSubhead}>Los usuarios desactivados quedan guardados como historial.</Text>
            </View>
            <View style={styles.userListActions}>
              <View style={styles.userSegment}>
                <Pressable
                  onPress={() => setUserListFilter('active')}
                  style={[styles.userSegmentOption, userListFilter === 'active' && styles.userSegmentActive]}
                >
                  <Text style={[styles.userSegmentText, userListFilter === 'active' && styles.userSegmentTextActive]}>Activos</Text>
                </Pressable>
                <Pressable
                  onPress={() => setUserListFilter('deleted')}
                  style={[styles.userSegmentOption, userListFilter === 'deleted' && styles.userSegmentActive]}
                >
                  <Text style={[styles.userSegmentText, userListFilter === 'deleted' && styles.userSegmentTextActive]}>Eliminados</Text>
                </Pressable>
              </View>
              <Text style={styles.userCount}>
                {filteredUsers.length} {userListFilter === 'active' ? 'activos' : 'eliminados'}
              </Text>
            </View>
          </View>

          <View style={styles.userList}>
            {filteredUsers.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Sin usuarios {userListFilter === 'active' ? 'activos' : 'eliminados'}</Text>
                <Text style={styles.emptyText}>
                  {userListFilter === 'active' ? 'Crea un usuario para verlo en esta lista.' : 'Cuando elimines usuarios apareceran aqui.'}
                </Text>
              </View>
            )}
            {filteredUsers.map((user) => {
              const canDeactivate = user.active && user.email !== currentUser.email && user.role !== 'admin';

              return (
                <View key={user.id} style={[styles.userRow, !user.active && styles.userRowInactive]}>
                  <View style={styles.rowIcon}>
                    <Users size={18} color={user.active ? colors.primary : colors.muted} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <Text style={styles.userRole}>{getRoleLabel(user.role as AppRole)}</Text>
                  <Text style={[styles.userStatus, user.active ? styles.userStatusActive : styles.userStatusInactive]}>
                    {user.active ? 'Activo' : 'Eliminado'}
                  </Text>
                  <Pressable
                    disabled={!canDeactivate || deletingUserId === user.id}
                    onPress={() => setPendingDeleteUser(user)}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                      (!canDeactivate || deletingUserId === user.id) && styles.deleteButtonDisabled,
                    ]}
                  >
                    <Trash2 size={17} color={canDeactivate ? colors.primaryDark : colors.muted} />
                    <Text style={[styles.deleteButtonText, !canDeactivate && styles.deleteButtonTextDisabled]}>
                      {deletingUserId === user.id ? 'Eliminando...' : 'Eliminar'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <Modal transparent visible={createdUserModal !== null} animationType="fade" onRequestClose={() => setCreatedUserModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Users size={28} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Usuario creado</Text>
            <Text style={styles.modalCopy}>Guarda estos datos para compartirlos con el usuario.</Text>

            {createdUserModal && (
              <View style={styles.credentialsBox}>
                <CredentialRow label="Nombre" value={createdUserModal.name} />
                <CredentialRow label="Correo" value={createdUserModal.email} />
                <CredentialRow label="Rol" value={getRoleLabel(createdUserModal.role)} />
                <CredentialRow label="Clave temporal" value={createdUserModal.password} strong />
              </View>
            )}

            <Pressable onPress={() => setCreatedUserModal(null)} style={({ pressed }) => [styles.modalButton, pressed && styles.buttonPressed]}>
              <Text style={styles.buttonText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={pendingDeleteUser !== null} animationType="fade" onRequestClose={() => setPendingDeleteUser(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Trash2 size={28} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Eliminar usuario</Text>
            <Text style={styles.modalCopy}>El usuario no se borrara de la base de datos. Solo quedara inactivo para conservar el historial.</Text>

            {pendingDeleteUser && (
              <View style={styles.credentialsBox}>
                <CredentialRow label="Nombre" value={pendingDeleteUser.name} />
                <CredentialRow label="Correo" value={pendingDeleteUser.email} />
                <CredentialRow label="Rol" value={getRoleLabel(pendingDeleteUser.role as AppRole)} />
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setPendingDeleteUser(null)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={deactivateUser} style={({ pressed }) => [styles.modalButton, styles.modalDangerButton, pressed && styles.buttonPressed]}>
                <Text style={styles.buttonText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function CredentialRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.credentialRow}>
      <Text style={styles.credentialLabel}>{label}</Text>
      <Text style={[styles.credentialValue, strong && styles.credentialStrong]}>{value}</Text>
    </View>
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
  textArea: {
    minHeight: 86,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
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
  buttonDisabled: {
    opacity: 0.65,
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
  formMessageError: {
    color: colors.primaryDark,
  },
  userListCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  userListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  userListSubhead: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: -spacing.sm,
  },
  userCount: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userListActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  userSegment: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    backgroundColor: '#ECEDEF',
    padding: 4,
  },
  userSegmentOption: {
    minHeight: 36,
    minWidth: 112,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  userSegmentActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userSegmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  userSegmentTextActive: {
    color: colors.text,
  },
  userList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyState: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
  userRow: {
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  userRowInactive: {
    opacity: 0.62,
  },
  userInfo: {
    flex: 1,
    minWidth: 180,
  },
  productList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  productRow: {
    minHeight: 76,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  productInfo: {
    flex: 1,
    minWidth: 190,
  },
  productLine: {
    minWidth: 140,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  productPresentation: {
    minWidth: 170,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  userName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  userEmail: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  userRole: {
    minWidth: 105,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  userStatus: {
    minWidth: 88,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  userStatusActive: {
    color: colors.success,
    backgroundColor: '#E8F7F4',
  },
  userStatusInactive: {
    color: colors.muted,
    backgroundColor: '#F1F2F4',
  },
  deleteButton: {
    minHeight: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FFD4C4',
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  deleteButtonPressed: {
    backgroundColor: '#FFE4DA',
  },
  deleteButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: '#F8F8F9',
  },
  deleteButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  deleteButtonTextDisabled: {
    color: colors.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  modalIcon: {
    width: 62,
    height: 62,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  modalCopy: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  credentialsBox: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  credentialLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  credentialValue: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  credentialStrong: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  modalButton: {
    minHeight: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.xl,
  },
  modalDangerButton: {
    flex: 1,
    alignSelf: 'auto',
  },
  modalActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.background,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
});
