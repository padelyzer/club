'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, TrendingUp, Award, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SKILL_LEVELS } from '@/types/client';

interface SkillLevelSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showDescription?: boolean;
  showRecommendation?: boolean;
  className?: string;
}

export function SkillLevelSelector({
  value,
  onChange,
  disabled = false,
  showDescription = true,
  showRecommendation = false,
  className,
}: SkillLevelSelectorProps) {
  const { t } = useTranslation();
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);

  const getCurrentLevel = () => {
    return SKILL_LEVELS.find(level => level.value === value) || SKILL_LEVELS[0];
  };

  const getLevelColor = (level: number): string => {
    if (level <= 2.0) return 'bg-green-500';
    if (level <= 3.0) return 'bg-blue-500';
    if (level <= 4.0) return 'bg-purple-500';
    if (level <= 5.0) return 'bg-orange-500';
    if (level <= 6.0) return 'bg-red-500';
    return 'bg-gradient-to-r from-red-500 to-purple-600';
  };

  const getLevelBadgeVariant = (level: number) => {
    if (level <= 2.0) return 'bg-green-100 text-green-800 border-green-200';
    if (level <= 3.0) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (level <= 4.0) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (level <= 5.0) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (level <= 6.0) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gradient-to-r from-red-100 to-purple-100 text-red-800 border-red-200';
  };

  const currentLevel = getCurrentLevel();

  const skillAssessmentQuestions = [
    {
      id: 'experience',
      question: t('clients.skillAssessment.experienceQuestion'),
      options: [
        { value: 1.0, label: t('clients.skillAssessment.experience.newbie') },
        { value: 2.0, label: t('clients.skillAssessment.experience.beginner') },
        { value: 3.0, label: t('clients.skillAssessment.experience.recreational') },
        { value: 4.0, label: t('clients.skillAssessment.experience.competitive') },
        { value: 5.0, label: t('clients.skillAssessment.experience.advanced') },
        { value: 6.0, label: t('clients.skillAssessment.experience.expert') },
      ]
    },
    {
      id: 'technique',
      question: t('clients.skillAssessment.techniqueQuestion'),
      options: [
        { value: 1.0, label: t('clients.skillAssessment.technique.learning') },
        { value: 2.5, label: t('clients.skillAssessment.technique.basic') },
        { value: 3.5, label: t('clients.skillAssessment.technique.good') },
        { value: 4.5, label: t('clients.skillAssessment.technique.excellent') },
        { value: 5.5, label: t('clients.skillAssessment.technique.professional') },
      ]
    }
  ];

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Current Level Display */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              {t('clients.skillLevel')}
            </label>
            {showDescription && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('clients.skillLevelDescription')}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={cn('font-semibold border', getLevelBadgeVariant(value))}>
              {currentLevel.label}
            </Badge>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsAssessmentOpen(true)}
                >
                  <Info className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('clients.skillAssessment.help')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Level Slider */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="relative">
              <Slider
                value={[value] || ''}
                onValueChange={(values) => onChange(values[0])}
                min={1.0}
                max={7.0}
                step={0.5}
                disabled={disabled}
                className="w-full"
              />
              
              {/* Level markers */}
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>1.0</span>
                <span>2.0</span>
                <span>3.0</span>
                <span>4.0</span>
                <span>5.0</span>
                <span>6.0</span>
                <span>7.0</span>
              </div>
            </div>

            {/* Current Level Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className={cn('w-3 h-3 rounded-full', getLevelColor(value))} />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {currentLevel.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {currentLevel.description}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Level Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SKILL_LEVELS.filter((_, index) => index % 2 === 0).map((level) => (
            <Button
              key={level.value}
              variant={value === level.value ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(level.value)}
              disabled={disabled}
              className="h-auto py-2 px-3 text-xs"
            >
              <div className="text-center">
                <div className="font-semibold">{level.value}</div>
                <div className="text-xs opacity-75">
                  {level.label.split(' (')[0]}
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* Skill Assessment Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAssessmentOpen(true)}
          className="w-full"
          disabled={disabled}
        >
          <Target className="mr-2 h-4 w-4" />
          {t('clients.skillAssessment.title')}
        </Button>

        {/* Recommendations */}
        {showRecommendation && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  {t('clients.skillRecommendation.title')}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {value < 3.0 
                    ? t('clients.skillRecommendation.beginner')
                    : value < 4.5
                    ? t('clients.skillRecommendation.intermediate')
                    : t('clients.skillRecommendation.advanced')
                  }
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Level Benefits */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1 mb-1">
            <Award className="h-3 w-3" />
            <span>{t('clients.skillLevel.benefits.title')}</span>
          </div>
          <ul className="list-disc list-inside ml-4 space-y-0.5">
            <li>{t('clients.skillLevel.benefits.matching')}</li>
            <li>{t('clients.skillLevel.benefits.tournaments')}</li>
            <li>{t('clients.skillLevel.benefits.rankings')}</li>
          </ul>
        </div>
      </div>
    </TooltipProvider>
  );
}