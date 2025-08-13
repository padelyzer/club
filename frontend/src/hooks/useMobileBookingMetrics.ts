import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/store/ui';

interface BookingMetrics {
  sessionId: string;
  startTime: number;
  steps: Array<{
    step: string;
    timestamp: number;
    duration: number;
  }>;
  touchTargetInteractions: Array<{
    element: string;
    size: { width: number; height: number };
    timestamp: number;
    success: boolean;
  }>;
  errors: Array<{
    step: string;
    error: string;
    timestamp: number;
  }>;
  deviceInfo: {
    isMobile: boolean;
    screenWidth: number;
    screenHeight: number;
    userAgent: string;
  };
  completed: boolean;
  completionTime?: number;
  abandonedAt?: string;
}

interface UseMobileBookingMetricsReturn {
  startTracking: () => void;
  trackStepChange: (step: string) => void;
  trackTouchInteraction: (element: string, target: EventTarget | null) => void;
  trackError: (step: string, error: string) => void;
  trackCompletion: () => void;
  trackAbandonment: (step: string) => void;
  getMetrics: () => BookingMetrics;
  exportMetrics: () => string;
}

export const useMobileBookingMetrics = (): UseMobileBookingMetricsReturn => {
  const [metrics, setMetrics] = useState<BookingMetrics>({
    sessionId: generateSessionId(),
    startTime: 0,
    steps: [],
    touchTargetInteractions: [],
    errors: [],
    deviceInfo: {
      isMobile: false,
      screenWidth: 0,
      screenHeight: 0,
      userAgent: '',
    },
    completed: false,
  });

  const currentStep = useRef<string>('');
  const stepStartTime = useRef<number>(0);

  useEffect(() => {
    // Initialize device info
    if (typeof window !== 'undefined') {
      setMetrics(prev => ({
        ...prev,
        deviceInfo: {
          isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          userAgent: navigator.userAgent,
        },
      }));
    }
  }, []);

  const startTracking = () => {
    const startTime = Date.now();
    setMetrics(prev => ({
      ...prev,
      startTime,
      sessionId: generateSessionId(),
      steps: [],
      touchTargetInteractions: [],
      errors: [],
      completed: false,
      completionTime: undefined,
      abandonedAt: undefined,
    }));
  };

  const trackStepChange = (step: string) => {
    const now = Date.now();
    
    // Record previous step duration if exists
    if (currentStep.current && stepStartTime.current > 0) {
      const duration = now - stepStartTime.current;
      setMetrics(prev => ({
        ...prev,
        steps: [...prev.steps, {
          step: currentStep.current,
          timestamp: stepStartTime.current,
          duration,
        }],
      }));
    }

    // Set new step
    currentStep.current = step;
    stepStartTime.current = now;
  };

  const trackTouchInteraction = (element: string, target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return;

    const rect = target.getBoundingClientRect();
    const size = {
      width: rect.width,
      height: rect.height,
    };

    // Check if touch target meets Apple HIG requirements (44x44px minimum)
    const success = size.width >= 44 && size.height >= 44;

    setMetrics(prev => ({
      ...prev,
      touchTargetInteractions: [...prev.touchTargetInteractions, {
        element,
        size,
        timestamp: Date.now(),
        success,
      }],
    }));
  };

  const trackError = (step: string, error: string) => {
    setMetrics(prev => ({
      ...prev,
      errors: [...prev.errors, {
        step,
        error,
        timestamp: Date.now(),
      }],
    }));
  };

  const trackCompletion = () => {
    const completionTime = Date.now() - metrics.startTime;
    
    setMetrics(prev => ({
      ...prev,
      completed: true,
      completionTime,
    }));

    // Send metrics to analytics service
    sendMetricsToAnalytics(metrics, completionTime);
  };

  const trackAbandonment = (step: string) => {
    setMetrics(prev => ({
      ...prev,
      abandonedAt: step,
    }));

    // Send abandonment metrics
    sendAbandonmentMetrics(metrics, step);
  };

  const getMetrics = () => metrics;

  const exportMetrics = () => {
    const report = generateMobileBookingReport(metrics);
    return JSON.stringify(report, null, 2);
  };

  return {
    startTracking,
    trackStepChange,
    trackTouchInteraction,
    trackError,
    trackCompletion,
    trackAbandonment,
    getMetrics,
    exportMetrics,
  };
};

