import type { Product } from '@prism/shared';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Minus, Plus, Search, XCircle } from 'lucide-react-native';
import { api } from '../services/api';
import { colors, shadows, spacing } from '../theme/theme';

export type VisitStatus = 'purchase_made' | 'follow_up_pending' | 'not_interested';

export interface RequestedProductDraft {
  productId?: string;
  productName: string;
  line: string;
  quantity: number;
}

export interface VisitResultDraft {
  visitStatus: VisitStatus;
  requestedProducts: RequestedProductDraft[];
  probablePurchaseDate?: string;
  competitionDetected?: string;
  interestLevel: number;
}

interface VisitResultScreenProps {
  onContinue: (result: VisitResultDraft) => void;
}

const visitStatuses = [
  { id: 'purchase_made', label: 'COMPRA REALIZADA', icon: CheckCircle2 },
  { id: 'follow_up_pending', label: 'SEGUIMIENTO PENDIENTE', icon: Clock },
  { id: 'not_interested', label: 'NO INTERESADO', icon: XCircle },
] as const;

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function VisitResultScreen({ onContinue }: VisitResultScreenProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [visitStatus, setVisitStatus] = useState<VisitStatus | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [probablePurchaseDate, setProbablePurchaseDate] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [competitionDetected, setCompetitionDetected] = useState('');
  const [interestLevel, setInterestLevel] = useState(3);

  useEffect(() => {
    let mounted = true;

    void api.getProducts().then((nextProducts) => {
      if (mounted) {
        setProducts(nextProducts.filter((product) => product.active));
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const requestedProducts = useMemo(
    () =>
      products.map((product) => ({
        productId: product.id,
        productName: product.name,
        line: product.line,
        quantity: quantities[product.id] ?? 0,
      })),
    [products, quantities],
  );

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.max((current[productId] ?? 0) + delta, 0),
    }));
  };

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = Array.from({ length: firstDay }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));

    return [...blanks, ...days];
  }, [visibleMonth]);

  const displayPurchaseDate = probablePurchaseDate ? formatDisplayDate(probablePurchaseDate) : '';

  const changeMonth = (delta: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const selectDate = (date: Date) => {
    setProbablePurchaseDate(formatIsoDate(date));
    setCalendarOpen(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Resultado de la Visita</Text>
        <Text style={styles.subtitle}>Registra la efectividad de la presentacion medica.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>ESTADO DE LA VISITA</Text>
        <View style={styles.statusRow}>
          {visitStatuses.map((status) => {
            const Icon = status.icon;
            const active = visitStatus === status.id;
            return (
              <Pressable
                key={status.id}
                onPress={() => setVisitStatus(status.id)}
                style={({ pressed }) => [styles.statusCard, active && styles.statusCardActive, pressed && styles.pressed]}
              >
                <View style={[styles.statusIcon, active && styles.statusIconActive]}>
                  <Icon size={34} color={active ? colors.onPrimary : '#BEBEBE'} />
                </View>
                <Text style={[styles.statusText, active && styles.statusTextActive]}>{status.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.formLabel}>Cantidades Solicitadas</Text>
        <View style={styles.quantityPanel}>
          {products.map((product) => (
            <View key={product.id} style={styles.quantityCard}>
              <View>
                <Text style={styles.quantityProduct}>{product.name}</Text>
                <Text style={styles.quantityLine}>{product.line}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => updateQuantity(product.id, -1)} style={styles.stepperButton}>
                  <Minus size={20} color="#9A9A9A" />
                </Pressable>
                <Text style={styles.stepperValue}>{quantities[product.id] ?? 0}</Text>
                <Pressable onPress={() => updateQuantity(product.id, 1)} style={[styles.stepperButton, styles.stepperButtonActive]}>
                  <Plus size={20} color={colors.onPrimary} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldGroup}>
            <Text style={styles.formLabel}>Fecha Probable de Compra</Text>
            <Pressable onPress={() => setCalendarOpen((current) => !current)} style={styles.inputWrap}>
              <Calendar size={20} color="#8D8D8D" />
              <Text style={[styles.dateText, !displayPurchaseDate && styles.datePlaceholder]}>{displayPurchaseDate || 'dd/mm/aaaa'}</Text>
            </Pressable>

            {calendarOpen && (
              <View style={styles.calendarDropdown}>
                <View style={styles.calendarHeader}>
                  <Pressable onPress={() => changeMonth(-1)} style={styles.calendarNavButton}>
                    <ChevronLeft size={20} color={colors.text} />
                  </Pressable>
                  <Text style={styles.calendarTitle}>
                    {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                  </Text>
                  <Pressable onPress={() => changeMonth(1)} style={styles.calendarNavButton}>
                    <ChevronRight size={20} color={colors.text} />
                  </Pressable>
                </View>

                <View style={styles.weekGrid}>
                  {weekDays.map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.weekDay}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.dayGrid}>
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return <View key={`blank-${index}`} style={styles.dayButton} />;
                    }

                    const isoDate = formatIsoDate(date);
                    const selected = probablePurchaseDate === isoDate;

                    return (
                      <Pressable
                        key={isoDate}
                        onPress={() => selectDate(date)}
                        style={({ pressed }) => [styles.dayButton, selected && styles.dayButtonSelected, pressed && styles.pressed]}
                      >
                        <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{date.getDate()}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.formLabel}>Competencia Detectada</Text>
            <View style={styles.inputWrap}>
              <Search size={20} color="#B0B0B0" />
              <TextInput
                value={competitionDetected}
                onChangeText={setCompetitionDetected}
                placeholder="Marca de la competencia..."
                placeholderTextColor="#777777"
                style={styles.input}
              />
            </View>
          </View>
        </View>

        <View style={styles.interestBlock}>
          <Text style={styles.formLabel}>Nivel de Interes Percibido</Text>
          <View style={styles.interestBar}>
            {[1, 2, 3, 4, 5].map((level) => (
              <Pressable
                key={level}
                onPress={() => setInterestLevel(level)}
                style={[styles.interestButton, interestLevel === level && styles.interestButtonActive]}
              >
                <Text style={[styles.interestText, interestLevel === level && styles.interestTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.interestLabels}>
            <Text style={styles.interestLabel}>BAJO</Text>
            <Text style={styles.interestLabel}>CRITICO</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            if (!visitStatus) {
              Alert.alert('Selecciona un estado', 'Elige el resultado de la visita para continuar.');
              return;
            }

            onContinue({
              visitStatus,
              requestedProducts,
              probablePurchaseDate,
              competitionDetected,
              interestLevel,
            });
          }}
          style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
        >
          <Text style={styles.continueText}>CONTINUAR A COMENTARIOS</Text>
          <ChevronRight size={24} color={colors.onPrimary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    minHeight: 160,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    color: '#050505',
    fontSize: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: '#777777',
    fontSize: 19,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingVertical: 64,
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    color: '#B0B0B0',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 5,
    marginBottom: spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: 60,
    flexWrap: 'wrap',
  },
  statusCard: {
    flex: 1,
    minWidth: 240,
    minHeight: 180,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  statusCardActive: {
    backgroundColor: '#050505',
  },
  statusIcon: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconActive: {
    backgroundColor: colors.primary,
  },
  statusText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  statusTextActive: {
    color: colors.surface,
  },
  formLabel: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  quantityPanel: {
    borderRadius: 42,
    backgroundColor: '#F0F0F0',
    padding: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    marginBottom: 46,
  },
  quantityCard: {
    flexGrow: 1,
    flexBasis: 430,
    minHeight: 118,
    borderRadius: 24,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadows.card,
  },
  quantityProduct: {
    color: '#050505',
    fontSize: 20,
    fontWeight: '900',
  },
  quantityLine: {
    color: '#9A9A9A',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  stepper: {
    minWidth: 172,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#F3F3F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
  },
  stepperButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonActive: {
    backgroundColor: colors.primary,
  },
  stepperValue: {
    color: '#050505',
    fontSize: 19,
    fontWeight: '900',
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
    zIndex: 30,
    elevation: 30,
  },
  fieldGroup: {
    flex: 1,
    minWidth: 300,
    position: 'relative',
    zIndex: 30,
    elevation: 30,
  },
  inputWrap: {
    minHeight: 82,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  dateText: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  datePlaceholder: {
    color: '#6E6E6E',
  },
  calendarDropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 112,
    zIndex: 100,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.card,
    elevation: 100,
  },
  calendarHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  calendarNavButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  weekGrid: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekDay: {
    width: `${100 / 7}%`,
    color: '#9A9A9A',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  dayTextSelected: {
    color: colors.onPrimary,
  },
  interestBlock: {
    width: '48%',
    minWidth: 360,
    marginTop: spacing.xl,
    zIndex: 1,
    elevation: 1,
  },
  interestBar: {
    minHeight: 86,
    borderRadius: 34,
    backgroundColor: '#F0F0F0',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  interestButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestButtonActive: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    margin: 6,
  },
  interestText: {
    color: '#AAAAAA',
    fontSize: 24,
    fontWeight: '900',
  },
  interestTextActive: {
    color: colors.onPrimary,
  },
  interestLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  interestLabel: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  continueButton: {
    alignSelf: 'center',
    minHeight: 80,
    borderRadius: 30,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: 58,
    marginTop: 80,
    marginBottom: spacing.xl,
    zIndex: 1,
    ...shadows.card,
    elevation: 1,
  },
  continueText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 5,
  },
  pressed: {
    opacity: 0.82,
  },
});
