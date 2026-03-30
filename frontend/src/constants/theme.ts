// ServiceHub Theme Configuration
// Modern Teal/Cyan color scheme

export const colors = {
  // Primary colors - Modern Teal Palette
  primary: '#4F7C82',
  primaryLight: '#93B1B5',
  primaryDark: '#0B2E33',
  primaryVeryLight: '#B8E3E9',
  
  // Secondary colors
  secondary: '#5B9BA5',
  secondaryLight: '#7DB4BE',
  secondaryDark: '#3A6E77',
  
  // Neutral colors
  background: '#F0F8F9',
  surface: '#FFFFFF',
  surfaceLight: '#F7FCFD',
  surfaceTeal: '#E8F4F5',
  
  // Text colors
  text: '#0B2E33',
  textSecondary: '#4F7C82',
  textLight: '#93B1B5',
  
  // Status colors
  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',
  info: '#60A5FA',
  
  // Border colors
  border: '#D1E5E8',
  borderLight: '#E8F4F5',
  
  // Overlays
  overlay: 'rgba(11, 46, 51, 0.6)',
  overlayLight: 'rgba(11, 46, 51, 0.3)',
  
  // Additional colors
  white: '#FFFFFF',
  black: '#000000',
  purple: '#8B5CF6',
  
  // Role specific colors
  customer: '#4F7C82',
  seller: '#5B9BA5',
  admin: '#0B2E33',
  
  // Gradient colors
  gradientStart: '#B8E3E9',
  gradientMid: '#4F7C82',
  gradientEnd: '#0B2E33',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#0B2E33',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0B2E33',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0B2E33',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#0B2E33',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 12,
  },
};
