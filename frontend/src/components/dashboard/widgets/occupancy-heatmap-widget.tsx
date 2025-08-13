import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OccupancyHeatmapWidgetProps {
  data: {
    hourly: { hour: number; occupancy: number }[];
    courts: { id: string; name: string; occupancy: number }[];
  };
}

export const OccupancyHeatmapWidget = ({
  data,
}: OccupancyHeatmapWidgetProps) => {
  if (!data) return null;

  const getColorForOccupancy = (occupancy: number) => {
    if (occupancy < 30) return 'bg-green-100 dark:bg-green-900/20';
    if (occupancy < 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (occupancy < 80) return 'bg-orange-100 dark:bg-orange-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  return (
    <Card className="p-6 h-full">
      <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-4">
        Ocupación por Hora
      </h3>

      <div className="space-y-3">
        {data.courts.map((court, courtIndex) => (
          <div key={court.id} className="space-y-2">
            <p className="text-sm font-medium">{court.name}</p>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const hourData = data.hourly.find((h) => h.hour === i + 8);
                const occupancy = hourData?.occupancy || 0;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (courtIndex * 12 + i) * 0.01 }}
                    className={cn(
                      'aspect-square rounded flex items-center justify-center text-xs',
                      getColorForOccupancy(occupancy)
                    )}
                    title={`${i + 8}:00 - ${occupancy}%`}
                  >
                    {occupancy > 0 && occupancy}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 dark:bg-green-900/20 rounded" />
          <span>Baja</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/20 rounded" />
          <span>Media</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-100 dark:bg-orange-900/20 rounded" />
          <span>Alta</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 dark:bg-red-900/20 rounded" />
          <span>Lleno</span>
        </div>
      </div>
    </Card>
  );
};
