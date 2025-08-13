// Type definitions for strict mode compatibility

export type ClassLevelValue = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
export type ClassTypeValue = 'group' | 'individual' | 'clinic' | 'intensive' | 'workshop';

// Re-export with proper types
export type { ClassLevel, ClassType } from '@/types/class';

// Helper type for icon components
export type IconComponent = React.ComponentType<{ className?: string }>;
