'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Users,
  BarChart3,
  Settings,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    label: string;
    onClick: () => void;
  };
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Padelyzer!',
    description:
      "Your complete padel court management solution. Let's take a quick tour to get you started.",
    icon: CheckCircle,
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    description:
      "Monitor your club's performance with real-time KPIs, charts, and quick insights.",
    icon: BarChart3,
    target: '[data-tour="dashboard"]',
    position: 'bottom',
  },
  {
    id: 'reservations',
    title: 'Manage Reservations',
    description:
      'Create, edit, and track court reservations with our intuitive calendar and timeline views.',
    icon: Calendar,
    target: '[data-tour="reservations"]',
    position: 'bottom',
  },
  {
    id: 'players',
    title: 'Player Management',
    description:
      'Keep track of players, their statistics, and performance analytics.',
    icon: Users,
    target: '[data-tour="players"]',
    position: 'bottom',
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    description:
      'Configure your preferences, notifications, and system settings.',
    icon: Settings,
    target: '[data-tour="settings"]',
    position: 'bottom',
    action: {
      label: 'Open Settings',
      onClick: () => useUIStore.getState().openModal('settings'),
    },
  },
];

export const OnboardingFlow: React.FC = () => {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [highlightElement, setHighlightElement] = useState<Element | null>(
    null
  );

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  // Handle highlighting target elements
  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      setHighlightElement(element);
    } else {
      setHighlightElement(null);
    }
  }, [step.target]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding-${user.id}`, 'completed');
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const getTooltipPosition = () => {
    if (!highlightElement || step.position === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const rect = highlightElement.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const offset = 16;

    switch (step.position) {
      case 'top':
        return {
          position: 'fixed' as const,
          bottom: window.innerHeight - rect.top + offset,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          position: 'fixed' as const,
          top: rect.bottom + offset,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          position: 'fixed' as const,
          top: rect.top + rect.height / 2,
          right: window.innerWidth - rect.left + offset,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          position: 'fixed' as const,
          top: rect.top + rect.height / 2,
          left: rect.right + offset,
          transform: 'translateY(-50%)',
        };
      default:
        return {
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with spotlight effect */}
      <div className="absolute inset-0 bg-black/50">
        {highlightElement && (
          <div
            className="absolute rounded-lg ring-4 ring-blue-500 ring-opacity-75 pointer-events-none"
            style={{
              top: highlightElement.getBoundingClientRect().top - 4,
              left: highlightElement.getBoundingClientRect().left - 4,
              width: highlightElement.getBoundingClientRect().width + 8,
              height: highlightElement.getBoundingClientRect().height + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full mx-4"
        style={getTooltipPosition()}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Content */}
        <div className="pr-8">
          {/* Icon */}
          <div className="flex items-center justify-center h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg mb-4">
            <step.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {step.description}
          </p>

          {/* Action button */}
          {step.action && (
            <button
              onClick={step.action.onClick}
              className="w-full mb-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              {step.action.label}
            </button>
          )}

          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-1">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-2 w-2 rounded-full transition-colors',
                    index === currentStep
                      ? 'bg-blue-600 dark:bg-blue-400'
                      : index < currentStep
                        ? 'bg-blue-300 dark:bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentStep + 1} of {onboardingSteps.length}
            </span>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={cn(
                'flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isFirstStep
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="flex space-x-2">
              <button
                onClick={handleSkip}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Skip
              </button>

              <button
                onClick={handleNext}
                className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <span>{isLastStep ? 'Get Started' : 'Next'}</span>
                {!isLastStep && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to trigger onboarding programmatically
export const useOnboarding = () => {
  const { user } = useAuthStore();

  const startOnboarding = () => {
    if (user) {
      localStorage.removeItem(`onboarding-${user.id}`);
      window.location.reload();
    }
  };

  const hasCompletedOnboarding = () => {
    if (!user) return false;
    return localStorage.getItem(`onboarding-${user.id}`) === 'completed';
  };

  return {
    startOnboarding,
    hasCompletedOnboarding,
  };
};
