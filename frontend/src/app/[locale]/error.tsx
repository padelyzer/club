'use client';

import { useParams } from 'next/navigation';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = params.locale as string;

  const messages = {
    en: {
      title: 'Something went wrong!',
      description: 'An error occurred while loading this page.',
      button: 'Try again'
    },
    es: {
      title: '¡Algo salió mal!',
      description: 'Ocurrió un error al cargar esta página.',
      button: 'Intentar de nuevo'
    }
  };

  const t = messages[locale as keyof typeof messages] || messages.en;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">{t.title}</h2>
        <p className="text-gray-600 mb-6">{t.description}</p>
        <p className="text-sm text-gray-500 mb-6 font-mono">{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {t.button}
        </button>
      </div>
    </div>
  );
}