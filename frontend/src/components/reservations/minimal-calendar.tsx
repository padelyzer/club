'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinimalCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  reservationDensity?: Record<string, 'none' | 'low' | 'medium' | 'high'>;
}

export const MinimalCalendar: React.FC<MinimalCalendarProps> = ({
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

  const hasDensity = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const density = reservationDensity[dateStr];
    return density && density !== 'none';
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOffset = getFirstDayOfMonth(currentMonth);
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-medium text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-50 rounded-md transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-50 rounded-md transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div
            key={day}
            className="text-center text-xs text-gray-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
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
            <button
              key={day}
              onClick={() => !isPast && onDateSelect(dateForDay)}
              disabled={isPast}
              className={cn(
                "relative aspect-square flex items-center justify-center rounded-lg text-sm transition-all",
                isSelected(day) && "bg-gray-900 text-white font-medium",
                isToday(day) && !isSelected(day) && "font-semibold text-gray-900",
                !isSelected(day) && !isToday(day) && !isPast && "hover:bg-gray-50 text-gray-600",
                isPast && "text-gray-300 cursor-not-allowed",
                !isPast && "cursor-pointer"
              )}
            >
              {day}
              {hasDensity(day) && !isSelected(day) && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};