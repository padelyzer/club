import Link from 'next/link';
import { headers } from 'next/headers';

export default function LocaleNotFound() {
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  const locale = pathname.split('/')[1] || 'en';

  const messages = {
    en: {
      title: '404 - Page Not Found',
      description: "The page you're looking for doesn't exist.",
      button: 'Go Home'
    },
    es: {
      title: '404 - Página No Encontrada',
      description: 'La página que buscas no existe.',
      button: 'Ir al Inicio'
    }
  };

  const t = messages[locale as keyof typeof messages] || messages.en;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">{t.title}</h2>
        <p className="text-gray-600 mb-8">{t.description}</p>
        <Link
          href={`/${locale}`}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
        >
          {t.button}
        </Link>
      </div>
    </div>
  );
}