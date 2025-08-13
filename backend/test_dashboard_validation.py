#!/usr/bin/env python3
"""
Validación completa del dashboard principal usando Puppeteer
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

class DashboardValidator:
    def __init__(self):
        self.browser = None
        self.page = None
        self.base_url = "http://localhost:3000"
        self.results = {
            'dashboard': {'tests': [], 'errors': [], 'success': True},
            'navigation': {'tests': [], 'errors': [], 'success': True},
            'widgets': {'tests': [], 'errors': [], 'success': True},
            'performance': {'tests': [], 'errors': [], 'success': True}
        }
    
    async def setup(self):
        """Initialize browser and page"""
        print("🏠 INICIANDO VALIDACIÓN DEL DASHBOARD PRINCIPAL")
        print("=" * 60)
        
        try:
            self.browser = await launch({
                'headless': False,  # Show browser for visual validation
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
    
    async def test_homepage_load(self):
        """Test if homepage loads correctly"""
        print(f"\n📍 PASO 1: Validar carga de página principal")
        
        try:
            # Navigate to homepage
            start_time = datetime.now()
            response = await self.page.goto(self.base_url, {'waitUntil': 'networkidle0', 'timeout': 15000})
            load_time = (datetime.now() - start_time).total_seconds()
            
            await asyncio.sleep(2)
            
            if response and response.status < 400:
                print(f"   ✅ Página principal carga (status: {response.status})")
                print(f"   ✅ Tiempo de carga: {load_time:.2f} segundos")
                self.results['dashboard']['tests'].append(f"Carga exitosa - {response.status}")
                self.results['performance']['tests'].append(f"Tiempo carga: {load_time:.2f}s")
                
                # Check page title
                title = await self.page.title()
                print(f"   ✅ Título de página: {title}")
                self.results['dashboard']['tests'].append(f"Título: {title}")
                
                return True
            else:
                status = response.status if response else 'Sin respuesta'
                print(f"   ❌ Error cargando página (status: {status})")
                self.results['dashboard']['errors'].append(f"Error carga - {status}")
                self.results['dashboard']['success'] = False
                return False
                
        except TimeoutError:
            print(f"   ❌ Timeout cargando página principal")
            self.results['dashboard']['errors'].append("Timeout página principal")
            self.results['dashboard']['success'] = False
            return False
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            self.results['dashboard']['errors'].append(f"Error: {str(e)}")
            self.results['dashboard']['success'] = False
            return False
    
    async def test_dashboard_access(self):
        """Test dashboard access and navigation"""
        print(f"\n📍 PASO 2: Validar acceso al dashboard")
        
        try:
            # Try different dashboard URLs
            dashboard_urls = [
                f"{self.base_url}/es/dashboard",
                f"{self.base_url}/dashboard",
                f"{self.base_url}/es/dashboard/overview",
                f"{self.base_url}/es/dashboard/dashboard"
            ]
            
            dashboard_loaded = False
            successful_url = None
            
            for url in dashboard_urls:
                try:
                    print(f"   • Probando: {url}")
                    response = await self.page.goto(url, {'waitUntil': 'networkidle0', 'timeout': 10000})
                    await asyncio.sleep(2)
                    
                    if response and response.status == 200:
                        # Check if it's actually a dashboard (not an error page)
                        has_dashboard_content = await self.page.evaluate('''() => {
                            const dashboardIndicators = [
                                'dashboard', 'panel', 'overview', 'home',
                                'estadísticas', 'resumen', 'inicio'
                            ];
                            const bodyText = document.body.innerText.toLowerCase();
                            return dashboardIndicators.some(indicator => 
                                bodyText.includes(indicator)
                            );
                        }''')
                        
                        if has_dashboard_content:
                            dashboard_loaded = True
                            successful_url = url
                            print(f"   ✅ Dashboard cargado exitosamente")
                            self.results['dashboard']['tests'].append(f"Dashboard accesible en: {url}")
                            break
                        else:
                            print(f"   ⚠️  URL carga pero no es dashboard")
                    else:
                        print(f"   ❌ Error en URL (status: {response.status if response else 'No response'})")
                        
                except TimeoutError:
                    print(f"   ❌ Timeout en URL")
                    continue
                except Exception as e:
                    print(f"   ❌ Error en URL: {str(e)}")
                    continue
            
            if not dashboard_loaded:
                print(f"   ❌ No se pudo acceder al dashboard")
                self.results['dashboard']['errors'].append("Dashboard no accesible")
                self.results['dashboard']['success'] = False
                return False
            
            return True, successful_url
            
        except Exception as e:
            print(f"   ❌ Error general probando dashboard: {str(e)}")
            self.results['dashboard']['errors'].append(f"Error dashboard: {str(e)}")
            self.results['dashboard']['success'] = False
            return False
    
    async def test_dashboard_components(self):
        """Test dashboard components and widgets"""
        print(f"\n📍 PASO 3: Validar componentes del dashboard")
        
        try:
            # Check for common dashboard components
            components = {
                'sidebar': [
                    'nav', '.sidebar', '.navigation', '[role="navigation"]',
                    '.nav-menu', '.menu', '.side-nav'
                ],
                'header': [
                    'header', '.header', '.top-bar', '.navbar-top',
                    '.page-header', '.dashboard-header'
                ],
                'main_content': [
                    'main', '.main', '.content', '[role="main"]',
                    '.dashboard-content', '.page-content'
                ],
                'cards_widgets': [
                    '.card', '.widget', '.dashboard-card', '.metric-card',
                    '.stat-card', '.summary-card'
                ],
                'charts_graphs': [
                    '.chart', '.graph', 'canvas', 'svg',
                    '.chart-container', '.graph-container'
                ]
            }
            
            found_components = {}
            
            for component_type, selectors in components.items():
                found = False
                count = 0
                
                for selector in selectors:
                    try:
                        elements = await self.page.querySelectorAll(selector)
                        if elements:
                            count = len(elements)
                            found = True
                            break
                    except:
                        continue
                
                if found:
                    print(f"   ✅ {component_type}: {count} elementos encontrados")
                    self.results['widgets']['tests'].append(f"{component_type}: {count} elementos")
                    found_components[component_type] = count
                else:
                    print(f"   ⚠️  {component_type}: No encontrado")
                    found_components[component_type] = 0
            
            # Check for interactive elements
            interactive_count = await self.page.evaluate('''() => {
                const interactive = document.querySelectorAll(
                    'button, [role="button"], .btn, a[href], input, select, textarea'
                );
                return interactive.length;
            }''')
            
            print(f"   ✅ Elementos interactivos: {interactive_count}")
            self.results['widgets']['tests'].append(f"Elementos interactivos: {interactive_count}")
            
            # Check for text content (not empty page)
            text_content = await self.page.evaluate('''() => {
                return document.body.innerText.trim().length;
            }''')
            
            if text_content > 100:
                print(f"   ✅ Contenido de texto: {text_content} caracteres")
                self.results['dashboard']['tests'].append(f"Contenido presente: {text_content} chars")
            else:
                print(f"   ⚠️  Poco contenido de texto: {text_content} caracteres")
                self.results['dashboard']['errors'].append("Poco contenido")
            
            return found_components
            
        except Exception as e:
            print(f"   ❌ Error validando componentes: {str(e)}")
            self.results['widgets']['errors'].append(f"Error componentes: {str(e)}")
            return {}
    
    async def test_navigation_functionality(self):
        """Test navigation functionality"""
        print(f"\n📍 PASO 4: Validar funcionalidad de navegación")
        
        try:
            # Look for navigation links
            nav_links = await self.page.evaluate('''() => {
                const links = document.querySelectorAll('a[href], .nav-link, .menu-item');
                return Array.from(links).map(link => ({
                    text: link.innerText?.trim() || link.getAttribute('aria-label') || 'Sin texto',
                    href: link.href || link.getAttribute('href') || 'Sin href'
                })).filter(link => link.text && link.text !== 'Sin texto').slice(0, 10);
            }''')
            
            if nav_links:
                print(f"   ✅ Enlaces de navegación encontrados: {len(nav_links)}")
                self.results['navigation']['tests'].append(f"Enlaces navegación: {len(nav_links)}")
                
                # Show some navigation links
                print(f"   📋 Algunos enlaces encontrados:")
                for i, link in enumerate(nav_links[:5]):
                    print(f"      • {link['text']}")
                
                # Test clicking a navigation link (if safe)
                try:
                    if nav_links:
                        # Try to click first internal link
                        for link in nav_links:
                            if link['href'] and ('localhost' in link['href'] or link['href'].startswith('/')):
                                print(f"   • Probando click en: {link['text']}")
                                
                                # Use JavaScript to click instead of puppeteer click for safety
                                clicked = await self.page.evaluate(f'''() => {{
                                    const links = document.querySelectorAll('a[href]');
                                    for (let link of links) {{
                                        if (link.innerText?.trim() === "{link['text']}") {{
                                            link.click();
                                            return true;
                                        }}
                                    }}
                                    return false;
                                }}''')
                                
                                if clicked:
                                    await asyncio.sleep(2)
                                    current_url = self.page.url
                                    print(f"   ✅ Navegación exitosa a: {current_url}")
                                    self.results['navigation']['tests'].append("Navegación funcional")
                                    break
                                
                except Exception as nav_error:
                    print(f"   ⚠️  Error probando navegación: {str(nav_error)}")
            else:
                print(f"   ⚠️  No se encontraron enlaces de navegación")
                self.results['navigation']['errors'].append("Sin enlaces navegación")
            
            return len(nav_links)
            
        except Exception as e:
            print(f"   ❌ Error validando navegación: {str(e)}")
            self.results['navigation']['errors'].append(f"Error navegación: {str(e)}")
            return 0
    
    async def test_javascript_errors(self):
        """Test for JavaScript errors"""
        print(f"\n📍 PASO 5: Validar JavaScript y errores de consola")
        
        try:
            console_errors = []
            console_warnings = []
            
            def handle_console(msg):
                if msg.type == 'error':
                    console_errors.append(msg.text)
                elif msg.type == 'warning':
                    console_warnings.append(msg.text)
            
            # Listen for console messages
            self.page.on('console', handle_console)
            
            # Wait and perform some interactions to trigger any JS
            await asyncio.sleep(3)
            
            # Test basic JavaScript functionality
            js_working = await self.page.evaluate('''() => {
                try {
                    // Basic JS tests
                    const hasWindow = typeof window !== 'undefined';
                    const hasDocument = typeof document !== 'undefined';
                    const hasLocalStorage = typeof localStorage !== 'undefined';
                    const hasJSON = typeof JSON !== 'undefined';
                    
                    return {
                        window: hasWindow,
                        document: hasDocument,
                        localStorage: hasLocalStorage,
                        json: hasJSON,
                        overall: hasWindow && hasDocument && hasJSON
                    };
                } catch (e) {
                    return { error: e.message, overall: false };
                }
            }''')
            
            if js_working['overall']:
                print(f"   ✅ JavaScript funciona correctamente")
                self.results['performance']['tests'].append("JavaScript funcional")
                
                # Show JS environment details
                for key, value in js_working.items():
                    if key != 'overall':
                        status = "✅" if value else "❌"
                        print(f"      {status} {key}: {value}")
            else:
                print(f"   ❌ JavaScript tiene problemas")
                self.results['performance']['errors'].append("JavaScript problemático")
                if 'error' in js_working:
                    print(f"      Error: {js_working['error']}")
            
            # Report console errors
            if console_errors:
                print(f"   ⚠️  Errores de consola: {len(console_errors)}")
                for error in console_errors[:3]:  # Show first 3
                    print(f"      • {error[:100]}...")
                self.results['performance']['errors'].append(f"Errores consola: {len(console_errors)}")
            else:
                print(f"   ✅ Sin errores de consola JavaScript")
                self.results['performance']['tests'].append("Sin errores JS")
            
            if console_warnings:
                print(f"   ⚠️  Warnings de consola: {len(console_warnings)}")
                self.results['performance']['errors'].append(f"Warnings: {len(console_warnings)}")
            else:
                print(f"   ✅ Sin warnings de consola")
                self.results['performance']['tests'].append("Sin warnings")
            
            return len(console_errors) == 0
            
        except Exception as e:
            print(f"   ❌ Error validando JavaScript: {str(e)}")
            self.results['performance']['errors'].append(f"Error JS: {str(e)}")
            return False
    
    async def test_responsive_design(self):
        """Test responsive design"""
        print(f"\n📍 PASO 6: Validar diseño responsivo")
        
        try:
            # Test different viewport sizes
            viewports = [
                {'width': 1920, 'height': 1080, 'name': 'Desktop Grande'},
                {'width': 1366, 'height': 768, 'name': 'Desktop Estándar'},
                {'width': 768, 'height': 1024, 'name': 'Tablet'},
                {'width': 375, 'height': 812, 'name': 'Móvil'}
            ]
            
            responsive_results = []
            
            for viewport in viewports:
                try:
                    await self.page.setViewport({
                        'width': viewport['width'],
                        'height': viewport['height']
                    })
                    await asyncio.sleep(1)
                    
                    # Check if content is still visible and properly formatted
                    viewport_test = await self.page.evaluate(f'''() => {{
                        const body = document.body;
                        const hasOverflow = body.scrollWidth > {viewport['width']};
                        const visibleElements = document.querySelectorAll('*').length;
                        
                        return {{
                            hasHorizontalOverflow: hasOverflow,
                            visibleElements: visibleElements,
                            bodyWidth: body.scrollWidth,
                            viewportWidth: {viewport['width']}
                        }};
                    }}''')
                    
                    if not viewport_test['hasHorizontalOverflow']:
                        print(f"   ✅ {viewport['name']}: Sin overflow horizontal")
                        responsive_results.append(f"{viewport['name']}: OK")
                    else:
                        print(f"   ⚠️  {viewport['name']}: Overflow horizontal detectado")
                        responsive_results.append(f"{viewport['name']}: Overflow")
                    
                except Exception as viewport_error:
                    print(f"   ❌ Error en {viewport['name']}: {str(viewport_error)}")
                    responsive_results.append(f"{viewport['name']}: Error")
            
            # Reset to standard viewport
            await self.page.setViewport({'width': 1366, 'height': 768})
            
            successful_viewports = len([r for r in responsive_results if 'OK' in r])
            print(f"   📊 Viewports exitosos: {successful_viewports}/{len(viewports)}")
            self.results['performance']['tests'].append(f"Responsive: {successful_viewports}/{len(viewports)}")
            
            return successful_viewports >= len(viewports) // 2
            
        except Exception as e:
            print(f"   ❌ Error validando responsive: {str(e)}")
            self.results['performance']['errors'].append(f"Error responsive: {str(e)}")
            return False
    
    async def generate_dashboard_report(self):
        """Generate comprehensive dashboard report"""
        print(f"\n" + "=" * 60)
        print("📊 REPORTE DE VALIDACIÓN DEL DASHBOARD")
        print("=" * 60)
        
        total_tests = 0
        total_errors = 0
        successful_categories = 0
        
        categories = {
            'dashboard': '🏠 DASHBOARD PRINCIPAL',
            'navigation': '🧭 NAVEGACIÓN',
            'widgets': '📊 COMPONENTES Y WIDGETS', 
            'performance': '⚡ RENDIMIENTO Y JS'
        }
        
        for category_key, category_name in categories.items():
            results = self.results[category_key]
            
            print(f"\n{category_name}:")
            print(f"   ✅ Pruebas exitosas: {len(results['tests'])}")
            print(f"   ❌ Errores: {len(results['errors'])}")
            print(f"   🎯 Estado: {'FUNCIONAL' if results['success'] else 'CON PROBLEMAS'}")
            
            if results['tests']:
                print(f"   📋 Pruebas exitosas:")
                for test in results['tests'][:5]:  # Show first 5
                    print(f"      • {test}")
                if len(results['tests']) > 5:
                    print(f"      • ... y {len(results['tests']) - 5} más")
            
            if results['errors']:
                print(f"   ⚠️  Errores encontrados:")
                for error in results['errors'][:3]:  # Show first 3
                    print(f"      • {error}")
                if len(results['errors']) > 3:
                    print(f"      • ... y {len(results['errors']) - 3} más")
            
            total_tests += len(results['tests'])
            total_errors += len(results['errors'])
            if results['success']:
                successful_categories += 1
        
        # Calculate overall score
        total_categories = len(categories)
        success_rate = (successful_categories / total_categories) * 100
        
        print(f"\n" + "=" * 60)
        print("🎯 RESUMEN EJECUTIVO DEL DASHBOARD")
        print("=" * 60)
        print(f"📊 Categorías probadas: {total_categories}")
        print(f"📊 Categorías funcionales: {successful_categories}")
        print(f"📊 Pruebas exitosas: {total_tests}")
        print(f"📊 Errores encontrados: {total_errors}") 
        print(f"📊 Tasa de éxito: {success_rate:.1f}%")
        
        if success_rate >= 90:
            grade = "A+ (Excelente)"
            status = "✅ DASHBOARD COMPLETAMENTE FUNCIONAL"
        elif success_rate >= 75:
            grade = "A (Muy Bueno)"
            status = "✅ DASHBOARD MAYORMENTE FUNCIONAL"
        elif success_rate >= 60:
            grade = "B (Bueno)"
            status = "⚠️  DASHBOARD CON PROBLEMAS MENORES"
        else:
            grade = "C (Necesita mejoras)"
            status = "❌ DASHBOARD NECESITA MEJORAS"
        
        print(f"🏆 Calificación: {grade}")
        print(f"📋 Estado: {status}")
        
        # Specific recommendations for dashboard
        print(f"\n📋 RECOMENDACIONES ESPECÍFICAS:")
        if total_errors > 0:
            print(f"   • Resolver {total_errors} errores encontrados")
        if successful_categories < total_categories:
            failed_categories = total_categories - successful_categories
            print(f"   • Revisar {failed_categories} categorías con problemas")
        if success_rate < 100:
            print(f"   • Mejorar experiencia del usuario en dashboard")
            print(f"   • Verificar que todos los widgets cargan correctamente")
            print(f"   • Optimizar tiempo de carga y rendimiento")
        
        print(f"\n🎯 ¡Validación del dashboard completada!")
        
        return {
            'total_categories': total_categories,
            'successful_categories': successful_categories,
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
    
    async def run_dashboard_validation(self):
        """Run complete dashboard validation"""
        try:
            # Setup
            if not await self.setup():
                return False
            
            # Step 1: Test homepage load
            if not await self.test_homepage_load():
                print("❌ No se pudo cargar la página principal")
                return False
            
            # Step 2: Test dashboard access
            dashboard_result = await self.test_dashboard_access()
            if not dashboard_result:
                print("❌ No se pudo acceder al dashboard")
                # Continue with other tests on homepage
            
            # Step 3: Test dashboard components
            await self.test_dashboard_components()
            
            # Step 4: Test navigation
            await self.test_navigation_functionality()
            
            # Step 5: Test JavaScript
            await self.test_javascript_errors()
            
            # Step 6: Test responsive design
            await self.test_responsive_design()
            
            # Generate report
            await self.generate_dashboard_report()
            
            return True
            
        except Exception as e:
            print(f"❌ Error ejecutando validación del dashboard: {str(e)}")
            return False
        finally:
            await self.cleanup()

async def main():
    """Main function to run dashboard validation"""
    validator = DashboardValidator()
    success = await validator.run_dashboard_validation()
    return success

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        if result:
            print("\n✅ Validación del dashboard completada exitosamente")
        else:
            print("\n❌ Validación del dashboard terminó con errores")
    except KeyboardInterrupt:
        print("\n⚠️  Validación interrumpida por el usuario")
    except Exception as e:
        print(f"\n❌ Error ejecutando validación: {str(e)}")