'use client';

import * as React from 'react';
import { motion, MotionProps, AnimatePresence } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springPresets, commonVariants } from '@/lib/animations/spring-presets';
import { useHapticFeedback, HapticIntensity } from '@/lib/animations/haptic-feedback';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 backdrop-blur-sm relative overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-apple hover:bg-primary/90 hover:shadow-apple-lg',
        destructive:
          'bg-destructive text-destructive-foreground shadow-apple hover:bg-destructive/90 hover:shadow-apple-lg',
        outline:
          'border border-input/20 bg-background/50 text-foreground hover:bg-accent/50 hover:text-accent-foreground shadow-apple hover:shadow-apple-lg backdrop-blur-md',
        secondary:
          'bg-secondary/80 text-secondary-foreground hover:bg-secondary/60 shadow-apple hover:shadow-apple-lg backdrop-blur-sm',
        ghost: 'hover:bg-accent/50 hover:text-accent-foreground backdrop-blur-sm',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-green-600 text-white shadow-apple hover:bg-green-700 hover:shadow-apple-lg',
        warning: 'bg-yellow-600 text-white shadow-apple hover:bg-yellow-700 hover:shadow-apple-lg',
      },
      size: {
        default: 'h-11 px-4 py-2 min-h-[44px]',
        sm: 'h-11 rounded-md px-3 text-sm min-h-[44px]',
        lg: 'h-12 rounded-xl px-8 min-h-[48px] text-base',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px]',
      },
      animation: {
        none: '',
        gentle: '',
        bouncy: '',
        pulse: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'gentle',
    },
  }
);

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export interface AnimatedButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationEnd'>,
    VariantProps<typeof buttonVariants>,
    Omit<MotionProps, 'children'> {
  asChild?: boolean;
  loading?: boolean;
  state?: ButtonState;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  successDuration?: number;
  errorDuration?: number;
  hapticFeedback?: HapticIntensity;
  showRipple?: boolean;
  onStateChange?: (state: ButtonState) => void;
  children: React.ReactNode;
}

// Ripple effect component
const RippleEffect: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <AnimatePresence>
    {isActive && (
      <motion.div
        className="absolute inset-0 bg-white/20 rounded-full"
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 4, opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={springPresets.gentle}
        style={{ borderRadius: '50%' }}
      />
    )}
  </AnimatePresence>
);

// Loading spinner with Apple-style animation
const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={springPresets.gentle}
    className={cn('mr-2', className)}
  >
    <Loader2 className="h-4 w-4 animate-spin" />
  </motion.div>
);

