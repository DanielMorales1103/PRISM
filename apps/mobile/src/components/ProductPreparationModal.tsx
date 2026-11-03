import type { Product } from '@prism/shared';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Search, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, shadows, spacing } from '../theme/theme';

interface ProductPreparationModalProps {
  visible: boolean;
  products: Product[];
  selectedProductIds: string[];
  onClose: () => void;
  onChange: (productIds: string[]) => void;
}

export function ProductPreparationModal({ visible, products, selectedProductIds, onClose, onChange }: ProductPreparationModalProps) {
  const [query, setQuery] = useState('');
  const selected = useMemo(() => selectedProductIds.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product)), [products, selectedProductIds]);
  const available = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => product.active && (!normalized || `${product.name} ${product.line}`.toLowerCase().includes(normalized)));
  }, [products, query]);

  const toggle = (productId: string) => onChange(selectedProductIds.includes(productId) ? selectedProductIds.filter((id) => id !== productId) : [...selectedProductIds, productId]);
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selectedProductIds.length) return;
    const next = [...selectedProductIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View><Text style={styles.title}>Preparar visita</Text><Text style={styles.subtitle}>Elige y ordena los productos que presentarás.</Text></View>
            <Pressable onPress={onClose} style={styles.close}><X size={19} color={colors.text} /></Pressable>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Orden de presentación</Text>
            {selected.length === 0 ? <Text style={styles.empty}>Aún no has elegido productos.</Text> : selected.map((product, index) => <View key={product.id} style={styles.selectedRow}>
              <Text style={styles.order}>{index + 1}</Text><View style={styles.selectedInfo}><Text style={styles.productName}>{product.name}</Text><Text style={styles.line}>{product.line}</Text></View>
              <Pressable disabled={index === 0} onPress={() => move(index, -1)} style={[styles.iconButton, index === 0 && styles.disabled]}><ArrowUp size={17} color={colors.text} /></Pressable>
              <Pressable disabled={index === selected.length - 1} onPress={() => move(index, 1)} style={[styles.iconButton, index === selected.length - 1 && styles.disabled]}><ArrowDown size={17} color={colors.text} /></Pressable>
            </View>)}
          </View>
          <View style={styles.search}><Search size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar productos" placeholderTextColor={colors.muted} style={styles.input} /></View>
          <ScrollView style={styles.options} contentContainerStyle={styles.optionContent} keyboardShouldPersistTaps="handled">
            {available.map((product) => { const active = selectedProductIds.includes(product.id); return <Pressable key={product.id} onPress={() => toggle(product.id)} style={[styles.option, active && styles.optionActive]}><View style={[styles.check, active && styles.checkActive]}>{active ? <Check size={15} color={colors.onPrimary} /> : null}</View><View><Text style={styles.productName}>{product.name}</Text><Text style={styles.line}>{product.line} · {product.presentation}</Text></View></Pressable>; })}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.done}><Text style={styles.doneText}>Listo ({selected.length})</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'rgba(17,24,39,0.48)' },
  dismiss: { position: 'absolute', inset: 0 },
  card: { width: '100%', maxWidth: 620, maxHeight: '88%', borderRadius: 8, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md, ...shadows.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F3F4F6' },
  section: { gap: 7 }, sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 14 }, empty: { color: colors.muted, fontSize: 13 },
  selectedRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, backgroundColor: colors.primarySoft },
  order: { width: 25, height: 25, borderRadius: 13, textAlign: 'center', paddingTop: 4, backgroundColor: colors.primary, color: colors.onPrimary, fontWeight: '900', fontSize: 12 },
  selectedInfo: { flex: 1 }, productName: { color: colors.text, fontWeight: '900', fontSize: 14 }, line: { color: colors.muted, fontSize: 12, marginTop: 2 },
  iconButton: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, disabled: { opacity: 0.35 },
  search: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12 }, input: { flex: 1, color: colors.text },
  options: { maxHeight: 220, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }, optionContent: { padding: 5 }, option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 7 }, optionActive: { backgroundColor: '#FFF7F3' },
  check: { width: 22, height: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, checkActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  done: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primary }, doneText: { color: colors.onPrimary, fontWeight: '900' },
});
