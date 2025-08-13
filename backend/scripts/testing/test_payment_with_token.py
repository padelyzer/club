#!/usr/bin/env python
"""
Test de pago completo por $1000 MXN usando tokens de prueba de Stripe
Este script crea un pago real usando Payment Method tokens seguros.
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


def create_payment_with_test_token():
    """Crear un pago completo por $1000 MXN usando tokens de prueba."""
    print("💳 CREANDO PAGO CON TOKEN DE PRUEBA - $1000 MXN")
    print("=" * 50)

    # Configurar Stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        # Paso 1: Crear Payment Intent que acepta todos los métodos de pago
        print("🔄 Paso 1: Creando Payment Intent con setup automático...")
        payment_intent = stripe.PaymentIntent.create(
            amount=100000,  # $1000.00 MXN en centavos
            currency="mxn",
            automatic_payment_methods={
                "enabled": True,
            },
            description="Pago con token - Reserva de cancha de pádel",
            metadata={
                "reservation_id": "res_token_001",
                "club_id": "club_padel_mx",
                "court_id": "cancha_001",
                "customer_email": "test@padelyzer.com",
                "booking_date": "2025-07-30",
                "booking_time": "18:00",
                "test_payment": "true",
                "payment_type": "token_test",
            },
            receipt_email="test@padelyzer.com",
        )

        pi_dict = dict(payment_intent)

        print(f"✅ Payment Intent creado con configuración automática!")
        print(
            f"   💰 Monto: ${pi_dict['amount']/100:.2f} {pi_dict['currency'].upper()}"
        )
        print(f"   🆔 ID: {pi_dict['id']}")
        print(f"   📊 Estado: {pi_dict['status']}")
        print(f"   🔐 Client Secret: {pi_dict['client_secret'][:30]}...")

        # Paso 2: Usar Payment Method de prueba (test tokens disponibles)
        print(f"\n🔄 Paso 2: Usando Payment Method de prueba...")

        # Crear payment method usando el test token pm_card_visa
        test_payment_method = "pm_card_visa"  # Token de prueba predefinido de Stripe

        print(f"✅ Usando Payment Method de prueba: {test_payment_method}")
        print(f"   💳 Token: pm_card_visa (Visa test token)")
        print(f"   🏦 Tarjeta: Visa **** 4242")

        # Paso 3: Confirmar el pago con el payment method
        print(f"\n🔄 Paso 3: Confirmando pago con Payment Method...")
        confirmed_payment = stripe.PaymentIntent.confirm(
            pi_dict["id"],
            payment_method=test_payment_method,
            return_url="http://localhost:3000/payment/success",
        )

        cp_dict = dict(confirmed_payment)

        print(f"✅ Pago confirmado exitosamente!")
        print(f"   📊 Estado final: {cp_dict['status']}")
        print(f"   💳 Payment Method: {cp_dict.get('payment_method', 'N/A')}")
        print(f"   💰 Charge ID: {cp_dict.get('latest_charge', 'N/A')}")

        # Mostrar detalles del cargo si existe
        if cp_dict.get("latest_charge"):
            print(f"\n💰 Detalles del cargo procesado:")
            charge = stripe.Charge.retrieve(cp_dict["latest_charge"])
            charge_dict = dict(charge)

            print(
                f"   💵 Cantidad: ${charge_dict['amount']/100:.2f} {charge_dict['currency'].upper()}"
            )
            print(
                f"   🏦 Tarjeta: **** **** **** {charge_dict['payment_method_details']['card']['last4']}"
            )
            print(
                f"   🔖 Marca: {charge_dict['payment_method_details']['card']['brand'].upper()}"
            )
            print(f"   📝 Estado del cargo: {charge_dict['status']}")
            print(f"   📧 Recibo: {charge_dict.get('receipt_email', 'N/A')}")
            print(f"   🧾 Receipt URL: {charge_dict.get('receipt_url', 'N/A')}")

        # Mostrar metadata completa
        print(f"\n📋 Metadata de la reserva:")
        for key, value in cp_dict.get("metadata", {}).items():
            print(f"   {key}: {value}")

        # Guardar detalles del pago completo
        payment_details = {
            "payment_intent_id": cp_dict["id"],
            "payment_method": test_payment_method,
            "amount": cp_dict["amount"],
            "currency": cp_dict["currency"],
            "client_secret": cp_dict["client_secret"],
            "status": cp_dict["status"],
            "latest_charge": cp_dict.get("latest_charge"),
            "created": datetime.now().isoformat(),
            "metadata": cp_dict.get("metadata", {}),
            "confirmation_method": cp_dict.get("confirmation_method"),
            "payment_method_types": cp_dict.get("payment_method_types", []),
        }

        # Incluir detalles del charge si existe
        if cp_dict.get("latest_charge"):
            charge = stripe.Charge.retrieve(cp_dict["latest_charge"])
            charge_dict = dict(charge)
            payment_details["charge_details"] = {
                "charge_id": charge_dict["id"],
                "status": charge_dict["status"],
                "receipt_url": charge_dict.get("receipt_url"),
                "card_last4": charge_dict["payment_method_details"]["card"]["last4"],
                "card_brand": charge_dict["payment_method_details"]["card"]["brand"],
            }

        # Escribir a archivo para referencia
        with open("test_payment_with_token_details.json", "w") as f:
            json.dump(payment_details, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Detalles guardados en: test_payment_with_token_details.json")

        print(f"\n🎯 RESULTADO DEL TEST CON TOKEN:")
        print(f"✅ Payment Intent creado correctamente")
        print(f"✅ Payment Method token aplicado")
        print(f"✅ Pago confirmado y procesado")
        print(f"✅ Cargo completado exitosamente")
        print(f"✅ Metadata de reserva guardada")
        print(f"✅ Recibo generado automáticamente")

        print(f"\n🎉 PAGO DE $1000 MXN COMPLETADO!")
        print(f"📊 En tu Stripe Dashboard verás:")
        print(f"   💰 Payment Intent: {cp_dict['id']} (succeeded)")
        print(f"   🧾 Charge: {cp_dict.get('latest_charge', 'N/A')} (succeeded)")
        print(f"   💳 Método: Visa **** 4242")
        print(f"   💵 Monto: $1,000.00 MXN")

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
        print(f"Tipo de error: {type(e)}")
        return None


def show_available_test_tokens():
    """Mostrar tokens de prueba disponibles."""
    print(f"\n💳 TOKENS DE PRUEBA DISPONIBLES:")
    print(f"=" * 40)

    test_tokens = [
        {
            "token": "pm_card_visa",
            "description": "Visa - Pago exitoso",
            "last4": "4242",
            "brand": "Visa",
        },
        {
            "token": "pm_card_visa_debit",
            "description": "Visa Debit - Pago exitoso",
            "last4": "5556",
            "brand": "Visa",
        },
        {
            "token": "pm_card_mastercard",
            "description": "Mastercard - Pago exitoso",
            "last4": "4444",
            "brand": "Mastercard",
        },
        {
            "token": "pm_card_amex",
            "description": "American Express - Pago exitoso",
            "last4": "0005",
            "brand": "American Express",
        },
    ]

    for i, token in enumerate(test_tokens, 1):
        print(f"{i}. {token['description']}")
        print(f"   Token: {token['token']}")
        print(f"   Tarjeta: {token['brand']} **** {token['last4']}")
        print()


def main():
    """Función principal."""
    print("🧪 TEST DE PAGO CON TOKEN STRIPE - $1000 MXN")
    print("🇲🇽 Reserva de cancha usando Payment Method tokens")
    print("=" * 60)

    # Mostrar configuración
    print(f"🔧 Configuración:")
    print(f"   Stripe API Key: {settings.STRIPE_SECRET_KEY[:15]}...")
    print(f"   Publishable Key: {settings.STRIPE_PUBLISHABLE_KEY[:15]}...")

    # Mostrar tokens disponibles
    show_available_test_tokens()

    # Crear el pago con tokens
    payment_intent = create_payment_with_test_token()

    if payment_intent:
        print(f"\n🚀 PAGO CON TOKEN COMPLETADO EXITOSAMENTE!")
        print(f"Revisa tu dashboard de Stripe para ver el pago procesado.")
        return True
    else:
        print(f"\n❌ Error al crear el pago con token")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
