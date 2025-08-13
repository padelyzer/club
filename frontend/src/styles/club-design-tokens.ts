/**
 * Club Module Design Tokens
 * Modern, powerful design system for the world's best padel management software
 */

export const clubDesignTokens = {
  // Modern color palette with gradients
  colors: {
    // Primary brand colors
    primary: {
      gradient: 'from-indigo-600 to-purple-600',
      gradientHover: 'from-indigo-700 to-purple-700',
      solid: '#4F46E5',
      light: '#818CF8',
      dark: '#3730A3',
    },
    
    // Status colors with modern feel
    status: {
      open: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        text: 'text-green-600',
        dot: 'bg-green-500',
      },
      closed: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-600',
        dot: 'bg-red-500',
      },
      busy: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-600',
        dot: 'bg-amber-500',
      },
    },
    
    // Tier colors for club classification
    tier: {
      basic: {
        gradient: 'from-gray-500 to-gray-600',
        badge: 'bg-gray-100 text-gray-700',
        glow: 'shadow-gray-500/20',
      },
      premium: {
        gradient: 'from-blue-500 to-indigo-600',
        badge: 'bg-blue-100 text-blue-700',
        glow: 'shadow-blue-500/30',
      },
      elite: {
        gradient: 'from-amber-500 to-orange-600',
        badge: 'bg-gradient-to-r from-amber-100 to-orange-100 text-orange-800',
        glow: 'shadow-amber-500/40',
      },
    },
    
    // Background patterns
    background: {
      card: 'bg-white dark:bg-gray-800',
      cardHover: 'bg-gray-50 dark:bg-gray-750',
      overlay: 'bg-gradient-to-b from-black/60 to-black/20',
      glass: 'bg-white/10 backdrop-blur-md',
      pattern: 'bg-gradient-to-br from-indigo-50 via-white to-purple-50',
    },
  },
  
  // Modern spacing system
  spacing: {
    card: {
      padding: 'p-6',
      paddingCompact: 'p-4',
      gap: 'gap-4',
      gapLarge: 'gap-6',
    },
    section: {
      margin: 'my-8',
      padding: 'py-12',
    },
  },
  
  // Typography with modern font scales
  typography: {
    // Card titles
    cardTitle: 'text-xl font-bold tracking-tight',
    cardTitleLarge: 'text-2xl font-bold tracking-tight',
    
    // Stats and numbers
    statNumber: 'text-3xl font-black tracking-tight',
    statLabel: 'text-sm font-medium text-gray-500',
    
    // Descriptions
    description: 'text-gray-600 dark:text-gray-300 leading-relaxed',
    
    // Badges and labels
    badge: 'text-xs font-semibold uppercase tracking-wider',
  },
  
  // Modern shadows and effects
  effects: {
    // Card shadows
    cardShadow: 'shadow-lg shadow-gray-900/5',
    cardShadowHover: 'shadow-xl shadow-gray-900/10',
    
    // Glow effects
    glowPrimary: 'shadow-xl shadow-indigo-500/20',
    glowStatus: 'shadow-lg shadow-current/20',
    
    // Borders
    borderSubtle: 'border border-gray-200 dark:border-gray-700',
    borderGlass: 'border border-white/20',
    
    // Animations
    transition: 'transition-all duration-300 ease-out',
    transitionFast: 'transition-all duration-150 ease-out',
    
    // Hover states
    hoverScale: 'hover:scale-[1.02]',
    hoverLift: 'hover:-translate-y-1',
  },
  
  // Layout tokens
  layout: {
    // Card dimensions
    cardMinHeight: 'min-h-[200px]',
    cardMaxWidth: 'max-w-md',
    
    // Grid systems
    gridCols: {
      mobile: 'grid-cols-1',
      tablet: 'sm:grid-cols-2',
      desktop: 'lg:grid-cols-3',
      wide: 'xl:grid-cols-4',
    },
    
    // Aspect ratios
    aspectRatio: {
      card: 'aspect-[4/3]',
      cover: 'aspect-[16/9]',
      square: 'aspect-square',
    },
  },
  
  // Animation presets
  animations: {
    // Entrance animations
    fadeIn: 'animate-in fade-in duration-500',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-500',
    scaleIn: 'animate-in zoom-in-90 duration-300',
    
    // Loading states
    pulse: 'animate-pulse',
    shimmer: 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer',
  },
  
  // Component-specific tokens
  components: {
    // Stats card
    statsCard: {
      container: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4',
      icon: 'text-indigo-600 dark:text-indigo-400',
      trend: {
        up: 'text-green-600',
        down: 'text-red-600',
        neutral: 'text-gray-600',
      },
    },
    
    // Feature badges
    featureBadge: {
      base: 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
      variants: {
        default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        primary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      },
    },
    
    // Action buttons
    actionButton: {
      primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700',
      secondary: 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750',
      ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    },
  },
  
  // Responsive breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// Utility function to get token values
export const getToken = (path: string) => {
  const keys = path.split('.');
  let value: any = clubDesignTokens;
  
  for (const key of keys) {
    value = value[key];
    if (!value) return undefined;
  }
  
  return value;
};

// CSS variable exports for runtime theming
export const cssVariables = `
  :root {
    --club-primary: 79 70 229;
    --club-primary-light: 129 140 248;
    --club-primary-dark: 55 48 163;
    
    --club-gradient-start: 79 70 229;
    --club-gradient-end: 124 58 237;
    
    --club-card-radius: 1rem;
    --club-card-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.1);
    
    --club-animation-duration: 300ms;
    --club-animation-timing: cubic-bezier(0.4, 0, 0.2, 1);
  }
`;