export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  primary: '#FF5710',
  primaryDark: '#D8430A',
  primarySoft: '#FFF1EC',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#0F766E',
  warning: '#B45309',
  onPrimary: '#FFFFFF',
  black: '#050505',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 8,
  xl: 8,
} as const;

export const shadows = {
  card: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
} as const;
