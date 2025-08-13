'use client';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

export default function RootClubsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleError = (error: Error) => {
        toast.error('Ha ocurrido un error inesperado');
  };

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}