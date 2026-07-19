// QMSoft School — mobile design system.
// Bold & colorful: vivid QMSoft purple core, per-role accent palettes, big
// gradients, generous radii and touch targets. Every screen pulls from here so
// the look stays consistent and re-themeable in one place.

export const colors = {
  // Brand core (from the web app's #6D3CF0, amplified for mobile).
  primary: '#6D3CF0',
  primaryDark: '#4C1FA8',
  primaryLight: '#A78BFA',

  // Vivid accents used across cards, stats, chips.
  pink: '#EC4899',
  rose: '#FB7185',
  amber: '#F59E0B',
  emerald: '#10B981',
  sky: '#0EA5E9',
  indigo: '#6366F1',
  violet: '#8B5CF6',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0EA5E9',

  // Neutrals
  ink: '#0F172A',        // near-black text
  slate: '#475569',      // secondary text
  muted: '#94A3B8',      // tertiary text
  line: '#E2E8F0',       // borders
  card: '#FFFFFF',
  bg: '#F6F7FB',         // app background
  white: '#FFFFFF',
};

// Per-role identity — each role gets a signature gradient + accent so the app
// feels tailored the moment you log in. Mirrors the web sidebar role colors.
export const roleTheme: Record<
  string,
  { gradient: [string, string]; accent: string; label: string }
> = {
  superadmin:   { gradient: ['#FBBF24', '#F59E0B'], accent: '#B45309', label: 'Platform Admin' },
  school_admin: { gradient: ['#A78BFA', '#6D3CF0'], accent: '#6D3CF0', label: 'School Admin' },
  principal:    { gradient: ['#6366F1', '#4338CA'], accent: '#4338CA', label: 'Principal' },
  accountant:   { gradient: ['#FBBF24', '#D97706'], accent: '#B45309', label: 'Accountant' },
  teacher:      { gradient: ['#34D399', '#059669'], accent: '#059669', label: 'Teacher' },
  parent:       { gradient: ['#FB7185', '#E11D48'], accent: '#E11D48', label: 'Parent' },
  student:      { gradient: ['#A78BFA', '#7C3AED'], accent: '#7C3AED', label: 'Student' },
};

export function themeForRole(role?: string) {
  return roleTheme[role ?? ''] ?? roleTheme.school_admin;
}

export const gradients = {
  brand: ['#6D3CF0', '#4C1FA8'] as [string, string],
  brandVivid: ['#8B5CF6', '#6D3CF0'] as [string, string],
  sunrise: ['#FB7185', '#F59E0B'] as [string, string],
  ocean: ['#0EA5E9', '#6366F1'] as [string, string],
  mint: ['#34D399', '#10B981'] as [string, string],
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 16, lg: 20, xl: 28, pill: 999 };

export const font = {
  // System stack keeps the bundle light; sizes tuned for a punchy hierarchy.
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.3 },
  h3: { fontSize: 19, fontWeight: '700' as const },
  title: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5 },
};

export const shadow = {
  card: {
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  float: {
    shadowColor: '#4C1FA8',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
};
