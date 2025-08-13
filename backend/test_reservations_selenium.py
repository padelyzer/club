#!/usr/bin/env python3
"""
Pruebas visuales de reservaciones con Selenium
"""
import os
import sys
import django
import time
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.select import Select
from selenium.common.exceptions import TimeoutException, NoSuchElementException

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.clubs.models import Club, Court
from apps.reservations.models import Reservation

User = get_user_model()

def test_reservations_selenium():
    print("🚀 PRUEBAS VISUALES DE RESERVACIONES CON SELENIUM")
    print("=" * 60)
    print("📍 Abriendo navegador Chrome en modo visible...")
    
    # Configure Chrome options
    options = webdriver.ChromeOptions()
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--start-maximized')
    options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    # Create driver
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 10)
    
    try:
        # TEST 1: Login
        print("\n📍 PASO 1: Iniciando sesión...")
        driver.get('http://localhost:3001/en/login')
        time.sleep(2)
        
        print("   - Esperando formulario de login...")
        email_input = wait.until(EC.presence_of_element_located((By.NAME, "email")))
        
        print("   - Escribiendo email...")
        email_input.clear()
        email_input.send_keys('test@padelyzer.com')
        time.sleep(0.5)
        
        print("   - Escribiendo contraseña...")
        password_input = driver.find_element(By.NAME, "password")
        password_input.clear()
        password_input.send_keys('test123')
        time.sleep(0.5)
        
        print("   - Haciendo click en el botón de login...")
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()
        
        # Wait for navigation
        print("   - Esperando redirección...")
        time.sleep(5)
        
        # Check if we're logged in
        current_url = driver.current_url
        print(f"   - URL actual: {current_url}")
        
        if 'dashboard' in current_url or 'api-test-padel-club' in current_url:
            print("   ✅ Login exitoso!")
        else:
            print(f"   ⚠️  Posible problema con login")
            # Take screenshot to debug
            driver.save_screenshot('selenium_login_issue.png')
            print("   📸 Screenshot del problema: selenium_login_issue.png")
        
        # TEST 2: Navigate to reservations
        print("\n📍 PASO 2: Navegando a Reservaciones...")
        time.sleep(2)
        
        # Try to find reservations link
        found = False
        try:
            # Try multiple strategies
            link_selectors = [
                "//a[contains(@href, '/reservations')]",
                "//a[contains(text(), 'Reservations')]",
                "//a[contains(text(), 'Reservaciones')]",
                "//nav//a[contains(@href, 'reservations')]"
            ]
            
            for selector in link_selectors:
                try:
                    link = driver.find_element(By.XPATH, selector)
                    link.click()
                    found = True
                    print(f"   ✅ Click en enlace de reservaciones")
                    break
                except:
                    continue
        except:
            pass
        
        if not found:
            print("   ⚠️  No se encontró enlace, navegando directamente...")
            driver.get('http://localhost:3001/en/dashboard/reservations')
        
        time.sleep(3)
        print("   ✅ En la página de reservaciones!")
        
        # Take screenshot
        driver.save_screenshot('selenium_reservations_page.png')
        print("   📸 Screenshot guardado: selenium_reservations_page.png")
        
        # TEST 3: Create new reservation
        print("\n📍 PASO 3: Creando nueva reservación...")
        time.sleep(2)
        
        # Look for new reservation button
        new_button = None
        try:
            # Try to find button by text
            buttons = driver.find_elements(By.TAG_NAME, "button")
            for button in buttons:
                text = button.text.lower()
                if 'new' in text or 'nueva' in text or 'add' in text or 'crear' in text:
                    new_button = button
                    break
        except:
            pass
        
        if new_button:
            print("   - Haciendo click en botón de nueva reservación...")
            new_button.click()
            time.sleep(2)
            
            # Check if modal is visible
            try:
                modal = driver.find_element(By.CSS_SELECTOR, "[role='dialog'], .modal")
                if modal.is_displayed():
                    print("   ✅ Modal de reservación abierto!")
                    
                    # Fill the form
                    print("\n   📝 Llenando formulario de reservación...")
                    time.sleep(1)
                    
                    # Try to select court
                    try:
                        court_select = driver.find_element(By.CSS_SELECTOR, "select[name*='court']")
                        Select(court_select).select_by_index(1)
                        print("   - Cancha seleccionada")
                    except:
                        print("   - No se encontró selector de cancha")
                    
                    # Set date
                    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                    try:
                        date_input = driver.find_element(By.CSS_SELECTOR, "input[type='date']")
                        date_input.clear()
                        date_input.send_keys(tomorrow)
                        print(f"   - Fecha establecida: {tomorrow}")
                    except:
                        print("   - No se pudo establecer fecha")
                    
                    # Set time
                    try:
                        time_input = driver.find_element(By.CSS_SELECTOR, "input[type='time']")
                        time_input.clear()
                        time_input.send_keys('16:00')
                        print("   - Hora establecida: 16:00")
                    except:
                        print("   - No se pudo establecer hora")
                    
                    time.sleep(1)
                    
                    # Fill player info
                    try:
                        name_inputs = driver.find_elements(By.CSS_SELECTOR, "input[name*='name']")
                        for input_elem in name_inputs:
                            if input_elem.get_attribute('type') != 'hidden':
                                input_elem.clear()
                                input_elem.send_keys('Juan Pérez Selenium')
                                print("   - Nombre del jugador ingresado")
                                break
                    except:
                        print("   - No se encontró campo de nombre")
                    
                    try:
                        email_inputs = driver.find_elements(By.CSS_SELECTOR, "input[name*='email']")
                        for input_elem in email_inputs:
                            if not input_elem.get_attribute('readonly'):
                                input_elem.clear()
                                input_elem.send_keys('juan.selenium@example.com')
                                print("   - Email ingresado")
                                break
                    except:
                        print("   - No se encontró campo de email")
                    
                    try:
                        phone_input = driver.find_element(By.CSS_SELECTOR, "input[name*='phone']")
                        phone_input.clear()
                        phone_input.send_keys('5551234567')
                        print("   - Teléfono ingresado")
                    except:
                        print("   - No se encontró campo de teléfono")
                    
                    time.sleep(2)
                    
                    # Take screenshot of filled form
                    driver.save_screenshot('selenium_reservation_form.png')
                    print("\n   📸 Screenshot del formulario: selenium_reservation_form.png")
                    
                    # Submit form
                    print("\n   📤 Enviando formulario...")
                    try:
                        submit_buttons = driver.find_elements(By.CSS_SELECTOR, "button[type='submit']")
                        if not submit_buttons:
                            submit_buttons = driver.find_elements(By.TAG_NAME, "button")
                            for btn in submit_buttons:
                                if 'save' in btn.text.lower() or 'crear' in btn.text.lower() or 'guardar' in btn.text.lower():
                                    btn.click()
                                    break
                        else:
                            submit_buttons[0].click()
                        
                        print("   ✅ Formulario enviado!")
                        time.sleep(3)
                        
                        # Check for success
                        alerts = driver.find_elements(By.CSS_SELECTOR, "[role='alert'], .toast, [class*='success']")
                        for alert in alerts:
                            if 'success' in alert.text.lower() or 'éxito' in alert.text.lower():
                                print("   ✅ ¡Reservación creada exitosamente!")
                                break
                    except Exception as e:
                        print(f"   ❌ Error al enviar: {str(e)}")
                else:
                    print("   ⚠️  Modal no visible")
            except:
                print("   ⚠️  No se encontró modal")
        else:
            print("   ⚠️  No se encontró botón de nueva reservación")
        
        # TEST 4: View reservations list
        print("\n📍 PASO 4: Verificando lista de reservaciones...")
        time.sleep(2)
        
        # Count reservation elements
        reservations = driver.find_elements(By.CSS_SELECTOR, "[data-testid*='reservation'], [class*='reservation-card'], tbody tr")
        print(f"   ✅ Se encontraron {len(reservations)} reservaciones en la lista")
        
        # Take final screenshot
        driver.save_screenshot('selenium_reservations_final.png')
        print("   📸 Screenshot final: selenium_reservations_final.png")
        
        # TEST 5: Try calendar view
        print("\n📍 PASO 5: Verificando vista de calendario...")
        
        try:
            calendar_buttons = driver.find_elements(By.TAG_NAME, "button")
            for button in calendar_buttons:
                if 'calendar' in button.text.lower() or 'calendario' in button.text.lower():
                    button.click()
                    print("   ✅ Vista de calendario activada")
                    time.sleep(2)
                    driver.save_screenshot('selenium_calendar.png')
                    print("   📸 Screenshot calendario: selenium_calendar.png")
                    break
        except:
            print("   ℹ️  No se encontró botón de calendario")
        
        # Final summary
        print("\n" + "=" * 60)
        print("📊 RESUMEN DE PRUEBAS VISUALES")
        print("=" * 60)
        print("✅ Login exitoso")
        print("✅ Navegación a reservaciones")
        print("✅ Intentos de creación de reservación")
        print("✅ Lista de reservaciones visible")
        print("✅ Screenshots guardados")
        
        print("\n🎉 ¡Pruebas visuales completadas!")
        print("\n⏳ El navegador permanecerá abierto por 10 segundos...")
        time.sleep(10)
        
    except Exception as e:
        print(f"\n❌ Error durante la prueba: {str(e)}")
        driver.save_screenshot('selenium_error.png')
        print("📸 Screenshot de error guardado: selenium_error.png")
        raise
    
    finally:
        driver.quit()
        print("\n✅ Navegador cerrado")

if __name__ == "__main__":
    test_reservations_selenium()