'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppleCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  reservationDensity?: Record<string, 'none' | 'low' | 'medium' | 'high'>;
  className?: string;
}

export const AppleCalendar: React.FC<AppleCalendarProps> = ({
  selectedDate,
  onDateSelect,
  reservationDensity = {},
  className,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty days for the first week
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isSelectedDate = (day: number) => {
    return selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear();
  };

  const getDensityColor = (day: number) => {
    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const density = reservationDensity[dateKey] || 'none';

    switch (density) {
      case 'none':
        return '';
      case 'low':
        return 'bg-green-100 hover:bg-green-200';
      case 'medium':
        return 'bg-amber-100 hover:bg-amber-200';
      case 'high':
        return 'bg-red-100 hover:bg-red-200';
      default:
        return '';
    }
  };

  const getDensityIndicator = (day: number) => {
    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const density = reservationDensity[dateKey] || 'none';

    if (density === 'none') return null;

    return (
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
        <div className={cn(
          "w-1 h-1 rounded-full",
          density === 'low' && "bg-green-500",
          density === 'medium' && "bg-amber-500",
          density === 'high' && "bg-red-500"
        )} />
        {(density === 'medium' || density === 'high') && (
          <div className={cn(
            "w-1 h-1 rounded-full",
            density === 'medium' && "bg-amber-500",
            density === 'high' && "bg-red-500"
          )} />
        )}
        {density === 'high' && (
          <div className="w-1 h-1 rounded-full bg-red-500" />
        )}
      </div>
    );
  };

  return (
    <div className={cn("bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigateMonth('prev')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </motion.button>

        <h3 className="text-lg font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigateMonth('next')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </motion.button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        <AnimatePresence mode="popLayout">
          {days.map((day, index) => (
            <motion.div
              key={`${currentMonth.getMonth()}-${day || `empty-${index}`}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, delay: index * 0.01 }}
            >
              {day ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const newDate = new Date(currentMonth);
                    newDate.setDate(day);
                    onDateSelect(newDate);
                  }}
                  className={cn(
                    "relative aspect-square w-full rounded-lg flex items-center justify-center text-sm font-medium transition-all",
                    "hover:bg-gray-100",
                    isSelectedDate(day) && "bg-[#007AFF] text-white hover:bg-[#0051D5]",
                    isToday(day) && !isSelectedDate(day) && "ring-2 ring-[#007AFF] ring-offset-2",
                    !isSelectedDate(day) && getDensityColor(day)
                  )}
                >
                  <span className={cn(
                    isSelectedDate(day) && "text-white font-semibold"
                  )}>
                    {day}
                  </span>
                  {!isSelectedDate(day) && getDensityIndicator(day)}
                </motion.button>
              ) : (
                <div className="aspect-square w-full" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-600 mb-2">Densidad de reservas</p>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-100" />
            <span className="text-gray-500">Sin reservas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100" />
            <span className="text-gray-500">Pocas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-100" />
            <span className="text-gray-500">Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100" />
            <span className="text-gray-500">Muchas</span>
          </div>
        </div>
      </div>
    </div>
  );
};