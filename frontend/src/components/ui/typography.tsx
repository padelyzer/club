import * as React from 'react';
import { cn } from '@/lib/utils';
import { typographyVariants, type TypographyVariants } from '@/lib/typography';

type TypographyElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'blockquote' | 'code';

interface TypographyProps extends React.HTMLAttributes<HTMLElement>, TypographyVariants {
  as?: TypographyElement;
  children: React.ReactNode;
}

const variantElementMap: Record<string, TypographyElement> = {
  // Display variants - typically h1 for hero content
  'display-xl': 'h1',
  'display-lg': 'h1',
  'display-md': 'h1',
  'display-sm': 'h2',
  
  // Apple HIG headline variants
  'headline-lg': 'h2',
  'headline-md': 'h3',
  'headline-sm': 'h4',
  
  // Traditional heading variants
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  
  // Body text variants
  'body-lg': 'p',
  'body-md': 'p',
  'body-sm': 'p',
  'body-xs': 'p', // kept for backward compatibility
  
  // Apple HIG callout and captions
  'callout': 'p',
  'caption-lg': 'span',
  'caption-sm': 'span',
  
  // UI elements
  'ui-lg': 'span',
  'ui-md': 'span',
  'ui-sm': 'span',
  
  // Special variants
  lead: 'p',
  quote: 'blockquote',
  code: 'code',
  label: 'span',
  caption: 'span', // legacy
  overline: 'span',
};

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ as, variant = 'body-md', color, align, weight, className, ...props }, ref) => {
    const Component = as || variantElementMap[variant || 'body-md'] || 'p';
    
    // Add accessibility attributes for headings
    const isHeading = Component.toString().match(/^h[1-6]$/) || variant?.startsWith('display') || variant?.startsWith('headline');
    const accessibilityProps = isHeading ? {
      role: Component === 'div' || Component === 'span' ? 'heading' : undefined,
      'aria-level': Component === 'h1' || variant?.includes('xl') ? 1 :
                   Component === 'h2' || variant?.includes('lg') ? 2 :
                   Component === 'h3' || variant?.includes('md') ? 3 :
                   Component === 'h4' || variant?.includes('sm') ? 4 :
                   Component === 'h5' ? 5 :
                   Component === 'h6' ? 6 : undefined
    } : {};
    
    return (
      <Component
        ref={ref as any}
        className={cn(
          typographyVariants({ variant, color, align, weight }),
          // Ensure proper contrast and readability
          'antialiased',
          className
        )}
        {...accessibilityProps}
        {...props}
      />
    );
  }
);

Typography.displayName = 'Typography';

// Convenience components
export const Heading1 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="h1" as="h1" {...props} />
);
Heading1.displayName = 'Heading1';

export const Heading2 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="h2" as="h2" {...props} />
);
Heading2.displayName = 'Heading2';

export const Heading3 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="h3" as="h3" {...props} />
);
Heading3.displayName = 'Heading3';

export const Heading4 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="h4" as="h4" {...props} />
);
Heading4.displayName = 'Heading4';

export const Body = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="body-md" as="p" {...props} />
);
Body.displayName = 'Body';

export const Lead = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="lead" as="p" {...props} />
);
Lead.displayName = 'Lead';

export const Caption = React.forwardRef<HTMLElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="caption" as="span" {...props} />
);
Caption.displayName = 'Caption';

export const Code = React.forwardRef<HTMLElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="code" as="code" {...props} />
);
Code.displayName = 'Code';

export const Quote = React.forwardRef<HTMLQuoteElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="quote" as="blockquote" {...props} />
);
Quote.displayName = 'Quote';

// Apple HIG Display Components
export const DisplayXL = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="display-xl" as="h1" {...props} />
);
DisplayXL.displayName = 'DisplayXL';

export const DisplayLG = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="display-lg" as="h1" {...props} />
);
DisplayLG.displayName = 'DisplayLG';

export const DisplayMD = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="display-md" as="h1" {...props} />
);
DisplayMD.displayName = 'DisplayMD';

export const DisplaySM = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="display-sm" as="h2" {...props} />
);
DisplaySM.displayName = 'DisplaySM';

// Apple HIG Headline Components
export const HeadlineLG = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="headline-lg" as="h2" {...props} />
);
HeadlineLG.displayName = 'HeadlineLG';

export const HeadlineMD = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="headline-md" as="h3" {...props} />
);
HeadlineMD.displayName = 'HeadlineMD';

export const HeadlineSM = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="headline-sm" as="h4" {...props} />
);
HeadlineSM.displayName = 'HeadlineSM';

// Apple HIG Body Components
export const BodyLG = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="body-lg" as="p" {...props} />
);
BodyLG.displayName = 'BodyLG';

export const BodySM = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="body-sm" as="p" {...props} />
);
BodySM.displayName = 'BodySM';

// Apple HIG Callout Component
export const Callout = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="callout" as="p" {...props} />
);
Callout.displayName = 'Callout';

// Apple HIG Caption Components
export const CaptionLG = React.forwardRef<HTMLElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="caption-lg" as="span" {...props} />
);
CaptionLG.displayName = 'CaptionLG';

export const CaptionSM = React.forwardRef<HTMLElement, Omit<TypographyProps, 'variant' | 'as'>>(
  (props, ref) => <Typography ref={ref as any} variant="caption-sm" as="span" {...props} />
);
CaptionSM.displayName = 'CaptionSM';