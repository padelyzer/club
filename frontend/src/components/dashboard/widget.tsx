import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardWidget } from '@/types';
import { RevenueChartWidget } from './widgets/revenue-chart-widget';
import { OccupancyHeatmapWidget } from './widgets/occupancy-heatmap-widget';
import { KPIWidget } from './widgets/kpi-widget';
import { ListWidget } from './widgets/list-widget';
import { PerformanceWidget } from './widgets/performance-widget';

interface WidgetProps {
  widget: DashboardWidget;
  data: any;
  editMode: boolean;
  onRemove: () => void;
}

export const Widget = ({ widget, data, editMode, onRemove }: WidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderWidget = () => {
    switch (widget.type) {
      case 'chart':
        if (widget.config.chartType === 'revenue') {
          return <RevenueChartWidget data={data} />;
        }
        if (widget.config.chartType === 'occupancy') {
          return <OccupancyHeatmapWidget data={data} />;
        }
        if (widget.config.chartType === 'performance') {
          return <PerformanceWidget data={data} />;
        }
        return null;
      case 'kpi':
        return <KPIWidget data={data} config={widget.config} />;
      case 'list':
        return <ListWidget data={data} config={widget.config} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative"
    >
      {editMode && (
        <div className="absolute -top-2 -right-2 z-10 flex gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 rounded-full bg-white dark:bg-gray-800 shadow-md"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 rounded-full bg-white dark:bg-gray-800 shadow-md"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {renderWidget()}
    </motion.div>
  );
};
