'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-red-50">
          <div className="text-center max-w-md p-8">
            <h2 className="text-3xl font-bold mb-4 text-red-800">Critical Error</h2>
            <p className="text-red-600 mb-6">
              A critical error occurred and the application cannot continue.
            </p>
            <button 
              onClick={() => reset()} 
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              Reset Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}