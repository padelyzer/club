// Professional Navigation Components
export { default as ProfessionalSidebar, createDefaultNavigation } from './ProfessionalSidebar';
export { default as ProfessionalTopNavigation } from './ProfessionalTopNavigation';
export { default as ProfessionalBreadcrumbs } from './ProfessionalBreadcrumbs';

// Re-export types for navigation items
export type { NavigationItem } from './ProfessionalSidebar';

// Re-export professional UI components for convenience
export { Button } from '@/components/ui/professional/Button';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/professional/Card';
export { Input, Label, FieldError, FieldHelp } from '@/components/ui/professional/Input';

// Export design system
export { professionalDesignSystem, designHelpers } from '@/styles/professional-design-system';