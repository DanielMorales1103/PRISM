import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Banknote, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, FilePlus2, ReceiptText, Search } from 'lucide-react-native';
import type { Cycle, Doctor, Institution, Pharmacy, Product, UserProfile } from '@prism/shared';
import { SessionUser } from '../app/types';
import { api, InvoiceItem, ReturnReport } from '../services/api';
import { loadToken } from '../services/session';
import { colors, shadows, spacing } from '../theme/theme';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface BillingScreenProps { currentUser: SessionUser; view?: 'ledger' | 'invoicing'; }
type BillingClient = Doctor | Pharmacy | Institution;
type InvoiceDraft = { number: string; userId: string; cycleId: string; collectionCycleId: string; clientId: string; invoiceDate: string };
type PaymentDraft = { amount: string; paidAt: string; reference: string };
const emptyReturnLine = () => ({ productId: '', returnedQuantity: '', reason: '' });
const emptyInvoiceLine = () => ({ productId: '', quantity: '' });

const today = () => new Date().toISOString().slice(0, 10);
const emptyInvoice = (): InvoiceDraft => ({ number: '', userId: '', cycleId: '', collectionCycleId: '', clientId: '', invoiceDate: today() });
const emptyPayment = (): PaymentDraft => ({ amount: '', paidAt: today(), reference: '' });
const money = (value: number) => `Q ${value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const returnLineValue = (invoice: InvoiceItem, productId: string, quantity: number) => quantity * Number(invoice.items.find((line) => line.productId === productId)?.unitPrice ?? 0);
const pendingReturnValue = (invoice: InvoiceItem) => (invoice.returns ?? [])
  .filter((entry) => entry.status === 'pending')
  .flatMap((entry) => entry.items)
  .reduce((sum, item) => sum + returnLineValue(invoice, item.productId, item.returnedQuantity), 0);
const statusLabel = { paid: 'Pagada', partial: 'Pago parcial', pending: 'Pendiente' } as const;
const returnStatusLabel = { pending: 'En revisión', approved: 'Aprobada', rejected: 'Rechazada' } as const;

export function BillingScreen({ currentUser, view = 'ledger' }: BillingScreenProps) {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [cycleFilter, setCycleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<InvoiceDraft>(emptyInvoice());
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [payment, setPayment] = useState<PaymentDraft>(emptyPayment());
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceLines, setInvoiceLines] = useState([emptyInvoiceLine()]);
  const [returnReport, setReturnReport] = useState<ReturnReport | null>(null);
  const [returnFilter, setReturnFilter] = useState('');
  const [request, setRequest] = useState({ invoiceId: '', items: [emptyReturnLine()] });
  const [creditNote, setCreditNote] = useState({ returnId: '', appliedAt: today() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const canEdit = currentUser.role === 'admin' || currentUser.role === 'jefe' || currentUser.role === 'facturacion';
  const canRequestReturn = currentUser.role === 'visitador';

  const visitors = useMemo(() => users.filter((user) => user.role === 'visitador' && user.active), [users]);
  const selectedClient = clients.find((client) => client.id === draft.clientId);
  const invoiceTotalCents = invoiceLines.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId);
    const quantity = Number(line.quantity);
    return sum + (product && Number.isSafeInteger(quantity) && quantity > 0 ? Math.round((product.unitPrice ?? 100) * 100) * quantity : 0);
  }, 0);
  const availableClients = useMemo(() => clients.filter((client) => client.active && (!draft.userId || !client.assignedUserId || client.assignedUserId === draft.userId)), [clients, draft.userId]);
  const visibleInvoices = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return invoices.filter((invoice) => {
      const notes = invoice.returns ?? [];
      const matchesStatus = !returnFilter || notes.some((entry) => entry.status === returnFilter);
      const details = notes.flatMap((entry) => [entry.number, ...entry.items.map((item) => item.productName)]);
      return matchesStatus && [invoice.number, invoice.clientName, ...details].some((value) => value.toLocaleLowerCase('es').includes(term));
    });
  }, [invoices, search, returnFilter]);
  const totals = useMemo(() => invoices.reduce((result, invoice) => ({
    assigned: result.assigned + invoice.originalAmount,
    paid: result.paid + invoice.paidAmount,
    credited: result.credited + invoice.creditedAmount,
    balance: result.balance + invoice.balance,
  }), { assigned: 0, paid: 0, credited: 0, balance: 0 }), [invoices]);

  const load = async (nextUserId = userFilter, nextCycleId = cycleFilter) => {
    setLoading(true); setMessage(''); setError(false);
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      const [invoiceData, userData, clientData, catalogData, productData, reportData] = await Promise.all([
        api.getInvoices(token, { userId: nextUserId || undefined, cycleId: nextCycleId || undefined }),
        api.getUsers(), api.getClients(), api.getCatalogs(), api.getProducts(),
        api.getReturnReport(token, { userId: nextUserId || undefined, cycleId: nextCycleId || undefined }),
      ]);
      setInvoices(invoiceData); setUsers(userData); setClients([...clientData.doctors, ...clientData.pharmacies, ...clientData.institutions]); setCycles(catalogData.cycles);
      setProducts(productData);
      setReturnReport(reportData);
      setDraft((current) => ({
        ...current,
        userId: current.userId || userData.find((user) => user.role === 'visitador' && user.active)?.id || '',
        cycleId: current.cycleId || catalogData.cycles.find((cycle) => cycle.active)?.id || catalogData.cycles[0]?.id || '',
        collectionCycleId: current.collectionCycleId || catalogData.cycles.find((cycle) => cycle.active)?.id || catalogData.cycles[0]?.id || '',
      }));
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'No se pudo cargar la cartera.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const applyFilters = (nextUserId: string, nextCycleId: string) => {
    setUserFilter(nextUserId); setCycleFilter(nextCycleId); void load(nextUserId, nextCycleId);
  };

  const createInvoice = async () => {
    if (!draft.number.trim() || !draft.userId || !draft.cycleId || !draft.collectionCycleId || !selectedClient || !draft.invoiceDate || invoiceTotalCents <= 0 ||
      invoiceLines.some((line) => !line.productId || !Number.isSafeInteger(Number(line.quantity)) || Number(line.quantity) < 1) ||
      new Set(invoiceLines.map((line) => line.productId)).size !== invoiceLines.length) {
      setError(true); setMessage('Completa número, visitador, ciclos, cliente, fecha y monto de la factura.'); return;
    }
    setSaving(true); setMessage(''); setError(false);
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      await api.createInvoice(token, {
        number: draft.number.trim(), userId: draft.userId, cycleId: draft.cycleId, collectionCycleId: draft.collectionCycleId,
        clientType: selectedClient.type, clientId: selectedClient.id, clientName: selectedClient.name,
        invoiceDate: draft.invoiceDate,
        items: invoiceLines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
      });
      setInvoiceLines([emptyInvoiceLine()]);
      setDraft((current) => ({ ...emptyInvoice(), userId: current.userId, cycleId: current.cycleId, collectionCycleId: current.collectionCycleId }));
      await load(userFilter, cycleFilter); setConfirmation('Factura registrada y asignada a la cartera de cobro.');
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'No se pudo registrar la factura.'); }
    finally { setSaving(false); }
  };

  const savePayment = async () => {
    const invoice = invoices.find((item) => item.id === paymentInvoiceId);
    const amount = Number(payment.amount);
    if (!invoice || !payment.paidAt || amount <= 0 || amount > invoice.balance) { setError(true); setMessage('Ingresa un abono válido que no supere el saldo pendiente.'); return; }
    setSaving(true); setMessage(''); setError(false);
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      await api.addInvoicePayment(token, invoice.id, { amount, paidAt: payment.paidAt, reference: payment.reference.trim() || undefined });
      setPaymentInvoiceId(''); setPayment(emptyPayment()); await load(userFilter, cycleFilter); setConfirmation('Abono registrado. El KPI de cobros fue actualizado.');
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'No se pudo registrar el abono.'); }
    finally { setSaving(false); }
  };

  const saveReturn = async (invoice: InvoiceItem) => {
    const items = request.items.map((item) => ({ ...item, returnedQuantity: Number(item.returnedQuantity) }));
    const availableReturnAmount = Math.max(0, invoice.balance - pendingReturnValue(invoice));
    const requestedReturnAmount = items.reduce((sum, item) => sum + returnLineValue(invoice, item.productId, item.returnedQuantity), 0);
    const invalidItem = items.some((item) => {
      const sold = invoice.items.find((line) => line.productId === item.productId)?.quantity ?? 0;
      const alreadyRequested = (invoice.returns ?? [])
        .filter((entry) => entry.status !== 'rejected')
        .flatMap((entry) => entry.items)
        .filter((line) => line.productId === item.productId)
        .reduce((sum, line) => sum + line.returnedQuantity, 0);
      return !item.productId || !Number.isSafeInteger(item.returnedQuantity) || item.returnedQuantity < 1 || item.returnedQuantity > sold - alreadyRequested;
    });
    if (invalidItem || requestedReturnAmount <= 0 || requestedReturnAmount > availableReturnAmount + 0.001 || new Set(items.map((item) => item.productId)).size !== items.length) {
      setError(true);
      setMessage(`Ingresa productos distintos y cantidades válidas sin superar el saldo disponible de ${money(availableReturnAmount)}.`);
      return;
    }
    await saveReturnChange(async (token) => {
      const updated = await api.submitInvoiceReturn(token, invoice.id, { items });
      setRequest({ invoiceId: '', items: [emptyReturnLine()] });
      return updated;
    }, 'Nota de devolución enviada a revisión.');
  };

  const updateReturnLine = (index: number, changes: Partial<ReturnType<typeof emptyReturnLine>>) => {
    setRequest((current) => ({
      ...current, items: current.items.map((item, position) => position === index ? { ...item, ...changes } : item),
    }));
  };

  const reviewReturn = async (invoice: InvoiceItem, returnId: string, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected') {
      await saveReturnChange((token) => api.reviewInvoiceReturn(token, invoice.id, returnId, { decision }), 'Devolución rechazada.');
      return;
    }
    const entry = invoice.returns.find((item) => item.id === returnId);
    const amount = entry ? entry.items.reduce((sum, item) => sum + returnLineValue(invoice, item.productId, item.returnedQuantity), 0) : 0;
    if (!creditNote.appliedAt || amount < 0.01 || amount > invoice.balance) {
      setError(true);
      setMessage('El crédito calculado para esta devolución supera el saldo pendiente de la factura.');
      return;
    }
    await saveReturnChange(async (token) => {
      const updated = await api.reviewInvoiceReturn(token, invoice.id, returnId, { decision, appliedAt: creditNote.appliedAt });
      setCreditNote({ returnId: '', appliedAt: today() });
      return updated;
    }, 'Devolución aprobada y nota de crédito aplicada.');
  };

  const saveReturnChange = async (save: (token: string) => Promise<InvoiceItem>, successMessage: string) => {
    setSaving(true);
    setMessage('');
    setError(false);
    try {
      const token = await loadToken();
      if (!token) throw new Error('Sesión no disponible.');
      const updatedInvoice = await save(token);
      setInvoices((current) => current.map((item) => item.id === updatedInvoice.id ? updatedInvoice : item));
      setReturnReport(await api.getReturnReport(token, { userId: userFilter || undefined, cycleId: cycleFilter || undefined }));
      setConfirmation(successMessage);
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : 'No se pudo registrar la nota de devolución.');
    } finally {
      setSaving(false);
    }
  };

  return <><ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.heading}><View style={styles.headingIcon}><CircleDollarSign size={27} color={colors.primary} /></View><View><Text style={styles.title}>{view === 'invoicing' ? 'Facturación' : 'Ventas y cobros'}</Text><Text style={styles.subtitle}>{view === 'invoicing' ? 'Registra facturas y calcula los importes desde el catálogo.' : 'Cartera, abonos, devoluciones y cumplimiento por ciclo.'}</Text></View></View>

    {view === 'ledger' ? <View style={styles.metricGrid}>
      <Metric label="Monto asignado" value={money(totals.assigned)} icon={ReceiptText} />
      <Metric label="Cobrado" value={money(totals.paid)} icon={Banknote} success />
      <Metric label="Saldo pendiente" value={money(totals.balance)} icon={CalendarDays} />
      <Metric label="Notas de crédito" value={money(totals.credited)} icon={FilePlus2} />
    </View> : null}

    {view === 'ledger' ? <View style={styles.filterCard}>
      <View style={styles.searchBox}><Search size={19} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar factura, cliente, nota o producto" placeholderTextColor="#9CA3AF" style={styles.searchInput} /></View>
      <Selector title="Estado de devolución" value={returnFilter} onChange={setReturnFilter} options={[
        { id: '', label: 'Todas las facturas' },
        ...Object.entries(returnStatusLabel).map(([id, label]) => ({ id, label })),
      ]} />
      {!canRequestReturn ? <View style={styles.filterBlock}><Text style={styles.fieldLabel}>Visitador</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><Chip label="Todo el equipo" active={!userFilter} onPress={() => applyFilters('', cycleFilter)} />{visitors.map((visitor) => <Chip key={visitor.id} label={visitor.name} active={userFilter === visitor.id} onPress={() => applyFilters(visitor.id, cycleFilter)} />)}</ScrollView></View> : null}
      <View style={styles.filterBlock}><Text style={styles.fieldLabel}>Ciclo de venta o cobro</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><Chip label="Todos" active={!cycleFilter} onPress={() => applyFilters(userFilter, '')} />{cycles.map((cycle) => <Chip key={cycle.id} label={cycle.name} active={cycleFilter === cycle.id} onPress={() => applyFilters(userFilter, cycle.id)} />)}</ScrollView></View>
    </View> : null}

    {message ? <View style={[styles.notice, error && styles.noticeError]}><Text style={[styles.noticeText, error && styles.noticeErrorText]}>{message}</Text></View> : null}
    {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>Cargando cartera...</Text></View> : null}

    {!loading && canEdit && view === 'invoicing' ? <View style={styles.formCard}>
      <View style={styles.sectionHeading}><FilePlus2 size={22} color={colors.primary} /><View><Text style={styles.sectionTitle}>Registrar factura</Text><Text style={styles.muted}>La venta y el cobro pueden pertenecer a ciclos diferentes.</Text></View></View>
      <View style={styles.formGrid}>
        <Field label="Número de factura" value={draft.number} onChange={(number) => setDraft({ ...draft, number })} placeholder="Ej. FAC-1048" />
        <DateField label="Fecha de factura" value={draft.invoiceDate} onChange={(invoiceDate) => setDraft({ ...draft, invoiceDate })} />
      </View>
      <Selector title="Visitador responsable" options={visitors.map((visitor) => ({ id: visitor.id, label: visitor.name }))} value={draft.userId} onChange={(userId) => setDraft({ ...draft, userId, clientId: '' })} />
      <Selector title="Ciclo de la venta" options={cycles.map((cycle) => ({ id: cycle.id, label: cycle.name }))} value={draft.cycleId} onChange={(cycleId) => setDraft({ ...draft, cycleId })} />
      <Selector title="Ciclo asignado para cobro" options={cycles.map((cycle) => ({ id: cycle.id, label: cycle.name }))} value={draft.collectionCycleId} onChange={(collectionCycleId) => setDraft({ ...draft, collectionCycleId })} />
      <ClientPicker options={availableClients.map((client) => ({ id: client.id, label: client.name, meta: client.type === 'doctor' ? 'Médico' : client.type === 'pharmacy' ? 'Farmacia' : 'Institución' }))} value={draft.clientId} onChange={(clientId) => setDraft({ ...draft, clientId })} />
      <View style={styles.selector}><Text style={styles.sectionTitle}>Productos vendidos</Text>
        {invoiceLines.map((line, index) => {
          const selectedProduct = products.find((product) => product.id === line.productId);
          const quantity = Number(line.quantity) || 0;
          return <View key={index} style={styles.invoiceLine}>
            <Text style={styles.fieldLabel}>Producto {index + 1}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactChoices}>{products.filter((product) => product.active).map((product) => <Pressable key={product.id} onPress={() => setInvoiceLines((current) => current.map((item, position) => position === index ? { ...item, productId: product.id } : item))} style={[styles.compactChoice, line.productId === product.id && styles.choiceActive]}><Text style={[styles.choiceText, line.productId === product.id && styles.choiceTextActive]}>{product.name}</Text></Pressable>)}</ScrollView>
            <View style={styles.invoiceLineDetails}><View style={styles.quantityField}><Text style={styles.fieldLabel}>Unidades</Text><TextInput value={line.quantity} onChangeText={(quantity) => setInvoiceLines((current) => current.map((item, position) => position === index ? { ...item, quantity } : item))} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" style={styles.input} /></View>{selectedProduct ? <Text style={styles.lineSummary}>{money(selectedProduct.unitPrice ?? 100)} c/u · <Text style={styles.lineSummaryStrong}>{money((selectedProduct.unitPrice ?? 100) * quantity)}</Text></Text> : null}{invoiceLines.length > 1 ? <Pressable onPress={() => setInvoiceLines((current) => current.filter((_, position) => position !== index))} style={styles.lineRemove}><Text style={styles.outlineText}>Quitar</Text></Pressable> : null}</View>
          </View>;
        })}
        <Pressable style={styles.outlineButton} onPress={() => setInvoiceLines((current) => [...current, emptyInvoiceLine()])}><Text style={styles.outlineText}>Agregar producto</Text></Pressable>
      </View>
      <View style={styles.invoiceTotal}><Text style={styles.fieldLabel}>Total de la factura</Text><Text style={styles.invoiceTotalValue}>{money(invoiceTotalCents / 100)}</Text></View>
      <Pressable disabled={saving} onPress={() => { void createInvoice(); }} style={[styles.primaryButton, saving && styles.disabled]}><FilePlus2 size={18} color={colors.onPrimary} /><Text style={styles.primaryText}>{saving ? 'Guardando...' : 'Registrar factura'}</Text></Pressable>
    </View> : null}

    {!loading && view === 'ledger' ? <View style={styles.ledgerResults}>
    {returnReport ? <View style={styles.returnReport}>
      <View style={styles.returnHeader}><View><Text style={styles.sectionTitle}>Reporte de devoluciones</Text><Text style={styles.muted}>Seguimiento de unidades, solicitudes y notas de crédito.</Text></View><View style={styles.returnRate}><Text style={styles.returnRateValue}>{returnReport.returnRate}%</Text><Text style={styles.returnRateLabel}>tasa de devolución</Text></View></View>
      <View style={styles.returnMetrics}><ReturnMetric label="Unidades devueltas" value={`${returnReport.returnedUnits} / ${returnReport.soldUnits}`} note="devueltas / vendidas" /><ReturnMetric label="Créditos aplicados" value={money(returnReport.creditAmount)} note="notas de crédito" /><ReturnMetric label="Solicitudes" value={String(returnReport.pending)} note="en revisión" alert={returnReport.pending > 0} /></View>
      <View style={styles.returnStatuses}><Text style={styles.fieldLabel}>Estado de solicitudes</Text><View style={styles.statusPills}><View style={styles.statusPill}><Text style={styles.statusPillValue}>{returnReport.pending}</Text><Text style={styles.statusPillText}>En revisión</Text></View><View style={[styles.statusPill, styles.statusPillApproved]}><Text style={styles.statusPillValue}>{returnReport.approved}</Text><Text style={styles.statusPillText}>Aprobadas</Text></View><View style={styles.statusPill}><Text style={styles.statusPillValue}>{returnReport.rejected}</Text><Text style={styles.statusPillText}>Rechazadas</Text></View></View></View>
      {returnReport.untrackedInvoices > 0 ? <Text style={styles.noticeErrorText}>{returnReport.untrackedInvoices} facturas anteriores sin desglose de productos; no se incluyen en el denominador.</Text> : null}
      {returnReport.products.length ? <View style={styles.returnBreakdown}><Text style={styles.fieldLabel}>Por producto</Text>{returnReport.products.map((product) => <View key={product.productId} style={styles.returnProductRow}><View style={styles.returnProductTop}><Text style={styles.returnProductName}>{product.productName}</Text><Text style={styles.returnProductValue}>{product.returnedUnits}/{product.soldUnits} · {product.returnRate}%</Text></View><View style={styles.returnTrack}><View style={[styles.returnFill, { width: `${Math.min(100, product.returnRate)}%` as `${number}%` }]} /></View></View>)}</View> : null}
      {returnReport.recurring.length > 0 ? <View style={styles.returnBreakdown}><Text style={styles.fieldLabel}>Devoluciones recurrentes</Text>{returnReport.recurring.map((pair) => <View key={`${pair.clientId}-${pair.productId}`} style={styles.returnInfoRow}><Text style={styles.returnInfoTitle}>{pair.clientName} · {pair.productName}</Text><Text style={styles.returnInfoValue}>{pair.count}</Text></View>)}</View> : null}
      <View style={styles.returnColumns}>{returnReport.byVisitor.length > 0 && !canRequestReturn ? <View style={styles.returnColumn}><Text style={styles.fieldLabel}>Por visitador</Text>{returnReport.byVisitor.map((item) => <View key={item.userId} style={styles.returnInfoRow}><Text style={styles.returnInfoTitle}>{users.find((user) => user.id === item.userId)?.name ?? 'Visitador'}</Text><Text style={styles.returnInfoValue}>{item.returnedUnits}/{item.soldUnits} · {item.returnRate}%</Text></View>)}</View> : null}{returnReport.byCycle.length > 0 ? <View style={styles.returnColumn}><Text style={styles.fieldLabel}>Por ciclo de venta</Text>{returnReport.byCycle.map((item) => <View key={item.cycleId} style={styles.returnInfoRow}><Text style={styles.returnInfoTitle}>{cycles.find((cycle) => cycle.id === item.cycleId)?.name ?? 'Ciclo'}</Text><Text style={styles.returnInfoValue}>{item.returnedUnits}/{item.soldUnits} · {item.returnRate}%</Text></View>)}</View> : null}</View>
    </View> : null}
    {!loading && view === 'ledger' ? <View style={styles.listCard}><View style={styles.sectionHeading}><ReceiptText size={22} color={colors.primary} /><View><Text style={styles.sectionTitle}>Cartera registrada</Text><Text style={styles.muted}>{visibleInvoices.length} facturas en la consulta actual</Text></View></View>
      {visibleInvoices.length === 0 ? <View style={styles.empty}><ReceiptText size={30} color={colors.muted} /><Text style={styles.emptyTitle}>Sin facturas para estos filtros</Text><Text style={styles.muted}>Registra una factura o cambia el ciclo seleccionado.</Text></View> : visibleInvoices.map((invoice) => {
        const visitor = users.find((user) => user.id === invoice.userId);
        const saleCycle = cycles.find((cycle) => cycle.id === invoice.cycleId);
        const collectionCycle = cycles.find((cycle) => cycle.id === invoice.collectionCycleId);
        const paymentOpen = paymentInvoiceId === invoice.id;
        return <View key={invoice.id} style={styles.invoiceRow}>
          <View style={styles.invoiceMain}><View style={styles.invoiceTop}><View><Text style={styles.invoiceNumber}>{invoice.number}</Text><Text style={styles.clientName}>{invoice.clientName}</Text></View><View style={[styles.status, invoice.status === 'paid' && styles.statusPaid, invoice.status === 'partial' && styles.statusPartial]}><Text style={[styles.statusText, invoice.status === 'paid' && styles.statusTextPaid]}>{invoice.creditedAmount > 0 ? (invoice.balance === 0 ? 'Saldada' : 'Saldo parcial') : statusLabel[invoice.status]}</Text></View></View>
            <View style={styles.invoiceMeta}><Text style={styles.metaText}>{visitor?.name ?? 'Visitador no disponible'}</Text><Text style={styles.metaText}>Venta: {saleCycle?.name ?? '-'}</Text><Text style={styles.metaText}>Cobro: {collectionCycle?.name ?? saleCycle?.name ?? '-'}</Text><Text style={styles.metaText}>{String(invoice.invoiceDate).slice(0, 10)}</Text></View>
          </View>
          <View style={styles.amounts}><Amount label="Original" value={invoice.originalAmount} /><Amount label="Pagado" value={invoice.paidAmount} success /><Amount label="Crédito" value={invoice.creditedAmount} /><Amount label="Saldo" value={invoice.balance} strong /></View>
          <View style={styles.selector}><Text style={styles.fieldLabel}>Productos facturados</Text>{invoice.items.length ? invoice.items.map((line) => <Text key={line.productId} style={styles.metaText}>{line.productName} · {line.quantity} unidades{line.unitPrice != null ? ` × ${money(line.unitPrice)} = ${money(line.quantity * line.unitPrice)}` : ''}</Text>) : <Text style={styles.metaText}>Factura anterior sin desglose de productos.</Text>}</View>
          {canEdit && invoice.balance > 0 ? <Pressable onPress={() => { setPaymentInvoiceId(paymentOpen ? '' : invoice.id); setPayment(emptyPayment()); }} style={styles.outlineButton}><Banknote size={17} color={colors.primary} /><Text style={styles.outlineText}>{paymentOpen ? 'Cerrar abono' : 'Registrar abono'}</Text></Pressable> : invoice.status === 'paid' ? <View style={styles.paidIndicator}><CheckCircle2 size={18} color={colors.success} /><Text style={styles.paidText}>Cartera saldada</Text></View> : null}
          {paymentOpen ? <View style={styles.paymentBox}><Field label="Monto del abono" value={payment.amount} onChange={(amount) => setPayment({ ...payment, amount })} placeholder={`Máximo ${money(invoice.balance)}`} numeric /><DateField label="Fecha de pago" value={payment.paidAt} onChange={(paidAt) => setPayment({ ...payment, paidAt })} /><Field label="Referencia" value={payment.reference} onChange={(reference) => setPayment({ ...payment, reference })} placeholder="Opcional" /><Pressable disabled={saving} onPress={() => { void savePayment(); }} style={[styles.primaryButton, saving && styles.disabled]}><Banknote size={18} color={colors.onPrimary} /><Text style={styles.primaryText}>{saving ? 'Guardando...' : 'Guardar abono'}</Text></Pressable></View> : null}
          {invoice.creditNotes.length > 0 ? <View>
            <Text style={styles.fieldLabel}>Notas de crédito aplicadas</Text>
            {invoice.creditNotes.map((note) => <Text key={note.id} style={styles.metaText}>
              {note.number} · {note.appliedAt.slice(0, 10)} · {money(note.amount)}
            </Text>)}
          </View> : null}
          {(invoice.returns ?? []).filter((entry) => !returnFilter || entry.status === returnFilter).map((entry) => <View key={entry.id} style={styles.selector}>
            <Text style={styles.fieldLabel}>Devolución {entry.number} · {returnStatusLabel[entry.status]}</Text>
            <Text style={styles.metaText}>{entry.requestedAt.slice(0, 10)} · {users.find((user) => user.id === entry.requestedBy)?.name ?? visitor?.name ?? entry.requestedBy}</Text>
            {entry.items.map((item) => <Text key={item.productId} style={styles.metaText}>
              {item.productName} · {item.returnedQuantity} de {item.soldQuantity} unidades{item.reason ? ` · ${item.reason}` : ''}
            </Text>)}
            {entry.reviewedAt ? <Text style={styles.metaText}>Revisada el {entry.reviewedAt.slice(0, 10)} por {users.find((user) => user.id === entry.reviewedBy)?.name ?? entry.reviewedBy}</Text> : null}
            {invoice.creditNotes.filter((note) => note.returnId === entry.id).map((note) => <Text key={note.id} style={styles.creditNoteApplied}>Crédito {note.number} aplicado · {money(note.amount)}</Text>)}
            {canEdit && entry.status === 'pending' ? <View style={styles.selector}>
              {invoice.balance > 0 ? <Pressable disabled={saving} style={styles.outlineButton} onPress={() => {
                setCreditNote({ returnId: creditNote.returnId === entry.id ? '' : entry.id, appliedAt: today() });
              }}><Text style={styles.outlineText}>{creditNote.returnId === entry.id ? 'Cerrar revisión' : 'Aprobar y aplicar crédito'}</Text></Pressable> :
                <Text style={styles.metaText}>Factura sin saldo pendiente.</Text>}
              <Pressable disabled={saving} style={styles.outlineButton} onPress={() => { void reviewReturn(invoice, entry.id, 'rejected'); }}>
                <Text style={styles.outlineText}>Rechazar devolución</Text>
              </Pressable>
            </View> : null}
            {canEdit && entry.status === 'pending' && creditNote.returnId === entry.id && invoice.balance > 0 ? <View style={styles.paymentBox}>
              <Field label="Fecha de aplicación" value={creditNote.appliedAt} onChange={(appliedAt) => setCreditNote({ ...creditNote, appliedAt })} placeholder="AAAA-MM-DD" />
              <Text style={styles.creditAmount}>Crédito calculado: {money(entry.items.reduce((sum, item) => sum + returnLineValue(invoice, item.productId, item.returnedQuantity), 0))}</Text>
              <Pressable disabled={saving} onPress={() => { void reviewReturn(invoice, entry.id, 'approved'); }} style={[styles.primaryButton, saving && styles.disabled]}>
                <Text style={styles.primaryText}>Confirmar aprobación y crédito</Text>
              </Pressable>
            </View> : null}
          </View>)}
          {canRequestReturn && invoice.items.length > 0 && !(invoice.returns ?? []).some((entry) => entry.status === 'pending') ? <Pressable disabled={saving} onPress={() => {
            setRequest({ invoiceId: request.invoiceId === invoice.id ? '' : invoice.id, items: [emptyReturnLine()] });
          }} style={styles.outlineButton}>
            <FilePlus2 size={17} color={colors.primary} />
            <Text style={styles.outlineText}>{request.invoiceId === invoice.id ? 'Cerrar solicitud' : 'Registrar nota de devolución'}</Text>
          </Pressable> : null}
          {canRequestReturn && invoice.items.length > 0 && request.invoiceId === invoice.id ? <View style={styles.returnForm}>
            <Text style={styles.returnBalance}>Saldo disponible para devolución: {money(Math.max(0, invoice.balance - pendingReturnValue(invoice)))}</Text>
            {request.items.map((item, index) => {
              const sold = invoice.items.find((line) => line.productId === item.productId)?.quantity ?? 0;
              const alreadyRequested = (invoice.returns ?? []).filter((entry) => entry.status !== 'rejected').flatMap((entry) => entry.items).filter((line) => line.productId === item.productId).reduce((sum, line) => sum + line.returnedQuantity, 0);
              const unitPrice = Number(invoice.items.find((line) => line.productId === item.productId)?.unitPrice ?? 0);
              const otherDraftAmount = request.items.reduce((sum, line, position) => position === index ? sum : sum + returnLineValue(invoice, line.productId, Number(line.returnedQuantity) || 0), 0);
              const amountAvailable = Math.max(0, invoice.balance - pendingReturnValue(invoice) - otherDraftAmount);
              const available = Math.min(Math.max(0, sold - alreadyRequested), unitPrice > 0 ? Math.floor((amountAvailable + 0.001) / unitPrice) : 0);
              return <View key={index} style={styles.returnLine}>
              <Selector title="Producto" value={item.productId} options={invoice.items.filter((line) => !request.items.some((selected, position) => position !== index && selected.productId === line.productId)).map((line) => ({ id: line.productId, label: line.productName }))}
                onChange={(productId) => updateReturnLine(index, { productId, returnedQuantity: '' })} />
              <Text style={styles.returnAvailability}>{item.productId ? `${available} unidades disponibles para devolver · ${money(unitPrice)} cada una` : 'Selecciona un producto para consultar las unidades disponibles'}</Text>
              <View style={styles.returnFields}>
                <Field label="Unidades devueltas" value={item.returnedQuantity} onChange={(returnedQuantity) => {
                  const digits = returnedQuantity.replace(/\D/g, '');
                  updateReturnLine(index, { returnedQuantity: digits && Number(digits) > available ? String(available) : digits });
                }} placeholder={item.productId ? `Máximo ${available}` : '0'} numeric />
                <Field label="Motivo" value={item.reason} onChange={(reason) => updateReturnLine(index, { reason })} placeholder="Opcional" />
              </View>
              {request.items.length > 1 ? <Pressable style={styles.outlineButton} onPress={() => setRequest({ ...request, items: request.items.filter((_, position) => position !== index) })}>
                <Text style={styles.outlineText}>Quitar producto</Text>
              </Pressable> : null}
            </View>;})}
            {request.items.length < invoice.items.length ? <Pressable style={styles.outlineButton} onPress={() => setRequest({ ...request, items: [...request.items, emptyReturnLine()] })}>
              <Text style={styles.outlineText}>Agregar producto</Text>
            </Pressable> : null}
            <Pressable disabled={saving} onPress={() => { void saveReturn(invoice); }} style={[styles.primaryButton, saving && styles.disabled]}>
              <Text style={styles.primaryText}>Enviar a revisión</Text>
            </Pressable>
          </View> : null}
        </View>;
      })}
    </View> : null}
    </View> : null}
  </ScrollView><ConfirmationModal visible={Boolean(confirmation)} message={confirmation} onClose={() => setConfirmation('')} /></>;
}

function Metric({ label, value, icon: Icon, success = false }: { label: string; value: string; icon: typeof ReceiptText; success?: boolean }) { return <View style={styles.metric}><View style={styles.metricIcon}><Icon size={21} color={success ? colors.success : colors.primary} /></View><View><Text style={styles.muted}>{label}</Text><Text style={[styles.metricValue, success && styles.successText]}>{value}</Text></View></View>; }
function ReturnMetric({ label, value, note, alert = false }: { label: string; value: string; note: string; alert?: boolean }) { return <View style={[styles.returnMetric, alert && styles.returnMetricAlert]}><Text style={styles.returnMetricLabel}>{label}</Text><Text style={[styles.returnMetricValue, alert && styles.returnMetricValueAlert]}>{value}</Text><Text style={styles.returnMetricNote}>{note}</Text></View>; }
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>; }
function Field({ label, value, onChange, placeholder, numeric = false, compact = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; numeric?: boolean; compact?: boolean }) { return <View style={[styles.field, compact && styles.fieldCompact]}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9CA3AF" keyboardType={numeric ? 'decimal-pad' : 'default'} style={styles.input} /></View>; }
function ClientPicker({ options, value, onChange }: { options: Array<{ id: string; label: string; meta: string }>; value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  const matches = options.filter((option) => option.label.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))).slice(0, 30);
  return <View style={styles.selector}><Text style={styles.fieldLabel}>Cliente</Text><View style={styles.pickerInput}><Search size={18} color={colors.muted} /><TextInput value={open ? query : selected?.label ?? ''} onFocus={() => { setQuery(''); setOpen(true); }} onChangeText={(text) => { setQuery(text); setOpen(true); }} placeholder="Buscar cliente por nombre" placeholderTextColor="#9CA3AF" style={styles.pickerTextInput} /><Pressable accessibilityLabel={open ? 'Cerrar clientes' : 'Mostrar clientes'} onPress={() => { setQuery(''); setOpen((current) => !current); }}><ChevronDown size={19} color={colors.muted} /></Pressable></View>{open ? <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={styles.pickerResults}>{matches.length ? matches.map((option) => <Pressable key={option.id} onPress={() => { onChange(option.id); setOpen(false); setQuery(''); }} style={[styles.pickerResult, option.id === value && styles.pickerResultSelected]}><Text style={styles.pickerResultName}>{option.label}</Text><Text style={styles.choiceMeta}>{option.meta}</Text></Pressable>) : <Text style={styles.pickerEmpty}>No hay clientes con ese nombre.</Text>}</ScrollView> : null}</View>;
}
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => { const date = new Date(`${value}T12:00:00`); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + days) / 7) * 7 }, (_, index) => index - firstDay + 1);
  return <View style={[styles.field, open && styles.dateFieldOpen]}><Text style={styles.fieldLabel}>{label}</Text><Pressable onPress={() => { const date = new Date(`${value}T12:00:00`); if (!Number.isNaN(date.getTime())) setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setOpen((current) => !current); }} style={styles.dateTrigger}><CalendarDays size={18} color={colors.primary} /><Text style={styles.dateTriggerText}>{value}</Text></Pressable>{open ? <View style={styles.calendar}><View style={styles.calendarHeader}><Pressable accessibilityLabel="Mes anterior" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.calendarNav}><ChevronLeft size={18} color={colors.text} /></Pressable><Text style={styles.calendarTitle}>{month.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}</Text><Pressable accessibilityLabel="Mes siguiente" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.calendarNav}><ChevronRight size={18} color={colors.text} /></Pressable></View><View style={styles.calendarGrid}>{['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => <Text key={index} style={styles.calendarWeekday}>{day}</Text>)}{cells.map((day, index) => { const valid = day > 0 && day <= days; const date = valid ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''; return <Pressable key={index} disabled={!valid} onPress={() => { onChange(date); setOpen(false); }} style={[styles.calendarDay, date === value && styles.calendarDaySelected]}><Text style={[styles.calendarDayText, date === value && styles.calendarDayTextSelected]}>{valid ? day : ''}</Text></Pressable>; })}</View></View> : null}</View>;
}
function Selector({ title, options, value, onChange }: { title: string; options: Array<{ id: string; label: string; meta?: string }>; value: string; onChange: (id: string) => void }) { return <View style={styles.selector}><Text style={styles.fieldLabel}>{title}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.choiceScroller} contentContainerStyle={styles.chips}>{options.map((option) => <Pressable key={option.id} onPress={() => onChange(option.id)} style={[styles.choice, value === option.id && styles.choiceActive]}><Text style={[styles.choiceText, value === option.id && styles.choiceTextActive]}>{option.label}</Text>{option.meta ? <Text style={[styles.choiceMeta, value === option.id && styles.choiceMetaActive]}>{option.meta}</Text> : null}</Pressable>)}</ScrollView></View>; }
function Amount({ label, value, success = false, strong = false }: { label: string; value: number; success?: boolean; strong?: boolean }) { return <View><Text style={styles.amountLabel}>{label}</Text><Text style={[styles.amountValue, success && styles.successText, strong && styles.amountStrong]}>{money(value)}</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.xl, paddingBottom: 64, gap: spacing.lg },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, headingIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primarySoft }, title: { color: colors.text, fontSize: 28, fontWeight: '900' }, subtitle: { color: colors.muted, marginTop: 3 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, metric: { minHeight: 108, flexGrow: 1, flexBasis: 220, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg, ...shadows.card }, metricIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primarySoft }, metricValue: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 4 }, successText: { color: colors.success }, muted: { color: colors.muted, fontSize: 13 },
  filterCard: { gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg }, searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md }, searchInput: { flex: 1, color: colors.text }, filterBlock: { gap: spacing.sm }, chips: { gap: spacing.sm }, chip: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: colors.surface }, chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, chipText: { color: colors.muted, fontWeight: '800' }, chipTextActive: { color: colors.primary },
  notice: { borderWidth: 1, borderColor: '#BFE5DE', borderRadius: 8, backgroundColor: '#ECF9F6', padding: spacing.md }, noticeError: { borderColor: '#FFD2C2', backgroundColor: colors.primarySoft }, noticeText: { color: colors.success, fontWeight: '800' }, noticeErrorText: { color: colors.primaryDark }, loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  formCard: { gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg, overflow: 'visible', ...shadows.card }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' }, formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, zIndex: 2 }, field: { flexGrow: 1, flexBasis: 210, gap: 6 }, fieldCompact: { flexGrow: 0, flexBasis: 'auto' }, dateFieldOpen: { zIndex: 3 }, fieldLabel: { color: colors.text, fontSize: 12, fontWeight: '900' }, input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, paddingHorizontal: spacing.md, backgroundColor: colors.surface }, selector: { gap: spacing.sm }, choiceScroller: { flexGrow: 0 }, choice: { minWidth: 150, minHeight: 54, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: colors.surface }, choiceActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, choiceText: { color: colors.text, fontWeight: '900' }, choiceTextActive: { color: colors.primary }, choiceMeta: { color: colors.muted, fontSize: 11, marginTop: 2 }, choiceMetaActive: { color: colors.primaryDark },
  pickerInput: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: colors.surface }, pickerTextInput: { flex: 1, minWidth: 0, color: colors.text }, pickerResults: { maxHeight: 240, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface }, pickerResult: { minHeight: 50, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.md }, pickerResultSelected: { backgroundColor: colors.primarySoft }, pickerResultName: { color: colors.text, fontWeight: '800' }, pickerEmpty: { color: colors.muted, padding: spacing.md },
  invoiceLine: { gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: '#FAFBFC', padding: spacing.sm }, compactChoices: { gap: spacing.xs }, compactChoice: { minWidth: 118, minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing.sm, backgroundColor: colors.surface }, invoiceLineDetails: { minHeight: 48, flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: spacing.md }, quantityField: { width: 130, gap: 4 }, lineSummary: { color: colors.muted, fontSize: 12, paddingBottom: spacing.sm }, lineSummaryStrong: { color: colors.text, fontWeight: '900' }, lineRemove: { minHeight: 38, justifyContent: 'center', paddingHorizontal: spacing.sm },
  dateTrigger: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, paddingHorizontal: spacing.md }, dateTriggerText: { color: colors.text }, calendar: { position: 'absolute', top: 70, left: 0, width: '100%', maxWidth: 340, zIndex: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.sm, ...shadows.card, elevation: 10 }, calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, calendarNav: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }, calendarTitle: { color: colors.text, fontWeight: '800', textTransform: 'capitalize' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }, calendarWeekday: { width: '14.28%', textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', paddingVertical: 7 }, calendarDay: { width: '14.28%', height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 }, calendarDaySelected: { backgroundColor: colors.primary }, calendarDayText: { color: colors.text }, calendarDayTextSelected: { color: colors.onPrimary, fontWeight: '900' },
  primaryButton: { minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: 8, backgroundColor: colors.primary, paddingHorizontal: spacing.lg }, primaryText: { color: colors.onPrimary, fontWeight: '900' }, disabled: { opacity: 0.55 },
  invoiceTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }, invoiceTotalValue: { color: colors.primary, fontSize: 21, fontWeight: '900' },
  returnReport: { gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg, ...shadows.card }, returnHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }, returnRate: { minWidth: 116, alignItems: 'flex-end', borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: spacing.md }, returnRateValue: { color: colors.primary, fontSize: 28, fontWeight: '900' }, returnRateLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', textAlign: 'right' }, returnMetrics: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }, returnMetric: { flexGrow: 1, flexBasis: 180, gap: 3, borderRightWidth: 1, borderRightColor: colors.border, paddingVertical: spacing.md, paddingRight: spacing.md }, returnMetricAlert: { backgroundColor: '#FFF8F4', paddingLeft: spacing.md }, returnMetricLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' }, returnMetricValue: { color: colors.text, fontSize: 20, fontWeight: '900' }, returnMetricValueAlert: { color: colors.primary }, returnMetricNote: { color: colors.muted, fontSize: 11 }, returnStatuses: { gap: spacing.sm }, statusPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, statusPill: { minWidth: 130, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: '#F8F9FA', paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, statusPillApproved: { backgroundColor: '#ECF9F6', borderColor: '#BFE5DE' }, statusPillValue: { color: colors.text, fontSize: 18, fontWeight: '900' }, statusPillText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, returnBreakdown: { gap: spacing.sm }, returnProductRow: { gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm }, returnProductTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, returnProductName: { flex: 1, color: colors.text, fontWeight: '800' }, returnProductValue: { color: colors.muted, fontSize: 12, fontWeight: '800' }, returnTrack: { height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: '#ECEDEF' }, returnFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary }, returnColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, returnColumn: { flexGrow: 1, flexBasis: 260, gap: spacing.xs }, returnInfoRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, returnInfoTitle: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '700' }, returnInfoValue: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  ledgerResults: { flexDirection: 'column-reverse', gap: spacing.lg }, listCard: { gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg, ...shadows.card }, empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, invoiceRow: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.lg }, invoiceMain: { gap: spacing.sm }, invoiceTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }, invoiceNumber: { color: colors.primary, fontSize: 13, fontWeight: '900' }, clientName: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 }, invoiceMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, metaText: { color: colors.muted, fontSize: 12 }, creditNoteApplied: { color: colors.muted, fontSize: 12, fontWeight: '900' }, status: { borderRadius: 6, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 6 }, statusPaid: { backgroundColor: '#E1F4EF' }, statusPartial: { backgroundColor: '#FFF4DB' }, statusText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900' }, statusTextPaid: { color: colors.success }, amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl }, amountLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, amountValue: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 3 }, amountStrong: { color: colors.primary, fontSize: 17, fontWeight: '900' }, outlineButton: { minHeight: 42, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.md }, outlineText: { color: colors.primary, fontWeight: '900' }, paidIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, paidText: { color: colors.success, fontWeight: '900' }, paymentBox: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.md, borderRadius: 8, backgroundColor: '#F7F8FA', padding: spacing.md }, creditAmount: { alignSelf: 'center', color: colors.primaryDark, fontSize: 14, fontWeight: '900' }, returnForm: { gap: spacing.md, borderRadius: 8, backgroundColor: '#F7F8FA', padding: spacing.md }, returnBalance: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' }, returnLine: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }, returnAvailability: { color: colors.muted, fontSize: 12, fontWeight: '700' }, returnFields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
