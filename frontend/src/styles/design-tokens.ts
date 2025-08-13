/**
 * Design tokens for consistent styling across the application
 * These tokens provide a centralized system for colors, spacing, typography, etc.
 */

export const designTokens = {
  // Color system
  colors: {
    // Primary brand colors
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main primary
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      gradient: 'from-blue-500 to-indigo-600',
      glow: 'shadow-blue-500/20',
    },

    // Secondary colors
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },

    // Status colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      gradient: 'from-green-400 to-emerald-600',
    },

    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      gradient: 'from-red-400 to-red-600',
    },

    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      gradient: 'from-yellow-400 to-orange-500',
    },

    // UI specific colors
    background: {
      primary: 'bg-white dark:bg-gray-900',
      secondary: 'bg-gray-50 dark:bg-gray-800',
      tertiary: 'bg-gray-100 dark:bg-gray-700',
    },

    text: {
      primary: 'text-gray-900 dark:text-white',
      secondary: 'text-gray-600 dark:text-gray-400',
      muted: 'text-gray-500 dark:text-gray-500',
      inverse: 'text-white dark:text-gray-900',
    },

    border: {
      default: 'border-gray-200 dark:border-gray-700',
      focus: 'border-blue-500 dark:border-blue-400',
      error: 'border-red-500 dark:border-red-400',
    },
  },

  // Spacing system (Tailwind compatible)
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['Fira Code', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    default: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Transitions
  transitions: {
    default: 'all 150ms ease-in-out',
    fast: 'all 100ms ease-in-out',
    slow: 'all 300ms ease-in-out',
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },

  // Component specific tokens
  components: {
    card: {
      padding: 'p-6',
      background: 'bg-white dark:bg-gray-800',
      border: 'border border-gray-200 dark:border-gray-700',
      shadow: 'shadow-sm',
      borderRadius: 'rounded-lg',
    },
    
    button: {
      height: {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-12',
      },
      padding: {
        sm: 'px-3 py-1.5',
        md: 'px-4 py-2',
        lg: 'px-6 py-3',
      },
      borderRadius: 'rounded-md',
      transition: 'transition-all duration-150',
    },

    input: {
      height: 'h-10',
      padding: 'px-3 py-2',
      background: 'bg-white dark:bg-gray-800',
      border: 'border border-gray-300 dark:border-gray-600',
      borderRadius: 'rounded-md',
      focus: 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    },
  },

  // Animation presets
  animations: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    },
  },
};

// Helper functions
export const getColorValue = (colorPath: string) => {
  const keys = colorPath.split('.');
  let value: any = designTokens.colors;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value;
};

export const getSpacingValue = (size: keyof typeof designTokens.spacing) => {
  return designTokens.spacing[size];
};

// CSS-in-JS helper for styled components
export const css = {
  card: `
    padding: ${designTokens.spacing.lg};
    background: white;
    border: 1px solid ${designTokens.colors.secondary[200]};
    border-radius: ${designTokens.borderRadius.lg};
    box-shadow: ${designTokens.shadows.sm};
  `,
  
  button: `
    padding: ${designTokens.spacing.sm} ${designTokens.spacing.md};
    border-radius: ${designTokens.borderRadius.md};
    transition: ${designTokens.transitions.default};
    font-weight: ${designTokens.typography.fontWeight.medium};
  `,
};