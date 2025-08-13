/**
 * Professional Design System for Padelyzer
 * Modern, Apple-inspired design system with glassmorphism and smooth animations
 */

export const professionalDesignSystem = {
  // Color Palette - Apple-inspired with better accessibility
  colors: {
    primary: {
      50: '#E6F3FF',
      100: '#CCE6FF',
      500: '#007AFF',  // Apple Blue
      600: '#0066CC',
      700: '#0052A3',
      900: '#003366',
    },
    secondary: {
      50: '#F5F5F7',
      100: '#F2F2F7',
      200: '#E5E5EA',
      300: '#D1D1D6',
      400: '#C7C7CC',
      500: '#8E8E93',
      600: '#636366',
      700: '#48484A',
      800: '#3A3A3C',
      900: '#1C1C1E',
    },
    success: {
      50: '#F0FDF4',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
    },
    warning: {
      50: '#FFFBEB',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
    },
    error: {
      50: '#FEF2F2',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
    },
    glass: {
      white: 'rgba(255, 255, 255, 0.8)',
      light: 'rgba(255, 255, 255, 0.6)',
      dark: 'rgba(0, 0, 0, 0.1)',
    }
  },

  // Typography Scale - Apple System Font inspired
  typography: {
    fontFamily: {
      system: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      mono: ['SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Spacing Scale - 8px grid system
  spacing: {
    px: '1px',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem',     // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem',    // 12px
    3.5: '0.875rem', // 14px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    7: '1.75rem',    // 28px
    8: '2rem',       // 32px
    9: '2.25rem',    // 36px
    10: '2.5rem',    // 40px
    11: '2.75rem',   // 44px
    12: '3rem',      // 48px
    14: '3.5rem',    // 56px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
    32: '8rem',      // 128px
    40: '10rem',     // 160px
    48: '12rem',     // 192px
  },

  // Border Radius - Apple-inspired rounded corners
  borderRadius: {
    none: '0px',
    sm: '0.25rem',   // 4px
    DEFAULT: '0.5rem', // 8px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.25rem', // 20px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Shadows - Subtle depth with glassmorphism
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    glow: '0 0 20px rgba(0, 122, 255, 0.15)',
  },

  // Animation & Motion - Smooth, Apple-like easing
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0.0, 1, 1)',
      out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // Breakpoints - Mobile-first responsive design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-Index Scale
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    overlay: '1040',
    modal: '1050',
    popover: '1060',
    tooltip: '1070',
    toast: '1080',
  },

  // Glassmorphism Utilities
  glass: {
    light: {
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.6)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
    dark: {
      background: 'rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
  },

  // Gradient Utilities
  gradients: {
    primary: 'linear-gradient(135deg, #007AFF 0%, #4299E1 100%)',
    success: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
    warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    error: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
    page: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
  },

  // Component Specific Styles
  components: {
    // Cards
    card: {
      padding: {
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
      },
      borderRadius: '1rem',
      shadow: 'lg',
    },
    
    // Buttons
    button: {
      height: {
        sm: '2rem',
        md: '2.5rem',
        lg: '3rem',
        xl: '3.5rem',
      },
      padding: {
        sm: '0.5rem 0.75rem',
        md: '0.625rem 1rem',
        lg: '0.75rem 1.5rem',
        xl: '1rem 2rem',
      },
      borderRadius: '0.5rem',
    },
    
    // Inputs
    input: {
      height: {
        sm: '2rem',
        md: '2.5rem',
        lg: '3rem',
      },
      padding: '0.625rem 0.75rem',
      borderRadius: '0.5rem',
    },
  },
};

// CSS Custom Properties Export
export const cssCustomProperties = {
  '--color-primary': professionalDesignSystem.colors.primary[500],
  '--color-primary-hover': professionalDesignSystem.colors.primary[600],
  '--color-primary-active': professionalDesignSystem.colors.primary[700],
  '--color-secondary': professionalDesignSystem.colors.secondary[500],
  '--color-success': professionalDesignSystem.colors.success[500],
  '--color-warning': professionalDesignSystem.colors.warning[500],
  '--color-error': professionalDesignSystem.colors.error[500],
  
  '--glass-light': professionalDesignSystem.glass.light.background,
  '--glass-medium': professionalDesignSystem.glass.medium.background,
  '--glass-dark': professionalDesignSystem.glass.dark.background,
  
  '--gradient-primary': professionalDesignSystem.gradients.primary,
  '--gradient-glass': professionalDesignSystem.gradients.glass,
  '--gradient-page': professionalDesignSystem.gradients.page,
  
  '--shadow-glass': professionalDesignSystem.boxShadow.glass,
  '--shadow-glow': professionalDesignSystem.boxShadow.glow,
  
  '--animation-fast': professionalDesignSystem.animation.duration.fast,
  '--animation-normal': professionalDesignSystem.animation.duration.normal,
  '--animation-slow': professionalDesignSystem.animation.duration.slow,
  
  '--easing-default': professionalDesignSystem.animation.easing.default,
  '--easing-spring': professionalDesignSystem.animation.easing.spring,
  '--easing-bounce': professionalDesignSystem.animation.easing.bounce,
};

// Utility Classes Generator
export const generateUtilityClasses = () => ({
  // Glass utilities
  '.glass-light': {
    background: professionalDesignSystem.glass.light.background,
    backdropFilter: professionalDesignSystem.glass.light.backdropFilter,
    border: professionalDesignSystem.glass.light.border,
  },
  '.glass-medium': {
    background: professionalDesignSystem.glass.medium.background,
    backdropFilter: professionalDesignSystem.glass.medium.backdropFilter,
    border: professionalDesignSystem.glass.medium.border,
  },
  '.glass-dark': {
    background: professionalDesignSystem.glass.dark.background,
    backdropFilter: professionalDesignSystem.glass.dark.backdropFilter,
    border: professionalDesignSystem.glass.dark.border,
  },
  
  // Animation utilities
  '.animate-smooth': {
    transition: `all ${professionalDesignSystem.animation.duration.normal} ${professionalDesignSystem.animation.easing.default}`,
  },
  '.animate-spring': {
    transition: `all ${professionalDesignSystem.animation.duration.slow} ${professionalDesignSystem.animation.easing.spring}`,
  },
  '.animate-bounce': {
    transition: `all ${professionalDesignSystem.animation.duration.slow} ${professionalDesignSystem.animation.easing.bounce}`,
  },
});

export default professionalDesignSystem;