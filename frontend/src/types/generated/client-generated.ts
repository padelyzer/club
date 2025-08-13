/**
 * Tipos TypeScript para clients
 * Generado automáticamente desde models.py
 */

export interface PlayerLevel {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  name: string;
  displayName: string;
  display_name: string;
  description?: string;
  minRating: number;
  min_rating: number;
  maxRating: number;
  max_rating: number;
  color: string;
  icon?: string;
}

export interface PlayerLevelForm {
  name?: string;
  displayName?: string;
  description?: string;
  minRating?: number;
  maxRating?: number;
  color?: string;
  icon?: string;
}
