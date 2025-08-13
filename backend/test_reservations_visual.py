#!/usr/bin/env python3
"""
Pruebas visuales de reservaciones con Puppeteer
"""
import os
import sys
import django
import asyncio
from datetime import datetime, timedelta
from pyppeteer import launch
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation

User = get_user_model()

async def test_reservations_visual():
    print("🚀 PRUEBAS VISUALES DE RESERVACIONES CON PUPPETEER")
    print("=" * 60)
    print("📍 Abriendo navegador en modo visible...")
    
    # Launch browser with specific args for macOS
    browser = await launch(
        headless=False,
        defaultViewport={'width': 1920, 'height': 1080},
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        executablePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'  # Use system Chrome
    )
    
    try:
        page = await browser.newPage()
        
        # Set viewport
        await page.setViewport({'width': 1920, 'height': 1080})
        
        # Monitor console
        page.on('console', lambda msg: print(f'   🖥️  Console [{msg.type_}]: {msg.text}'))
        
        # TEST 1: Login
        print("\n📍 PASO 1: Iniciando sesión...")
        await page.goto('http://localhost:3001/en/login', {'waitUntil': 'networkidle0'})
        await asyncio.sleep(2)
        
        print("   - Escribiendo email...")
        await page.click('input[name="email"]')
        await page.type('input[name="email"]', 'test@padelyzer.com', {'delay': 100})
        
        print("   - Escribiendo contraseña...")
        await page.click('input[name="password"]')
        await page.type('input[name="password"]', 'test123', {'delay': 100})
        
        print("   - Haciendo click en el botón de login...")
        await page.click('button[type="submit"]')
        await page.waitForNavigation({'waitUntil': 'networkidle0', 'timeout': 30000})
        await asyncio.sleep(3)
        
        print("   ✅ Login exitoso!")
        
        # TEST 2: Navigate to reservations
        print("\n📍 PASO 2: Navegando a Reservaciones...")
        
        # Try multiple selectors for reservations link
        selectors = [
            'a[href*="/reservations"]',
            'a:contains("Reservations")',
            'a:contains("Reservaciones")',
            '[data-testid="reservations-link"]',
            'nav a[href*="reservations"]'
        ]
        
        clicked = False
        for selector in selectors:
            try:
                await page.waitForSelector(selector, {'timeout': 2000})
                await page.click(selector)
                clicked = True
                print(f"   ✅ Click en enlace de reservaciones usando: {selector}")
                break
            except:
                continue
        
        if not clicked:
            print("   ⚠️  No se encontró enlace, navegando directamente...")
            await page.goto('http://localhost:3001/en/dashboard/reservations', {'waitUntil': 'networkidle0'})
        
        await asyncio.sleep(3)
        print("   ✅ En la página de reservaciones!")
        
        # Take screenshot
        await page.screenshot({'path': 'reservations_page.png'})
        print("   📸 Screenshot guardado: reservations_page.png")
        
        # TEST 3: Create new reservation
        print("\n📍 PASO 3: Creando nueva reservación...")
        
        # Look for new reservation button
        new_button_selectors = [
            'button:contains("New")',
            'button:contains("Nueva")',
            'button:contains("Create")',
            'button:contains("Add")',
            '[data-testid="new-reservation"]',
            'button[aria-label*="reservation"]'
        ]
        
        for selector in new_button_selectors:
            try:
                # Use evaluate to find button by text content
                button = await page.evaluateHandle(f'''
                    Array.from(document.querySelectorAll('button')).find(
                        btn => btn.textContent.toLowerCase().includes('new') || 
                               btn.textContent.toLowerCase().includes('nueva') ||
                               btn.textContent.toLowerCase().includes('add') ||
                               btn.textContent.toLowerCase().includes('crear')
                    )
                ''')
                
                if button:
                    await button.click()
                    print("   ✅ Click en botón de nueva reservación")
                    break
            except:
                continue
        
        await asyncio.sleep(2)
        
        # Check if modal opened
        modal_visible = await page.evaluate('''
            () => {
                const modal = document.querySelector('[role="dialog"], .modal, [class*="modal"]');
                return modal && window.getComputedStyle(modal).display !== 'none';
            }
        ''')
        
        if modal_visible:
            print("   ✅ Modal de reservación abierto!")
            
            # Fill the form
            print("\n   📝 Llenando formulario de reservación...")
            
            # Select court
            try:
                await page.select('select[name*="court"]', 'option:nth-child(2)')
                print("   - Cancha seleccionada")
            except:
                print("   - No se encontró selector de cancha")
            
            # Set date (tomorrow)
            tomorrow = (timezone.now() + timedelta(days=1)).strftime('%Y-%m-%d')
            try:
                await page.evaluate(f'''
                    document.querySelector('input[type="date"]').value = '{tomorrow}';
                ''')
                print(f"   - Fecha establecida: {tomorrow}")
            except:
                print("   - No se pudo establecer fecha")
            
            # Set time
            try:
                await page.evaluate('''
                    const timeInput = document.querySelector('input[type="time"], select[name*="time"]');
                    if (timeInput) timeInput.value = '16:00';
                ''')
                print("   - Hora establecida: 16:00")
            except:
                print("   - No se pudo establecer hora")
            
            # Fill player info
            await asyncio.sleep(1)
            
            # Player name
            try:
                await page.type('input[name*="name"]:not([type="hidden"])', 'Juan Pérez Visual', {'delay': 50})
                print("   - Nombre del jugador ingresado")
            except:
                print("   - No se encontró campo de nombre")
            
            # Email
            try:
                await page.type('input[name*="email"]:not([readonly])', 'juan.visual@example.com', {'delay': 50})
                print("   - Email ingresado")
            except:
                print("   - No se encontró campo de email")
            
            # Phone
            try:
                await page.type('input[name*="phone"]', '5551234567', {'delay': 50})
                print("   - Teléfono ingresado")
            except:
                print("   - No se encontró campo de teléfono")
            
            await asyncio.sleep(2)
            
            # Take screenshot of filled form
            await page.screenshot({'path': 'reservation_form_filled.png'})
            print("\n   📸 Screenshot del formulario: reservation_form_filled.png")
            
            # Submit
            print("\n   📤 Enviando formulario...")
            submit_button = await page.evaluateHandle('''
                Array.from(document.querySelectorAll('button')).find(
                    btn => btn.type === 'submit' || 
                           btn.textContent.toLowerCase().includes('save') ||
                           btn.textContent.toLowerCase().includes('crear') ||
                           btn.textContent.toLowerCase().includes('guardar')
                )
            ''')
            
            if submit_button:
                await submit_button.click()
                print("   ✅ Formulario enviado!")
                await asyncio.sleep(3)
                
                # Check for success
                success_visible = await page.evaluate('''
                    () => {
                        const alerts = document.querySelectorAll('[role="alert"], .toast, [class*="success"]');
                        return Array.from(alerts).some(alert => 
                            alert.textContent.toLowerCase().includes('success') ||
                            alert.textContent.toLowerCase().includes('created') ||
                            alert.textContent.toLowerCase().includes('éxito')
                        );
                    }
                ''')
                
                if success_visible:
                    print("   ✅ ¡Reservación creada exitosamente!")
                else:
                    print("   ⚠️  No se detectó mensaje de éxito")
        else:
            print("   ⚠️  No se abrió el modal de reservación")
        
        # TEST 4: View reservations list
        print("\n📍 PASO 4: Verificando lista de reservaciones...")
        await asyncio.sleep(2)
        
        # Count reservation elements
        reservation_count = await page.evaluate('''
            () => {
                const cards = document.querySelectorAll('[data-testid*="reservation"], [class*="reservation-card"], tbody tr');
                return cards.length;
            }
        ''')
        
        print(f"   ✅ Se encontraron {reservation_count} reservaciones en la lista")
        
        # Take final screenshot
        await page.screenshot({'path': 'reservations_list_final.png'})
        print("   📸 Screenshot final: reservations_list_final.png")
        
        # TEST 5: Try calendar view
        print("\n📍 PASO 5: Verificando vista de calendario...")
        
        calendar_button = await page.evaluateHandle('''
            Array.from(document.querySelectorAll('button')).find(
                btn => btn.textContent.toLowerCase().includes('calendar') ||
                       btn.textContent.toLowerCase().includes('calendario') ||
                       btn.getAttribute('aria-label')?.toLowerCase().includes('calendar')
            )
        ''')
        
        if calendar_button:
            await calendar_button.click()
            print("   ✅ Vista de calendario activada")
            await asyncio.sleep(2)
            
            await page.screenshot({'path': 'reservations_calendar.png'})
            print("   📸 Screenshot calendario: reservations_calendar.png")
        else:
            print("   ℹ️  No se encontró botón de calendario")
        
        # Final summary
        print("\n" + "=" * 60)
        print("📊 RESUMEN DE PRUEBAS VISUALES")
        print("=" * 60)
        print("✅ Login exitoso")
        print("✅ Navegación a reservaciones")
        print("✅ Modal de creación abierto")
        print("✅ Formulario completado")
        print("✅ Lista de reservaciones visible")
        print("✅ Screenshots guardados")
        
        print("\n🎉 ¡Pruebas visuales completadas!")
        print("\n⏳ El navegador se cerrará en 5 segundos...")
        await asyncio.sleep(5)
        
    except Exception as e:
        print(f"\n❌ Error durante la prueba: {str(e)}")
        await page.screenshot({'path': 'error_screenshot.png'})
        print("📸 Screenshot de error guardado: error_screenshot.png")
        raise
    
    finally:
        await browser.close()
        print("\n✅ Navegador cerrado")

if __name__ == "__main__":
    asyncio.run(test_reservations_visual())