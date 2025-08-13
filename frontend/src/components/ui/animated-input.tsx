'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Check, X, AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springPresets } from '@/lib/animations/spring-presets';
import { useHapticFeedback } from '@/lib/animations/haptic-feedback';

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export interface AnimatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  placeholder?: string;
  error?: string;
  success?: string;
  hint?: string;
  validationState?: ValidationState;
  showValidationIcon?: boolean;
  floatingLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'underlined';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onValidationChange?: (isValid: boolean) => void;
}

// Validation icon component
const ValidationIcon: React.FC<{ state: ValidationState; className?: string }> = ({ 
  state, 
  className 
}) => {
  const iconVariants = {
    initial: { opacity: 0, scale: 0.5, rotate: -90 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.5, rotate: 90 },
  };

  return (
    <AnimatePresence mode="wait">
      {state === 'validating' && (
        <motion.div
          key="validating"
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springPresets.gentle}
          className={cn('text-blue-500', className)}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <AlertCircle className="h-4 w-4" />
          </motion.div>
        </motion.div>
      )}
      {state === 'valid' && (
        <motion.div
          key="valid"
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springPresets.bouncy}
          className={cn('text-green-500', className)}
        >
          <Check className="h-4 w-4" />
        </motion.div>
      )}
      {state === 'invalid' && (
        <motion.div
          key="invalid"
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springPresets.wobbly}
          className={cn('text-red-500', className)}
        >
          <X className="h-4 w-4" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Floating label component
const FloatingLabel: React.FC<{
  label: string;
  hasValue: boolean;
  isFocused: boolean;
  isError: boolean;
  size: 'sm' | 'md' | 'lg';
}> = ({ label, hasValue, isFocused, isError, size }) => {
  const sizeConfig = {
    sm: {
      normal: 'text-sm top-3 left-3',
      floating: 'text-xs top-1 left-3',
    },
    md: {
      normal: 'text-base top-3.5 left-4',
      floating: 'text-xs top-1.5 left-4',
    },
    lg: {
      normal: 'text-lg top-4 left-4',
      floating: 'text-sm top-2 left-4',
    },
  };

  const config = sizeConfig[size];
  const isFloating = hasValue || isFocused;

  return (
    <motion.label
      className={cn(
        'absolute pointer-events-none transition-all duration-200 origin-left',
        isFloating ? config.floating : config.normal,
        isFocused 
          ? 'text-primary' 
          : isError 
            ? 'text-destructive' 
            : 'text-muted-foreground'
      )}
      animate={{
        scale: isFloating ? 0.85 : 1,
        y: isFloating ? 0 : 0,
      }}
      transition={springPresets.gentle}
    >
      {label}
    </motion.label>
  );
};

// Focus ring component
const FocusRing: React.FC<{ 
  isFocused: boolean; 
  hasError: boolean; 
  hasSuccess: boolean;
  variant: 'default' | 'filled' | 'underlined';
}> = ({ isFocused, hasError, hasSuccess, variant }) => {
  const getColor = () => {
    if (hasError) return 'border-destructive shadow-destructive/20';
    if (hasSuccess) return 'border-green-500 shadow-green-500/20';
    if (isFocused) return 'border-primary shadow-primary/20';
    return 'border-transparent';
  };

  if (variant === 'underlined') {
    return (
      <motion.div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-0.5 origin-center',
          hasError ? 'bg-destructive' : hasSuccess ? 'bg-green-500' : 'bg-primary'
        )}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isFocused ? 1 : 0 }}
        transition={springPresets.snappy}
      />
    );
  }

  return (
    <motion.div
      className={cn(
        'absolute inset-0 rounded-lg border-2 transition-all duration-200',
        getColor()
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: isFocused || hasError || hasSuccess ? 1 : 0, 
        scale: 1 
      }}
      transition={springPresets.gentle}
    />
  );
};

