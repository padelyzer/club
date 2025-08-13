'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Smartphone,
  Building,
  DollarSign,
  Shield,
  Zap,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

interface PaymentGateway {
// id: string;
  name: string;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
// features: string[];
  countries: string[];
  isRecommended?: boolean;
  isAvailable: boolean;
  setupComplexity: 'low' | 'medium' | 'high';
}

interface PaymentGatewaySelectorProps {
// selectedGateway: string;
  onGatewayChange: (gatewayId: string) => void;
  country?: string;
}

const PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
// id: 'stripe'
// name: 'Stripe'
// displayName: 'Stripe'
// description: 'Plataforma de pagos global con excelente integración y soporte'
// icon: <CreditCard className="w-6 h-6" />
// fees: {
      percentage: 3.6
// fixed: 3
// currency: 'MXN'
    },
// features: [
      'Tarjetas de crédito y débito'
      'Pagos recurrentes',
      'Protección contra fraude',
      'Dashboard completo',
      'API robusta',
      'Webhooks automáticos',
    ],
    countries: ['US', 'MX', 'CA', 'GB', 'FR', 'DE', 'AU'],
// isRecommended: true
// isAvailable: true
// setupComplexity: 'medium'
  },
  {
// id: 'mercadopago'
// name: 'MercadoPago'
// displayName: 'Mercado Pago'
// description: 'Solución de pagos líder en América Latina con múltiples opciones'
// icon: <Smartphone className="w-6 h-6" />
// fees: {
      percentage: 4.99
// fixed: 0
// currency: 'MXN'
    },
// features: [
      'Tarjetas de crédito y débito'
      'OXXO y tiendas de conveniencia',
      'Transferencias bancarias',
      'Mercado Pago Wallet',
      'Pagos en cuotas',
      'QR Code payments',
    ],
    countries: ['MX', 'AR', 'BR', 'CL', 'CO', 'PE', 'UY'],
// isRecommended: true
// isAvailable: true
// setupComplexity: 'low'
  },
  {
// id: 'paypal'
// name: 'PayPal'
// displayName: 'PayPal'
// description: 'Plataforma de pagos reconocida mundialmente'
// icon: <Building className="w-6 h-6" />
// fees: {
      percentage: 4.4
// fixed: 3
// currency: 'MXN'
    },
// features: [
      'PayPal Wallet'
      'Tarjetas de crédito y débito',
      'Protección al comprador',
      'Pagos internacionales',
      'Facturación automática',
    ],
    countries: ['US', 'MX', 'CA', 'GB', 'FR', 'DE', 'AU', 'BR', 'AR'],
// isAvailable: true
// setupComplexity: 'medium'
  },
  {
// id: 'openpay'
// name: 'OpenPay'
// displayName: 'OpenPay'
// description: 'Solución de pagos mexicana con tarifas competitivas'
// icon: <DollarSign className="w-6 h-6" />
// fees: {
      percentage: 2.9
// fixed: 3
// currency: 'MXN'
    },
// features: [
      'Tarjetas de crédito y débito'
      'SPEI (transferencias)',
      'Tiendas de conveniencia',
      'Pagos recurrentes',
      'Anti-fraude incluido',
    ],
// countries: ['MX']
// isAvailable: true
// setupComplexity: 'medium'
  },
  {
// id: 'conekta'
// name: 'Conekta'
// displayName: 'Conekta'
// description: 'Plataforma de pagos mexicana enfocada en e-commerce'
// icon: <CreditCard className="w-6 h-6" />
// fees: {
      percentage: 3.6
// fixed: 3
// currency: 'MXN'
    },
// features: [
      'Tarjetas de crédito y débito'
      'OXXO y tiendas',
      'SPEI',
      'Pagos recurrentes',
      'Split payments',
    ],
// countries: ['MX']
// isAvailable: true
// setupComplexity: 'low'
  },
];

export const PaymentGatewaySelector = ({
  selectedGateway,
  onGatewayChange,
  country = 'MX',
}: PaymentGatewaySelectorProps) => {
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const availableGateways = PAYMENT_GATEWAYS.filter(
    (gateway) => gateway.isAvailable && gateway.countries.includes(country)
  );

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
// default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplexityText = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'Fácil';
      case 'medium':
        return 'Intermedio';
      case 'high':
        return 'Complejo';
// default: return complexity;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Selecciona tu pasarela de pagos
        </h3>
        <p className="text-gray-600">
          Elige la plataforma que mejor se adapte a tus necesidades y ubicación
        </p>
      </div>

      <RadioGroup value={selectedGateway || ''} onValueChange={onGatewayChange}>
        <div className="space-y-4">
          {availableGateways.map((gateway, index) => (
            <motion.div
              key={gateway.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`p-4 transition-all cursor-pointer ${
                  selectedGateway === gateway.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <RadioGroupItem
                    value={gateway.id || ''}
                    id={gateway.id}
                    className="mt-1"
                  />

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          {gateway.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {gateway.displayName}
                            </h4>
                            {gateway.isRecommended && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Recomendado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {gateway.description}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setShowDetails(
                            showDetails === gateway.id ? null : gateway.id
                          )
                        }
                      >
                        {showDetails === gateway.id ? 'Ocultar' : 'Ver'}{' '}
                        detalles
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          {gateway.fees.percentage}%
                          {gateway.fees.fixed > 0 &&
                            ` + $${gateway.fees.fixed} ${gateway.fees.currency}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        <span>Seguro</span>
                      </div>

                      <Badge
                        className={getComplexityColor(gateway.setupComplexity)}
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Configuración{' '}
                        {getComplexityText(gateway.setupComplexity)}
                      </Badge>
                    </div>

                    {showDetails === gateway.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-gray-200"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium mb-2">
                              Métodos de pago
                            </h5>
                            <ul className="space-y-1">
                              {gateway.features.map((feature, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm text-gray-600 flex items-center gap-2"
                                >
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-medium mb-2">
                              Información adicional
                            </h5>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-600">
                                  Comisión:{' '}
                                </span>
                                <span className="font-medium">
                                  {gateway.fees.percentage}%
                                  {gateway.fees.fixed > 0 &&
                                    ` + $${gateway.fees.fixed}`}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Configuración:{' '}
                                </span>
                                <span className="font-medium">
                                  {getComplexityText(gateway.setupComplexity)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Países: </span>
                                <span className="font-medium">
                                  {gateway.countries.join(', ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </RadioGroup>

      {selectedGateway && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                Configuración requerida
              </h4>
              <p className="text-sm text-blue-800">
                Después de guardar esta configuración, necesitarás proporcionar
                las credenciales de tu cuenta de{' '}
                {
                  availableGateways.find((g) => g.id === selectedGateway)
// displayName
                }{' '}
                para completar la integración.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
