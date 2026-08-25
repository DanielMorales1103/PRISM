import type { Doctor, Institution, Pharmacy } from '@prism/shared';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Building2, CheckCircle2, CircleUserRound, MapPin, Stethoscope, Trash2, Users } from 'lucide-react-native';
import { canManageClients } from '../app/permissions';
import { SessionUser } from '../app/types';
import { api } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, spacing } from '../theme/theme';

interface ClientsScreenProps {
  currentUser: SessionUser;
}

type ClientTab = 'doctors' | 'pharmacies';
type CreateType = 'doctor' | 'pharmacy';
type ListFilter = 'active' | 'deleted';
type ManagedClient = Doctor | Pharmacy;
type ClientRow = Doctor | Pharmacy | Institution;

interface ClientFormState {
  name: string;
  category: 'A' | 'B' | 'C' | 'cadena';
  collegiateNumber: string;
  specialty: string;
  subSpecialty: string;
  hospitalOrClinic: string;
  nit: string;
  ownerName: string;
  purchaseManager: string;
  address: string;
  clinicPhone: string;
  phone: string;
  mobilePhone: string;
  emailOrSocial: string;
  secretaryName: string;
  birthDate: string;
  secretaryBirthDate: string;
  ownerBirthDate: string;
  visitDays: string;
  visitHours: string;
}

const emptyForm: ClientFormState = {
  name: '',
  category: 'C',
  collegiateNumber: '',
  specialty: '',
  subSpecialty: '',
  hospitalOrClinic: '',
  nit: '',
  ownerName: '',
  purchaseManager: '',
  address: '',
  clinicPhone: '',
  phone: '',
  mobilePhone: '',
  emailOrSocial: '',
  secretaryName: '',
  birthDate: '',
  secretaryBirthDate: '',
  ownerBirthDate: '',
  visitDays: '',
  visitHours: '',
};

const tabLabels: Record<ClientTab, string> = {
  doctors: 'Medicos',
  pharmacies: 'Farmacias',
};

const typeLabels: Record<CreateType, string> = {
  doctor: 'Medico',
  pharmacy: 'Farmacia',
};

