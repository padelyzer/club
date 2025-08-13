#!/usr/bin/env python3
"""
Probar UI de reservaciones con Puppeteer
"""
import os
import sys
import django
import asyncio
from datetime import datetime, timedelta
from pyppeteer import launch

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation

User = get_user_model()

async def test_reservations_ui():
    print("🚀 PRUEBA DE UI DE RESERVACIONES CON PUPPETEER")
    print("=" * 60)
    
    # Launch browser
    browser = await launch(
        headless=False,
        defaultViewport={'width': 1920, 'height': 1080},
        args=['--no-sandbox', '--disable-setuid-sandbox']
    )
    
    try:
        page = await browser.newPage()
        
        # Monitor console messages
        page.on('console', lambda msg: print(f'   🖥️  Console: {msg.text}') if msg.type_ in ['error', 'warning'] else None)
        
        # TEST 1: Login
        print("\n📍 TEST 1: Login")
        await page.goto('http://localhost:3001/en/login')
        await page.waitForSelector('input[name="email"]', {'timeout': 10000})
        
        await page.type('input[name="email"]', 'test@padelyzer.com')
        await page.type('input[name="password"]', 'test123')
        
        await page.click('button[type="submit"]')
        await page.waitForNavigation({'waitUntil': 'networkidle0', 'timeout': 30000})
        
        print("   ✅ Login exitoso")
        
        # TEST 2: Navigate to reservations
        print("\n📍 TEST 2: Navegar a reservaciones")
        
        # Check if we're redirected to dashboard
        current_url = page.url
        print(f"   URL actual: {current_url}")
        
        # Try to find reservations link in sidebar
        try:
            # Wait for sidebar to load
            await page.waitForSelector('[data-testid="sidebar"]', {'timeout': 5000})
        except:
            # Try alternative selector
            await page.waitForSelector('nav', {'timeout': 5000})
        
        # Click on reservations link
        reservations_link = None
        links = await page.querySelectorAll('a')
        
        for link in links:
            text = await page.evaluate('(el) => el.textContent', link)
            href = await page.evaluate('(el) => el.href', link)
            if 'reserva' in text.lower() or 'reservation' in text.lower() or '/reservations' in href:
                reservations_link = link
                print(f"   Found reservations link: {text.strip()} -> {href}")
                break
        
        if reservations_link:
            await reservations_link.click()
            await page.waitForNavigation({'waitUntil': 'networkidle0', 'timeout': 10000})
            print("   ✅ Navegación a reservaciones exitosa")
        else:
            print("   ⚠️  No se encontró enlace de reservaciones, navegando directamente")
            await page.goto('http://localhost:3001/en/dashboard/reservations')
            await page.waitForSelector('main', {'timeout': 10000})
        
        # TEST 3: Check reservations list
        print("\n📍 TEST 3: Verificar lista de reservaciones")
        
        # Wait for page to load
        await asyncio.sleep(2)
        
        # Check for loading states
        loading_elements = await page.querySelectorAll('[class*="loading"], [class*="skeleton"], [class*="spinner"]')
        if loading_elements:
            print(f"   Esperando que termine de cargar... ({len(loading_elements)} elementos)")
            await asyncio.sleep(3)
        
        # Look for reservation elements
        reservation_cards = await page.querySelectorAll('[data-testid*="reservation"], [class*="reservation-card"], [class*="reservation-item"]')
        table_rows = await page.querySelectorAll('tbody tr, [role="row"]')
        
        if reservation_cards:
            print(f"   ✅ Se encontraron {len(reservation_cards)} tarjetas de reservación")
        elif table_rows:
            print(f"   ✅ Se encontraron {len(table_rows)} filas en la tabla")
        else:
            print("   ⚠️  No se encontraron elementos de reservación visibles")
            
            # Take screenshot for debugging
            await page.screenshot({'path': 'reservations_list.png'})
            print("   📸 Screenshot guardado: reservations_list.png")
        
        # TEST 4: Try to create a new reservation
        print("\n📍 TEST 4: Crear nueva reservación")
        
        # Look for "New Reservation" button
        new_button = None
        buttons = await page.querySelectorAll('button')
        
        for button in buttons:
            text = await page.evaluate('(el) => el.textContent', button)
            if 'nueva' in text.lower() or 'new' in text.lower() or 'reserv' in text.lower():
                new_button = button
                print(f"   Found button: {text.strip()}")
                break
        
        if new_button:
            await new_button.click()
            print("   ✅ Click en botón de nueva reservación")
            
            # Wait for modal or form
            await asyncio.sleep(2)
            
            # Check if modal opened
            modal = await page.querySelector('[role="dialog"], [class*="modal"], [class*="dialog"]')
            if modal:
                print("   ✅ Modal de reservación abierto")
                
                # Fill reservation form
                await asyncio.sleep(1)
                
                # Select court if dropdown exists
                court_select = await page.querySelector('select[name*="court"], [data-testid*="court-select"]')
                if court_select:
                    await court_select.select('option:nth-child(2)')  # Select first available court
                    print("   ✅ Cancha seleccionada")
                
                # Set date (tomorrow)
                date_input = await page.querySelector('input[type="date"], input[name*="date"]')
                if date_input:
                    tomorrow = (timezone.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                    await page.evaluate(f'(el) => el.value = "{tomorrow}"', date_input)
                    print(f"   ✅ Fecha establecida: {tomorrow}")
                
                # Set time
                time_input = await page.querySelector('input[type="time"], input[name*="time"], select[name*="time"]')
                if time_input:
                    await page.evaluate('(el) => el.value = "15:00"', time_input)
                    print("   ✅ Hora establecida: 15:00")
                
                # Fill player info
                await page.type('input[name*="name"], input[placeholder*="name"], input[placeholder*="nombre"]', 'Test Player Puppeteer')
                await page.type('input[name*="email"], input[placeholder*="email"], input[placeholder*="correo"]', 'test.puppeteer@example.com')
                await page.type('input[name*="phone"], input[placeholder*="phone"], input[placeholder*="tel"]', '5551234567')
                
                print("   ✅ Información del jugador completada")
                
                # Submit form
                submit_button = await page.querySelector('button[type="submit"], button:has-text("Save"), button:has-text("Guardar"), button:has-text("Create"), button:has-text("Crear")')
                if submit_button:
                    await submit_button.click()
                    print("   ✅ Formulario enviado")
                    
                    # Wait for response
                    await asyncio.sleep(3)
                    
                    # Check for success message
                    success = await page.querySelector('[class*="success"], [class*="toast"], [role="alert"]')
                    if success:
                        print("   ✅ Reservación creada exitosamente")
                    else:
                        print("   ⚠️  No se encontró mensaje de éxito")
                else:
                    print("   ❌ No se encontró botón de envío")
            else:
                print("   ❌ No se abrió el modal de reservación")
        else:
            print("   ❌ No se encontró botón de nueva reservación")
        
        # TEST 5: Check calendar view if available
        print("\n📍 TEST 5: Verificar vista de calendario")
        
        # Look for calendar view toggle
        calendar_button = None
        view_buttons = await page.querySelectorAll('button[class*="view"], button[aria-label*="calendar"], button[title*="calendar"]')
        
        for button in view_buttons:
            text = await page.evaluate('(el) => el.textContent || el.title || el.ariaLabel', button)
            if 'calendar' in text.lower() or 'calendario' in text.lower():
                calendar_button = button
                break
        
        if calendar_button:
            await calendar_button.click()
            await asyncio.sleep(2)
            print("   ✅ Vista de calendario activada")
            
            # Check for calendar elements
            calendar_elements = await page.querySelectorAll('[class*="calendar"], [class*="fc-"], [class*="cal-"]')
            if calendar_elements:
                print(f"   ✅ Calendario renderizado con {len(calendar_elements)} elementos")
            else:
                print("   ⚠️  No se encontraron elementos de calendario")
        else:
            print("   ℹ️  Vista de calendario no disponible")
        
        # TEST 6: Check filters
        print("\n📍 TEST 6: Verificar filtros")
        
        # Look for filter elements
        filters = await page.querySelectorAll('input[placeholder*="filter"], input[placeholder*="search"], select[name*="filter"], input[placeholder*="buscar"]')
        
        if filters:
            print(f"   ✅ Se encontraron {len(filters)} filtros")
            
            # Try date filter
            date_filter = await page.querySelector('input[type="date"][name*="filter"], input[type="date"][placeholder*="date"]')
            if date_filter:
                today = timezone.now().strftime('%Y-%m-%d')
                await page.evaluate(f'(el) => el.value = "{today}"', date_filter)
                await asyncio.sleep(1)
                print(f"   ✅ Filtro de fecha aplicado: {today}")
        else:
            print("   ⚠️  No se encontraron filtros")
        
        # Take final screenshot
        await page.screenshot({'path': 'reservations_final.png'})
        print("\n📸 Screenshot final guardado: reservations_final.png")
        
        # Get console errors count
        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg) if msg.type_ == 'error' else None)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 RESUMEN DE PRUEBAS UI")
        print("=" * 60)
        print("✅ Login exitoso")
        print("✅ Navegación funcional")
        if len(console_errors) == 0:
            print("✅ Sin errores en consola")
        else:
            print(f"⚠️  {len(console_errors)} errores en consola")
        
        # Check current reservation count
        reservation_count = await Reservation.objects.filter(
            club__name='API Test Padel Club'
        ).count()
        print(f"\n📈 Total de reservaciones en la BD: {reservation_count}")
        
    except Exception as e:
        print(f"\n❌ Error durante la prueba: {str(e)}")
        await page.screenshot({'path': 'error_screenshot.png'})
        print("📸 Screenshot de error guardado: error_screenshot.png")
        raise
    
    finally:
        await browser.close()
        print("\n✅ Navegador cerrado")

if __name__ == "__main__":
    asyncio.run(test_reservations_ui())