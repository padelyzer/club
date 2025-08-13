import Link from 'next/link';
import { Card } from '@/components/ui/professional';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-40"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-14 h-14 bg-gradient-to-br from-[#007AFF] to-[#4299E1] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <span className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Padelyzer
            </span>
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/80 backdrop-blur-sm text-[#007AFF] border border-white/20 shadow-sm">
            Sistema B2B - Gestión de Clubes
          </span>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card 
          variant="glass" 
          padding="xl"
          className="backdrop-blur-xl bg-white/70 border border-white/20 shadow-2xl shadow-gray-900/10"
        >
          {children}
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600/80">
            © 2024 Padelyzer. Sistema de gestión para clubes de pádel.
          </p>
        </div>
      </div>

      <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-br from-indigo-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
    </div>
  );
}