// State icons with smooth transitions
const StateIcon: React.FC<{ state: ButtonState; className?: string }> = ({ state, className }) => {
  const iconVariants = {
    initial: { opacity: 0, scale: 0.5, rotate: -180 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.5, rotate: 180 },
  };

  return (
    <AnimatePresence mode="wait">
      {state === 'success' && (
        <motion.div
          key="success"
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springPresets.bouncy}
          className={cn('mr-2', className)}
        >
          <Check className="h-4 w-4" />
        </motion.div>
      )}
      {state === 'error' && (
        <motion.div
          key="error"
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springPresets.wobbly}
          className={cn('mr-2', className)}
        >
          <AlertCircle className="h-4 w-4" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({
    className,
    variant,
    size,
    animation = 'gentle',
    asChild = false,
    loading,
    state: controlledState,
    loadingText,
    successText,
    errorText,
    successDuration = 2000,
    errorDuration = 3000,
    hapticFeedback = 'medium',
    showRipple = true,
    onStateChange,
    children,
    disabled,
    onClick,
    onMouseDown,
    onTouchStart,
    ...props
  }, ref) => {
    const [internalState, setInternalState] = React.useState<ButtonState>('idle');
    const [showRipple, setShowRipple] = React.useState(false);
    const haptic = useHapticFeedback();
    
    const state = controlledState || internalState;
    
    // Animation variants based on animation prop
    const getAnimationVariants = () => {
      const baseVariants = {
        idle: { scale: 1 },
        hover: { scale: 1.02 },
        tap: { scale: 0.97 },
      };
      
      switch (animation) {
        case 'bouncy':
          return {
            ...baseVariants,
            hover: { scale: 1.05 },
            tap: { scale: 0.95 },
          };
        case 'pulse':
          return {
            ...baseVariants,
            idle: { scale: 1 },
            hover: { scale: [1, 1.02, 1] },
          };
        case 'none':
          return {
            idle: { scale: 1 },
            hover: { scale: 1 },
            tap: { scale: 1 },
          };
        default:
          return baseVariants;
      }
    };
    
    const animationVariants = getAnimationVariants();
    
    // Handle state changes
    React.useEffect(() => {
      if (loading && state === 'idle') {
        setInternalState('loading');
        onStateChange?.('loading');
      } else if (!loading && state === 'loading') {
        setInternalState('idle');
        onStateChange?.('idle');
      }
    }, [loading, state, onStateChange]);
    
    // Auto-reset success/error states
    React.useEffect(() => {
      let timeout: NodeJS.Timeout;
      
      if (state === 'success') {
        timeout = setTimeout(() => {
          setInternalState('idle');
          onStateChange?.('idle');
        }, successDuration);
      } else if (state === 'error') {
        timeout = setTimeout(() => {
          setInternalState('idle');
          onStateChange?.('idle');
        }, errorDuration);
      }
      
      return () => clearTimeout(timeout);
    }, [state, successDuration, errorDuration, onStateChange]);
    
    // Handle click with haptic feedback
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || state === 'loading') return;
      
      // Trigger haptic feedback
      haptic.trigger(hapticFeedback, event.currentTarget);
      
      // Show ripple effect
      if (showRipple) {
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 300);
      }
      
      onClick?.(event);
    }, [disabled, state, haptic, hapticFeedback, showRipple, onClick]);
    
    // Handle touch interactions
    const handleMouseDown = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || state === 'loading') return;
      haptic.trigger('light', event.currentTarget);
      onMouseDown?.(event);
    }, [disabled, state, haptic, onMouseDown]);
    
    const handleTouchStart = React.useCallback((event: React.TouchEvent<HTMLButtonElement>) => {
      if (disabled || state === 'loading') return;
      haptic.trigger('light', event.currentTarget);
      onTouchStart?.(event);
    }, [disabled, state, haptic, onTouchStart]);
    
    // Get current variant based on state
    const getCurrentVariant = () => {
      switch (state) {
        case 'success':
          return 'success';
        case 'error':
          return 'destructive';
        default:
          return variant;
      }
    };
    
    // Get current content
    const getCurrentContent = () => {
      switch (state) {
        case 'loading':
          return (
            <>
              <LoadingSpinner />
              {loadingText || children}
            </>
          );
        case 'success':
          return (
            <>
              <StateIcon state="success" />
              {successText || children}
            </>
          );
        case 'error':
          return (
            <>
              <StateIcon state="error" />
              {errorText || children}
            </>
          );
        default:
          return children;
      }
    };
    
    const Comp = asChild ? Slot : motion.button;
    const MotionComp = asChild ? Slot : motion.button;
    
    return (
      <MotionComp
        className={cn(buttonVariants({ 
          variant: getCurrentVariant(), 
          size, 
          animation, 
          className 
        }))}
        ref={ref}
        disabled={disabled || state === 'loading'}
        variants={animationVariants}
        initial="idle"
        whileHover={disabled ? undefined : "hover"}
        whileTap={disabled ? undefined : "tap"}
        transition={springPresets[animation === 'bouncy' ? 'bouncy' : 'gentle']}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        {...props}
      >
        {/* Ripple effect */}
        {showRipple && <RippleEffect isActive={showRipple} />}
        
        {/* Content with smooth transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={state !== 'idle' ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={springPresets.gentle}
            className="flex items-center justify-center"
          >
            {getCurrentContent()}
          </motion.div>
        </AnimatePresence>
      </MotionComp>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';

// Utility hook for button state management
export const useButtonState = (initialState: ButtonState = 'idle') => {
  const [state, setState] = React.useState<ButtonState>(initialState);
  
  const setLoading = React.useCallback(() => setState('loading'), []);
  const setSuccess = React.useCallback(() => setState('success'), []);
  const setError = React.useCallback(() => setState('error'), []);
  const setIdle = React.useCallback(() => setState('idle'), []);
  
  const asyncAction = React.useCallback(async (action: () => Promise<void>) => {
    try {
      setLoading();
      await action();
      setSuccess();
    } catch (error) {
      setError();
      throw error;
    }
  }, [setLoading, setSuccess, setError]);
  
  return {
    state,
    setState,
    setLoading,
    setSuccess,
    setError,
    setIdle,
    asyncAction,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isIdle: state === 'idle',
  };
};

export { AnimatedButton, buttonVariants };
export default AnimatedButton;