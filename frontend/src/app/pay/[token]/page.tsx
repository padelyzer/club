'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DollarSign, Check, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PaymentPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [playerData, setPlayerData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    fetchPaymentInfo();
  }, [token]);

  const fetchPaymentInfo = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/reservations/payments/${token}/payment_info/`);
      if (!response.ok) {
        throw new Error('Invalid payment link');
      }
      const data = await response.json();
      setPaymentInfo(data);
      setPaymentComplete(data.is_paid);
      if (data.is_paid) {
        setCheckInCode(data.check_in_code);
      }
    } catch (error) {
            toast.error('Link de pago inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerData.name || !playerData.email) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/reservations/payments/${token}/process_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          player_name: playerData.name,
          player_email: playerData.email,
          player_phone: playerData.phone,
        }),
      });

      if (!response.ok) {
        throw new Error('Error processing payment');
      }

      const data = await response.json();
      setPaymentComplete(true);
      setCheckInCode(data.check_in_code);
      toast.success('¡Pago procesado exitosamente!');
    } catch (error) {
            toast.error('Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información de pago...</p>
        </div>
      </div>
    );
  }

  if (!paymentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Link de pago inválido</h2>
            <p className="text-gray-600">Este link de pago no es válido o ha expirado.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Pago Completado!</h2>
            <p className="text-gray-600 mb-6">Tu pago ha sido procesado exitosamente</p>
            
            <div className="bg-gray-100 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Tu código de check-in es:</p>
              <p className="text-3xl font-mono font-bold text-primary-600">{checkInCode}</p>
              <p className="text-xs text-gray-500 mt-2">Presenta este código al llegar a la cancha</p>
            </div>

            <div className="text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Club:</span>
                <span className="font-medium">{paymentInfo.reservation.club_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cancha:</span>
                <span className="font-medium">{paymentInfo.reservation.court_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-medium">
                  {format(new Date(paymentInfo.reservation.date), "d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hora:</span>
                <span className="font-medium">
                  {paymentInfo.reservation.start_time} - {paymentInfo.reservation.end_time}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Completa tu pago</h1>
          
          {/* Reservation Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">{paymentInfo.reservation.club_name}</span>
              <span className="mx-2 text-gray-400">•</span>
              <span>{paymentInfo.reservation.court_name}</span>
            </div>
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <span>{format(new Date(paymentInfo.reservation.date), "EEEE d 'de' MMMM", { locale: es })}</span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              <span>{paymentInfo.reservation.start_time} - {paymentInfo.reservation.end_time}</span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="bg-primary-50 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-primary-600 mb-1">Monto a pagar:</p>
            <p className="text-3xl font-bold text-primary-700">${paymentInfo.amount.toFixed(2)}</p>
            <p className="text-xs text-primary-600 mt-1">
              (1 de {paymentInfo.reservation.split_count} jugadores)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player Info */}
            <div>
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                value={playerData.name}
                onChange={(e) => setPlayerData({ ...playerData, name: e.target.value })}
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={playerData.email}
                onChange={(e) => setPlayerData({ ...playerData, email: e.target.value })}
                placeholder="juan@ejemplo.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                value={playerData.phone}
                onChange={(e) => setPlayerData({ ...playerData, phone: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label>Método de pago</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer">
                    Tarjeta de crédito/débito
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex-1 cursor-pointer">
                    Efectivo (pagar en el club)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="transfer" id="transfer" />
                  <Label htmlFor="transfer" className="flex-1 cursor-pointer">
                    Transferencia bancaria
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={processing}
            >
              {processing ? (
                'Procesando...'
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Confirmar pago
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Al confirmar, recibirás un código de check-in único para presentar en la cancha
          </p>
        </Card>
      </div>
    </div>
  );
}