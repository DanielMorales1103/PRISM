import { StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors, radius, spacing } from '../theme/theme';

interface LocationMapPreviewProps {
  latitude: number;
  longitude: number;
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
}

export function LocationMapPreview({ latitude, longitude }: LocationMapPreviewProps) {
  return <View style={styles.placeholder}><MapPin size={28} color={colors.primary} /><Text style={styles.title}>Ubicación registrada</Text><Text style={styles.coordinates}>{latitude.toFixed(6)}, {longitude.toFixed(6)}</Text></View>;
}

const styles = StyleSheet.create({
  placeholder: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.md },
  title: { color: colors.text, fontWeight: '900' },
  coordinates: { color: colors.muted },
});
