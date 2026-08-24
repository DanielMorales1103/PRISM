import { useMemo } from 'react';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, UserRound } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, shadows, spacing } from '../theme/theme';

interface AgendaScreenProps {
  onBack: () => void;
}

interface AgendaEvent {
  time: string;
  title: string;
  meta: string;
  place: string;
  note: string;
}

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const todayEvents: AgendaEvent[] = [
  {
    time: '10:00 AM',
    title: 'Dr. Ricardo Salinas',
    meta: 'Dermatologia',
    place: 'Hospital Herrera Llerandi',
    note: 'Presentacion de Linea',
  },
  {
    time: '14:30 PM',
    title: 'Dra. Beatriz Mencos',
    meta: 'Pediatria',
    place: 'Centro Medico Z.10',
    note: 'Lanzamiento Producto',
  },
  {
    time: '16:00 PM',
    title: 'Dr. Sergio Valdes',
    meta: 'Endocrinologia',
    place: 'Multimedica',
    note: 'Revision tecnica',
  },
];

function createMonthWeeks(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({ length: firstWeekday }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const monthWeeks: Array<Array<number | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    monthWeeks.push(cells.slice(index, index + 7));
  }

  return monthWeeks;
}

function buildMockEvents(selectedDay: number, daysInMonth: number) {
  const events: Record<number, AgendaEvent[]> = {
    [selectedDay]: todayEvents,
  };
  const previousVisitDay = Math.max(1, selectedDay - 3);
  const nextVisitDay = Math.min(daysInMonth, selectedDay + 3);

  if (previousVisitDay !== selectedDay) {
    events[previousVisitDay] = [
      {
        time: '11:00',
        title: 'Dra. Ana Gomez',
        meta: 'Dermatologia',
        place: 'Hospital Centro Medico',
        note: 'Seguimiento de producto',
      },
    ];
  }

  if (nextVisitDay !== selectedDay && nextVisitDay !== previousVisitDay) {
    events[nextVisitDay] = [
      {
        time: '09:30',
        title: 'Farmacia San Pablo',
        meta: 'Farmacia',
        place: 'Zona 10',
        note: 'Revision de inventario',
      },
    ];
  }

  return events;
}

