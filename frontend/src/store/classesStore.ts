import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Class,
  Instructor,
  ClassBooking,
  ClassFilters,
  ClassSearchParams,
  CalendarViewSettings,
  ClassSchedule,
  ClassPackage,
  ClassAnalytics,
  InstructorAnalytics,
  CalendarEvent,
} from '@/types/class';
import { OptimisticUpdate } from '@/types';

export type ClassViewMode = 'list' | 'calendar' | 'schedule';
export type CalendarView = 'day' | 'week' | 'month';

interface ClassesStore {
  // Data State
  classes: Class[];
  instructors: Instructor[];
  bookings: ClassBooking[];
  schedules: ClassSchedule[];
  packages: ClassPackage[];

  // Pagination & Filtering
  totalClasses: number;
  currentPage: number;
  pageSize: number;
  filters: ClassFilters;
  searchQuery: string;
  sortBy: ClassSearchParams['sortBy'];
  sortOrder: ClassSearchParams['sortOrder'];

  // Loading & Error States
  loading: boolean;
  error: string | null;
  loadingBookings: boolean;
  loadingInstructors: boolean;
  loadingSchedules: boolean;

  // UI State
  viewMode: ClassViewMode;
  selectedClass: Class | null;
  selectedInstructor: Instructor | null;
  selectedBooking: ClassBooking | null;

  // Calendar State
  calendarView: CalendarView;
  calendarDate: Date;
  calendarEvents: CalendarEvent[];
  calendarSettings: CalendarViewSettings;

  // Modal & Form States
  isClassFormOpen: boolean;
  isBookingFormOpen: boolean;
  isInstructorFormOpen: boolean;
  isScheduleFormOpen: boolean;
  isClassDetailOpen: boolean;
  isAttendanceModalOpen: boolean;
  editingClass: Class | null;
  editingInstructor: Instructor | null;
  editingSchedule: ClassSchedule | null;

  // Analytics State
  classAnalytics: Record<string, ClassAnalytics>;
  instructorAnalytics: Record<string, InstructorAnalytics>;

  // Optimistic Updates
  optimisticUpdates: OptimisticUpdate<any>[];

  // Actions - Data Management
  setClasses: (classes: Class[], total: number) => void;
  setInstructors: (instructors: Instructor[]) => void;
  setBookings: (bookings: ClassBooking[]) => void;
  setSchedules: (schedules: ClassSchedule[]) => void;
  setPackages: (packages: ClassPackage[]) => void;

  // Actions - CRUD Operations
  addClass: (classData: Class) => void;
  updateClass: (id: string, classData: Partial<Class>) => void;
  removeClass: (id: string) => void;
  addInstructor: (instructor: Instructor) => void;
  updateInstructor: (id: string, instructor: Partial<Instructor>) => void;
  removeInstructor: (id: string) => void;
  addBooking: (booking: ClassBooking) => void;
  updateBooking: (id: string, booking: Partial<ClassBooking>) => void;
  removeBooking: (id: string) => void;

  // Actions - Search & Filter
  setFilters: (filters: Partial<ClassFilters>) => void;
  setSearchQuery: (query: string) => void;
  setSorting: (
    sortBy: ClassSearchParams['sortBy'],
    sortOrder: ClassSearchParams['sortOrder']
  ) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetFilters: () => void;

  // Actions - UI State
  setViewMode: (mode: ClassViewMode) => void;
  setSelectedClass: (classItem: Class | null) => void;
  setSelectedInstructor: (instructor: Instructor | null) => void;
  setSelectedBooking: (booking: ClassBooking | null) => void;

  // Actions - Calendar
  setCalendarView: (view: CalendarView) => void;
  setCalendarDate: (date: Date) => void;
  setCalendarEvents: (events: CalendarEvent[]) => void;
  setCalendarSettings: (settings: Partial<CalendarViewSettings>) => void;
  navigateCalendar: (direction: 'prev' | 'next' | 'today') => void;

  // Actions - Modal Management
  openClassForm: (classItem?: Class) => void;
  closeClassForm: () => void;
  openBookingForm: (classItem?: Class) => void;
  closeBookingForm: () => void;
  openInstructorForm: (instructor?: Instructor) => void;
  closeInstructorForm: () => void;
  openScheduleForm: (schedule?: ClassSchedule) => void;
  closeScheduleForm: () => void;
  openClassDetail: (classItem: Class) => void;
  closeClassDetail: () => void;
  openAttendanceModal: (classItem: Class) => void;
  closeAttendanceModal: () => void;

