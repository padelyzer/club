#!/usr/bin/env python
"""
Test de pago real por $1000 MXN
Este script simula un pago completo usando la API de Stripe.
"""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

import json
from datetime import datetime

from django.conf import settings

import stripe


def create_test_payment():
    """Crear un pago de prueba por $1000 MXN."""
    print("💳 CREANDO PAGO DE PRUEBA - $1000 MXN")
    print("=" * 50)

    # Configurar Stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        # Crear Payment Intent
        print("🔄 Paso 1: Creando Payment Intent...")
        payment_intent = stripe.PaymentIntent.create(
            amount=100000,  # $1000.00 MXN en centavos
            currency="mxn",
            payment_method_types=["card"],
            description="Pago de prueba - Reserva de cancha de pádel",
            metadata={
                "reservation_id": "res_test_001",
                "club_id": "club_padel_mx",
                "court_id": "cancha_001",
                "customer_email": "test@padelyzer.com",
                "booking_date": "2025-07-30",
                "booking_time": "18:00",
                "test_payment": "true",
            },
            receipt_email="test@padelyzer.com",
        )

        pi_dict = dict(payment_intent)

        print(f"✅ Payment Intent creado exitosamente!")
        print(
            f"   💰 Monto: ${pi_dict['amount']/100:.2f} {pi_dict['currency'].upper()}"
        )
        print(f"   🆔 ID: {pi_dict['id']}")
        print(f"   📧 Email: {pi_dict.get('receipt_email', 'N/A')}")
        print(f"   📝 Descripción: {pi_dict.get('description', 'N/A')}")
        print(f"   🔐 Client Secret: {pi_dict['client_secret'][:30]}...")
        print(f"   📊 Estado: {pi_dict['status']}")

        # Mostrar metadata
        print(f"\n📋 Metadata de la reserva:")
        for key, value in pi_dict.get("metadata", {}).items():
            print(f"   {key}: {value}")

        # Simular confirmación del pago (en producción esto lo haría el frontend)
        print(f"\n🔄 Paso 2: Simulando confirmación de pago...")
        print(f"   🏦 En producción, el cliente ingresaría:")
        print(f"   • Número de tarjeta de prueba: 4242 4242 4242 4242")
        print(f"   • Fecha de vencimiento: 12/28")
        print(f"   • CVC: 123")
        print(f"   • Código postal: 12345")

        # Mostrar URLs para testing
        print(f"\n🌐 URLs para testing:")
        print(f"   Webhook URL: http://localhost:9200/api/v1/finance/webhooks/stripe/")
        print(f"   Client Secret para frontend: {pi_dict['client_secret']}")

        # Crear un evento de webhook simulado
        print(f"\n🎣 Paso 3: Simulando evento de webhook...")
        webhook_event = {
            "id": f'evt_test_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
            "type": "payment_intent.succeeded",
            "created": int(datetime.now().timestamp()),
            "data": {"object": pi_dict},
            "livemode": False,
            "pending_webhooks": 1,
            "request": {"id": f'req_test_{datetime.now().strftime("%H%M%S")}'},
        }

        print(f"✅ Evento de webhook simulado:")
        print(f"   🆔 Event ID: {webhook_event['id']}")
        print(f"   📡 Tipo: {webhook_event['type']}")
        print(f"   ⏰ Timestamp: {webhook_event['created']}")

        # Guardar detalles del pago para referencia
        payment_details = {
            "payment_intent_id": pi_dict["id"],
            "amount": pi_dict["amount"],
            "currency": pi_dict["currency"],
            "client_secret": pi_dict["client_secret"],
            "status": pi_dict["status"],
            "created": datetime.now().isoformat(),
            "metadata": pi_dict.get("metadata", {}),
            "webhook_event": webhook_event,
        }

        # Escribir a archivo para referencia
        with open("test_payment_details.json", "w") as f:
            json.dump(payment_details, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Detalles guardados en: test_payment_details.json")

        print(f"\n🎯 RESULTADO DEL TEST:")
        print(f"✅ Payment Intent de $1000 MXN creado exitosamente")
        print(f"✅ Metadata de reserva configurada correctamente")
        print(f"✅ Email de recibo configurado")
        print(f"✅ Webhook event simulado")
        print(f"✅ Listo para integración con frontend")

        print(f"\n📱 PARA PROBAR EN FRONTEND:")
        print(f"1. Usar client_secret: {pi_dict['client_secret']}")
        print(f"2. Integrar con Stripe Elements")
        print(f"3. Usar tarjetas de prueba de Stripe")
        print(f"4. Los webhooks actualizarán automáticamente el estado")

        return payment_intent

    except stripe.error.CardError as e:
        print(f"❌ Error de tarjeta: {e}")
        return None
    except stripe.error.RateLimitError as e:
        print(f"❌ Rate limit excedido: {e}")
        return None
    except stripe.error.InvalidRequestError as e:
        print(f"❌ Request inválido: {e}")
        return None
    except stripe.error.AuthenticationError as e:
        print(f"❌ Error de autenticación: {e}")
        return None
    except stripe.error.APIConnectionError as e:
        print(f"❌ Error de conexión API: {e}")
        return None
    except stripe.error.StripeError as e:
        print(f"❌ Error genérico de Stripe: {e}")
        return None
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return None


def show_test_cards():
    """Mostrar tarjetas de prueba disponibles."""
    print(f"\n💳 TARJETAS DE PRUEBA DISPONIBLES:")
    print(f"=" * 40)

    test_cards = [
        {
            "number": "4242 4242 4242 4242",
            "description": "Visa - Pago exitoso",
            "cvc": "Cualquier 3 dígitos",
            "exp": "Cualquier fecha futura",
        },
        {
            "number": "4000 0000 0000 0002",
            "description": "Visa - Tarjeta declinada",
            "cvc": "Cualquier 3 dígitos",
            "exp": "Cualquier fecha futura",
        },
        {
            "number": "4000 0000 0000 9995",
            "description": "Visa - Fondos insuficientes",
            "cvc": "Cualquier 3 dígitos",
            "exp": "Cualquier fecha futura",
        },
        {
            "number": "4000 0084 0000 1629",
            "description": "Visa - Requiere 3D Secure",
            "cvc": "Cualquier 3 dígitos",
            "exp": "Cualquier fecha futura",
        },
    ]

    for i, card in enumerate(test_cards, 1):
        print(f"{i}. {card['description']}")
        print(f"   Número: {card['number']}")
        print(f"   CVC: {card['cvc']}")
        print(f"   Exp: {card['exp']}")
        print()


def main():
    """Función principal."""
    print("🧪 TEST DE PAGO STRIPE - $1000 MXN")
    print("🇲🇽 Simulando reserva de cancha de pádel")
    print("=" * 60)

    # Mostrar configuración
    print(f"🔧 Configuración:")
    print(f"   Stripe API Key: {settings.STRIPE_SECRET_KEY[:15]}...")
    print(f"   Publishable Key: {settings.STRIPE_PUBLISHABLE_KEY[:15]}...")
    print(f"   Webhook Secret: {settings.STRIPE_WEBHOOK_SECRET[:15]}...")

    # Crear el pago
    payment_intent = create_test_payment()

    if payment_intent:
        # Mostrar tarjetas de prueba
        show_test_cards()

        print(f"\n🚀 SIGUIENTE PASO:")
        print(f"Para completar el pago, usa el client_secret en tu frontend")
        print(f"con Stripe Elements y una de las tarjetas de prueba arriba.")

        return True
    else:
        print(f"\n❌ Error al crear el pago de prueba")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
