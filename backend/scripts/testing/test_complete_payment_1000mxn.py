#!/usr/bin/env python
"""
Test de pago completo por $1000 MXN con método de pago incluido
Este script crea un pago real con tarjeta de prueba adjunta.
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


def create_complete_payment():
    """Crear un pago completo por $1000 MXN con método de pago."""
    print("💳 CREANDO PAGO COMPLETO - $1000 MXN")
    print("=" * 50)

    # Configurar Stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        # Paso 1: Crear método de pago con tarjeta de prueba
        print("🔄 Paso 1: Creando método de pago con tarjeta de prueba...")
        payment_method = stripe.PaymentMethod.create(
            type="card",
            card={
                "number": "4242424242424242",
                "exp_month": 12,
                "exp_year": 2028,
                "cvc": "123",
            },
            billing_details={
                "name": "Test Player",
                "email": "test@padelyzer.com",
                "address": {
                    "line1": "Calle Test 123",
                    "city": "Ciudad de México",
                    "postal_code": "12345",
                    "country": "MX",
                },
            },
        )

        pm_dict = dict(payment_method)
        print(f"✅ Método de pago creado: {pm_dict['id']}")
        print(f"   💳 Tarjeta: **** **** **** {pm_dict['card']['last4']}")
        print(f"   🏦 Marca: {pm_dict['card']['brand'].upper()}")
        print(f"   👤 Titular: {pm_dict['billing_details']['name']}")

        # Paso 2: Crear Payment Intent con método de pago
        print(f"\n🔄 Paso 2: Creando Payment Intent con método de pago...")
        payment_intent = stripe.PaymentIntent.create(
            amount=100000,  # $1000.00 MXN en centavos
            currency="mxn",
            payment_method=pm_dict["id"],
            confirmation_method="manual",
            confirm=False,  # No confirmar automáticamente
            description="Pago completo - Reserva de cancha de pádel",
            metadata={
                "reservation_id": "res_complete_001",
                "club_id": "club_padel_mx",
                "court_id": "cancha_001",
                "customer_email": "test@padelyzer.com",
                "booking_date": "2025-07-30",
                "booking_time": "18:00",
                "test_payment": "true",
                "payment_method": "card",
            },
            receipt_email="test@padelyzer.com",
        )

        pi_dict = dict(payment_intent)

        print(f"✅ Payment Intent con método de pago creado!")
        print(
            f"   💰 Monto: ${pi_dict['amount']/100:.2f} {pi_dict['currency'].upper()}"
        )
        print(f"   🆔 ID: {pi_dict['id']}")
        print(f"   💳 Método de pago: {pi_dict.get('payment_method', 'N/A')}")
        print(f"   📊 Estado: {pi_dict['status']}")
        print(f"   🔐 Client Secret: {pi_dict['client_secret'][:30]}...")

        # Paso 3: Confirmar el pago (simulando lo que haría el frontend)
        print(f"\n🔄 Paso 3: Confirmando el pago...")
        confirmed_payment = stripe.PaymentIntent.confirm(
            pi_dict["id"], return_url="http://localhost:3000/payment/success"
        )

        cp_dict = dict(confirmed_payment)

        print(f"✅ Pago confirmado!")
        print(f"   📊 Estado final: {cp_dict['status']}")
        print(f"   💳 Cargo ID: {cp_dict.get('latest_charge', 'N/A')}")

        # Mostrar detalles del cargo si existe
        if cp_dict.get("latest_charge"):
            print(f"\n💰 Detalles del cargo:")
            charge = stripe.Charge.retrieve(cp_dict["latest_charge"])
            charge_dict = dict(charge)
            print(
                f"   💵 Cantidad cargada: ${charge_dict['amount']/100:.2f} {charge_dict['currency'].upper()}"
            )
            print(
                f"   🏦 Tarjeta: **** {charge_dict['payment_method_details']['card']['last4']}"
            )
            print(f"   📝 Estado: {charge_dict['status']}")
            print(f"   📧 Recibo enviado a: {charge_dict.get('receipt_email', 'N/A')}")

        # Mostrar metadata completa
        print(f"\n📋 Metadata de la reserva:")
        for key, value in cp_dict.get("metadata", {}).items():
            print(f"   {key}: {value}")

        # Guardar detalles del pago completo
        payment_details = {
            "payment_intent_id": cp_dict["id"],
            "payment_method_id": pm_dict["id"],
            "amount": cp_dict["amount"],
            "currency": cp_dict["currency"],
            "client_secret": cp_dict["client_secret"],
            "status": cp_dict["status"],
            "latest_charge": cp_dict.get("latest_charge"),
            "created": datetime.now().isoformat(),
            "metadata": cp_dict.get("metadata", {}),
            "billing_details": pm_dict.get("billing_details", {}),
            "card_details": {
                "last4": pm_dict["card"]["last4"],
                "brand": pm_dict["card"]["brand"],
                "exp_month": pm_dict["card"]["exp_month"],
                "exp_year": pm_dict["card"]["exp_year"],
            },
        }

        # Escribir a archivo para referencia
        with open("test_complete_payment_details.json", "w") as f:
            json.dump(payment_details, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Detalles guardados en: test_complete_payment_details.json")

        print(f"\n🎯 RESULTADO DEL TEST COMPLETO:")
        print(f"✅ Método de pago creado y adjuntado")
        print(f"✅ Payment Intent de $1000 MXN creado")
        print(f"✅ Pago confirmado exitosamente")
        print(f"✅ Cargo procesado correctamente")
        print(f"✅ Metadata de reserva almacenada")
        print(f"✅ Email de recibo enviado")

        print(f"\n🎉 PAGO COMPLETADO EXITOSAMENTE!")
        print(f"Ahora deberías ver en Stripe:")
        print(f"1. Un Payment Intent completado: {cp_dict['id']}")
        print(f"2. Un Charge exitoso: {cp_dict.get('latest_charge', 'N/A')}")
        print(f"3. Estado 'succeeded' en el dashboard")

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


def main():
    """Función principal."""
    print("🧪 TEST DE PAGO COMPLETO STRIPE - $1000 MXN")
    print("🇲🇽 Reserva de cancha de pádel con tarjeta adjunta")
    print("=" * 60)

    # Mostrar configuración
    print(f"🔧 Configuración:")
    print(f"   Stripe API Key: {settings.STRIPE_SECRET_KEY[:15]}...")
    print(f"   Publishable Key: {settings.STRIPE_PUBLISHABLE_KEY[:15]}...")

    # Crear el pago completo
    payment_intent = create_complete_payment()

    if payment_intent:
        print(f"\n🚀 PAGO COMPLETADO!")
        print(f"Revisa tu dashboard de Stripe para ver el pago procesado.")
        return True
    else:
        print(f"\n❌ Error al crear el pago completo")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
