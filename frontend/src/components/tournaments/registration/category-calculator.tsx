'use client';

import React, { useState, useEffect } from 'react';
import { Control, Controller } from 'react-hook-form';
import {
  TrendingUp,
  Award,
  Calendar,
  Users,
  Brain,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  Tournament,
  TournamentCategory,
  CategoryCalculation,
  CategoryFactor,
} from '@/types/tournament';
import { Player } from '@/types';
import { cn } from '@/lib/utils';

interface CategoryCalculatorProps {
  control: Control<any>;
  tournament: Tournament;
  primaryPlayer: Player;
  secondaryPlayer?: Player;
  selectedCategory?: string;
  onCategorySelect: (category: TournamentCategory) => void;
  className?: string;
}

const CATEGORY_INFO: Record<
  TournamentCategory,
  {
    label: string;
    description: string;
    requirements: string[];
    color: string;
    bgColor: string;
  }
> = {
  junior: {
    label: 'Junior',
    description: 'Para jugadores menores de 18 años',
    requirements: ['Edad: Menor a 18 años', 'Todos los niveles'],
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  beginner: {
    label: 'Principiante',
    description: 'Para jugadores que están empezando',
    requirements: ['Menos de 1 año jugando', 'Sin experiencia en torneos'],
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
  intermediate: {
    label: 'Intermedio',
    description: 'Para jugadores con experiencia básica',
    requirements: ['1-3 años de experiencia', 'Algunos torneos locales'],
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  advanced: {
    label: 'Avanzado',
    description: 'Para jugadores experimentados',
    requirements: ['Más de 3 años jugando', 'Múltiples torneos'],
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  professional: {
    label: 'Profesional',
    description: 'Para jugadores de elite',
    requirements: ['Ranking oficial', 'Torneos profesionales'],
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
  senior: {
    label: 'Senior',
    description: 'Para jugadores mayores de 45 años',
    requirements: ['Edad: Mayor a 45 años', 'Todos los niveles'],
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
  },
  open: {
    label: 'Abierta',
    description: 'Sin restricciones de edad o nivel',
    requirements: ['Sin restricciones', 'Cualquier nivel'],
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50 border-indigo-200',
  },
};

export const CategoryCalculator: React.FC<CategoryCalculatorProps> = ({
  control,
  tournament,
  primaryPlayer,
  secondaryPlayer,
  selectedCategory,
  onCategorySelect,
  className,
}) => {
  const [calculation, setCalculation] = useState<CategoryCalculation | null>(
    null
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<
    TournamentCategory[]
  >([]);

  // Calculate recommended category
  useEffect(() => {
    if (primaryPlayer) {
      calculateCategory();
    }
  }, [primaryPlayer, secondaryPlayer]);

  const calculateCategory = async () => {
    setIsCalculating(true);

    try {
      // Simulate category calculation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const factors: CategoryFactor[] = [
        {
          type: 'skill_level',
          value: primaryPlayer.level,
          weight: 0.4,
          contribution: 0.35,
        },
        {
          type: 'tournament_history',
          value: primaryPlayer.matches || 0,
          weight: 0.3,
          contribution: 0.25,
        },
        {
          type: 'age',
          value: calculateAge(primaryPlayer.createdAt), // Mock age calculation
          weight: 0.2,
          contribution: 0.2,
        },
        {
          type: 'ranking',
          value: primaryPlayer.winRate,
          weight: 0.1,
          contribution: 0.2,
        },
      ];

      // Determine suggested category based on factors
      let suggestedCategory: TournamentCategory = 'intermediate';
      let confidence = 0.8;

      // Simple logic for demo - replace with actual algorithm
      if (primaryPlayer.level === 'beginner') {
        suggestedCategory = 'beginner';
        confidence = 0.9;
      } else if (primaryPlayer.level === 'professional') {
        suggestedCategory = 'professional';
        confidence = 0.95;
      } else if (primaryPlayer.level === 'advanced') {
        suggestedCategory = 'advanced';
        confidence = 0.85;
      }

      // Age-based adjustments
      const age = calculateAge(primaryPlayer.createdAt);
      if (age < 18) {
        suggestedCategory = 'junior';
        confidence = 1.0;
      } else if (age > 45) {
        // Could suggest senior category
        factors.push({
          type: 'age',
          value: age,
          weight: 0.3,
          contribution: 0.3,
        });
      }

      const calc: CategoryCalculation = {
        suggestedCategory,
        confidence,
        factors,
        alternativeCategories: ['open', 'intermediate', 'advanced'].filter(
          (cat) => cat !== suggestedCategory
        ) as TournamentCategory[],
      };

      setCalculation(calc);

      // Set available categories for this tournament
      const available: TournamentCategory[] = [
        tournament.category as TournamentCategory,
      ];
      if (tournament.category === 'open') {
        available.push('beginner', 'intermediate', 'advanced');
      }
      setAvailableCategories(available);
    } catch (error) {
          } finally {
      setIsCalculating(false);
    }
  };

  const calculateAge = (birthDate: string): number => {
    // Mock calculation - replace with actual birth date logic
    return 25;
  };

  const getFactorIcon = (type: CategoryFactor['type']) => {
    switch (type) {
      case 'skill_level':
        return TrendingUp;
      case 'tournament_history':
        return Award;
      case 'age':
        return Calendar;
      case 'ranking':
        return Users;
      case 'coach_recommendation':
        return Brain;
      default:
        return Info;
    }
  };

  const getFactorLabel = (type: CategoryFactor['type']): string => {
    switch (type) {
      case 'skill_level':
        return 'Nivel de habilidad';
      case 'tournament_history':
        return 'Historial de torneos';
      case 'age':
        return 'Edad';
      case 'ranking':
        return 'Ranking/Estadísticas';
      case 'coach_recommendation':
        return 'Recomendación del entrenador';
      default:
        return 'Otro factor';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'Alta confianza';
    if (confidence >= 0.6) return 'Confianza media';
    return 'Baja confianza';
  };

  return (
    <Controller
      control={control}
      name="selectedCategory"
      render={({ field: { onChange, value } }) => (
        <div className={cn('space-y-6', className)}>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Calculadora de Categoría
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Te ayudamos a encontrar la categoría más apropiada según tu perfil
            </p>
          </div>

          {/* Calculation Loading/Results */}
          {isCalculating ? (
            <Card className="p-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">
                  Analizando tu perfil...
                </span>
              </div>
            </Card>
          ) : calculation ? (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Categoría Recomendada
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      className={cn(
                        'text-lg font-bold',
                        CATEGORY_INFO[calculation.suggestedCategory].color
                      )}
                    >
                      {CATEGORY_INFO[calculation.suggestedCategory].label}
                    </Badge>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        getConfidenceColor(calculation.confidence)
                      )}
                    >
                      {getConfidenceLabel(calculation.confidence)} (
                      {Math.round(calculation.confidence * 100)}%)
                    </span>
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {CATEGORY_INFO[calculation.suggestedCategory].description}
              </p>

              {/* Factors Analysis */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900 dark:text-white">
                  Factores analizados:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {calculation.factors.map((factor, index) => {
                    const Icon = getFactorIcon(factor.type);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <Icon className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {getFactorLabel(factor.type)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Peso: {Math.round(factor.weight * 100)}% |
                            Contribución:{' '}
                            {Math.round(factor.contribution * 100)}%
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                onClick={() => {
                  onChange(calculation.suggestedCategory);
                  onCategorySelect(calculation.suggestedCategory);
                }}
                className="w-full"
                variant={
                  selectedCategory === calculation.suggestedCategory
                    ? 'default'
                    : 'outline'
                }
              >
                {selectedCategory === calculation.suggestedCategory ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Categoría Seleccionada
                  </>
                ) : (
                  <>Seleccionar Categoría Recomendada</>
                )}
              </Button>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="text-center space-y-3">
                <Brain className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Análisis no disponible
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Necesitamos más información del jugador para realizar el
                    análisis
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={calculateCategory}
                  disabled={!primaryPlayer}
                >
                  Calcular Categoría
                </Button>
              </div>
            </Card>
          )}

          {/* Available Categories */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Categorías Disponibles en este Torneo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(CATEGORY_INFO)
                .filter(
                  ([key]) =>
                    key === tournament.category ||
                    tournament.category === 'open'
                )
                .map(([key, info]) => {
                  const category = key as TournamentCategory;
                  const isSelected = selectedCategory === category;
                  const isRecommended =
                    calculation?.suggestedCategory === category;

                  return (
                    <motion.button
                      key={category}
                      type="button"
                      onClick={() => {
                        onChange(category);
                        onCategorySelect(category);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all text-left',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
                        info.bgColor.replace('bg-', 'hover:bg-')
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          className={cn('font-bold', info.color)}
                          variant={isSelected ? 'default' : 'secondary'}
                        >
                          {info.label}
                        </Badge>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                        {isRecommended && !isSelected && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-600">
                              Recomendada
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {info.description}
                      </p>

                      <div className="space-y-1">
                        {info.requirements.map((req, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-xs text-gray-500"
                          >
                            <div className="w-1 h-1 bg-gray-400 rounded-full" />
                            {req}
                          </div>
                        ))}
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          </div>

          {/* Alternative Categories */}
          {calculation?.alternativeCategories &&
            calculation.alternativeCategories.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <h5 className="font-medium text-gray-900 dark:text-white">
                    Categorías Alternativas
                  </h5>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  También podrías considerar estas categorías:
                </p>
                <div className="flex flex-wrap gap-2">
                  {calculation.alternativeCategories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onChange(category);
                        onCategorySelect(category);
                      }}
                      className={cn(
                        selectedCategory === category &&
                          'bg-blue-50 border-blue-500'
                      )}
                    >
                      {CATEGORY_INFO[category].label}
                    </Button>
                  ))}
                </div>
              </Card>
            )}
        </div>
      )}
    />
  );
};

export default CategoryCalculator;
