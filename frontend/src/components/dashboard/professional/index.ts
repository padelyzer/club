// Professional Dashboard Components
export { default as ProfessionalDashboardLayout } from './ProfessionalDashboardLayout';
export { default as ProfessionalDashboardStats, createDashboardStats } from './ProfessionalDashboardStats';
export { default as ProfessionalQuickMetrics, createQuickMetrics } from './ProfessionalQuickMetrics';
export { default as ProfessionalDashboardOverview } from './ProfessionalDashboardOverview';

// Re-export professional UI components for convenience
export { Button } from '@/components/ui/professional/Button';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/professional/Card';
export { Input, Label, FieldError, FieldHelp } from '@/components/ui/professional/Input';

// Export design system
export { professionalDesignSystem, designHelpers } from '@/styles/professional-design-system';