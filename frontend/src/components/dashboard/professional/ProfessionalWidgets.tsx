import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  Filter,
  MoreHorizontal,
  Zap,
  Target,
  DollarSign,
  MapPin
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { cn } from '@/lib/utils';

interface WidgetData {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'progress' | 'activity';
  data: any;
  refreshable?: boolean;
  expandable?: boolean;
  configurable?: boolean;
}

interface ProfessionalWidgetsProps {
  widgets: WidgetData[];
  onWidgetRefresh?: (widgetId: string) => void;
  onWidgetConfig?: (widgetId: string) => void;
  onWidgetExpand?: (widgetId: string) => void;
  onItemClick?: (widgetId: string, item: any) => void;
  layout?: 'grid' | 'masonry' | 'flex';
  animated?: boolean;
  className?: string;
}

export const ProfessionalWidgets = memo<ProfessionalWidgetsProps>(({
  widgets,
  onWidgetRefresh,
  onWidgetConfig,
  onWidgetExpand,
  onItemClick,
  layout = 'grid',
  animated = true,
  className
}) => {
  const { t } = useTranslation();
  const [expandedWidgets, setExpandedWidgets] = useState<Set<string>>(new Set());
  const [refreshingWidgets, setRefreshingWidgets] = useState<Set<string>>(new Set());

  const toggleExpanded = (widgetId: string) => {
    const newExpanded = new Set(expandedWidgets);
    if (newExpanded.has(widgetId)) {
      newExpanded.delete(widgetId);
    } else {
      newExpanded.add(widgetId);
    }
    setExpandedWidgets(newExpanded);
  };

  const handleRefresh = async (widgetId: string) => {
    if (onWidgetRefresh && !refreshingWidgets.has(widgetId)) {
      setRefreshingWidgets(prev => new Set([...prev, widgetId]));
      try {
        await onWidgetRefresh(widgetId);
      } finally {
        setTimeout(() => {
          setRefreshingWidgets(prev => {
            const newSet = new Set(prev);
            newSet.delete(widgetId);
            return newSet;
          });
        }, 1000);
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'masonry':
        return 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6';
      case 'flex':
        return 'flex flex-wrap gap-6';
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
    }
  };

  return (
    <motion.div
      variants={animated ? containerVariants : {}}
      initial={animated ? "hidden" : {}}
      animate={animated ? "visible" : {}}
      className={cn(getLayoutClasses(), className)}
    >
      {widgets.map((widget) => (
        <motion.div
          key={widget.id}
          variants={animated ? itemVariants : {}}
          className={layout === 'masonry' ? 'break-inside-avoid' : ''}
        >
          <Widget
            widget={widget}
            expanded={expandedWidgets.has(widget.id)}
            refreshing={refreshingWidgets.has(widget.id)}
            onToggleExpanded={() => toggleExpanded(widget.id)}
            onRefresh={() => handleRefresh(widget.id)}
            onConfig={() => onWidgetConfig?.(widget.id)}
            onExpand={() => onWidgetExpand?.(widget.id)}
            onItemClick={(item) => onItemClick?.(widget.id, item)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
});

ProfessionalWidgets.displayName = 'ProfessionalWidgets';

// Individual Widget Component
interface WidgetProps {
  widget: WidgetData;
  expanded: boolean;
  refreshing: boolean;
  onToggleExpanded: () => void;
  onRefresh: () => void;
  onConfig: () => void;
  onExpand: () => void;
  onItemClick: (item: any) => void;
}

const Widget = memo<WidgetProps>(({
  widget,
  expanded,
  refreshing,
  onToggleExpanded,
  onRefresh,
  onConfig,
  onExpand,
  onItemClick
}) => {
  const { t } = useTranslation();

  return (
    <Card 
      variant="glass" 
      padding="none"
      className={cn(
        'group overflow-hidden transition-all duration-300',
        'hover:shadow-xl hover:shadow-black/10',
        'border-white/20 backdrop-blur-xl',
        'bg-gradient-to-br from-white/80 to-white/40'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/20 bg-white/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {widget.title}
          </h3>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {widget.refreshable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="w-7 h-7 p-0"
              >
                <Activity className={cn('w-3 h-3', refreshing && 'animate-spin')} />
              </Button>
            )}
            
            {widget.expandable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpanded}
                className="w-7 h-7 p-0"
              >
                <ChevronDown className={cn(
                  'w-3 h-3 transition-transform',
                  expanded && 'rotate-180'
                )} />
              </Button>
            )}
            
            {widget.configurable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onConfig}
                className="w-7 h-7 p-0"
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence>
          {widget.type === 'metric' && (
            <MetricWidget data={widget.data} onItemClick={onItemClick} />
          )}
          
          {widget.type === 'list' && (
            <ListWidget 
              data={widget.data} 
              expanded={expanded}
              onItemClick={onItemClick} 
            />
          )}
          
          {widget.type === 'progress' && (
            <ProgressWidget data={widget.data} onItemClick={onItemClick} />
          )}
          
          {widget.type === 'activity' && (
            <ActivityWidget 
              data={widget.data} 
              expanded={expanded}
              onItemClick={onItemClick} 
            />
          )}
          
          {widget.type === 'chart' && (
            <ChartWidget data={widget.data} onItemClick={onItemClick} />
          )}
        </AnimatePresence>
      </div>

      {/* Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  );
});

Widget.displayName = 'Widget';

// Metric Widget Component
const MetricWidget = memo<{ data: any; onItemClick: (item: any) => void }>(({ 
  data, 
  onItemClick 
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {data.icon && (
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm">
            <data.icon className="w-5 h-5 text-blue-600" />
          </div>
        )}
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {data.value}
          </p>
          <p className="text-xs text-gray-600">
            {data.label}
          </p>
        </div>
      </div>
      
      {data.trend && (
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
          'backdrop-blur-sm border border-white/20',
          data.trend > 0 
            ? 'text-green-600 bg-green-50/80' 
            : data.trend < 0
            ? 'text-red-600 bg-red-50/80'
            : 'text-gray-600 bg-gray-50/80'
        )}>
          {data.trend > 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : data.trend < 0 ? (
            <TrendingUp className="w-3 h-3 rotate-180" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          <span>{Math.abs(data.trend)}%</span>
        </div>
      )}
    </div>
    
    {data.description && (
      <p className="text-xs text-gray-500 leading-relaxed">
        {data.description}
      </p>
    )}
  </div>
));

MetricWidget.displayName = 'MetricWidget';

// List Widget Component
const ListWidget = memo<{ 
  data: any; 
  expanded: boolean;
  onItemClick: (item: any) => void 
}>(({ data, expanded, onItemClick }) => {
  const displayItems = expanded ? data.items : data.items?.slice(0, 3);
  
  return (
    <div className="space-y-3">
      {displayItems?.map((item: any, index: number) => (
        <motion.div
          key={item.id || index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onItemClick(item)}
          className="flex items-center gap-3 p-2 rounded-lg bg-white/40 backdrop-blur-sm border border-white/20 hover:bg-white/60 cursor-pointer transition-colors"
        >
          {item.icon && (
            <div className="p-1.5 rounded-md bg-white/50">
              <item.icon className="w-4 h-4 text-gray-600" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {item.title}
            </p>
            {item.subtitle && (
              <p className="text-xs text-gray-500 truncate">
                {item.subtitle}
              </p>
            )}
          </div>
          
          {item.badge && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100/80 text-blue-700 rounded-full">
              {item.badge}
            </span>
          )}
          
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </motion.div>
      ))}
    </div>
  );
});

ListWidget.displayName = 'ListWidget';

// Progress Widget Component
const ProgressWidget = memo<{ data: any; onItemClick: (item: any) => void }>(({ 
  data, 
  onItemClick 
}) => (
  <div className="space-y-4">
    {data.items?.map((item: any, index: number) => (
      <div key={item.id || index} className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">
            {item.label}
          </span>
          <span className="text-sm text-gray-600">
            {item.value}%
          </span>
        </div>
        
        <div className="w-full bg-gray-100/80 rounded-full h-2 backdrop-blur-sm">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${item.value}%` }}
            transition={{ duration: 0.8, delay: index * 0.2 }}
            className={cn(
              'h-2 rounded-full bg-gradient-to-r',
              item.value >= 80 
                ? 'from-green-500 to-green-600'
                : item.value >= 60
                ? 'from-blue-500 to-blue-600'
                : item.value >= 40
                ? 'from-amber-500 to-amber-600'
                : 'from-red-500 to-red-600'
            )}
          />
        </div>
      </div>
    ))}
  </div>
));

ProgressWidget.displayName = 'ProgressWidget';

// Activity Widget Component
const ActivityWidget = memo<{ 
  data: any; 
  expanded: boolean;
  onItemClick: (item: any) => void 
}>(({ data, expanded, onItemClick }) => {
  const displayItems = expanded ? data.items : data.items?.slice(0, 4);
  
  return (
    <div className="space-y-3">
      {displayItems?.map((item: any, index: number) => (
        <motion.div
          key={item.id || index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onItemClick(item)}
          className="flex items-start gap-3 cursor-pointer group"
        >
          <div className={cn(
            'p-1.5 rounded-full backdrop-blur-sm border border-white/50',
            item.type === 'success' && 'bg-green-50/80 text-green-600',
            item.type === 'warning' && 'bg-amber-50/80 text-amber-600',
            item.type === 'error' && 'bg-red-50/80 text-red-600',
            !item.type && 'bg-blue-50/80 text-blue-600'
          )}>
            {item.type === 'success' ? (
              <CheckCircle className="w-3 h-3" />
            ) : item.type === 'warning' ? (
              <AlertCircle className="w-3 h-3" />
            ) : item.type === 'error' ? (
              <XCircle className="w-3 h-3" />
            ) : (
              <Activity className="w-3 h-3" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 group-hover:text-gray-700">
              {item.message}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(item.timestamp).toLocaleString()}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

ActivityWidget.displayName = 'ActivityWidget';

// Chart Widget Component (placeholder)
const ChartWidget = memo<{ data: any; onItemClick: (item: any) => void }>(({ 
  data, 
  onItemClick 
}) => (
  <div className="space-y-4">
    <div className="h-32 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-lg backdrop-blur-sm border border-white/20 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <TrendingUp className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">{data.type} Chart</p>
      </div>
    </div>
    
    {data.summary && (
      <div className="grid grid-cols-2 gap-3 text-center">
        {data.summary.map((item: any, index: number) => (
          <div key={index} className="p-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20">
            <p className="text-lg font-semibold text-gray-900">
              {item.value}
            </p>
            <p className="text-xs text-gray-600">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
));

ChartWidget.displayName = 'ChartWidget';

export default ProfessionalWidgets;