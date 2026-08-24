import type { Product } from '@prism/shared';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ArrowLeft, Check, ChevronRight, Filter, Info, Search } from 'lucide-react-native';
import { api } from '../services/api';
import { colors, radius, shadows, spacing } from '../theme/theme';

interface ProductSelectionScreenProps {
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
}

const fallbackImage = 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80';

export function ProductSelectionScreen({ onBack, onSelectProduct }: ProductSelectionScreenProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [status, setStatus] = useState('Cargando portafolio...');
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= 1200 ? 120 : width >= 900 ? 64 : spacing.lg;
  const gridGap = spacing.lg;
  const columns = width >= 900 ? 3 : width >= 620 ? 2 : 1;
  const cardWidth = Math.floor((width - horizontalPadding * 2 - gridGap * (columns - 1)) / columns);

  useEffect(() => {
    let mounted = true;

    void api
      .getProducts()
      .then((nextProducts) => {
        if (!mounted) {
          return;
        }

        setProducts(nextProducts.filter((product) => product.active));
        setStatus('');
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setStatus('No se pudo cargar el portafolio.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesLine = selectedLines.length === 0 || selectedLines.includes(product.line);
      const matchesQuery =
        !normalizedQuery ||
        [product.name, product.line, product.presentation, product.composition, product.details].some((value) =>
          String(value ?? '').toLowerCase().includes(normalizedQuery),
        );

      return matchesLine && matchesQuery;
    });
  }, [products, query, selectedLines]);

  const productLines = useMemo(() => Array.from(new Set(products.map((product) => product.line))).sort(), [products]);

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Portafolio Prism</Text>
        <View style={styles.searchWrap}>
          <Search size={22} color="#A0A0A0" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar producto por nombre o linea..."
            placeholderTextColor="#777777"
            style={styles.searchInput}
          />
        </View>
        <Pressable onPress={() => setShowFilters((current) => !current)} style={[styles.filterButton, showFilters && styles.filterButtonActive]}>
          <Filter size={23} color={colors.text} />
        </Pressable>
      </View>

      {showFilters && (
        <>
          <Pressable onPress={() => setShowFilters(false)} style={styles.dropdownBackdrop} />
          <View style={styles.filterDropdown}>
            <Pressable onPress={() => setSelectedLines([])} style={styles.filterOption}>
              <View style={[styles.checkbox, selectedLines.length === 0 && styles.checkboxActive]}>
                {selectedLines.length === 0 && <Check size={15} color={colors.onPrimary} />}
              </View>
              <Text style={styles.filterOptionText}>Todos</Text>
            </Pressable>

            {productLines.map((line) => {
              const selected = selectedLines.includes(line);

              return (
                <Pressable
                  key={line}
                  onPress={() =>
                    setSelectedLines((currentLines) =>
                      currentLines.includes(line) ? currentLines.filter((currentLine) => currentLine !== line) : [...currentLines, line],
                    )
                  }
                  style={styles.filterOption}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                    {selected && <Check size={15} color={colors.onPrimary} />}
                  </View>
                  <Text style={styles.filterOptionText}>{line}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={styles.title}>Manual Digital Interactivo</Text>
          <Text style={styles.subtitle}>Elige el producto que presentaras al medico hoy.</Text>
        </View>

        {status ? <Text style={styles.status}>{status}</Text> : null}

        <View style={[styles.grid, { gap: gridGap }]}>
          {filteredProducts.map((product) => (
            <Pressable
              key={product.id}
              onPress={() => onSelectProduct(product)}
              style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
            >
              <View style={styles.imageWrap}>
                <Image source={{ uri: product.imageUrl ?? fallbackImage }} style={styles.image} />
                <View style={styles.linePill}>
                  <Text style={styles.lineText}>{product.line}</Text>
                </View>
                <View style={styles.presentationPill}>
                  <Text style={styles.presentationText}>{product.presentation}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Info size={22} color="#C9C9C9" />
                </View>
                <Text style={styles.composition}>{product.composition ?? 'Composicion pendiente de confirmar'}</Text>
                <Text style={styles.details}>{product.details ?? 'Descripcion temporal pendiente de validar con el cliente.'}</Text>
                <View style={styles.dosageBox}>
                  <Text style={styles.dosage}>
                    <Text style={styles.dosageLabel}>Dosis: </Text>
                    {product.dosage ?? 'Pendiente de confirmar.'}
                  </Text>
                </View>
                <View style={styles.selectButton}>
                  <Text style={styles.selectButtonText}>Seleccionar</Text>
                  <ChevronRight size={18} color={colors.onPrimary} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topbar: {
    minHeight: 120,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    color: '#050505',
    fontSize: 30,
    fontWeight: '900',
  },
  searchWrap: {
    width: '30%',
    minWidth: 360,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  filterButton: {
    width: 58,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: '#FFD4C4',
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 40,
    backgroundColor: 'transparent',
  },
  content: {
    paddingTop: 62,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  filterDropdown: {
    position: 'absolute',
    top: 102,
    right: spacing.xl,
    width: 270,
    zIndex: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    ...shadows.card,
    elevation: 14,
  },
  filterOption: {
    minHeight: 46,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heading: {
    gap: spacing.sm,
  },
  title: {
    color: '#050505',
    fontSize: 38,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: '700',
  },
  status: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageWrap: {
    height: 240,
    position: 'relative',
    backgroundColor: '#DDEFE9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  linePill: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xl,
    borderRadius: 22,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lineText: {
    color: '#050505',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  presentationPill: {
    position: 'absolute',
    left: spacing.xl,
    bottom: spacing.xl,
    borderRadius: 18,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presentationText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  cardBody: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  productName: {
    color: '#050505',
    fontSize: 26,
    fontWeight: '900',
  },
  composition: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 22,
    textTransform: 'uppercase',
  },
  details: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
  },
  dosageBox: {
    marginTop: 'auto',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F1F1F1',
    padding: spacing.md,
  },
  dosage: {
    color: '#6A6A6A',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  dosageLabel: {
    color: '#1F1F1F',
    fontWeight: '900',
    fontStyle: 'normal',
  },
  selectButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  selectButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
  },
});
