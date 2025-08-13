/**
 * Responsive design utilities and breakpoints
 * Consistent responsive behavior across all club components
 */

export const breakpoints = {
  xs: '0px',      // 0px and up
  sm: '640px',    // Small devices (phones)
  md: '768px',    // Medium devices (tablets)
  lg: '1024px',   // Large devices (laptops)
  xl: '1280px',   // Extra large devices (desktops)
  '2xl': '1536px' // 2X large devices (large desktops)
} as const;

export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
} as const;

// Responsive grid configurations
export const gridLayouts = {
  clubCards: {
    // Auto-fit grid with minimum card width
    base: 'grid-cols-1',
    sm: 'sm:grid-cols-2',
    lg: 'lg:grid-cols-3',
    xl: 'xl:grid-cols-4',
    auto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  },
  
  clubStats: {
    base: 'grid-cols-1',
    sm: 'sm:grid-cols-2',
    lg: 'lg:grid-cols-4',
    auto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  },
  
  clubInfo: {
    base: 'grid-cols-1',
    md: 'md:grid-cols-2',
    auto: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  },
} as const;

// Responsive spacing
export const spacing = {
  container: {
    xs: 'px-4',
    sm: 'px-6',
    lg: 'px-8',
    auto: 'px-4 sm:px-6 lg:px-8',
  },
  
  section: {
    xs: 'py-4',
    sm: 'py-6',
    lg: 'py-8',
    auto: 'py-4 sm:py-6 lg:py-8',
  },
  
  gap: {
    xs: 'gap-2',
    sm: 'gap-4',
    lg: 'gap-6',
    auto: 'gap-2 sm:gap-4 lg:gap-6',
  },
} as const;

// Responsive typography
export const typography = {
  heading: {
    h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
    h2: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
    h3: 'text-lg sm:text-xl lg:text-2xl font-medium',
    h4: 'text-base sm:text-lg font-medium',
  },
  
  body: {
    large: 'text-base sm:text-lg',
    base: 'text-sm sm:text-base',
    small: 'text-xs sm:text-sm',
  },
} as const;

// Component-specific responsive classes
export const componentClasses = {
  clubCard: {
    container: 'w-full max-w-sm mx-auto sm:max-w-none',
    image: 'h-32 sm:h-40 lg:h-48',
    content: 'p-3 sm:p-4 lg:p-6',
    actions: 'flex flex-col sm:flex-row gap-2',
  },
  
  clubList: {
    container: 'space-y-4 lg:space-y-6',
    item: 'flex flex-col sm:flex-row gap-4 p-4 sm:p-6',
    image: 'w-full sm:w-32 h-32 sm:h-24',
    content: 'flex-1 min-w-0',
  },
  
  clubForm: {
    container: 'max-w-2xl mx-auto',
    grid: 'grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6',
    input: 'w-full',
    actions: 'flex flex-col sm:flex-row-reverse gap-3',
  },
  
  modal: {
    container: 'w-full max-w-lg mx-auto sm:max-w-2xl lg:max-w-4xl',
    content: 'max-h-[90vh] overflow-y-auto',
  },
  
  navigation: {
    container: 'flex flex-col sm:flex-row items-start sm:items-center gap-4',
    menu: 'flex flex-col sm:flex-row gap-2 sm:gap-4',
    actions: 'flex flex-col sm:flex-row gap-2 sm:gap-3',
  },
} as const;

// Responsive visibility utilities
export const visibility = {
  hideOnMobile: 'hidden sm:block',
  hideOnDesktop: 'block sm:hidden',
  showOnMobile: 'block sm:hidden',
  showOnTablet: 'hidden md:block lg:hidden',
  showOnDesktop: 'hidden lg:block',
} as const;

// Hook for responsive behavior
export const useResponsive = () => {
  const getResponsiveClasses = (config: Record<string, string>) => {
    return Object.entries(config)
      .map(([breakpoint, className]) => {
        if (breakpoint === 'base') return className;
        return `${breakpoint}:${className}`;
      })
      .join(' ');
  };

  const getGridClasses = (type: keyof typeof gridLayouts) => {
    return getResponsiveClasses(gridLayouts[type]);
  };

  const getSpacingClasses = (type: keyof typeof spacing) => {
    return getResponsiveClasses(spacing[type]);
  };

  return {
    getResponsiveClasses,
    getGridClasses,
    getSpacingClasses,
    breakpoints,
    gridLayouts,
    spacing,
    typography,
    componentClasses,
    visibility,
  };
};

// CSS custom properties for responsive design
export const cssVariables = {
  '--club-card-min-width': '280px',
  '--club-card-max-width': '400px',
  '--club-list-image-size': 'clamp(80px, 15vw, 120px)',
  '--club-modal-width': 'clamp(320px, 90vw, 800px)',
  '--club-spacing': 'clamp(1rem, 3vw, 2rem)',
} as const;

// Responsive design patterns
export const patterns = {
  // Auto-responsive grid with minimum column width
  autoGrid: (minWidth = '280px') => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
    gap: 'var(--club-spacing, 1.5rem)',
  }),
  
  // Responsive flex with wrapping
  flexWrap: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--club-spacing, 1rem)',
  },
  
  // Container with responsive padding
  container: {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 clamp(1rem, 3vw, 2rem)',
  },
} as const;