// Error/Success/Hint message component
const InputMessage: React.FC<{
  message?: string;
  type: 'error' | 'success' | 'hint';
  icon?: React.ReactNode;
}> = ({ message, type, icon }) => {
  if (!message) return null;

  const variants = {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
  };

  const getTextColor = () => {
    switch (type) {
      case 'error': return 'text-destructive';
      case 'success': return 'text-green-600';
      case 'hint': return 'text-muted-foreground';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={type === 'error' ? springPresets.wobbly : springPresets.gentle}
        className={cn('flex items-center gap-2 mt-2 text-sm', getTextColor())}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{message}</span>
      </motion.div>
    </AnimatePresence>
  );
};

const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({
    className,
    type = 'text',
    label,
    placeholder,
    error,
    success,
    hint,
    validationState = 'idle',
    showValidationIcon = true,
    floatingLabel = true,
    size = 'md',
    variant = 'default',
    leftIcon,
    rightIcon,
    disabled,
    value,
    onValidationChange,
    onFocus,
    onBlur,
    onChange,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value || '');
    const haptic = useHapticFeedback();
    
    const hasValue = Boolean(inputValue);
    const hasError = Boolean(error) || validationState === 'invalid';
    const hasSuccess = Boolean(success) || validationState === 'valid';
    const isPassword = type === 'password';
    
    // Size configurations
    const sizeConfig = {
      sm: 'h-10 px-3 text-sm',
      md: 'h-12 px-4 text-base',
      lg: 'h-14 px-4 text-lg',
    };
    
    // Variant configurations
    const variantConfig = {
      default: cn(
        'border border-input bg-background',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        hasError && 'border-destructive focus:border-destructive focus:ring-destructive/20',
        hasSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
      ),
      filled: cn(
        'border-0 bg-muted/50',
        'focus:bg-background focus:ring-2 focus:ring-primary/20',
        hasError && 'bg-destructive/5 focus:ring-destructive/20',
        hasSuccess && 'bg-green-50 focus:ring-green-500/20'
      ),
      underlined: cn(
        'border-0 border-b border-input bg-transparent rounded-none',
        'focus:border-primary',
        hasError && 'border-destructive',
        hasSuccess && 'border-green-500'
      ),
    };
    
    // Handle focus
    const handleFocus = React.useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      haptic.trigger('light', event.currentTarget);
      onFocus?.(event);
    }, [haptic, onFocus]);
    
    // Handle blur
    const handleBlur = React.useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(event);
    }, [onBlur]);
    
    // Handle change
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInputValue(newValue);
      onChange?.(event);
      
      // Simple validation feedback
      if (onValidationChange) {
        const isValid = newValue.length > 0 && !error;
        onValidationChange(isValid);
      }
    }, [onChange, onValidationChange, error]);
    
    // Handle password toggle
    const handlePasswordToggle = React.useCallback(() => {
      setShowPassword(!showPassword);
      haptic.trigger('light');
    }, [showPassword, haptic]);
    
    // Sync external value changes
    React.useEffect(() => {
      if (value !== undefined) {
        setInputValue(value);
      }
    }, [value]);

    return (
      <div className="relative w-full">
        {/* Static label (non-floating) */}
        {label && !floatingLabel && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        
        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          {/* Input field */}
          <motion.input
            ref={ref}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            value={inputValue || ''}
            placeholder={floatingLabel ? '' : placeholder}
            className={cn(
              'w-full rounded-lg transition-all duration-200 outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              sizeConfig[size],
              variantConfig[variant],
              leftIcon && 'pl-10',
              (rightIcon || isPassword || showValidationIcon) && 'pr-10',
              floatingLabel && label && 'placeholder-transparent',
              className
            )}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            whileFocus={{
              scale: variant === 'default' ? 1.01 : 1,
            }}
            transition={springPresets.gentle}
            {...props}
          />
          
          {/* Floating label */}
          {label && floatingLabel && (
            <FloatingLabel
              label={label}
              hasValue={hasValue}
              isFocused={isFocused}
              isError={hasError}
              size={size}
            />
          )}
          
          {/* Focus ring */}
          <FocusRing
            isFocused={isFocused}
            hasError={hasError}
            hasSuccess={hasSuccess}
            variant={variant}
          />
          
          {/* Right icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {/* Validation icon */}
            {showValidationIcon && validationState !== 'idle' && (
              <ValidationIcon state={validationState} />
            )}
            
            {/* Password toggle */}
            {isPassword && (
              <motion.button
                type="button"
                onClick={handlePasswordToggle}
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileTap={{ scale: 0.95 }}
                transition={springPresets.snappy}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </motion.button>
            )}
            
            {/* Right icon */}
            {rightIcon && !isPassword && !showValidationIcon && (
              <div className="text-muted-foreground">
                {rightIcon}
              </div>
            )}
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <InputMessage
            message={error}
            type="error"
            icon={<AlertCircle className="h-4 w-4" />}
          />
        )}
        
        {/* Success message */}
        {success && !error && (
          <InputMessage
            message={success}
            type="success"
            icon={<Check className="h-4 w-4" />}
          />
        )}
        
        {/* Hint message */}
        {hint && !error && !success && (
          <InputMessage
            message={hint}
            type="hint"
          />
        )}
      </div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';

// Search input variant
export const AnimatedSearchInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ leftIcon, ...props }, ref) => (
    <AnimatedInput
      ref={ref}
      type="search"
      leftIcon={leftIcon || <Search className="h-4 w-4" />}
      floatingLabel={false}
      {...props}
    />
  )
);

AnimatedSearchInput.displayName = 'AnimatedSearchInput';

// Hook for input validation state management
export const useInputValidation = (
  validator?: (value: string) => { isValid: boolean; message?: string },
  debounceMs: number = 300
) => {
  const [validationState, setValidationState] = React.useState<ValidationState>('idle');
  const [message, setMessage] = React.useState<string>('');
  
  const validateInput = React.useCallback(
    (value: string) => {
      if (!validator) return;
      
      setValidationState('validating');
      
      const debounceTimer = setTimeout(() => {
        const result = validator(value);
        setValidationState(result.isValid ? 'valid' : 'invalid');
        setMessage(result.message || '');
      }, debounceMs);
      
      return () => clearTimeout(debounceTimer);
    },
    [validator, debounceMs]
  );
  
  return {
    validationState,
    message,
    validateInput,
    isValidating: validationState === 'validating',
    isValid: validationState === 'valid',
    isInvalid: validationState === 'invalid',
  };
};

export { AnimatedInput };
export default AnimatedInput;