// Helper functions
function generateSessionId(): string {
  return `mobile-booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function sendMetricsToAnalytics(metrics: BookingMetrics, completionTime: number) {
  // In a real app, this would send to your analytics service
  console.log('Mobile Booking Metrics:', {
    completionTime,
    errorCount: metrics.errors.length,
    deviceInfo: metrics.deviceInfo,
  });

  // Send to external analytics (e.g., Google Analytics, Mixpanel)
  if (window.gtag) {
    window.gtag('event', 'mobile_booking_completion', {
      completion_time: completionTime / 1000,
      steps_count: metrics.steps.length,
      touch_compliance: calculateTouchTargetCompliance(metrics.touchTargetInteractions),
      device_type: metrics.deviceInfo.isMobile ? 'mobile' : 'desktop',
    });
  }
}

function sendAbandonmentMetrics(metrics: BookingMetrics, abandonedStep: string) {
  const timeSpent = (Date.now() - metrics.startTime) / 1000;
  
  // Send to analytics
  console.log('Abandonment metrics:', {
    abandonedStep,
    timeSpent,
    completedSteps: metrics.steps.length,
    lastError: metrics.errors[metrics.errors.length - 1],
  });

  if (window.gtag) {
    window.gtag('event', 'mobile_booking_abandonment', {
      abandoned_step: abandonedStep,
      time_spent: (Date.now() - metrics.startTime) / 1000,
      completed_steps: metrics.steps.length,
    });
  }
}

function calculateTouchTargetCompliance(interactions: BookingMetrics['touchTargetInteractions']): number {
  if (interactions.length === 0) return 100;
  
  const compliantInteractions = interactions.filter(i => i.success).length;
  return (compliantInteractions / interactions.length) * 100;
}

function generateMobileBookingReport(metrics: BookingMetrics) {
  const totalTime = metrics.completionTime || (Date.now() - metrics.startTime);
  const touchCompliance = calculateTouchTargetCompliance(metrics.touchTargetInteractions);
  
  return {
    summary: {
      sessionId: metrics.sessionId,
      success: metrics.completed,
      totalTimeSeconds: totalTime / 1000,
      stepsCompleted: metrics.steps.length,
      touchTargetCompliance: touchCompliance,
      errorCount: metrics.errors.length,
      abandonedAt: metrics.abandonedAt,
    },
    performance: {
      averageStepTime: metrics.steps.length > 0 
        ? metrics.steps.reduce((sum, step) => sum + step.duration, 0) / metrics.steps.length / 1000
        : 0,
      longestStep: metrics.steps.length > 0
        ? Math.max(...metrics.steps.map(s => s.duration)) / 1000
        : 0,
      quickestStep: metrics.steps.length > 0
        ? Math.min(...metrics.steps.map(s => s.duration)) / 1000
        : 0,
    },
    usability: {
      touchTargetCompliance,
      smallTargetsCount: metrics.touchTargetInteractions.filter(i => !i.success).length,
      averageTargetSize: metrics.touchTargetInteractions.length > 0
        ? metrics.touchTargetInteractions.reduce((sum, i) => sum + (i.size.width * i.size.height), 0) / metrics.touchTargetInteractions.length
        : 0,
    },
    device: metrics.deviceInfo,
    timeline: metrics.steps,
    errors: metrics.errors,
    recommendations: generateRecommendations(metrics, touchCompliance),
  };
}

function generateRecommendations(metrics: BookingMetrics, touchCompliance: number) {
  const recommendations = [];
  
  if (touchCompliance < 90) {
    recommendations.push('Increase touch target sizes to meet 44x44px minimum');
  }
  
  if (metrics.errors.length > 0) {
    recommendations.push('Reduce form validation errors with better input patterns');
  }
  
  const avgStepTime = metrics.steps.length > 0 
    ? metrics.steps.reduce((sum, step) => sum + step.duration, 0) / metrics.steps.length / 1000
    : 0;
    
  if (avgStepTime > 30) {
    recommendations.push('Optimize step complexity to reduce average step time');
  }
  
  if (!metrics.completed && metrics.abandonedAt) {
    recommendations.push(`Focus on improving the "${metrics.abandonedAt}" step where users abandon most`);
  }
  
  return recommendations;
}

// Global analytics interface
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}