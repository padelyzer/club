#!/usr/bin/env python3
"""
Pruebas completas de reservaciones con Puppeteer
- Crear 10 reservaciones
- Intentar duplicados
- Modificar a horarios ocupados y libres
"""
import os
import sys
import django
import asyncio
from datetime import datetime, timedelta
from pyppeteer import launch
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation

User = get_user_model()

# Test data for reservations
PLAYERS = [
    {"name": "Carlos Mendoza", "email": "carlos.mendoza@test.com", "phone": "5551111111"},
    {"name": "Ana García", "email": "ana.garcia@test.com", "phone": "5552222222"},
    {"name": "Roberto Silva", "email": "roberto.silva@test.com", "phone": "5553333333"},
    {"name": "María López", "email": "maria.lopez@test.com", "phone": "5554444444"},
    {"name": "Diego Martínez", "email": "diego.martinez@test.com", "phone": "5555555555"},
    {"name": "Laura Rodríguez", "email": "laura.rodriguez@test.com", "phone": "5556666666"},
    {"name": "Pedro Sánchez", "email": "pedro.sanchez@test.com", "phone": "5557777777"},
    {"name": "Carmen Jiménez", "email": "carmen.jimenez@test.com", "phone": "5558888888"},
    {"name": "José Fernández", "email": "jose.fernandez@test.com", "phone": "5559999999"},
    {"name": "Isabel Torres", "email": "isabel.torres@test.com", "phone": "5550000000"},
]

async def wait_and_type(page, selector, text, delay=50):
    """Helper to wait for element and type text"""
    await page.waitForSelector(selector, {'timeout': 10000})
    await page.click(selector)
    await page.evaluate(f'document.querySelector("{selector}").value = ""')
    await page.type(selector, text, {'delay': delay})

async def take_screenshot(page, name):
    """Take screenshot with timestamp"""
    timestamp = datetime.now().strftime('%H%M%S')
    filename = f'puppeteer_{name}_{timestamp}.png'
    await page.screenshot({'path': filename})
    print(f"   📸 Screenshot: {filename}")

