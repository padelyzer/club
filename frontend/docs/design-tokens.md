# Design Tokens Documentation

## Introduction

Design tokens are the visual atoms of our design system. They are named entities that store visual attributes and ensure consistency across our application.

## Token Categories

### 1. Color Tokens

#### Semantic Colors

Our color system uses semantic naming to ensure colors are used consistently for their intended purpose.

##### Primary Colors
```css
--primary: hsl(222.2 47.4% 45.2%);
--primary-foreground: hsl(210 40% 98%);
```
Used for: Primary actions, links, focus states

##### Secondary Colors
```css
--secondary: hsl(210 40% 96.1%);
--secondary-foreground: hsl(222.2 47.4% 11.2%);
```
Used for: Secondary actions, subtle backgrounds

##### Destructive Colors
```css
--destructive: hsl(0 84.2% 60.2%);
--destructive-foreground: hsl(210 40% 98%);
```
Used for: Delete actions, error states, warnings

##### State Colors
```css
/* Success */
--success-500: #22c55e;
--success-600: #16a34a;

/* Warning */
--warning-500: #f59e0b;
--warning-600: #d97706;

/* Danger/Error */
--danger-500: #ef4444;
--danger-600: #dc2626;
```

#### Neutral Colors (Gray Scale)
```css
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### 2. Typography Tokens

#### Font Families
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
--font-mono: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
```

#### Font Sizes
```css
/* Display */
--text-display-xl: 3rem;      /* 48px */
--text-display-lg: 2.5rem;    /* 40px */
--text-display-md: 2rem;      /* 32px */
--text-display-sm: 1.5rem;    /* 24px */

/* Headings */
--text-h1: 2rem;              /* 32px */
--text-h2: 1.5rem;            /* 24px */
--text-h3: 1.25rem;           /* 20px */
--text-h4: 1.125rem;          /* 18px */
--text-h5: 1rem;              /* 16px */
--text-h6: 0.875rem;          /* 14px */

/* Body */
--text-body-lg: 1.125rem;     /* 18px */
--text-body-md: 1rem;         /* 16px */
--text-body-sm: 0.875rem;     /* 14px */
--text-body-xs: 0.75rem;      /* 12px */
```

#### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### Line Heights
```css
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

### 3. Spacing Tokens

Our spacing system is based on a 4px grid:

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
--space-32: 8rem;     /* 128px */
```

### 4. Border Radius Tokens

```css
--radius-none: 0;
--radius-sm: 0.125rem;    /* 2px */
--radius-md: 0.375rem;    /* 6px */
--radius-lg: 0.5rem;      /* 8px */
--radius-xl: 1rem;        /* 16px */
--radius-2xl: 1.5rem;     /* 24px */
--radius-3xl: 2rem;       /* 32px */
--radius-full: 9999px;
```

### 5. Shadow Tokens

```css
/* Apple-inspired shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

### 6. Animation Tokens

#### Durations
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;
```

#### Easing Functions
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 7. Breakpoint Tokens

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### 8. Z-Index Tokens

```css
--z-0: 0;
--z-10: 10;      /* Dropdown */
--z-20: 20;      /* Sticky elements */
--z-30: 30;      /* Fixed elements */
--z-40: 40;      /* Overlay */
--z-50: 50;      /* Modal */
--z-999: 999;    /* Toast/Notification */
--z-max: 9999;   /* Development tools */
```

## Usage Guidelines

### In CSS/Tailwind

```css
/* Using CSS variables */
.button-primary {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

/* Using Tailwind classes */
<button className="bg-primary text-primary-foreground">
  Click me
</button>
```

### In JavaScript/TypeScript

```typescript
// Import tokens
import { colors, spacing, typography } from '@/lib/design-tokens';

// Use in styled components
const StyledButton = styled.button`
  background-color: ${colors.primary};
  padding: ${spacing[4]} ${spacing[6]};
  font-size: ${typography.body.md};
`;
```

## Token Naming Convention

### Pattern
`[category]-[property]-[variant]-[state]`

### Examples
- `color-primary-500`
- `spacing-4`
- `text-body-lg`
- `shadow-lg`
- `radius-md`

## Dark Mode Support

All color tokens support dark mode through CSS variables:

```css
/* Light mode (default) */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}

/* Dark mode */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

## Component Token Mapping

### Button
- Background: `--primary`
- Text: `--primary-foreground`
- Border radius: `--radius-lg`
- Padding: `--space-4 --space-6`
- Font size: `--text-body-md`

### Card
- Background: `--card`
- Border: `--border`
- Shadow: `--shadow-md`
- Border radius: `--radius-lg`
- Padding: `--space-6`

### Input
- Background: `--background`
- Border: `--input`
- Border radius: `--radius-md`
- Height: `44px` (accessibility)
- Font size: `--text-body-md`

## Accessibility Considerations

### Color Contrast
- All text colors meet WCAG AA standards
- Primary on white: 4.5:1
- Secondary on white: 7:1
- Use `foreground` variants for text on colored backgrounds

### Touch Targets
- Minimum size: 44x44px
- Spacing between targets: 8px minimum

### Focus States
- Use `--ring` color for focus indicators
- 2px offset for visibility

## Migration Guide

### From Hard-coded Values
```css
/* Old */
.button {
  background-color: #3b82f6;
  padding: 16px 24px;
}

/* New */
.button {
  background-color: hsl(var(--primary));
  padding: var(--space-4) var(--space-6);
}
```

### From Custom Properties
```css
/* Old */
:root {
  --brand-blue: #3b82f6;
}

/* New */
:root {
  --primary: 217.2 91.2% 59.8%;
}
```

## Tools and Resources

### Token Validation
```bash
npm run validate:tokens
```

### Token Documentation
- Storybook: View all tokens visually
- Figma: Design tokens plugin
- VS Code: IntelliSense for token values

### Export Formats
- CSS: `tokens.css`
- JSON: `tokens.json`
- TypeScript: `tokens.ts`
- Figma: `tokens.fig`

## Best Practices

### DO ✅
- Use semantic tokens over raw values
- Follow naming conventions
- Test in both light and dark modes
- Document new tokens
- Consider accessibility

### DON'T ❌
- Hard-code values
- Create one-off tokens
- Override token values
- Mix token systems
- Ignore contrast ratios

## Future Enhancements

- [ ] Dynamic token generation
- [ ] Theme customization API
- [ ] Token deprecation system
- [ ] Design tool sync
- [ ] A11y validation