  // Actions - Loading & Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLoadingBookings: (loading: boolean) => void;
  setLoadingInstructors: (loading: boolean) => void;
  setLoadingSchedules: (loading: boolean) => void;

  // Actions - Analytics
  setClassAnalytics: (classId: string, analytics: ClassAnalytics) => void;
  setInstructorAnalytics: (
    instructorId: string,
    analytics: InstructorAnalytics
  ) => void;

  // Actions - Optimistic Updates
  addOptimisticUpdate: (update: OptimisticUpdate<any>) => void;
  updateOptimisticUpdate: (
    id: string,
    status: OptimisticUpdate<any>['status']
  ) => void;
  removeOptimisticUpdate: (id: string) => void;
  clearOptimisticUpdates: () => void;

  // Actions - Utilities
  getClassById: (id: string) => Class | undefined;
  getInstructorById: (id: string) => Instructor | undefined;
  getBookingById: (id: string) => ClassBooking | undefined;
  getClassesByInstructor: (instructorId: string) => Class[];
  getAvailableSpots: (classId: string) => number;
  isClassFull: (classId: string) => boolean;
  canBookClass: (classId: string, studentId: string) => boolean;
  resetState: () => void;
}

const initialState = {
  // Data State
  classes: [],
  instructors: [],
  bookings: [],
  schedules: [],
  packages: [],

  // Pagination & Filtering
  totalClasses: 0,
  currentPage: 1,
  pageSize: 20,
  filters: {},
  searchQuery: '',
  sortBy: 'date' as const,
  sortOrder: 'asc' as const,

  // Loading & Error States
  loading: false,
  error: null,
  loadingBookings: false,
  loadingInstructors: false,
  loadingSchedules: false,

  // UI State
  viewMode: 'list' as const,
  selectedClass: null,
  selectedInstructor: null,
  selectedBooking: null,

  // Calendar State
  calendarView: 'week' as const,
  calendarDate: new Date(),
  calendarEvents: [],
  calendarSettings: {
    view: 'week' as const,
    date: new Date(),
    showBookings: true,
    showAvailability: true,
  },

  // Modal & Form States
  isClassFormOpen: false,
  isBookingFormOpen: false,
  isInstructorFormOpen: false,
  isScheduleFormOpen: false,
  isClassDetailOpen: false,
  isAttendanceModalOpen: false,
  editingClass: null,
  editingInstructor: null,
  editingSchedule: null,

  // Analytics State
  classAnalytics: {},
  instructorAnalytics: {},

  // Optimistic Updates
  optimisticUpdates: [],
};

