'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { toast } from '@/lib/toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    
    // Wait for auth to finish loading before checking permissions
    if (authLoading) {
            return;
    }

    // Check if user has superadmin/root access
    const checkAccess = () => {
            if (!user) {
                setHasAccess(false);
      } else {
                // Check if user is staff/superuser or has specific role
        const isAdmin = user.is_staff || user.is_superuser || 
                       user.email === 'admin@padelyzer.com';
                setHasAccess(isAdmin);
      }
      setChecking(false);
    };

    checkAccess();
  }, [user, authLoading]);

  if (checking || authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">
          {authLoading ? 'Loading authentication...' : 'Checking permissions...'}
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to access the ROOT module. 
            This area is restricted to system administrators only.
          </p>
          <Button onClick={() => router.push('/es/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const handleError = (error: Error) => {
        toast.error('Ha ocurrido un error en el módulo ROOT');
  };

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}