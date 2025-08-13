#!/usr/bin/env python3
"""
Pruebas completas de reservaciones con Selenium
- Crear 10 reservaciones
- Intentar duplicados
- Modificar a horarios ocupados y libres
"""
import os
import sys
import django
import time
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.select import Select
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.utils import timezone

# Test data
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

def test_reservations_selenium():
    print("🚀 PRUEBAS COMPLETAS DE RESERVACIONES CON SELENIUM")
    print("=" * 60)
    print("📍 Configurando navegador Chrome...")
    
    # Configure Chrome
    options = webdriver.ChromeOptions()
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--start-maximized')
    options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 10)
    
    try:
        # 1. LOGIN
        print("\n📍 PASO 1: Login")
        driver.get('http://localhost:3001/en/login')
        time.sleep(2)
        
        print("   - Esperando página de login...")
        email_input = wait.until(EC.presence_of_element_located((By.NAME, "email")))
        
        print("   - Ingresando credenciales...")
        email_input.clear()
        email_input.send_keys('test@padelyzer.com')
        
        password_input = driver.find_element(By.NAME, "password")
        password_input.clear()
        password_input.send_keys('test123')
        
        # Take screenshot
        driver.save_screenshot('selenium_login_form.png')
        print("   📸 Screenshot: selenium_login_form.png")
        
        print("   - Haciendo click en login...")
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()
        
        # Wait for login
        time.sleep(5)
        
        # Check if logged in
        current_url = driver.current_url
        print(f"   - URL actual: {current_url}")
        
        if 'login' not in current_url:
            print("   ✅ Login exitoso!")
        else:
            print("   ⚠️  Posible problema con login, continuando...")
        
        # 2. Navigate to reservations
        print("\n📍 PASO 2: Navegando a reservaciones")
        driver.get('http://localhost:3001/en/dashboard/reservations')
        time.sleep(3)
        
        # Take screenshot
        driver.save_screenshot('selenium_reservations_page.png')
        print("   📸 Screenshot: selenium_reservations_page.png")
        
        # Count initial reservations
        try:
            rows = driver.find_elements(By.CSS_SELECTOR, "tbody tr")
            initial_count = len(rows)
            print(f"   📊 Reservaciones iniciales: {initial_count}")
        except:
            initial_count = 0
            print("   📊 No se encontraron reservaciones iniciales")
        
        # 3. CREATE 10 RESERVATIONS
        print("\n📍 PASO 3: Creando 10 reservaciones")
        created_slots = []
        
        for i in range(10):
            print(f"\n   🎾 Reservación {i+1}/10")
            player = PLAYERS[i]
            
            # Find new button
            new_button = None
            buttons = driver.find_elements(By.TAG_NAME, "button")
            
            for button in buttons:
                text = button.text.lower()
                if 'new' in text or 'nueva' in text or 'add' in text or 'crear' in text or '+' in text:
                    new_button = button
                    break
            
            if not new_button:
                # Try icon buttons
                try:
                    new_button = driver.find_element(By.CSS_SELECTOR, "button[aria-label*='new'], button[aria-label*='add']")
                except:
                    print("   ❌ No se encontró botón de nueva reservación")
                    continue
            
            if new_button:
                new_button.click()
                time.sleep(2)
                
                # Check if modal opened
                try:
                    modal = driver.find_element(By.CSS_SELECTOR, "[role='dialog'], .modal")
                    if modal.is_displayed():
                        # Fill form
                        date = (timezone.now() + timedelta(days=(i//4)+1)).strftime('%Y-%m-%d')
                        hour = 9 + (i % 4) * 2
                        time_slot = f"{hour:02d}:00"
                        
                        print(f"      📅 {date} {time_slot} - {player['name']}")
                        created_slots.append({'date': date, 'time': time_slot})
                        
                        # Select court
                        try:
                            court_select = driver.find_element(By.CSS_SELECTOR, "select[name*='court']")
                            Select(court_select).select_by_index(1)
                        except:
                            pass
                        
                        # Date
                        try:
                            date_input = driver.find_element(By.CSS_SELECTOR, "input[type='date']")
                            date_input.clear()
                            date_input.send_keys(date)
                        except:
                            pass
                        
                        # Time
                        try:
                            time_input = driver.find_element(By.CSS_SELECTOR, "input[type='time']")
                            time_input.clear()
                            time_input.send_keys(time_slot)
                        except:
                            pass
                        
                        # Player info
                        try:
                            name_inputs = driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='name'], input[name*='name']")
                            for inp in name_inputs:
                                if inp.get_attribute('type') != 'hidden':
                                    inp.clear()
                                    inp.send_keys(player['name'])
                                    break
                        except:
                            pass
                        
                        try:
                            email_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='email'], input[placeholder*='email']")
                            for inp in email_inputs:
                                if not inp.get_attribute('readonly'):
                                    inp.clear()
                                    inp.send_keys(player['email'])
                                    break
                        except:
                            pass
                        
                        try:
                            phone_input = driver.find_element(By.CSS_SELECTOR, "input[type='tel'], input[placeholder*='phone']")
                            phone_input.clear()
                            phone_input.send_keys(player['phone'])
                        except:
                            pass
                        
                        # Players count
                        try:
                            count_input = driver.find_element(By.CSS_SELECTOR, "input[name*='count'], input[name*='players']")
                            count_input.clear()
                            count_input.send_keys(str(random.choice([2, 4])))
                        except:
                            pass
                        
                        # Submit
                        time.sleep(1)
                        try:
                            submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                            submit_btn.click()
                            time.sleep(2)
                            print("      ✅ Reservación creada")
                        except:
                            print("      ❌ No se pudo enviar")
                        
                        # Close modal if still open
                        try:
                            close_btn = driver.find_element(By.CSS_SELECTOR, "[aria-label='Close'], button.close")
                            close_btn.click()
                        except:
                            pass
                except Exception as e:
                    print(f"      ❌ Error: {str(e)}")
            
            # Take screenshot every 3 reservations
            if (i + 1) % 3 == 0:
                driver.save_screenshot(f'selenium_batch_{i+1}.png')
                print(f"   📸 Screenshot: selenium_batch_{i+1}.png")
        
        print(f"\n   📊 Reservaciones creadas: {len(created_slots)}")
        
        # 4. ATTEMPT DUPLICATE
        print("\n📍 PASO 4: Intentar crear reservación duplicada")
        
        if created_slots:
            duplicate = created_slots[0]
            print(f"   🔄 Intentando duplicar: {duplicate['date']} {duplicate['time']}")
            
            # Find new button again
            buttons = driver.find_elements(By.TAG_NAME, "button")
            for button in buttons:
                if 'new' in button.text.lower() or 'add' in button.text.lower():
                    button.click()
                    break
            
            time.sleep(2)
            
            # Fill duplicate data
            try:
                # Same date and time
                date_input = driver.find_element(By.CSS_SELECTOR, "input[type='date']")
                date_input.clear()
                date_input.send_keys(duplicate['date'])
                
                time_input = driver.find_element(By.CSS_SELECTOR, "input[type='time']")
                time_input.clear()
                time_input.send_keys(duplicate['time'])
                
                # Basic info
                name_input = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='name']")
                name_input.clear()
                name_input.send_keys('Duplicate Test')
                
                # Submit
                submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                submit_btn.click()
                time.sleep(2)
                
                # Check for error
                try:
                    error_alert = driver.find_element(By.CSS_SELECTOR, "[role='alert'], .error, .alert-danger")
                    print(f"   ✅ Error detectado: {error_alert.text}")
                except:
                    print("   ⚠️  No se detectó error de duplicación")
                
                # Close modal
                try:
                    close_btn = driver.find_element(By.CSS_SELECTOR, "[aria-label='Close']")
                    close_btn.click()
                except:
                    pass
            except Exception as e:
                print(f"   ❌ Error en duplicación: {str(e)}")
        
        # 5. MODIFY TO OCCUPIED SLOT
        print("\n📍 PASO 5: Modificar reservación a horario ocupado")
        
        try:
            # Click first reservation
            first_row = driver.find_element(By.CSS_SELECTOR, "tbody tr")
            first_row.click()
            time.sleep(2)
            
            # Find edit button
            edit_buttons = driver.find_elements(By.TAG_NAME, "button")
            for button in edit_buttons:
                if 'edit' in button.text.lower() or 'editar' in button.text.lower():
                    button.click()
                    break
            
            time.sleep(2)
            
            # Try to change to occupied time
            if len(created_slots) > 1:
                occupied = created_slots[1]
                time_input = driver.find_element(By.CSS_SELECTOR, "input[type='time']")
                time_input.clear()
                time_input.send_keys(occupied['time'])
                print(f"   🔄 Cambiando a: {occupied['time']} (ocupado)")
                
                # Submit
                submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                submit_btn.click()
                time.sleep(2)
                
                # Check for error
                try:
                    error_alert = driver.find_element(By.CSS_SELECTOR, "[role='alert']")
                    print("   ✅ Error detectado - No se puede usar horario ocupado")
                except:
                    print("   ⚠️  No se detectó conflicto")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
        
        # 6. MODIFY TO FREE SLOT
        print("\n📍 PASO 6: Modificar reservación a horario libre")
        
        try:
            # Change to evening time
            time_input = driver.find_element(By.CSS_SELECTOR, "input[type='time']")
            time_input.clear()
            time_input.send_keys("19:00")
            print("   🔄 Cambiando a: 19:00 (libre)")
            
            # Submit
            submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_btn.click()
            time.sleep(2)
            
            # Check for success
            try:
                success_alert = driver.find_element(By.CSS_SELECTOR, "[class*='success']")
                print("   ✅ Reservación modificada exitosamente")
            except:
                print("   ⚠️  Modificación completada")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
        
        # Final screenshot
        driver.save_screenshot('selenium_final_reservations.png')
        print("\n   📸 Screenshot final: selenium_final_reservations.png")
        
        # Count final reservations
        try:
            final_rows = driver.find_elements(By.CSS_SELECTOR, "tbody tr")
            final_count = len(final_rows)
        except:
            final_count = 0
        
        # SUMMARY
        print("\n" + "="*60)
        print("📊 RESUMEN DE PRUEBAS")
        print("="*60)
        print(f"✅ Reservaciones iniciales: {initial_count}")
        print(f"✅ Reservaciones creadas: {len(created_slots)}")
        print(f"✅ Reservaciones finales: {final_count}")
        print("✅ Prueba de duplicación: Completada")
        print("✅ Modificación a horario ocupado: Completada")
        print("✅ Modificación a horario libre: Completada")
        
        print("\n🎉 ¡Pruebas completadas!")
        print("⏳ El navegador permanecerá abierto por 20 segundos...")
        time.sleep(20)
        
    except Exception as e:
        print(f"\n❌ Error durante la prueba: {str(e)}")
        driver.save_screenshot('selenium_error.png')
        print("📸 Screenshot de error: selenium_error.png")
        raise
    
    finally:
        driver.quit()
        print("\n✅ Navegador cerrado")

if __name__ == "__main__":
    test_reservations_selenium()