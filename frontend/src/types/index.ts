/**
 * Archivo principal de tipos TypeScript
 * Exporta todos los tipos del sistema
 */

// Re-exportar todos los tipos completos generados automáticamente
export * from './complete';

// También exportar tipos manuales existentes si los hay
export * from './user';
export * from './club';
export * from './reservation';
export * from './client';
export * from './organization';
export * from './notifications';

// Tipos de utilidad comunes
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface BaseModel {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
}

// Re-exportar tipos generados para facilitar el acceso
export type {
  // Desde complete/index.ts
  AllModels
} from './complete';