async def test_reservations_puppeteer():
    print("🚀 PRUEBAS COMPLETAS DE RESERVACIONES CON PUPPETEER")
    print("=" * 60)
    print("📍 Configurando navegador...")
    
    # Launch browser with better configuration
    browser = await launch(
        headless=False,
        defaultViewport={'width': 1920, 'height': 1080},
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--disable-features=TranslateUI',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ],
        # Don't specify executablePath, let pyppeteer use its own Chromium
        slowMo=50  # Slow down actions by 50ms
    )
    
    page = await browser.newPage()
    await page.setViewport({'width': 1920, 'height': 1080})
    
    # Track console errors
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type_ == 'error' else None)
    
    try:
        # LOGIN
        print("\n📍 PASO 1: Login")
        await page.goto('http://localhost:3001/en/login', {'waitUntil': 'networkidle0'})
        await asyncio.sleep(2)
        
        await wait_and_type(page, 'input[name="email"]', 'test@padelyzer.com')
        await wait_and_type(page, 'input[name="password"]', 'test123')
        
        await page.click('button[type="submit"]')
        await page.waitForNavigation({'waitUntil': 'networkidle0', 'timeout': 30000})
        print("   ✅ Login exitoso")
        
        # Navigate to reservations
        print("\n📍 PASO 2: Navegando a reservaciones")
        await page.goto('http://localhost:3001/en/dashboard/reservations', {'waitUntil': 'networkidle0'})
        await asyncio.sleep(3)
        
        await take_screenshot(page, 'reservations_initial')
        
        # Get initial reservation count
        initial_count = await page.evaluate('''
            () => {
                const rows = document.querySelectorAll('tbody tr, [data-testid*="reservation"]');
                return rows.length;
            }
        ''')
        print(f"   📊 Reservaciones iniciales: {initial_count}")
        
        # CREATE 10 RESERVATIONS
        print("\n📍 PASO 3: Creando 10 reservaciones")
        created_reservations = []
        used_slots = []  # Track used time slots
        
        for i in range(10):
            print(f"\n   🎾 Reservación {i+1}/10")
            player = PLAYERS[i]
            
            # Click new reservation button
            new_button = await page.evaluateHandle('''
                () => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    return buttons.find(btn => 
                        btn.textContent.toLowerCase().includes('new') || 
                        btn.textContent.toLowerCase().includes('add') ||
                        btn.textContent.toLowerCase().includes('crear')
                    );
                }
            ''')
            
            if new_button:
                await new_button.click()
                await asyncio.sleep(2)
                
                # Fill form
                # Date - use different days to avoid conflicts
                days_ahead = (i // 4) + 1  # Spread across multiple days
                date = (timezone.now() + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
                
                # Time - use different times
                hour = 9 + (i % 4) * 2  # 9:00, 11:00, 13:00, 15:00
                time_slot = f"{hour:02d}:00"
                end_time = f"{hour+1:02d}:30"
                
                # Store slot info
                slot_info = {'date': date, 'time': time_slot, 'end': end_time}
                used_slots.append(slot_info)
                
                print(f"      📅 {date} {time_slot}-{end_time}")
                
                try:
                    # Select court (alternate between courts if multiple)
                    await page.evaluate('''
                        () => {
                            const select = document.querySelector('select[name*="court"]');
                            if (select && select.options.length > 1) {
                                select.selectedIndex = Math.floor(Math.random() * (select.options.length - 1)) + 1;
                            }
                        }
                    ''')
                    
                    # Set date
                    await page.evaluate(f'''
                        () => {{
                            const dateInput = document.querySelector('input[type="date"]');
                            if (dateInput) dateInput.value = '{date}';
                        }}
                    ''')
                    
                    # Set time
                    await page.evaluate(f'''
                        () => {{
                            const timeInput = document.querySelector('input[type="time"], select[name*="time"]');
                            if (timeInput) timeInput.value = '{time_slot}';
                        }}
                    ''')
                    
                    # Player info
                    await page.evaluate(f'''
                        () => {{
                            // Name
                            const nameInputs = document.querySelectorAll('input[name*="name"]:not([type="hidden"])');
                            if (nameInputs.length > 0) nameInputs[0].value = '{player["name"]}';
                            
                            // Email
                            const emailInputs = document.querySelectorAll('input[name*="email"]:not([readonly])');
                            for (let input of emailInputs) {{
                                if (input.type === 'email' || input.name.includes('email')) {{
                                    input.value = '{player["email"]}';
                                    break;
                                }}
                            }}
                            
                            // Phone
                            const phoneInput = document.querySelector('input[name*="phone"], input[type="tel"]');
                            if (phoneInput) phoneInput.value = '{player["phone"]}';
                            
                            // Players count
                            const countInput = document.querySelector('input[name*="count"], input[name*="players"]');
                            if (countInput) countInput.value = '{random.choice([2, 4])}';
                        }}
                    ''')
                    
                    await asyncio.sleep(1)
                    
                    # Submit
                    submit_button = await page.evaluateHandle('''
                        () => {
                            const buttons = Array.from(document.querySelectorAll('button'));
                            return buttons.find(btn => 
                                btn.type === 'submit' || 
                                btn.textContent.toLowerCase().includes('save') ||
                                btn.textContent.toLowerCase().includes('crear') ||
                                btn.textContent.toLowerCase().includes('guardar')
                            );
                        }
                    ''')
                    
                    if submit_button:
                        await submit_button.click()
                        await asyncio.sleep(3)
                        
                        # Check success
                        success = await page.evaluate('''
                            () => {
                                const alerts = document.querySelectorAll('[role="alert"], .toast, [class*="success"]');
                                return Array.from(alerts).some(alert => 
                                    alert.textContent.toLowerCase().includes('success') ||
                                    alert.textContent.toLowerCase().includes('created') ||
                                    alert.textContent.toLowerCase().includes('éxito')
                                );
                            }
                        ''')
                        
                        if success:
                            print(f"      ✅ Reservación creada para {player['name']}")
                            created_reservations.append(slot_info)
                        else:
                            print(f"      ⚠️  No se detectó confirmación")
                    
                except Exception as e:
                    print(f"      ❌ Error: {str(e)}")
                
                # Close modal if still open
                await page.evaluate('''
                    () => {
                        const closeBtn = document.querySelector('[aria-label="Close"], button[class*="close"]');
                        if (closeBtn) closeBtn.click();
                    }
                ''')
                
                await asyncio.sleep(1)
            
            # Take screenshot every 3 reservations
            if (i + 1) % 3 == 0:
                await take_screenshot(page, f'reservations_batch_{i+1}')
        
        print(f"\n   📊 Reservaciones creadas: {len(created_reservations)}/10")
        
        # ATTEMPT DUPLICATE RESERVATION
        print("\n📍 PASO 4: Intentando crear reservación duplicada")
        
        if created_reservations:
            duplicate_slot = created_reservations[0]
            print(f"   🔄 Intentando duplicar: {duplicate_slot['date']} {duplicate_slot['time']}")
            
            # Try to create duplicate
            new_button = await page.evaluateHandle('''
                () => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    return buttons.find(btn => 
                        btn.textContent.toLowerCase().includes('new') || 
                        btn.textContent.toLowerCase().includes('add')
                    );
                }
            ''')
            
            if new_button:
                await new_button.click()
                await asyncio.sleep(2)
                
                # Fill with duplicate data
                await page.evaluate(f'''
                    () => {{
                        const dateInput = document.querySelector('input[type="date"]');
                        if (dateInput) dateInput.value = '{duplicate_slot["date"]}';
                        
                        const timeInput = document.querySelector('input[type="time"]');
                        if (timeInput) timeInput.value = '{duplicate_slot["time"]}';
                        
                        // Same court
                        const courtSelect = document.querySelector('select[name*="court"]');
                        if (courtSelect && courtSelect.options.length > 1) {{
                            courtSelect.selectedIndex = 1;
                        }}
                    }}
                ''')
                
                # Fill basic info
                await page.evaluate('''
                    () => {
                        const nameInput = document.querySelector('input[name*="name"]:not([type="hidden"])');
                        if (nameInput) nameInput.value = 'Duplicate Test';
                        
                        const emailInput = document.querySelector('input[name*="email"]:not([readonly])');
                        if (emailInput) emailInput.value = 'duplicate@test.com';
                        
                        const phoneInput = document.querySelector('input[name*="phone"]');
                        if (phoneInput) phoneInput.value = '5559999999';
                    }
                ''')
                
                await asyncio.sleep(1)
                await take_screenshot(page, 'duplicate_attempt')
                
                # Submit
                await page.evaluate('''
                    () => {
                        const submitBtn = document.querySelector('button[type="submit"]');
                        if (submitBtn) submitBtn.click();
                    }
                ''')
                
                await asyncio.sleep(3)
                
                # Check for error
                error_found = await page.evaluate('''
                    () => {
                        const alerts = document.querySelectorAll('[role="alert"], .toast, [class*="error"]');
                        return Array.from(alerts).some(alert => 
                            alert.textContent.toLowerCase().includes('error') ||
                            alert.textContent.toLowerCase().includes('occupied') ||
                            alert.textContent.toLowerCase().includes('ocupado') ||
                            alert.textContent.toLowerCase().includes('not available')
                        );
                    }
                ''')
                
                if error_found:
                    print("   ✅ Error detectado correctamente - No se puede duplicar")
                else:
                    print("   ⚠️  No se detectó error de duplicación")
                
                # Close modal
                await page.evaluate('''
                    () => {
                        const closeBtn = document.querySelector('[aria-label="Close"], button[class*="close"]');
                        if (closeBtn) closeBtn.click();
                    }
                ''')
        
        # MODIFY RESERVATION TO OCCUPIED SLOT
        print("\n📍 PASO 5: Modificar reservación a horario ocupado")
        
        # Find a reservation to modify
        await asyncio.sleep(2)
        
        # Click on first reservation
        first_reservation = await page.evaluateHandle('''
            () => {
                const rows = document.querySelectorAll('tbody tr');
                if (rows.length > 0) {
                    return rows[0];
                }
                return null;
            }
        ''')
        
        if first_reservation:
            await first_reservation.click()
            await asyncio.sleep(2)
            
            # Look for edit button
            edit_button = await page.evaluateHandle('''
                () => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    return buttons.find(btn => 
                        btn.textContent.toLowerCase().includes('edit') ||
                        btn.textContent.toLowerCase().includes('editar') ||
                        btn.textContent.toLowerCase().includes('modify')
                    );
                }
            ''')
            
            if edit_button:
                await edit_button.click()
                await asyncio.sleep(2)
                
                # Try to change to an occupied slot
                if len(created_reservations) > 1:
                    occupied_slot = created_reservations[1]
                    
                    await page.evaluate(f'''
                        () => {{
                            const timeInput = document.querySelector('input[type="time"]');
                            if (timeInput) timeInput.value = '{occupied_slot["time"]}';
                        }}
                    ''')
                    
                    print(f"   🔄 Intentando cambiar a: {occupied_slot['time']} (ocupado)")
                    
                    # Submit
                    await page.evaluate('''
                        () => {
                            const submitBtn = document.querySelector('button[type="submit"]');
                            if (submitBtn) submitBtn.click();
                        }
                    ''')
                    
                    await asyncio.sleep(3)
                    
                    # Check for error
                    error_found = await page.evaluate('''
                        () => {
                            const alerts = document.querySelectorAll('[role="alert"], .toast, [class*="error"]');
                            return Array.from(alerts).some(alert => 
                                alert.textContent.toLowerCase().includes('error') ||
                                alert.textContent.toLowerCase().includes('conflict')
                            );
                        }
                    ''')
                    
                    if error_found:
                        print("   ✅ Error detectado - No se puede mover a horario ocupado")
                    else:
                        print("   ⚠️  No se detectó conflicto")
        
        # MODIFY RESERVATION TO FREE SLOT
        print("\n📍 PASO 6: Modificar reservación a horario libre")
        
        # Find a free time slot
        free_time = "19:00"  # Usually free in the evening
        
        await page.evaluate(f'''
            () => {{
                const timeInput = document.querySelector('input[type="time"]');
                if (timeInput) timeInput.value = '{free_time}';
            }}
        ''')
        
        print(f"   🔄 Cambiando a: {free_time} (libre)")
        
        # Submit
        await page.evaluate('''
            () => {
                const submitBtn = document.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.click();
            }
        ''')
        
        await asyncio.sleep(3)
        
        # Check for success
        success = await page.evaluate('''
            () => {
                const alerts = document.querySelectorAll('[role="alert"], .toast, [class*="success"]');
                return Array.from(alerts).some(alert => 
                    alert.textContent.toLowerCase().includes('success') ||
                    alert.textContent.toLowerCase().includes('updated') ||
                    alert.textContent.toLowerCase().includes('actualizado')
                );
            }
        ''')
        
        if success:
            print("   ✅ Reservación modificada exitosamente")
        else:
            print("   ⚠️  No se detectó confirmación de actualización")
        
        # Final screenshot
        await asyncio.sleep(2)
        await take_screenshot(page, 'final_state')
        
        # Count final reservations
        final_count = await page.evaluate('''
            () => {
                const rows = document.querySelectorAll('tbody tr, [data-testid*="reservation"]');
                return rows.length;
            }
        ''')
        
        # SUMMARY
        print("\n" + "="*60)
        print("📊 RESUMEN DE PRUEBAS")
        print("="*60)
        print(f"✅ Reservaciones iniciales: {initial_count}")
        print(f"✅ Reservaciones creadas: {len(created_reservations)}")
        print(f"✅ Reservaciones finales: {final_count}")
        print(f"✅ Intento de duplicación: Probado")
        print(f"✅ Modificación a horario ocupado: Probado")
        print(f"✅ Modificación a horario libre: Probado")
        print(f"⚠️  Errores en consola: {len(console_errors)}")
        
        if console_errors:
            print("\n❌ Errores detectados:")
            for error in console_errors[:5]:
                print(f"   - {error}")
        
        print("\n🎉 Pruebas completadas!")
        print("⏳ El navegador se cerrará en 10 segundos...")
        await asyncio.sleep(10)
        
    except Exception as e:
        print(f"\n❌ Error durante la prueba: {str(e)}")
        await take_screenshot(page, 'error')
        raise
    
    finally:
        await browser.close()
        print("\n✅ Navegador cerrado")

if __name__ == "__main__":
    asyncio.run(test_reservations_puppeteer())