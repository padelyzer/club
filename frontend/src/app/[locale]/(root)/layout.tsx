'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { RootSidebar } from '@/components/layout/RootSidebar';
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
    if (authLoading) return;

    // Check if user has ROOT access
    const checkAccess = () => {
      if (!user) {
        setHasAccess(false);
      } else {
        // Only superusers/staff have ROOT access
        const isRootAdmin = user.is_staff || user.is_superuser;
        setHasAccess(isRootAdmin);
      }
      setChecking(false);
    };

    checkAccess();
  }, [user, authLoading]);

  if (checking || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">
          Verificando permisos ROOT...
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center bg-white border-red-200">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Acceso ROOT Denegado</h2>
          <p className="text-gray-600 mb-6">
            No tienes permisos para acceder al sistema ROOT. 
            Esta área está restringida solo para superadministradores.
          </p>
          <Button 
            onClick={() => router.push('/es/dashboard')}
            variant="outline"
            className="border-gray-300 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const handleError = (error: Error) => {
        toast.error('Error en el módulo ROOT');
  };

  return (
    <ErrorBoundary onError={handleError}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Simply render the children without the old layout */}
        {children}
      </div>
    </ErrorBoundary>
  );
}