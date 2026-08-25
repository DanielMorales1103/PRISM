import type { Doctor } from '@prism/shared';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ArrowLeft, Building2, ChevronRight, Cross, LocateFixed, MapPin, Navigation, User } from 'lucide-react-native';
import { VisitDoctorSnapshot } from '../app/types';
import { api } from '../services/api';
import { colors, radius, shadows, spacing } from '../theme/theme';

interface NewVisitScreenProps {
  onBack: () => void;
  onContinue: (doctor: VisitDoctorSnapshot) => void;
}

interface DoctorOption {
  id?: string;
  name: string;
  specialty: string;
  clinic: string;
  address: string;
}

const fallbackDoctors: DoctorOption[] = [
  {
    name: 'Dr. Ricardo Salinas',
    specialty: 'Dermatologia',
    clinic: 'Hospital Herrera Llerandi',
    address: 'Zona 10, Ciudad de Guatemala',
  },
  {
    name: 'Dra. Beatriz Mencos',
    specialty: 'Pediatria',
    clinic: 'Centro Medico Z.10',
    address: 'Zona 10, Ciudad de Guatemala',
  },
  {
    name: 'Dr. Sergio Valdes',
    specialty: 'Endocrinologia',
    clinic: 'Multimedica',
    address: 'Zona 15, Ciudad de Guatemala',
  },
  {
    name: 'Dr. Mario Estrada',
    specialty: 'Medicina General',
    clinic: 'Hospital San Juan de Dios',
    address: 'Zona 1, Ciudad de Guatemala',
  },
];

function toDoctorOption(doctor: Doctor): DoctorOption {
  return {
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty || 'Medicina General',
    clinic: doctor.hospitalOrClinic || 'Clinica / hospital no especificado',
    address: doctor.address,
  };
}

