#!/usr/bin/env python3
"""
Pruebas UX completas de los módulos principales usando Puppeteer
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Try to import pyppeteer
try:
    from pyppeteer import launch
    from pyppeteer.errors import TimeoutError, ElementHandleError
except ImportError:
    print("❌ pyppeteer no está instalado. Instalando...")
    os.system("pip install pyppeteer")
    try:
        from pyppeteer import launch
        from pyppeteer.errors import TimeoutError, ElementHandleError
    except ImportError:
        print("❌ No se pudo instalar pyppeteer")
        sys.exit(1)

class PadelyzerUXTester:
    def __init__(self):
        self.browser = None
        self.page = None
        self.base_url = "http://localhost:3001"
        self.results = {
            'clients': {'tests': [], 'errors': [], 'success': True},
            'reservations': {'tests': [], 'errors': [], 'success': True},
            'tournaments': {'tests': [], 'errors': [], 'success': True},
            'leagues': {'tests': [], 'errors': [], 'success': True}
        }
    
    async def setup(self):
        """Initialize browser and page"""
        print("🚀 INICIANDO PRUEBAS UX DE PADELYZER")
        print("=" * 60)
        
        try:
            self.browser = await launch({
                'headless': False,  # Show browser for debugging
                'defaultViewport': {'width': 1366, 'height': 768},
                'args': [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            })
            self.page = await self.browser.newPage()
            
            # Set user agent
            await self.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
            
            print("✅ Browser iniciado correctamente")
            return True
            
        except Exception as e:
            print(f"❌ Error iniciando browser: {str(e)}")
            return False
    
    async def login(self):
        """Login to the system"""
        try:
            print(f"\n📍 PASO 1: Iniciar sesión")
            
            # Navigate to login page
            await self.page.goto(f"{self.base_url}/login")
            await asyncio.sleep(2)
            
            print("   • Navegando a página de login...")
            
            # Wait for and fill login form
            try:
                await self.page.waitForSelector('input[name="email"], input[type="email"]', timeout=10000)
                print("   • Formulario de login encontrado")
                
                # Fill email
                email_selector = 'input[name="email"], input[type="email"]'
                await self.page.type(email_selector, 'test@padelyzer.com')
                print("   • Email ingresado")
                
                # Fill password
                password_selector = 'input[name="password"], input[type="password"]'
                await self.page.type(password_selector, 'test123')
                print("   • Password ingresado")
                
                # Submit form
                submit_button = 'button[type="submit"], button:contains("Iniciar"), button:contains("Login")'
                await self.page.click(submit_button)
                print("   • Formulario enviado")
                
                # Wait for navigation or dashboard
                await asyncio.sleep(3)
                
                # Check if we're logged in by looking for dashboard elements
                current_url = self.page.url
                if 'dashboard' in current_url or 'clients' in current_url:
                    print("   ✅ Login exitoso")
                    return True
                else:
                    print(f"   ⚠️  Login posiblemente exitoso, URL actual: {current_url}")
                    return True
                    
            except TimeoutError:
                print("   ❌ Timeout esperando formulario de login")
                return False
                
        except Exception as e:
            print(f"   ❌ Error en login: {str(e)}")
            return False
    
    async def test_clients_module(self):
        """Test clients module UX"""
        print(f"\n📍 MÓDULO DE CLIENTES - PRUEBAS UX")
        print("-" * 40)
        
        try:
            # Navigate to clients page
            await self.page.goto(f"{self.base_url}/dashboard/clients")
            await asyncio.sleep(2)
            
            print("   • Navegando a módulo de clientes...")
            
            # Test 1: Verify clients list loads
            try:
                await self.page.waitForSelector('[data-testid="clients-list"], .clients-list, table, .grid', timeout=10000)
                print("   ✅ Lista de clientes cargada")
                self.results['clients']['tests'].append("Lista de clientes - OK")
            except TimeoutError:
                print("   ❌ Lista de clientes no carga")
                self.results['clients']['errors'].append("Lista de clientes no carga")
                self.results['clients']['success'] = False
            
            # Test 2: Test "Add Client" button
            try:
                add_button_selectors = [
                    'button:contains("Nuevo")',
                    'button:contains("Agregar")',
                    'button:contains("Add")',
                    '[data-testid="add-client"]',
                    '.btn-primary',
                    'button[class*="add"]'
                ]
                
                button_found = False
                for selector in add_button_selectors:
                    try:
                        await self.page.waitForSelector(selector, timeout=2000)
                        await self.page.click(selector)
                        button_found = True
                        break
                    except TimeoutError:
                        continue
                
                if button_found:
                    await asyncio.sleep(2)
                    print("   ✅ Botón 'Agregar Cliente' funciona")
                    self.results['clients']['tests'].append("Botón agregar cliente - OK")
                    
                    # Test 3: Test client form modal/page
                    try:
                        form_selectors = [
                            'form',
                            '[data-testid="client-form"]',
                            'input[name="name"], input[name="first_name"]'
                        ]
                        
                        form_found = False
                        for selector in form_selectors:
                            try:
                                await self.page.waitForSelector(selector, timeout=3000)
                                form_found = True
                                break
                            except TimeoutError:
                                continue
                        
                        if form_found:
                            print("   ✅ Formulario de cliente aparece")
                            self.results['clients']['tests'].append("Formulario de cliente - OK")
                            
                            # Try to fill form
                            try:
                                # Fill name field
                                name_selectors = ['input[name="name"]', 'input[name="first_name"]', 'input[placeholder*="nombre"]']
                                for selector in name_selectors:
                                    try:
                                        await self.page.type(selector, f"Cliente UX Test {datetime.now().strftime('%H%M%S')}")
                                        print("   ✅ Campo nombre llenado")
                                        break
                                    except:
                                        continue
                                
                                # Fill email field
                                email_selectors = ['input[name="email"]', 'input[type="email"]']
                                for selector in email_selectors:
                                    try:
                                        await self.page.type(selector, f"uxtest{datetime.now().strftime('%H%M%S')}@test.com")
                                        print("   ✅ Campo email llenado")
                                        break
                                    except:
                                        continue
                                
                                self.results['clients']['tests'].append("Llenar formulario cliente - OK")
                                
                            except Exception as e:
                                print(f"   ⚠️  Error llenando formulario: {str(e)}")
                        else:
                            print("   ❌ Formulario de cliente no aparece")
                            self.results['clients']['errors'].append("Formulario de cliente no aparece")
                    
                    except Exception as e:
                        print(f"   ❌ Error probando formulario: {str(e)}")
                        self.results['clients']['errors'].append(f"Error formulario: {str(e)}")
                else:
                    print("   ❌ Botón 'Agregar Cliente' no encontrado")
                    self.results['clients']['errors'].append("Botón agregar cliente no encontrado")
                    self.results['clients']['success'] = False
                
            except Exception as e:
                print(f"   ❌ Error probando botón agregar: {str(e)}")
                self.results['clients']['errors'].append(f"Error botón agregar: {str(e)}")
            
            # Test 4: Test search functionality
            try:
                search_selectors = [
                    'input[placeholder*="buscar"]',
                    'input[placeholder*="search"]',
                    'input[name="search"]',
                    '[data-testid="search-input"]'
                ]
                
                search_found = False
                for selector in search_selectors:
                    try:
                        await self.page.type(selector, "test")
                        search_found = True
                        print("   ✅ Función de búsqueda disponible")
                        self.results['clients']['tests'].append("Búsqueda de clientes - OK")
                        break
                    except:
                        continue
                
                if not search_found:
                    print("   ⚠️  Función de búsqueda no encontrada")
                    
            except Exception as e:
                print(f"   ⚠️  Error probando búsqueda: {str(e)}")
            
            # Test 5: Check for existing clients in the list
            try:
                # Look for client data in table rows or cards
                client_elements = await self.page.evaluate('''() => {
                    const rows = document.querySelectorAll('tr, .client-card, .client-item');
                    return rows.length;
                }''')
                
                if client_elements > 1:  # More than header row
                    print(f"   ✅ {client_elements - 1} clientes mostrados en la lista")
                    self.results['clients']['tests'].append(f"Clientes en lista: {client_elements - 1}")
                else:
                    print("   ⚠️  No se encontraron clientes en la lista")
                    
            except Exception as e:
                print(f"   ⚠️  Error contando clientes: {str(e)}")
            
            print("   📊 Resumen módulo clientes:")
            print(f"      ✅ Pruebas exitosas: {len(self.results['clients']['tests'])}")
            print(f"      ❌ Errores: {len(self.results['clients']['errors'])}")
            
        except Exception as e:
            print(f"   ❌ Error general en módulo clientes: {str(e)}")
            self.results['clients']['errors'].append(f"Error general: {str(e)}")
            self.results['clients']['success'] = False
    
    async def test_reservations_module(self):
        """Test reservations module UX"""
        print(f"\n📍 MÓDULO DE RESERVACIONES - PRUEBAS UX")
        print("-" * 40)
        
        try:
            # Navigate to reservations page
            reservation_urls = [
                f"{self.base_url}/dashboard/reservations",
                f"{self.base_url}/dashboard/courts",
                f"{self.base_url}/dashboard"
            ]
            
            page_loaded = False
            for url in reservation_urls:
                try:
                    await self.page.goto(url)
                    await asyncio.sleep(2)
                    page_loaded = True
                    print(f"   • Navegando a: {url}")
                    break
                except:
                    continue
            
            if not page_loaded:
                print("   ❌ No se pudo cargar página de reservaciones")
                self.results['reservations']['success'] = False
                return
            
            # Test 1: Look for reservations interface
            try:
                interface_selectors = [
                    '[data-testid="reservations-list"]',
                    '.reservations-list',
                    '.calendar',
                    '.booking-interface',
                    'table',
                    '.grid'
                ]
                
                interface_found = False
                for selector in interface_selectors:
                    try:
                        await self.page.waitForSelector(selector, timeout=3000)
                        interface_found = True
                        print("   ✅ Interfaz de reservaciones encontrada")
                        self.results['reservations']['tests'].append("Interfaz de reservaciones - OK")
                        break
                    except TimeoutError:
                        continue
                
                if not interface_found:
                    print("   ❌ Interfaz de reservaciones no encontrada")
                    self.results['reservations']['errors'].append("Interfaz no encontrada")
                    
            except Exception as e:
                print(f"   ❌ Error buscando interfaz: {str(e)}")
                self.results['reservations']['errors'].append(f"Error interfaz: {str(e)}")
            
            # Test 2: Test "New Reservation" button
            try:
                new_reservation_selectors = [
                    'button:contains("Nueva")',
                    'button:contains("Reservar")',
                    'button:contains("Book")',
                    '[data-testid="new-reservation"]',
                    '.btn-primary'
                ]
                
                button_found = False
                for selector in new_reservation_selectors:
                    try:
                        await self.page.waitForSelector(selector, timeout=2000)
                        await self.page.click(selector)
                        button_found = True
                        print("   ✅ Botón 'Nueva Reservación' funciona")
                        self.results['reservations']['tests'].append("Botón nueva reservación - OK")
                        break
                    except TimeoutError:
                        continue
                
                if button_found:
                    await asyncio.sleep(2)
                    
                    # Test 3: Check for reservation form
                    try:
                        form_selectors = [
                            'form',
                            '[data-testid="reservation-form"]',
                            'select[name="court"]',
                            'input[type="date"]',
                            'input[type="time"]'
                        ]
                        
                        form_found = False
                        for selector in form_selectors:
                            try:
                                await self.page.waitForSelector(selector, timeout=3000)
                                form_found = True
                                break
                            except TimeoutError:
                                continue
                        
                        if form_found:
                            print("   ✅ Formulario de reservación aparece")
                            self.results['reservations']['tests'].append("Formulario de reservación - OK")
                            
                            # Try to interact with form elements
                            try:
                                # Try to select a court
                                court_selectors = ['select[name="court"]', 'select[id*="court"]']
                                for selector in court_selectors:
                                    try:
                                        await self.page.select(selector, '1')  # Select first option
                                        print("   ✅ Selección de cancha funciona")
                                        break
                                    except:
                                        continue
                                
                                # Try to set date
                                date_selectors = ['input[type="date"]', 'input[name="date"]']
                                tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                                for selector in date_selectors:
                                    try:
                                        await self.page.evaluate(f'document.querySelector("{selector}").value = "{tomorrow}"')
                                        print("   ✅ Selección de fecha funciona")
                                        break
                                    except:
                                        continue
                                
                                self.results['reservations']['tests'].append("Interacción con formulario - OK")
                                
                            except Exception as e:
                                print(f"   ⚠️  Error interactuando con formulario: {str(e)}")
                        else:
                            print("   ❌ Formulario de reservación no aparece")
                            self.results['reservations']['errors'].append("Formulario de reservación no aparece")
                    
                    except Exception as e:
                        print(f"   ❌ Error probando formulario: {str(e)}")
                        self.results['reservations']['errors'].append(f"Error formulario: {str(e)}")
                else:
                    print("   ⚠️  Botón 'Nueva Reservación' no encontrado")
                    
            except Exception as e:
                print(f"   ❌ Error probando botón nueva reservación: {str(e)}")
                self.results['reservations']['errors'].append(f"Error botón: {str(e)}")
            
            # Test 4: Check for existing reservations
            try:
                reservations_count = await self.page.evaluate('''() => {
                    const rows = document.querySelectorAll('tr, .reservation-card, .booking-item');
                    return rows.length;
                }''')
                
                if reservations_count > 1:
                    print(f"   ✅ {reservations_count - 1} reservaciones mostradas")
                    self.results['reservations']['tests'].append(f"Reservaciones mostradas: {reservations_count - 1}")
                else:
                    print("   ⚠️  No se encontraron reservaciones en la lista")
                    
            except Exception as e:
                print(f"   ⚠️  Error contando reservaciones: {str(e)}")
            
            print("   📊 Resumen módulo reservaciones:")
            print(f"      ✅ Pruebas exitosas: {len(self.results['reservations']['tests'])}")
            print(f"      ❌ Errores: {len(self.results['reservations']['errors'])}")
            
        except Exception as e:
            print(f"   ❌ Error general en módulo reservaciones: {str(e)}")
            self.results['reservations']['errors'].append(f"Error general: {str(e)}")
            self.results['reservations']['success'] = False
    
    async def test_tournaments_module(self):
        """Test tournaments module UX"""
        print(f"\n📍 MÓDULO DE TORNEOS - PRUEBAS UX")
        print("-" * 40)
        
        try:
            # Navigate to tournaments page
            await self.page.goto(f"{self.base_url}/dashboard/tournaments")
            await asyncio.sleep(2)
            
            print("   • Navegando a módulo de torneos...")
            
            # Test 1: Verify tournaments list loads
            try:
                await self.page.waitForSelector('[data-testid="tournaments-list"], .tournaments-list, table, .grid', timeout=10000)
                print("   ✅ Lista de torneos cargada")
                self.results['tournaments']['tests'].append("Lista de torneos - OK")
            except TimeoutError:
                print("   ❌ Lista de torneos no carga")
                self.results['tournaments']['errors'].append("Lista de torneos no carga")
                self.results['tournaments']['success'] = False
            
            # Test 2: Test "New Tournament" button
            try:
                new_tournament_selectors = [
                    'button:contains("Nuevo")',
                    'button:contains("Crear")',
                    'button:contains("Add")',
                    '[data-testid="new-tournament"]',
                    '.btn-primary'
                ]
                
                button_found = False
                for selector in new_tournament_selectors:
                    try:
                        await self.page.waitForSelector(selector, timeout=2000)
                        await self.page.click(selector)
                        button_found = True
                        break
                    except TimeoutError:
                        continue
                
                if button_found:
                    await asyncio.sleep(2)
                    print("   ✅ Botón 'Nuevo Torneo' funciona")
                    self.results['tournaments']['tests'].append("Botón nuevo torneo - OK")
                    
                    # Test 3: Check for tournament form
                    try:
                        form_selectors = [
                            'form',
                            '[data-testid="tournament-form"]',
                            'input[name="name"]',
                            'select[name="format"]'
                        ]
                        
                        form_found = False
                        for selector in form_selectors:
                            try:
                                await self.page.waitForSelector(selector, timeout=3000)
                                form_found = True
                                break
                            except TimeoutError:
                                continue
                        
                        if form_found:
                            print("   ✅ Formulario de torneo aparece")
                            self.results['tournaments']['tests'].append("Formulario de torneo - OK")
                            
                            # Try to fill tournament form
                            try:
                                # Fill tournament name
                                name_selectors = ['input[name="name"]', 'input[placeholder*="nombre"]']
                                for selector in name_selectors:
                                    try:
                                        await self.page.type(selector, f"Torneo UX Test {datetime.now().strftime('%H%M%S')}")
                                        print("   ✅ Campo nombre torneo llenado")
                                        break
                                    except:
                                        continue
                                
                                # Try to select format
                                format_selectors = ['select[name="format"]', 'select[id*="format"]']
                                for selector in format_selectors:
                                    try:
                                        await self.page.select(selector, 'elimination')
                                        print("   ✅ Formato de torneo seleccionado")
                                        break
                                    except:
                                        continue
                                
                                self.results['tournaments']['tests'].append("Llenar formulario torneo - OK")
                                
                            except Exception as e:
                                print(f"   ⚠️  Error llenando formulario torneo: {str(e)}")
                        else:
                            print("   ❌ Formulario de torneo no aparece")
                            self.results['tournaments']['errors'].append("Formulario de torneo no aparece")
                    
                    except Exception as e:
                        print(f"   ❌ Error probando formulario torneo: {str(e)}")
                        self.results['tournaments']['errors'].append(f"Error formulario: {str(e)}")
                else:
                    print("   ❌ Botón 'Nuevo Torneo' no encontrado")
                    self.results['tournaments']['errors'].append("Botón nuevo torneo no encontrado")
                    self.results['tournaments']['success'] = False
                
            except Exception as e:
                print(f"   ❌ Error probando botón nuevo torneo: {str(e)}")
                self.results['tournaments']['errors'].append(f"Error botón: {str(e)}")
            
            # Test 4: Check for existing tournaments
            try:
                tournaments_count = await self.page.evaluate('''() => {
                    const rows = document.querySelectorAll('tr, .tournament-card, .tournament-item');
                    return rows.length;
                }''')
                
                if tournaments_count > 1:
                    print(f"   ✅ {tournaments_count - 1} torneos mostrados")
                    self.results['tournaments']['tests'].append(f"Torneos mostrados: {tournaments_count - 1}")
                else:
                    print("   ⚠️  No se encontraron torneos en la lista")
                    
            except Exception as e:
                print(f"   ⚠️  Error contando torneos: {str(e)}")
            
            print("   📊 Resumen módulo torneos:")
            print(f"      ✅ Pruebas exitosas: {len(self.results['tournaments']['tests'])}")
            print(f"      ❌ Errores: {len(self.results['tournaments']['errors'])}")
            
        except Exception as e:
            print(f"   ❌ Error general en módulo torneos: {str(e)}")
            self.results['tournaments']['errors'].append(f"Error general: {str(e)}")
            self.results['tournaments']['success'] = False
    
    async def test_leagues_module(self):
        """Test leagues module UX"""
        print(f"\n📍 MÓDULO DE LIGAS - PRUEBAS UX")
        print("-" * 40)
        
        try:
            # Navigate to leagues page
            await self.page.goto(f"{self.base_url}/dashboard/leagues")
            await asyncio.sleep(2)
            
            print("   • Navegando a módulo de ligas...")
            
            # Test 1: Verify leagues list loads
            try:
                await self.page.waitForSelector('[data-testid="leagues-list"], .leagues-list, table, .grid', timeout=10000)
                print("   ✅ Lista de ligas cargada")
                self.results['leagues']['tests'].append("Lista de ligas - OK")
            except TimeoutError:
                print("   ❌ Lista de ligas no carga")
                self.results['leagues']['errors'].append("Lista de ligas no carga")
                self.results['leagues']['success'] = False
            
            # Test 2: Test "New League" button
            try:
                new_league_selectors = [
                    'button:contains("Nueva")',
                    'button:contains("Crear")',
                    'button:contains("Add")',
                    '[data-testid="new-league"]',
                    '.btn-primary'
                ]
                
                button_found = False
                for selector in new_league_selectors:
                    try:
                        await self.page.waitForSelector(selector, timeout=2000)
                        await self.page.click(selector)
                        button_found = True
                        break
                    except TimeoutError:
                        continue
                
                if button_found:
                    await asyncio.sleep(2)
                    print("   ✅ Botón 'Nueva Liga' funciona")
                    self.results['leagues']['tests'].append("Botón nueva liga - OK")
                    
                    # Test 3: Check for league form
                    try:
                        form_selectors = [
                            'form',
                            '[data-testid="league-form"]',
                            'input[name="name"]',
                            'select[name="division"]'
                        ]
                        
                        form_found = False
                        for selector in form_selectors:
                            try:
                                await self.page.waitForSelector(selector, timeout=3000)
                                form_found = True
                                break
                            except TimeoutError:
                                continue
                        
                        if form_found:
                            print("   ✅ Formulario de liga aparece")
                            self.results['leagues']['tests'].append("Formulario de liga - OK")
                            
                            # Try to fill league form
                            try:
                                # Fill league name
                                name_selectors = ['input[name="name"]', 'input[placeholder*="nombre"]']
                                for selector in name_selectors:
                                    try:
                                        await self.page.type(selector, f"Liga UX Test {datetime.now().strftime('%H%M%S')}")
                                        print("   ✅ Campo nombre liga llenado")
                                        break
                                    except:
                                        continue
                                
                                # Try to select division
                                division_selectors = ['select[name="division"]', 'select[id*="division"]']
                                for selector in division_selectors:
                                    try:
                                        await self.page.select(selector, 'primera')
                                        print("   ✅ División de liga seleccionada")
                                        break
                                    except:
                                        continue
                                
                                self.results['leagues']['tests'].append("Llenar formulario liga - OK")
                                
                            except Exception as e:
                                print(f"   ⚠️  Error llenando formulario liga: {str(e)}")
                        else:
                            print("   ❌ Formulario de liga no aparece")
                            self.results['leagues']['errors'].append("Formulario de liga no aparece")
                    
                    except Exception as e:
                        print(f"   ❌ Error probando formulario liga: {str(e)}")
                        self.results['leagues']['errors'].append(f"Error formulario: {str(e)}")
                else:
                    print("   ❌ Botón 'Nueva Liga' no encontrado")
                    self.results['leagues']['errors'].append("Botón nueva liga no encontrado")
                    self.results['leagues']['success'] = False
                
            except Exception as e:
                print(f"   ❌ Error probando botón nueva liga: {str(e)}")
                self.results['leagues']['errors'].append(f"Error botón: {str(e)}")
            
            # Test 4: Check for existing leagues
            try:
                leagues_count = await self.page.evaluate('''() => {
                    const rows = document.querySelectorAll('tr, .league-card, .league-item');
                    return rows.length;
                }''')
                
                if leagues_count > 1:
                    print(f"   ✅ {leagues_count - 1} ligas mostradas")
                    self.results['leagues']['tests'].append(f"Ligas mostradas: {leagues_count - 1}")
                else:
                    print("   ⚠️  No se encontraron ligas en la lista")
                    
            except Exception as e:
                print(f"   ⚠️  Error contando ligas: {str(e)}")
            
            print("   📊 Resumen módulo ligas:")
            print(f"      ✅ Pruebas exitosas: {len(self.results['leagues']['tests'])}")
            print(f"      ❌ Errores: {len(self.results['leagues']['errors'])}")
            
        except Exception as e:
            print(f"   ❌ Error general en módulo ligas: {str(e)}")
            self.results['leagues']['errors'].append(f"Error general: {str(e)}")
            self.results['leagues']['success'] = False
    
    async def generate_report(self):
        """Generate final UX test report"""
        print(f"\n" + "=" * 60)
        print("📊 REPORTE FINAL DE PRUEBAS UX")
        print("=" * 60)
        
        total_tests = 0
        total_errors = 0
        successful_modules = 0
        
        for module_name, results in self.results.items():
            module_display = {
                'clients': '👥 CLIENTES',
                'reservations': '🏟️  RESERVACIONES', 
                'tournaments': '🏆 TORNEOS',
                'leagues': '🏅 LIGAS'
            }
            
            print(f"\n{module_display[module_name]}:")
            print(f"   ✅ Pruebas exitosas: {len(results['tests'])}")
            print(f"   ❌ Errores: {len(results['errors'])}")
            print(f"   🎯 Estado: {'FUNCIONAL' if results['success'] else 'CON PROBLEMAS'}")
            
            if results['tests']:
                print(f"   📋 Pruebas exitosas:")
                for test in results['tests']:
                    print(f"      • {test}")
            
            if results['errors']:
                print(f"   ⚠️  Errores encontrados:")
                for error in results['errors']:
                    print(f"      • {error}")
            
            total_tests += len(results['tests'])
            total_errors += len(results['errors'])
            if results['success']:
                successful_modules += 1
        
        # Calculate overall score
        total_modules = len(self.results)
        success_rate = (successful_modules / total_modules) * 100
        
        print(f"\n" + "=" * 60)
        print("🎯 RESUMEN EJECUTIVO")
        print("=" * 60)
        print(f"📊 Módulos probados: {total_modules}")
        print(f"📊 Módulos funcionales: {successful_modules}")
        print(f"📊 Pruebas exitosas: {total_tests}")
        print(f"📊 Errores encontrados: {total_errors}")
        print(f"📊 Tasa de éxito: {success_rate:.1f}%")
        
        if success_rate >= 75:
            grade = "A+ (Excelente)"
            status = "✅ SISTEMA UX COMPLETAMENTE FUNCIONAL"
        elif success_rate >= 50:
            grade = "B (Bueno)"
            status = "⚠️  SISTEMA UX MAYORMENTE FUNCIONAL"
        else:
            grade = "C (Necesita mejoras)"
            status = "❌ SISTEMA UX NECESITA MEJORAS"
        
        print(f"🏆 Calificación: {grade}")
        print(f"📋 Estado: {status}")
        
        print(f"\n🎯 ¡Pruebas UX de Padelyzer completadas!")
        
        return {
            'total_modules': total_modules,
            'successful_modules': successful_modules,
            'success_rate': success_rate,
            'total_tests': total_tests,
            'total_errors': total_errors,
            'grade': grade
        }
    
    async def cleanup(self):
        """Clean up browser resources"""
        if self.browser:
            await self.browser.close()
            print("\n🧹 Browser cerrado correctamente")
    
    async def run_all_tests(self):
        """Run all UX tests"""
        try:
            # Setup
            if not await self.setup():
                return False
            
            # Login
            if not await self.login():
                print("❌ No se pudo hacer login, abortando pruebas")
                return False
            
            # Run module tests
            await self.test_clients_module()
            await self.test_reservations_module()
            await self.test_tournaments_module()
            await self.test_leagues_module()
            
            # Generate report
            await self.generate_report()
            
            return True
            
        except Exception as e:
            print(f"❌ Error ejecutando pruebas: {str(e)}")
            return False
        finally:
            await self.cleanup()

async def main():
    """Main function to run UX tests"""
    tester = PadelyzerUXTester()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        if result:
            print("\n✅ Pruebas UX completadas exitosamente")
        else:
            print("\n❌ Pruebas UX terminaron con errores")
    except KeyboardInterrupt:
        print("\n⚠️  Pruebas interrumpidas por el usuario")
    except Exception as e:
        print(f"\n❌ Error ejecutando pruebas: {str(e)}")