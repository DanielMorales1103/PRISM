import type { Doctor, Pharmacy, UserProfile } from '@prism/shared';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Building2, Search, Stethoscope, Trash2, UserRoundCheck, Users } from 'lucide-react-native';
import { api } from '../services/api';
import { loadToken } from '../services/session';
import { colors, radius, shadows, spacing } from '../theme/theme';

type AssignedClient = Doctor | Pharmacy;
type ClientFilter = 'all' | 'doctor' | 'pharmacy';

export function VisitadoresScreen() {
  const [visitadores, setVisitadores] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<AssignedClient[]>([]);
  const [selectedVisitadorId, setSelectedVisitadorId] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ClientFilter>('all');
  const [removingId, setRemovingId] = useState('');
  const [clientPendingRemoval, setClientPendingRemoval] = useState<AssignedClient | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([api.getUsers(), api.getClients()])
      .then(([userData, clientData]) => {
        if (!active) return;
        setVisitadores(userData.filter((user) => user.active && user.role === 'visitador').sort((a, b) => a.name.localeCompare(b.name)));
        setClients([...clientData.doctors, ...clientData.pharmacies].filter((client) => client.active));
      })
      .catch(() => {
        if (active) {
          setError(true);
          setMessage('No se pudo cargar la cartera de visitadores.');
        }
      });
    return () => { active = false; };
  }, []);

  const selectedVisitador = visitadores.find((user) => user.id === selectedVisitadorId);
  const assignedClients = useMemo(() => clients.filter((client) => client.assignedUserId === selectedVisitadorId), [clients, selectedVisitadorId]);
  const visibleClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return assignedClients.filter((client) => {
      const matchesType = filter === 'all' || client.type === filter;
      const matchesSearch = !term || `${client.name} ${client.address}`.toLocaleLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [assignedClients, filter, search]);

  const removeAssignment = async (client: AssignedClient) => {
    setRemovingId(client.id);
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible. Ingresa de nuevo.');
      const updated = client.type === 'doctor'
        ? await api.assignDoctor(token, client.id)
        : await api.assignPharmacy(token, client.id);
      setClients((current) => current.map((item) => item.id === updated.id ? updated : item));
      setError(false);
      setMessage(`${client.name} quedó sin visitador asignado.`);
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : 'No se pudo quitar la asignación.');
    } finally {
      setRemovingId('');
    }
  };

  const requestRemove = (client: AssignedClient) => {
    setClientPendingRemoval(client);
  };

  return <><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View style={styles.headerIcon}><UserRoundCheck size={27} color={colors.primary} /></View><View><Text style={styles.title}>Visitadores</Text><Text style={styles.subtitle}>Consulta y administra las carteras asignadas por visitador.</Text></View></View>
    {message ? <Text style={[styles.message, error && styles.error]}>{message}</Text> : null}
    <View style={styles.workspace}>
      <View style={styles.visitadoresPanel}>
        <Text style={styles.panelTitle}>Equipo de visitadores</Text>
        <Text style={styles.panelHint}>{visitadores.length} activos</Text>
        <View style={styles.visitadorList}>{visitadores.map((visitador) => {
          const assigned = clients.filter((client) => client.assignedUserId === visitador.id).length;
          const selected = selectedVisitadorId === visitador.id;
          return <Pressable key={visitador.id} onPress={() => { setSelectedVisitadorId(visitador.id); setSearch(''); setMessage(''); }} style={[styles.visitadorItem, selected && styles.visitadorItemActive]}><View style={styles.visitadorAvatar}><Users size={18} color={selected ? colors.primary : colors.muted} /></View><View style={styles.visitadorCopy}><Text style={[styles.visitadorName, selected && styles.visitadorNameActive]}>{visitador.name}</Text><Text style={styles.visitadorEmail}>{visitador.email}</Text></View><Text style={styles.clientCount}>{assigned}</Text></Pressable>;
        })}</View>
      </View>
      <View style={styles.carteraPanel}>
        {selectedVisitador ? <><View style={styles.carteraHeader}><View><Text style={styles.panelTitle}>Cartera de {selectedVisitador.name}</Text><Text style={styles.panelHint}>{assignedClients.length} clientes asignados</Text></View><View style={styles.countBadge}><Text style={styles.countBadgeText}>{assignedClients.length} total</Text></View></View>
          <View style={styles.controls}><View style={styles.searchWrap}><Search size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar por nombre o dirección" placeholderTextColor="#9CA3AF" style={styles.searchInput} /></View><View style={styles.filters}>{(['all', 'doctor', 'pharmacy'] as ClientFilter[]).map((value) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value === 'all' ? 'Todos' : value === 'doctor' ? 'Médicos' : 'Farmacias'}</Text></Pressable>)}</View></View>
          <View style={styles.clientList}>{visibleClients.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>{assignedClients.length === 0 ? 'Sin clientes asignados' : 'Sin resultados'}</Text><Text style={styles.panelHint}>{assignedClients.length === 0 ? 'Este visitador no tiene cartera todavía.' : 'Prueba otra búsqueda o filtro.'}</Text></View> : visibleClients.map((client) => <View key={client.id} style={styles.clientRow}><View style={styles.clientIcon}>{client.type === 'doctor' ? <Stethoscope size={20} color={colors.primary} /> : <Building2 size={20} color={colors.primary} />}</View><View style={styles.clientCopy}><Text style={styles.clientName}>{client.name}</Text><Text style={styles.clientMeta}>{client.type === 'doctor' ? 'Médico' : 'Farmacia'} · {client.address}</Text></View><Pressable disabled={removingId === client.id} onPress={() => requestRemove(client)} style={[styles.removeButton, removingId === client.id && styles.disabled]}><Trash2 size={16} color={colors.primary} /><Text style={styles.removeText}>{removingId === client.id ? 'Quitando...' : 'Quitar asignación'}</Text></Pressable></View>)}</View>
        </> : <View style={styles.empty}><UserRoundCheck size={30} color={colors.primary} /><Text style={styles.emptyTitle}>Selecciona un visitador</Text><Text style={styles.panelHint}>Consulta aquí sus médicos y farmacias asignadas.</Text></View>}
      </View>
    </View>
  </ScrollView>
  <Modal transparent visible={Boolean(clientPendingRemoval)} animationType="fade" onRequestClose={() => setClientPendingRemoval(null)}>
    <View style={styles.modalBackdrop}>
      <View style={styles.confirmDialog}>
        <Text style={styles.confirmTitle}>Quitar asignación</Text>
        <Text style={styles.confirmCopy}>¿Quitar a {clientPendingRemoval?.name} de la cartera de {selectedVisitador?.name ?? 'este visitador'}?</Text>
        <View style={styles.confirmActions}>
          <Pressable onPress={() => setClientPendingRemoval(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
          <Pressable disabled={!clientPendingRemoval || Boolean(removingId)} onPress={() => { if (clientPendingRemoval) { const client = clientPendingRemoval; setClientPendingRemoval(null); void removeAssignment(client); } }} style={[styles.confirmRemoveButton, (!clientPendingRemoval || Boolean(removingId)) && styles.disabled]}><Text style={styles.confirmRemoveText}>Quitar asignación</Text></Pressable>
        </View>
      </View>
    </View>
  </Modal></>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderRadius: 8 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 4 },
  message: { color: colors.success, fontWeight: '800' },
  error: { color: colors.primaryDark },
  workspace: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  visitadoresPanel: { flexBasis: 330, flexGrow: 1, maxWidth: 430, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.lg, gap: spacing.sm, ...shadows.card },
  carteraPanel: { flexBasis: 620, flexGrow: 3, minHeight: 460, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.lg, gap: spacing.md, ...shadows.card },
  panelTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  panelHint: { color: colors.muted, fontSize: 13, marginTop: 3 },
  visitadorList: { gap: spacing.sm, marginTop: spacing.sm },
  visitadorItem: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm },
  visitadorItemActive: { backgroundColor: colors.primarySoft, borderColor: '#FEC9B3' },
  visitadorAvatar: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  visitadorCopy: { flex: 1 },
  visitadorName: { color: colors.text, fontWeight: '900' },
  visitadorNameActive: { color: colors.primary },
  visitadorEmail: { color: colors.muted, fontSize: 12, marginTop: 2 },
  clientCount: { minWidth: 28, height: 28, textAlign: 'center', textAlignVertical: 'center', borderRadius: 14, color: colors.primary, backgroundColor: colors.primarySoft, fontWeight: '900' },
  carteraHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  countBadge: { alignSelf: 'flex-start', borderRadius: 8, backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  countBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  controls: { gap: spacing.sm },
  searchWrap: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, minHeight: 44, color: colors.text },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filter: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md },
  filterActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  filterTextActive: { color: colors.primary },
  clientList: { gap: spacing.sm },
  clientRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm },
  clientIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderRadius: 8 },
  clientCopy: { flex: 1, gap: 3 },
  clientName: { color: colors.text, fontWeight: '900' },
  clientMeta: { color: colors.muted, fontSize: 12 },
  removeButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#FED0C0', borderRadius: 8, paddingHorizontal: spacing.sm, backgroundColor: '#FFF7F3' },
  removeText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  empty: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.38)', padding: spacing.lg },
  confirmDialog: { width: '100%', maxWidth: 420, gap: spacing.md, backgroundColor: colors.surface, borderRadius: 8, padding: spacing.lg, ...shadows.card },
  confirmTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  confirmCopy: { color: colors.muted, lineHeight: 21 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
  cancelButton: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md },
  cancelText: { color: colors.muted, fontWeight: '900' },
  confirmRemoveButton: { minHeight: 40, justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primary, paddingHorizontal: spacing.md },
  confirmRemoveText: { color: '#FFFFFF', fontWeight: '900' },
});
