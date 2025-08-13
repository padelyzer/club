'use client';

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Input, Label, FieldError, FieldHelp } from './Input';
import { Button } from './Button';
import { Card } from './Card';
import {
  Check,
  ChevronDown,
  Calendar,
  Clock,
  Upload,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// Form Container
interface ProfessionalFormProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onSubmit?: (e: React.FormEvent) => void;
  loading?: boolean;
  className?: string;
}

export const ProfessionalForm: React.FC<ProfessionalFormProps> = ({
  children,
  title,
  subtitle,
  onSubmit,
  loading = false,
  className,
}) => {
  return (
    <Card variant="glass" padding="lg" className={cn('backdrop-blur-xl border-white/20', className)}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          )}
          {subtitle && (
            <p className="text-gray-600">{subtitle}</p>
          )}
        </div>
      )}
      
      <form onSubmit={onSubmit} className="space-y-6">
        {children}
      </form>
      
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-700 font-medium">Procesando...</span>
          </div>
        </div>
      )}
    </Card>
  );
};

// Form Field Group
interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ children, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
};

// Professional Select
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ProfessionalSelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export const ProfessionalSelect: React.FC<ProfessionalSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  error = false,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between h-10 px-3 py-2 text-sm rounded-lg transition-all duration-200',
          'bg-white border border-gray-200 hover:border-gray-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20'
            : 'focus-visible:border-[#007AFF] focus-visible:ring-[#007AFF]/20',
          className
        )}
      >
        <span className={cn(
          selectedOption ? 'text-gray-900' : 'text-gray-400'
        )}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-500 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-1 z-20"
          >
            <Card variant="elevated" padding="sm" className="shadow-xl border-white/20 max-h-60 overflow-y-auto">
              <div className="space-y-1">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (!option.disabled) {
                        onChange?.(option.value);
                        setIsOpen(false);
                      }
                    }}
                    disabled={option.disabled}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors',
                      option.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-50',
                      value === option.value && 'bg-[#007AFF]/10 text-[#007AFF]'
                    )}
                  >
                    <span>{option.label}</span>
                    {value === option.value && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
};

// Professional Textarea
interface ProfessionalTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  resize?: boolean;
}

export const ProfessionalTextarea = forwardRef<
  HTMLTextAreaElement,
  ProfessionalTextareaProps
>(({ className, error = false, resize = true, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full px-3 py-2 text-sm transition-all duration-200',
        'bg-white border border-gray-200 rounded-lg',
        'text-gray-900 placeholder:text-gray-400',
        'hover:border-gray-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'min-h-[80px]',
        !resize && 'resize-none',
        error
          ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20'
          : 'focus-visible:border-[#007AFF] focus-visible:ring-[#007AFF]/20',
        className
      )}
      {...props}
    />
  );
});

ProfessionalTextarea.displayName = 'ProfessionalTextarea';

// Professional Switch
interface ProfessionalSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const ProfessionalSwitch: React.FC<ProfessionalSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'default',
  className,
}) => {
  const sizes = {
    sm: 'w-8 h-4',
    default: 'w-11 h-6',
    lg: 'w-14 h-8',
  };

  const thumbSizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#007AFF]/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizes[size],
        checked ? 'bg-[#007AFF]' : 'bg-gray-200',
        className
      )}
    >
      <motion.div
        animate={{
          x: checked ? (size === 'sm' ? 16 : size === 'lg' ? 24 : 20) : 2
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'absolute bg-white rounded-full shadow-sm',
          thumbSizes[size]
        )}
      />
    </button>
  );
};

// Professional Checkbox
interface ProfessionalCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
}

export const ProfessionalCheckbox: React.FC<ProfessionalCheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#007AFF]/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked || indeterminate
          ? 'bg-[#007AFF] border-[#007AFF]'
          : 'bg-white border-gray-300 hover:border-gray-400',
        className
      )}
    >
      {indeterminate ? (
        <div className="w-2 h-0.5 bg-white rounded" />
      ) : checked ? (
        <Check className="w-3 h-3 text-white" />
      ) : null}
    </button>
  );
};

// Professional Password Input
interface ProfessionalPasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showStrength?: boolean;
  error?: boolean;
}

export const ProfessionalPasswordInput = forwardRef<
  HTMLInputElement,
  ProfessionalPasswordInputProps
>(({ className, showStrength = false, error = false, value, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  
  const getPasswordStrength = (password: string): {
    strength: number;
    label: string;
    color: string;
  } => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^\w\s]/.test(password)) strength++;
    
    const levels = {
      1: { label: 'Muy débil', color: 'bg-red-500' },
      2: { label: 'Débil', color: 'bg-orange-500' },
      3: { label: 'Regular', color: 'bg-yellow-500' },
      4: { label: 'Fuerte', color: 'bg-green-500' },
      5: { label: 'Muy fuerte', color: 'bg-green-600' },
    };
    
    return {
      strength,
      label: levels[strength as keyof typeof levels]?.label || '',
      color: levels[strength as keyof typeof levels]?.color || 'bg-gray-200',
    };
  };
  
  const passwordStrength = showStrength && typeof value === 'string' 
    ? getPasswordStrength(value) 
    : null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'flex w-full h-10 px-3 py-2 text-sm transition-all duration-200',
            'bg-white border border-gray-200 rounded-lg',
            'text-gray-900 placeholder:text-gray-400',
            'hover:border-gray-300 pr-10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20'
              : 'focus-visible:border-[#007AFF] focus-visible:ring-[#007AFF]/20',
            className
          )}
          value={value}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-gray-100"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-gray-500" />
          ) : (
            <Eye className="w-4 h-4 text-gray-500" />
          )}
        </Button>
      </div>
      
      {passwordStrength && passwordStrength.strength > 0 && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < passwordStrength.strength
                    ? passwordStrength.color
                    : 'bg-gray-200'
                )}
              />
            ))}
          </div>
          <p className="text-xs text-gray-600">
            Seguridad: <span className="font-medium">{passwordStrength.label}</span>
          </p>
        </div>
      )}
    </div>
  );
});

ProfessionalPasswordInput.displayName = 'ProfessionalPasswordInput';

// Form Actions
interface FormActionsProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  align = 'right',
  className,
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={cn(
      'flex items-center gap-3',
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  );
};

export {
  Input as ProfessionalInput,
  Label as ProfessionalLabel,
  FieldError as ProfessionalFieldError,
  FieldHelp as ProfessionalFieldHelp,
};

export default {
  ProfessionalForm,
  FormField,
  ProfessionalSelect,
  ProfessionalTextarea,
  ProfessionalSwitch,
  ProfessionalCheckbox,
  ProfessionalPasswordInput,
  FormActions,
};