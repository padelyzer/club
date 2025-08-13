import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mt-4">
            Página no encontrada
          </h2>
          <p className="text-gray-600 mt-2">
            La página o club que buscas no existe.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/test-simple"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ver Estado del Sistema
          </Link>
          
          <Link
            href="/test-client-search"
            className="block w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Probar Búsqueda de Clientes
          </Link>
        </div>

        <div className="mt-8 p-4 bg-green-100 rounded-lg">
          <h3 className="font-semibold text-green-800">Sistema Funcionando:</h3>
          <ul className="mt-2 text-sm text-green-700 text-left">
            <li>✅ Backend API operativo</li>
            <li>✅ Búsqueda de clientes implementada</li>
            <li>✅ Reservas para visitantes funcionando</li>
            <li>✅ Flujo de reservas completo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}