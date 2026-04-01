// ServiceHub Theme Configuration
// Premium Modern E-Commerce Design System - Luxe Edition

export const colors = {
  // Primary colors - Sophisticated Deep Indigo with Electric Accent
  primary: '#4F46E5', // Electric Indigo
  primaryLight: '#818CF8',
  primaryDark: '#3730A3',
  primaryVeryLight: '#EEF2FF',
  primaryGlow: 'rgba(79, 70, 229, 0.15)',
  
  // Secondary colors - Refined Rose Gold
  secondary: '#F43F5E', // Modern Rose
  secondaryLight: '#FDA4AF',
  secondaryDark: '#E11D48',
  secondarySoft: '#FFF1F2',
  
  // Accent colors - Premium Gradient Range
  accent: '#06B6D4', // Cyan
  accentPurple: '#C084FC',
  accentGold: '#F59E0B',
  accentTeal: '#2DD4BF',
  accentEmerald: '#10B981',
  
  // Neutral colors - Softer, more refined neutrals
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceLight: '#F9FAFB',
  surfaceGray: '#F3F4F6',
  surfaceElevated: '#FFFFFF',
  
  // Text colors - Improved contrast hierarchy
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textLight: '#D1D5DB',
  textInverse: '#FFFFFF',
  
  // Status colors - Refined, accessible
  success: '#059669',
  successLight: '#D1FAE5',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#0284C7',
  infoLight: '#E0F2FE',
  
  // Border colors - Subtle definition
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderFocus: '#4F46E5',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
  
  // Additional colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Role specific colors - Enhanced with personality
  customer: '#4F46E5',
  seller: '#F59E0B',
  admin: '#7C3AED',
  partner: '#EC489A',
  
  // Premium Gradient combinations
  gradientPrimary: ['#4F46E5', '#7C3AED'],
  gradientSunset: ['#F43F5E', '#F97316'],
  gradientOcean: ['#06B6D4', '#3B82F6'],
  gradientAurora: ['#10B981', '#06B6D4'],
  gradientRoyal: ['#7C3AED', '#C084FC'],
  gradientMidnight: ['#1F2937', '#111827'],
  gradientGold: ['#F59E0B', '#FCD34D'],
  
  // New - Surface gradients for cards
  gradientCardLight: ['#FFFFFF', '#F9FAFB'],
  gradientCardDark: ['#1F2937', '#111827'],
  
  // New - Brand gradient
  brandGradient: {
    start: '#4F46E5',
    end: '#7C3AED',
    angle: '135deg',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  xxxxl: 80,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  xxxl: 32,
  full: 9999,
  card: 20,
  button: 10,
};

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "'Cal Sans', 'Inter', -apple-system, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  h1: {
    fontSize: 40,
    fontWeight: '800' as const,
    lineHeight: 48,
    letterSpacing: -0.02,
  },
  h2: {
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 40,
    letterSpacing: -0.015,
  },
  h3: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.01,
  },
  h4: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  h5: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 26,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 18,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  xxl: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 16,
    },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
  },
  glow: {
    shadowColor: '#4F46E5',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  inner: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 0,
  },
};

// New - Animation durations
export const animation = {
  fast: 150,
  base: 250,
  slow: 350,
  slower: 500,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// New - Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  overlay: 1600,
};

// New - Breakpoints for responsive design
export const breakpoints = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};