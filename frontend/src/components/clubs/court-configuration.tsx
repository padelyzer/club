'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourtConfigurationProps {
  courtsCount: number;
  onCourtsCountChange: (count: number) => void;
  className?: string;
}

const courtLimits = {
  basic: 2,
  competitions: 5,
  finance: 10,
  bi: 15,
  complete: 50,
  custom: 50,
};

export function CourtConfiguration({
  courtsCount,
  onCourtsCountChange,
  className,
}: CourtConfigurationProps) {
  const [tempValue, setTempValue] = useState(courtsCount.toString());

  const handleInputChange = (value: string) => {
    setTempValue(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 50) {
      onCourtsCountChange(numValue);
    }
  };

  const incrementCourts = () => {
    if (courtsCount < 50) {
      const newValue = courtsCount + 1;
      setTempValue(newValue.toString());
      onCourtsCountChange(newValue);
    }
  };

  const decrementCourts = () => {
    if (courtsCount > 1) {
      const newValue = courtsCount - 1;
      setTempValue(newValue.toString());
      onCourtsCountChange(newValue);
    }
  };

  return (
    <Card className={cn('p-6', className)}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Configuración de Canchas
          </h3>
          <Info className="w-4 h-4 text-gray-400" />
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Define el número inicial de canchas para tu club. Podrás agregar más canchas después.
        </p>

        {/* Court Counter */}
        <div className="space-y-3">
          <Label htmlFor="courts_count">Número de Canchas</Label>
          
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={decrementCourts}
              disabled={courtsCount <= 1}
              className="h-10 w-10"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="relative">
              <Input
                id="courts_count"
                type="number"
                min="1"
                max="50"
                value={tempValue || ''}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-20 text-center font-semibold"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={incrementCourts}
              disabled={courtsCount >= 50}
              className="h-10 w-10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Visual Court Display */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: Math.min(courtsCount, 12) }, (_, i) => (
                <div
                  key={i}
                  className="w-12 h-8 bg-green-100 dark:bg-green-900 border-2 border-green-300 dark:border-green-700 rounded flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-300"
                >
                  {i + 1}
                </div>
              ))}
              {courtsCount > 12 && (
                <div className="w-12 h-8 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-xs font-medium text-gray-500">
                  +{courtsCount - 12}
                </div>
              )}
            </div>
          </div>

          {/* Court Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  ¿Sabías que?
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  El número de canchas afecta la capacidad de reservas y gestión del club. 
                  Podrás agregar, modificar o desactivar canchas en cualquier momento desde 
                  la configuración del club.
                </p>
              </div>
            </div>
          </div>

          {/* Plan Limits Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Límites por plan:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(courtLimits).map(([plan, limit]) => (
                <div
                  key={plan}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                >
                  <span className="capitalize font-medium">
                    {plan === 'bi' ? 'BI' : plan}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {limit === 50 ? '∞' : limit}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}