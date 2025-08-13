'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AppleCalendarImprovedProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  reservationDensity?: Record<string, 'none' | 'low' | 'medium' | 'high'>;
}

export const AppleCalendarImproved: React.FC<AppleCalendarImprovedProps> = ({
  selectedDate,
  onDateSelect,
  reservationDensity = {},
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Adjust for Monday start
  };

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

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getDensityIndicator = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const density = reservationDensity[dateStr] || 'none';
    
    if (density === 'none') return null;
    
    const colors = {
      low: 'bg-green-400',
      medium: 'bg-orange-400',
      high: 'bg-red-400'
    };
    
    return (
      <div className={cn(
        "absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
        colors[density]
      )} />
    );
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOffset = getFirstDayOfMonth(currentMonth);
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h3 className="text-lg font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 mb-1">
        {days.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOffset }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const dateForDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const isPast = dateForDay < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <motion.button
              key={day}
              whileHover={{ scale: 0.95 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => !isPast && onDateSelect(dateForDay)}
              disabled={isPast}
              className={cn(
                "relative aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all",
                isSelected(day) && "bg-blue-600 text-white shadow-sm",
                isToday(day) && !isSelected(day) && "bg-gray-100 text-gray-900 font-semibold",
                !isSelected(day) && !isToday(day) && !isPast && "hover:bg-gray-50 text-gray-700",
                isPast && "text-gray-300 cursor-not-allowed",
                !isPast && "cursor-pointer"
              )}
            >
              <span className="relative z-10">{day}</span>
              {getDensityIndicator(day)}
              {isToday(day) && !isSelected(day) && (
                <div className="absolute inset-0 rounded-xl ring-2 ring-blue-500 ring-inset" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Density Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-600 mb-2">Ocupación</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-gray-600">Baja</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-xs text-gray-600">Media</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs text-gray-600">Alta</span>
          </div>
        </div>
      </div>
    </div>
  );
};