import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
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
        },
        danger: {
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
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'source-code-pro', 'monospace'],
      },
      fontSize: {
        // Apple HIG Typography Scale
        'display-xl': ['4rem', { lineHeight: '4rem', letterSpacing: '-0.02em', fontWeight: '600' }],     // 64px
        'display-lg': ['3.5rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em', fontWeight: '600' }], // 56px
        'display-md': ['3rem', { lineHeight: '3rem', letterSpacing: '-0.015em', fontWeight: '600' }],     // 48px
        'display-sm': ['2.5rem', { lineHeight: '2.5rem', letterSpacing: '-0.01em', fontWeight: '600' }], // 40px
        
        'headline-lg': ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: '600' }],    // 32px
        'headline-md': ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.005em', fontWeight: '600' }],  // 28px
        'headline-sm': ['1.5rem', { lineHeight: '1.75rem', letterSpacing: '0', fontWeight: '600' }],       // 24px
        
        'body-lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0', fontWeight: '400' }], // 18px
        'body-md': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '400' }],      // 16px
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0', fontWeight: '400' }], // 14px
        
        'callout': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '500' }],      // 16px medium
        
        'caption-lg': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0', fontWeight: '400' }], // 14px
        'caption-sm': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0', fontWeight: '400' }],     // 12px
        
        'ui-lg': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '500' }],      // 16px
        'ui-md': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0', fontWeight: '500' }], // 14px
        'ui-sm': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0', fontWeight: '500' }],     // 12px
      },
      lineHeight: {
        // Apple HIG Line Heights
        'none': '1',
        'tight': '1.1',
        'snug': '1.2',
        'normal': '1.4',
        'relaxed': '1.5',
        'loose': '1.75',
        'extra-loose': '2',
        
        // Specific Apple HIG line heights
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '7': '1.75rem',   // 28px
        '8': '2rem',      // 32px
        '9': '2.25rem',   // 36px
        '10': '2.5rem',   // 40px
      },
      spacing: {
        // Apple HIG 8pt grid system - Base units
        '0.5': '0.125rem',    // 2px
        '1': '0.25rem',       // 4px - Half unit
        '2': '0.5rem',        // 8px - Base unit
        '3': '0.75rem',       // 12px
        '4': '1rem',          // 16px - Standard unit
        '5': '1.25rem',       // 20px
        '6': '1.5rem',        // 24px - Loose unit
        '7': '1.75rem',       // 28px
        '8': '2rem',          // 32px - Section unit
        '9': '2.25rem',       // 36px
        '10': '2.5rem',       // 40px
        '11': '2.75rem',      // 44px - Touch target
        '12': '3rem',         // 48px - Large unit
        '14': '3.5rem',       // 56px
        '16': '4rem',         // 64px - Extra large unit
        '18': '4.5rem',       // 72px
        '20': '5rem',         // 80px - Page unit
        '24': '6rem',         // 96px - Layout unit
        '28': '7rem',         // 112px
        '32': '8rem',         // 128px
        '36': '9rem',         // 144px
        '40': '10rem',        // 160px
        '44': '11rem',        // 176px
        '48': '12rem',        // 192px
        '52': '13rem',        // 208px
        '56': '14rem',        // 224px
        '60': '15rem',        // 240px
        '64': '16rem',        // 256px
        '72': '18rem',        // 288px
        '80': '20rem',        // 320px
        '88': '22rem',        // 352px
        '96': '24rem',        // 384px
        '128': '32rem',       // 512px
        
        // Content-specific spacing
        'content-xs': '0.5rem',   // 8px - Tight content
        'content-sm': '1rem',     // 16px - Standard content
        'content-md': '1.5rem',   // 24px - Comfortable content
        'content-lg': '2rem',     // 32px - Loose content
        'content-xl': '3rem',     // 48px - Section breaks
        
        // Touch target spacing
        'touch-target': '2.75rem', // 44px - Minimum touch target
        'touch-spacing': '0.5rem', // 8px - Minimum spacing between targets
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'apple': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'apple-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
