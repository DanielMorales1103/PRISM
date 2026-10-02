import * as Location from 'expo-location';
import type { Doctor, GeoLocation, Pharmacy } from '@prism/shared';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Crosshair, ExternalLink, MapPin, Navigation, Search } from 'lucide-react-native';
import { SessionUser } from '../app/types';
import { api } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';
import { LocationMapPreview } from '../components/LocationMapPreview';

type MapClient = Doctor | Pharmacy;

interface MapScreenProps {
  currentUser: SessionUser;
}

export function MapScreen({ currentUser }: MapScreenProps) {
  const [clients, setClients] = useState<MapClient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
  const [capturedLocation, setCapturedLocation] = useState<GeoLocation | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const manager = ['admin', 'jefe', 'supervisor'].includes(currentUser.role);

  useEffect(() => {
    let active = true;
    void api.getClients()
      .then((data) => {
        if (!active) return;
        const visible = [...data.doctors, ...data.pharmacies].filter(
          (client) => client.active && (manager || client.assignedUserId === currentUser.id),
        );
        setClients(visible);
      })
      .catch(() => {
        if (active) {
          setError(true);
          setMessage('No se pudieron cargar los clientes.');
        }
      });
    return () => { active = false; };
  }, [currentUser.id, manager]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') throw new Error('Activa el permiso de ubicación para ver tu posición actual.');
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) setCurrentLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      } catch (cause) {
        if (active) {
          setError(true);
          setMessage(cause instanceof Error ? cause.message : 'No se pudo obtener tu ubicación actual.');
        }
      }
    })();
    return () => { active = false; };
  }, []);

  const selectedClient = clients.find((client) => client.id === selectedId);
  const results = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term || selectedClient?.name === search) return [];
    return clients
      .filter((client) => `${client.name} ${client.address}`.toLocaleLowerCase().includes(term))
      .slice(0, 8);
  }, [clients, search, selectedClient?.name]);
  const located = clients.filter((client) => client.location).length;

  const mapLocation = capturedLocation ?? selectedClient?.location ?? currentLocation;

  const openGoogleMaps = () => {
    if (!selectedClient) return;
    const query = mapLocation
      ? `${mapLocation.latitude},${mapLocation.longitude}`
      : `${selectedClient.name}, ${selectedClient.address}, Guatemala`;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  };

  const handleMapLocationChange = (location: GeoLocation) => {
    if (selectedClient) {
      setCapturedLocation(location);
      setMessage('Punto ajustado. Confirma para guardar esta nueva ubicación.');
    } else {
      setCurrentLocation(location);
      setMessage('Punto de referencia ajustado. Selecciona un cliente para guardarlo.');
    }
    setError(false);
  };

  const captureLocation = async () => {
    if (!selectedClient) {
      setError(true);
      setMessage('Selecciona un cliente antes de registrar la ubicación.');
      return;
    }

    setSaving(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Debes permitir la ubicación para registrarla.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCurrentLocation(location);
      setCapturedLocation(location);
      setError(false);
      setMessage('Ubicación obtenida. Revisa el mapa y confirma para guardarla.');
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : 'No se pudo obtener la ubicación.');
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async () => {
    if (!selectedClient || !capturedLocation) return;

    setSaving(true);
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible. Ingresa de nuevo.');
      const updated = selectedClient.type === 'doctor'
        ? await api.updateDoctorLocation(token, selectedClient.id, capturedLocation)
        : await api.updatePharmacyLocation(token, selectedClient.id, capturedLocation);
      setClients((current) => current.map((client) => client.id === updated.id ? updated : client));
      setCapturedLocation(null);
      setError(false);
      setMessage(`Ubicación guardada para ${updated.name}.`);
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : 'No se pudo registrar la ubicación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.iconWrap}><MapPin size={27} color={colors.primary} /></View>
        <View><Text style={styles.title}>Mapa Inteligente</Text><Text style={styles.subtitle}>Registra puntos reales de tu cartera y abre la navegación en Google Maps.</Text></View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{located}</Text><Text style={styles.metricLabel}>con ubicación registrada</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{clients.length}</Text><Text style={styles.metricLabel}>{manager ? 'clientes visibles' : 'clientes de mi cartera'}</Text></View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Registrar ubicación</Text>
        <Text style={styles.panelCopy}>Busca al cliente cuando estés en el punto de visita y guarda la ubicación actual.</Text>
        {message ? <Text style={[styles.message, error && styles.error]}>{message}</Text> : null}
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.muted} />
        <TextInput value={search} onChangeText={(value) => { setSearch(value); setSelectedId(''); setCapturedLocation(null); setMessage(''); }} placeholder="Busca por nombre o dirección" placeholderTextColor="#9CA3AF" style={styles.searchInput} />
        </View>
        {results.length > 0 ? <View style={styles.results}>{results.map((client) => <Pressable key={client.id} onPress={() => { setSelectedId(client.id); setSearch(client.name); setCapturedLocation(client.location ? null : currentLocation); }} style={styles.result}><Text style={styles.resultTitle}>{client.name}</Text><Text style={styles.resultMeta}>{client.type === 'doctor' ? 'Médico' : 'Farmacia'} · {client.address}</Text></Pressable>)}</View> : null}

        {selectedClient ? <View style={styles.clientCard}>
          <View style={styles.clientIcon}><MapPin size={21} color={colors.primary} /></View>
          <View style={styles.clientCopy}><Text style={styles.clientName}>{selectedClient.name}</Text><Text style={styles.clientAddress}>{selectedClient.address}</Text><Text style={styles.clientStatus}>{capturedLocation ? 'Ubicación nueva lista para guardar' : selectedClient.location ? 'Ubicación registrada' : 'Sin ubicación registrada'}</Text></View>
        </View> : null}

        <View style={styles.actions}>
          <Pressable disabled={!selectedClient || saving} onPress={() => void captureLocation()} style={[styles.primaryButton, (!selectedClient || saving) && styles.disabled]}><Crosshair size={18} color={colors.onPrimary} /><Text style={styles.primaryButtonText}>{saving ? 'Obteniendo ubicación...' : 'Tomar mi ubicación'}</Text></Pressable>
          <Pressable disabled={!capturedLocation || saving} onPress={() => void saveLocation()} style={[styles.secondaryButton, (!capturedLocation || saving) && styles.disabled]}><MapPin size={18} color={colors.primary} /><Text style={styles.secondaryButtonText}>Guardar ubicación</Text></Pressable>
          <Pressable disabled={!selectedClient} onPress={openGoogleMaps} style={[styles.secondaryButton, !selectedClient && styles.disabled]}><ExternalLink size={18} color={colors.primary} /><Text style={styles.secondaryButtonText}>Abrir Google Maps</Text></Pressable>
        </View>
      </View>

      {mapLocation ? <View style={styles.mapPanel}>
        <View style={styles.mapHeader}><View><Text style={styles.mapTitle}>{capturedLocation ? 'Vista previa de ubicación' : selectedClient?.location ? `Ubicación de ${selectedClient.name}` : 'Mi ubicación actual'}</Text><Text style={styles.mapSubtitle}>{capturedLocation ? 'Confirma que el punto sea correcto antes de guardarlo.' : 'Arrastra el marcador o pulsa el mapa para ajustar el punto.'}</Text></View><MapPin size={23} color={colors.primary} /></View>
        <LocationMapPreview key={`${mapLocation.latitude}-${mapLocation.longitude}`} latitude={mapLocation.latitude} longitude={mapLocation.longitude} onLocationChange={handleMapLocationChange} />
      </View> : <View style={styles.infoPanel}>
        <Navigation size={22} color={colors.primary} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Ubicación pendiente</Text><Text style={styles.infoText}>Permite el acceso a tu ubicación para visualizar el mapa.</Text></View>
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 54, height: 54, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 4 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { minWidth: 190, flexGrow: 1, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 3, ...shadows.card },
  metricValue: { color: colors.text, fontSize: 28, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 13 },
  panel: { position: 'relative', zIndex: 20, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.md, ...shadows.card },
  panelTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  panelCopy: { color: colors.muted, lineHeight: 21 },
  message: { color: colors.success, fontWeight: '800' },
  error: { color: colors.primaryDark },
  searchWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.text, minHeight: 48 },
  results: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface },
  result: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultTitle: { color: colors.text, fontWeight: '900' },
  resultMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  clientCard: { flexDirection: 'row', gap: spacing.md, borderRadius: 8, backgroundColor: '#FFF7F3', borderWidth: 1, borderColor: '#FED7C6', padding: spacing.md },
  clientIcon: { width: 42, height: 42, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  clientCopy: { flex: 1, gap: 3 },
  clientName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  clientAddress: { color: colors.muted, fontSize: 13 },
  clientStatus: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.lg, borderRadius: 8, backgroundColor: colors.primary },
  primaryButtonText: { color: colors.onPrimary, fontWeight: '900' },
  secondaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.lg, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
  secondaryButtonText: { color: colors.primary, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  infoPanel: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  infoCopy: { flex: 1, gap: 4 },
  infoTitle: { color: colors.text, fontWeight: '900' },
  infoText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  mapPanel: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.card },
  mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  mapTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  mapSubtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
});
