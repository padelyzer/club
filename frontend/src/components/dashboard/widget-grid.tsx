import { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Widget } from '@/components/dashboard/widget';
import { AddWidgetButton } from '@/components/dashboard/add-widget-button';
import { useDashboardStore } from '@/store/dashboard';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DashboardWidget } from '@/types';

interface WidgetGridProps {
  widgets: DashboardWidget[];
  metrics: any;
}

export const WidgetGrid = ({ widgets, metrics }: WidgetGridProps) => {
  const { moveWidget, removeWidget } = useDashboardStore();
  const [editMode, setEditMode] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      // Update widget positions
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Widgets</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Guardar' : 'Personalizar'}
          </Button>
          {editMode && <AddWidgetButton />}
        </div>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {widgets.map((widget) => (
              <Widget
                key={widget.id}
                widget={widget}
                data={metrics[widget.config.metric]}
                editMode={editMode}
                onRemove={() => removeWidget(widget.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
