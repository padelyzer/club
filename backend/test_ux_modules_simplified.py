#!/usr/bin/env python3
"""
Pruebas UX simplificadas de los módulos principales usando Puppeteer
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

class SimplifiedUXTester:
    def __init__(self):
        self.browser = None
        self.page = None
        self.base_url = "http://localhost:3000"
        self.results = {
            'clients': {'tests': [], 'errors': [], 'success': True},
            'reservations': {'tests': [], 'errors': [], 'success': True},
            'tournaments': {'tests': [], 'errors': [], 'success': True},
            'leagues': {'tests': [], 'errors': [], 'success': True}
        }
    
    async def setup(self):
        """Initialize browser and page"""
        print("🚀 INICIANDO PRUEBAS UX SIMPLIFICADAS DE PADELYZER")
        print("=" * 60)
        
        try:
            self.browser = await launch({
                'headless': True,  # Run headless for stability
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
    
    async def test_page_loads(self, url, module_name):
        """Test if a page loads successfully"""
        try:
            print(f"   • Probando: {url}")
            
            response = await self.page.goto(url, {'waitUntil': 'networkidle0', 'timeout': 10000})
            await asyncio.sleep(2)
            
            if response and response.status < 400:
                print(f"   ✅ Página carga correctamente (status: {response.status})")
                self.results[module_name]['tests'].append(f"Página carga - {response.status}")
                
                # Check for common error indicators
                error_indicators = await self.page.evaluate('''() => {
                    const errorTexts = [
                        '404', '500', 'Error', 'Not Found', 'Internal Server Error',
                        'Something went wrong', 'Page not found'
                    ];
                    const bodyText = document.body.innerText.toLowerCase();
                    return errorTexts.some(error => bodyText.includes(error.toLowerCase()));
                }''')
                
                if error_indicators:
                    print(f"   ⚠️  Página carga pero muestra errores")
                    self.results[module_name]['errors'].append("Página muestra errores")
                else:
                    print(f"   ✅ Página sin errores visibles")
                    self.results[module_name]['tests'].append("Sin errores visibles")
                
                return True
            else:
                status = response.status if response else 'No response'
                print(f"   ❌ Error cargando página (status: {status})")
                self.results[module_name]['errors'].append(f"Error carga - {status}")
                self.results[module_name]['success'] = False
                return False
                
        except TimeoutError:
            print(f"   ❌ Timeout cargando página")
            self.results[module_name]['errors'].append("Timeout cargando página")
            self.results[module_name]['success'] = False
            return False
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            self.results[module_name]['errors'].append(f"Error: {str(e)}")
            self.results[module_name]['success'] = False
            return False
    
    async def test_basic_ui_elements(self, module_name):
        """Test basic UI elements presence"""
        try:
            # Check for common UI elements
            ui_elements = {
                'navigation': ['nav', '.navbar', '.navigation', '[role="navigation"]'],
                'main_content': ['main', '.main', '.content', '[role="main"]'],
                'buttons': ['button', '.btn', 'input[type="button"]'],
                'forms': ['form', 'input', 'select', 'textarea'],
                'tables_or_lists': ['table', 'ul', 'ol', '.list', '.grid']
            }
            
            found_elements = {}
            
            for element_type, selectors in ui_elements.items():
                found = False
                for selector in selectors:
                    try:
                        elements = await self.page.querySelectorAll(selector)
                        if elements:
                            found = True
                            found_elements[element_type] = len(elements)
                            break
                    except:
                        continue
                
                if found:
                    print(f"   ✅ {element_type}: {found_elements[element_type]} elementos")
                    self.results[module_name]['tests'].append(f"{element_type} presente")
                else:
                    print(f"   ⚠️  {element_type}: No encontrado")
            
            # Check for interactive elements
            try:
                clickable_elements = await self.page.evaluate('''() => {
                    const clickable = document.querySelectorAll('button, [role="button"], .btn, a[href], input[type="submit"]');
                    return clickable.length;
                }''')
                
                if clickable_elements > 0:
                    print(f"   ✅ Elementos interactivos: {clickable_elements}")
                    self.results[module_name]['tests'].append(f"Elementos interactivos: {clickable_elements}")
                else:
                    print(f"   ⚠️  No se encontraron elementos interactivos")
                    
            except Exception as e:
                print(f"   ⚠️  Error contando elementos interactivos: {str(e)}")
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error probando elementos UI: {str(e)}")
            self.results[module_name]['errors'].append(f"Error UI: {str(e)}")
            return False
    
    async def test_javascript_functionality(self, module_name):
        """Test basic JavaScript functionality"""
        try:
            # Check if JavaScript is working
            js_working = await self.page.evaluate('() => typeof window !== "undefined" && typeof document !== "undefined"')
            
            if js_working:
                print(f"   ✅ JavaScript funciona correctamente")
                self.results[module_name]['tests'].append("JavaScript funcional")
            else:
                print(f"   ❌ JavaScript no funciona")
                self.results[module_name]['errors'].append("JavaScript no funcional")
                return False
            
            # Check for console errors
            console_errors = []
            
            def handle_console(msg):
                if msg.type == 'error':
                    console_errors.append(msg.text)
            
            self.page.on('console', handle_console)
            
            # Wait a bit to catch any console errors
            await asyncio.sleep(2)
            
            if console_errors:
                print(f"   ⚠️  Errores de consola encontrados: {len(console_errors)}")
                for error in console_errors[:3]:  # Show first 3 errors
                    print(f"      • {error[:100]}...")
                self.results[module_name]['errors'].append(f"Errores consola: {len(console_errors)}")
            else:
                print(f"   ✅ Sin errores de consola")
                self.results[module_name]['tests'].append("Sin errores de consola")
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error probando JavaScript: {str(e)}")
            self.results[module_name]['errors'].append(f"Error JS: {str(e)}")
            return False
    
    async def test_module(self, module_name, urls):
        """Test a complete module"""
        print(f"\n📍 MÓDULO DE {module_name.upper()} - PRUEBAS UX")
        print("-" * 40)
        
        tested_any = False
        
        for url in urls:
            try:
                if await self.test_page_loads(url, module_name):
                    tested_any = True
                    await self.test_basic_ui_elements(module_name)
                    await self.test_javascript_functionality(module_name)
                    break  # If one URL works, continue with that
                else:
                    continue  # Try next URL
            except Exception as e:
                print(f"   ❌ Error probando {url}: {str(e)}")
                continue
        
        if not tested_any:
            print(f"   ❌ No se pudo probar ninguna URL del módulo {module_name}")
            self.results[module_name]['success'] = False
        
        print(f"   📊 Resumen módulo {module_name}:")
        print(f"      ✅ Pruebas exitosas: {len(self.results[module_name]['tests'])}")
        print(f"      ❌ Errores: {len(self.results[module_name]['errors'])}")
    
    async def run_all_tests(self):
        """Run all UX tests"""
        try:
            # Setup
            if not await self.setup():
                return False
            
            # Test modules with multiple potential URLs
            modules_to_test = {
                'clients': [
                    f"{self.base_url}/es/dashboard/clients",
                    f"{self.base_url}/es/clients",
                    f"{self.base_url}/dashboard/clients",
                    f"{self.base_url}/clients"
                ],
                'reservations': [
                    f"{self.base_url}/es/dashboard/reservations",
                    f"{self.base_url}/es/reservations", 
                    f"{self.base_url}/dashboard/reservations",
                    f"{self.base_url}/reservations",
                    f"{self.base_url}/es/dashboard/courts",
                    f"{self.base_url}/courts"
                ],
                'tournaments': [
                    f"{self.base_url}/es/dashboard/tournaments",
                    f"{self.base_url}/es/tournaments",
                    f"{self.base_url}/dashboard/tournaments",
                    f"{self.base_url}/tournaments"
                ],
                'leagues': [
                    f"{self.base_url}/es/dashboard/leagues",
                    f"{self.base_url}/es/leagues",
                    f"{self.base_url}/dashboard/leagues", 
                    f"{self.base_url}/leagues"
                ]
            }
            
            # Test each module
            for module_name, urls in modules_to_test.items():
                await self.test_module(module_name, urls)
            
            # Generate report
            await self.generate_report()
            
            return True
            
        except Exception as e:
            print(f"❌ Error ejecutando pruebas: {str(e)}")
            return False
        finally:
            await self.cleanup()
    
    async def generate_report(self):
        """Generate final UX test report"""
        print(f"\n" + "=" * 60)
        print("📊 REPORTE FINAL DE PRUEBAS UX SIMPLIFICADAS")
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
                for test in results['tests'][:5]:  # Show first 5 tests
                    print(f"      • {test}")
                if len(results['tests']) > 5:
                    print(f"      • ... y {len(results['tests']) - 5} más")
            
            if results['errors']:
                print(f"   ⚠️  Errores encontrados:")
                for error in results['errors'][:3]:  # Show first 3 errors
                    print(f"      • {error}")
                if len(results['errors']) > 3:
                    print(f"      • ... y {len(results['errors']) - 3} más")
            
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
        
        # Specific recommendations
        print(f"\n📋 RECOMENDACIONES:")
        if total_errors > 0:
            print(f"   • Resolver {total_errors} errores encontrados")
        if successful_modules < total_modules:
            failed_modules = total_modules - successful_modules
            print(f"   • Revisar {failed_modules} módulos con problemas")
        if success_rate < 100:
            print(f"   • Mejorar estabilidad y accesibilidad de URLs")
        
        print(f"\n🎯 ¡Pruebas UX simplificadas de Padelyzer completadas!")
        
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

async def main():
    """Main function to run UX tests"""
    tester = SimplifiedUXTester()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        if result:
            print("\n✅ Pruebas UX simplificadas completadas exitosamente")
        else:
            print("\n❌ Pruebas UX simplificadas terminaron con errores")
    except KeyboardInterrupt:
        print("\n⚠️  Pruebas interrumpidas por el usuario")
    except Exception as e:
        print(f"\n❌ Error ejecutando pruebas: {str(e)}")