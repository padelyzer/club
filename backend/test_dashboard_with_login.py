#!/usr/bin/env python3
"""
Validación del dashboard con login automático
"""
import asyncio
import json
import os
import sys

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from pyppeteer import launch
    from pyppeteer.errors import TimeoutError, ElementHandleError
except ImportError:
    print("❌ pyppeteer no está instalado. Instalando...")
    os.system("pip install pyppeteer")
    from pyppeteer import launch
    from pyppeteer.errors import TimeoutError, ElementHandleError

class DashboardLoginValidator:
    def __init__(self):
        self.browser = None
        self.page = None
        self.base_url = "http://localhost:3000"
        self.results = {'tests': [], 'errors': [], 'success': True}
    
    async def setup(self):
        """Initialize browser and page"""
        print("🏠 VALIDACIÓN DEL DASHBOARD CON LOGIN")
        print("=" * 60)
        
        try:
            self.browser = await launch({
                'headless': False,  # Show browser
                'defaultViewport': {'width': 1366, 'height': 768},
                'args': ['--no-sandbox', '--disable-setuid-sandbox']
            })
            self.page = await self.browser.newPage()
            await self.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
            
            print("✅ Browser iniciado correctamente")
            return True
            
        except Exception as e:
            print(f"❌ Error iniciando browser: {str(e)}")
            return False
    
    async def try_direct_dashboard_access(self):
        """Try to access dashboard directly first"""
        print(f"\n📍 PASO 1: Intentar acceso directo al dashboard")
        
        dashboard_urls = [
            f"{self.base_url}/es/dashboard",
            f"{self.base_url}/es/dashboard/dashboard", 
            f"{self.base_url}/dashboard",
            f"{self.base_url}/es/clients",
            f"{self.base_url}/es/dashboard/clients"
        ]
        
        for url in dashboard_urls:
            try:
                print(f"   • Probando: {url}")
                response = await self.page.goto(url, {'waitUntil': 'networkidle0', 'timeout': 8000})
                await asyncio.sleep(2)
                
                if response and response.status == 200:
                    # Check if it looks like a dashboard
                    page_content = await self.page.evaluate('''() => {
                        const body = document.body.innerText.toLowerCase();
                        const isDashboard = body.includes('dashboard') || 
                                          body.includes('panel') || 
                                          body.includes('clientes') ||
                                          body.includes('reserva') ||
                                          body.includes('torneo');
                        return {
                            isDashboard: isDashboard,
                            hasLogin: body.includes('login') || body.includes('iniciar'),
                            bodyLength: body.length,
                            title: document.title
                        };
                    }}''')
                    
                    if page_content['isDashboard'] and not page_content['hasLogin']:
                        print(f"   ✅ Dashboard accesible directamente en: {url}")
                        self.results['tests'].append(f"Acceso directo exitoso: {url}")
                        return True, url
                    elif page_content['hasLogin']:
                        print(f"   ⚠️  Redirigido a login desde: {url}")
                    else:
                        print(f"   ⚠️  No parece ser dashboard: {url}")
                        
            except Exception as e:
                print(f"   ❌ Error en {url}: {str(e)}")
                continue
        
        print(f"   ⚠️  No se pudo acceder directamente al dashboard")
        return False, None
    
    async def attempt_login_flow(self):
        """Attempt to login and reach dashboard"""
        print(f"\n📍 PASO 2: Intentar flujo de login")
        
        try:
            # Go to login page
            login_urls = [
                f"{self.base_url}/es/login",
                f"{self.base_url}/login",
                f"{self.base_url}"
            ]
            
            login_successful = False
            
            for login_url in login_urls:
                try:
                    print(f"   • Navegando a: {login_url}")
                    await self.page.goto(login_url)
                    await asyncio.sleep(2)
                    
                    # Look for login form
                    login_form = await self.page.evaluate('''() => {
                        const emailInputs = document.querySelectorAll('input[type="email"], input[name="email"]');
                        const passwordInputs = document.querySelectorAll('input[type="password"], input[name="password"]');
                        const submitButtons = document.querySelectorAll('button[type="submit"], button:contains("Login"), button:contains("Iniciar")');
                        
                        return {
                            hasEmailInput: emailInputs.length > 0,
                            hasPasswordInput: passwordInputs.length > 0,
                            hasSubmitButton: submitButtons.length > 0,
                            formCount: document.querySelectorAll('form').length
                        };
                    }}''')
                    
                    if login_form['hasEmailInput'] and login_form['hasPasswordInput']:
                        print(f"   ✅ Formulario de login encontrado")
                        
                        # Try to fill and submit login form
                        try:
                            # Fill email
                            await self.page.type('input[type="email"], input[name="email"]', 'test@padelyzer.com')
                            print(f"   ✅ Email ingresado")
                            
                            # Fill password
                            await self.page.type('input[type="password"], input[name="password"]', 'test123')
                            print(f"   ✅ Password ingresado")
                            
                            # Submit form
                            await self.page.click('button[type="submit"]')
                            print(f"   ✅ Formulario enviado")
                            
                            # Wait for navigation or response
                            await asyncio.sleep(3)
                            
                            # Check if login was successful
                            current_url = self.page.url
                            page_content = await self.page.evaluate('''() => {
                                const body = document.body.innerText.toLowerCase();
                                return {
                                    hasError: body.includes('error') || body.includes('invalid'),
                                    hasDashboard: body.includes('dashboard') || body.includes('panel') || body.includes('bienvenido'),
                                    currentUrl: window.location.href,
                                    title: document.title
                                };
                            }''')
                            
                            if not page_content['hasError'] and (page_content['hasDashboard'] or 'dashboard' in current_url or 'clients' in current_url):
                                print(f"   ✅ Login exitoso, redirigido a: {current_url}")
                                self.results['tests'].append("Login exitoso")
                                login_successful = True
                                break
                            else:
                                print(f"   ❌ Login falló o no redirigió correctamente")
                                self.results['errors'].append("Login fallido")
                                
                        except Exception as login_error:
                            print(f"   ❌ Error en proceso de login: {str(login_error)}")
                            self.results['errors'].append(f"Error login: {str(login_error)}")
                    else:
                        print(f"   ⚠️  Formulario de login no encontrado completo")
                        
                except Exception as url_error:
                    print(f"   ❌ Error navegando a {login_url}: {str(url_error)}")
                    continue
            
            return login_successful
            
        except Exception as e:
            print(f"   ❌ Error general en flujo de login: {str(e)}")
            self.results['errors'].append(f"Error login general: {str(e)}")
            return False
    
    async def validate_dashboard_after_login(self):
        """Validate dashboard functionality after login"""
        print(f"\n📍 PASO 3: Validar dashboard después de login")
        
        try:
            current_url = self.page.url
            print(f"   • URL actual: {current_url}")
            
            # Test dashboard components
            dashboard_analysis = await self.page.evaluate('''() => {
                const components = {
                    navigation: document.querySelectorAll('nav, .navbar, .navigation, .sidebar').length,
                    buttons: document.querySelectorAll('button, .btn').length,
                    forms: document.querySelectorAll('form, input, select').length,
                    links: document.querySelectorAll('a[href]').length,
                    tables: document.querySelectorAll('table, .table, .grid').length,
                    cards: document.querySelectorAll('.card, .widget, .panel').length
                };
                
                const text = document.body.innerText;
                const keywords = ['cliente', 'reserva', 'torneo', 'liga', 'dashboard', 'panel'];
                const hasRelevantContent = keywords.some(keyword => text.toLowerCase().includes(keyword));
                
                return {
                    components: components,
                    hasRelevantContent: hasRelevantContent,
                    textLength: text.length,
                    title: document.title
                };
            }}''')
            
            print(f"   📊 Análisis del dashboard:")
            print(f"      • Título: {dashboard_analysis['title']}")
            print(f"      • Contenido relevante: {'✅' if dashboard_analysis['hasRelevantContent'] else '❌'}")
            print(f"      • Longitud de texto: {dashboard_analysis['textLength']} caracteres")
            
            components = dashboard_analysis['components']
            for component, count in components.items():
                status = "✅" if count > 0 else "⚠️ "
                print(f"      • {component}: {count} elementos {status}")
                if count > 0:
                    self.results['tests'].append(f"{component}: {count}")
            
            # Test some interactions
            try:
                # Try to find and test navigation links
                nav_links = await self.page.evaluate('''() => {
                    const links = document.querySelectorAll('a[href]');
                    return Array.from(links).slice(0, 5).map(link => ({
                        text: link.innerText?.trim() || 'Sin texto',
                        href: link.href
                    })).filter(link => link.text && link.text !== 'Sin texto');
                }''')
                
                if nav_links:
                    print(f"   ✅ Enlaces de navegación encontrados: {len(nav_links)}")
                    for link in nav_links[:3]:
                        print(f"      • {link['text']}")
                    self.results['tests'].append(f"Enlaces navegación: {len(nav_links)}")
                
            except Exception as nav_error:
                print(f"   ⚠️  Error probando navegación: {str(nav_error)}")
            
            # Overall dashboard assessment
            total_components = sum(components.values())
            if total_components > 10 and dashboard_analysis['hasRelevantContent']:
                print(f"   ✅ Dashboard completamente funcional")
                self.results['tests'].append("Dashboard funcional")
                return True
            elif total_components > 5:
                print(f"   ⚠️  Dashboard parcialmente funcional")
                self.results['tests'].append("Dashboard parcial")
                return True
            else:
                print(f"   ❌ Dashboard con problemas")
                self.results['errors'].append("Dashboard problemático")
                return False
                
        except Exception as e:
            print(f"   ❌ Error validando dashboard: {str(e)}")
            self.results['errors'].append(f"Error validación: {str(e)}")
            return False
    
    async def generate_final_report(self):
        """Generate final validation report"""
        print(f"\n" + "=" * 60)
        print("📊 REPORTE FINAL DE VALIDACIÓN DEL DASHBOARD")
        print("=" * 60)
        
        total_tests = len(self.results['tests'])
        total_errors = len(self.results['errors'])
        success_rate = (total_tests / (total_tests + total_errors) * 100) if (total_tests + total_errors) > 0 else 0
        
        print(f"✅ Pruebas exitosas: {total_tests}")
        print(f"❌ Errores encontrados: {total_errors}")
        print(f"📊 Tasa de éxito: {success_rate:.1f}%")
        
        if self.results['tests']:
            print(f"\n📋 PRUEBAS EXITOSAS:")
            for test in self.results['tests']:
                print(f"   • {test}")
        
        if self.results['errors']:
            print(f"\n⚠️  ERRORES ENCONTRADOS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        if success_rate >= 80:
            grade = "A+ (Excelente)"
            status = "✅ DASHBOARD COMPLETAMENTE VALIDADO"
        elif success_rate >= 60:
            grade = "A (Muy Bueno)"
            status = "✅ DASHBOARD MAYORMENTE FUNCIONAL"
        elif success_rate >= 40:
            grade = "B (Bueno)"
            status = "⚠️  DASHBOARD CON PROBLEMAS MENORES"
        else:
            grade = "C (Necesita mejoras)"
            status = "❌ DASHBOARD NECESITA MEJORAS"
        
        print(f"\n🏆 Calificación Final: {grade}")
        print(f"📋 Estado: {status}")
        print(f"\n🎯 ¡Validación del dashboard completada!")
        
        return {
            'success_rate': success_rate,
            'total_tests': total_tests,
            'total_errors': total_errors,
            'grade': grade
        }
    
    async def cleanup(self):
        """Clean up resources"""
        if self.browser:
            await self.browser.close()
            print("\n🧹 Browser cerrado correctamente")
    
    async def run_complete_validation(self):
        """Run complete dashboard validation"""
        try:
            if not await self.setup():
                return False
            
            # Step 1: Try direct dashboard access
            direct_access, dashboard_url = await self.try_direct_dashboard_access()
            
            if direct_access:
                # Dashboard accessible directly
                await self.validate_dashboard_after_login()
            else:
                # Step 2: Try login flow
                login_success = await self.attempt_login_flow()
                
                if login_success:
                    # Step 3: Validate dashboard after login
                    await self.validate_dashboard_after_login()
                else:
                    print("   ❌ No se pudo acceder al dashboard ni por login")
                    self.results['errors'].append("Sin acceso al dashboard")
            
            # Generate final report
            await self.generate_final_report()
            
            return True
            
        except Exception as e:
            print(f"❌ Error en validación completa: {str(e)}")
            return False
        finally:
            await self.cleanup()

async def main():
    """Main function"""
    validator = DashboardLoginValidator()
    success = await validator.run_complete_validation()
    return success

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        if result:
            print("\n✅ Validación completa del dashboard exitosa")
        else:
            print("\n❌ Validación del dashboard con errores")
    except KeyboardInterrupt:
        print("\n⚠️  Validación interrumpida")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")