export function NewVisitScreen({ onBack, onContinue }: NewVisitScreenProps) {
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>(fallbackDoctors);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const { width, height } = useWindowDimensions();
  const wide = width >= 900 && width > height;

  useEffect(() => {
    let mounted = true;

    void api.getClients()
      .then((clients) => {
        const activeDoctors = clients.doctors.filter((doctor) => doctor.active).map(toDoctorOption);

        if (mounted && activeDoctors.length > 0) {
          setDoctorOptions(activeDoctors);
        }
      })
      .catch(() => {
        if (mounted) {
          setDoctorOptions(fallbackDoctors);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const matchingDoctors = useMemo(() => {
    const normalizedQuery = doctorQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return doctorOptions;
    }

    return doctorOptions.filter((doctor) =>
      [doctor.name, doctor.specialty, doctor.clinic, doctor.address].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [doctorOptions, doctorQuery]);

  const showDoctorDropdown = doctorQuery.length > 0 && selectedDoctor?.name !== doctorQuery;

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft size={26} color={colors.text} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Nueva Visita Medica</Text>
          <Text style={styles.brand}>prism</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Visita en Proceso</Text>
        </View>
      </View>

      <View style={[styles.body, !wide && styles.bodyStacked]}>
        <View style={styles.formPanel}>
          <View style={styles.formContent}>
            <Text style={styles.sectionTitle}>Informacion del Medico</Text>
            <Text style={styles.sectionDescription}>Completa los datos para personalizar la experiencia.</Text>

            <View style={[styles.formRow, !wide && styles.formRowStacked]}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nombre del Medico</Text>
                <View style={styles.autocompleteWrap}>
                  <View style={styles.inputWrap}>
                    <User size={20} color="#A3A3A3" />
                    <TextInput
                      value={doctorQuery}
                      onChangeText={(value) => {
                        setDoctorQuery(value);
                        setSelectedDoctor(null);
                      }}
                      placeholder="Buscar medico registrado..."
                      placeholderTextColor="#8B8B8B"
                      style={styles.input}
                    />
                  </View>
                  {showDoctorDropdown && (
                    <View style={styles.dropdown}>
                      {matchingDoctors.length > 0 ? (
                        matchingDoctors.slice(0, 4).map((doctor) => (
                          <Pressable
                            key={`${doctor.name}-${doctor.clinic}`}
                            onPress={() => {
                              setDoctorQuery(doctor.name);
                              setSelectedDoctor(doctor);
                            }}
                            style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                          >
                            <Text style={styles.dropdownName}>{doctor.name}</Text>
                            <Text style={styles.dropdownMeta}>{doctor.specialty} - {doctor.clinic}</Text>
                          </Pressable>
                        ))
                      ) : (
                        <View style={styles.dropdownEmpty}>
                          <Text style={styles.dropdownMeta}>Sin coincidencias</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Especialidad</Text>
                <View style={styles.inputWrap}>
                  <Cross size={20} color="#A3A3A3" />
                  <Text style={styles.selectText}>{selectedDoctor?.specialty ?? 'Selecciona Especialidad'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Clinica / Hospital</Text>
              <View style={styles.inputWrap}>
                <Building2 size={20} color="#A3A3A3" />
                <TextInput
                  value={selectedDoctor?.clinic ?? ''}
                  editable={!selectedDoctor}
                  placeholder="Ej. Hospital San Juan de Dios"
                  placeholderTextColor="#8B8B8B"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Direccion Exacta</Text>
              <View style={styles.inputWrap}>
                <MapPin size={20} color="#A3A3A3" />
                <TextInput
                  value={selectedDoctor?.address ?? ''}
                  editable={!selectedDoctor}
                  placeholder="Calle, zona, edificio..."
                  placeholderTextColor="#8B8B8B"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <Pressable
            onPress={() =>
              onContinue({
                name: selectedDoctor?.name ?? doctorQuery.trim(),
                specialty: selectedDoctor?.specialty,
                clinic: selectedDoctor?.clinic,
                address: selectedDoctor?.address,
              })
            }
            style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
          >
            <Text style={styles.continueText}>Continuar a Seleccion de Producto</Text>
            <ChevronRight size={22} color={colors.onPrimary} />
          </Pressable>
        </View>

        <View style={styles.mapPanel}>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Text style={styles.searchText}>Buscar ubicacion...</Text>
            </View>
            <View style={styles.locateButton}>
              <Navigation size={28} color={colors.primary} />
            </View>
          </View>

          <View style={styles.mapPin}>
            <MapPin size={28} color={colors.onPrimary} />
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Navigation size={25} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.locationTitle}>Ubicacion Actual</Text>
              <Text style={styles.locationText}>Zona 10, Ciudad de Guatemala</Text>
            </View>
            <LocateFixed size={22} color="transparent" />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topbar: {
    minHeight: 112,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    color: '#020202',
    fontSize: 25,
    fontWeight: '900',
  },
  brand: {
    color: '#777777',
    fontSize: 24,
    marginTop: 2,
  },
  statusPill: {
    minHeight: 46,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  statusText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  bodyStacked: {
    flexDirection: 'column',
  },
  formPanel: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  formContent: {
    gap: spacing.xl,
    maxWidth: 840,
  },
  sectionTitle: {
    color: '#050505',
    fontSize: 28,
    fontWeight: '900',
  },
  sectionDescription: {
    color: '#7B7B7B',
    fontSize: 18,
    fontWeight: '700',
    marginTop: -spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    zIndex: 20,
  },
  formRowStacked: {
    flexDirection: 'column',
  },
  fieldGroup: {
    flex: 1,
    gap: spacing.sm,
  },
  autocompleteWrap: {
    position: 'relative',
    zIndex: 30,
  },
  label: {
    color: '#4E4E4E',
    fontSize: 16,
    fontWeight: '800',
  },
  inputWrap: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DEDEDE',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  selectText: {
    color: '#050505',
    fontSize: 18,
    fontWeight: '800',
  },
  dropdown: {
    position: 'absolute',
    top: 74,
    left: 0,
    right: 0,
    zIndex: 40,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.card,
    elevation: 12,
  },
  dropdownItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemPressed: {
    backgroundColor: colors.primarySoft,
  },
  dropdownName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  dropdownMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  dropdownEmpty: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  continueButton: {
    minHeight: 80,
    borderRadius: 28,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    ...shadows.card,
  },
  continueText: {
    color: colors.onPrimary,
    fontSize: 19,
    fontWeight: '900',
  },
  mapPanel: {
    flex: 1,
    backgroundColor: '#FCFCFC',
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    ...shadows.card,
  },
  searchText: {
    color: '#B7B7B7',
    fontSize: 18,
    fontWeight: '800',
  },
  locateButton: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  mapPin: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  locationCard: {
    minHeight: 92,
    borderRadius: 26,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.card,
  },
  locationIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: {
    color: '#050505',
    fontSize: 20,
    fontWeight: '900',
  },
  locationText: {
    color: '#7D7D7D',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  pressed: {
    opacity: 0.82,
  },
});
