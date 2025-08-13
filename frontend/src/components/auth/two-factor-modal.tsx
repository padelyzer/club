'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ShieldCheck, Smartphone, Mail, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';
import { AuthService } from '@/lib/api/services/auth.service';
import { toast } from 'react-hot-toast';

const otpSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
});

type OTPFormData = z.infer<typeof otpSchema>;

type DeliveryMethod = 'email' | 'sms' | 'whatsapp';

// Individual OTP digit input component with Apple HIG design
interface OTPDigitInputProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
  disabled?: boolean;
  hasError?: boolean;
}

const OTPDigitInput = forwardRef<HTMLInputElement, OTPDigitInputProps>(({ 
  index, 
  value, 
  onChange, 
  onFocus, 
  onKeyDown, 
  disabled, 
  hasError 
}, ref) => {
  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={(e) => {
        const newValue = e.target.value.replace(/[^0-9]/g, '');
        onChange(newValue);
      }}
      onFocus={onFocus}
      onKeyDown={(e) => onKeyDown(e, index)}
      disabled={disabled}
      className={`
        w-12 h-12 text-center text-lg font-semibold
        border-2 rounded-xl transition-all duration-200
        ${hasError 
          ? 'border-destructive bg-destructive/5' 
          : 'border-border focus:border-primary'
        }
        ${value ? 'bg-primary/5' : ''}
        focus:ring-2 focus:ring-primary/20 focus:ring-offset-0
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      aria-label={`Digit ${index + 1}`}
    />
  );
});

OTPDigitInput.displayName = 'OTPDigitInput';

interface TwoFactorModalProps {
  isOpen: boolean;
  email: string;
  phone?: string;
  onSuccess: (response: any) => void;
  onCancel: () => void;
  locationInfo?: {
    city?: string;
    country?: string;
  } | null;
  availableMethods?: DeliveryMethod[];
}

export function TwoFactorModal({
  isOpen,
  email,
  phone,
  onSuccess,
  onCancel,
  locationInfo,
  availableMethods = ['email'],
}: TwoFactorModalProps) {
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(availableMethods[0] || 'email');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { completeTwoFactor } = useAuthStore();

  const {
    handleSubmit,
    formState: { isSubmitting },
    setError,
    reset,
    clearErrors,
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  });

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [countdown]);

  // Focus management for digit inputs
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Handle digit input changes
  const handleDigitChange = (index: number, value: string) => {
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    clearErrors();

    // Auto-advance to next input
    if (value && index < 5) {
      setCurrentIndex(index + 1);
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }

    // Auto-submit when all digits are filled
    if (newDigits.every(digit => digit !== '') && newDigits.join('').length === 6) {
      setTimeout(() => {
        handleSubmit(() => verifyCode(newDigits.join('')))();
      }, 100);
    }
  };

  // Handle keydown for navigation and deletion
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      setCurrentIndex(index - 1);
      setTimeout(() => inputRefs.current[index - 1]?.focus(), 0);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setCurrentIndex(index - 1);
      setTimeout(() => inputRefs.current[index - 1]?.focus(), 0);
    } else if (e.key === 'ArrowRight' && index < 5) {
      setCurrentIndex(index + 1);
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    } else if (e.key === 'Backspace' && digits[index]) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      clearErrors();
    }
  };

  // Handle paste functionality
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (pastedText.length === 6) {
      const newDigits = pastedText.split('');
      setDigits(newDigits);
      clearErrors();
      setTimeout(() => {
        handleSubmit(() => verifyCode(pastedText))();
      }, 100);
    }
  };

  const verifyCode = async (code: string) => {
    try {
      const response = await AuthService.verifyOTP({
        email,
        otp: code,
      });

      // Store auth state
      const session = {
        accessToken: response.access,
        refreshToken: response.refresh,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      // Convert backend User to frontend User format
      const frontendUser = {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.first_name,
        lastName: response.user.last_name,
        username: response.user.email, // Use email as username
        is_superuser: response.user.is_superuser || false,
        is_staff: response.user.is_staff || false,
        is_active: response.user.is_active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      completeTwoFactor(frontendUser, session);
      toast.success('Login successful!');
      onSuccess(response);
      resetForm();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Invalid verification code';
      toast.error(message);
      // Clear all digits on error
      setDigits(['', '', '', '', '', '']);
      setCurrentIndex(0);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const onSubmit = () => {
    const code = digits.join('');
    if (code.length === 6) {
      verifyCode(code);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      // Request new OTP with selected delivery method
      await AuthService.requestOTP({
        email,
        phone: deliveryMethod !== 'email' ? phone : undefined,
        method: deliveryMethod,
      });
      
      const methodText = {
        email: 'your email',
        sms: 'your phone via SMS',
        whatsapp: 'your phone via WhatsApp'
      }[deliveryMethod];
      
      toast.success(`New verification code sent to ${methodText}`);
      setCountdown(60); // 60 seconds cooldown
      resetForm();
    } catch (error) {
      toast.error('Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  const resetForm = () => {
    setDigits(['', '', '', '', '', '']);
    setCurrentIndex(0);
    reset();
    clearErrors();
  };

  // Get delivery method display info
  const getDeliveryMethodInfo = () => {
    switch (deliveryMethod) {
      case 'sms':
        return {
          icon: Smartphone,
          text: `SMS to ${phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') || 'your phone'}`,
          description: 'We\'ll send a 6-digit code via SMS'
        };
      case 'whatsapp':
        return {
          icon: MessageSquare,
          text: `WhatsApp to ${phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') || 'your phone'}`,
          description: 'We\'ll send a 6-digit code via WhatsApp'
        };
      default:
        return {
          icon: Mail,
          text: email,
          description: 'We\'ve sent a 6-digit verification code to your email'
        };
    }
  };

  const deliveryInfo = getDeliveryMethodInfo();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold">
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {deliveryInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-4">
          {/* Delivery Method Selection */}
          {availableMethods.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Delivery Method</Label>
              <Select value={deliveryMethod} onValueChange={(value: DeliveryMethod) => setDeliveryMethod(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMethods.includes('email') && (
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </div>
                    </SelectItem>
                  )}
                  {availableMethods.includes('sms') && phone && (
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span>SMS</span>
                      </div>
                    </SelectItem>
                  )}
                  {availableMethods.includes('whatsapp') && phone && (
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Destination Display */}
          <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
            <deliveryInfo.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {deliveryInfo.text}
            </span>
          </div>

          {/* Location Warning */}
          {locationInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="text-amber-800 font-medium">
                New location detected: {locationInfo.city}, {locationInfo.country}
              </p>
              <p className="text-amber-700 text-xs mt-1">
                If this wasn't you, please secure your account immediately.
              </p>
            </div>
          )}

          {/* OTP Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-center block">
              Enter 6-digit verification code
            </Label>
            <div 
              className="flex justify-center gap-3"
              onPaste={handlePaste}
            >
              {digits.map((digit, index) => (
                <OTPDigitInput
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  index={index}
                  value={digit}
                  onChange={(value) => handleDigitChange(index, value)}
                  onFocus={() => setCurrentIndex(index)}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  hasError={false}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={onSubmit}
              className="w-full h-12 text-base font-medium"
              disabled={digits.join('').length !== 6 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleResendCode}
              disabled={isResending || countdown > 0}
              className="w-full h-12"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend code in ${countdown}s`
              ) : (
                'Resend verification code'
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Code expires in 5 minutes
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}