export const useClassesStore = create<ClassesStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Data Management Actions
        setClasses: (classes, total) =>
          set((state) => {
            state.classes = classes;
            state.totalClasses = total;
          }),

        setInstructors: (instructors) =>
          set((state) => {
            state.instructors = instructors;
          }),

        setBookings: (bookings) =>
          set((state) => {
            state.bookings = bookings;
          }),

        setSchedules: (schedules) =>
          set((state) => {
            state.schedules = schedules;
          }),

        setPackages: (packages) =>
          set((state) => {
            state.packages = packages;
          }),

        // CRUD Operations
        addClass: (classData) =>
          set((state) => {
            state.classes.unshift(classData);
            state.totalClasses += 1;
          }),

        updateClass: (id, classData) =>
          set((state) => {
            const index = state.classes.findIndex((c) => c.id === id);
            if (index !== -1) {
              state.classes[index] = { ...state.classes[index], ...classData };
            }
            if (state.selectedClass?.id === id) {
              state.selectedClass = { ...state.selectedClass, ...classData };
            }
          }),

        removeClass: (id) =>
          set((state) => {
            state.classes = state.classes.filter((c) => c.id !== id);
            state.totalClasses -= 1;
            if (state.selectedClass?.id === id) {
              state.selectedClass = null;
            }
          }),

        addInstructor: (instructor) =>
          set((state) => {
            state.instructors.unshift(instructor);
          }),

        updateInstructor: (id, instructor) =>
          set((state) => {
            const index = state.instructors.findIndex((i) => i.id === id);
            if (index !== -1) {
              state.instructors[index] = {
                ...state.instructors[index],
                ...instructor,
              };
            }
            if (state.selectedInstructor?.id === id) {
              state.selectedInstructor = {
                ...state.selectedInstructor,
                ...instructor,
              };
            }
          }),

        removeInstructor: (id) =>
          set((state) => {
            state.instructors = state.instructors.filter((i) => i.id !== id);
            if (state.selectedInstructor?.id === id) {
              state.selectedInstructor = null;
            }
          }),

        addBooking: (booking) =>
          set((state) => {
            state.bookings.unshift(booking);
            // Update class participant count
            const classIndex = state.classes.findIndex(
              (c) => c.id === booking.class.id
            );
            if (classIndex !== -1) {
              state.classes[classIndex].currentParticipants += 1;
            }
          }),

        updateBooking: (id, booking) =>
          set((state) => {
            const index = state.bookings.findIndex((b) => b.id === id);
            if (index !== -1) {
              state.bookings[index] = { ...state.bookings[index], ...booking };
            }
            if (state.selectedBooking?.id === id) {
              state.selectedBooking = { ...state.selectedBooking, ...booking };
            }
          }),

        removeBooking: (id) =>
          set((state) => {
            const booking = state.bookings.find((b) => b.id === id);
            state.bookings = state.bookings.filter((b) => b.id !== id);

            // Update class participant count
            if (booking) {
              const classIndex = state.classes.findIndex(
                (c) => c.id === booking.class.id
              );
              if (classIndex !== -1) {
                state.classes[classIndex].currentParticipants -= 1;
              }
            }

            if (state.selectedBooking?.id === id) {
              state.selectedBooking = null;
            }
          }),

        // Search & Filter Actions
        setFilters: (filters) =>
          set((state) => {
            state.filters = { ...state.filters, ...filters };
            state.currentPage = 1; // Reset to first page when filtering
          }),

        setSearchQuery: (query) =>
          set((state) => {
            state.searchQuery = query;
            state.currentPage = 1; // Reset to first page when searching
          }),

        setSorting: (sortBy, sortOrder) =>
          set((state) => {
            state.sortBy = sortBy;
            state.sortOrder = sortOrder;
          }),

        setCurrentPage: (page) =>
          set((state) => {
            state.currentPage = page;
          }),

        setPageSize: (size) =>
          set((state) => {
            state.pageSize = size;
            state.currentPage = 1; // Reset to first page when changing page size
          }),

        resetFilters: () =>
          set((state) => {
            state.filters = {};
            state.searchQuery = '';
            state.currentPage = 1;
            state.sortBy = 'date';
            state.sortOrder = 'asc';
          }),

        // UI State Actions
        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode;
          }),

        setSelectedClass: (classItem) =>
          set((state) => {
            state.selectedClass = classItem;
          }),

        setSelectedInstructor: (instructor) =>
          set((state) => {
            state.selectedInstructor = instructor;
          }),

        setSelectedBooking: (booking) =>
          set((state) => {
            state.selectedBooking = booking;
          }),

        // Calendar Actions
        setCalendarView: (view) =>
          set((state) => {
            state.calendarView = view;
            state.calendarSettings.view = view;
          }),

        setCalendarDate: (date) =>
          set((state) => {
            state.calendarDate = date;
            state.calendarSettings.date = date;
          }),

        setCalendarEvents: (events) =>
          set((state) => {
            state.calendarEvents = events;
          }),

        setCalendarSettings: (settings) =>
          set((state) => {
            state.calendarSettings = { ...state.calendarSettings, ...settings };
          }),

        navigateCalendar: (direction) =>
          set((state) => {
            const currentDate = state.calendarDate;
            let newDate: Date;

            switch (direction) {
              case 'prev':
                if (state.calendarView === 'day') {
                  newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() - 1);
                } else if (state.calendarView === 'week') {
                  newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() - 7);
                } else {
                  newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() - 1);
                }
                break;
              case 'next':
                if (state.calendarView === 'day') {
                  newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() + 1);
                } else if (state.calendarView === 'week') {
                  newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() + 7);
                } else {
                  newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() + 1);
                }
                break;
              case 'today':
              default:
                newDate = new Date();
                break;
            }

            state.calendarDate = newDate;
            state.calendarSettings.date = newDate;
          }),

        // Modal Management Actions
        openClassForm: (classItem) =>
          set((state) => {
            state.isClassFormOpen = true;
            state.editingClass = classItem || null;
          }),

        closeClassForm: () =>
          set((state) => {
            state.isClassFormOpen = false;
            state.editingClass = null;
          }),

        openBookingForm: (classItem) =>
          set((state) => {
            state.isBookingFormOpen = true;
            state.selectedClass = classItem || null;
          }),

        closeBookingForm: () =>
          set((state) => {
            state.isBookingFormOpen = false;
          }),

        openInstructorForm: (instructor) =>
          set((state) => {
            state.isInstructorFormOpen = true;
            state.editingInstructor = instructor || null;
          }),

        closeInstructorForm: () =>
          set((state) => {
            state.isInstructorFormOpen = false;
            state.editingInstructor = null;
          }),

        openScheduleForm: (schedule) =>
          set((state) => {
            state.isScheduleFormOpen = true;
            state.editingSchedule = schedule || null;
          }),

        closeScheduleForm: () =>
          set((state) => {
            state.isScheduleFormOpen = false;
            state.editingSchedule = null;
          }),

        openClassDetail: (classItem) =>
          set((state) => {
            state.isClassDetailOpen = true;
            state.selectedClass = classItem;
          }),

        closeClassDetail: () =>
          set((state) => {
            state.isClassDetailOpen = false;
          }),

        openAttendanceModal: (classItem) =>
          set((state) => {
            state.isAttendanceModalOpen = true;
            state.selectedClass = classItem;
          }),

        closeAttendanceModal: () =>
          set((state) => {
            state.isAttendanceModalOpen = false;
          }),

        // Loading & Error Actions
        setLoading: (loading) =>
          set((state) => {
            state.loading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        setLoadingBookings: (loading) =>
          set((state) => {
            state.loadingBookings = loading;
          }),

        setLoadingInstructors: (loading) =>
          set((state) => {
            state.loadingInstructors = loading;
          }),

        setLoadingSchedules: (loading) =>
          set((state) => {
            state.loadingSchedules = loading;
          }),

        // Analytics Actions
        setClassAnalytics: (classId, analytics) =>
          set((state) => {
            state.classAnalytics[classId] = analytics;
          }),

        setInstructorAnalytics: (instructorId, analytics) =>
          set((state) => {
            state.instructorAnalytics[instructorId] = analytics;
          }),

        // Optimistic Updates Actions
        addOptimisticUpdate: (update) =>
          set((state) => {
            state.optimisticUpdates.push(update);
          }),

        updateOptimisticUpdate: (id, status) =>
          set((state) => {
            const index = state.optimisticUpdates.findIndex((u) => u.id === id);
            if (index !== -1) {
              state.optimisticUpdates[index].status = status;
            }
          }),

        removeOptimisticUpdate: (id) =>
          set((state) => {
            state.optimisticUpdates = state.optimisticUpdates.filter(
              (u) => u.id !== id
            );
          }),

        clearOptimisticUpdates: () =>
          set((state) => {
            state.optimisticUpdates = [];
          }),

        // Utility Actions
        getClassById: (id) => {
          return get().classes.find((c) => c.id === id);
        },

        getInstructorById: (id) => {
          return get().instructors.find((i) => i.id === id);
        },

        getBookingById: (id) => {
          return get().bookings.find((b) => b.id === id);
        },

        getClassesByInstructor: (instructorId) => {
          return get().classes.filter((c) => c.instructor.id === instructorId);
        },

        getAvailableSpots: (classId) => {
          const classItem = get().classes.find((c) => c.id === classId);
          if (!classItem) return 0;
          return classItem.maxParticipants - classItem.currentParticipants;
        },

        isClassFull: (classId) => {
          const availableSpots = get().getAvailableSpots(classId);
          return availableSpots <= 0;
        },

        canBookClass: (classId, studentId) => {
          const classItem = get().classes.find((c) => c.id === classId);
          if (!classItem) return false;

          // Check if class is full (accounting for waiting list)
          if (classItem.status !== 'scheduled') return false;

          // Check if student already booked
          const existingBooking = get().bookings.find(
            (b) =>
              b.class.id === classId &&
              b.student.id === studentId &&
              b.status !== 'cancelled'
          );

          return !existingBooking;
        },

        resetState: () => set(() => ({ ...initialState })),
      })),
      {
        name: 'classes-store',
        partialize: (state) => ({
          // Only persist UI preferences and filters
          viewMode: state.viewMode,
          calendarView: state.calendarView,
          calendarSettings: state.calendarSettings,
          pageSize: state.pageSize,
          filters: state.filters,
        }),
      }
    ),
    { name: 'classes-store' }
  )
);
