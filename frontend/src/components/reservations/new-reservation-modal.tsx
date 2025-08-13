import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { useUIStore } from '@/store/ui';
// import { AppleBookingFlow } from './apple-booking-flow';
import { toast } from '@/lib/toast';

// Mobile detection utility
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for mobile user agents
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check for touch capability and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const smallScreen = window.innerWidth <= 768;
  
  return mobileUA || (hasTouchScreen && smallScreen);
};

interface NewReservationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  startWithPartnerStep?: boolean;
  initialDate?: Date;
  initialCourt?: string;
}

export const NewReservationModal = ({ 
  isOpen: propIsOpen, 
  onClose: propOnClose,
  startWithPartnerStep = false,
  initialDate,
  initialCourt
}: NewReservationModalProps = {}) => {
  const { activeModal, closeModal } = useUIStore();
  const isOpen = propIsOpen !== undefined ? propIsOpen : (activeModal === 'new-reservation');
  const onClose = propOnClose || closeModal;
  const [isMobile, setIsMobile] = useState(false);

  // Club ID will be handled by AppleBookingFlow using context

  useEffect(() => {
    setIsMobile(isMobileDevice());
    
    // Listen for window resize to handle device orientation changes
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSuccess = (reservation: any) => {
    toast.success('Reserva creada exitosamente');
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={
              isMobile 
                ? "relative w-full h-full bg-gray-50 overflow-hidden flex flex-col" 
                : "relative w-full max-w-5xl max-h-[90vh] bg-gray-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            }
          >
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Nueva Reserva</h2>
                    <p className="text-sm text-gray-500">Reserva tu cancha favorita</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              {/* Temporalmente deshabilitado mientras se arreglan errores de sintaxis */}
              <div className="p-8 text-center text-gray-500">
                <p>Sistema de reservas en mantenimiento</p>
                <p className="text-sm mt-2">Pronto volveremos a estar disponibles</p>
              </div>
              {/* <AppleBookingFlow
                onSuccess={handleSuccess}
                onCancel={handleCancel}
                initialDate={initialDate}
                initialCourt={initialCourt}
              /> */}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};