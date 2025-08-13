import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDashboardStore } from '@/store/dashboard';
import { DashboardWidget } from '@/types';
import { Card } from '@/components/ui/card';

const availableWidgets = [
  {
    type: 'chart',
    title: 'Gráfico de Ingresos',
    description: 'Visualiza los ingresos en el tiempo',
    config: { chartType: 'revenue', metric: 'revenueChart' },
  },
  {
    type: 'chart',
    title: 'Mapa de Calor de Ocupación',
    description: 'Vista de ocupación por horas',
    config: { chartType: 'occupancy', metric: 'occupancyHeatmap' },
  },
  {
    type: 'list',
    title: 'Clientes Top',
    description: 'Lista de mejores clientes',
    config: { listType: 'topClients', metric: 'topClients' },
  },
  {
    type: 'list',
    title: 'Próximos Eventos',
    description: 'Eventos y reservas próximas',
    config: { listType: 'upcomingEvents', metric: 'upcomingEvents' },
  },
];

export const AddWidgetButton = () => {
  const [open, setOpen] = useState(false);
  const { addWidget, widgets } = useDashboardStore();

  const handleAddWidget = (widgetTemplate: (typeof availableWidgets)[0]) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: widgetTemplate.type as any,
      title: widgetTemplate.title,
      position: { x: 0, y: widgets.length },
      size: { width: 1, height: 1 },
      config: widgetTemplate.config,
      isVisible: true,
    };

    addWidget(newWidget);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Agregar Widget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Agregar Widget</DialogTitle>
          <DialogDescription>
            Selecciona un widget para agregar a tu dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {availableWidgets.map((widget) => (
            <Card
              key={widget.title}
              className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => handleAddWidget(widget)}
            >
              <h4 className="font-medium">{widget.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {widget.description}
              </p>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
