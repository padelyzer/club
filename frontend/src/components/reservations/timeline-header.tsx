import { Court } from '@/types/court';

interface TimelineHeaderProps {
  courts: Court[];
}

export const TimelineHeader = ({ courts }: TimelineHeaderProps) => {
  return (
    <div className="flex border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 sticky top-0 z-10 shadow-sm">
      {/* Time column header */}
      <div className="w-20 flex-shrink-0 p-4 font-semibold text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 shadow-sm">
        <div className="text-center">
          Hora
        </div>
      </div>

      {/* Court headers */}
      {courts.map((court) => (
        <div
          key={court.id}
          className="w-[150px] flex-shrink-0 p-4 border-l border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="text-center">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
              {court.name}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
              {court.surface_type === 'glass' && 'Cristal'}
              {court.surface_type === 'wall' && 'Muro'}
              {court.surface_type === 'mesh' && 'Malla'}
              {court.surface_type === 'mixed' && 'Mixta'}
            </p>
            {court.price_per_hour && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                ${court.price_per_hour}/h
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