export function ClientsScreen({ currentUser }: ClientsScreenProps) {
  const canEdit = canManageClients(currentUser.role);
  const [tab, setTab] = useState<ClientTab>('doctors');
  const [createType, setCreateType] = useState<CreateType>('doctor');
  const [listFilter, setListFilter] = useState<ListFilter>('active');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeleteClient, setPendingDeleteClient] = useState<ManagedClient | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [createdClient, setCreatedClient] = useState<ManagedClient | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadClients() {
      try {
        const clients = await api.getClients();

        if (!mounted) {
          return;
        }

        setDoctors(clients.doctors);
        setPharmacies(clients.pharmacies);
        setInstitutions(clients.institutions);
      } catch {
        if (!mounted) {
          return;
        }

        setMessageType('error');
        setMessage('No se pudieron cargar los clientes. Revisa que el API este encendida.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadClients();

    return () => {
      mounted = false;
    };
  }, []);

  const currentRows = useMemo(() => {
    const rows = tab === 'doctors' ? doctors : pharmacies;
    return rows.filter((client) => (listFilter === 'active' ? client.active : !client.active));
  }, [doctors, listFilter, pharmacies, tab]);

  const activeDoctors = doctors.filter((doctor) => doctor.active).length;
  const activePharmacies = pharmacies.filter((pharmacy) => pharmacy.active).length;
  const activeInstitutions = institutions.filter((institution) => institution.active).length;
  const canDeleteFromTab = canEdit;

  const updateForm = (field: keyof ClientFormState, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const createClient = async () => {
    setMessage('');
    const name = form.name.trim();
    const address = form.address.trim();

    if (!name || !address) {
      setMessageType('error');
      setMessage('Completa al menos nombre y direccion.');
      return;
    }

    setSubmitting(true);

    try {
      const token = await loadToken();

      if (!token) {
        setMessageType('error');
        setMessage('Sesion no disponible. Ingresa de nuevo.');
        return;
      }

      if (createType === 'doctor') {
        const doctor = await api.createDoctor(token, {
          fullName: name,
          category: form.category === 'cadena' ? 'C' : form.category,
          collegiateNumber: form.collegiateNumber.trim(),
          specialty: form.specialty.trim(),
          subSpecialty: form.subSpecialty.trim(),
          address,
          hospitalOrClinic: form.hospitalOrClinic.trim(),
          birthDate: form.birthDate.trim(),
          clinicPhone: form.clinicPhone.trim(),
          mobilePhone: form.mobilePhone.trim(),
          emailOrSocial: form.emailOrSocial.trim(),
          secretaryName: form.secretaryName.trim(),
          secretaryBirthDate: form.secretaryBirthDate.trim(),
          visitDays: getVisitDays(form.visitDays),
          visitHours: form.visitHours.trim(),
        });

        setDoctors((currentDoctors) => [doctor, ...currentDoctors].sort(sortByName));
        setTab('doctors');
        setCreatedClient(doctor);
      } else {
        const pharmacy = await api.createPharmacy(token, {
          name,
          category: form.category,
          nit: form.nit.trim(),
          address,
          ownerName: form.ownerName.trim(),
          purchaseManager: form.purchaseManager.trim(),
          phone: form.phone.trim(),
          mobilePhone: form.mobilePhone.trim(),
          emailOrSocial: form.emailOrSocial.trim(),
          ownerBirthDate: form.ownerBirthDate.trim(),
          visitDays: getVisitDays(form.visitDays),
          visitHours: form.visitHours.trim(),
        });

        setPharmacies((currentPharmacies) => [pharmacy, ...currentPharmacies].sort(sortByName));
        setTab('pharmacies');
        setCreatedClient(pharmacy);
      }

      setForm(emptyForm);
      setListFilter('active');
      setMessageType('success');
      setMessage('');
    } catch (error) {
      setMessageType('error');
      const errorMessage = error instanceof Error ? error.message : 'No se pudo crear el cliente.';
      setMessage(errorMessage === 'Invalid token' ? 'Sesion vencida. Cierra sesion e ingresa de nuevo.' : errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const deactivateClient = async () => {
    if (!pendingDeleteClient) {
      return;
    }

    setDeletingClientId(pendingDeleteClient.id);
    setMessage('');

    try {
      const token = await loadToken();

      if (!token) {
        setMessageType('error');
        setMessage('Sesion no disponible. Ingresa de nuevo.');
        return;
      }

      if (pendingDeleteClient.type === 'doctor') {
        const updatedDoctor = await api.deactivateDoctor(token, pendingDeleteClient.id);
        setDoctors((currentDoctors) => currentDoctors.map((doctor) => (doctor.id === updatedDoctor.id ? updatedDoctor : doctor)));
      } else {
        const updatedPharmacy = await api.deactivatePharmacy(token, pendingDeleteClient.id);
        setPharmacies((currentPharmacies) => currentPharmacies.map((pharmacy) => (pharmacy.id === updatedPharmacy.id ? updatedPharmacy : pharmacy)));
      }

      setListFilter('deleted');
      setPendingDeleteClient(null);
    } catch (error) {
      setMessageType('error');
      const errorMessage = error instanceof Error ? error.message : 'No se pudo eliminar el cliente.';
      setMessage(errorMessage === 'Invalid token' ? 'Sesion vencida. Cierra sesion e ingresa de nuevo.' : errorMessage);
    } finally {
      setDeletingClientId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Users size={26} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.description}>Gestion inicial de medicos, farmacias e instituciones registrados.</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <SummaryCard label="Medicos activos" value={String(activeDoctors)} icon={<Stethoscope size={24} color={colors.primary} />} />
        <SummaryCard label="Farmacias activas" value={String(activePharmacies)} icon={<Building2 size={24} color={colors.primary} />} />
        <SummaryCard label="Instituciones activas" value={String(activeInstitutions)} icon={<MapPin size={24} color={colors.primary} />} />
      </View>

      {canEdit && (
        <View style={styles.createCard}>
          <View style={styles.createHeader}>
            <View>
              <Text style={styles.cardTitle}>Crear cliente</Text>
              <Text style={styles.subhead}>Selecciona el tipo de cliente y completa los datos principales.</Text>
            </View>
            <View style={styles.segment}>
              {(['doctor', 'pharmacy'] as CreateType[]).map((type) => (
                <Pressable key={type} onPress={() => setCreateType(type)} style={[styles.segmentOption, createType === type && styles.segmentActive]}>
                  <Text style={[styles.segmentText, createType === type && styles.segmentTextActive]}>{typeLabels[type]}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGrid}>
            <NameCategoryField
              nameLabel={createType === 'doctor' ? 'Nombre completo' : 'Nombre farmacia'}
              nameValue={form.name}
              namePlaceholder={createType === 'doctor' ? 'Ej. Dra. Beatriz Mencos' : 'Ej. Farmacia San Pablo'}
              onNameChange={(value) => updateForm('name', value)}
              type={createType}
              categoryValue={form.category}
              onCategoryChange={(category) => updateForm('category', category)}
            />
            {createType === 'doctor' ? (
              <>
                <Field label="Colegiado" value={form.collegiateNumber} placeholder="No. colegiado" onChangeText={(value) => updateForm('collegiateNumber', value)} />
                <Field label="Especialidad" value={form.specialty} placeholder="Ej. Dermatologia" onChangeText={(value) => updateForm('specialty', value)} />
                <Field label="Sub especialidad" value={form.subSpecialty} placeholder="Opcional" onChangeText={(value) => updateForm('subSpecialty', value)} />
                <Field label="Hospital/Centro" value={form.hospitalOrClinic} placeholder="Hospital o clinica" onChangeText={(value) => updateForm('hospitalOrClinic', value)} />
              </>
            ) : (
              <>
                <Field label="NIT" value={form.nit} placeholder="NIT" onChangeText={(value) => updateForm('nit', value)} />
                <Field label="Propietario" value={form.ownerName} placeholder="Nombre propietario" onChangeText={(value) => updateForm('ownerName', value)} />
                <Field label="Encargado compras" value={form.purchaseManager} placeholder="Nombre encargado" onChangeText={(value) => updateForm('purchaseManager', value)} />
              </>
            )}
            <Field label="Direccion" value={form.address} placeholder="Direccion completa" onChangeText={(value) => updateForm('address', value)} wide />
            {createType === 'doctor' ? (
              <Field label="Telefono clinica" value={form.clinicPhone} placeholder="Telefono" onChangeText={(value) => updateForm('clinicPhone', value)} />
            ) : (
              <Field label="Telefono" value={form.phone} placeholder="Telefono" onChangeText={(value) => updateForm('phone', value)} />
            )}
            <Field label="Celular" value={form.mobilePhone} placeholder="Celular" onChangeText={(value) => updateForm('mobilePhone', value)} />
            <Field label="Dias de visita" value={form.visitDays} placeholder="lunes, miercoles" onChangeText={(value) => updateForm('visitDays', value)} />
            <Field label="Horario de visita" value={form.visitHours} placeholder="Ej. 9 a 1pm" onChangeText={(value) => updateForm('visitHours', value)} />
            <Field label="Red social/correo" value={form.emailOrSocial} placeholder="Contacto" onChangeText={(value) => updateForm('emailOrSocial', value)} />
            {createType === 'doctor' ? (
              <>
                <Field label="Nombre secretaria" value={form.secretaryName} placeholder="Opcional" onChangeText={(value) => updateForm('secretaryName', value)} />
                <Field label="Fecha nacimiento" value={form.birthDate} placeholder="YYYY-MM-DD" onChangeText={(value) => updateForm('birthDate', value)} />
                <Field label="Cumpleaños secretaria" value={form.secretaryBirthDate} placeholder="YYYY-MM-DD" onChangeText={(value) => updateForm('secretaryBirthDate', value)} />
              </>
            ) : (
              <Field label="Cumpleaños propietario" value={form.ownerBirthDate} placeholder="YYYY-MM-DD" onChangeText={(value) => updateForm('ownerBirthDate', value)} />
            )}
          </View>

          {message ? <Text style={[styles.formMessage, messageType === 'error' && styles.formMessageError]}>{message}</Text> : null}

          <Pressable disabled={submitting} onPress={createClient} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, submitting && styles.buttonDisabled]}>
            <Text style={styles.primaryButtonText}>{submitting ? 'Creando...' : `Crear ${typeLabels[createType].toLowerCase()}`}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.listCard}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.cardTitle}>{tabLabels[tab]} registrados</Text>
            <Text style={styles.subhead}>{loading ? 'Cargando datos...' : `${currentRows.length} ${listFilter === 'active' ? 'activos' : 'eliminados'}`}</Text>
          </View>
          {!canEdit && <Text style={styles.readOnlyBadge}>Solo consulta</Text>}
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.segment}>
            {(['doctors', 'pharmacies'] as ClientTab[]).map((nextTab) => (
              <Pressable key={nextTab} onPress={() => setTab(nextTab)} style={[styles.segmentOption, tab === nextTab && styles.segmentActive]}>
                <Text style={[styles.segmentText, tab === nextTab && styles.segmentTextActive]}>{tabLabels[nextTab]}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.segment}>
            <Pressable onPress={() => setListFilter('active')} style={[styles.segmentOption, listFilter === 'active' && styles.segmentActive]}>
              <Text style={[styles.segmentText, listFilter === 'active' && styles.segmentTextActive]}>Activos</Text>
            </Pressable>
            <Pressable onPress={() => setListFilter('deleted')} style={[styles.segmentOption, listFilter === 'deleted' && styles.segmentActive]}>
              <Text style={[styles.segmentText, listFilter === 'deleted' && styles.segmentTextActive]}>Eliminados</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeadText, styles.nameColumn]}>Nombre</Text>
          <Text style={styles.tableHeadText}>Categoria</Text>
          <Text style={[styles.tableHeadText, styles.addressColumn]}>Direccion / centro</Text>
          <Text style={styles.tableHeadText}>Contacto</Text>
          {canDeleteFromTab && <Text style={styles.tableHeadText}>Accion</Text>}
        </View>

        {currentRows.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin {tabLabels[tab].toLowerCase()} {listFilter === 'active' ? 'activos' : 'eliminados'}</Text>
            <Text style={styles.emptyText}>Cuando existan registros apareceran aqui.</Text>
          </View>
        )}

        {currentRows.map((client) => (
          <View key={client.id} style={[styles.clientRow, !client.active && styles.clientRowInactive]}>
            <View style={[styles.nameColumn, styles.clientMain]}>
              <View style={styles.rowIcon}>
                <CircleUserRound size={17} color={client.active ? colors.primary : colors.muted} />
              </View>
              <View style={styles.nameTextWrap}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientMeta}>{getClientSubtitle(client)}</Text>
              </View>
            </View>
            <Text style={styles.tableCell}>{client.category}</Text>
            <Text style={[styles.tableCell, styles.addressColumn]} numberOfLines={2}>{getClientAddress(client)}</Text>
            <Text style={styles.tableCell} numberOfLines={2}>{getClientContact(client)}</Text>
            {canDeleteFromTab && (
              <Pressable
                disabled={!client.active || deletingClientId === client.id}
                onPress={() => setPendingDeleteClient(client)}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed, (!client.active || deletingClientId === client.id) && styles.deleteButtonDisabled]}
              >
                <Trash2 size={16} color={client.active ? colors.primaryDark : colors.muted} />
                <Text style={[styles.deleteButtonText, !client.active && styles.deleteButtonTextDisabled]}>{deletingClientId === client.id ? 'Eliminando...' : 'Eliminar'}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <Modal transparent visible={createdClient !== null} animationType="fade" onRequestClose={() => setCreatedClient(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <CheckCircle2 size={30} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Cliente creado</Text>
            <Text style={styles.modalCopy}>El registro quedo guardado en la base de datos y ya aparece como activo.</Text>
            {createdClient && (
              <View style={styles.modalInfoBox}>
                <InfoRow label="Tipo" value={typeLabels[createdClient.type === 'doctor' ? 'doctor' : 'pharmacy']} />
                <InfoRow label="Nombre" value={createdClient.name} />
                <InfoRow label="Detalle" value={getClientSubtitle(createdClient)} />
              </View>
            )}
            <Pressable onPress={() => setCreatedClient(null)} style={({ pressed }) => [styles.primaryButton, styles.modalButton, pressed && styles.primaryButtonPressed]}>
              <Text style={styles.primaryButtonText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={pendingDeleteClient !== null} animationType="fade" onRequestClose={() => setPendingDeleteClient(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Trash2 size={28} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Eliminar cliente</Text>
            <Text style={styles.modalCopy}>No se borrara de MongoDB. Solo quedara inactivo para conservar historial.</Text>
            {pendingDeleteClient && (
              <View style={styles.modalInfoBox}>
                <InfoRow label="Nombre" value={pendingDeleteClient.name} />
                <InfoRow label="Direccion" value={pendingDeleteClient.address} />
              </View>
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setPendingDeleteClient(null)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={deactivateClient} style={({ pressed }) => [styles.primaryButton, styles.modalActionButton, pressed && styles.primaryButtonPressed]}>
                <Text style={styles.primaryButtonText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>{icon}</View>
      <View>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  wide,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <View style={[styles.fieldGroup, wide && styles.fieldWide]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9CA3AF" style={styles.input} />
    </View>
  );
}

function NameCategoryField({
  nameLabel,
  nameValue,
  namePlaceholder,
  onNameChange,
  type,
  categoryValue,
  onCategoryChange,
}: {
  nameLabel: string;
  nameValue: string;
  namePlaceholder: string;
  onNameChange: (value: string) => void;
  type: CreateType;
  categoryValue: ClientFormState['category'];
  onCategoryChange: (value: ClientFormState['category']) => void;
}) {
  return (
    <View style={[styles.fieldGroup, styles.fieldWide, styles.nameCategoryGroup]}>
      <View style={styles.nameCategoryName}>
        <Text style={styles.label}>{nameLabel}</Text>
        <TextInput value={nameValue} onChangeText={onNameChange} placeholder={namePlaceholder} placeholderTextColor="#9CA3AF" style={styles.input} />
      </View>
      <CategorySelector type={type} value={categoryValue} onChange={onCategoryChange} />
    </View>
  );
}

function CategorySelector({
  type,
  value,
  onChange,
}: {
  type: CreateType;
  value: ClientFormState['category'];
  onChange: (value: ClientFormState['category']) => void;
}) {
  const options = type === 'doctor'
    ? [
        { value: 'A', label: 'A' },
        { value: 'B', label: 'B' },
        { value: 'C', label: 'C' },
      ]
    : [
        { value: 'A', label: 'A' },
        { value: 'B', label: 'B' },
        { value: 'C', label: 'C' },
        { value: 'cadena', label: 'Cadena' },
      ];

  return (
    <View style={styles.categoryGroup}>
      <Text style={styles.label}>Categoria</Text>
      <View style={styles.categoryRow}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value as ClientFormState['category'])}
            style={[styles.categoryButton, value === option.value && styles.categoryButtonActive]}
          >
            <Text style={[styles.categoryText, value === option.value && styles.categoryTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function getVisitDays(value: string) {
  return value
    .split(',')
    .map((day) => day.trim())
    .filter(Boolean);
}

function sortByName(first: ClientRow, second: ClientRow) {
  return first.name.localeCompare(second.name);
}

function getClientSubtitle(client: ClientRow) {
  if (client.type === 'doctor') {
    return client.specialty || client.collegiateNumber || 'Medico';
  }

  if (client.type === 'pharmacy') {
    return client.nit || client.ownerName || 'Farmacia';
  }

  return client.contactName || 'Institucion';
}

function getClientAddress(client: ClientRow) {
  if (client.type === 'doctor') {
    return [client.address, client.hospitalOrClinic].filter(Boolean).join(' - ');
  }

  return client.address;
}

function getClientContact(client: ClientRow) {
  if (client.type === 'doctor') {
    return client.mobilePhone || client.clinicPhone || client.emailOrSocial || 'Sin contacto';
  }

  if (client.type === 'pharmacy') {
    return client.mobilePhone || client.phone || client.emailOrSocial || 'Sin contacto';
  }

  return client.phone || client.emailOrSocial || 'Sin contacto';
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FFD4C4',
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    minWidth: 230,
    minHeight: 118,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  createCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  subhead: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    backgroundColor: '#ECEDEF',
    padding: 4,
  },
  segmentOption: {
    minHeight: 38,
    minWidth: 112,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.text,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fieldGroup: {
    flex: 1,
    minWidth: 230,
  },
  fieldWide: {
    minWidth: 460,
  },
  nameCategoryGroup: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nameCategoryName: {
    flex: 1,
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
  categoryGroup: {
    width: 190,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  categoryButton: {
    minWidth: 50,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  categoryButtonActive: {
    borderColor: '#FFD4C4',
    backgroundColor: colors.primarySoft,
  },
  categoryText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  categoryTextActive: {
    color: colors.primary,
  },
  formMessage: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  formMessageError: {
    color: colors.primaryDark,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  listCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  readOnlyBadge: {
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tableHeader: {
    minHeight: 42,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tableHeadText: {
    width: 130,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  nameColumn: {
    flex: 1.4,
    minWidth: 260,
  },
  addressColumn: {
    flex: 1.2,
    minWidth: 220,
  },
  clientRow: {
    minHeight: 78,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  clientRowInactive: {
    opacity: 0.62,
  },
  clientMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameTextWrap: {
    flex: 1,
  },
  clientName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  clientMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  tableCell: {
    width: 130,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
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
  modalInfoBox: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  infoValue: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  modalButton: {
    alignSelf: 'stretch',
  },
  modalActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActionButton: {
    flex: 1,
    alignSelf: 'auto',
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