export function AgendaScreen({ onBack }: AgendaScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const currentDate = useMemo(() => new Date(), []);
  const selectedDay = currentDate.getDate();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const weeks = useMemo(() => createMonthWeeks(currentDate), [currentDate]);
  const dayEvents = useMemo(() => buildMockEvents(selectedDay, daysInMonth), [daysInMonth, selectedDay]);
  const selectedEvents = dayEvents[selectedDay] ?? [];
  const monthTitle = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const agendaTitle = `Agenda del ${selectedDay} de ${monthNames[currentDate.getMonth()]}`;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.hero}>
          <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ArrowLeft size={25} color={colors.onPrimary} />
          </Pressable>
          <View style={styles.brandWrap}>
            <Text style={styles.brand}>prism</Text>
            <Text style={styles.brandSub}>adding life to living...</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Mi Agenda</Text>
            <View style={styles.heroSubtitleRow}>
              <View style={styles.accentLine} />
              <Text style={styles.heroSubtitle}>Visualiza tus visitas y compromisos programados.</Text>
            </View>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.monthTitle}>{monthTitle}</Text>
            <View style={styles.monthControls}>
              <ChevronLeft size={22} color={colors.text} />
              <ChevronRight size={22} color={colors.text} />
            </View>
          </View>

          <View style={styles.weekHeader}>
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day) => (
              <Text key={day} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {weeks.map((week, index) => (
              <View key={`week-${index}`} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  const events = day ? dayEvents[day] ?? [] : [];
                  const selected = day === selectedDay;
                  return (
                    <View key={`${index}-${dayIndex}`} style={[styles.dayCell, compact && styles.dayCellCompact, selected && styles.dayCellSelected]}>
                      {day && (
                        <>
                          <View style={styles.dayNumberWrap}>
                            <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{day}</Text>
                            {events.length > 0 && <View style={styles.dayDot} />}
                          </View>
                          <View style={styles.dayEvents}>
                            {events.slice(0, compact ? 1 : 2).map((event) => (
                              <View key={`${day}-${event.time}`} style={[styles.eventChip, selected && styles.eventChipSelected]}>
                                <Text style={[styles.eventTime, selected && styles.eventTextSelected]}>{event.time}</Text>
                                <Text style={[styles.eventTitle, selected && styles.eventTextSelected]} numberOfLines={1}>
                                  {event.title}
                                </Text>
                              </View>
                            ))}
                            {events.length > (compact ? 1 : 2) && (
                              <Text style={[styles.moreEvents, selected && styles.eventTextSelected]}>+{events.length - (compact ? 1 : 2)} mas</Text>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.agendaHeader}>
          <Text style={styles.agendaTitle}>{agendaTitle}</Text>
          <Text style={styles.taskBadge}>{selectedEvents.length} TAREAS</Text>
        </View>

        <View style={styles.eventList}>
          {selectedEvents.map((event) => (
            <View key={`${event.time}-${event.title}`} style={styles.visitCard}>
              <View style={styles.visitMarker}>
                <View style={styles.visitCircle} />
              </View>
              <View style={styles.visitBody}>
                <View style={styles.visitTimeRow}>
                  <Clock3 size={15} color="#A1A1AA" />
                  <Text style={styles.visitTime}>{event.time}</Text>
                </View>
                <Text style={styles.visitName}>{event.title}</Text>
                <View style={styles.visitMetaRow}>
                  <UserRound size={15} color={colors.muted} />
                  <Text style={styles.visitMeta}>{event.meta}</Text>
                  <MapPin size={15} color={colors.muted} />
                  <Text style={styles.visitMeta}>{event.place}</Text>
                </View>
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>" {event.note} "</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.ctaCard}>
          <View>
            <Text style={styles.ctaTitle}>Programar Visita</Text>
            <Text style={styles.ctaText}>Tienes un nuevo compromiso? Organiza tu ruta de la semana.</Text>
            <View style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Anadir al Calendario</Text>
            </View>
          </View>
          <CalendarDays size={122} color="rgba(255,255,255,0.18)" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  hero: {
    minHeight: 280,
    backgroundColor: colors.black,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  backButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#252525',
  },
  pressed: {
    opacity: 0.72,
  },
  brandWrap: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  brand: {
    color: colors.onPrimary,
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 0,
  },
  brandSub: {
    color: '#BDBDBD',
    fontSize: 9,
    marginTop: -4,
  },
  heroCopy: {
    marginTop: spacing.xl,
  },
  heroTitle: {
    color: colors.onPrimary,
    fontSize: 36,
    fontWeight: '900',
  },
  heroSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  accentLine: {
    width: 3,
    height: 30,
    backgroundColor: colors.primary,
  },
  heroSubtitle: {
    color: '#A3A3A3',
    fontSize: 17,
    fontWeight: '800',
  },
  calendarCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    ...shadows.card,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  monthTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  monthControls: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekday: {
    flex: 1,
    color: '#B8BBC1',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#F0F0F1',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    minHeight: 118,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F1',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  dayCellCompact: {
    minHeight: 94,
    padding: 6,
  },
  dayCellSelected: {
    backgroundColor: colors.black,
    borderRadius: 16,
    transform: [{ scale: 1.02 }],
    ...shadows.card,
  },
  dayNumberWrap: {
    alignItems: 'center',
    gap: 3,
  },
  dayNumber: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  dayNumberSelected: {
    color: colors.onPrimary,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  dayEvents: {
    gap: 4,
    marginTop: spacing.xs,
  },
  eventChip: {
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  eventChipSelected: {
    backgroundColor: 'rgba(255,87,16,0.22)',
  },
  eventTime: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  eventTitle: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  eventTextSelected: {
    color: colors.onPrimary,
  },
  moreEvents: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  agendaHeader: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agendaTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  taskBadge: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    fontWeight: '900',
  },
  eventList: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  visitCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  visitMarker: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  visitBody: {
    flex: 1,
    gap: spacing.sm,
  },
  visitTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  visitTime: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '900',
  },
  visitName: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  visitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  visitMeta: {
    color: colors.muted,
    fontSize: 14,
    marginRight: spacing.sm,
  },
  noteBox: {
    backgroundColor: '#F1F1F2',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#E1E1E3',
  },
  noteText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  ctaCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    minHeight: 170,
    borderRadius: 28,
    backgroundColor: colors.primary,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...shadows.card,
  },
  ctaTitle: {
    color: colors.onPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  ctaText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
});
