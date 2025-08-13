'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Trophy,
  DollarSign,
  Euro,
  Plus,
  Trash2,
  Info,
  Settings,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Calculator,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { WizardStepProps } from '../tournament-form-types';

// Configuraciones de sistemas de puntos
const pointsSystems = {
  standard: {
    name: 'Standard Padel',
    description: 'Traditional padel scoring (15, 30, 40, Game)',
    details: 'Best of 3 sets, win by 2 games, tiebreak at 6-6',
    matchDuration: '60-90 minutes',
  },
  advantage: {
    name: 'Advantage Set',
    description: 'Sets must be won by 2 games with no tiebreak',
    details: 'Traditional tennis-style advantage sets',
    matchDuration: '75-120 minutes',
  },
  'no-advantage': {
    name: 'No Advantage',
    description: 'Deuce games decided by next point',
    details: 'Faster games, immediate decision at deuce',
    matchDuration: '45-75 minutes',
  },
  tiebreak: {
    name: 'Super Tiebreak',
    description: 'Matches decided by super tiebreak at 1-1 sets',
    details: 'First to 10 points, win by 2',
    matchDuration: '30-60 minutes',
  },
};

// Currencies disponibles
const currencies = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
];

// Componente de distribución de premios
const PrizeDistribution: React.FC<{
  prizeMoney: number;
  currency: string;
  maxParticipants: number;
  onDistributionChange: (distribution: any[]) => void;
}> = ({ prizeMoney, currency, maxParticipants, onDistributionChange }) => {
  const { t } = useTranslation();
  const [distribution, setDistribution] = useState([
    { position: 1, percentage: 50, amount: 0, description: 'Winner' },
    { position: 2, percentage: 30, amount: 0, description: 'Runner-up' },
    { position: 3, percentage: 20, amount: 0, description: 'Semi-finalist' },
  ]);

  const currencySymbol =
    currencies.find((c) => c.code === currency)?.symbol || '€';

  // Calcular montos basados en porcentajes
  useEffect(() => {
    const newDistribution = distribution.map((prize) => ({
      ...prize,
      amount: Math.round((prizeMoney * prize.percentage) / 100),
    }));
    setDistribution(newDistribution);
    onDistributionChange(newDistribution);
  }, [prizeMoney, distribution.map((d) => d.percentage).join(',')]);

  const addPrizePosition = () => {
    if (distribution.length < 8) {
      setDistribution([
        ...distribution,
        {
          position: distribution.length + 1,
          percentage: 0,
          amount: 0,
          description: `Position ${distribution.length + 1}`,
        },
      ]);
    }
  };

  const removePrizePosition = (index: number) => {
    if (distribution.length > 1) {
      setDistribution(distribution.filter((_, i) => i !== index));
    }
  };

  const updatePrizePercentage = (index: number, percentage: number) => {
    const newDistribution = [...distribution];
    newDistribution[index].percentage = Math.max(0, Math.min(100, percentage));
    setDistribution(newDistribution);
  };

  const totalPercentage = distribution.reduce(
    (sum, prize) => sum + prize.percentage,
    0
  );
  const totalAmount = distribution.reduce(
    (sum, prize) => sum + prize.amount,
    0
  );

  // Distribuciones predefinidas
  const applyPresetDistribution = (preset: string) => {
    let newDistribution = [];

    switch (preset) {
      case 'winner-takes-all':
        newDistribution = [
          { position: 1, percentage: 100, amount: 0, description: 'Winner' },
        ];
        break;
      case 'top-2':
        newDistribution = [
          { position: 1, percentage: 70, amount: 0, description: 'Winner' },
          { position: 2, percentage: 30, amount: 0, description: 'Runner-up' },
        ];
        break;
      case 'top-4':
        newDistribution = [
          { position: 1, percentage: 40, amount: 0, description: 'Winner' },
          { position: 2, percentage: 25, amount: 0, description: 'Runner-up' },
          {
            position: 3,
            percentage: 20,
            amount: 0,
            description: 'Semi-finalist',
          },
          {
            position: 4,
            percentage: 15,
            amount: 0,
            description: 'Semi-finalist',
          },
        ];
        break;
      default:
        return;
    }

    setDistribution(newDistribution);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
          {t('tournaments.form.prizeDistribution')}
        </h4>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPresetDistribution('winner-takes-all')}
          >
            {t('tournaments.form.presets.winnerTakesAll')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPresetDistribution('top-2')}
          >
            {t('tournaments.form.presets.top2')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPresetDistribution('top-4')}
          >
            {t('tournaments.form.presets.top4')}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {distribution.map((prize, index) => (
          <div
            key={index}
            className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                {prize.position}
              </span>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-3">
              <Input
                placeholder={t('tournaments.form.positionDescription')}
                value={prize.description || ''}
                onChange={(e) => {
                  const newDistribution = [...distribution];
                  newDistribution[index].description = e.target.value;
                  setDistribution(newDistribution);
                }}
              />

              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={prize.percentage || ''}
                  onChange={(e) =>
                    updatePrizePercentage(index, parseInt(e.target.value) || 0)
                  }
                  className="text-center"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>

              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {currencySymbol}
                  {prize.amount.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removePrizePosition(index)}
              disabled={distribution.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={addPrizePosition}
          disabled={distribution.length >= 8}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('tournaments.form.addPosition')}
        </Button>

        <div className="text-right">
          <div className="text-sm text-gray-500">
            {t('tournaments.form.totalDistribution')}: {totalPercentage}%
          </div>
          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {currencySymbol}
            {totalAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Validación de distribución */}
      {totalPercentage !== 100 && prizeMoney > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              {totalPercentage > 100
                ? t('tournaments.form.distributionExceeds100')
                : t('tournaments.form.distributionUnder100', {
                    remaining: 100 - totalPercentage,
                  })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const TournamentRulesPrizes: React.FC<WizardStepProps> = ({
  data,
  errors,
  register,
  watch,
  setValue,
}) => {
  const { t } = useTranslation();

  const watchEntryFee = watch('entryFee') || 0;
  const watchPrizeMoney = watch('prizeMoney') || 0;
  const watchCurrency = watch('currency') || 'EUR';
  const watchPointsSystem = watch('pointsSystem') || 'standard';
  const watchRules = watch('rules') || '';
  const watchRequiresApproval = watch('requiresApproval') || false;
  const watchAllowWalkIns = watch('allowWalkIns') || false;
  const watchMaxParticipants = watch('maxParticipants') || 16;

  const [charCount, setCharCount] = useState(watchRules.length);

  const currencySymbol =
    currencies.find((c) => c.code === watchCurrency)?.symbol || '€';

  // Calcular ingresos totales estimados
  const totalRevenue = watchEntryFee * watchMaxParticipants;
  const profit = totalRevenue - watchPrizeMoney;

  useEffect(() => {
    setCharCount(watchRules.length);
  }, [watchRules]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
          <Award className="h-8 w-8 text-yellow-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('tournaments.form.steps.rules.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('tournaments.form.steps.rules.description')}
        </p>
      </div>

      {/* Precios y premios */}
      <div>
        <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('tournaments.form.pricingPrizes')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="currency">
              {t('tournaments.form.fields.currency')} *
            </Label>
            <Select
              value={watchCurrency || ''}
              onValueChange={(value) => setValue('currency', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code || ''}>
                    {currency.symbol} {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="entryFee" className="flex items-center">
              {t('tournaments.form.fields.entryFee')} *
              <span className="ml-1 text-gray-500">({currencySymbol})</span>
            </Label>
            <Input
              id="entryFee"
              type="number"
              min="0"
              step="0.01"
              {...register('entryFee', { valueAsNumber: true })}
              className={cn('mt-1', errors.entryFee && 'border-red-500')}
            />
            {errors.entryFee && (
              <p className="mt-1 text-sm text-red-600">
                {errors.entryFee.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="prizeMoney" className="flex items-center">
              {t('tournaments.form.fields.prizeMoney')}
              <span className="ml-1 text-gray-500">({currencySymbol})</span>
            </Label>
            <Input
              id="prizeMoney"
              type="number"
              min="0"
              step="0.01"
              {...register('prizeMoney', { valueAsNumber: true })}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('tournaments.form.hints.prizeMoney')}
            </p>
          </div>
        </div>

        {/* Resumen financiero */}
        {watchEntryFee > 0 && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h5 className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">
              {t('tournaments.form.financialSummary')}
            </h5>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-green-700 dark:text-green-300">
                  {t('tournaments.form.totalRevenue')}:
                </span>
                <p className="font-medium">
                  {currencySymbol}
                  {totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {watchMaxParticipants} × {currencySymbol}
                  {watchEntryFee}
                </p>
              </div>
              <div>
                <span className="text-green-700 dark:text-green-300">
                  {t('tournaments.form.totalPrizes')}:
                </span>
                <p className="font-medium">
                  {currencySymbol}
                  {watchPrizeMoney.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {((watchPrizeMoney / totalRevenue) * 100 || 0).toFixed(1)}%{' '}
                  {t('tournaments.form.ofRevenue')}
                </p>
              </div>
              <div>
                <span className="text-green-700 dark:text-green-300">
                  {t('tournaments.form.netProfit')}:
                </span>
                <p
                  className={cn(
                    'font-medium',
                    profit >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {currencySymbol}
                  {profit.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {((profit / totalRevenue) * 100 || 0).toFixed(1)}%{' '}
                  {t('tournaments.form.margin')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Distribución de premios */}
      {watchPrizeMoney > 0 && (
        <PrizeDistribution
          prizeMoney={watchPrizeMoney}
          currency={watchCurrency}
          maxParticipants={watchMaxParticipants}
          onDistributionChange={(distribution) =>
            setValue('prizeDistribution', distribution)
          }
        />
      )}

      {/* Sistema de puntos */}
      <div>
        <Label className="text-base font-medium mb-4 block">
          {t('tournaments.form.fields.pointsSystem')} *
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(pointsSystems).map(([system, config]) => {
            const isSelected = watchPointsSystem === system;

            return (
              <div
                key={system}
                className={cn(
                  'p-4 border rounded-lg cursor-pointer transition-all duration-200',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
                onClick={() => setValue('pointsSystem', system)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4
                      className={cn(
                        'font-medium',
                        isSelected
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {config.name}
                    </h4>
                    <p
                      className={cn(
                        'text-sm mt-1',
                        isSelected
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                    >
                      {config.description}
                    </p>
                    <p
                      className={cn(
                        'text-xs mt-2',
                        isSelected
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500'
                      )}
                    >
                      {config.details}
                    </p>
                  </div>
                  <Badge
                    variant={isSelected ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {config.matchDuration}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reglas específicas */}
      <div>
        <Label htmlFor="rules" className="flex items-center justify-between">
          <span>{t('tournaments.form.fields.rules')}</span>
          <span
            className={cn(
              'text-xs',
              charCount > 1000 ? 'text-red-500' : 'text-gray-400'
            )}
          >
            {charCount}/1000
          </span>
        </Label>
        <textarea
          id="rules"
          {...register('rules')}
          placeholder={t('tournaments.form.placeholders.rules')}
          rows={5}
          maxLength={1000}
          className={cn(
            'mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            'resize-none'
          )}
        />
        <p className="mt-2 text-xs text-gray-500">
          {t('tournaments.form.hints.rules')}
        </p>
      </div>

      {/* Configuraciones adicionales */}
      <div>
        <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('tournaments.form.additionalSettings')}
        </h4>
        <div className="space-y-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              {...register('requiresApproval')}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
            />
            <div className="ml-3">
              <span className="text-gray-900 dark:text-gray-100">
                {t('tournaments.form.fields.requiresApproval')}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                {t('tournaments.form.hints.requiresApproval')}
              </p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              {...register('allowWalkIns')}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
            />
            <div className="ml-3">
              <span className="text-gray-900 dark:text-gray-100">
                {t('tournaments.form.fields.allowWalkIns')}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                {t('tournaments.form.hints.allowWalkIns')}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Información de ayuda */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          {t('tournaments.form.tips.title')}
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• {t('tournaments.form.tips.rules.pricing')}</li>
          <li>• {t('tournaments.form.tips.rules.prizes')}</li>
          <li>• {t('tournaments.form.tips.rules.pointsSystem')}</li>
          <li>• {t('tournaments.form.tips.rules.approval')}</li>
        </ul>
      </div>
    </motion.div>
  );
};
