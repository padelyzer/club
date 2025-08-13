'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/lib/toast';
import { Eye, EyeOff, Loader2, Shield, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

import { 
  Button, 
  Input, 
  Label, 
  FieldError,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/professional';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/auth';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useParams } from 'next/navigation';
import { TwoFactorModal } from '@/components/auth/two-factor-modal';
import { RedirectHandler } from '@/lib/auth/redirect-handler';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Export the redirect handler for testing
export async function handlePostLoginRedirect(
  this: { router: any; params: any },
  user: any,
  accessToken: string
) {
  const router = this.router;
  const locale = this.params.locale as string || 'es';
  
  // Ensure locale is valid
  const validLocale = locale || 'es';
  
  // Get redirect path using static method
  const redirectPath = RedirectHandler.getRedirectPath({
    locale: validLocale,
    user,
    defaultPath: '/dashboard'
  });
  
  // Update user club context in background
  RedirectHandler.updateUserClubContext(user, accessToken);
  
  // Perform the redirect
  router.push(redirectPath);
}

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'es';
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [locationInfo, setLocationInfo] = useState<any>(null);
  const { login: loginMutation } = useAuth();
  const { login: setAuthState, isLocked, loginAttempts } = useAuthStore();
  
  // Clean up any corrupted localStorage values on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Clean up any invalid auth tokens
        const token = localStorage.getItem('access_token');
        if (token && token.includes('undefined')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Check if account is locked
      if (isLocked()) {
        toast.error(
          'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
        );
        return;
      }

      const response = await loginMutation({
        email: data.email,
        password: data.password,
      });

      // Check if 2FA is required
      if (response.requires_2fa) {
        setTwoFactorEmail(data.email);
        setLocationInfo(response.location_info);
        setShowTwoFactor(true);
        toast.info(response.message || 'Verification code sent to your email');
        return;
      }

      // Store auth state
      const session = {
        accessToken: response.access,
        refreshToken: response.refresh,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      // Map API user to frontend user type
      const mappedUser = {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.first_name,
        lastName: response.user.last_name,
        username: response.user.email, // Using email as username
        is_superuser: response.user.is_superuser || false,
        is_staff: response.user.is_staff || false,
        is_active: response.user.is_active,
        createdAt: response.user.created_at,
        updatedAt: response.user.updated_at,
        // IMPORTANTE: Incluir organization_memberships
        organization_memberships: response.user.organization_memberships || [],
      };

      setAuthState(mappedUser as any, session, data.rememberMe);

      toast.success('¡Bienvenido!');
      
      // Handle redirect based on user type
      await handlePostLoginRedirect.call(
        { router, params: { locale } },
        response.user,
        response.access
      );
    } catch (error: any) {
      const message =
        error.response?.data?.detail || 
        error.response?.data?.error ||
        error.message ||
        'Invalid credentials';

      setError('root', { message });
      toast.error(message);

      // Record failed login attempt
      if (error.response?.status === 401) {
        useAuthStore.getState().recordLoginAttempt();
      }
    }
  };

  const handleTwoFactorSuccess = async (response: any) => {
    setShowTwoFactor(false);
    
    // Store auth state
    const session = {
      accessToken: response.access,
      refreshToken: response.refresh,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    const mappedUser = {
      id: response.user.id,
      email: response.user.email,
      firstName: response.user.first_name,
      lastName: response.user.last_name,
      username: response.user.email,
      is_superuser: response.user.is_superuser || false,
      is_staff: response.user.is_staff || false,
      is_active: response.user.is_active,
      createdAt: response.user.created_at,
      updatedAt: response.user.updated_at,
      // IMPORTANTE: Incluir organization_memberships
      organization_memberships: response.user.organization_memberships || [],
    };

    setAuthState(mappedUser as any, session, true);
    
    // Handle redirect
    await handlePostLoginRedirect.call(
      { router, params: { locale } },
      response.user,
      response.access
    );
  };

  return (
    <>
      <motion.div 
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.5,
          ease: [0.4, 0.0, 0.2, 1]
        }}
      >
        {/* Header with Professional Design */}
        <CardHeader centerContent className="mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-4"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#4299E1] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Bienvenido
          </CardTitle>
          <CardDescription className="text-base text-gray-600 max-w-sm">
            Ingresa tus credenciales para acceder al sistema de gestión de clubes
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              {...register('email')}
              id="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              autoComplete="email"
              className="mt-1.5"
              hasError={!!errors.email}
            />
            {errors.email && (
              <FieldError className="mt-1.5">
                {errors.email.message}
              </FieldError>
            )}
          </motion.div>

          {/* Password Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Contraseña
              </Label>
              <Link
                href={`/${locale}/forgot-password`}
                className="text-sm text-[#007AFF] hover:text-[#0051D5] transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <Input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                hasError={!!errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <FieldError className="mt-1.5">
                {errors.password.message}
              </FieldError>
            )}
          </motion.div>

          {/* Remember Me Checkbox */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="flex items-center"
          >
            <Checkbox
              {...register('rememberMe')}
              id="remember"
              className="rounded border-gray-300"
            />
            <label
              htmlFor="remember"
              className="ml-2 text-sm text-gray-600 cursor-pointer select-none"
            >
              Mantener sesión iniciada
            </label>
          </motion.div>

          {/* Error Message */}
          {errors.root && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{errors.root.message}</p>
            </motion.div>
          )}

          {/* Login Attempts Warning */}
          {loginAttempts > 0 && loginAttempts < 5 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-xl p-4"
            >
              <p className="text-sm text-amber-800">
                {5 - loginAttempts} intentos restantes antes de bloquear la cuenta
              </p>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <Button
              type="submit"
              disabled={isSubmitting || isLocked()}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </motion.div>

          {/* Register Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-center"
          >
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{' '}
              <Link
                href={`/${locale}/register`}
                className="text-[#007AFF] hover:text-[#0051D5] font-medium transition-colors duration-200"
              >
                Regístrate aquí
              </Link>
            </p>
          </motion.div>
        </form>
      </motion.div>

      {/* Two-Factor Modal */}
      <TwoFactorModal
        isOpen={showTwoFactor}
        email={twoFactorEmail}
        onSuccess={handleTwoFactorSuccess}
        onCancel={() => setShowTwoFactor(false)}
        locationInfo={locationInfo}
      />
    </>
  );
}